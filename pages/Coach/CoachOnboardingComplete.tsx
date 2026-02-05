
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
  const { niche, applicationDetails } = location.state || {};

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setRegError("Registry fields required.");
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
        bio: `Specialized in ${niche}.`,
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
      if (error.code === 'auth/email-already-in-use') setRegError("Email taken.");
      else if (error.code === 'auth/weak-password') setRegError("Short password.");
      else setRegError("Registry failed.");
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="h-[100dvh] w-screen bg-primary text-white flex flex-col items-center justify-center px-6 overflow-hidden relative">
      <div className="max-w-sm w-full relative z-10 flex flex-col items-center">
        
        <div className="text-center mb-6 animate-fade-in flex-shrink-0">
            <h1 className="text-3xl font-black mb-1 tracking-tight leading-none">Registry access</h1>
            <p className="text-white/60 text-xs font-medium uppercase tracking-widest">Secure your coach profile</p>
        </div>

        <div className="w-full bg-white rounded-[2.5rem] p-8 shadow-2xl text-dark relative overflow-hidden animate-slide-up">
          <div className="relative z-10">
            <h2 className="text-[8px] font-black text-center mb-6 tracking-[0.4em] text-primary border-b border-primary/5 pb-4 uppercase">Final Securement</h2>
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] font-black text-gray-300 uppercase mb-1.5 ml-1">First</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl focus:ring-4 focus:ring-primary/5 outline-none font-bold text-sm" placeholder="Jane" />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-gray-300 uppercase mb-1.5 ml-1">Last</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl focus:ring-4 focus:ring-primary/5 outline-none font-bold text-sm" placeholder="Doe" />
                </div>
              </div>
              <div>
                <label className="block text-[8px] font-black text-gray-300 uppercase mb-1.5 ml-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl focus:ring-4 focus:ring-primary/5 outline-none font-bold text-sm" placeholder="coach@email.com" />
              </div>
              <div>
                <label className="block text-[8px] font-black text-gray-300 uppercase mb-1.5 ml-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-50 rounded-xl focus:ring-4 focus:ring-primary/5 outline-none font-bold text-sm" placeholder="••••••••" />
              </div>

              {regError && <p className="text-red-500 text-[9px] font-black text-center bg-red-50 p-2.5 rounded-xl border border-red-100">{regError}</p>}

              <Button type="submit" isLoading={isSubmitting} className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] rounded-full shadow-lg transition-transform active:scale-95 mt-2">
                Join Registry
              </Button>
            </form>
            <p className="text-center text-[9px] font-black text-gray-300 mt-6 uppercase tracking-widest">Registered? <Link to="/login" className="text-primary hover:underline">Log in</Link></p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none"></div>
        </div>
      </div>

      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default CoachOnboardingComplete;
