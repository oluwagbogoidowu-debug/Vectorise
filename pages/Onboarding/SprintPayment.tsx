import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import Button from '../../components/Button';
import { paymentService } from '../../services/paymentService';
import { userService, sanitizeData } from '../../services/userService';
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
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const [globalSettings, setGlobalSettings] = useState<GlobalOrchestrationSettings | null>(null);

  const state = location.state || {};
  const selectedSprint: Sprint | null = state.sprint || null;
  
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await sprintService.getGlobalOrchestrationSettings();
      setGlobalSettings(settings);
    };
    loadSettings();
    
    if (state.prefilledEmail && !guestEmail) {
      setGuestEmail(state.prefilledEmail);
    }
  }, [state.prefilledEmail]);

  const isCreditSprint = selectedSprint?.pricingType === 'credits';
  const sprintPrice = isCreditSprint ? (selectedSprint?.pointCost ?? 0) : (selectedSprint?.price ?? 5000);
  const sprintTitle = selectedSprint?.title ?? "Sprint";
  const sprintId = selectedSprint?.id;

  const userParticipant = user as Participant;
  const userBalance = userParticipant?.walletBalance || 0;
  const hasEnoughCredits = userBalance >= sprintPrice;

  const effectiveEmail = user?.email || guestEmail;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail);

  const isFormValid = isEmailValid && !!sprintId && (isCreditSprint ? (!!user && hasEnoughCredits) : true);
  const canPay = finalCommitment && isFormValid && !isProcessing;

  const handleCoinPayment = async () => {
    if (!user || !selectedSprint) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setValidationError(null);

    try {
      await userService.processWalletTransaction(user.id, {
        amount: -sprintPrice,
        type: 'purchase',
        description: `Unlocked ${sprintTitle} via Credits`,
        auditId: selectedSprint.id
      });
      await updateProfile(sanitizeData({ walletBalance: userBalance - sprintPrice }));
      
      const enrollments = await sprintService.getUserEnrollments(user.id);
      const hasActive = enrollments.some(e => e.status === 'active' && e.progress.some(p => !p.completed));
      
      if (hasActive) {
          const currentQueue = userParticipant.savedSprintIds || [];
          if (!currentQueue.includes(selectedSprint.id)) {
              await userService.updateUserDocument(user.id, { savedSprintIds: [...currentQueue, selectedSprint.id] });
              await updateProfile(sanitizeData({ savedSprintIds: [...currentQueue, selectedSprint.id] }));
          }
          navigate('/my-sprints', { replace: true });
      } else {
          const enrollment = await sprintService.enrollUser(user.id, selectedSprint.id, selectedSprint.duration, {
              coachId: selectedSprint.coachId,
              pricePaid: 0,
              currency: selectedSprint.currency || 'NGN',
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
    setValidationError(null);
    setErrorMessage(null);

    if (!effectiveEmail.trim()) {
        setValidationError("Email address is required to proceed.");
        return;
    }

    if (!isEmailValid) {
        setValidationError("Please enter a valid email address.");
        return;
    }

    if (!sprintId) {
        setValidationError("Program selection error. Please return to discovery.");
        return;
    }
    
    const traceId = user?.id || `guest_${effectiveEmail.replace(/[^a-zA-Z0-9]/g, '')}`;

    setIsProcessing(true);

    const payload = {
        userId: traceId,
        email: effectiveEmail.toLowerCase().trim(),
        sprintId: sprintId,
        amount: Number(sprintPrice),
        currency: "NGN",
        name: user?.name || 'Vectorise Guest'
    };

    try {
      if (!user) {
          const emailExists = await userService.checkEmailExists(effectiveEmail);
          if (emailExists) {
              setErrorMessage("Email already in registry. Log in to continue.");
              setTimeout(() => {
                  navigate('/login', { state: { prefilledEmail: effectiveEmail, targetSprintId: sprintId } });
              }, 2000);
              return;
          }
      }

      const checkoutUrl = await paymentService.initializeFlutterwave(payload);
      window.location.href = checkoutUrl;
    } catch (error: any) {
      setErrorMessage(error.message || "Unable to reach the payment gateway. Please try again.");
      setIsProcessing(false);
    }
  };

  const handleHesitation = async () => {
    const traceId = user?.id || `guest_${effectiveEmail.replace(/[^a-zA-Z0-9]/g, '')}`;
    await paymentService.logPaymentAttempt({
        user_id: traceId,
        sprint_id: selectedSprint?.id || 'clarity-sprint',
        amount: Number(sprintPrice),
        currency: selectedSprint?.currency || 'NGN',
        status: 'abandoned'
    });
    navigate('/onboarding/map', { state: sanitizeData({ ...state }) });
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col items-center py-6 px-4 overflow-x-hidden selection:bg-primary/10 font-sans relative">
      <div className="max-w-xl w-full animate-fade-in">
        <div className="flex flex-col items-center mb-6">
          <LocalLogo type="green" className="h-5 w-auto mb-4 opacity-40" />
          <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
             <div className="h-full bg-primary rounded-full transition-all duration-1000 w-[75%]" style={{ width: '75%' }}></div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col animate-slide-up">
          <header className="p-6 md:p-8 text-center border-b border-gray-50">
             <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight leading-none italic">Unlock {sprintTitle}</h1>
          </header>
          <main className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
               <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center space-y-1 relative overflow-hidden">
                  <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Investment</p>
                  <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{isCreditSprint ? '🪙' : '₦'}{sprintPrice.toLocaleString()}</h3>
               </section>
               <section className="space-y-3 pt-2">
                  <h2 className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em]">What's included</h2>
                  <div className="text-[10px] md:text-xs font-bold text-gray-600 space-y-1.5">
                    <p>✓ {selectedSprint?.duration || 5}-Day Guided Focus</p>
                    <p>✓ Daily Outcome Protocol</p>
                    <p>✓ Professional Coaching Access</p>
                  </div>
               </section>
            </div>
            
            {!isCreditSprint && (
               <section className="pt-4 border-t border-gray-50 space-y-3">
                 <div className="max-w-sm mx-auto">
                    <label className="block text-[7px] font-black text-gray-400 uppercase mb-1.5 ml-1">Email Address</label>
                    <input 
                      type="email" 
                      value={user?.email || guestEmail} 
                      onChange={(e) => {
                          setGuestEmail(e.target.value);
                          if (validationError) setValidationError(null);
                      }} 
                      readOnly={!!user}
                      placeholder="your@email.com" 
                      className={`w-full px-5 py-3.5 bg-gray-50 border rounded-xl focus:ring-8 focus:ring-primary/5 focus:border-primary outline-none text-sm font-black text-black transition-all ${user ? 'cursor-not-allowed bg-gray-100' : 'border-gray-100'} ${validationError ? 'border-red-500 ring-2 ring-red-50' : ''}`} 
                    />
                    {validationError && (
                        <p className="text-[8px] text-red-500 font-black uppercase mt-1.5 ml-1 animate-fade-in">{validationError}</p>
                    )}
                 </div>
               </section>
            )}

            <section className="pt-4 border-t border-gray-50 space-y-4">
               <label className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/10 rounded-xl cursor-pointer active:scale-[0.98] transition-all group hover:bg-primary/10">
                <input type="checkbox" checked={finalCommitment} onChange={(e) => setFinalCommitment(e.target.checked)} className="w-4 h-4 bg-white border-gray-200 rounded focus:ring-primary text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-tight">I’m committing to complete this sprint.</span>
              </label>
              {errorMessage && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[9px] font-bold text-red-600 uppercase tracking-widest text-center animate-pulse">{errorMessage}</div>}
            </section>
          </main>
          <footer className="p-6 md:p-8 pt-3 bg-gray-50/50 border-t border-gray-50">
             <div className="space-y-4">
                <Button onClick={isCreditSprint ? handleCoinPayment : startCashPayment} disabled={!canPay} isLoading={isProcessing} className="w-full py-4 rounded-xl shadow-xl text-[11px] uppercase font-black">{isProcessing ? "Authorizing..." : isCreditSprint ? `Redeem ${sprintPrice} Credits` : "Pay & Start Sprint"}</Button>
                <div className="text-center"><button onClick={handleHesitation} className="text-[9px] font-black text-gray-400 hover:text-primary transition-colors underline underline-offset-4 decoration-gray-200 cursor-pointer">Not sure yet? See The Map</button></div>
             </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default SprintPayment;