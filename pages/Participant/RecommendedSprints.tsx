import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { auth } from '../../services/firebase';
import { createUserWithEmailAndPassword, updateProfile as updateFbProfile, sendEmailVerification, signOut } from 'firebase/auth';
import { Sprint, UserRole, Participant } from '../../types';
import { notificationService } from '../../services/notificationService';
import Button from '../../components/Button';
import LocalLogo from '../../components/LocalLogo';
import { translateToTag, calculateMatchScore } from '../../utils/tagUtils';

const RecommendedSprints: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { persona, answers, recommendedPlan, occupation, targetSprintId, referrerId } = location.state || {};

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQueued, setIsQueued] = useState(true); 
  
  const [availableSprints, setAvailableSprints] = useState<Sprint[]>([]);
  const [isLoadingSprints, setIsLoadingSprints] = useState(true);

  useEffect(() => {
    const fetchSprints = async () => {
      setIsLoadingSprints(true);
      try {
        const sprints = await sprintService.getPublishedSprints();
        setAvailableSprints(sprints);
      } catch (err) {
        console.error("Error fetching recommended sprints:", err);
      } finally {
        setIsLoadingSprints(false);
      }
    };
    fetchSprints();
  }, []);

  const path = useMemo(() => {
    if (availableSprints.length === 0) return null;

    // Phase 01: Strictly 1 Platform-Owned Foundational Sprint
    let foundational = availableSprints.find(s => 
        s.category === 'Growth Fundamentals' || s.category === 'Core Platform Sprint'
    );
    if (!foundational) foundational = availableSprints[0];

    // Phase 02: Strictly 1 Coach-Led Registry Sprint
    const registrySprints = availableSprints.filter(s => 
        s.category !== 'Growth Fundamentals' && s.category !== 'Core Platform Sprint'
    );
    
    let nextPath = registrySprints.find(s => s.id === targetSprintId);
    
    if (!nextPath) {
        const userProfile = {
            persona: persona,
            p1: translateToTag(persona, answers[1]),
            p2: translateToTag(persona, answers[2]),
            p3: translateToTag(persona, answers[3]),
            occupation: translateToTag('', occupation)
        };

        const scoredSprints = registrySprints
            .map(s => ({
                sprint: s,
                score: calculateMatchScore(userProfile, s.targeting)
            }))
            .sort((a, b) => b.score - a.score);

        if (scoredSprints.length > 0) {
            nextPath = scoredSprints[0].sprint;
        }
    }

    // Fallback if no registry sprints match well
    if (!nextPath) nextPath = registrySprints[0];

    return { foundational, nextPath };
  }, [availableSprints, targetSprintId, persona, answers, occupation]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setRegError("All fields are required.");
      return;
    }
    if (!path?.foundational) {
        setRegError("Configuration error. Please try again.");
        return;
    }

    setRegError('');
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = userCredential.user;
      await updateFbProfile(firebaseUser, { displayName: `${firstName} ${lastName}` });
      
      const queueIds = isQueued && path.nextPath ? [path.nextPath.id] : [];

      const newUser: Partial<Participant> = {
        id: firebaseUser.uid,
        name: `${firstName} ${lastName}`,
        email: email.trim().toLowerCase(),
        role: UserRole.PARTICIPANT,
        profileImageUrl: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=0E7850&color=fff`,
        persona,
        onboardingAnswers: answers,
        occupation: occupation?.includes('Student') ? 'student' : occupation?.includes('Employed') ? 'employed' : occupation?.includes('Self') ? 'self_employed' : 'unemployed',
        subscription: { planId: (recommendedPlan as any) || 'free', active: true, renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
        savedSprintIds: queueIds,
        enrolledSprintIds: [path.foundational.id],
        walletBalance: 30,
        impactStats: { peopleHelped: 0, streak: 0 },
        createdAt: new Date().toISOString()
      };
      
      await userService.createUserDocument(firebaseUser.uid, newUser);
      localStorage.removeItem('vectorise_quiz_prefill');

      await sprintService.enrollUser(firebaseUser.uid, path.foundational.id, path.foundational.duration);
      
      if (referrerId) {
          const referrer = await userService.getUserDocument(referrerId) as Participant;
          if (referrer) {
              const currentImpact = referrer.impactStats?.peopleHelped || 0;
              await userService.updateUserDocument(referrerId, {
                  impactStats: { 
                      ...referrer.impactStats!, 
                      peopleHelped: currentImpact + 1 
                  }
              });
              // Fix: Corrected positional arguments for createNotification.
              await notificationService.createNotification(
                  referrerId, 
                  'referral_update', 
                  'Impact Growth', 
                  `✨ ${firstName} joined Vectorise. Your influence is growing!`,
                  { actionUrl: '/impact' }
              );
          }
      }

      await sendEmailVerification(firebaseUser);
      await signOut(auth);
      navigate('/verify-email', { state: { email: email.trim() } });
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.code === 'auth/email-already-in-use') {
          setRegError("This email is already in use. Try logging in instead.");
      } else if (error.code === 'auth/weak-password') {
          setRegError("Password must be at least 6 characters.");
      } else {
          setRegError("Registration failed. Please try again.");
      }
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-primary text-white py-12 px-6 overflow-x-hidden relative">
      <button 
        onClick={() => navigate(-1)} 
        className="absolute top-8 left-8 z-20 flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex justify-center mb-10">
            <LocalLogo type="white" className="h-12 w-auto animate-fade-in opacity-80" />
        </div>

        <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none mb-4 italic">Your Blueprint.</h1>
            <p className="text-white/60 text-lg font-medium max-w-lg mx-auto">We've architected a 2-phase sequence to maximize your growth based on your profile.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {isLoadingSprints ? (
             <div className="col-span-2 py-12 flex justify-center"><div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div></div>
          ) : path ? (
            <>
                <div className="bg-white rounded-[2.5rem] p-8 text-dark relative overflow-hidden shadow-2xl flex flex-col animate-slide-up">
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-6">
                            <span className="px-4 py-1.5 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">Phase 01</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Foundational</span>
                        </div>
                        
                        <div className="mb-6 rounded-2xl overflow-hidden aspect-video shadow-sm">
                            <img src={path.foundational?.coverImageUrl} className="w-full h-full object-cover" alt="" />
                        </div>

                        <h3 className="text-2xl font-black mb-3 leading-tight tracking-tight text-gray-900">{path.foundational?.title}</h3>
                        <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8 flex-grow">
                            To get the most of this platform and attain your goals, <span className="text-primary font-bold">run this first sprint.</span> It establishes the core focus needed for your journey.
                        </p>
                        
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">🚀</div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-snug">Auto-enrolled<br/><span className="text-primary">Starts immediately</span></p>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl flex flex-col animate-slide-up" style={{ animationDelay: '150ms' }}>
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-6">
                            <span className="px-4 py-1.5 bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest">Phase 02</span>
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Evolution</span>
                        </div>

                        <div className="mb-6 rounded-2xl overflow-hidden aspect-video border border-white/10">
                            <img src={path.nextPath?.coverImageUrl} className="w-full h-full object-cover grayscale opacity-80" alt="" />
                        </div>

                        <h3 className="text-2xl font-black mb-3 leading-tight tracking-tight text-white">{path.nextPath?.title}</h3>
                        <p className="text-sm text-white/60 font-medium leading-relaxed mb-8 flex-grow">
                            Then you will run this recommended sprint <span className="text-white font-bold">based on who you are becoming.</span> It's tailored to your unique context and long-term vision.
                        </p>

                        <button 
                            onClick={() => setIsQueued(!isQueued)}
                            className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border shadow-lg flex items-center justify-center gap-3 ${
                                isQueued 
                                ? 'bg-[#0FB881] text-primary border-[#0FB881] shadow-primary/20 scale-[0.98]' 
                                : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
                            }`}
                        >
                            {isQueued ? (
                                <><span className="text-lg">✓</span> Secured in Queue</>
                            ) : (
                                <><span className="text-lg">+</span> Add to Upcoming Queue</>
                            )}
                        </button>
                    </div>
                </div>
            </>
          ) : (
            <div className="col-span-2 text-center py-20 opacity-30 font-black text-xs">Initializing blueprints...</div>
          )}
        </div>

        <div className="bg-white rounded-[3rem] p-8 md:p-14 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] text-dark relative overflow-hidden animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="relative z-10">
            <h2 className="text-[8px] font-black text-center mb-10 tracking-[0.4em] text-primary uppercase">SECURE YOUR BLUEPRINT & START PHASE 01</h2>
            
            <form onSubmit={handleSignUp} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-300 mb-2.5 ml-1">First name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-8 focus:ring-primary/5 focus:border-primary outline-none transition-all font-bold" placeholder="e.g. Jamie" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-300 mb-2.5 ml-1">Last name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-8 focus:ring-primary/5 focus:border-primary outline-none transition-all font-bold" placeholder="e.g. Lee" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-300 mb-2.5 ml-1">Email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-8 focus:ring-primary/5 focus:border-primary outline-none transition-all font-bold" placeholder="jamie@growth.com" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-300 mb-2.5 ml-1">Secure password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-8 focus:ring-primary/5 focus:border-primary outline-none transition-all font-bold" placeholder="••••••••" />
              </div>

              {regError && <p className="text-red-500 text-[10px] font-black text-center bg-red-50 p-4 rounded-2xl border border-red-100 animate-pulse">{regError}</p>}

              <Button type="submit" isLoading={isSubmitting} className="w-full py-6 text-lg font-black uppercase tracking-[0.25em] rounded-full shadow-2xl shadow-primary/30 transition-transform active:scale-95">
                Unlock My Path
              </Button>
            </form>
            <p className="text-center text-[10px] font-black text-gray-300 mt-10">Already have an account? <Link to="/login" className="text-primary hover:underline">Log in here</Link></p>
          </div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[100px] -mr-24 -mt-24"></div>
        </div>
      </div>
      
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-black/5 opacity-40"></div>
      
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 0.8; } }
        .animate-fade-in { animation: fadeIn 1s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default RecommendedSprints;