import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { auth, db } from '../../services/firebase';
import { createUserWithEmailAndPassword, updateProfile as updateFbProfile, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { userService } from '../../services/userService';
import { sprintService } from '../../services/sprintService';
import { UserRole, Participant } from '../../types';
import Button from '../../components/Button';
import LocalLogo from '../../components/LocalLogo';

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const onboardingState = location.state || {};
  
  // Helper to extract cookie value
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  // 1. Permanent Attribution Check (Background Storage)
  // We check LocalStorage first (durable), then Cookie (backup for payment redirects)
  const storedRef = localStorage.getItem('vectorise_ref') || getCookie('vectorise_ref');
  const savedSprint = localStorage.getItem('vectorise_last_sprint');

  const { 
    persona, 
    answers, 
    recommendedPlan, 
    occupation, 
    referrerId = storedRef, // Attribution priority
    prefilledEmail, 
    prefilledFirstName,
    prefilledLastName,
    fromPayment, 
    targetSprintId = savedSprint,
    targetTrackId,
    tx_ref,
    isPartnerApplication,
    partnerData,
    authMessage,
    isQueued
  } = onboardingState;

  const [firstName, setFirstName] = useState(prefilledFirstName || '');
  const [lastName, setLastName] = useState(prefilledLastName || '');
  const [email, setEmail] = useState(prefilledEmail || '');
  const [password, setPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (prefilledEmail) setEmail(prefilledEmail);
    if (prefilledFirstName) setFirstName(prefilledFirstName);
    if (prefilledLastName) setLastName(prefilledLastName);
  }, [prefilledEmail, prefilledFirstName, prefilledLastName]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setRegError("All fields are required.");
      return;
    }

    setRegError('');
    setIsSubmitting(true);

    try {
      // 1. Create Firebase Auth Account
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const firebaseUser = userCredential.user;
      await updateFbProfile(firebaseUser, { displayName: `${firstName} ${lastName}` });
      
      // 2. Create User Document with Permanent Attribution
      const newUser: Partial<Participant> = {
        id: firebaseUser.uid,
        name: `${firstName} ${lastName}`,
        email: email.trim().toLowerCase(),
        role: isPartnerApplication ? UserRole.PARTNER : UserRole.PARTICIPANT,
        profileImageUrl: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=0E7850&color=fff`,
        persona: persona || (isPartnerApplication ? 'Growth Partner' : 'Seeker'),
        onboardingAnswers: answers || {},
        occupation: occupation || (isPartnerApplication ? 'Partner' : 'Unemployed'),
        walletBalance: 0,
        createdAt: new Date().toISOString(),
        enrolledSprintIds: [],
        isPartner: !!isPartnerApplication,
        partnerData: partnerData || null,
        
        // ATTACH REFERRAL DATA PERMANENTLY
        referrerId: referrerId || null,
        referralFirstTouch: referrerId ? new Date().toISOString() : null
      };
      
      await userService.createUserDocument(firebaseUser.uid, newUser);

      // 3. Claim Payment if applicable
      if (tx_ref) {
          try {
              const paymentRef = doc(db, 'payments', tx_ref);
              await updateDoc(paymentRef, {
                  userId: firebaseUser.uid,
                  claimedAt: new Date().toISOString()
              });
          } catch (claimError) {
              console.error("Failed to claim payment:", claimError);
          }
      }

      // 4. Clean up used tracking data
      localStorage.removeItem('vectorise_ref');
      localStorage.removeItem('vectorise_last_sprint');
      document.cookie = "vectorise_ref=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      // 5. Post-Payment or Recommended Path Fulfillment
      if (fromPayment) {
          if (targetTrackId) {
              // For tracks, we redirect to dashboard
              navigate('/participant/dashboard', { replace: true });
              return;
          } else if (targetSprintId) {
              try {
                  const sprint = await sprintService.getSprintById(targetSprintId);
                  if (sprint) {
                      const enrollment = await sprintService.enrollUser(firebaseUser.uid, targetSprintId, sprint.duration);
                      navigate(`/participant/sprint/${enrollment.id}`, { replace: true });
                      return;
                  }
              } catch (enrollError) {
                  console.error("Auto-enrollment failed:", enrollError);
              }
          }
      } else if (persona && answers) {
          // Handle Recommended Path from Quiz
          try {
              const availableSprints = await sprintService.getPublishedSprints();
              
              // Recalculate path (same logic as RecommendedSprints.tsx)
              let foundational = availableSprints.find(s => 
                  s.category === 'Growth Fundamentals' || s.category === 'Core Platform Sprint'
              );
              
              const registrySprints = availableSprints.filter(s => 
                  s.category !== 'Growth Fundamentals' && s.category !== 'Core Platform Sprint'
              );
              
              let nextPath = registrySprints.find(s => s.id === targetSprintId);
              if (!nextPath) {
                  const { translateToTag, calculateMatchScore } = await import('../../utils/tagUtils');
                  const userProfile = {
                      persona: persona,
                      p1: translateToTag(persona, answers[1]),
                      p2: translateToTag(persona, answers[2]),
                      p3: translateToTag(persona, answers[3]),
                      occupation: translateToTag('', occupation)
                  };
                  const scoredSprints = registrySprints
                      .map(s => ({ sprint: s, score: calculateMatchScore(userProfile, s.targeting) }))
                      .sort((a, b) => b.score - a.score);
                  if (scoredSprints.length > 0) nextPath = scoredSprints[0].sprint;
              }

              // Enroll in Foundational (Always)
              if (foundational) {
                  await sprintService.enrollUser(firebaseUser.uid, foundational.id, foundational.duration);
              }

              // Enroll in Next Path (If Queued)
              if (isQueued && nextPath) {
                  await sprintService.enrollUser(firebaseUser.uid, nextPath.id, nextPath.duration, { source: 'queued' as any });
              }
          } catch (pathError) {
              console.error("Recommended path enrollment failed:", pathError);
          }
      }

      await sendEmailVerification(firebaseUser);
      
      // Sign out so they can "log in" as requested
      await signOut(auth);
      setShowSuccess(true);

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') setRegError("Email already in use. Try logging in instead.");
      else if (error.code === 'auth/weak-password') setRegError("Password must be at least 6 characters.");
      else setRegError("Account creation failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="h-[100dvh] w-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-6 overflow-hidden font-sans relative">
        <div className="w-full max-w-sm flex flex-col items-center animate-fade-in z-10">
          <div className="w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none italic mb-4">
              Sign up successful
            </h1>
            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-8 italic">
              Your account has been created. Please log in to begin your journey.
            </p>
            <Button 
              onClick={() => navigate('/login', { state: { prefilledEmail: email } })} 
              className="w-full py-4 bg-primary text-white rounded-full shadow-lg text-[10px] font-black uppercase tracking-[0.2em]"
            >
              Start your rise &rarr;
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-6 overflow-hidden font-sans relative">
      <div className="w-full max-w-sm flex flex-col items-center animate-fade-in z-10">
        <header className="text-center mb-8">
            <LocalLogo type="green" className="h-6 w-auto mx-auto mb-6 opacity-30" />
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none italic">
                {isPartnerApplication ? 'Establish Partner Identity' : fromPayment ? 'Establish your identity' : 'Start your Rise'}
            </h1>
            {referrerId && !isPartnerApplication && (
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-3">
                    Referred by Catalyst: {referrerId}
                </p>
            )}
        </header>

        <div className="w-full bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative">
            <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="block text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">First Name</label>
                        <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl outline-none font-bold text-sm" placeholder="First Name" />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">Last Name</label>
                        <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl outline-none font-bold text-sm" placeholder="Last Name" />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="block text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">Email Address</label>
                    <input 
                      type="email" 
                      required 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-primary/5" 
                      placeholder="Email Address" 
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">Set Password</label>
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 font-bold text-sm" placeholder="Password" />
                </div>

                {regError && <p className="text-[10px] text-red-600 font-black uppercase text-center mt-2">{regError}</p>}
                {authMessage && !regError && (
                    <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl text-[10px] text-primary font-black uppercase tracking-widest text-center animate-pulse">
                        {authMessage}
                    </div>
                )}

                <Button type="submit" isLoading={isSubmitting} className="w-full py-4 bg-primary text-white rounded-full shadow-lg text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                    {isPartnerApplication ? 'Secure Partner Access' : 'Create Account'} &rarr;
                </Button>
            </form>

            <p className="mt-8 text-center text-[9px] font-black text-gray-300 uppercase tracking-widest">
                Already have an account? <Link to="/login" state={{ targetSprintId, prefilledEmail: email, tx_ref }} className="text-primary hover:underline">Log in</Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;