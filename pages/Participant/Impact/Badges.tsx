import React, { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Participant, ParticipantSprint, ShinePost, Sprint } from '../../../types';
import { sprintService } from '../../../services/sprintService';
import { shineService } from '../../../services/shineService';
import { userService, sanitizeData } from '../../../services/userService';

import { MILESTONES, MilestoneDefinition } from '../../../services/milestoneConstants';

interface Milestone extends MilestoneDefinition {
    currentValue: number;
    isUnlocked: boolean;
    isClaimed: boolean;
}

const MilestoneCard: React.FC<{ milestone: Milestone; onClaim: (m: Milestone) => void }> = ({ milestone, onClaim }) => {
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
    const [isLoading, setIsLoading] = useState(true);

    // Expansion states for each badge category
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);

        const unsubscribes: (() => void)[] = [];

        const sub1 = sprintService.subscribeToUserEnrollments(user.id, (enrollments) => {
            const sanitizedEnrollments = enrollments.map(e => sanitizeData(e));
            setEnrollments(sanitizedEnrollments);
            const sprintIds = Array.from(new Set(sanitizedEnrollments.map(e => e.sprint_id)));
            Promise.all(sprintIds.map(id => sprintService.getSprintById(id)))
                .then(sprints => setAllSprintData(sprints.filter((s): s is Sprint => s !== null).map(s => sanitizeData(s))));
        });
        unsubscribes.push(sub1);

        const sub2 = shineService.subscribeToPosts((posts: ShinePost[]) => {
            const sanitizedPosts = posts.map(p => sanitizeData(p));
            setReflections(sanitizedPosts.filter(p => p.userId === user.id));
        });
        unsubscribes.push(sub2);

        setIsLoading(false);

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
        const peopleHelped = p.impactStats?.peopleHelped || 0;
        return { started: enrollments.length, completed: completedSprints.length, completedPaid: completedPaidSprintsCount, finishedEarly: finishedEarlyCount, reflectionsCount: reflections.length, meaningfulReflections: reflections.filter(r => r.content.trim().length > 50).length, daysActive: daysSinceJoin, streak: streak, peopleHelped: peopleHelped };
    }, [user, enrollments, reflections, allSprintData]);

    const milestonesByType = useMemo(() => {
        if (!stats || !user) return { coreProgress: [], longGame: [], innerWork: [], influence: [] };
        const p = user as Participant;
        const claimed = p.claimedMilestoneIds || [];
        
        const getStatValue = (id: string) => {
            switch(id) {
                case 's1': return stats.started;
                case 's2': return stats.completed;
                case 's4': return stats.completed;
                case 'cm1': return stats.daysActive;
                case 'cm2': return stats.daysActive;
                case 'r1': return stats.meaningfulReflections;
                case 'r2': return stats.meaningfulReflections;
                case 'i1': return stats.peopleHelped;
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

    const handleClaim = async (m: Milestone) => {
        if (!user) return;
        try {
            await userService.claimMilestone(user.id, m.id, m.points);
            userService.queueNotification('success', `Claimed! +${m.points} Coins added to your wallet.`, {
                description: `Milestone: ${m.title}`,
                duration: 3000
            });
        } catch (err) {
            userService.queueNotification('error', "Failed to claim credits.", { duration: 3000 });
        }
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
                    {visibleMilestones.map(m => <MilestoneCard key={m.id} milestone={m} onClaim={handleClaim} />)}
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
                    <CategorySection title="Core Progress" type="coreProgress" milestones={milestonesByType.coreProgress} color="primary" />
                    <CategorySection title="Long Game" type="longGame" milestones={milestonesByType.longGame} color="blue" />
                    <CategorySection title="Inner Work" type="innerWork" milestones={milestonesByType.innerWork} color="yellow" />
                    <CategorySection title="Influence" type="influence" milestones={milestonesByType.influence} color="teal" />
                </div>
            )}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
};


export default Badges;
