import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { auth } from '../../services/firebase';
import { createUserWithEmailAndPassword, updateProfile as updateFbProfile, sendEmailVerification } from 'firebase/auth';
import { userService } from '../../services/userService';
import { notificationService } from '../../services/notificationService';
import { UserRole, Participant } from '../../types';
import Button from '../../components/Button';
import LocalLogo from '../../components/LocalLogo';

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State from Onboarding (either Quiz or Clarity Sprint flow)
  const onboardingState = location.state || {};
  const { persona, answers, recommendedPlan, occupation, referrerId, isClarityFlow, prefilledEmail, fromPayment, targetSprintId } = onboardingState;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(prefilledEmail || '');
  const [password, setPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [showLoginLink, setShowLoginLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (prefilledEmail) {
        setEmail(prefilledEmail);
    }
  }, [prefilledEmail]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setRegError("Registry fields required.");
      return;
    }

    setRegError('');
    setShowLoginLink(false);
    setIsSubmitting(true);

    try {
      // 1. Firebase Auth Creation - This automatically logs the user in
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = userCredential.user;
      await updateFbProfile(firebaseUser, { displayName: `${firstName} ${lastName}` });
      
      // 2. Prepare Firestore Profile
      const newUser: Partial<Participant> = {
        id: firebaseUser.uid,
        name: `${firstName} ${lastName}`,
        email: email.trim().toLowerCase(),
        role: UserRole.PARTICIPANT,
        profileImageUrl: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=0E7850&color=fff`,
        persona: persona || 'Seeker',
        onboardingAnswers: answers || {},
        occupation: occupation?.includes('Student') ? 'student' : occupation?.includes('Employed') ? 'employed' : occupation?.includes('Self') ? 'self_employed' : 'unemployed',
        subscription: { 
            planId: (recommendedPlan as any) || 'free', 
            active: true, 
            renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
        },
        walletBalance: 30,
        impactStats: { peopleHelped: 0, streak: 0 },
        createdAt: new Date().toISOString()
      };
      
      await userService.createUserDocument(firebaseUser.uid, newUser);

      // 3. Conditional Enrollment / Referral Logic
      if (referrerId) {
          const referrer = await userService.getUserDocument(referrerId) as Participant;
          if (referrer) {
              const currentImpact = referrer.impactStats?.peopleHelped || 0;
              await userService.updateUserDocument(referrerId, {
                  impactStats: { ...referrer.impactStats!, peopleHelped: currentImpact + 1 }
              });
              await notificationService.createNotification(
                  referrerId, 
                  'referral_update', 
                  'Impact Growth', 
                  `✨ ${firstName} joined Vectorise. Your influence is growing!`,
                  { actionUrl: '/impact' }
              );
          }
      }

      // 4. Send Verification in background
      await sendEmailVerification(firebaseUser);

      // 5. Fulfillment check: if we came from payment, lead directly to Day 1
      if (fromPayment && targetSprintId) {
          const enrollmentId = `enrollment_${firebaseUser.uid}_${targetSprintId}`;
          navigate(`/participant/sprint/${enrollmentId}`);
      } else {
          navigate('/dashboard');
      }

    } catch (error: any) {
      console.error("Signup error handled:", error.code);
      if (error.code === 'auth/email-already-in-use') {
          setRegError("This email is already in the registry.");
          setShowLoginLink(true);
      } else if (error.code === 'auth/weak-password') {
          setRegError("Password must be at least 6 characters.");
      } else {
          setRegError("Registration failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-6 overflow-hidden selection:bg-primary/10 font-sans relative">
      
      <div className="w-full max-w-sm flex flex-col items-center animate-fade-in relative z-10">
        <header className="text-center mb-8">
            <LocalLogo type="green" className="h-6 w-auto mx-auto mb-6 opacity-30" />
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none italic">
                {fromPayment ? 'Secure your registry identity.' : 'Secure your registry.'}
            </h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-3">
                {fromPayment ? 'Final Step: Account Setup' : 'Final Phase Step 01'}
            </p>
        </header>

        <div className="w-full bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 relative overflow-hidden">
            <h2 className="text-[8px] font-black text-center mb-8 tracking-[0.4em] text-primary border-b border-primary/5 pb-4 uppercase">Identity creation</h2>
            
            <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[8px] font-black text-gray-300 uppercase mb-1.5 ml-1">First Name</label>
                        <input 
                            type="text" 
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-50 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none font-bold text-sm transition-all"
                            placeholder="Jamie"
                        />
                    </div>
                    <div>
                        <label className="block text-[8px] font-black text-gray-300 uppercase mb-1.5 ml-1">Last Name</label>
                        <input 
                            type="text" 
                            required
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-50 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none font-bold text-sm transition-all"
                            placeholder="Lee"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-[8px] font-black text-gray-300 uppercase mb-1.5 ml-1">Email Address</label>
                    <input 
                        type="email" 
                        required
                        value={email}
                        readOnly={!!prefilledEmail}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full px-4 py-3.5 bg-gray-50 border border-gray-50 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none font-bold text-sm transition-all ${prefilledEmail ? 'opacity-50 cursor-not-allowed' : ''}`}
                        placeholder="name@email.com"
                    />
                </div>

                <div>
                    <label className="block text-[8px] font-black text-gray-300 uppercase mb-1.5 ml-1">Set Password</label>
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-50 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none font-bold text-sm transition-all"
                        placeholder="••••••••"
                    />
                </div>

                {regError && (
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex flex-col items-center gap-3">
                        <p className="text-[10px] text-red-600 font-black uppercase text-center tracking-widest leading-relaxed">{regError}</p>
                        {showLoginLink && (
                            <Link to="/login" className="px-6 py-2 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-red-700 transition-colors">
                                Log in instead
                            </Link>
                        )}
                    </div>
                )}

                <Button 
                    type="submit" 
                    isLoading={isSubmitting} 
                    className="w-full py-4 bg-primary text-white rounded-full shadow-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.01] active:scale-95"
                >
                    Complete Identity Setup
                </Button>
            </form>

            {!fromPayment && (
                <div className="mt-8 pt-6 border-t border-gray-50 text-center">
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none">
                        Already have a registry key? <Link to="/login" className="text-primary hover:underline">Log in</Link>
                    </p>
                </div>
            )}
            
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none"></div>
        </div>
        
        <footer className="mt-10 opacity-30">
            <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.5em]">Vectorise Registry System</p>
        </footer>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default SignUpPage;