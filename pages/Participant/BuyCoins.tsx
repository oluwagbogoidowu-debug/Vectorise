import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Participant } from '../../types';
import Button from '../../components/Button';
import { paymentService } from '../../services/paymentService';
import { ArrowLeft } from 'lucide-react';

const BuyCoins: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleBuy = async (pkg: any) => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    setIsLoading(true);
    try {
      const checkoutUrl = await paymentService.initializeFlutterwave({
        userId: user.id,
        email: user.email,
        name: user.name,
        amount: pkg.price,
        currency: 'NGN',
        coinPackageId: pkg.id,
        coins: pkg.coins,
        // Pass context for redirection after payment
        sprintId: location.state?.sprintId,
        trackId: location.state?.trackId
      });
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Failed to initialize payment:', error);
      alert('Failed to start payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const coinPackages = [
    {
      id: 'pkg_50',
      coins: 50,
      price: 750,
      description: 'Get back in. Keep your streak alive.',
      tag: null
    },
    {
      id: 'pkg_100',
      coins: 100,
      price: 1400,
      description: 'Stay consistent. Stack your next wins.',
      tag: 'Best Value'
    },
    {
      id: 'pkg_300',
      coins: 300,
      price: 4000,
      description: 'Lock in your growth. No stopping now.',
      tag: null
    }
  ];

  const userParticipant = user as Participant;
  const balance = userParticipant?.walletBalance || 0;
  const sprintsLeft = Math.floor(balance / 10);

  return (
    <div className="min-h-screen bg-[#F8F9FA] selection:bg-primary/10 font-sans">
      <div className="max-w-xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="text-center mb-12 animate-fade-in">
          <button 
            onClick={() => navigate(-1)}
            className="mb-8 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center mx-auto gap-2"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-3">Refuel Your Rise</h1>
          <p className="text-gray-500 font-medium leading-relaxed">
            You’ve started showing up. Keep the momentum alive.
          </p>
        </div>

        {/* Balance Card */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/50 mb-12 animate-slide-up">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl mb-4">
              🪙
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-1">
              {balance} coins left
            </h2>
            <p className="text-[11px] font-black text-primary uppercase tracking-widest">
              Enough for {sprintsLeft} more sprint{sprintsLeft !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Transition Line */}
        <div className="text-center mb-8">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
            This is where consistency is built.
          </p>
        </div>

        {/* Packages Grid */}
        <div className="space-y-4 mb-12">
          {coinPackages.map((pkg, index) => (
            <div 
              key={pkg.id}
              className={`bg-white rounded-3xl p-6 border transition-all duration-300 animate-slide-up relative overflow-hidden group ${
                pkg.tag ? 'border-primary ring-1 ring-primary/20' : 'border-gray-100 hover:border-primary/30'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {pkg.tag && (
                <div className="absolute top-0 right-0 bg-primary text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">
                  {pkg.tag}
                </div>
              )}
              
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl font-black text-gray-900">{pkg.coins} Coins</span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">{pkg.description}</p>
                </div>
                
                <div className="text-right">
                  <p className="text-xl font-black text-gray-900 mb-2">₦{pkg.price.toLocaleString()}</p>
                  <Button 
                    onClick={() => handleBuy(pkg)}
                    isLoading={isLoading}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      pkg.tag ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-gray-900'
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
        <div className="text-center">
          <p className="text-sm text-gray-400 font-medium italic">
            "What you do next is what compounds it."
          </p>
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
