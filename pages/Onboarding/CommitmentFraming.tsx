
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
    
    const isFoundational = sprint && (
      sprint.sprintType === 'Foundational' || 
      sprint.category === 'Core Platform Sprint' || 
      sprint.category === 'Growth Fundamentals'
    );

    setTimeout(() => {
      if (!user && isFoundational && sprint) {
        navigate(`/sprint/preview/${sprint.id}`, { 
          state: { ...state } 
        });
      } else {
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
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSubmittingEmail(false);
    navigate('/');
  };

  if (isChecking) {
      return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#FAFAFA] backdrop-blur-md">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] text-gray-900 flex flex-col items-center justify-center py-12 px-6 overflow-x-hidden font-sans selection:bg-primary/10 relative">
      
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]"></div>
      </div>

      {!showEmailCapture && (
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center animate-fade-in relative z-10">
          
          {/* Left Side: Editorial Content */}
          <div className="space-y-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <LocalLogo type="favicon" className="h-8 w-8" />
                <div className="h-[1px] w-12 bg-gray-200"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">The Protocol</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.95] italic">
                Before you continue <br/>
                <span className="text-gray-300">you have to decide.</span>
              </h1>
            </div>

            <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-md">
              This only works if you commit. Most people start; very few finish. Momentum is earned, not given.
            </p>

            <div className="space-y-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">What this requires</h2>
              <div className="space-y-5">
                {[
                  "Show up daily",
                  "Pay attention to what works",
                  "Finish what you start"
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center group-hover:border-primary/50 transition-colors bg-white">
                      <span className="text-primary font-bold text-lg leading-none">↠</span>
                    </div>
                    <span className="text-lg font-bold tracking-tight text-gray-800">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side: Action Card */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full"></div>
            <div className="bg-white border border-gray-100 rounded-[3rem] p-8 md:p-12 relative overflow-hidden flex flex-col shadow-2xl shadow-gray-200/50">
              
              <div className="space-y-8 flex-1">
                <div className="text-center space-y-2">
                  <p className="text-4xl font-black tracking-tighter text-gray-900">{duration} Days</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">15 mins / day</p>
                </div>

                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-100 to-transparent"></div>

                <div className="text-center space-y-2">
                  <p className="text-sm font-bold text-gray-600">Small actions. Real momentum.</p>
                  <div className="inline-block px-4 py-1.5 bg-red-50 border border-red-100 rounded-full">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
                      Skip a day… you reset your momentum.
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setIsCommitted(!isCommitted)}
                  className={`w-full group flex flex-col items-center gap-4 p-8 rounded-[2.5rem] transition-all duration-500 border-2 ${
                    isCommitted 
                    ? 'bg-primary border-primary shadow-[0_0_40px_rgba(21,158,91,0.2)]' 
                    : 'bg-gray-50 border-gray-100 hover:border-gray-200 hover:bg-white'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                    isCommitted ? 'bg-white border-white scale-110' : 'bg-white border-gray-200'
                  }`}>
                    {isCommitted && <div className="w-3 h-3 bg-primary rounded-full animate-scale-in"></div>}
                  </div>
                  <span className={`text-sm font-black uppercase tracking-[0.15em] text-center leading-tight transition-colors ${isCommitted ? 'text-white' : 'text-gray-400'}`}>
                    I commit to showing up <br/> and finishing this
                  </span>
                </button>
              </div>

              <div className="mt-10 space-y-6">
                <Button 
                  onClick={handleContinue}
                  disabled={!isCommitted}
                  className={`w-full py-6 rounded-2xl shadow-2xl transition-all text-xs font-black tracking-[0.3em] uppercase ${
                    isCommitted 
                    ? 'bg-gray-900 text-white hover:scale-[1.02] active:scale-95 shadow-gray-900/20' 
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed border-none'
                  }`}
                >
                  Start Day 1
                </Button>
                
                <div className="text-center">
                  <button 
                    onClick={() => setShowEmailCapture(true)}
                    className="text-[9px] font-black uppercase tracking-widest text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    I'm not ready to commit right now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEmailCapture && (
        <div className="max-w-md w-full animate-fade-in relative z-10">
          <div className="bg-white border border-gray-100 rounded-[3rem] relative overflow-hidden flex flex-col p-10 md:p-14 animate-slide-up text-center shadow-2xl shadow-gray-200/50">
            <header className="mb-10">
              <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-3xl shadow-inner border border-primary/10">
                📩
              </div>
              <h2 className="text-3xl font-black tracking-tight leading-tight mb-3 italic text-gray-900">Stay in the circle</h2>
              <p className="text-sm text-gray-400 font-bold leading-relaxed">
                Growth is a timing game. If now isn't the window, let's stay connected.
              </p>
            </header>

            <main className="mb-12">
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-8 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold transition-all placeholder-gray-300 text-gray-900"
                />
                <Button 
                  type="submit"
                  isLoading={isSubmittingEmail}
                  className="w-full py-5 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 text-[11px] font-black tracking-widest uppercase"
                >
                  Keep Me Updated
                </Button>
              </form>
            </main>

            <footer>
              <button 
                onClick={() => navigate('/')}
                className="text-[10px] font-black text-gray-300 hover:text-primary transition-colors uppercase tracking-widest"
              >
                No thanks, just take me home
              </button>
            </footer>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-up { animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>
    </div>
  );
};

export default CommitmentFraming;
