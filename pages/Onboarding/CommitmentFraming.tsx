
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import Button from '../../components/Button';
import { Sprint, Track } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { Zap } from 'lucide-react';

const CommitmentFraming: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isCommitted, setIsCommitted] = useState(false);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [hasActiveSprint, setHasActiveSprint] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const [isNavigating, setIsNavigating] = useState(false);

  // Preserve navigation context (target sprints, skip logic, etc.)
  const state = location.state || {};
  const sprint: Sprint | null = state.sprint || null;
  const track: Track | null = state.track || null;

  const duration = useMemo(() => {
    if (sprint) return sprint.duration;
    if (track && state.totalDuration) return state.totalDuration;
    return 5;
  }, [sprint, track, state.totalDuration]);

  const title = useMemo(() => {
    if (sprint) return sprint.title;
    if (track) return track.title;
    return "this program";
  }, [sprint, track]);

  useEffect(() => {
    const checkActive = async () => {
        if (!user) {
            setIsChecking(false);
            return;
        }
        try {
            const enrollments = await sprintService.getUserEnrollments(user.id);
            const active = enrollments.some(e => e.status === 'active' && e.progress.some(p => !p.completed));
            setHasActiveSprint(active);
        } catch (err) {
            console.error(err);
        } finally {
            setIsChecking(false);
        }
    };
    checkActive();
  }, [user]);

  const handleContinue = () => {
    if (!isCommitted) return;
    
    setIsNavigating(true);
    
    // Check if it's a foundational sprint and user is not logged in
    const isFoundational = sprint && (
      sprint.sprintType === 'Foundational' || 
      sprint.category === 'Core Platform Sprint' || 
      sprint.category === 'Growth Fundamentals'
    );

    // Brief delay to show progress bar animation
    setTimeout(() => {
      if (!user && isFoundational && sprint) {
        // Redirect to preview mode for unauthenticated users on foundational sprints
        navigate(`/sprint/preview/${sprint.id}`, { 
          state: { ...state } 
        });
      } else {
        // Pass everything through to payment
        navigate('/onboarding/sprint-payment', { 
          state: { ...state } 
        });
      }
    }, 600);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsSubmittingEmail(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSubmittingEmail(false);
    navigate('/');
  };

  if (isChecking) {
      return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-dark/95 backdrop-blur-md">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col items-center py-6 px-4 overflow-x-hidden selection:bg-primary/10 font-sans relative">
      
      {/* Main Commitment Card */}
      {!showEmailCapture && (
        <div className="max-w-xl w-full animate-fade-in">
          <div className="flex flex-col items-center mb-6">
            <LocalLogo type="green" className="h-5 w-auto mb-4 opacity-40" />
            <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-primary rounded-full transition-all duration-700" 
                 style={{ width: isNavigating ? '75%' : '50%' }}
               ></div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col animate-slide-up">
            
            <header className="p-6 md:p-8 text-center border-b border-gray-50 bg-white">
               <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight leading-tight">Read this before you continue</h1>
               <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-3 opacity-70">
                   Scheduling your next growth window
               </p>
            </header>

            <main className="p-6 md:p-8 space-y-6">
              
              {hasActiveSprint && (
                  <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl animate-fade-in">
                      <p className="text-[11px] font-bold text-primary leading-relaxed">
                          You're currently in a sprint. This will be added to your queue—no overlap, just continuous momentum.
                      </p>
                  </div>
              )}

              <section className="space-y-4">
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">The Commitment</h2>
                <div className="space-y-4">
                  {[
                    { t: "Show up daily", d: "Commit to one clear action every single day." },
                    { t: "Self-awareness", d: "Notice what works and what doesn't as you progress." },
                    { t: "Complete the journey", d: "The results only come to those who finish." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="w-1.5 h-1.5 bg-primary/20 rounded-full mt-1.5 group-hover:bg-primary transition-colors flex-shrink-0"></div>
                      <div>
                        <h3 className="text-[12px] font-black text-gray-900 leading-none mb-1">{item.t}</h3>
                        <p className="text-[11px] text-gray-500 leading-relaxed font-medium">{item.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="py-4 border-y border-gray-50 flex items-center justify-between">
                 <div>
                    <p className="text-sm font-black text-gray-900">{duration} days • 15 min/day</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">Consistency is the foundation of growth.</p>
                 </div>
                 <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                 </div>
              </section>

              <div className="bg-red-50/50 border border-red-100/50 p-3 rounded-xl text-center">
                <p className="text-[10px] font-bold text-red-500 leading-tight">
                  If you don't complete this, you reset your own momentum.
                </p>
              </div>

              <section>
                <label className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer active:scale-[0.98] transition-all group hover:border-primary/20 hover:bg-white">
                  <div className="relative flex items-center h-5">
                    <input 
                      type="checkbox" 
                      checked={isCommitted}
                      onChange={(e) => setIsCommitted(e.target.checked)}
                      className="w-5 h-5 bg-white border-gray-200 rounded-lg focus:ring-offset-white focus:ring-primary text-primary cursor-pointer transition-all"
                    />
                  </div>
                  <div className="text-[11px] font-bold text-gray-700 leading-tight select-none">
                    I will show up and complete each day without skipping.
                  </div>
                </label>
              </section>
            </main>

            <footer className="p-6 md:p-8 pt-4 bg-gray-50/50 flex-shrink-0 border-t border-gray-50">
              <div className="space-y-4">
                <Button 
                  onClick={handleContinue}
                  disabled={!isCommitted}
                  className={`w-full py-5 rounded-2xl shadow-2xl transition-all text-[11px] font-black tracking-widest ${
                    isCommitted ? 'bg-primary text-white active:scale-95 shadow-primary/20' : 'bg-gray-100 text-gray-300 grayscale cursor-not-allowed border-none shadow-none'
                  }`}
                >
                  Lock This In
                </Button>
                
                <div className="text-center">
                  <button 
                    onClick={() => setShowEmailCapture(true)}
                    className="text-[10px] font-bold text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    I'm not ready to commit right now
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </div>
      )}

      {showEmailCapture && (
        <div className="max-w-md w-full animate-fade-in">
          <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 relative overflow-hidden flex flex-col p-10 md:p-14 animate-slide-up text-center">
            <header className="mb-10">
              <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-3xl shadow-inner">
                📩
              </div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight mb-3">Stay in the circle</h2>
              <p className="text-sm text-gray-400 font-bold leading-relaxed">
                Growth is a timing game. If now isn't the window, let's stay connected.
              </p>
            </header>

            <main className="mb-12">
              <p className="text-[13px] text-gray-600 font-medium leading-relaxed mb-8">
                Leave your email and we'll send you small reminders and insights to help you find your next momentum window.
              </p>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-8 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold transition-all placeholder-gray-300"
                />
                <Button 
                  type="submit"
                  isLoading={isSubmittingEmail}
                  className="w-full py-5 rounded-2xl shadow-xl shadow-primary/20 text-[11px] font-black tracking-widest"
                >
                  Keep Me Updated
                </Button>
              </form>
            </main>

            <footer>
              <button 
                onClick={() => navigate('/')}
                className="text-[10px] font-black text-gray-300 hover:text-primary transition-colors"
              >
                No thanks, just take me home
              </button>
            </footer>

            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.05); border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default CommitmentFraming;
