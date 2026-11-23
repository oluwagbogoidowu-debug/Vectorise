import React, { useState } from 'react';
import { useUnclaimedMilestones } from '../hooks/useUnclaimedMilestones';
import { MilestoneDefinition } from '../services/milestoneConstants';

interface ClaimCoinQuickDrawerProps {
  isCoinSprint?: boolean;
  onClaimed?: (milestone: MilestoneDefinition) => void;
}

export const ClaimCoinQuickDrawer: React.FC<ClaimCoinQuickDrawerProps> = ({
  isCoinSprint = true,
  onClaimed,
}) => {
  const { unclaimedMilestones, claimingId, claimOne } = useUnclaimedMilestones(
    Boolean(isCoinSprint)
  );
  const [isOpen, setIsOpen] = useState(false);

  // Strictly hide if not a coin sprint or if no unlocked unclaimed Hall of Rise milestones are available
  if (!isCoinSprint || unclaimedMilestones.length === 0) {
    return null;
  }

  const handleClaim = async (m: MilestoneDefinition) => {
    const ok = await claimOne(m);
    if (ok) {
      onClaimed?.(m);
    }
  };

  return (
    <div className="w-full pt-1">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="text-[11px] font-semibold text-[#0E7850] dark:text-[#16B976] hover:underline transition-colors cursor-pointer lowercase"
        >
          claim coin
        </button>
      </div>

      {isOpen && (
        <div className="mt-2 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-zinc-900/95 p-2.5 space-y-2 shadow-xs text-left">
          {unclaimedMilestones.map((m) => {
            const isBusy = claimingId === m.id;
            return (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2.5 py-1.5 px-2 rounded-lg bg-gray-50/80 dark:bg-zinc-800/70 border border-gray-100 dark:border-zinc-800"
              >
                <p className="text-xs font-medium text-gray-700 dark:text-zinc-200 leading-snug flex-1 min-w-0">
                  {m.description}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-[#0E7850] dark:text-[#16B976] tabular-nums">
                    +{m.points}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleClaim(m)}
                    disabled={isBusy || claimingId !== null}
                    className="px-2.5 py-1 rounded-lg bg-[#0E7850] hover:bg-[#0A5C3D] text-white text-[10px] font-bold lowercase tracking-wide transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center min-w-[46px]"
                  >
                    {isBusy ? (
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'claim'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClaimCoinQuickDrawer;
