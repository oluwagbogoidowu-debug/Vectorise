import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, Coins, X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { paymentService } from '../services/paymentService';
import { Participant, ParticipantSprint, Sprint } from '../types';
import { COIN_NAIRA_RATE, getSprintPaymentMode } from '../utils/sprintUtils';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

interface PreviewPaymentBottomModalProps {
  isOpen: boolean;
  onClose?: () => void;
  sprint: Sprint | null;
  enrollment: ParticipantSprint | null;
  onUnlocked: (updatedEnrollment?: Partial<ParticipantSprint>) => void;
  targetMoveDay?: number;
}

const COIN_BUNDLES = [
  { id: 'pkg_30', coins: 30, price: 500 },
  { id: 'pkg_100', coins: 100, price: 1300 },
  { id: 'pkg_300', coins: 300, price: 3600 }
] as const;

export const PreviewPaymentBottomModal: React.FC<PreviewPaymentBottomModalProps> = ({
  isOpen,
  onClose,
  sprint,
  enrollment,
  onUnlocked,
  targetMoveDay = 3
}) => {
  const { user } = useAuth();
  const [selectedMode, setSelectedMode] = useState<'wallet' | 'direct' | 'coins'>('direct');
  const [selectedPkgId, setSelectedPkgId] = useState<string>('pkg_100');
  const [isProcessing, setIsProcessing] = useState(false);

  const { isCoinSprint, coinCost, cashCost } = getSprintPaymentMode(sprint);
  const userBalance = (user as Participant)?.walletBalance ?? 0;
  const coinsRem = Math.max(0, coinCost - userBalance);
  const directAmount = isCoinSprint
    ? (coinsRem > 0 ? coinsRem * COIN_NAIRA_RATE : coinCost * COIN_NAIRA_RATE)
    : cashCost;

  useEffect(() => {
    if (!isOpen) return;
    if (isCoinSprint && userBalance >= coinCost) {
      setSelectedMode('wallet');
    } else {
      setSelectedMode('direct');
    }
    if (coinCost > 100) {
      setSelectedPkgId('pkg_300');
    } else if (coinCost <= 30) {
      setSelectedPkgId('pkg_30');
    } else {
      setSelectedPkgId('pkg_100');
    }
  }, [isOpen, isCoinSprint, userBalance, coinCost]);

  if (!isOpen || !sprint) return null;

  const selectedPkg = COIN_BUNDLES.find((b) => b.id === selectedPkgId) || COIN_BUNDLES[1];

  const handleConfirmUnlock = async () => {
    if (!user || !sprint || isProcessing) return;

    setIsProcessing(true);
    try {
      const enrollmentId = enrollment?.id || `enrollment_${user.id}_${sprint.id}`;
      const enrollmentRef = doc(db, 'users', user.id, 'enrollments', enrollmentId);
      const now = new Date().toISOString();

      // 1. Unlock immediately using existing wallet coins
      if (isCoinSprint && selectedMode === 'wallet' && userBalance >= coinCost) {
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

      // 2. Pay directly (cash sprint OR direct Naira payment for coin sprint)
      if (selectedMode === 'direct') {
        if (directAmount <= 0) {
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
          amount: directAmount,
          currency: sprint.currency || 'NGN',
          sprintId: sprint.id,
          trackId: sprint.trackId
        });
        window.location.href = checkoutUrl;
        return;
      }

      // 3. Purchase a coin bundle to unlock with coins
      if (isCoinSprint && selectedMode === 'coins') {
        const checkoutUrl = await paymentService.initializeFlutterwave({
          userId: user.id,
          email: user.email,
          name: user.name,
          amount: selectedPkg.price,
          currency: 'NGN',
          coinPackageId: selectedPkg.id,
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

  const renderCtaLabel = () => {
    if (isProcessing) {
      return isCoinSprint && selectedMode === 'wallet'
        ? `Unlocking Move ${targetMoveDay}...`
        : 'Connecting Checkout...';
    }
    if (isCoinSprint && selectedMode === 'wallet') {
      return `Unlock Move ${targetMoveDay} • ${coinCost} Coins`;
    }
    if (isCoinSprint && selectedMode === 'coins') {
      return `Get ${selectedPkg.coins} Coins (₦${selectedPkg.price.toLocaleString()})`;
    }
    return `Pay ₦${directAmount.toLocaleString()} & Unlock Sprint`;
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
            className="bg-white dark:bg-[#0D0F0E] rounded-t-[2rem] sm:rounded-[2rem] px-6 pt-5 pb-7 max-w-md w-full text-gray-950 dark:text-white relative shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-200/80 dark:border-zinc-800"
          >
            {/* Drag Handle */}
            <div className="w-10 h-1 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto mb-5" />

            {/* Close Button */}
            {onClose && (
              <button
                type="button"
                onClick={() => !isProcessing && onClose()}
                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                aria-label="Close payment modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Header */}
            <div className="pb-4 border-b border-gray-200 dark:border-zinc-800/90 pr-7">
              <h3 className="text-xl font-bold tracking-tight text-gray-950 dark:text-white">
                Unlock Move {targetMoveDay} &amp; Beyond
              </h3>
              <p className="text-sm font-medium text-[#0E7850] dark:text-[#16B976] mt-1 leading-snug">
                You&apos;ve completed Moves 1 &amp; 2. Keep going.
              </p>
            </div>

            {/* Balance & Cost Row */}
            <div className="py-4 border-b border-gray-200 dark:border-zinc-800/90 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-950 dark:text-white">
                  Your balance
                </div>
                <div className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
                  {userBalance} coins
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-950 dark:text-white">
                  Sprint cost
                </div>
                <div className="text-sm font-semibold text-[#0E7850] dark:text-[#16B976] mt-0.5">
                  {isCoinSprint ? `${coinCost} coins` : `₦${cashCost.toLocaleString()}`}
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="pt-4 space-y-2.5">
              <p className="text-sm font-semibold text-gray-950 dark:text-white mb-2">
                Choose how to unlock
              </p>

              {/* Wallet Option when user has enough coins */}
              {isCoinSprint && userBalance >= coinCost && (
                <button
                  type="button"
                  onClick={() => !isProcessing && setSelectedMode('wallet')}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    selectedMode === 'wallet'
                      ? 'border-[#0E7850] dark:border-[#16B976] bg-[#0E7850]/[0.04] dark:bg-[#16B976]/[0.06]'
                      : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedMode === 'wallet' ? (
                      <CheckCircle2 className="w-5 h-5 text-[#0E7850] dark:text-[#16B976] shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300 dark:text-zinc-600 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-950 dark:text-white">
                        Use your coins
                      </div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        Unlock directly from your balance
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-950 dark:text-white shrink-0">
                    {coinCost} coins
                  </span>
                </button>
              )}

              {/* Pay Directly Option */}
              <button
                type="button"
                onClick={() => !isProcessing && setSelectedMode('direct')}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                  selectedMode === 'direct'
                    ? 'border-[#0E7850] dark:border-[#16B976] bg-[#0E7850]/[0.04] dark:bg-[#16B976]/[0.06]'
                    : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {selectedMode === 'direct' ? (
                    <CheckCircle2 className="w-5 h-5 text-[#0E7850] dark:text-[#16B976] shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300 dark:text-zinc-600 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-950 dark:text-white">
                      Pay directly
                    </div>
                    <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                      {isCoinSprint
                        ? 'Unlock this sprint without buying coins'
                        : `Unlock Moves ${targetMoveDay}–${sprint.duration || 7}`}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-950 dark:text-white shrink-0">
                  ₦{directAmount.toLocaleString()}
                </span>
              </button>

              {/* Unlock with Coin Bundles Option (when coin sprint & insufficient balance) */}
              {isCoinSprint && userBalance < coinCost && (
                <div
                  className={`rounded-2xl border transition-all ${
                    selectedMode === 'coins'
                      ? 'border-[#0E7850] dark:border-[#16B976] bg-[#0E7850]/[0.04] dark:bg-[#16B976]/[0.06]'
                      : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => !isProcessing && setSelectedMode('coins')}
                    className="w-full p-3.5 text-left flex items-center gap-3 cursor-pointer"
                  >
                    <Coins
                      className={`w-5 h-5 shrink-0 ${
                        selectedMode === 'coins'
                          ? 'text-[#0E7850] dark:text-[#16B976]'
                          : 'text-gray-400 dark:text-zinc-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-950 dark:text-white">
                        Unlock with coins
                      </div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        Get {coinsRem} coins or choose a coin bundle
                      </div>
                    </div>
                  </button>

                  {selectedMode === 'coins' && (
                    <div className="px-3.5 pb-3.5 pt-1 grid grid-cols-3 gap-2">
                      {COIN_BUNDLES.map((pkg) => {
                        const isPkgSel = selectedPkgId === pkg.id;
                        return (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => !isProcessing && setSelectedPkgId(pkg.id)}
                            className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                              isPkgSel
                                ? 'border-[#0E7850] dark:border-[#16B976] bg-[#0E7850]/10 dark:bg-[#16B976]/15 text-[#0E7850] dark:text-[#16B976]'
                                : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-gray-700 dark:text-zinc-300 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-xs font-bold">{pkg.coins} coins</div>
                            <div className="text-[11px] opacity-80 mt-0.5">
                              ₦{pkg.price.toLocaleString()}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Minimal Primary CTA */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleConfirmUnlock}
                disabled={isProcessing}
                className={`w-full py-3.5 px-4 rounded-2xl border transition-all text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer ${
                  !isProcessing
                    ? 'bg-gray-950 dark:bg-transparent text-white border-gray-950 dark:border-zinc-700 hover:bg-gray-800 dark:hover:border-zinc-500 active:scale-[0.99]'
                    : 'bg-gray-200 dark:bg-zinc-900 text-gray-400 dark:text-zinc-600 border-transparent cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{renderCtaLabel()}</span>
                  </>
                ) : (
                  <>
                    <span>{renderCtaLabel()}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default PreviewPaymentBottomModal;
