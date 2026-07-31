import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { paymentService } from '../services/paymentService';
import { useNavigate } from 'react-router-dom';

interface BottomModalCoinCardsProps {
  userBalance?: number;
  sprintCost?: number;
  sprintId?: string;
  trackId?: string;
  onSuccess?: () => void;
}

export const BottomModalCoinCards: React.FC<BottomModalCoinCardsProps> = ({
  sprintId,
  trackId
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingPkgId, setLoadingPkgId] = useState<string | null>(null);

  const handleBuyPackage = async (pkg: { id: string; coins: number; price: number }) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoadingPkgId(pkg.id);
    try {
      const checkoutUrl = await paymentService.initializeFlutterwave({
        userId: user.id,
        email: user.email,
        name: user.name,
        amount: pkg.price,
        currency: 'NGN',
        coinPackageId: pkg.id,
        coins: pkg.coins,
        sprintId,
        trackId
      });
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Failed to initialize coin purchase:', error);
    } finally {
      setLoadingPkgId(null);
    }
  };

  const packages = [
    {
      id: 'pkg_30',
      coins: 30,
      price: 500,
      description: 'Continue your current sprint',
      tag: 'Quick Continue',
      buttonText: 'Continue Now',
      cardStyle: 'border-emerald-500/30 bg-emerald-50/20',
      tagStyle: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
      buttonStyle: 'bg-[#0E7850] hover:bg-[#0A5C3D] text-white shadow-xs'
    },
    {
      id: 'pkg_100',
      coins: 100,
      price: 1300,
      description: 'Stay in motion. Stack your next wins',
      tag: 'Best Value',
      buttonText: 'Stay Consistent',
      cardStyle: 'border-primary bg-primary/5 shadow-sm',
      tagStyle: 'bg-primary text-white',
      buttonStyle: 'bg-primary hover:bg-primary/95 text-white shadow-sm'
    },
    {
      id: 'pkg_300',
      coins: 300,
      price: 3600,
      description: 'Lock in your growth. No interruptions',
      tag: 'Pro Growth',
      buttonText: 'Go All In',
      cardStyle: 'border-amber-300 bg-amber-50/20',
      tagStyle: 'bg-amber-500 text-white',
      buttonStyle: 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
    }
  ];

  return (
    <div className="w-full mt-3 pt-2 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
          Get Discounted Coins
        </span>
        <span className="text-[9px] font-bold text-gray-400">
          Keep your momentum constant
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar text-left scroll-smooth">
        {/* Coin Packages */}
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`min-w-[150px] sm:min-w-[165px] w-[155px] shrink-0 border-2 rounded-2xl p-3 flex flex-col justify-between transition-all bg-white relative ${pkg.cardStyle}`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className={`text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${pkg.tagStyle}`}>
                  {pkg.tag}
                </span>
                <span className="text-[10px] font-black text-gray-900">
                  ₦{pkg.price.toLocaleString()}
                </span>
              </div>
              <div className="text-xs font-black text-gray-900 tracking-tight mt-1 mb-0.5">
                {pkg.coins} Coins
              </div>
              <p className="text-[9px] text-gray-500 font-medium leading-tight line-clamp-2">
                {pkg.description}
              </p>
            </div>

            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => handleBuyPackage(pkg)}
                disabled={loadingPkgId !== null}
                className={`w-full py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 ${pkg.buttonStyle} ${loadingPkgId !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loadingPkgId === pkg.id ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  pkg.buttonText
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BottomModalCoinCards;
