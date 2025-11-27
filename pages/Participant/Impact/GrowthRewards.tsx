
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MOCK_REWARDS, SUBSCRIPTION_PLANS } from '../../../services/mockData';
import { useAuth } from '../../../contexts/AuthContext';
import { Participant } from '../../../types';
import Button from '../../../components/Button';

const GrowthRewards: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { fromSprintId } = location.state || {};

    const [activeTab, setActiveTab] = useState<'rewards' | 'wallet'>('wallet');
    
    if (!user) return null;
    const participant = user as Participant;
    const helpCount = participant.impactStats?.peopleHelped || 0;
    const walletBalance = participant.walletBalance || 0;
    const currentPlanId = participant.subscription?.active ? participant.subscription.planId : null;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
             <button 
                onClick={() => fromSprintId ? navigate(`/sprint/${fromSprintId}`) : navigate('/impact')} 
                className="group flex items-center text-gray-500 hover:text-primary transition-colors mb-6 text-sm font-medium"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {fromSprintId ? 'Back to Sprint' : 'Back to Dashboard'}
            </button>

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Rewards & Wallet</h1>
                <p className="text-gray-600">Manage your subscription, credits, and achievements.</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-6 border-b border-gray-200 mb-8 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('wallet')}
                    className={`pb-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${activeTab === 'wallet' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    Plans & Wallet
                </button>
                <button 
                    onClick={() => setActiveTab('rewards')}
                    className={`pb-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${activeTab === 'rewards' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    Achievements
                </button>
            </div>

            {activeTab === 'wallet' && (
                <div className="animate-fade-in space-y-12">
                    {/* Wallet Balance */}
                    <div className="bg-gradient-to-r from-yellow-50 to-white border border-yellow-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between shadow-sm">
                        <div className="mb-4 md:mb-0">
                             <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider mb-1">Your Balance</p>
                             <div className="flex items-center gap-3">
                                <span className="text-4xl">🪙</span>
                                <span className="text-4xl font-extrabold text-gray-900">{walletBalance}</span>
                                <span className="text-gray-500 font-medium self-end mb-1">Credits</span>
                             </div>
                        </div>
                         {/* Top Up / Buy Points Mini Section */}
                        <div className="flex gap-3">
                           {/* Add top-up buttons here if needed, or rely on subscriptions */}
                        </div>
                    </div>

                    {/* Subscription Plans */}
                    <div>
                        <div className="text-center max-w-2xl mx-auto mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">Choose Your Growth Path</h2>
                            <p className="text-gray-500">Subscriptions unlock unlimited access to sprints within your tier, plus monthly growth credits.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {SUBSCRIPTION_PLANS.map((plan) => {
                                const isCurrent = currentPlanId === plan.id;
                                const isPremium = plan.id === 'premium';
                                
                                return (
                                    <div key={plan.id} className={`flex flex-col rounded-2xl p-6 border transition-all duration-300 relative ${
                                        isCurrent 
                                            ? 'bg-white border-primary shadow-xl ring-2 ring-primary/20 scale-105 z-10' 
                                            : isPremium 
                                                ? 'bg-gray-900 text-white border-gray-800'
                                                : 'bg-white border-gray-200 hover:shadow-lg'
                                    }`}>
                                        {isCurrent && (
                                            <div className="absolute top-0 right-0 left-0 -mt-3 flex justify-center">
                                                <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm uppercase tracking-wide">Current Plan</span>
                                            </div>
                                        )}
                                        {plan.id === 'pro' && !isCurrent && (
                                            <div className="absolute top-0 right-0 bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">
                                                Best Value
                                            </div>
                                        )}
                                        
                                        <div className="mb-4">
                                            <h3 className={`font-bold text-lg ${isPremium ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                                            <p className={`text-xs ${isPremium ? 'text-gray-400' : 'text-gray-500'} mb-2`}>{plan.targetAudience}</p>
                                            <div className="flex items-baseline">
                                                <span className={`text-2xl font-extrabold ${isPremium ? 'text-white' : 'text-gray-900'}`}>{plan.currency}{plan.price.toLocaleString()}</span>
                                                <span className={`text-xs font-medium ${isPremium ? 'text-gray-500' : 'text-gray-400'}`}>/mo</span>
                                            </div>
                                        </div>

                                        <p className={`text-sm mb-6 flex-grow ${isPremium ? 'text-gray-300' : 'text-gray-600'}`}>
                                            {plan.description}
                                        </p>

                                        <ul className="space-y-3 mb-8">
                                            {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm">
                                                    <svg className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isPremium ? 'text-yellow-500' : 'text-green-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <span className={isPremium ? 'text-gray-300' : 'text-gray-700'}>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="mt-auto">
                                            <Button 
                                                variant={isCurrent ? "secondary" : isPremium ? "primary" : "secondary"}
                                                className={`w-full justify-center ${
                                                    isCurrent ? 'bg-gray-100 text-gray-500 cursor-default' : 
                                                    isPremium ? 'bg-white text-gray-900 hover:bg-gray-100' : ''
                                                }`}
                                                disabled={isCurrent}
                                            >
                                                {isCurrent ? 'Active' : 'Upgrade'}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'rewards' && (
                <div className="animate-fade-in">
                    {/* Progress Bar Header */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-bold text-gray-500 uppercase">Total Impact</span>
                            <span className="text-2xl font-bold text-primary">{helpCount} <span className="text-sm text-gray-400 font-normal">Referrals</span></span>
                        </div>
                        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                            {/* Max scale 10 now for the new achievement */}
                            <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (helpCount / 10) * 100)}%` }}></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 text-right">Next major milestone at 10 referrals</p>
                    </div>

                    <div className="space-y-6">
                        {MOCK_REWARDS.map((reward) => {
                            const isUnlocked = helpCount >= reward.requiredReferrals;
                            const isAchievement = reward.type === 'achievement';
                            
                            return (
                                <div key={reward.id} className={`rounded-2xl border p-6 flex gap-5 items-start transition-all ${
                                    isUnlocked 
                                        ? isAchievement ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-200' : 'bg-white border-green-100 shadow-sm' 
                                        : 'bg-gray-50 border-gray-200 opacity-70'
                                }`}>
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 ${
                                        isUnlocked 
                                            ? isAchievement ? 'bg-yellow-100 shadow-inner' : 'bg-green-100' 
                                            : 'bg-gray-200 grayscale'
                                    }`}>
                                        {reward.type === 'early_access' ? '🚀' : reward.type === 'reflection_prompt' ? '📝' : reward.type === 'achievement' ? '🏆' : '📘'}
                                    </div>
                                    
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-gray-900 text-lg mb-1">{reward.title}</h3>
                                            {isUnlocked ? (
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${isAchievement ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-700'}`}>Unlocked</span>
                                            ) : (
                                                <span className="text-xs font-bold bg-gray-200 text-gray-500 px-2 py-1 rounded">Locked</span>
                                            )}
                                        </div>
                                        <p className="text-gray-600 text-sm mb-4">{reward.description}</p>
                                        
                                        {isUnlocked ? (
                                            isAchievement ? (
                                                <span className="text-yellow-700 font-bold text-sm">Badge Applied to Profile</span>
                                            ) : (
                                                <button className="text-primary font-bold text-sm hover:underline">Access Content &rarr;</button>
                                            )
                                        ) : (
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                                Requires {reward.requiredReferrals} Referrals
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default GrowthRewards;
