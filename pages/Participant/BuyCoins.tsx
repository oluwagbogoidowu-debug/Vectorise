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
      id: 'pkg_50',
      coins: 50,
      price: 750,
      description: 'Get back in. Keep your streak alive.',
      icon: <Zap className="w-5 h-5" />,
      tag: null
    },
    {
      id: 'pkg_100',
      coins: 100,
      price: 1400,
      description: 'Stay consistent. Stack your next wins.',
      icon: <Sparkles className="w-5 h-5" />,
      tag: 'Best Value'
    },
    {
      id: 'pkg_300',
      coins: 300,
      price: 4000,
      description: 'Lock in your growth. No stopping now.',
      icon: <ShieldCheck className="w-5 h-5" />,
      tag: 'Pro Growth'
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
        <div className="mb-12 animate-fade-in">
          <h1 className="text-5xl font-black tracking-tighter leading-[0.9] mb-4">
            Refuel<br/>
            <span className="text-primary italic">Your Rise</span>
          </h1>
          <p className="text-lg text-gray-500 font-medium max-w-md leading-tight">
            You’ve started showing up. Keep the momentum alive.
          </p>
        </div>

        {/* Transition Line */}
        <div className="flex items-center gap-4 mb-8 opacity-30">
          <div className="h-px bg-gray-900 flex-1"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] whitespace-nowrap">
            This is where consistency is built
          </span>
          <div className="h-px bg-gray-900 flex-1"></div>
        </div>

        {/* Packages List */}
        <div className="space-y-3 mb-16">
          {coinPackages.map((pkg, index) => (
            <div 
              key={pkg.id}
              className={`group relative bg-white border-2 rounded-3xl p-6 transition-all duration-300 animate-slide-up ${
                pkg.tag === 'Best Value' 
                  ? 'border-primary shadow-xl shadow-primary/5' 
                  : 'border-gray-100 hover:border-gray-200'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {pkg.tag && (
                <div className="absolute -top-3 right-6 bg-primary text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                  {pkg.tag}
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    pkg.tag === 'Best Value' ? 'bg-primary/10 text-primary' : 'bg-gray-50 text-gray-400'
                  }`}>
                    {pkg.icon}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight leading-none mb-1">
                      {pkg.coins} Coins
                    </h3>
                    <p className="text-sm text-gray-500 font-medium leading-tight">
                      {pkg.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:min-w-[140px]">
                  <span className="text-xl font-black tracking-tight">
                    ₦{pkg.price.toLocaleString()}
                  </span>
                  <Button 
                    onClick={() => handleBuy(pkg)}
                    isLoading={loadingPackageId === pkg.id}
                    disabled={loadingPackageId !== null}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                      pkg.tag === 'Best Value' 
                        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                        : 'bg-gray-900 text-white'
                    }`}
                  >
                    Buy Now
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
