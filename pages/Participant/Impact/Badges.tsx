import React, { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Participant, ParticipantSprint, ShinePost, Sprint } from '../../../types';
import { sprintService } from '../../../services/sprintService';
import { shineService } from '../../../services/shineService';
import { userService, sanitizeData } from '../../../services/userService';

import { MILESTONES, MilestoneDefinition } from '../../../services/milestoneConstants';
import { Share2, Download, Copy, Check, ChevronLeft, Sparkles, X } from 'lucide-react';

interface Milestone extends MilestoneDefinition {
    currentValue: number;
    isUnlocked: boolean;
    isClaimed: boolean;
}

// Custom milestone share modal for premium social card sharing
const MilestoneShareModal: React.FC<{
    milestone: Milestone;
    userName: string;
    onClose: () => void;
}> = ({ milestone, userName, onClose }) => {
    const [shareImage, setShareImage] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [canvasError, setCanvasError] = useState(false);

    useEffect(() => {
        let active = true;
        const drawCanvas = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1080;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const bgImg = new Image();
            bgImg.crossOrigin = 'anonymous';
            bgImg.src = '/achievement-bg.png';
            
            const drawContent = () => {
                if (!active) return;
                // Base background fallback gradient
                const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
                grad.addColorStop(0, '#040d0a');
                grad.addColorStop(0.5, '#081711');
                grad.addColorStop(1, '#0e261d');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, 1080, 1080);

                // Draw background image if loaded, handling potential cross-origin failure safely
                try {
                    if (bgImg.complete && bgImg.naturalWidth > 0) {
                        ctx.drawImage(bgImg, 0, 0, 1080, 1080);
                    }
                } catch(e) {
                    console.warn("CORS or Image loading error, falling back to gradient", e);
                }

                // Add dark glassmorphic center container to make all texts perfectly legible
                ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                ctx.fillRect(0, 0, 1080, 1080);

                // Design Grid lines
                ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
                ctx.lineWidth = 1;
                for (let i = 100; i < 1080; i += 100) {
                    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1080); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1080, i); ctx.stroke();
                }

                // Elegant Inner Border
                ctx.strokeStyle = 'rgba(14, 120, 80, 0.3)';
                ctx.lineWidth = 4;
                ctx.strokeRect(60, 60, 960, 960);

                // Corner gold ornamentation tabs
                ctx.strokeStyle = '#FCD34D';
                ctx.lineWidth = 6;
                const markerLength = 40;
                // TL
                ctx.beginPath(); ctx.moveTo(60, 60 + markerLength); ctx.lineTo(60, 60); ctx.lineTo(60 + markerLength, 60); ctx.stroke();
                // TR
                ctx.beginPath(); ctx.moveTo(1020, 60 + markerLength); ctx.lineTo(1020, 60); ctx.lineTo(1020 - markerLength, 60); ctx.stroke();
                // BL
                ctx.beginPath(); ctx.moveTo(60, 1020 - markerLength); ctx.lineTo(60, 1020); ctx.lineTo(60 + markerLength, 1020); ctx.stroke();
                // BR
                ctx.beginPath(); ctx.moveTo(1020, 1020 - markerLength); ctx.lineTo(1020, 1020); ctx.lineTo(1020 - markerLength, 1020); ctx.stroke();

                // Vectorise watermark wordmark
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.font = 'bold 36px Jost, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('V E C T O R I S E', 540, 180);

                // Branded category text watermark
                ctx.fillStyle = '#10B981';
                ctx.font = 'bold 20px ui-monospace, monospace';
                ctx.fillText('⚡ PERSONAL GROWTH MILESTONE ⚡', 540, 240);

                // Name title intro
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.font = 'bold 24px ui-monospace, monospace';
                ctx.fillText('A C H I E V E M E N T   B Y', 540, 380);

                ctx.fillStyle = '#FFFFFF';
                // Extremely bold display typography for username
                ctx.font = '900 64px Jost, sans-serif';
                ctx.fillText(userName, 540, 450);

                // Gold separator
                ctx.fillStyle = '#FCD34D';
                ctx.fillRect(490, 490, 100, 4);

                // Dynamic text wrapping for the creative achievement
                const achievementVal = milestone.id === 's2' 
                    ? "I completed my first sprint on Vectorise" 
                    : `I unlocked "${milestone.title}" on Vectorise!`;

                ctx.fillStyle = '#FFFFFF';
                // Very creative and bold display italic typography for the achievement content
                ctx.font = '900 italic 52px Jost, sans-serif';
                
                const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
                    const words = text.split(' ');
                    let line = '';
                    const lines = [];
                    for (let n = 0; n < words.length; n++) {
                        let testLine = line + words[n] + ' ';
                        let metrics = ctx.measureText(testLine);
                        if (metrics.width > maxWidth && n > 0) {
                            lines.push(line);
                            line = words[n] + ' ';
                        } else {
                            line = testLine;
                        }
                    }
                    lines.push(line);
                    for (let i = 0; i < lines.length; i++) {
                        ctx.fillText(lines[i].trim(), x, y + (i * lineHeight));
                    }
                };

                wrapText(achievementVal, 540, 600, 800, 70);

                // Render Milestone Badge decoration shape
                ctx.fillStyle = 'rgba(14, 120, 80, 0.2)';
                ctx.strokeStyle = '#10B981';
                ctx.lineWidth = 2;
                const iconY = 820;
                ctx.beginPath();
                ctx.arc(540, iconY, 60, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 48px sans-serif';
                ctx.fillText(milestone.icon || '🏆', 540, iconY + 16);

                // Footer branding detail
                ctx.fillStyle = '#10B981';
                ctx.font = 'bold 22px ui-monospace, monospace';
                ctx.fillText('vectorise.app', 540, 950);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.font = 'italic 16px sans-serif';
                ctx.fillText('Incremental daily sprints compounding into high intensity personal transformation.', 540, 985);

                try {
                    const imgData = canvas.toDataURL('image/png');
                    setShareImage(imgData);
                } catch (e) {
                    console.error("Canvas export blocked", e);
                    setCanvasError(true);
                }
            };

            bgImg.onload = () => {
                drawContent();
            };
            bgImg.onerror = () => {
                drawContent();
            };
            
            if (bgImg.complete) {
                drawContent();
            } else {
                const timer = setTimeout(() => {
                    if (!shareImage) {
                        drawContent();
                    }
                }, 2000);
                return () => clearTimeout(timer);
            }
        };

        drawCanvas();
        return () => {
            active = false;
        };
    }, [milestone, userName]);

    const captionText = milestone.id === 's2'
        ? `⚡ I just completed my first sprint on Vectorise! "I completed my first sprint on Vectorise" 🚀 Building positive execution habits one sprint at a time. \n\nCheck out my profile and start compounding your daily growth! 💫\n\n#Vectorise #DailySprints #PersonalGrowth #HabitDesign`
        : `⚡ I just unlocked a new milestone in the Hall of Rise on Vectorise: "${milestone.title}"! 🏆 Building positive execution habits one day at a time. \n\nCheck out my profile and start compounding your daily growth! 💫\n\n#Vectorise #DailySprints #PersonalGrowth #HabitDesign`;

    const handleCopyCaption = () => {
        navigator.clipboard.writeText(captionText)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
    };

    const handleDownload = () => {
        if (!shareImage) return;
        const link = document.createElement('a');
        link.download = `vectorise_achievement_${milestone.id}.png`;
        link.href = shareImage;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in text-gray-900">
            <div className="bg-white dark:bg-zinc-950 rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden animate-slide-up flex flex-col transition-all duration-300">
                <div className="p-6 text-center flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-[#0E7850]" /> Share Achievement
                        </span>
                        <button 
                            onClick={onClose}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-805 rounded-full transition-colors text-gray-400 hover:text-gray-650 dark:hover:text-gray-200"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight italic mb-1">
                        Milestone Unlocked!
                    </h3>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mb-4">
                        Your personalized image card has been generated.
                    </p>

                    {/* Image Preview */}
                    <div className="relative rounded-[1.5rem] overflow-hidden border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 p-2 shadow-inner mb-4 flex items-center justify-center min-h-[220px]">
                        {shareImage ? (
                            <img 
                                src={shareImage} 
                                referrerPolicy="no-referrer"
                                alt="Achievement Preview" 
                                className="w-full aspect-square rounded-[1.2rem] object-contain shadow-md"
                            />
                        ) : canvasError ? (
                            <div className="text-center p-4">
                                <span className="text-sm font-bold text-red-500 block mb-1">Failed to Render</span>
                                <span className="text-[10px] text-gray-400">Due to browser restrictions, we couldn't render the canvas. You can still copy the caption below!</span>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="w-6 h-6 border-2 border-[#0E7850] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 animate-pulse font-sans">Designing your card...</span>
                            </div>
                        )}
                    </div>

                    {/* Caption Box */}
                    <div className="mb-5 text-left font-sans">
                        <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 px-1">
                            Caption text copy helper
                        </p>
                        <div className="relative bg-gray-50 dark:bg-zinc-900 rounded-xl p-3 border border-gray-100 dark:border-zinc-800 text-[11px] font-medium text-gray-500 dark:text-gray-400 leading-normal h-24 overflow-y-auto select-all">
                            {captionText}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2.5">
                        {shareImage && (
                            <button
                                onClick={handleDownload}
                                className="w-full py-3.5 bg-[#0E7850] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#0b5c3e] transition-all active:scale-95 shadow-md shadow-emerald-950/10 font-sans"
                            >
                                <Download className="w-4 h-4" /> Download Card Image
                            </button>
                        )}
                        <button
                            onClick={handleCopyCaption}
                            className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 flex items-center justify-center gap-2 font-sans ${
                                copied 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' 
                                    : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-300 border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800'
                            }`}
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4" /> Caption Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" /> Copy Caption Message
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Milestone Card component
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
            ? `bg-white dark:bg-zinc-900 border-${colorClass}/20 dark:border-zinc-850 shadow-md ring-1 ring-${colorClass}/5` 
            : 'bg-gray-50/50 dark:bg-zinc-900/20 border-gray-100 dark:border-zinc-800/55 opacity-80'
        }`}>
            <div className="flex items-start gap-4 mb-4 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform duration-500 ${
                    milestone.isUnlocked ? `bg-${colorClass}/10 text-${colorClass} scale-110 shadow-inner` : 'bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-zinc-700 grayscale'
                }`}>
                    {milestone.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-black text-gray-900 dark:text-gray-100 text-sm uppercase tracking-tight truncate" style={{fontStyle: 'normal'}}>{milestone.title}</h3>
                        {milestone.isClaimed && (
                            <span className="bg-gray-100 dark:bg-zinc-850 text-gray-400 dark:text-gray-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Collected</span>
                        )}
                        {milestone.isUnlocked && !milestone.isClaimed && (
                            <span className={`bg-${colorClass} text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse`}>Ready</span>
                        )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-tight line-clamp-2">{milestone.description}</p>
                </div>
            </div>

            <div className="relative z-10">
                <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        {milestone.isUnlocked ? 'Requirement Met' : `Progress: ${milestone.currentValue.toFixed(0)}/${milestone.targetValue}`}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${milestone.isUnlocked && !milestone.isClaimed ? `text-${colorClass}` : 'text-gray-400 dark:text-gray-500'}`}>
                        {milestone.isClaimed ? 'Awarded' : `+${milestone.points} Credits`}
                    </span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-4">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${milestone.isUnlocked ? (milestone.isClaimed ? 'bg-gray-400 dark:bg-zinc-650' : `bg-${colorClass} shadow-[0_0_8px_${accentColor}]`) : 'bg-gray-300'}`}
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

                {milestone.isClaimed && (
                    <button 
                        onClick={() => onShare(milestone)}
                        className="w-full py-2.5 bg-gray-50 dark:bg-zinc-800 text-[#0E7850] dark:text-[#10b981] hover:bg-emerald-50 dark:hover:bg-zinc-700/50 border border-gray-100 dark:border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
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
    const [isLoading, setIsLoading] = useState(true);
    const [activeShareMilestone, setActiveShareMilestone] = useState<Milestone | null>(null);

    // Expansion states for each badge category
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);

        const unsubscribes: (() => void)[] = [];

        let enrollmentsSubscribed = false;
        let reflectionsSubscribed = false;

        const checkLoading = () => {
            if (enrollmentsSubscribed && reflectionsSubscribed) {
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

    const handleClaim = async (m: Milestone) => {
        if (!user) return;
        try {
            await userService.claimMilestone(user.id, m.id, m.points);
            userService.queueNotification('success', `Claimed! +${m.points} Coins added to your wallet.`, {
                description: `Milestone: ${m.title}`,
                duration: 3000
            });
            // Show the similar pop up after first sprint completion achievement represents it instantly!
            setActiveShareMilestone({ ...m, isClaimed: true });
        } catch (err) {
            userService.queueNotification('error', "Failed to claim credits.", { duration: 3000 });
        }
    };

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    if (!user) return null;

    const CategorySection = ({ 
        title, 
        type, 
        milestones, 
        color, 
        onShare 
    }: { 
        title: string; 
        type: string; 
        milestones: Milestone[]; 
        color: string; 
        onShare: (m: Milestone) => void;
    }) => {
        if (milestones.length === 0) return null;
        const isExpanded = expandedCategories[type] || false;
        const visibleMilestones = isExpanded ? milestones : milestones.slice(0, 3);

        return (
            <section className="animate-fade-in">
                <div className="flex items-center gap-3 mb-8">
                    <div className={`w-1.5 h-6 bg-${color}-500 rounded-full`}></div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest">{title}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleMilestones.map(m => (
                        <MilestoneCard 
                            key={m.id} 
                            milestone={m} 
                            onClaim={handleClaim} 
                            onShare={onShare} 
                        />
                    ))}
                </div>
                {milestones.length > 3 && (
                    <button 
                        onClick={() => toggleCategory(type)}
                        className="mt-6 w-full py-4 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest text-[9px] rounded-xl transition-all border border-gray-100 dark:border-zinc-800 active:scale-95 shadow-sm"
                    >
                        {isExpanded ? `Collapse ${title}` : `See More (${milestones.length - 3} Hidden)`}
                    </button>
                )}
            </section>
        );
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-32 animate-fade-in bg-[#FAFAFA] dark:bg-zinc-950">
            <div className="mb-12">
                <button onClick={() => navigate('/profile')} className="group flex items-center text-gray-400 hover:text-primary transition-colors mb-6 text-xs font-black uppercase tracking-widest"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>My Profile</button>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-2">The Hall of Rise.</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Your progress matters. Claim credits as you hit milestones.</p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 rounded-[3rem] border border-gray-100 dark:border-zinc-800/80 shadow-sm">
                    <div className="w-12 h-12 border-4 border-[#0E7850] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Syncing Milestones...</p>
                </div>
            ) : (
                <div className="space-y-16">
                    <CategorySection title="Core Progress" type="coreProgress" milestones={milestonesByType.coreProgress} color="primary" onShare={setActiveShareMilestone} />
                    <CategorySection title="Long Game" type="longGame" milestones={milestonesByType.longGame} color="blue" onShare={setActiveShareMilestone} />
                    <CategorySection title="Inner Work" type="innerWork" milestones={milestonesByType.innerWork} color="yellow" onShare={setActiveShareMilestone} />
                    <CategorySection title="Influence" type="influence" milestones={milestonesByType.influence} color="teal" onShare={setActiveShareMilestone} />
                </div>
            )}
            
            {activeShareMilestone && (
                <MilestoneShareModal 
                    milestone={activeShareMilestone}
                    userName={(user as any).name || (user as any).displayName || "Emmanuel"}
                    onClose={() => setActiveShareMilestone(null)}
                />
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default Badges;
