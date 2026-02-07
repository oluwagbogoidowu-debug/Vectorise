
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { auth } from '../../services/firebase';
import { createUserWithEmailAndPassword, updateProfile as updateFbProfile, sendEmailVerification } from 'firebase/auth';
import { userService } from '../../services/userService';
import { sprintService } from '../../services/sprintService';
import { notificationService } from '../../services/notificationService';
import { UserRole, Participant, Sprint } from '../../types';
import Button from '../../components/Button';
import LocalLogo from '../../components/LocalLogo';

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const onboardingState = location.state || {};
  const { persona, answers, recommendedPlan, occupation, referrerId, prefilledEmail, fromPayment, targetSprintId } = onboardingState;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(prefilledEmail || '');
  const [password, setPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (prefilledEmail) setEmail(prefilledEmail);
  }, [prefilledEmail]);

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
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = userCredential.user;
      await updateFbProfile(firebaseUser, { displayName: `${firstName} ${lastName}` });
      
      // 2. Create User Document
      const newUser: Partial<Participant> = {
        id: firebaseUser.uid,
        name: `${firstName} ${lastName}`,
        email: email.trim().toLowerCase(),
        role: UserRole.PARTICIPANT,
        profileImageUrl: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=0E7850&color=fff`,
        persona: persona || 'Seeker',
        onboardingAnswers: answers || {},
        occupation: occupation || 'Unemployed',
        walletBalance: 30,
        createdAt: new Date().toISOString()
      };
      
      await userService.createUserDocument(firebaseUser.uid, newUser);

      // 3. Post-Payment Fulfillment
      if (fromPayment && targetSprintId) {
          try {
              const sprint = await sprintService.getSprintById(targetSprintId);
              if (sprint) {
                  // Manually trigger enrollment to ensure it exists for the next page
                  const enrollment = await sprintService.enrollUser(firebaseUser.uid, targetSprintId, sprint.duration);
                  // IMMEDIATE REDIRECTION TO DAY 1
                  navigate(`/participant/sprint/${enrollment.id}`);
                  return;
              }
          } catch (enrollError) {
              console.error("Auto-enrollment failed:", enrollError);
          }
      }

      await sendEmailVerification(firebaseUser);
      navigate('/dashboard');

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') setRegError("Email already in registry. Please login.");
      else setRegError("Identity creation failed. Please try again.");
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
                {fromPayment ? 'Final step. Secure your path.' : 'Establish your identity.'}
            </h1>
        </header>

        <div className="w-full bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative">
            <h2 className="text-[8px] font-black text-center mb-8 tracking-[0.4em] text-primary border-b border-primary/5 pb-4 uppercase">Registry Creation</h2>
            
            <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-50 rounded-xl outline-none font-bold text-sm" placeholder="First Name" />
                    <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-50 rounded-xl outline-none font-bold text-sm" placeholder="Last Name" />
                </div>
                <input type="email" required value={email} readOnly={!!prefilledEmail} className={`w-full px-4 py-3.5 bg-gray-50 border border-gray-50 rounded-xl outline-none font-bold text-sm ${prefilledEmail ? 'opacity-50' : ''}`} placeholder="Email" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3.5 bg-gray-50 border border-gray-50 rounded-xl outline-none font-bold text-sm" placeholder="Set Password" />

                {regError && <p className="text-[10px] text-red-600 font-black uppercase text-center">{regError}</p>}

                <Button type="submit" isLoading={isSubmitting} className="w-full py-4 bg-primary text-white rounded-full shadow-lg text-[10px] font-black uppercase tracking-[0.2em]">
                    Access My Sprint &rarr;
                </Button>
            </form>

            <p className="mt-8 text-center text-[9px] font-black text-gray-300 uppercase tracking-widest">
                Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
