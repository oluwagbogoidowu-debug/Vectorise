import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import Button from '../../components/Button';
import { paymentService } from '../../services/paymentService';
import { userService } from '../../services/userService';
import { sprintService } from '../../services/sprintService';
import { useAuth } from '../../contexts/AuthContext';
import { Sprint, Participant, GlobalOrchestrationSettings } from '../../types';

const SprintPayment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateProfile } = useAuth();
  
  const [guestEmail, setGuestEmail] = useState('');
  const [finalCommitment, setFinalCommitment] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [globalSettings, setGlobalSettings] = useState<GlobalOrchestrationSettings | null>(null);

  const state = location.state || {};
  const selectedSprint: Sprint | null = state.sprint || null;
  
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await sprintService.getGlobalOrchestrationSettings();
      setGlobalSettings(settings);
    };
    loadSettings();
  }, []);

  const isCreditSprint = selectedSprint?.pricingType === 'credits';
  const sprintPrice = isCreditSprint ? (selectedSprint?.pointCost ?? 0) : (selectedSprint?.price ?? 5000);
  const sprintTitle = selectedSprint?.title ?? "Sprint";

  const userParticipant = user as Participant;
  const userBalance = userParticipant?.walletBalance || 0;
  const hasEnoughCredits = userBalance >= sprintPrice;

  const effectiveEmail = user?.email || guestEmail;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail);

  const canPay = finalCommitment && (isCreditSprint ? (!!user && hasEnoughCredits) : isEmailValid) && !isProcessing;

  const handleCoinPayment = async () => {
    if (!user || !selectedSprint) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await userService.processWalletTransaction(user.id, {
        amount: -sprintPrice,
        type: 'purchase',
        description: `Unlocked ${sprintTitle} via Credits`,
        auditId: selectedSprint.id
      });
      await updateProfile({ walletBalance: userBalance - sprintPrice });
      
      const enrollments = await sprintService.getUserEnrollments(user.id);
      const hasActive = enrollments.some(e => e.status === 'active' && e.progress.some(p => !p.completed));
      
      if (hasActive) {
          const currentQueue = userParticipant.savedSprintIds || [];
          if (!currentQueue.includes(selectedSprint.id)) {
              await userService.updateUserDocument(user.id, { savedSprintIds: [...currentQueue, selectedSprint.id] });
              await updateProfile({ savedSprintIds: [...currentQueue, selectedSprint.id] });
          }
          navigate('/my-sprints', { replace: true });
      } else {
          const enrollment = await sprintService.enrollUser(user.id, selectedSprint.id, selectedSprint.duration, {
              coachId: selectedSprint.coachId,
              pricePaid: 0,
              source: 'coin'
          });
          navigate(`/participant/sprint/${enrollment.id}`, { replace: true });
      }
    } catch (error: any) {
      setErrorMessage("Credit redemption failed. Please try again later.");
      setIsProcessing(false);
    }
  };

  const startCashPayment = async () => {
    if (!isEmailValid) {
        setErrorMessage("Please enter a valid email address to secure your registry.");
        return;
    }
    
    // Use traceId for cross-session tracking
    const traceId = user?.id || `guest_${effectiveEmail.replace(/[^a-zA-Z0-9]/g, '')}`;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (!user) {
          const emailExists = await userService.checkEmailExists(effectiveEmail);
          if (emailExists) {
              setErrorMessage("Email already in registry. Log in to continue.");
              setTimeout(() => {
                  navigate('/login', { state: { prefilledEmail: effectiveEmail, targetSprintId: selectedSprint?.id } });
              }, 2000);
              return;
          }
      }

      const checkoutUrl = await paymentService.initializeFlutterwave({
        userId: traceId,
        email: effectiveEmail.toLowerCase().trim(),
        sprintId: selectedSprint?.id || 'clarity-sprint',
        amount: Number(sprintPrice),
        name: user?.name || 'Vectorise Guest'
      });
      
      window.location.href = checkoutUrl;
    } catch (error: any) {
      setErrorMessage(error.message || "Unable to reach the payment gateway. Please try again.");
      setIsProcessing(false);
    }
  };

  const handleHesitation = async () => {
    const traceId = user?.id || `guest_${effectiveEmail.replace(/[^a-zA-Z0-9]/g, '')}`;
    // Log abandonment of the payment process
    await paymentService.logPaymentAttempt({
        user_id: traceId,
        sprint_id: selectedSprint?.id || 'clarity-sprint',
        amount: Number(sprintPrice),
        status: 'abandoned'
    });
    navigate('/onboarding/map', { state: { ...state } });
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col items-center py-12 px-6 overflow-x-hidden selection:bg-primary/10 font-sans relative">
      <div className="max-w-xl w-full animate-fade-in">
        <div className="flex flex-col items-center mb-10">
          <LocalLogo type="green" className="h-6 w-auto mb-6 opacity-40" />
          <div className="w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
             <div className="h-full bg-primary rounded-full transition-all duration-1000 w-[75%]" style={{ width: '75%' }}></div>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col animate-slide-up">
          <header className="p-8 md:p-12 text-center border-b border-gray-50">
             <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-none mb-3 italic">Unlock {sprintTitle}</h1>
          </header>
          <main className="p-8 md:p-12 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
               <section className="bg-gray-50 rounded-3xl p-8 border border-gray-100 text-center space-y-2 relative overflow-hidden">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Investment</p>
                  <h3 className="text-5xl font-black text-gray-900 tracking-tighter">{isCreditSprint ? '🪙' : '₦'}{sprintPrice.toLocaleString()}</h3>
               </section>
               <section className="space-y-4 pt-4">
                  <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">What's included</h2>
                  <div className="text-[11px] md:text-xs font-bold text-gray-600 space-y-2">
                    <p>✓ {selectedSprint?.duration || 5}-Day Guided Focus</p>
                    <p>✓ Daily Outcome Protocol</p>
                    <p>✓ Professional Coaching Access</p>
                  </div>
               </section>
            </div>
            
            {!isCreditSprint && (
               <section className="pt-6 border-t border-gray-50 space-y-4">
                 <div className="max-w-sm mx-auto">
                    <label className="block text-[8px] font-black text-gray-400 uppercase mb-2 ml-1">Email Address</label>
                    <input 
                      type="email" 
                      value={user?.email || guestEmail} 
                      onChange={(e) => setGuestEmail(e.target.value)} 
                      readOnly={!!user}
                      placeholder="your@email.com" 
                      className={`w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-8 focus:ring-primary/5 focus:border-primary outline-none text-sm font-black text-gray-900 transition-all ${user ? 'cursor-not-allowed bg-gray-100' : ''}`} 
                    />
                    {user && (
                      <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest mt-2 ml-1 italic">
                        Connected to your active registry identity
                      </p>
                    )}
                 </div>
               </section>
            )}

            <section className="pt-6 border-t border-gray-50 space-y-6">
               <label className="flex items-start gap-4 p-5 bg-primary/5 border border-primary/10 rounded-2xl cursor-pointer active:scale-[0.98] transition-all group hover:bg-primary/10">
                <input type="checkbox" checked={finalCommitment} onChange={(e) => setFinalCommitment(e.target.checked)} className="w-5 h-5 bg-white border-gray-200 rounded focus:ring-primary text-primary" />
                <span className="text-xs font-black text-primary uppercase tracking-widest leading-tight">I’m committing to complete this sprint.</span>
              </label>
              {errorMessage && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-[10px] font-bold text-red-600 uppercase tracking-widest text-center animate-pulse">{errorMessage}</div>}
            </section>
          </main>
          <footer className="p-8 md:p-12 pt-4 bg-gray-50/50 border-t border-gray-50">
             <div className="space-y-6">
                <Button onClick={isCreditSprint ? handleCoinPayment : startCashPayment} disabled={!canPay} isLoading={isProcessing} className="w-full py-5 rounded-full shadow-2xl text-sm uppercase font-black">{isProcessing ? "Authorizing..." : isCreditSprint ? `Redeem ${sprintPrice} Credits` : "Pay & Start Sprint"}</Button>
                <div className="text-center"><button onClick={handleHesitation} className="text-[10px] font-black text-gray-400 hover:text-primary transition-colors underline underline-offset-4 decoration-gray-200 cursor-pointer">Not sure yet? See The Map</button></div>
             </div>
          </footer>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default SprintPayment;