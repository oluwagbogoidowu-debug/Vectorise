import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, Coins, X, ArrowRight, Info, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { paymentService } from '../services/paymentService';
import { Participant, ParticipantSprint, Sprint } from '../types';
import { COIN_NAIRA_RATE, getSprintPaymentMode } from '../utils/sprintUtils';
import { PricingTierId, resolveSprintPricingTiers } from '../utils/pricingTiers';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import { ClaimCoinQuickDrawer } from './ClaimCoinQuickDrawer';

interface PreviewPaymentBottomModalProps {
  isOpen: boolean;
  onClose?: () => void;
  sprint: Sprint | null;
  enrollment: ParticipantSprint | null;
  onUnlocked: (updatedEnrollment?: Partial<ParticipantSprint>) => void;
  targetMoveDay?: number;
  preselectedTier?: PricingTierId | null;
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
  targetMoveDay = 3,
  preselectedTier = null
}) => {
  const { user } = useAuth();

  const resolvedPreselectedTier: PricingTierId | null = useMemo(() => {
    if (preselectedTier === 'standard' || preselectedTier === 'complete') {
      return preselectedTier;
    }
    if (enrollment?.selectedTier === 'standard' || enrollment?.selectedTier === 'complete') {
      return enrollment.selectedTier;
    }
    return null;
  }, [preselectedTier, enrollment?.selectedTier]);

  const [chosenTier, setChosenTier] = useState<PricingTierId | null>(resolvedPreselectedTier);
  const [showTierInfo, setShowTierInfo] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'wallet' | 'direct' | 'coins'>('direct');
  const [selectedPkgId, setSelectedPkgId] = useState<string>('pkg_100');
  const [isProcessing, setIsProcessing] = useState(false);

  const tiers = useMemo(() => resolveSprintPricingTiers(sprint), [sprint]);
  const { isCoinSprint, isFreeSprint, coinCost: basePointCost } = getSprintPaymentMode(sprint);
  const userBalance = (user as Participant)?.walletBalance ?? 0;

  const getTierPricing = (tierId: PricingTierId) => {
    if (isFreeSprint) {
      return {
        cashPrice: 0,
        coinCost: 0
      };
    }
    if (isCoinSprint && tierId === 'standard' && typeof sprint?.standardPrice !== 'number') {
      const exactCoins = Math.max(0, basePointCost);
      return {
        cashPrice: exactCoins * COIN_NAIRA_RATE,
        coinCost: exactCoins
      };
    }
    const cashPrice = Math.max(0, tiers[tierId].price);
    const exactCoins = cashPrice > 0 ? Math.ceil(cashPrice / COIN_NAIRA_RATE) : 0;
    return {
      cashPrice,
      coinCost: exactCoins
    };
  };

  const activeTier = chosenTier ? tiers[chosenTier] : null;
  const activePricing = chosenTier ? getTierPricing(chosenTier) : null;
  const activeCashPrice = activePricing ? activePricing.cashPrice : 0;
  const activeCoinCost = activePricing ? activePricing.coinCost : 0;
  const coinsRem = Math.max(0, activeCoinCost - userBalance);
  const hasEnoughCoins = Boolean(chosenTier && userBalance >= activeCoinCost);

  // Direct cash checkout amount:
  // - Cash/money sprints charge the selected tier cash price
  // - Coin-priced sprints charge top-up Naira for missing coins (or full cash equivalent)
  const directAmount = !chosenTier
    ? 0
    : isCoinSprint
    ? (coinsRem > 0 ? Math.min(activeCashPrice, coinsRem * COIN_NAIRA_RATE) : activeCashPrice)
    : activeCashPrice;

  // Reset modal state whenever opened
  useEffect(() => {
    if (!isOpen) return;
    setChosenTier(resolvedPreselectedTier);
    setShowTierInfo(false);
    setIsProcessing(false);
  }, [isOpen, resolvedPreselectedTier]);

  // Auto-pick best payment mode & coin bundle whenever tier or wallet changes
  useEffect(() => {
    if (!isOpen || !chosenTier) return;
    const { coinCost: tierCoins } = getTierPricing(chosenTier);
    if (userBalance >= tierCoins) {
      setSelectedMode('wallet');
    } else {
      setSelectedMode('direct');
    }

    if (tierCoins > 100) {
      setSelectedPkgId('pkg_300');
    } else if (tierCoins <= 30) {
      setSelectedPkgId('pkg_30');
    } else {
      setSelectedPkgId('pkg_100');
    }
  }, [isOpen, chosenTier, userBalance, isCoinSprint, basePointCost, sprint?.standardPrice, tiers]);

  if (!isOpen || !sprint) return null;

  const selectedPkg = COIN_BUNDLES.find((b) => b.id === selectedPkgId) || COIN_BUNDLES[1];
  const isTierPreselected = Boolean(resolvedPreselectedTier);

  const handleConfirmUnlock = async () => {
    if (!user || !sprint || !chosenTier || isProcessing) return;

    setIsProcessing(true);
    try {
      const enrollmentId = enrollment?.id || `enrollment_${user.id}_${sprint.id}`;
      const enrollmentRef = doc(db, 'users', user.id, 'enrollments', enrollmentId);
      const now = new Date().toISOString();

      // 1. Unlock using wallet coins (valid for BOTH coin sprints AND money/cash sprints when equivalent coins are available)
      if (selectedMode === 'wallet' && userBalance >= activeCoinCost) {
        if (activeCoinCost > 0) {
          await userService.processWalletTransaction(user.id, {
            amount: -activeCoinCost,
            type: 'purchase',
            description: `Unlock ${sprint.title} (${tiers[chosenTier].name})`,
            auditId: sprint.id
          });
        }

        const unlockPatch: Partial<ParticipantSprint> = {
          paymentUnlocked: true,
          payment_source: 'coin',
          coins_paid: activeCoinCost,
          selectedTier: chosenTier,
          last_activity_at: now
        };

        await updateDoc(enrollmentRef, unlockPatch);
        triggerHaptic(hapticPatterns.success);
        toast.success(`Sprint unlocked with ${activeCoinCost} coins! Continuing to Move ${targetMoveDay}.`);
        onUnlocked(unlockPatch);
        return;
      }

      // 2. Pay directly in currency
      if (selectedMode === 'direct') {
        if (directAmount <= 0) {
          const freePatch: Partial<ParticipantSprint> = {
            paymentUnlocked: true,
            selectedTier: chosenTier,
            last_activity_at: now
          };
          await updateDoc(enrollmentRef, freePatch);
          triggerHaptic(hapticPatterns.success);
          toast.success(`Move ${targetMoveDay} unlocked! Let's keep going.`);
          onUnlocked(freePatch);
          return;
        }

        const checkoutUrl = await paymentService.initializeFlutterwave({
          userId: user.id,
          email: user.email,
          name: user.name,
          amount: directAmount,
          currency: sprint.currency || 'NGN',
          sprintId: sprint.id,
          trackId: sprint.trackId,
          selectedTier: chosenTier
        });
        window.location.href = checkoutUrl;
        return;
      }

      // 3. Purchase a coin bundle to top up and unlock with coins
      if (selectedMode === 'coins') {
        await updateDoc(enrollmentRef, { selectedTier: chosenTier }).catch(() => {});
        const checkoutUrl = await paymentService.initializeFlutterwave({
          userId: user.id,
          email: user.email,
          name: user.name,
          amount: selectedPkg.price,
          currency: 'NGN',
          coinPackageId: selectedPkg.id,
          coins: selectedPkg.coins,
          sprintId: sprint.id,
          trackId: sprint.trackId,
          selectedTier: chosenTier
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
    if (!chosenTier || !activeTier) {
      return 'Select access tier';
    }
    if (isProcessing) {
      return selectedMode === 'wallet'
        ? `Unlocking Move ${targetMoveDay}...`
        : 'Connecting Checkout...';
    }
    if (selectedMode === 'wallet' && hasEnoughCoins) {
      return activeCoinCost > 0
        ? `Unlock Move ${targetMoveDay} • ${activeCoinCost} Coins`
        : `Unlock Move ${targetMoveDay} Free`;
    }
    if (selectedMode === 'coins') {
      return `Get ${selectedPkg.coins} Coins (₦${selectedPkg.price.toLocaleString()})`;
    }
    if (directAmount <= 0) {
      return `Unlock Move ${targetMoveDay} Free`;
    }
    return `Pay ${activeTier.currencySymbol}${directAmount.toLocaleString()} & Unlock`;
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

              {/* Subtle tag when tier was preselected on the sprint description page */}
              {isTierPreselected && activeTier && (
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/80 text-xs font-semibold text-gray-700 dark:text-zinc-200">
                    <span className="text-gray-400 dark:text-zinc-400 font-medium">Selected:</span>
                    <span>
                      {activeTier.number} {activeTier.name}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTierInfo((prev) => !prev)}
                    className={`p-1 rounded-full border transition-colors cursor-pointer ${
                      showTierInfo
                        ? 'bg-[#0E7850]/10 border-[#0E7850]/30 text-[#0E7850] dark:text-[#16B976]'
                        : 'border-gray-200 dark:border-zinc-700 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200'
                    }`}
                    aria-label="Toggle tier details"
                    title="View what this tier offers"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Dropdown Tier Selection when NOT preselected */}
            {!isTierPreselected && (
              <div className="pt-4 pb-3 border-b border-gray-200 dark:border-zinc-800/90">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label
                    htmlFor="move2-tier-select"
                    className="text-sm font-semibold text-gray-950 dark:text-white"
                  >
                    Choose access tier
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTierInfo((prev) => !prev)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                      showTierInfo
                        ? 'bg-[#0E7850]/10 border-[#0E7850]/30 text-[#0E7850] dark:text-[#16B976]'
                        : 'bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:border-gray-300 dark:hover:border-zinc-600'
                    }`}
                    aria-expanded={showTierInfo}
                    aria-label="Compare what each tier offers"
                    title="What each tier offers"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>{showTierInfo ? 'Hide info' : 'Tier info'}</span>
                  </button>
                </div>

                <div className="relative">
                  <select
                    id="move2-tier-select"
                    value={chosenTier || ''}
                    disabled={isProcessing}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'standard' || val === 'complete') {
                        setChosenTier(val);
                      } else {
                        setChosenTier(null);
                      }
                    }}
                    className="w-full appearance-none rounded-2xl border border-gray-200 dark:border-zinc-700 bg-gray-50/70 dark:bg-zinc-900 px-4 py-3 pr-10 text-sm font-semibold text-gray-950 dark:text-white focus:outline-none focus:border-[#0E7850] dark:focus:border-[#16B976] transition-colors cursor-pointer"
                  >
                    <option value="">Select 01. Standard or 02. Complete Access...</option>
                    <option value="standard">01. Standard Access</option>
                    <option value="complete">02. Complete Access</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            )}

            {/* Accordion Details Panel: shows what 01. Standard & 02. Complete Access offer */}
            <AnimatePresence initial={false}>
              {showTierInfo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden border-b border-gray-200 dark:border-zinc-800/90"
                >
                  <div className="py-3.5 space-y-2.5">
                    {(isTierPreselected && chosenTier
                      ? [tiers[chosenTier]]
                      : [tiers.standard, tiers.complete]
                    ).map((tier) => {
                      const pricing = getTierPricing(tier.id);
                      const isThisTier = chosenTier === tier.id;
                      return (
                        <div
                          key={tier.id}
                          onClick={() => {
                            if (!isTierPreselected && !isProcessing) {
                              setChosenTier(tier.id);
                              setShowTierInfo(false);
                            }
                          }}
                          className={`rounded-2xl border p-3.5 transition-all ${
                            !isTierPreselected ? 'cursor-pointer' : ''
                          } ${
                            isThisTier
                              ? 'border-[#0E7850] dark:border-[#16B976] bg-[#0E7850]/[0.04] dark:bg-[#16B976]/[0.06]'
                              : 'border-gray-200 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-900/50 hover:border-gray-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="text-xs font-bold text-gray-950 dark:text-white">
                                {tier.number} {tier.name}
                              </div>
                              <div className="text-[11px] font-medium text-[#0E7850] dark:text-[#16B976] mt-0.5">
                                {tier.badge}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-bold text-gray-950 dark:text-white tabular-nums">
                                {tier.currencySymbol}
                                {pricing.cashPrice.toLocaleString()}
                              </div>
                              <div className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400">
                                {pricing.coinCost} coins
                              </div>
                            </div>
                          </div>
                          <ul className="space-y-1.5 border-t border-gray-200/70 dark:border-zinc-800 pt-2">
                            {tier.features.map((feat, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 text-xs text-gray-600 dark:text-zinc-300 leading-snug"
                              >
                                <Check className="w-3.5 h-3.5 text-[#0E7850] dark:text-[#16B976] shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Balance & Cost Row + Payment Options shown after tier selection */}
            {chosenTier && activeTier ? (
              <>
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
                      {activeTier.number} {activeTier.name}
                    </div>
                    <div className="text-sm font-semibold text-[#0E7850] dark:text-[#16B976] mt-0.5 tabular-nums">
                      {isFreeSprint || activeCashPrice === 0
                        ? 'FREE'
                        : isCoinSprint
                        ? `${activeCoinCost} coins (${activeTier.currencySymbol}${activeCashPrice.toLocaleString()})`
                        : `${activeTier.currencySymbol}${activeCashPrice.toLocaleString()} • ${activeCoinCost} coins`}
                    </div>
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="pt-4 space-y-2.5">
                  <p className="text-sm font-semibold text-gray-950 dark:text-white mb-2">
                    Choose how to unlock
                  </p>

                  {/* Use Your Coins Option — available for BOTH coin sprints and cash/money sprints */}
                  <button
                    type="button"
                    disabled={!hasEnoughCoins || isProcessing}
                    onClick={() => hasEnoughCoins && !isProcessing && setSelectedMode('wallet')}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                      !hasEnoughCoins
                        ? 'border-gray-200/80 dark:border-zinc-800/80 bg-gray-50/70 dark:bg-zinc-900/40 opacity-75 cursor-not-allowed'
                        : selectedMode === 'wallet'
                        ? 'border-[#0E7850] dark:border-[#16B976] bg-[#0E7850]/[0.04] dark:bg-[#16B976]/[0.06] cursor-pointer'
                        : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {hasEnoughCoins ? (
                        selectedMode === 'wallet' ? (
                          <CheckCircle2 className="w-5 h-5 text-[#0E7850] dark:text-[#16B976] shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300 dark:text-zinc-600 shrink-0" />
                        )
                      ) : (
                        <Coins className="w-5 h-5 text-gray-400 dark:text-zinc-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-950 dark:text-white">
                          Use your coins
                        </div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                          {hasEnoughCoins
                            ? 'Unlock directly from your balance'
                            : `You need ${coinsRem} more coin${coinsRem === 1 ? '' : 's'} (1 coin = ₦${COIN_NAIRA_RATE})`}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-950 dark:text-white shrink-0 tabular-nums">
                      {activeCoinCost} coins
                    </span>
                  </button>

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
                          {activeTier.name} • Unlock Moves {targetMoveDay}–{sprint.duration || 7}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-950 dark:text-white shrink-0 tabular-nums">
                      {activeTier.currencySymbol}
                      {directAmount.toLocaleString()}
                    </span>
                  </button>

                  {/* Top up with Coin Bundle when insufficient coins */}
                  {!hasEnoughCoins && activeCoinCost > 0 && (
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
                        {selectedMode === 'coins' ? (
                          <CheckCircle2 className="w-5 h-5 text-[#0E7850] dark:text-[#16B976] shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300 dark:text-zinc-600 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-950 dark:text-white">
                            Buy coin bundle
                          </div>
                          <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                            Top up at least {coinsRem} coin{coinsRem === 1 ? '' : 's'} and save on bundles
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

                  {isCoinSprint && (
                    <ClaimCoinQuickDrawer
                      isCoinSprint={isCoinSprint}
                      onClaimed={(m) => {
                        if (chosenTier && userBalance + m.points >= activeCoinCost) {
                          setSelectedMode('wallet');
                        }
                      }}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="py-5 text-center border-b border-gray-200/70 dark:border-zinc-800/80">
                <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 leading-relaxed">
                  Select a tier above to see the price, exact coins needed, and unlock options.
                </p>
              </div>
            )}

            {/* Primary CTA */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleConfirmUnlock}
                disabled={isProcessing || !chosenTier}
                className={`w-full py-3.5 px-4 rounded-2xl border transition-all text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 ${
                  !isProcessing && chosenTier
                    ? 'bg-gray-950 dark:bg-[#0E7850] text-white border-gray-950 dark:border-[#0E7850] hover:bg-gray-800 dark:hover:bg-[#0b6140] active:scale-[0.99] cursor-pointer'
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
                    {chosenTier && <ArrowRight className="w-4 h-4" />}
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
