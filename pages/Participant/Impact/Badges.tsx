import React, { useMemo, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Participant, ParticipantSprint, ShinePost, Sprint } from '../../../types';
import { sprintService } from '../../../services/sprintService';
import { shineService } from '../../../services/shineService';
import { userService, sanitizeData } from '../../../services/userService';
import { db } from '../../../services/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Share2 } from 'lucide-react';
import AchievementShareModal from '../../../components/AchievementShareModal';
import { motion } from 'motion/react';

import { MILESTONES, MilestoneDefinition } from '../../../services/milestoneConstants';

interface Milestone extends MilestoneDefinition {
    currentValue: number;
    isUnlocked: boolean;
    isClaimed: boolean;
}

const MilestoneCard: React.FC<{ 
    milestone: Milestone; 
    onClaim: (m: Milestone) => void;
    onShare: (m: Milestone) => void;
}> = ({ milestone, onClaim, onShare }) => {
    const progress = Math.min(100, (milestone.currentValue / milestone.targetValue) * 100);
    const [isClaiming, setIsClaiming] = useState(false);

    const handleClaim = async () => {
        setIsClaiming(true);
        try {
            await onClaim(milestone);
        } finally {
            setIsClaiming(false);
        }
    };
    
    const colorClass = milestone.color || 'primary';
    const accentColor = colorClass === 'primary' ? 'rgba(14, 120, 80, 0.4)' : 
                       colorClass === 'teal' ? 'rgba(20, 184, 166, 0.4)' : 
                       colorClass === 'orange' ? 'rgba(249, 115, 22, 0.4)' : 
                       colorClass === 'indigo' ? 'rgba(79, 70, 229, 0.4)' :
                       colorClass === 'amber' ? 'rgba(245, 158, 11, 0.4)' :
                       colorClass === 'blue' ? 'rgba(59, 130, 246, 0.4)' :
                       colorClass === 'yellow' ? 'rgba(234, 179, 8, 0.4)' :
                       'rgba(14, 120, 80, 0.4)';

    return (
        <div className={`p-5 rounded-2xl border transition-all duration-500 relative overflow-hidden group animate-fade-in ${
            milestone.isUnlocked 
            ? `bg-white border-${colorClass}/20 shadow-md ring-1 ring-${colorClass}/5` 
            : 'bg-gray-50/50 border-gray-100 opacity-80'
        }`}>
            <div className="flex items-start gap-4 mb-4 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform duration-500 ${
                    milestone.isUnlocked ? `bg-${colorClass}/10 text-${colorClass} scale-110 shadow-inner` : 'bg-gray-100 text-gray-300 grayscale'
                }`}>
                    {milestone.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-black text-gray-900 text-sm uppercase tracking-tight truncate" style={{fontStyle: 'normal'}}>{milestone.title}</h3>
                        {milestone.isClaimed && (
                            <span className="bg-gray-100 text-gray-400 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Collected</span>
                        )}
                        {milestone.isUnlocked && !milestone.isClaimed && (
                            <span className={`bg-${colorClass} text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse`}>Ready</span>
                        )}
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium leading-tight line-clamp-2">{milestone.description}</p>
                </div>
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        {milestone.isUnlocked ? 'Requirement Met' : `Progress: ${milestone.currentValue.toFixed(0)}/${milestone.targetValue}`}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${milestone.isUnlocked && !milestone.isClaimed ? `text-${colorClass}` : 'text-gray-400'}`}>
                        {milestone.isClaimed ? 'Awarded' : `+${milestone.points} Credits`}
                    </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${milestone.isUnlocked ? (milestone.isClaimed ? 'bg-gray-400' : `bg-${colorClass} shadow-[0_0_8px_${accentColor}]`) : 'bg-gray-300'}`}
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                {milestone.isUnlocked && !milestone.isClaimed && (
                    <button 
                        onClick={handleClaim}
                        disabled={isClaiming}
                        className={`w-full py-2.5 bg-${colorClass} text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-90 transition-all active:scale-95 shadow-lg shadow-${colorClass}/20 flex items-center justify-center gap-2 disabled:opacity-50`}
                    >
                        {isClaiming ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : 'Claim Credits'}
                    </button>
                )}

                {/* Disabled but code preserved */}
                {false && milestone.isClaimed && (
                    <button 
                        onClick={() => onShare(milestone)}
                        className={`w-full py-2 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-500 hover:text-gray-700 dark:text-gray-300 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-gray-100 dark:border-zinc-700`}
                    >
                        <Share2 className="w-3.5 h-3.5" /> Share Achievement
                    </button>
                )}
            </div>

            {milestone.isUnlocked && !milestone.isClaimed && (
                <div className={`absolute top-0 right-0 w-24 h-24 bg-${colorClass}/5 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none animate-pulse`}></div>
            )}
        </div>
    );
};

const Badges: React.FC = () => {
    const { user, updateProfile } = useAuth();
    const navigate = useNavigate();
    const [enrollments, setEnrollments] = useState<ParticipantSprint[]>([]);
    const [allSprintData, setAllSprintData] = useState<Sprint[]>([]);
    const [reflections, setReflections] = useState<ShinePost[]>([]);
    const [referrals, setReferrals] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Achievement Share Modal Integration
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [selectedShareMilestone, setSelectedShareMilestone] = useState<{
        id: string;
        title: string;
        points: number;
    } | null>(null);

    // Expansion states for each badge category
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    const carouselRef = useRef<HTMLDivElement>(null);
    const [dragWidth, setDragWidth] = useState(0);

    // Track when data updates, or when screen resizes, to dynamically update horizontal drag bounds
    useEffect(() => {
        const updateWidth = () => {
            if (carouselRef.current) {
                const scrollWidth = carouselRef.current.scrollWidth;
                const offsetWidth = carouselRef.current.offsetWidth;
                setDragWidth(Math.max(0, scrollWidth - offsetWidth));
            }
        };

        const timer = setTimeout(updateWidth, 300); // Small delay to let cards render first

        window.addEventListener('resize', updateWidth);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateWidth);
        };
    }, [enrollments, allSprintData, reflections, isLoading]);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);

        const unsubscribes: (() => void)[] = [];

        let enrollmentsSubscribed = false;
        let reflectionsSubscribed = false;
        let referralsSubscribed = false;

        const checkLoading = () => {
            if (enrollmentsSubscribed && reflectionsSubscribed && referralsSubscribed) {
                setIsLoading(false);
            }
        };

        const sub1 = sprintService.subscribeToUserEnrollments(user.id, async (enrollments) => {
            try {
                const sanitizedEnrollments = enrollments.map(e => sanitizeData(e));
                setEnrollments(sanitizedEnrollments);
                const sprintIds = Array.from(new Set(sanitizedEnrollments.map(e => e.sprint_id)));
                const sprints = await Promise.all(sprintIds.map(id => sprintService.getSprintById(id)));
                setAllSprintData(sprints.filter((s): s is Sprint => s !== null).map(s => sanitizeData(s)));
            } finally {
                enrollmentsSubscribed = true;
                checkLoading();
            }
        });
        unsubscribes.push(sub1);

        const sub2 = shineService.subscribeToPosts((posts: ShinePost[]) => {
            const sanitizedPosts = posts.map(p => sanitizeData(p));
            setReflections(sanitizedPosts.filter(p => p.userId === user.id));
            reflectionsSubscribed = true;
            checkLoading();
        });
        unsubscribes.push(sub2);

        // Subscribe to referrals subcollection
        const qRef = query(collection(db, 'users', user.id, 'referrals'));
        const sub3 = onSnapshot(qRef, (snap) => {
            setReferrals(snap.docs.map(d => sanitizeData({ id: d.id, ...d.data() })));
            referralsSubscribed = true;
            checkLoading();
        }, (error) => {
            console.error("Error subscribing to referrals: ", error);
            referralsSubscribed = true;
            checkLoading();
        });
        unsubscribes.push(sub3);


        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [user?.id]);

    const stats = useMemo(() => {
        if (!user) return null;
        const p = user as Participant;
        const completedSprints = enrollments.filter(e => e.progress.every(day => day.completed));
        const completedPaidSprintsCount = completedSprints.filter(e => {
            const s = allSprintData.find(ms => ms.id === e.sprint_id);
            return s?.pricingType === 'cash' || (s?.price && s.price > 0);
        }).length;
        const finishedEarlyCount = completedSprints.filter(e => {
            const lastTask = [...e.progress].sort((a,b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())[0];
            if (!lastTask || !lastTask.completedAt) return false;
            const diffDays = (new Date(lastTask.completedAt).getTime() - new Date(e.started_at).getTime()) / (1000 * 60 * 60 * 24);
            return diffDays < (e.progress.length - 1);
        }).length;
        const daysSinceJoin = Math.max(1, Math.ceil((Date.now() - new Date(p.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)));
        const streak = p.impactStats?.streak || 0;
        const peopleHelped = referrals.length;

        // Calculate unique days with task completion
        const allCompletedDates = enrollments.flatMap(e => 
            e.progress
                .filter(day => day.completed && day.completedAt)
                .map(day => new Date(day.completedAt!).toDateString())
        );
        const totalTaskDays = new Set(allCompletedDates).size;

        return { 
            started: enrollments.length, 
            completed: completedSprints.length, 
            completedPaid: completedPaidSprintsCount, 
            finishedEarly: finishedEarlyCount, 
            reflectionsCount: reflections.length, 
            meaningfulReflections: reflections.filter(r => r.content.trim().length > 50).length, 
            daysActive: daysSinceJoin, 
            streak: streak, 
            peopleHelped: peopleHelped,
            totalTaskDays
        };
    }, [user, enrollments, reflections, allSprintData]);

    const milestonesByType = useMemo(() => {
        if (!stats || !user) return { coreProgress: [], longGame: [], innerWork: [], influence: [] };
        const p = user as Participant;
        const claimed = p.claimedMilestoneIds || [];
        
        const getStatValue = (id: string) => {
            switch(id) {
                case 'first_leap': return enrollments.reduce((sum, e) => sum + e.progress.filter(day => day.completed).length, 0);
                case 's2': return stats.completed;
                case 's4': return stats.totalTaskDays;
                case 'cm1': return stats.totalTaskDays;
                case 'cm2': return stats.totalTaskDays;
                case 'r1': return stats.meaningfulReflections;
                case 'r2': return stats.meaningfulReflections;
                case 'i1': return stats.peopleHelped;
                case 'i3': return stats.peopleHelped;
                case 'i5': return stats.peopleHelped;
                case 'i10': return stats.peopleHelped;
                default: return 0;
            }
        };

        const result: Record<string, Milestone[]> = { coreProgress: [], longGame: [], innerWork: [], influence: [] };
        
        MILESTONES.forEach(m => {
            const milestone: Milestone = {
                ...m,
                currentValue: getStatValue(m.id),
                isUnlocked: getStatValue(m.id) >= m.targetValue,
                isClaimed: claimed.includes(m.id)
            };
            result[m.category].push(milestone);
        });

        return result;
    }, [stats, user]);

    const categoryProgressData = useMemo(() => {
        if (!stats || !user) return [];

        const categories = [
            { key: 'coreProgress', label: 'Core Progress', color: 'primary', icon: '⚡' },
            { key: 'longGame', label: 'Long Game', color: 'blue', icon: '⏳' },
            { key: 'innerWork', label: 'Inner Work', color: 'yellow', icon: '💎' },
            { key: 'influence', label: 'Influence', color: 'teal', icon: '🌱' }
        ];

        return categories.map(cat => {
            const list = milestonesByType[cat.key] || [];
            // Sort list by targetValue ascending
            const sorted = [...list].sort((a, b) => a.targetValue - b.targetValue);
            const next = sorted.find(m => !m.isUnlocked);
            
            if (next) {
                const percent = Math.min(100, (next.currentValue / next.targetValue) * 100);
                const remaining = Math.max(0, next.targetValue - next.currentValue);
                // Plural vs singular labels
                let unitName = 'items';
                if (cat.key === 'coreProgress') {
                    unitName = next.id === 's2' ? 'sprint' : 'tasks';
                } else if (cat.key === 'longGame') {
                    unitName = 'tasks';
                } else if (cat.key === 'innerWork') {
                    unitName = 'reflections';
                } else if (cat.key === 'influence') {
                    unitName = 'referrals';
                }

                return {
                    category: cat.label,
                    key: cat.key,
                    color: cat.color,
                    hasMilestone: true,
                    title: next.title,
                    icon: next.icon,
                    current: next.currentValue,
                    target: next.targetValue,
                    percent,
                    remaining,
                    unitName,
                    isAllCompleted: false
                };
            } else {
                // All unlocked in this category!
                const highest = sorted[sorted.length - 1];
                return {
                    category: cat.label,
                    key: cat.key,
                    color: cat.color,
                    hasMilestone: highest ? true : false,
                    title: 'All Unlocked',
                    icon: '👑',
                    current: highest ? highest.currentValue : 0,
                    target: highest ? highest.targetValue : 0,
                    percent: 100,
                    remaining: 0,
                    unitName: 'items',
                    isAllCompleted: true
                };
            }
        });
    }, [milestonesByType, stats, user]);

    const handleClaim = async (m: Milestone) => {
        if (!user) return;
        try {
            await userService.claimMilestone(user.id, m.id, m.points);
            userService.queueNotification('success', `Claimed! +${m.points} Coins added to your wallet.`, {
                description: `Milestone: ${m.title}`,
                duration: 3000
            });
            // Automatically launch achievement share popup
            setSelectedShareMilestone({
                id: m.id,
                title: m.title,
                points: m.points
            });
            setShareModalOpen(true);
        } catch (err) {
            userService.queueNotification('error', "Failed to claim credits.", { duration: 3000 });
        }
    };

    const handleShare = (m: Milestone) => {
        setSelectedShareMilestone({
            id: m.id,
            title: m.title,
            points: m.points
        });
        setShareModalOpen(true);
    };

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    if (!user) return null;

    const CategorySection = ({ title, type, milestones, color }: { title: string, type: string, milestones: Milestone[], color: string }) => {
        if (milestones.length === 0) return null;
        const isExpanded = expandedCategories[type] || false;
        const visibleMilestones = isExpanded ? milestones : milestones.slice(0, 3);

        return (
            <section className="animate-fade-in">
                <div className="flex items-center gap-3 mb-8">
                    <div className={`w-1.5 h-6 bg-${color}-500 rounded-full`}></div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest">{title}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleMilestones.map(m => (
                        <MilestoneCard 
                            key={m.id} 
                            milestone={m} 
                            onClaim={handleClaim} 
                            onShare={handleShare} 
                        />
                    ))}
                </div>
                {milestones.length > 3 && (
                    <button 
                        onClick={() => toggleCategory(type)}
                        className="mt-6 w-full py-4 bg-white hover:bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px] rounded-xl transition-all border border-gray-100 active:scale-95 shadow-sm"
                    >
                        {isExpanded ? `Collapse ${title}` : `See More (${milestones.length - 3} Hidden)`}
                    </button>
                )}
            </section>
        );
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-32 animate-fade-in bg-[#FAFAFA]">
            <div className="mb-12">
                <button onClick={() => navigate('/profile')} className="group flex items-center text-gray-400 hover:text-primary transition-colors mb-6 text-xs font-black uppercase tracking-widest"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>My Profile</button>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2">The Hall of Rise.</h1>
                        <p className="text-gray-500 font-medium text-sm">Your progress matters. Claim credits as you hit milestones.</p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border border-gray-100 shadow-sm">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Syncing Milestones...</p>
                </div>
            ) : (
                <div className="space-y-16">
                    {/* Category Milestones Summary Dashboard */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-100/80 shadow-sm p-6 sm:p-8 animate-fade-in overflow-hidden">
                        <div className="mb-6 flex justify-between items-center">
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                🎯 QUICK ROADMAP TO NEXT MILESTONES
                            </h3>
                            <span className="text-[8px] font-black tracking-widest uppercase text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full select-none">
                                Swipe / Drag
                            </span>
                        </div>
                        <motion.div 
                            ref={carouselRef}
                            className="overflow-hidden select-none cursor-grab active:cursor-grabbing"
                            style={{ touchAction: 'pan-y' }}
                            whileTap={{ cursor: 'grabbing' }}
                        >
                            <motion.div
                                drag="x"
                                dragConstraints={{ right: 0, left: -dragWidth }}
                                dragElastic={0.15}
                                className="flex gap-4 pb-4"
                            >
                                {categoryProgressData.map((data, idx) => {
                                    const barColorClass = data.color === 'primary' ? 'bg-primary' : 
                                                        data.color === 'blue' ? 'bg-blue-600' : 
                                                        data.color === 'yellow' ? 'bg-yellow-500' : 
                                                        data.color === 'teal' ? 'bg-teal-500' : 'bg-primary';

                                    const textAccentClass = data.color === 'primary' ? 'text-primary' : 
                                                          data.color === 'blue' ? 'text-blue-600' : 
                                                          data.color === 'yellow' ? 'text-yellow-600' : 
                                                          data.color === 'teal' ? 'text-teal-600' : 'text-primary';

                                    return (
                                        <motion.div 
                                            key={idx} 
                                            className="p-5 rounded-2xl bg-[#FAFAFA]/70 border border-gray-100 hover:border-gray-200/80 transition-all flex flex-col justify-between group flex-shrink-0 w-[78vw] sm:w-[240px] min-h-[180px]"
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-[9px] font-black tracking-widest uppercase text-gray-400">
                                                        {data.category}
                                                    </span>
                                                    <span className="text-xl group-hover:scale-110 transition-transform duration-300">
                                                        {data.icon}
                                                    </span>
                                                </div>
                                                
                                                <div className="mb-4">
                                                    <h4 className="font-black text-gray-900 text-xs truncate uppercase tracking-tight">
                                                        {data.title}
                                                    </h4>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                                                        {data.isAllCompleted 
                                                            ? 'All Milestones Met!' 
                                                            : `${data.remaining.toFixed(0)} more ${data.unitName}`
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-2">
                                                <div className="flex justify-between items-center mb-1.5 text-[9px] font-black text-gray-700 font-mono">
                                                    <span>{data.current.toFixed(0)} / {data.target}</span>
                                                    <span className={textAccentClass}>{data.percent.toFixed(0)}%</span>
                                                </div>
                                                <div className="h-1.5 bg-gray-200/60 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${barColorClass}`}
                                                        style={{ width: `${data.percent}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </motion.div>
                    </div>

                    <CategorySection title="Core Progress" type="coreProgress" milestones={milestonesByType.coreProgress} color="primary" />
                    <CategorySection title="Long Game" type="longGame" milestones={milestonesByType.longGame} color="blue" />
                    <CategorySection title="Inner Work" type="innerWork" milestones={milestonesByType.innerWork} color="yellow" />
                    <CategorySection title="Influence" type="influence" milestones={milestonesByType.influence} color="teal" />
                </div>
            )}

            {/* Achievement Share Popup Integration */}
            {selectedShareMilestone && (
                <AchievementShareModal
                    isOpen={shareModalOpen}
                    onClose={() => {
                        setShareModalOpen(false);
                        setSelectedShareMilestone(null);
                    }}
                    milestoneId={selectedShareMilestone.id}
                    milestoneTitle={selectedShareMilestone.title}
                    points={selectedShareMilestone.points}
                />
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};


export default Badges;
