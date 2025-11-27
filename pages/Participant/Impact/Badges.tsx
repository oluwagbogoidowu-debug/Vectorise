
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Participant } from '../../../types';
import { MOCK_REWARDS, MOCK_PARTICIPANT_SPRINTS } from '../../../services/mockData';

const Badges: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;
    const participant = user as Participant;
    const helpCount = participant.impactStats?.peopleHelped || 0;
    
    // Calculate sprint stats for badges
    const mySprints = MOCK_PARTICIPANT_SPRINTS.filter(ps => ps.participantId === user.id);
    const completedSprints = mySprints.filter(ps => ps.progress.every(d => d.completed)).length;
    const activeSprints = mySprints.filter(ps => !ps.progress.every(d => d.completed)).length;

    // Define standard sprint badges with point rewards
    const sprintBadges = [
        {
            id: 'sb_1',
            title: 'Sprint Starter',
            description: 'Enrolled in your first sprint',
            icon: '🚀',
            unlocked: mySprints.length > 0,
            points: 5,
            threshold: 1 // 1 enrollment
        },
        {
            id: 'sb_2',
            title: 'Finisher',
            description: 'Completed your first sprint',
            icon: '🏁',
            unlocked: completedSprints > 0,
            points: 10,
            threshold: 1 // 1 completion
        },
        {
            id: 'sb_3',
            title: 'Consistent',
            description: 'Completed 3 sprints',
            icon: '🔥',
            unlocked: completedSprints >= 3,
            points: 25,
            threshold: 3 // 3 completions
        },
        {
            id: 'sb_4',
            title: 'Master',
            description: 'Completed 5 sprints',
            icon: '⚡',
            unlocked: completedSprints >= 5,
            points: 50,
            threshold: 5 // 5 completions
        }
    ];

    // Find next sprint badge (based on completion count logic mostly, or just first locked)
    // For simplicity, let's look for the next "Completion" based badge that is locked
    const nextSprintBadge = sprintBadges.find(b => b.title !== 'Sprint Starter' && !b.unlocked);
    const sprintProgress = nextSprintBadge 
        ? Math.min(100, (completedSprints / nextSprintBadge.threshold) * 100) 
        : 100;

    // Get Impact Badges from Rewards (only achievements)
    // Sort by required referrals to ensure order
    const impactBadges = MOCK_REWARDS
        .filter(r => r.type === 'achievement' || r.type === 'mini_guide' || r.type === 'reflection_prompt') // Including others as milestones
        .sort((a, b) => a.requiredReferrals - b.requiredReferrals);

    // Find next impact badge
    const nextImpactBadge = impactBadges.find(r => helpCount < r.requiredReferrals);
    const impactProgress = nextImpactBadge 
        ? Math.min(100, (helpCount / nextImpactBadge.requiredReferrals) * 100)
        : 100;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
            <button 
                onClick={() => navigate('/profile')} 
                className="group flex items-center text-gray-500 hover:text-primary transition-colors mb-6 text-sm font-medium"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Profile
            </button>

            <div className="mb-8 text-center">
                <div className="w-20 h-20 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-100 shadow-sm animate-bounce-short">
                    <span className="text-4xl">🏅</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Achievements</h1>
                <p className="text-gray-600">Unlock badges and earn growth credits for every milestone.</p>
            </div>

            {/* NEXT MILESTONE HIGHLIGHT */}
            <div className="bg-gradient-to-r from-primary to-[#0B6040] rounded-2xl p-6 text-white shadow-lg mb-10 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-white/70 uppercase tracking-wider mb-1">Next Major Milestone</p>
                            <h2 className="text-2xl font-bold">{nextImpactBadge ? nextImpactBadge.title : "All Milestones Unlocked!"}</h2>
                        </div>
                        {nextImpactBadge && (
                            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1">
                                <span>+ {nextImpactBadge.rewardPoints || 0}</span>
                                <span className="text-lg">🪙</span>
                            </div>
                        )}
                    </div>
                    
                    {nextImpactBadge ? (
                        <>
                            <div className="flex justify-between text-xs font-semibold mb-2 text-white/80">
                                <span>{helpCount} Referrals</span>
                                <span>Target: {nextImpactBadge.requiredReferrals}</span>
                            </div>
                            <div className="w-full bg-black/20 rounded-full h-3 backdrop-blur-sm">
                                <div 
                                    className="bg-white h-3 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                                    style={{ width: `${impactProgress}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-white/70 mt-3">
                                {nextImpactBadge.requiredReferrals - helpCount} more referral{nextImpactBadge.requiredReferrals - helpCount !== 1 ? 's' : ''} to unlock.
                            </p>
                        </>
                    ) : (
                        <p className="text-white/90">You are a community legend! Stay tuned for more tiers.</p>
                    )}
                </div>
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            {/* Impact Badges Section */}
            <div className="mb-10">
                <div className="flex justify-between items-end mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-yellow-500 rounded-full"></span>
                        Impact Badges
                    </h2>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Referral Milestones</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {impactBadges.map(badge => {
                         const isUnlocked = helpCount >= badge.requiredReferrals;
                         return (
                            <div key={badge.id} className={`p-5 rounded-xl border flex items-center gap-4 transition-all relative overflow-hidden ${isUnlocked ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-200 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-70'}`}>
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl flex-shrink-0 ${isUnlocked ? 'bg-white shadow-sm' : 'bg-gray-200 grayscale'}`}>
                                    {badge.type === 'achievement' ? '🏆' : '🎁'}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 mb-1">{badge.title}</h3>
                                    <p className="text-xs text-gray-500 mb-2">{badge.description}</p>
                                    <div className="flex items-center gap-2">
                                         {isUnlocked ? (
                                             <span className="text-[10px] font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Unlocked</span>
                                         ) : (
                                             <span className="text-[10px] font-bold text-gray-400">{helpCount} / {badge.requiredReferrals} Referrals</span>
                                         )}
                                    </div>
                                </div>
                                <div className={`absolute top-0 right-0 px-2 py-1 text-[10px] font-bold rounded-bl-lg ${isUnlocked ? 'bg-yellow-200 text-yellow-900' : 'bg-gray-200 text-gray-500'}`}>
                                    +{badge.rewardPoints} 🪙
                                </div>
                            </div>
                         );
                    })}
                </div>
            </div>

            {/* Sprint Badges Section */}
            <div>
                <div className="flex justify-between items-end mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                        Sprint Milestones
                    </h2>
                     {nextSprintBadge && (
                         <div className="text-right">
                            <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Next: {nextSprintBadge.title}</span>
                             <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1">
                                 <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${sprintProgress}%` }}></div>
                             </div>
                         </div>
                     )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {sprintBadges.map(badge => (
                        <div key={badge.id} className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all relative ${badge.unlocked ? 'bg-white border-blue-100 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-3 ${badge.unlocked ? 'bg-blue-50' : 'bg-gray-200 grayscale'}`}>
                                {badge.icon}
                            </div>
                            <h3 className="font-bold text-gray-900 text-sm mb-1">{badge.title}</h3>
                            <p className="text-xs text-gray-500 mb-3">{badge.description}</p>
                            
                            {badge.unlocked ? (
                                <span className="mt-auto text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded">Unlocked</span>
                            ) : (
                                <span className="mt-auto text-[10px] font-bold text-gray-400 uppercase tracking-wider">{completedSprints}/{badge.threshold} Done</span>
                            )}
                            
                            <div className={`absolute top-2 right-2 text-[10px] font-bold ${badge.unlocked ? 'text-blue-600' : 'text-gray-400'}`}>
                                +{badge.points} 🪙
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <style>{`
                @keyframes bounceShort {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                .animate-bounce-short {
                    animation: bounceShort 0.5s ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default Badges;
