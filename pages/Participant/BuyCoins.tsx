import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Participant } from '../../types';
import Button from '../../components/Button';
import { paymentService } from '../../services/paymentService';
import { ArrowLeft, Coins, Zap, ShieldCheck, Sparkles } from 'lucide-react';

const BuyCoins: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);

  const handleBuy = async (pkg: any) => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    setLoadingPackageId(pkg.id);
    try {
      const checkoutUrl = await paymentService.initializeFlutterwave({
        userId: user.id,
        email: user.email,
        name: user.name,
        amount: pkg.price,
        currency: 'NGN',
        coinPackageId: pkg.id,
        coins: pkg.coins,
        sprintId: location.state?.sprintId,
        trackId: location.state?.trackId
      });
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Failed to initialize payment:', error);
    } finally {
      setLoadingPackageId(null);
    }
  };

  const coinPackages = [
    {
      id: 'pkg_30',
      coins: 30,
      price: 500,
      description: 'Continue your current sprint',
      icon: <Zap className="w-5 h-5" />,
      tag: 'Quick Continue',
      buttonText: 'Continue Now',
      cardClassName: 'p-4 sm:p-5 border-gray-100 hover:border-gray-200/80',
      tagClassName: 'bg-emerald-50 text-emerald-700 border border-emerald-100/40',
      iconContainerClassName: 'bg-emerald-50 text-[#159E6A]',
      buttonClassName: 'bg-[#159E6A] text-white hover:bg-[#0E8555] shadow-md shadow-[#159E6A]/10'
    },
    {
      id: 'pkg_100',
      coins: 100,
      price: 1300,
      description: 'Stay in motion. Stack your next wins',
      icon: <Sparkles className="w-5 h-5" />,
      tag: 'Best Value',
      buttonText: 'Stay Consistent',
      cardClassName: 'py-8 px-5 sm:py-9 sm:px-6 border-primary shadow-xl shadow-primary/5',
      tagClassName: 'bg-primary text-white',
      iconContainerClassName: 'bg-primary/10 text-primary',
      buttonClassName: 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/95'
    },
    {
      id: 'pkg_300',
      coins: 300,
      price: 3600,
      description: 'Lock in your growth. No interruptions',
      icon: <ShieldCheck className="w-5 h-5" />,
      tag: 'Pro Growth',
      buttonText: 'Go All In',
      cardClassName: 'p-5 sm:p-6 bg-amber-50/10 border-amber-300 shadow-xl shadow-amber-500/5 hover:border-amber-450/80',
      tagClassName: 'bg-amber-500 text-white',
      iconContainerClassName: 'bg-amber-100 text-amber-600 border border-amber-200/50',
      buttonClassName: 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20'
    }
  ];

  const userParticipant = user as Participant;
  const balance = userParticipant?.walletBalance || 0;

  return (
    <div className="min-h-screen bg-white selection:bg-primary/10 font-sans text-gray-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            <Coins className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-black tracking-tight">{balance} COINS</span>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="mb-10 animate-fade-in">
          <h1 className="text-5xl font-black tracking-tighter leading-[0.9] mb-4">
            Keep the<br/>
            <span className="text-primary italic">Rise going</span>
          </h1>
        </div>

        {/* Packages List */}
        <div className="space-y-4 mb-16">
          {coinPackages.map((pkg, index) => (
            <div 
              key={pkg.id}
              className={`group relative bg-white border-2 rounded-3xl transition-all duration-300 animate-slide-up ${pkg.cardClassName}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {pkg.tag && (
                <div className={`absolute -top-3 right-6 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md ${pkg.tagClassName}`}>
                  {pkg.tag}
                </div>
              )}
              
              <div className="flex flex-col">
                {/* Upper block with Details */}
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${pkg.iconContainerClassName}`}>
                    {pkg.icon}
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-none mb-1 text-gray-900">
                      {pkg.coins} Coins
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium leading-tight">
                      {pkg.description}
                    </p>
                  </div>
                </div>

                {/* Separation Line */}
                <hr className="border-gray-100 my-4" />

                {/* Lower block with Price and Buy Button */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-lg sm:text-xl font-black tracking-tight text-gray-900">
                    ₦{pkg.price.toLocaleString()}
                  </span>
                  <Button 
                    onClick={() => handleBuy(pkg)}
                    isLoading={loadingPackageId === pkg.id}
                    disabled={loadingPackageId !== null}
                    className={`px-5 py-3 sm:px-6 sm:py-3.5 rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${pkg.buttonClassName}`}
                  >
                    {pkg.buttonText || 'Buy Now'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Closing Line */}
        <div className="text-center animate-fade-in" style={{ animationDelay: '400ms' }}>
          <p className="text-sm text-gray-400 font-medium italic mb-2">
            "What you do next is what compounds it"
          </p>
          <div className="w-12 h-1 bg-gray-100 mx-auto rounded-full"></div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default BuyCoins;
