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
  selectedPaymentMethod?: string;
  onSelectPaymentMethod?: (method: string) => void;
  isProcessing?: boolean;
}

export const BottomModalCoinCards: React.FC<BottomModalCoinCardsProps> = ({
  sprintId,
  trackId,
  selectedPaymentMethod,
  onSelectPaymentMethod,
  isProcessing
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingPkgId, setLoadingPkgId] = useState<string | null>(null);

  const handleBuyPackage = async (pkg: { id: string; coins: number; price: number }) => {
    if (onSelectPaymentMethod) {
      onSelectPaymentMethod(pkg.id);
      return;
    }

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
      discount: '16% OFF',
      buttonText: 'Continue Now',
      cardStyle: 'border-emerald-500/30 bg-emerald-50/20',
      tagStyle: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
      discountStyle: 'bg-emerald-100 text-emerald-800',
      buttonStyle: 'bg-[#0E7850] hover:bg-[#0A5C3D] text-white shadow-xs'
    },
    {
      id: 'pkg_100',
      coins: 100,
      price: 1300,
      description: 'Stay in motion. Stack your next wins',
      tag: 'Best Value',
      discount: '35% OFF',
      buttonText: 'Stay Consistent',
      cardStyle: 'border-primary bg-primary/5 shadow-sm',
      tagStyle: 'bg-primary text-white',
      discountStyle: 'bg-emerald-600 text-white',
      buttonStyle: 'bg-primary hover:bg-primary/95 text-white shadow-sm'
    },
    {
      id: 'pkg_300',
      coins: 300,
      price: 3600,
      description: 'Lock in your growth. No interruptions',
      tag: 'Pro Growth',
      discount: '40% OFF',
      buttonText: 'Go All In',
      cardStyle: 'border-amber-300 bg-amber-50/20',
      tagStyle: 'bg-amber-500 text-white',
      discountStyle: 'bg-amber-100 text-amber-900 border border-amber-300/80',
      buttonStyle: 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
    }
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <span className="text-xs font-black uppercase tracking-wider text-gray-500">
          Get Discounted Coins
        </span>
        <span className="text-xs font-semibold text-gray-400">
          Keep your momentum constant
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar text-left scroll-smooth">
        {/* Coin Packages */}
        {packages.map((pkg) => {
          const isSelected = selectedPaymentMethod === pkg.id;

          return (
            <div
              key={pkg.id}
              onClick={() => {
                if (!isProcessing) {
                  if (onSelectPaymentMethod) {
                    onSelectPaymentMethod(pkg.id);
                  } else {
                    handleBuyPackage(pkg);
                  }
                }
              }}
              className={`min-w-[165px] sm:min-w-[180px] w-[170px] shrink-0 border-2 rounded-2xl p-3.5 flex flex-col justify-between transition-all relative cursor-pointer ${
                isSelected 
                  ? 'border-[#0E7850] ring-2 ring-[#0E7850]/40 shadow-md bg-emerald-50/40 scale-[1.02]' 
                  : `bg-white ${pkg.cardStyle} hover:border-gray-300`
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                      isSelected ? 'border-[#0E7850] bg-[#0E7850]' : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${pkg.tagStyle}`}>
                      {pkg.tag}
                    </span>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${pkg.discountStyle}`}>
                    {pkg.discount}
                  </span>
                </div>
                <div className="text-sm sm:text-base font-black text-gray-900 tracking-tight mt-1 mb-1">
                  {pkg.coins} Coins
                </div>
                <p className="text-xs text-gray-600 font-medium leading-snug line-clamp-2">
                  {pkg.description}
                </p>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isProcessing) {
                      if (onSelectPaymentMethod) {
                        onSelectPaymentMethod(pkg.id);
                      } else {
                        handleBuyPackage(pkg);
                      }
                    }
                  }}
                  disabled={loadingPkgId !== null || isProcessing}
                  className={`w-full py-2 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                    isSelected ? 'bg-[#0E7850] text-white shadow-xs' : pkg.buttonStyle
                  } ${(loadingPkgId !== null || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loadingPkgId === pkg.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : isSelected ? (
                    `Selected • ₦${pkg.price.toLocaleString()}`
                  ) : (
                    `${pkg.buttonText} • ₦${pkg.price.toLocaleString()}`
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BottomModalCoinCards;
