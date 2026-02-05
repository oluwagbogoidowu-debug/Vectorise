import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Participant } from '../../../types';
import Button from '../../../components/Button';

const GrowthRewards: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;
    const participant = user as Participant;
    const walletBalance = participant.walletBalance || 0;

    const transactions = [
        { 
            id: 't1', 
            name: 'LinkedIn Sprint (Pro)', 
            amount: '₦10,000', 
            status: 'Paid', 
            date: 'Jan 9' 
        },
        { 
            id: 't2', 
            name: 'Focus Sprint (Free)', 
            amount: '30 🪙', 
            status: 'Accessed via coins', 
            date: 'Jan 5' 
        }
    ];

    return (
        <div className="max-w-xl mx-auto px-6 py-10 pb-32 animate-fade-in">
            {/* Minimal Header */}
            <div className="mb-12">
                <button 
                    onClick={() => navigate('/profile')} 
                    className="flex items-center text-gray-400 hover:text-primary transition-colors mb-4 text-[10px] font-black uppercase tracking-widest"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                    </svg>
                    Profile
                </button>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight italic">Growth Wallet</h1>
            </div>

            {/* Clean Wallet Card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 mb-12 text-center relative overflow-hidden">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Available Credit</p>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Wallet Balance</h2>
                
                <div className="inline-flex items-center justify-center bg-gray-50 rounded-[2.5rem] px-10 py-8 mb-6 border border-gray-100">
                    <span className="text-4xl mr-3">🪙</span>
                    <span className="text-6xl font-black text-gray-900">{walletBalance}</span>
                </div>

                <Button 
                    onClick={() => navigate('/discover')}
                    className="w-full py-5 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-primary/10 transition-transform active:scale-95"
                >
                    Use Coins for Sprints
                </Button>
                
                {/* Subtle detail */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
            </div>

            {/* Simplified History */}
            <div className="space-y-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">History</h3>

                <div className="space-y-3">
                    {transactions.map((t) => (
                        <div key={t.id} className="bg-white rounded-2xl border border-gray-50 p-6 flex justify-between items-center group transition-colors hover:border-gray-200">
                            <div className="min-w-0">
                                <h4 className="font-black text-gray-900 text-sm mb-0.5 truncate">{t.name}</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                    {t.status} • {t.date}
                                </p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                                <p className="font-black text-lg text-gray-900 leading-none">{t.amount}</p>
                            </div>
                        </div>
                    ))}
                </div>
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

export default GrowthRewards;