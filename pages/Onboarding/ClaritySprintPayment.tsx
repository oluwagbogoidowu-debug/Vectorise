
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import Button from '../../components/Button';

const ClaritySprintPayment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [finalCommitment, setFinalCommitment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);

  // Preserve navigation context
  const state = location.state || {};

  const handlePayment = async () => {
    if (!finalCommitment) return;
    setIsProcessing(true);
    
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsProcessing(false);
    // Proceed to quiz intro
    navigate('/onboarding/intro', { state });
  };

  const handleSkipRequest = () => {
      setShowEmailCapture(true);
  };

  const proceedToExecution = () => {
    // Navigate to intro with skipToExecution flag set to true
    navigate('/onboarding/intro', { 
        state: { ...state, skipToExecution: true } 
    });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsSubmittingEmail(true);
    // Simulate API call to save email
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSubmittingEmail(false);
    proceedToExecution();
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col items-center py-12 px-6 overflow-x-hidden selection:bg-primary/10 font-sans relative">
      <div className="max-w-xl w-full animate-fade-in">
        
        {/* Top Progress / Brand */}
        <div className="flex flex-col items-center mb-10">
          <LocalLogo type="green" className="h-6 w-auto mb-6 opacity-40" />
          <div className="w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
             <div className="h-full bg-primary rounded-full transition-all duration-1000 w-[60%]" style={{ width: '60%' }}></div>
          </div>
        </div>

        {/* Main Pricing Content */}
        <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col animate-slide-up">
          
          {/* Header Section */}
          <header className="p-8 md:p-12 text-center border-b border-gray-50">
             <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-none mb-3 italic">
               Start the Clarity Sprint
             </h1>
             <div className="space-y-1 text-gray-500 text-xs md:text-sm font-medium leading-relaxed italic">
               <p>You’re not paying for information.</p>
               <p>You’re paying for focus, structure, and completion.</p>
             </div>
          </header>

          <main className="p-8 md:p-12 space-y-12">
            
            {/* What you're getting */}
            <section className="space-y-6">
               <h2 className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">What you’re getting</h2>
               <div className="space-y-4">
                 {[
                   "The 5-Day Clarity Sprint",
                   "One focused outcome",
                   "One guided action per day",
                   "Built-in reflection to lock learning",
                   "A repeatable clarity system you’ll use beyond this sprint"
                 ].map((item, i) => (
                   <div key={i} className="flex items-start gap-4">
                      <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0 text-[9px] mt-0.5">
                        ✓
                      </div>
                      <p className="text-xs md:text-sm font-bold text-gray-700 leading-snug">{item}</p>
                   </div>
                 ))}
                 <p className="pt-4 text-xs text-gray-400 font-medium italic border-t border-gray-50">
                    "This sprint is designed to be completed once and referenced many times."
                 </p>
               </div>
            </section>

            {/* Price & Value Logic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
               {/* The Price */}
               <section className="bg-gray-50 rounded-3xl p-8 border border-gray-100 text-center space-y-2">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Price</p>
                  <h3 className="text-5xl font-black text-gray-900 tracking-tighter">₦5,000</h3>
                  <div className="space-y-1 pt-4 border-t border-gray-200/50">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">One-time payment</p>
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest line-through">No subscription</p>
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">No upsells</p>
                  </div>
                  <div className="pt-6">
                    <p className="text-[10px] text-gray-600 font-bold leading-relaxed italic">
                      You pay once. <br/> You finish it. <br/> Then you decide your next move.
                    </p>
                  </div>
               </section>

               {/* Why it's paid */}
               <section className="space-y-6 pt-4">
                  <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Why it’s paid</h2>
                  <div className="space-y-6 text-[11px] md:text-xs font-medium text-gray-500 leading-relaxed italic">
                    <p>
                       <span className="text-gray-900 font-black not-italic">Free creates curiosity.</span> <br/>
                       Paid creates completion.
                    </p>
                    <p>This sprint only works if you show up daily.</p>
                    <p>The price is here to protect your attention, not to extract value.</p>
                  </div>
               </section>
            </div>

            {/* Final Commitment */}
            <section className="pt-8 border-t border-gray-50 space-y-8">
               <div className="text-center space-y-2">
                  <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Final commitment</h2>
                  <p className="text-xs font-bold text-gray-900 italic">Before you continue, pause and confirm:</p>
               </div>

               <div className="space-y-3 px-2">
                 {[
                   "I will complete all 5 days",
                   "I will do the daily action, not just read",
                   "I understand this sprint gives clarity through action, not answers handed to me"
                 ].map((text, i) => (
                   <div key={i} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-primary/20 rounded-full"></div>
                      <p className="text-[11px] md:text-xs font-bold text-gray-600">{text}</p>
                   </div>
                 ))}
               </div>

               <label className="flex items-start gap-4 p-6 bg-primary/5 border border-primary/10 rounded-2xl cursor-pointer active:scale-[0.98] transition-all group hover:bg-primary/10">
                <div className="relative flex items-center h-5 mt-0.5">
                  <input 
                    type="checkbox" 
                    checked={finalCommitment}
                    onChange={(e) => setFinalCommitment(e.target.checked)}
                    className="w-5 h-5 bg-white border-gray-200 rounded focus:ring-offset-white focus:ring-primary text-primary cursor-pointer transition-all"
                  />
                </div>
                <div className="text-xs font-black text-primary uppercase tracking-widest leading-tight select-none pt-0.5">
                  I’m committing to complete this sprint.
                </div>
              </label>
            </section>
          </main>

          {/* Action Footer */}
          <footer className="p-8 md:p-12 pt-4 bg-gray-50/50 border-t border-gray-50">
             <div className="space-y-6">
                <Button 
                  onClick={handlePayment}
                  disabled={!finalCommitment}
                  isLoading={isProcessing}
                  className={`w-full py-5 rounded-full shadow-2xl transition-all text-sm uppercase tracking-[0.3em] font-black ${
                    finalCommitment ? 'bg-primary text-white hover:scale-[1.02] active:scale-95' : 'bg-gray-200 text-gray-400 grayscale cursor-not-allowed border-none shadow-none'
                  }`}
                >
                  Pay & Start Sprint
                </Button>
                
                <div className="text-center space-y-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Already clear on your direction?</p>
                    <button 
                      onClick={handleSkipRequest}
                      className="text-[10px] font-black text-gray-500 hover:text-primary transition-colors underline underline-offset-4 decoration-gray-200"
                    >
                      You’ll be able to skip this sprint and choose a focused execution sprint next.
                    </button>
                  </div>
                </div>
             </div>
          </footer>
        </div>

        <div className="mt-12 text-center">
           <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.5em]">Vectorise • Growth Registry Protocol</p>
        </div>
      </div>

      {/* Email Capture Modal (Skip Path Lead Magnet) */}
      {showEmailCapture && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-dark/95 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col p-8 md:p-12 animate-slide-up text-center">
            <header className="mb-8">
              <div className="w-16 h-16 bg-primary/5 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-2xl shadow-inner">
                📩
              </div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter leading-none italic mb-2">Stay in the circle</h2>
              <p className="text-xs text-gray-400 font-medium leading-relaxed italic">
                You're moving fast. Growth is a timing game.
              </p>
            </header>

            <main className="mb-10">
              <p className="text-sm text-gray-600 font-medium leading-relaxed mb-6 italic">
                Since you're skipping the foundational path, leave your email and we'll send you small reminders and insights to help you stay sharp during your execution sprints.
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
                onClick={proceedToExecution}
                className="text-[9px] font-black text-gray-300 hover:text-primary uppercase tracking-[0.2em] transition-colors"
              >
                No thanks, just take me to the next step
              </button>
            </footer>

            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default ClaritySprintPayment;
