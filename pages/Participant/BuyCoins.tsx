import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Participant } from '../../types';
import Button from '../../components/Button';
import LocalLogo from '../../components/LocalLogo';

const BuyCoins: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;
    const participant = user as Participant;
    const walletBalance = participant.walletBalance || 0;

    const coinPackages = [
        { id: 'p1', coins: 50, price: 5000, popular: false },
        { id: 'p2', coins: 150, price: 12000, popular: true },
        { id: 'p3', coins: 500, price: 35000, popular: false },
    ];

    const handleBuy = (pkg: any) => {
        // In a real app, this would trigger a payment gateway
        alert(`Redirecting to payment for ${pkg.coins} coins...`);
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] px-6 py-12 pb-32 animate-fade-in font-sans">
            <div className="max-w-xl mx-auto">
                <header className="mb-12 text-center">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="flex items-center text-gray-400 hover:text-primary transition-colors mb-8 text-[10px] font-black uppercase tracking-widest mx-auto"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <LocalLogo type="green" className="h-6 w-auto mx-auto mb-6 opacity-20" />
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight italic mb-2">Refuel Your Rise</h1>
                    <p className="text-xs text-gray-500 font-medium">Get more coins to unlock premium sprints and tracks.</p>
                </header>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 mb-10 text-center relative overflow-hidden">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Current Balance</p>
                    <div className="flex items-center justify-center gap-3">
                        <span className="text-3xl">🪙</span>
                        <span className="text-5xl font-black text-gray-900">{walletBalance}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] px-2">Select a Package</h2>
                    {coinPackages.map((pkg) => (
                        <div 
                            key={pkg.id} 
                            className={`bg-white rounded-[2rem] p-6 border transition-all flex items-center justify-between group ${pkg.popular ? 'border-primary ring-1 ring-primary/10 shadow-lg scale-[1.02]' : 'border-gray-100 hover:border-gray-200 shadow-sm'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${pkg.popular ? 'bg-primary/10 text-primary' : 'bg-gray-50 text-gray-400'}`}>
                                    🪙
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-black text-gray-900">{pkg.coins} Coins</h3>
                                        {pkg.popular && (
                                            <span className="px-2 py-0.5 bg-primary text-white text-[7px] font-black uppercase rounded-md tracking-widest">Best Value</span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">₦{pkg.price.toLocaleString()}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleBuy(pkg)}
                                className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${pkg.popular ? 'bg-primary text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                            >
                                Buy Now
                            </button>
                        </div>
                    ))}
                </div>

                <footer className="mt-16 text-center">
                    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Secure payments via Flutterwave</p>
                </footer>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default BuyCoins;
