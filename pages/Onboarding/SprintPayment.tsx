import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Lock, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import LocalLogo from '../../components/LocalLogo';
import Button from '../../components/Button';
import { paymentService } from '../../services/paymentService';
import { sprintService } from '../../services/sprintService';
import { trackService } from '../../services/trackService';
import { useAuth } from '../../contexts/AuthContext';
import { Sprint, Track, Participant } from '../../types';
import { getSprintCashPrice } from '../../utils/sprintUtils';

const SprintPayment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const state = location.state || {};
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(state.sprint || null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(state.track || null);
  const sprintId = selectedSprint?.id || state.sprintId;
  const trackId = selectedTrack?.id || state.trackId;

  const [guestEmail, setGuestEmail] = useState(state.prefilledEmail || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showEscapeConfirmModal, setShowEscapeConfirmModal] = useState(false);
  const [trackSprints, setTrackSprints] = useState<Sprint[]>([]);

  // Load Sprint/Track data if missing
  useEffect(() => {
    const fetchData = async () => {
      if (sprintId && !selectedSprint) {
        const s = await sprintService.getSprintById(sprintId);
        if (s) setSelectedSprint(s);
      }
      if (trackId && !selectedTrack) {
        const t = await trackService.getTrackById(trackId);
        if (t) setSelectedTrack(t);
      }
    };
    fetchData();
  }, [sprintId, trackId, selectedSprint, selectedTrack]);

  useEffect(() => {
    const loadTrackData = async () => {
      if (selectedTrack) {
        const sprintPromises = selectedTrack.sprintIds.map((id: string) => sprintService.getSprintById(id));
        const data = await Promise.all(sprintPromises);
        setTrackSprints(data.filter((s): s is Sprint => !!s));
      }
    };
    loadTrackData();
  }, [selectedTrack]);

  const isCreditSprint = selectedSprint?.pricingType === 'credits';

  const getPrice = () => {
    if (selectedTrack) {
      const baseTotal = trackSprints.reduce((sum, s) => sum + getSprintCashPrice(s), 0);
      const reruns = selectedTrack.allowedReruns ?? 2;
      const isDiscounted = reruns === 1 || reruns === 2;
      const rerunCost = trackSprints.reduce((sum, s) => {
        const basePrice = getSprintCashPrice(s);
        const pricePerRerun = isDiscounted ? basePrice * 0.5 : basePrice;
        return sum + (pricePerRerun * reruns);
      }, 0);
      const total = baseTotal + rerunCost;
      return total * (1 - selectedTrack.discountPercentage / 100);
    }
    return isCreditSprint ? (selectedSprint?.pointCost ?? 10) : (selectedSprint?.price ?? 3000);
  };

  const sprintPrice = getPrice();
  const sprintTitle = selectedTrack?.title || selectedSprint?.title || "Guided Sprint Journey";
  const duration = selectedSprint?.duration || 7;
  const effectiveEmail = user?.email || guestEmail;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail.trim());

  // Check if user came from completing Move 1 in preview
  const pendingRaw = localStorage.getItem('pending_first_action');
  const hasPreviewProgress = Boolean(state.fromPreview || pendingRaw);

  const handlePayAndContinue = async () => {
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

    if (!sprintId && !trackId) {
      setValidationError("Program selection error. Please return to discovery.");
      return;
    }

    const traceId = user?.id || `guest_${effectiveEmail.replace(/[^a-zA-Z0-9]/g, '')}`;
    setIsProcessing(true);

    const payload = {
      userId: traceId,
      email: effectiveEmail.toLowerCase().trim(),
      sprintId: sprintId || undefined,
      trackId: trackId || undefined,
      amount: Number(sprintPrice),
      currency: "NGN",
      name: user?.name || (user as any)?.displayName || 'Vectorise Participant'
    };

    try {
      const checkoutUrl = await paymentService.initializeFlutterwave(payload);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error("Unable to retrieve payment link. Please try again.");
      }
    } catch (error: any) {
      console.error("[SprintPayment] Checkout error:", error);
      setErrorMessage(error.message || "Unable to reach the payment gateway. Please try again.");
      setIsProcessing(false);
    }
  };

  // Exit Sprint Confirmation Handlers
  const handleConfirmExitSprint = () => {
    localStorage.removeItem('pending_first_action');
    localStorage.removeItem('vectorise_last_sprint');
    setShowEscapeConfirmModal(false);
    toast.info("Sprint cancelled. Previous progress discarded.");
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#FAFAFA] dark:bg-[#121212] flex flex-col items-center justify-center py-8 px-4 sm:px-6 relative overflow-x-hidden selection:bg-[#0E7850]/10 font-sans">
      
      {/* SOFT ESCAPE 'X' BUTTON TOP RIGHT */}
      <button
        type="button"
        onClick={() => setShowEscapeConfirmModal(true)}
        className="fixed top-5 right-5 sm:top-8 sm:right-8 z-30 p-2.5 sm:p-3 text-gray-400 hover:text-gray-700 dark:hover:text-white bg-white/90 dark:bg-zinc-800/90 border border-gray-200/80 dark:border-zinc-700/80 rounded-full shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
        title="Exit sprint"
        aria-label="Exit sprint"
      >
        <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
      </button>

      <div className="max-w-md w-full my-auto animate-fade-in">
        
        {/* BRAND LOGO */}
        <div className="flex flex-col items-center mb-6 text-center">
          <LocalLogo type="green" className="h-6 w-auto mb-3 opacity-90" />
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-[#0E7850] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 text-[9px] font-black uppercase tracking-widest rounded-full">
            <Sparkles className="w-3 h-3" />
            {hasPreviewProgress ? "Move 1 Completed" : "Payment Checkout"}
          </span>
        </div>

        {/* MAIN CARD CONTAINER */}
        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden flex flex-col animate-slide-up">
          
          {/* HEADER SECTION */}
          <header className="p-6 sm:p-8 text-center border-b border-gray-100 dark:border-zinc-800 bg-linear-to-b from-gray-50/50 to-transparent dark:from-zinc-800/30">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-snug">
              To save your progress and continue the sprint.
            </h1>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium mt-2 leading-relaxed">
              Complete your one-time payment to unlock Day 2 through Day {duration} and save your Move 1 answers.
            </p>
          </header>

          <main className="p-6 sm:p-8 space-y-6">
            
            {/* SPRINT CARD WITH AMOUNT */}
            <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-3xl p-5 sm:p-6 border border-gray-200/80 dark:border-zinc-700/60 space-y-4">
              
              {/* Sprint Cover & Title */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-200 dark:bg-zinc-700 shrink-0 shadow-inner">
                  <img
                    src={selectedSprint?.coverImageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=300&auto=format&fit=crop&q=80"}
                    alt={sprintTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#0E7850] dark:text-emerald-400">
                    {duration}-Day Sprint
                  </span>
                  <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white truncate leading-tight mt-0.5">
                    {sprintTitle}
                  </h2>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-400 font-bold mt-0.5">
                    {(selectedSprint as any)?.coachName || (selectedSprint as any)?.coach?.name ? `Coach: ${(selectedSprint as any)?.coachName || (selectedSprint as any)?.coach?.name}` : "Official Vectorise Coach"}
                  </p>
                </div>
              </div>

              {/* Move 1 Progress Indicator */}
              {hasPreviewProgress && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#0E7850] dark:text-emerald-400 shrink-0" />
                  <span className="text-[11px] leading-tight">Move 1 is completed and held securely in your account!</span>
                </div>
              )}

              {/* Amount Display */}
              <div className="pt-2 border-t border-gray-200/60 dark:border-zinc-700/60 flex items-baseline justify-between">
                <div>
                  <span className="text-[9px] font-black text-gray-400 dark:text-zinc-400 uppercase tracking-widest block">
                    Total Amount
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">
                    One-time payment
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    {isCreditSprint ? `🪙 ${sprintPrice}` : `₦${sprintPrice.toLocaleString()}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Email Input if not logged in */}
            {!user && (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-wider ml-1">
                  Your Account Email
                </label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => {
                    setGuestEmail(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="name@example.com"
                  className={`w-full px-4 py-3.5 bg-white dark:bg-zinc-800 border rounded-2xl text-xs font-bold text-gray-800 dark:text-white placeholder:text-gray-400 outline-none focus:ring-4 focus:ring-[#0E7850]/10 focus:border-[#0E7850] transition-all shadow-xs ${
                    validationError ? 'border-red-500' : 'border-gray-200 dark:border-zinc-700'
                  }`}
                />
                {validationError && (
                  <p className="text-[10px] text-red-500 font-bold ml-1">{validationError}</p>
                )}
              </div>
            )}

            {/* Error Display */}
            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 rounded-2xl text-[11px] font-bold text-red-600 dark:text-red-400 text-center">
                {errorMessage}
              </div>
            )}

            {/* Security Guarantee Badge */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 dark:text-zinc-400 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0E7850]" />
              <span>Secured 256-Bit Encrypted Payment</span>
            </div>
          </main>

          {/* FOOTER ACTION */}
          <footer className="p-6 sm:p-8 pt-0">
            <Button
              type="button"
              onClick={handlePayAndContinue}
              isLoading={isProcessing}
              className="w-full py-4 bg-[#0E7850] hover:bg-[#0b5d3e] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#0E7850]/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isProcessing ? "Redirecting..." : "Pay and Continue"}</span>
            </Button>
          </footer>
        </div>
      </div>

      {/* POP-UP MODAL: ESCAPE CONFIRMATION */}
      {showEscapeConfirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-7 sm:p-9 max-w-sm w-full text-center relative overflow-hidden shadow-2xl border border-gray-100 dark:border-zinc-800 animate-slide-up">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-950/40 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
              Stop This Sprint?
            </h3>

            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed mb-6">
              Are you sure you want to stop this sprint all your previous progress will be lost?
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConfirmExitSprint}
                className="flex-1 py-3.5 px-4 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-2xl font-black text-xs transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setShowEscapeConfirmModal(false)}
                className="flex-1 py-3.5 px-4 bg-[#0E7850] hover:bg-[#0b5d3e] text-white rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default SprintPayment;
