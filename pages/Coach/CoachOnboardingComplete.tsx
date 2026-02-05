
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { userService } from '../../services/userService';
import { auth } from '../../services/firebase';
import { createUserWithEmailAndPassword, updateProfile as updateFbProfile, sendEmailVerification, signOut } from 'firebase/auth';
import { UserRole, Coach } from '../../types';
import Button from '../../components/Button';
import LocalLogo from '../../components/LocalLogo';

const CoachOnboardingComplete: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { answers, niche, applicationDetails } = location.state || {};

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setRegError("All fields are required.");
      return;
    }
    setRegError('');
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = userCredential.user;
      await updateFbProfile(firebaseUser, { displayName: `${firstName} ${lastName}` });
      const newCoach: Partial<Coach> = {
        id: firebaseUser.uid,
        name: `${firstName} ${lastName}`,
        email: email.trim().toLowerCase(),
        role: UserRole.COACH,
        profileImageUrl: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=0E7850&color=fff`,
        bio: `Expert in ${niche}. Focused on visible progress.`,
        niche: niche,
        approved: false, 
        applicationDetails: applicationDetails
      };
      await userService.createUserDocument(firebaseUser.uid, newCoach);
      await sendEmailVerification(firebaseUser);
      await signOut(auth);
      navigate('/verify-email', { state: { email: email.trim(), isCoach: true } });
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.code === 'auth/email-already-in-use') setRegError("This email is already registered.");
      else if (error.code === 'auth/weak-password') setRegError("Weak password. Try at least 6 chars.");
      else setRegError("Registration failed. Please try again.");
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-primary text-white py-12 px-6 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)} 
        className="absolute top-8 left-8 z-20 flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-12 animate-fade-in">
            <LocalLogo type="white" className="h-14 w-auto mx-auto mb-8 opacity-90 drop-shadow-xl" />
            <h1 className="text-4xl font-black mb-4 tracking-tight leading-none">Registry access</h1>
            <p className="text-white/60 text-lg font-medium leading-relaxed">Finalize your profile to start delivering high-impact sprints.</p>
        </div>

        <div className="bg-white rounded-[3rem] p-10 md:p-12 shadow-2xl text-dark relative overflow-hidden animate-slide-up">
          <div className="relative z-10">
            <h2 className="text-[8px] font-black text-center mb-10 tracking-[0.5em] text-primary border-b border-primary/5 pb-6 uppercase">FINAL STEP: SECURE REGISTRY</h2>
            <form onSubmit={handleSignUp} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-300 mb-2.5">First name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-primary/5 outline-none font-bold" placeholder="Jane" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-300 mb-2.5">Last name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-primary/5 outline-none font-bold" placeholder="Doe" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-300 mb-2.5">Registry email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-primary/5 outline-none font-bold" placeholder="email@coach.com" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-300 mb-2.5">Registry password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-primary/5 outline-none font-bold" placeholder="••••••••" />
              </div>

              {regError && <p className="text-red-500 text-[10px] font-black text-center bg-red-50 p-4 rounded-2xl border border-red-100 animate-pulse">{regError}</p>}

              <Button type="submit" isLoading={isSubmitting} className="w-full py-6 text-lg font-black uppercase tracking-[0.25em] rounded-full shadow-2xl shadow-primary/30 transition-transform active:scale-95">
                Unlock Registry
              </Button>
            </form>
            <p className="text-center text-[10px] font-black text-gray-300 mt-10">Already registered? <Link to="/login" className="text-primary hover:underline">Log in here</Link></p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[100px] -mr-16 -mt-16"></div>
        </div>
      </div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-white/5 rounded-full blur-[120px]"></div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 1s ease-out forwards; }
        .animate-slide-up { animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default CoachOnboardingComplete;
