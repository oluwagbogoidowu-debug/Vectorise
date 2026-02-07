
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import Button from '../../components/Button';
import { Sprint } from '../../types';

const CommitmentFraming: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCommitted, setIsCommitted] = useState(false);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);

  // Preserve navigation context (target sprints, skip logic, etc.)
  const state = location.state || {};
  const sprint: Sprint | null = state.sprint || null;

  const handleContinue = () => {
    if (!isCommitted) return;
    
    // In both cases (skip to execution or standard clarity path), we now force sign-up first.
    // We flag this as a clarity flow so the signup page knows to potentially redirect to payment later.
    navigate('/signup', { 
      state: { ...state, isClarityFlow: true } 
    });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsSubmittingEmail(true);
    // Simulate API call to save email to newsletter list
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSubmittingEmail(false);
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark/95 backdrop-blur-md animate-fade-in selection:bg-primary/10">
      
      {/* Main Commitment Modal */}
      {!showEmailCapture && (
        <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
          
          {/* Modal Header */}
          <header className="p-8 pb-4 text-center border-b border-gray-50 flex-shrink-0">
             <LocalLogo type="green" className="h-6 w-auto mx-auto mb-4 opacity-80" />
             <h1 className="text-2xl font-black text-gray-900 tracking-tighter italic">Before you start</h1>
             <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-1 opacity-60">Execution Protocol</p>
          </header>

          {/* Modal Content - Scrollable */}
          <main className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar space-y-8">
            
            {/* Requirements */}
            <section className="space-y-4">
              <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Requirements</h2>
              <div className="space-y-3">
                {[
                  { t: "Daily action", d: `One focused task per day to create ${sprint?.title || 'clarity'}.` },
                  { t: "Honest reflection", d: "Notice what energizes or drains you." },
                  { t: "Completion mindset", d: "Finishing is where the value lives." }
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl group transition-all hover:border-primary/20">
                    <h3 className="text-xs font-black text-gray-900 mb-0.5">{item.t}</h3>
                    <p className="text-[11px] text-gray-400 leading-snug font-medium">{item.d}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Time & Commitment */}
            <section className="bg-primary/5 rounded-[1.5rem] p-6 text-center space-y-4 border border-primary/10">
               <div className="flex justify-center items-center gap-6">
                  <div>
                    <p className="text-2xl font-black text-primary leading-none">{sprint?.duration || 5}</p>
                    <p className="text-[8px] font-black uppercase text-primary/60">Days</p>
                  </div>
                  <div className="w-px h-6 bg-primary/10"></div>
                  <div>
                    <p className="text-2xl font-black text-primary leading-none">15</p>
                    <p className="text-[8px] font-black uppercase text-primary/60">Min/Day</p>
                  </div>
               </div>
               <p className="text-[10px] font-medium text-primary/70 italic">"You don’t need more time. You need protected focus."</p>
            </section>

            {/* The Checkbox */}
            <section className="pt-2">
              <label className="flex items-start gap-4 p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] cursor-pointer active:scale-[0.98] transition-all group hover:border-primary/20">
                <div className="relative flex items-center h-5 mt-0.5">
                  <input 
                    type="checkbox" 
                    checked={isCommitted}
                    onChange={(e) => setIsCommitted(e.target.checked)}
                    className="w-5 h-5 bg-white border-gray-200 rounded focus:ring-offset-white focus:ring-primary text-primary cursor-pointer transition-all"
                  />
                </div>
                <div className="text-xs font-bold text-gray-700 leading-tight select-none">
                  I’m ready to commit to daily action for the next {sprint?.duration || 5} days.
                </div>
              </label>
            </section>
          </main>

          {/* Modal Footer */}
          <footer className="p-8 pt-4 border-t border-gray-50 bg-white flex-shrink-0">
            <div className="space-y-4">
              <Button 
                onClick={handleContinue}
                disabled={!isCommitted}
                className={`w-full py-4 rounded-full shadow-xl transition-all text-[11px] uppercase tracking-widest font-black ${
                  isCommitted ? 'bg-primary text-white active:scale-95' : 'bg-gray-100 text-gray-300 grayscale cursor-not-allowed border-none shadow-none'
                }`}
              >
                Secure My Path &rarr;
              </Button>
              
              <div className="text-center">
                <button 
                  onClick={() => setShowEmailCapture(true)}
                  className="text-[9px] font-black text-gray-400 hover:text-red-400 transition-colors uppercase tracking-widest"
                >
                  Not ready yet
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* Email Capture Modal (Lead Magnet) */}
      {showEmailCapture && (
        <div className="bg-white rounded-[2.5rem] w-full max-sm shadow-2xl relative overflow-hidden flex flex-col p-8 md:p-12 animate-slide-up text-center">
          <header className="mb-8">
            <div className="w-16 h-16 bg-primary/5 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-2xl shadow-inner">
              📩
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tighter leading-none italic mb-2">Stay in the circle</h2>
            <p className="text-xs text-gray-400 font-medium leading-relaxed italic">
              Growth is a timing game. If now isn't the window, let's stay connected.
            </p>
          </header>

          <main className="mb-10">
            <p className="text-sm text-gray-600 font-medium leading-relaxed mb-6 italic">
              Leave your email and we'll send you small reminders and insights to help you find your next momentum window.
            </p>

            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-8 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold transition-all placeholder-gray-300"
              />
              <Button 
                type="submit"
                isLoading={isSubmittingEmail}
                className="w-full py-4 rounded-xl shadow-xl shadow-primary/20 text-[10px] uppercase tracking-widest font-black"
              >
                Keep me updated
              </Button>
            </form>
          </main>

          <footer>
            <button 
              onClick={() => navigate('/')}
              className="text-[9px] font-black text-gray-300 hover:text-primary uppercase tracking-[0.2em] transition-colors"
            >
              No thanks, just take me home
            </button>
          </footer>

          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
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
