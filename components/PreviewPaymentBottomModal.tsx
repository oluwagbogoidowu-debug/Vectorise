import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, CheckCircle2, X, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { paymentService } from '../services/paymentService';
import { Participant, ParticipantSprint, Sprint } from '../types';
import { COIN_NAIRA_RATE, getSprintPaymentMode } from '../utils/sprintUtils';
import { BottomModalCoinCards } from './BottomModalCoinCards';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

interface PreviewPaymentBottomModalProps {
  isOpen: boolean;
  onClose?: () => void;
  sprint: Sprint | null;
  enrollment: ParticipantSprint | null;
  onUnlocked: (updatedEnrollment?: Partial<ParticipantSprint>) => void;
  targetMoveDay?: number;
}

export const PreviewPaymentBottomModal: React.FC<PreviewPaymentBottomModalProps> = ({
  isOpen,
  onClose,
  sprint,
  enrollment,
  onUnlocked,
  targetMoveDay = 3
}) => {
  const { user } = useAuth();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('coins');
  const [isProcessing, setIsProcessing] = useState(false);

  const { isCoinSprint, coinCost, cashCost } = getSprintPaymentMode(sprint);
  const userBalance = (user as Participant)?.walletBalance ?? 0;
  const coinsRem = Math.max(0, coinCost - userBalance);
  const directTopupPrice = coinsRem > 0 ? coinsRem * COIN_NAIRA_RATE : cashCost;

  useEffect(() => {
    if (!isOpen) return;
    if (isCoinSprint) {
      setSelectedPaymentMethod(userBalance >= coinCost ? 'coins' : 'pkg_100');
    } else {
      setSelectedPaymentMethod('cash');
    }
  }, [isOpen, isCoinSprint, userBalance, coinCost]);

  if (!isOpen || !sprint) return null;

  const handleConfirmUnlock = async () => {
    if (!user || !sprint || isProcessing) return;

    setIsProcessing(true);
    try {
      const enrollmentId = enrollment?.id || `enrollment_${user.id}_${sprint.id}`;
      const enrollmentRef = doc(db, 'users', user.id, 'enrollments', enrollmentId);
      const now = new Date().toISOString();

      // 1. Cash-based sprint payment via Flutterwave
      if (!isCoinSprint) {
        if (cashCost <= 0) {
          await updateDoc(enrollmentRef, {
            paymentUnlocked: true,
            last_activity_at: now
          });
          triggerHaptic(hapticPatterns.success);
          toast.success(`Move ${targetMoveDay} unlocked! Let's keep going.`);
          onUnlocked({ paymentUnlocked: true });
          return;
        }

        const checkoutUrl = await paymentService.initializeFlutterwave({
          userId: user.id,
          email: user.email,
          name: user.name,
          amount: cashCost,
          currency: sprint.currency || 'NGN',
          sprintId: sprint.id,
          trackId: sprint.trackId
        });
        window.location.href = checkoutUrl;
        return;
      }

      // 2. Coin-based sprint: pay directly from coin wallet balance
      if (selectedPaymentMethod === 'coins' && userBalance >= coinCost) {
        if (coinCost > 0) {
          await userService.processWalletTransaction(user.id, {
            amount: -coinCost,
            type: 'purchase',
            description: `Unlock ${sprint.title}`,
            auditId: sprint.id
          });
        }

        const unlockPatch: Partial<ParticipantSprint> = {
          paymentUnlocked: true,
          payment_source: 'coin',
          coins_paid: coinCost,
          last_activity_at: now
        };

        await updateDoc(enrollmentRef, unlockPatch);
        triggerHaptic(hapticPatterns.success);
        toast.success(`Sprint unlocked! Continuing to Move ${targetMoveDay}.`);
        onUnlocked(unlockPatch);
        return;
      }

      // 3. Coin-based sprint: pay remaining coins directly with cash via Flutterwave
      if (selectedPaymentMethod === 'card') {
        const checkoutUrl = await paymentService.initializeFlutterwave({
          userId: user.id,
          email: user.email,
          name: user.name,
          amount: directTopupPrice,
          currency: sprint.currency || 'NGN',
          sprintId: sprint.id,
          trackId: sprint.trackId
        });
        window.location.href = checkoutUrl;
        return;
      }

      // 4. Coin-based sprint: buy coin package via Flutterwave
      if (selectedPaymentMethod.startsWith('pkg_')) {
        const pkgPrices: Record<string, { price: number; coins: number }> = {
          pkg_30: { price: 500, coins: 30 },
          pkg_100: { price: 1300, coins: 100 },
          pkg_300: { price: 3600, coins: 300 }
        };
        const selectedPkg = pkgPrices[selectedPaymentMethod] || { price: 1300, coins: 100 };

        const checkoutUrl = await paymentService.initializeFlutterwave({
          userId: user.id,
          email: user.email,
          name: user.name,
          amount: selectedPkg.price,
          currency: 'NGN',
          coinPackageId: selectedPaymentMethod,
          coins: selectedPkg.coins,
          sprintId: sprint.id,
          trackId: sprint.trackId
        });
        window.location.href = checkoutUrl;
        return;
      }

      toast.error('Please select a payment option to continue.');
      setIsProcessing(false);
    } catch (err) {
      console.error('[PreviewPaymentBottomModal] Payment/Unlock failed:', err);
      toast.error('Unable to process payment right now. Please try again.');
      setIsProcessing(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 text-left font-sans">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="bg-white dark:bg-[#1c1c1e] rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-7 max-w-md w-full text-gray-900 dark:text-gray-100 relative shadow-2xl max-h-[90vh] overflow-y-auto border border-transparent dark:border-zinc-800"
          >
            {/* Drag Handle */}
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full mx-auto mb-5" />

            {/* Close Button */}
            {onClose && (
              <button
                type="button"
                onClick={() => !isProcessing && onClose()}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                aria-label="Close payment bar"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Header */}
            <div className="text-left mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0E7850]/10 dark:bg-emerald-950/40 rounded-lg border border-[#0E7850]/20 dark:border-emerald-800/40 mb-2.5">
                <Lock className="w-3.5 h-3.5 text-[#0E7850] dark:text-emerald-400" />
                <span className="text-[11px] font-black uppercase text-[#0E7850] dark:text-emerald-400 tracking-wider">
                  Unlock Move {targetMoveDay} &amp; Beyond
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tight leading-snug">
                {sprint.title}
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Great start completing Moves 1 &amp; 2. Unlock the rest of this {sprint.duration || 7}-move sprint to keep going.
              </p>
            </div>

            {!isCoinSprint ? (
              /* Cash Sprint Bottom Bar Content */
              <div className="space-y-4 text-left">
                <div className="bg-gray-50/90 dark:bg-zinc-800/80 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-zinc-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                        Full Sprint Access
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#0E7850]" />
                        <span>Moves {targetMoveDay} – {sprint.duration || 7} Unlocked</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                        Sprint Fee
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-[#0E7850] dark:text-emerald-400">
                        ₦{cashCost.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleConfirmUnlock}
                    disabled={isProcessing}
                    className={`w-full py-4 rounded-2xl shadow-xl transition-all text-sm sm:text-base font-black tracking-wider uppercase border-none flex items-center justify-center gap-2 cursor-pointer ${
                      !isProcessing
                        ? 'bg-[#0E7850] hover:bg-[#085C3D] text-white active:scale-95 shadow-[#0E7850]/20'
                        : 'bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Connecting Checkout...</span>
                      </div>
                    ) : (
                      <>
                        <span>Pay ₦{cashCost.toLocaleString()} &amp; Continue</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Coin Sprint Bottom Bar Content */
              <>
                {/* Wallet Balance & Cost Card */}
                <div className="bg-gray-50/90 dark:bg-zinc-800/80 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-zinc-700 mb-4 text-left space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                        Your Balance
                      </div>
                      <div className="text-base sm:text-lg font-black text-gray-950 dark:text-white flex items-center gap-1.5">
                        <span>🪙 {userBalance}</span>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Coins</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                        Sprint Cost
                      </div>
                      <div className="text-base sm:text-lg font-black text-[#0E7850] dark:text-emerald-400 flex items-center justify-end gap-1">
                        <span>{coinCost}</span>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">Coins</span>
                      </div>
                    </div>
                  </div>

                  {userBalance >= coinCost && (
                    <div className="pt-3 border-t border-gray-200 dark:border-zinc-700">
                      <div
                        onClick={() => !isProcessing && setSelectedPaymentMethod('coins')}
                        className="p-3.5 sm:p-4 rounded-xl border-2 border-[#0E7850] bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full border-2 border-[#0E7850] bg-[#0E7850] flex items-center justify-center text-white shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-black text-gray-900 dark:text-white">
                            Use {coinCost} coins from your balance
                          </span>
                        </div>
                        <span className="text-xs font-black text-[#0E7850] bg-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-300 px-2.5 py-1 rounded-md uppercase tracking-wider shrink-0">
                          Ready
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Top-up Coin Packages & Direct Cash Option when balance < coinCost */}
                {userBalance < coinCost && (
                  <div className="space-y-3.5 mb-4 text-left">
                    <BottomModalCoinCards
                      userBalance={userBalance}
                      sprintCost={coinCost}
                      sprintId={sprint.id}
                      trackId={sprint.trackId}
                      selectedPaymentMethod={selectedPaymentMethod}
                      onSelectPaymentMethod={(method) => setSelectedPaymentMethod(method)}
                      isProcessing={isProcessing}
                    />

                    <div
                      onClick={() => !isProcessing && setSelectedPaymentMethod('card')}
                      className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedPaymentMethod === 'card'
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-[#0E7850] text-gray-900 dark:text-white shadow-xs ring-1 ring-[#0E7850]/30'
                          : 'bg-white dark:bg-zinc-800/80 border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      <span className="text-sm font-bold">
                        Pay for remaining coins directly ({coinsRem} coins)
                      </span>
                      <span className="text-sm sm:text-base font-black text-[#0E7850] dark:text-emerald-400 shrink-0 ml-2">
                        ₦{directTopupPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Primary CTA */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleConfirmUnlock}
                    disabled={isProcessing || (selectedPaymentMethod === 'coins' && userBalance < coinCost)}
                    className={`w-full py-4 rounded-2xl shadow-xl transition-all text-sm sm:text-base font-black tracking-wider uppercase border-none flex items-center justify-center gap-2 cursor-pointer ${
                      !isProcessing && !(selectedPaymentMethod === 'coins' && userBalance < coinCost)
                        ? 'bg-[#0E7850] hover:bg-[#085C3D] text-white active:scale-95 shadow-[#0E7850]/20'
                        : 'bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Unlocking Move {targetMoveDay}...</span>
                      </div>
                    ) : userBalance >= coinCost ? (
                      <>
                        <span>Continue to Move {targetMoveDay} • Use {coinCost} Coins</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </>
                    ) : selectedPaymentMethod === 'card' ? (
                      <>
                        <span>Pay ₦{directTopupPrice.toLocaleString()} &amp; Continue</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </>
                    ) : selectedPaymentMethod.startsWith('pkg_') ? (
                      <>
                        <span>Buy Coins &amp; Continue</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </>
                    ) : (
                      <span>Select Payment Option</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default PreviewPaymentBottomModal;
