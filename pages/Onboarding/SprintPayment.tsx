
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import Button from '../../components/Button';
import { paymentService } from '../../services/paymentService';
import { useAuth } from '../../contexts/AuthContext';
import { Sprint } from '../../types';

const SprintPayment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [guestEmail, setGuestEmail] = useState('');
  const [finalCommitment, setFinalCommitment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Preserve navigation context
  const state = location.state || {};
  const selectedSprint: Sprint | null = state.sprint || null;
  
  // Dynamic price based on flow
  const sprintPrice = selectedSprint?.price ?? 5000;
  const sprintTitle = selectedSprint?.title ?? "Clarity Sprint";

  // Use logged-in email if available, otherwise guest input
  const effectiveEmail = user?.email || guestEmail;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail);
  const canPay = finalCommitment && isEmailValid && !isProcessing;

  const startPayment = async () => {
    if (!isEmailValid) {
        setErrorMessage("Please enter a valid email address to secure your registry.");
        return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      console.log(`[Flow] Requesting Flutterwave link for ${sprintTitle} (₦${sprintPrice})...`);
      
      const checkoutUrl = await paymentService.initializeFlutterwave({
        email: effectiveEmail.toLowerCase().trim(),
        sprintId: selectedSprint?.id || 'clarity-sprint',
        amount: sprintPrice,
        name: user?.name || 'Vectorise Guest'
      });

      console.log("[Flow] Handoff to Flutterwave:", checkoutUrl);
      window.location.href = checkoutUrl;
      
    } catch (error: any) {
      console.error("[Flow] Payment failed:", error);
      setErrorMessage(error.message || "Unable to reach the payment gateway. Please try again.");
      setIsProcessing(false);
    }
  };

  const handleSkipRequest = () => {
    navigate('/onboarding/intro', { 
        state: { ...state, skipToExecution: true } 
    });
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col items-center py-12 px-6 overflow-x-hidden selection:bg-primary/10 font-sans relative">
      <div className="max-w-xl w-full animate-fade-in">
        
        {/* Top Progress / Brand */}
        <div className="flex flex-col items-center mb-10">
          <LocalLogo type="green" className="h-6 w-auto mb-6 opacity-40" />
          <div className="w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
             <div className="h-full bg-primary rounded-full transition-all duration-1000 w-[75%]" style={{ width: '75%' }}></div>
          </div>
        </div>

        {/* Main Pricing Content */}
        <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col animate-slide-up">
          
          <header className="p-8 md:p-12 text-center border-b border-gray-50">
             <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-none mb-3 italic">
               Start the {sprintTitle}
             </h1>
             <div className="space-y-1 text-gray-500 text-xs md:text-sm font-medium leading-relaxed italic">
               <p>You’re not paying for information.</p>
               <p>You’re paying for focus, structure, and completion.</p>
             </div>
          </header>

          <main className="p-8 md:p-12 space-y-10">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
               <section className="bg-gray-50 rounded-3xl p-8 border border-gray-100 text-center space-y-2">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Price</p>
                  <h3 className="text-5xl font-black text-gray-900 tracking-tighter">₦{sprintPrice.toLocaleString()}</h3>
                  <div className="space-y-1 pt-4 border-t border-gray-200/50">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">One-time payment</p>
                  </div>
               </section>

               <section className="space-y-4 pt-4">
                  <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">What's included</h2>
                  <div className="text-[11px] md:text-xs font-bold text-gray-600 space-y-2">
                    <p>✓ {selectedSprint?.duration || 5}-Day Guided Focus</p>
                    <p>✓ Daily Outcome Protocol</p>
                    <p>✓ Registry Certification</p>
                    <p>✓ Professional Coaching Access</p>
                  </div>
               </section>
            </div>

            {/* Email Identification - ONLY IF GUEST */}
            {!user && (
               <section className="pt-6 border-t border-gray-50 space-y-4">
                 <div className="text-center mb-6">
                    <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Registry Identification</h2>
                 </div>
                 <div className="max-w-sm mx-auto">
                    <label className="block text-[8px] font-black text-gray-400 uppercase mb-2 ml-1">Email Address</label>
                    <input 
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all outline-none text-sm font-bold placeholder-gray-300"
                    />
                    <p className="text-[8px] font-medium text-gray-400 mt-3 text-center italic">This email will be used to secure your dashboard access after payment.</p>
                 </div>
               </section>
            )}

            <section className="pt-6 border-t border-gray-50 space-y-6">
               <div className="text-center space-y-2">
                  <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Commitment</h2>
               </div>

               <label className="flex items-start gap-4 p-5 bg-primary/5 border border-primary/10 rounded-2xl cursor-pointer active:scale-[0.98] transition-all group hover:bg-primary/10">
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

              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-[10px] font-bold text-red-600 uppercase tracking-widest text-center animate-pulse">
                  {errorMessage}
                </div>
              )}
            </section>
          </main>

          <footer className="p-8 md:p-12 pt-4 bg-gray-50/50 border-t border-gray-50">
             <div className="space-y-6">
                <Button 
                  onClick={startPayment}
                  disabled={!canPay}
                  isLoading={isProcessing}
                  className={`w-full py-5 rounded-full shadow-2xl transition-all text-sm uppercase tracking-[0.3em] font-black ${
                    canPay ? 'bg-primary text-white hover:scale-[1.02]' : 'bg-gray-200 text-gray-400 grayscale cursor-not-allowed border-none'
                  }`}
                >
                  {isProcessing ? "Authorizing Registry..." : "Pay & Start Sprint"}
                </Button>
                
                <div className="text-center">
                    <button 
                      onClick={handleSkipRequest}
                      className="text-[10px] font-black text-gray-400 hover:text-primary transition-colors underline underline-offset-4 decoration-gray-200"
                    >
                      Need something else? View other paths.
                    </button>
                </div>
             </div>
          </footer>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default SprintPayment;
