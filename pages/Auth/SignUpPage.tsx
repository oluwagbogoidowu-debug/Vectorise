import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { auth, db } from '../../services/firebase';
import { createUserWithEmailAndPassword, updateProfile as updateFbProfile, sendEmailVerification } from 'firebase/auth';
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
    tx_ref,
    isPartnerApplication,
    partnerData 
  } = onboardingState;

  const [firstName, setFirstName] = useState(prefilledFirstName || '');
  const [lastName, setLastName] = useState(prefilledLastName || '');
  const [email, setEmail] = useState(prefilledEmail || '');
  const [password, setPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        walletBalance: 50,
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

      // 5. Post-Payment Fulfillment
      if (fromPayment && targetSprintId) {
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

      await sendEmailVerification(firebaseUser);
      navigate('/dashboard', { replace: true });

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') setRegError("Email already in use. Try logging in instead.");
      else if (error.code === 'auth/weak-password') setRegError("Password must be at least 6 characters.");
      else setRegError("Account creation failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-6 overflow-hidden font-sans relative">
      <div className="w-full max-w-sm flex flex-col items-center animate-fade-in z-10">
        <header className="text-center mb-8">
            <LocalLogo type="green" className="h-6 w-auto mx-auto mb-6 opacity-30" />
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none italic">
                {isPartnerApplication ? 'Establish Partner Identity' : fromPayment ? 'Establish your identity' : 'Join the Registry'}
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
                      readOnly={!!prefilledEmail} 
                      className={`w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl outline-none font-bold text-sm transition-all ${prefilledEmail ? 'opacity-60 bg-gray-100' : 'focus:ring-4 focus:ring-primary/5'}`} 
                      placeholder="Email Address" 
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">Set Password</label>
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 font-bold text-sm" placeholder="Password" />
                </div>

                {regError && <p className="text-[10px] text-red-600 font-black uppercase text-center mt-2">{regError}</p>}

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