import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../services/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Participant, Referral, UserRole, Sprint, ParticipantSprint } from '../../../types';
import { sanitizeData, userService } from '../../../services/userService';
import { sprintService } from '../../../services/sprintService';
import { Share2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

const IMPACT_DEGREE_POINTS: Record<string, number> = {
    'i1': 5, 'i3': 15, 'i5': 25, 'i10': 50, 'i15': 75, 'i20': 100, 'i25': 125, 'i30': 150, 'i35': 175, 'i40': 200, 'i45': 225, 'i50': 250
};

const ImpactDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [leaders, setLeaders] = useState<Participant[]>([]);
    const [fullLeaderboard, setFullLeaderboard] = useState<Participant[]>([]);
    const [enrolledSprints, setEnrolledSprints] = useState<{sprint: Sprint, enrollment: ParticipantSprint}[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        
        const unsubEnrollments = sprintService.subscribeToUserEnrollments(user.id, async (enrollments) => {
            const sprintPromises = enrollments.map(e => sprintService.getSprintById(e.sprint_id));
            const sprints = await Promise.all(sprintPromises);
            const combined = enrollments.map((enrollment, idx) => ({
                enrollment,
                sprint: sprints[idx]!
            })).filter(item => item.sprint);
            setEnrolledSprints(combined);
        });

        // Subscribe to my referrals
        const qRef = query(collection(db, 'users', user.id, 'referrals'));
        const unsubRef = onSnapshot(qRef, (snap) => {
            setReferrals(snap.docs.map(d => sanitizeData({ id: d.id, ...d.data() }) as Referral));
        });

        // Fetch top leaders
        const qLead = query(collection(db, 'users'), where('role', '==', 'PARTICIPANT'));
        const unsubLead = onSnapshot(qLead, (snap) => {
            const data = snap.docs.map(d => sanitizeData(d.data()) as Participant);
            const sortedLeaders = data.sort((a, b) => (b.impactStats?.peopleHelped || 0) - (a.impactStats?.peopleHelped || 0));
            setFullLeaderboard(sortedLeaders);
            const myRank = sortedLeaders.findIndex(p => p.id === user.id);
            const focusedLeaders = sortedLeaders.slice(Math.max(0, myRank - 1), myRank + 2);
            setLeaders(focusedLeaders);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching leaders: ", error);
            setIsLoading(false);
        });

        return () => { unsubEnrollments(); unsubRef(); unsubLead(); };
    }, [user]);

    if (!user) return null;
    const p = user as Participant;
    
    // Claiming status states
    const [claimingId, setClaimingId] = useState<string | null>(null);

    const handleClaimMilestone = async (milestoneId: string, points: number) => {
        setClaimingId(milestoneId);
        try {
            await userService.claimMilestone(p.id, milestoneId, points);
            toast.success(`Claimed! +${points} Coins added to your wallet.`);
        } catch (err) {
            console.error("Failed to claim milestone:", err);
            toast.error("Failed to default claim credits.");
        } finally {
            setClaimingId(null);
        }
    };

    const peopleHelped = referrals.length;
    const claimedIds = p.claimedMilestoneIds || [];

    // The customized 6 impact referral milestone cards
    const impactCards = [
        {
            id: 'i1',
            title: 'Starter',
            targetValue: 1,
            points: 5,
            icon: '🌱',
            tag: 'Starter',
            cardClassName: 'border-emerald-100 bg-emerald-50/10 hover:border-emerald-200/50',
            tagClassName: 'bg-emerald-50 text-emerald-700 border border-emerald-100/40',
            iconContainerClassName: 'bg-emerald-100/60 text-[#159E6A]',
            buttonClassName: 'bg-[#159E6A] text-white hover:bg-[#0E8555] shadow-md'
        },
        {
            id: 'i3',
            title: 'Builder',
            targetValue: 3,
            points: 15,
            icon: '🔧',
            tag: 'Builder',
            cardClassName: 'border-blue-100 bg-blue-50/10 hover:border-blue-200/50',
            tagClassName: 'bg-blue-50 text-blue-700 border border-blue-100/40',
            iconContainerClassName: 'bg-blue-100/60 text-blue-600',
            buttonClassName: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
        },
        {
            id: 'i5',
            title: 'Catalyst',
            targetValue: 5,
            points: 30,
            icon: '⚡',
            tag: 'Catalyst',
            cardClassName: 'border-amber-100 bg-amber-50/10 hover:border-amber-200/50',
            tagClassName: 'bg-amber-100 text-amber-800 border border-amber-200/30',
            iconContainerClassName: 'bg-amber-100 text-amber-600',
            buttonClassName: 'bg-[#F97316] text-white hover:bg-[#EA580C] shadow-md'
        },
        {
            id: 'i10',
            title: 'Accelerator',
            targetValue: 10,
            points: 70,
            icon: '🚀',
            tag: 'Accelerator',
            cardClassName: 'border-indigo-100 bg-indigo-50/10 hover:border-indigo-200/50',
            tagClassName: 'bg-indigo-50 text-indigo-700 border border-indigo-100/40',
            iconContainerClassName: 'bg-indigo-100/60 text-indigo-600',
            buttonClassName: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
        },
        {
            id: 'i20',
            title: 'Architect',
            targetValue: 20,
            points: 150,
            icon: '🧠',
            tag: 'Architect',
            cardClassName: 'border-purple-100 bg-purple-50/10 hover:border-purple-200/50',
            tagClassName: 'bg-purple-50 text-purple-700 border border-purple-100/40',
            iconContainerClassName: 'bg-purple-100/60 text-purple-600',
            buttonClassName: 'bg-purple-600 text-white hover:bg-purple-700 shadow-md'
        },
        {
            id: 'i30',
            title: 'Inner Circle',
            targetValue: 30,
            points: 250,
            icon: '👑',
            tag: 'Inner Circle',
            cardClassName: 'border-yellow-250 bg-yellow-50/10 hover:border-yellow-300/80 ring-1 ring-yellow-500/5',
            tagClassName: 'bg-yellow-100 text-yellow-800 border border-yellow-200/30',
            iconContainerClassName: 'bg-yellow-105 text-yellow-600',
            buttonClassName: 'bg-[#0E7850] text-[#FFFFFF] hover:bg-[#0A5D3E] shadow-md shadow-[#0E7850]/10'
        }
    ];

    const activeCards = useMemo(() => {
        return impactCards.filter(card => !claimedIds.includes(card.id));
    }, [claimedIds, peopleHelped]);

    const handleShareSprint = (sprintId: string) => {
        const shareUrl = `https://${window.location.host}/sprint/${sprintId}?ref=${p.referralCode}`;
        navigator.clipboard.writeText(shareUrl)
            .then(() => toast.success('Sprint invite link copied!'))
            .catch(() => toast.error('Failed to copy link.'));
    };

    const SectionLabel = ({ text }: { text: string }) => (
        <h2 className="text-[7px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2 px-1">{text}</h2>
    );

    return (
        <div className="bg-[#FDFDFD] h-screen w-full font-sans overflow-hidden flex flex-col animate-fade-in">
            {/* COMPACT HEADER */}
            <header className="flex-shrink-0 bg-white border-b border-gray-50 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/profile')} className="p-2 -ml-2 text-gray-300 hover:text-primary transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-sm font-black text-gray-900 tracking-tight leading-none italic">Impact</h1>
                </div>
                <div className="text-right">
                    <p className="text-[7px] font-black text-gray-300 uppercase tracking-widest">Code</p>
                    <p className="text-[10px] font-bold text-gray-400">{p.referralCode}</p>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
                
                {/* START YOUR IMPACT HEADER SECTION */}
                <div className="mb-6 mt-2 animate-fade-in px-1">
                    <h1 className="text-5xl font-black tracking-tighter leading-[0.9] mb-4 text-gray-900">
                        Start your<br/>
                        <span className="text-primary italic">Impact</span>
                    </h1>
                </div>

                {/* CURRENT IMPACT SCORECARD */}
                <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm mb-6 flex items-center justify-between">
                    <div>
                        {claimedIds.length === 0 ? (
                            <>
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">
                                    Invite someone to start their growth journey today
                                </p>
                                <h2 className="text-lg font-black text-gray-950 tracking-tight leading-snug">
                                    Don't grow alone, bring others along.
                                </h2>
                            </>
                        ) : (
                            <>
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Current Reading</p>
                                <h2 className="text-3xl font-black text-gray-950 tracking-tight leading-none">
                                    {peopleHelped} <span className="text-primary italic font-normal">lives impacted</span>
                                </h2>
                            </>
                        )}
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 text-[#0E7850] rounded-2xl flex items-center justify-center text-xl shadow-inner">
                        🌍
                    </div>
                </div>

                {/* SIDEWAYS SWIPING COIN REWARD CARDS */}
                <div className="relative w-full overflow-hidden pt-8">
                    <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory px-1 pb-4 scroll-smooth">
                        {activeCards.length > 0 ? (
                            activeCards.map((card) => {
                                const isUnlocked = peopleHelped >= card.targetValue;
                                const progress = Math.min(100, (peopleHelped / card.targetValue) * 100);
                                const remaining = card.targetValue - peopleHelped;

                                // Descriptive Text
                                let descriptionText = "";
                                if (isUnlocked) {
                                    descriptionText = `Ready to claim your ${card.points} coin reward!`;
                                } else {
                                    if (card.id === 'i1') {
                                        descriptionText = `${remaining} referral needed to claim +${card.points} Coins.`;
                                    } else {
                                        descriptionText = `${remaining} ${remaining === 1 ? 'referral' : 'referrals'} needed to claim +${card.points} Coins.`;
                                    }
                                }

                                return (
                                    <div 
                                        key={card.id}
                                        className={`group relative bg-white border-2 rounded-3xl transition-all duration-300 animate-fade-in flex-shrink-0 w-[82vw] sm:w-[320px] snap-center flex flex-col justify-between p-5 min-h-[225px] ${card.cardClassName}`}
                                    >
                                        <div className={`absolute -top-3 right-6 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md ${card.tagClassName}`}>
                                            {card.tag}
                                        </div>

                                        <div className="flex flex-col">
                                            {/* Upper Section */}
                                            <div className="flex items-start gap-4">
                                                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${card.iconContainerClassName}`}>
                                                    <span className="text-xl">{card.icon}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-base sm:text-lg font-black tracking-tight leading-none mb-1 text-gray-900 uppercase">
                                                        {card.title}
                                                    </h3>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-[#0E7850]">
                                                        {card.points} Coins
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Progress / Goal Slider */}
                                            <div className="mt-4">
                                                <div className="flex justify-between items-end mb-1.5">
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                        {isUnlocked ? 'Goal Met' : `Progress: ${peopleHelped}/${card.targetValue}`}
                                                    </span>
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                        Reward: +{card.points}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 bg-gray-50 border border-gray-100/50 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ${isUnlocked ? 'bg-[#0E7850]' : 'bg-amber-400'}`}
                                                        style={{ width: `${progress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Lower Section Action & Note */}
                                        <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between gap-4">
                                            <span className="text-[10px] sm:text-xs text-gray-500 font-bold leading-normal flex-1">
                                                {descriptionText}
                                            </span>
                                            
                                            {isUnlocked ? (
                                                <button 
                                                    disabled={claimingId !== null}
                                                    onClick={() => handleClaimMilestone(card.id, card.points)}
                                                    className={`px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shrink-0 ${card.buttonClassName}`}
                                                >
                                                    {claimingId === card.id ? (
                                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    ) : 'Claim'}
                                                </button>
                                            ) : (
                                                <span className="bg-gray-50 text-gray-300 text-[8px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shrink-0 border border-gray-100">
                                                    Locked
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="w-full flex-shrink-0 bg-white border border-gray-100 rounded-3xl p-6 text-center shadow-sm py-10">
                                <span className="text-4xl mb-2 block font-normal leading-none">🎖️</span>
                                <p className="text-xs font-black text-gray-900 mb-1 leading-none uppercase">All Rewards Collected</p>
                                <p className="text-[9.5px] text-gray-400 font-bold max-w-[280px] mx-auto leading-normal">
                                    You have successfully achieved all milestone badges! Your community reach continues to unlock new heights.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ENROLLED SPRINTS */}
                <section>
                    <SectionLabel text="My Sprints" />
                    <div className="flex flex-col gap-3">
                        {enrolledSprints.length > 0 ? (
                            enrolledSprints.map(({ sprint, enrollment }) => (
                                <div key={enrollment.id} className="flex bg-white rounded-2xl p-3 border border-gray-100 shadow-sm items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden">
                                        <img src={sprint.coverImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(sprint.title)}&background=0E7850&color=fff`} alt={sprint.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-gray-900 truncate">{sprint.title}</p>
                                        <p className="text-[9px] font-bold text-gray-400 capitalize">{enrollment.status}</p>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <button
                                            onClick={() => handleShareSprint(sprint.id || '')}
                                            className="p-2.5 bg-gray-50 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors"
                                            title="Copy Link"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                        <a
                                            href={`https://wa.me/?text=${encodeURIComponent(
                                                `Hey! Join me on this sprint: *${sprint.title}*\n\n_${sprint.description || ''}_\n\nCheck it out and register here: https://${window.location.host}/sprint/${sprint.id}?ref=${p.referralCode}`
                                            )}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2.5 bg-emerald-50 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100/50 rounded-xl transition-colors flex items-center justify-center"
                                            title="Share on WhatsApp"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                        </a>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center">
                                <p className="text-xs font-bold text-gray-400 mb-1">No Sprints Yet</p>
                                <p className="text-[10px] text-gray-400 mb-4 max-w-[200px]">Enroll in a sprint to share it with your community and track your impact.</p>
                                <button
                                    onClick={() => navigate('/explore')}
                                    className="px-6 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-primary hover:border-primary/30 transition-all"
                                >
                                    Discover Sprints
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* THE RIPPLE EFFECT AND LEADERBOARD */}
                <section>
                    <SectionLabel text="The Ripple Effect" />
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 mb-4">
                        {referrals.length > 0 ? (
                            referrals.map((ref) => {
                                const isStarted = ref.status === 'started_sprint';
                                return (
                                    <div key={ref.id} className="flex-shrink-0 w-48 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gray-50 flex-shrink-0 overflow-hidden">
                                            <img 
                                                src={ref.refereeAvatar || `https://ui-avatars.com/api/?name=${ref.refereeName}&background=0E7850&color=fff`} 
                                                className="w-full h-full object-cover" 
                                                referrerPolicy="no-referrer"
                                                alt="Avatar"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-black text-gray-900 truncate">{ref.refereeName}</p>
                                            <p className="text-[8px] font-black text-[#0E7850] uppercase tracking-widest truncate leading-tight mt-0.5">
                                                {isStarted ? 'Start First Sprint' : 'Joined'}
                                            </p>
                                            <p className="text-[7.5px] text-gray-400 font-bold truncate leading-none mt-0.5">
                                                {isStarted ? `${ref.refereeName} started first sprint` : `${ref.refereeName} Joined via your link`}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="w-full py-4 text-center text-gray-300 italic text-[9px] bg-gray-50/50 rounded-2xl border border-dashed border-gray-100 leading-normal">
                                No direct invitations yet. Build your ripple effect today.
                            </div>
                        )}
                    </div>
                </section>

                <footer className="text-center pt-4">
                    <p className="text-[7px] font-black text-gray-200 uppercase tracking-[0.4em]">Vectorise • Catalyst v4.2</p>
                </footer>
            </main>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.03); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default ImpactDashboard;