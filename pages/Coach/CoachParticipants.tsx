import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_USERS } from '../../services/mockData';
import { Participant, Sprint, ParticipantSprint, CoachingComment, UserRole, DailyContent, InteractionUser } from '../../types';
import Button from '../../components/Button';
import CustomSelect from '../../components/CustomSelect';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { chatService } from '../../services/chatService';
import { notificationService } from '../../services/notificationService';
import { db } from '../../services/firebase';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { parseStepVersions, formatInterpolatedText } from '../../src/utils/stepPlaceholderUtils';
import FormattedText from '../../components/FormattedText';
import { 
    Flame, Sparkles, BookOpen, Trophy, Eye, Heart, MessageSquare, 
    ChevronRight, ArrowLeft, Search, Filter, Calendar, Clock, 
    Share2, UserCheck, CheckCircle2, Award, Download, ExternalLink,
    Send, Trash2, X, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface ExtendedEnrollment extends ParticipantSprint {
    student: Participant;
    sprint: Sprint;
    isActiveToday: boolean;
    completedCount: number;
    currentMilestoneDay: number;
}

type ExperienceTypeFilter = 'all' | 'ignite' | 'sprint' | 'challenge' | 'blog';

export const CoachParticipants: React.FC = () => {
    const { user } = useAuth();
    const [experienceTypeFilter, setExperienceTypeFilter] = useState<ExperienceTypeFilter>('all');
    const [selectedProgramId, setSelectedProgramId] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [sortBy, setSortBy] = useState<'recent' | 'progress' | 'engagement'>('recent');
    
    // Data state
    const [allEnrollments, setAllEnrollments] = useState<ExtendedEnrollment[]>([]);
    const [allExperiences, setAllExperiences] = useState<Sprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Interactive views
    const [viewingSubmission, setViewingSubmission] = useState<{enrollment: ExtendedEnrollment, day: number} | null>(null);
    const [activeDayContent, setActiveDayContent] = useState<DailyContent | null>(null);
    const [isDayContentLoading, setIsDayContentLoading] = useState<boolean>(false);
    
    // Experience interaction tracking modal (for Ignite, Riseblog, Challenge)
    const [viewingExperienceTracker, setViewingExperienceTracker] = useState<Sprint | null>(null);
    const [trackerInteractions, setTrackerInteractions] = useState<{ views: InteractionUser[]; likes: InteractionUser[]; viewCount: number; likeCount: number }>({ views: [], likes: [], viewCount: 0, likeCount: 0 });
    const [trackerActiveTab, setTrackerActiveTab] = useState<'views' | 'likes'>('views');
    const [trackerSearchTerm, setTrackerSearchTerm] = useState('');
    const [isTrackerLoading, setIsTrackerLoading] = useState(false);
    
    // Previews for non-sprint experiences in tracker
    const [previewingIgnite, setPreviewingIgnite] = useState<Sprint | null>(null);
    const [previewingBlog, setPreviewingBlog] = useState<Sprint | null>(null);

    // Sprint Review / Chat state
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);
    const [feedbackSent, setFeedbackSent] = useState(false);
    const [dayComments, setDayComments] = useState<CoachingComment[]>([]);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // Initial Data Fetching
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setIsLoading(true);

            try {
                let availableSprints: Sprint[] = [];
                let enrollments: ParticipantSprint[] = [];
                
                if (user.role === UserRole.ADMIN) {
                    const [adminAllSprints, adminCoachSprints, myOwnSprints, allDbEnrollments] = await Promise.all([
                        sprintService.getAdminSprints(),
                        sprintService.getAdminCoachSprints(),
                        sprintService.getCoachSprints(user.id),
                        sprintService.getAllEnrollments()
                    ]);
                    
                    const combined = [...adminAllSprints, ...adminCoachSprints, ...myOwnSprints];
                    const uniqueMap = new Map<string, Sprint>();
                    combined.forEach(s => {
                        if (s?.id && !uniqueMap.has(s.id)) {
                            uniqueMap.set(s.id, s);
                        }
                    });
                    availableSprints = Array.from(uniqueMap.values());
                    enrollments = allDbEnrollments;
                } else {
                    const [coachSprints, allDbEnrollments] = await Promise.all([
                        sprintService.getCoachSprints(user.id),
                        sprintService.getAllEnrollments()
                    ]);
                    
                    availableSprints = coachSprints || [];
                    const coachSprintIds = new Set(availableSprints.map(s => s.id));
                    
                    enrollments = allDbEnrollments.filter(e => 
                        (e.coach_id && e.coach_id === user.id) || 
                        (e.sprint_id && coachSprintIds.has(e.sprint_id))
                    );

                    const missingSprintIds = Array.from(new Set(
                        enrollments.map(e => e.sprint_id).filter(id => !!id && !coachSprintIds.has(id))
                    ));
                    
                    if (missingSprintIds.length > 0) {
                        const fetchedMissing = await Promise.all(
                            missingSprintIds.map(id => sprintService.getSprintById(id))
                        );
                        fetchedMissing.forEach(s => {
                            if (s && !coachSprintIds.has(s.id)) {
                                availableSprints.push(s);
                                coachSprintIds.add(s.id);
                            }
                        });
                    }
                }

                setAllExperiences(availableSprints);

                if (enrollments.length === 0) {
                    setAllEnrollments([]);
                    setIsLoading(false);
                    return;
                }

                const uniqueParticipantIds = Array.from(new Set(enrollments.map(e => e.user_id).filter(id => !!id))) as string[];
                const dbParticipants = await userService.getUsersByIds(uniqueParticipantIds);

                const now = new Date();
                const sprintMap = new Map<string, Sprint>(availableSprints.map(s => [s.id, s]));

                const enriched = enrollments.map(ps => {
                    if (!ps || !ps.user_id) return null;

                    const student = dbParticipants.find(u => u.id === ps.user_id) || 
                                   MOCK_USERS.find(u => u.id === ps.user_id) || {
                                       id: ps.user_id,
                                       name: (ps as any).userName || (ps as any).studentName || (ps as any).userEmail?.split('@')[0] || `Participant ${ps.user_id.slice(0, 6)}`,
                                       email: (ps as any).userEmail || '',
                                       role: UserRole.PARTICIPANT,
                                       profileImageUrl: (ps as any).userPhoto || (ps as any).profileImageUrl || `https://picsum.photos/seed/${ps.user_id}/100/100`
                                   } as Participant;

                    let sprint = sprintMap.get(ps.sprint_id);
                    if (!sprint) {
                        sprint = {
                            id: ps.sprint_id,
                            title: (ps as any).sprintTitle || `Sprint #${ps.sprint_id.slice(0, 8)}`,
                            duration: ps.progress?.length || 7,
                            category: 'Core',
                            coachId: user.id
                        } as Sprint;
                    }

                    const progressList = Array.isArray(ps.progress) ? ps.progress : [];
                    const completions = progressList.filter(p => p && p.completed);
                    const lastCompletion = completions.length > 0 
                        ? [...completions].sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())[0]
                        : null;

                    const isActiveToday = lastCompletion 
                        ? (now.getTime() - new Date(lastCompletion.completedAt!).getTime()) < (24 * 60 * 60 * 1000)
                        : false;

                    const nextIncomplete = progressList.find(p => p && !p.completed);

                    return {
                        ...ps,
                        progress: progressList,
                        student,
                        sprint,
                        isActiveToday,
                        completedCount: completions.length,
                        currentMilestoneDay: nextIncomplete ? nextIncomplete.day : (sprint.duration || progressList.length || 7)
                    };
                }).filter((e): e is ExtendedEnrollment => e !== null);

                setAllEnrollments(enriched);
            } catch (err) {
                console.error("Failed to load coaching data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user]);

    // Handle deep links in URL
    useEffect(() => {
        if (!isLoading && allEnrollments.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const studentId = params.get('studentId');
            const sprintId = params.get('sprintId');
            const dayStr = params.get('day');
            
            if (studentId && sprintId && dayStr) {
                const day = parseInt(dayStr, 10);
                const matchingEnrollment = allEnrollments.find(e => e.user_id === studentId && e.sprint_id === sprintId);
                if (matchingEnrollment) {
                    setViewingSubmission({ enrollment: matchingEnrollment, day });
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, '', newUrl);
                }
            }
        }
    }, [isLoading, allEnrollments]);

    // Load day content when reviewing a submission
    useEffect(() => {
        if (!viewingSubmission) {
            setActiveDayContent(null);
            return;
        }

        let isMounted = true;
        const sprintId = viewingSubmission.enrollment.sprint_id || viewingSubmission.enrollment.sprint?.id;
        const day = viewingSubmission.day;

        const existingContent = Array.isArray(viewingSubmission.enrollment.sprint.dailyContent)
            ? viewingSubmission.enrollment.sprint.dailyContent.find(c => c && c.day === day)
            : null;

        if (existingContent && ((existingContent.taskPrompts && existingContent.taskPrompts.length > 0) || existingContent.taskPrompt || existingContent.lessonText)) {
            setActiveDayContent(existingContent);
        }

        const fetchDayContent = async () => {
            setIsDayContentLoading(true);
            try {
                if (sprintId) {
                    const fullSprint = await sprintService.getSprintById(sprintId, true);
                    if (fullSprint && Array.isArray(fullSprint.dailyContent)) {
                        const dayMatch = fullSprint.dailyContent.find(c => c && c.day === day);
                        if (dayMatch && isMounted) {
                            setActiveDayContent(dayMatch);
                            viewingSubmission.enrollment.sprint.dailyContent = fullSprint.dailyContent;
                            setIsDayContentLoading(false);
                            return;
                        }
                    }
                }

                const docNames = ['Core', 'Blog', 'Ignite', 'Sprint', 'Custom', 'Default', 'Experiences'];
                if (sprintId) {
                    for (const docName of docNames) {
                        try {
                            const snap = await getDoc(doc(db, 'experiences', docName, 'items', sprintId, 'days', `day ${day}`));
                            if (snap.exists() && isMounted) {
                                setActiveDayContent({ day, ...snap.data() } as DailyContent);
                                setIsDayContentLoading(false);
                                return;
                            }
                        } catch (e) {}
                    }
                }
            } catch (err) {
                console.error("[CoachParticipants] Failed to fetch day content:", err);
            } finally {
                if (isMounted) setIsDayContentLoading(false);
            }
        };

        fetchDayContent();

        return () => {
            isMounted = false;
        };
    }, [viewingSubmission?.enrollment.sprint_id, viewingSubmission?.enrollment.sprint?.id, viewingSubmission?.day]);

    // Live chat messages for the reviewed day
    useEffect(() => {
        if (!viewingSubmission || !user) {
            setDayComments([]);
            return;
        }

        const fetchChat = async () => {
            const dayMessages = await chatService.getConversation(
                viewingSubmission.enrollment.sprint_id, 
                viewingSubmission.enrollment.user_id,
                viewingSubmission.day
            );
            setDayComments(dayMessages);
        };

        fetchChat();
        const interval = setInterval(fetchChat, 3000);
        return () => clearInterval(interval);
    }, [viewingSubmission, user]);

    // Load Experience Interactions when opening Experience Tracker Modal
    useEffect(() => {
        if (!viewingExperienceTracker) return;

        setIsTrackerLoading(true);
        const unsubscribe = sprintService.subscribeToExperienceInteractions(
            viewingExperienceTracker.id,
            (data) => {
                setTrackerInteractions(data);
                setIsTrackerLoading(false);
            }
        );

        return () => {
            unsubscribe();
        };
    }, [viewingExperienceTracker]);

    // Filter Sprints and Enrollments
    const sprintEnrollments = useMemo(() => {
        return allEnrollments.filter(e => {
            const matchesProgram = selectedProgramId === 'all' || e.sprint_id === selectedProgramId;
            const matchesSearch = e.student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 e.sprint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 e.student.email.toLowerCase().includes(searchTerm.toLowerCase());
            
            let matchesStatus = true;
            if (statusFilter === 'active') {
                matchesStatus = e.completedCount < e.sprint.duration;
            } else if (statusFilter === 'inactive') {
                matchesStatus = e.completedCount === e.sprint.duration;
            }

            return matchesProgram && matchesSearch && matchesStatus;
        }).sort((a, b) => {
            if (sortBy === 'recent') {
                const dateA = new Date(a.started_at || 0).getTime();
                const dateB = new Date(b.started_at || 0).getTime();
                return dateB - dateA;
            } else {
                return b.completedCount - a.completedCount;
            }
        });
    }, [allEnrollments, selectedProgramId, searchTerm, statusFilter, sortBy]);

    // Non-Sprint Experiences Filtered
    const filteredNonSprintExperiences = useMemo(() => {
        return allExperiences.filter(exp => {
            const ct = String(exp.contentType || 'sprint').toLowerCase();
            
            let matchesType = false;
            if (experienceTypeFilter === 'all') {
                matchesType = ct === 'ignite' || ct === 'blog' || ct === 'challenge';
            } else if (experienceTypeFilter === 'ignite') {
                matchesType = ct === 'ignite';
            } else if (experienceTypeFilter === 'blog') {
                matchesType = ct === 'blog';
            } else if (experienceTypeFilter === 'challenge') {
                matchesType = ct === 'challenge';
            }

            const matchesSearch = !searchTerm || 
                exp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                exp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                exp.category?.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesType && matchesSearch;
        });
    }, [allExperiences, experienceTypeFilter, searchTerm]);

    // Filtered Views & Likes inside the Account Tracker
    const filteredTrackerAccounts = useMemo(() => {
        const list = trackerActiveTab === 'views' ? trackerInteractions.views : trackerInteractions.likes;
        if (!trackerSearchTerm) return list;
        return list.filter(acc => 
            acc.userName?.toLowerCase().includes(trackerSearchTerm.toLowerCase()) ||
            acc.userEmail?.toLowerCase().includes(trackerSearchTerm.toLowerCase())
        );
    }, [trackerInteractions, trackerActiveTab, trackerSearchTerm]);

    // Send coach feedback
    const handleSendFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = feedbackText.trim();
        if (!content || !user || !viewingSubmission) return;

        setIsSendingFeedback(true);
        const newMessage: Omit<CoachingComment, 'id'> = {
            sprintId: viewingSubmission.enrollment.sprint_id,
            day: viewingSubmission.day,
            participantId: viewingSubmission.enrollment.user_id,
            authorId: user.id,
            content: content,
            timestamp: new Date().toISOString(),
            read: false
        };

        try {
            await chatService.sendMessage(newMessage);
            setFeedbackSent(true);
            setFeedbackText('');
            setTimeout(() => setFeedbackSent(false), 3000);
        } catch (error) {
            console.error("Failed to send feedback", error);
            toast.error("Failed to send feedback");
        } finally {
            setIsSendingFeedback(false);
        }
    };

    // Helper to format timestamps
    const formatTimestamp = (iso?: string) => {
        if (!iso) return 'Recently';
        try {
            const date = new Date(iso);
            if (isNaN(date.getTime())) return 'Recently';
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Recently';
        }
    };

    const formatTimeAgo = (iso?: string) => {
        if (!iso) return 'recently';
        try {
            const diff = Date.now() - new Date(iso).getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            if (days <= 0) return 'today';
            if (days === 1) return '1 day ago';
            return `${days} days ago`;
        } catch {
            return 'recently';
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 pb-32 animate-fade-in font-sans">
            {/* 1. SPRINT SUBMISSION REVIEW - SPRINT VIEW DESIGN STYLE */}
            {viewingSubmission ? (
                <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
                    {/* Header Bar */}
                    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                        <div className="flex items-center gap-4">
                            <button 
                                type="button"
                                onClick={() => setViewingSubmission(null)}
                                className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-700 hover:text-gray-950 active:scale-95 transition-all cursor-pointer flex items-center gap-2 text-xs font-black uppercase tracking-wider"
                                title="Back to Participant Tracker"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Tracker</span>
                            </button>
                            <div>
                                <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                                    {viewingSubmission.enrollment.sprint.title}
                                </h1>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                    Move {viewingSubmission.day} Review
                                </p>
                            </div>
                        </div>

                        {/* Student Badge */}
                        <div className="flex items-center gap-3 bg-white p-2.5 px-4 rounded-2xl border border-gray-100 shadow-sm">
                            <img 
                                src={viewingSubmission.enrollment.student.profileImageUrl || 'https://picsum.photos/seed/student/100/100'} 
                                alt="" 
                                className="w-9 h-9 rounded-full object-cover border border-emerald-100"
                            />
                            <div>
                                <p className="text-xs font-black text-gray-900 leading-tight">
                                    {viewingSubmission.enrollment.student.name}
                                </p>
                                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">
                                    {viewingSubmission.enrollment.completedCount} / {viewingSubmission.enrollment.sprint.duration} Moves Completed
                                </p>
                            </div>
                        </div>
                    </header>

                    {/* Move Day Selector - Exact SprintView Style */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Select Move Day
                        </p>
                        <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar scroll-smooth px-1">
                            {Array.from({ length: viewingSubmission.enrollment.sprint.duration || 5 }, (_, i) => i + 1).map((day) => {
                                const isActive = viewingSubmission.day === day;
                                const prog = viewingSubmission.enrollment.progress?.find((p) => p.day === day);
                                const isCompleted = prog?.completed;

                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => {
                                            setViewingSubmission({
                                                ...viewingSubmission,
                                                day
                                            });
                                        }}
                                        className={`flex-shrink-0 w-20 h-20 rounded-[1.5rem] flex flex-col items-center justify-center relative transition-all duration-300 active:scale-95 cursor-pointer ${
                                            isActive
                                                ? "bg-[#0E7850] text-white shadow-xl shadow-primary/20 scale-105"
                                                : isCompleted
                                                    ? "bg-white text-gray-800 border-2 border-emerald-100 hover:border-emerald-300"
                                                    : "bg-[#F3F4F6] text-gray-400"
                                        }`}
                                    >
                                        {isCompleted && (
                                            <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${isActive ? "bg-white" : "bg-[#0E7850]"}`}></div>
                                        )}
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? "text-white/70" : "text-gray-400"}`}>
                                            Move
                                        </span>
                                        <span className="text-3xl font-black leading-none">
                                            {day}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sprint View Main Workspace */}
                    <div className="space-y-8 animate-fade-in">
                        {/* 1. Today's Insight (Daily Lesson) */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#0E7850]"></div>
                                <h3 className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">
                                    Today's Insight
                                </h3>
                            </div>
                            <div className="text-gray-700 font-medium text-base leading-[1.6] max-w-[65ch]">
                                {isDayContentLoading ? (
                                    <div className="animate-pulse space-y-2 py-4">
                                        <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                                        <div className="h-4 bg-gray-100 rounded w-full"></div>
                                        <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                                    </div>
                                ) : (
                                    <FormattedText text={activeDayContent?.lessonText || viewingSubmission.enrollment.sprint.dailyContent?.find(c => c.day === viewingSubmission.day)?.lessonText || "No lesson text recorded for this day."} />
                                )}
                            </div>
                        </div>

                        {/* 2. Today's Moves (Participant's Submitted Responses) */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 px-1">
                                <div className="w-2 h-2 rounded-full bg-[#0E7850]"></div>
                                <h3 className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">
                                    Participant's Move Responses
                                </h3>
                            </div>

                            {(() => {
                                const progressObj = viewingSubmission.enrollment.progress.find(p => p.day === viewingSubmission.day);
                                const sub = progressObj?.submission;
                                const contentData = activeDayContent || viewingSubmission.enrollment.sprint.dailyContent?.find(c => c.day === viewingSubmission.day);
                                
                                let candidatePrompts: string[] = [];
                                if (Array.isArray(contentData?.taskPrompts) && contentData.taskPrompts.some(p => p && typeof p === 'string' && p.trim().length > 0)) {
                                    candidatePrompts = contentData.taskPrompts;
                                } else if (contentData?.taskPrompt && typeof contentData.taskPrompt === 'string' && contentData.taskPrompt.trim().length > 0) {
                                    candidatePrompts = [contentData.taskPrompt];
                                } else if (Array.isArray((progressObj as any)?.taskPrompts) && (progressObj as any).taskPrompts.length > 0) {
                                    candidatePrompts = (progressObj as any).taskPrompts;
                                }

                                const answers = progressObj?.answers || (typeof sub === 'string' ? sub.split(' | ') : []);
                                const inputTypes = contentData?.taskInputTypes || [];
                                const totalCount = Math.max(answers.length, candidatePrompts.length, 1);

                                if (!progressObj?.completed && answers.length === 0 && !sub) {
                                    return (
                                        <div className="p-10 bg-white rounded-3xl border-2 border-dashed border-gray-100 text-center">
                                            <p className="text-gray-400 italic text-sm font-bold uppercase tracking-widest">
                                                Move {viewingSubmission.day} Not Yet Completed by Student
                                            </p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-6">
                                        {Array.from({ length: totalCount }).map((_, idx) => {
                                            let rawPrompt = candidatePrompts[idx] || (idx === 0 && contentData?.taskPrompt ? contentData.taskPrompt : `Move ${viewingSubmission.day} Question ${idx + 1}`);
                                            
                                            if (rawPrompt && typeof rawPrompt === 'string' && rawPrompt.includes('|') && rawPrompt.startsWith('[') && rawPrompt.endsWith(']')) {
                                                const versions = parseStepVersions(rawPrompt);
                                                rawPrompt = versions[0] || rawPrompt;
                                            }

                                            let formattedPrompt = rawPrompt;
                                            try {
                                                formattedPrompt = formatInterpolatedText(
                                                    rawPrompt,
                                                    contentData,
                                                    answers,
                                                    viewingSubmission.enrollment.sprint.dailyContent,
                                                    viewingSubmission.enrollment.progress
                                                );
                                            } catch (e) {
                                                formattedPrompt = rawPrompt;
                                            }

                                            const answerVal = answers[idx] !== undefined ? answers[idx] : '';
                                            const itemType = inputTypes[idx] || 'text';
                                            const isArrayFormat = typeof answerVal === 'string' && answerVal.trim().startsWith('[') && answerVal.trim().endsWith(']');
                                            
                                            let tags: string[] = [];
                                            let displayAsTags = false;
                                            if ((itemType === 'tags' || itemType === 'poll' || isArrayFormat) && answerVal) {
                                                if (isArrayFormat) {
                                                    try {
                                                        const parsed = JSON.parse(answerVal);
                                                        if (Array.isArray(parsed)) {
                                                            tags = parsed.map(String).filter(Boolean);
                                                            displayAsTags = true;
                                                        }
                                                    } catch (e) {}
                                                }
                                                if (!displayAsTags) {
                                                    tags = [answerVal.trim()].filter(Boolean);
                                                    displayAsTags = true;
                                                }
                                            }

                                            return (
                                                <div 
                                                    key={idx} 
                                                    className="p-6 sm:p-8 bg-[#0E7850]/5 rounded-3xl border border-[#0E7850]/15 space-y-4 relative"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="px-3 py-1 bg-white text-[#0E7850] text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 shadow-sm">
                                                            Step {idx + 1} of {totalCount}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                            {itemType.toUpperCase()}
                                                        </span>
                                                    </div>

                                                    <h4 className="text-base sm:text-lg font-black text-gray-900 leading-snug">
                                                        {formattedPrompt}
                                                    </h4>

                                                    <div className="pt-2">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                                            Student's Response
                                                        </p>
                                                        {displayAsTags ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {tags.map((t, tIdx) => (
                                                                    <span 
                                                                        key={tIdx}
                                                                        className="px-3.5 py-1.5 bg-white text-[#0E7850] font-bold text-xs rounded-xl border border-emerald-200 shadow-sm"
                                                                    >
                                                                        ✓ {t}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-900 font-medium text-sm whitespace-pre-wrap leading-relaxed">
                                                                {answerVal || <span className="text-gray-400 italic">No response written</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* 3. Coaching Feedback & Live Conversation Channel */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
                            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-[#0E7850]" />
                                    <h3 className="text-xs font-black uppercase tracking-[0.25em] text-gray-900">
                                        Coaching Dialogue (Move {viewingSubmission.day})
                                    </h3>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    Direct with {viewingSubmission.enrollment.student.name}
                                </span>
                            </div>

                            {/* Dialogue Messages History */}
                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar" ref={chatScrollRef}>
                                {dayComments.length === 0 ? (
                                    <div className="py-8 text-center text-gray-400">
                                        <p className="text-xs font-bold uppercase tracking-wider">No comments yet for Move {viewingSubmission.day}</p>
                                        <p className="text-[11px] text-gray-400 mt-1">Send a supportive coaching note or guidance below.</p>
                                    </div>
                                ) : (
                                    dayComments.map((msg) => {
                                        const isMe = msg.authorId === user.id;
                                        return (
                                            <div 
                                                key={msg.id} 
                                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                            >
                                                <div className={`p-4 rounded-2xl max-w-[85%] text-xs font-medium leading-relaxed ${
                                                    isMe 
                                                        ? 'bg-[#0E7850] text-white rounded-tr-none' 
                                                        : 'bg-gray-100 text-gray-800 rounded-tl-none'
                                                }`}>
                                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                                </div>
                                                <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 px-1">
                                                    {isMe ? 'You' : viewingSubmission.enrollment.student.name} • {formatTimestamp(msg.timestamp)}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Suggestion Chips */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Quick Feedback Prompts
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        "Brilliant insight on this move! 🌟",
                                        "Love the clarity in your reflection.",
                                        "Notice how this connects to tomorrow's goal.",
                                        "Keep this strong momentum going!"
                                    ].map((prompt, pIdx) => (
                                        <button
                                            key={pIdx}
                                            type="button"
                                            onClick={() => setFeedbackText(prompt)}
                                            className="px-3 py-1.5 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 rounded-xl text-xs font-semibold border border-gray-100 transition-all cursor-pointer"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Feedback Input Form */}
                            <form onSubmit={handleSendFeedback} className="space-y-3">
                                <div className="relative">
                                    <textarea
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        placeholder={`Send feedback or coaching advice for Move ${viewingSubmission.day}...`}
                                        rows={3}
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#0E7850] focus:ring-4 focus:ring-[#0E7850]/10 transition-all outline-none resize-none"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    {feedbackSent ? (
                                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-fade-in">
                                            <CheckCircle2 className="w-4 h-4" /> Feedback Sent to Student!
                                        </span>
                                    ) : <div></div>}
                                    <button
                                        type="submit"
                                        disabled={isSendingFeedback || !feedbackText.trim()}
                                        className="px-6 py-3 bg-[#0E7850] hover:bg-[#0b5d3e] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-[#0E7850]/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>{isSendingFeedback ? 'Sending...' : 'Send Coaching Note'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            ) : (
                /* 2. MAIN PARTICIPANTS & EXPERIENCES DASHBOARD */
                <>
                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">
                                Participant & Experience Tracker
                            </h1>
                            <p className="text-gray-500 font-medium">
                                Real-time engagement, views, likes, and submission tracking across your programs.
                            </p>
                        </div>

                        {/* Search & Program Filter */}
                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                            <div className="relative min-w-[200px]">
                                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                                <input 
                                    type="text"
                                    placeholder="Search title, student..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 placeholder:text-gray-400 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none shadow-sm h-11"
                                />
                            </div>

                            {/* Program Filter */}
                            <CustomSelect 
                                value={selectedProgramId}
                                onChange={(val) => setSelectedProgramId(String(val))}
                                options={[
                                    { value: 'all', label: 'All Programs' },
                                    ...allExperiences.map(s => ({ value: s.id, label: s.title }))
                                ]}
                                className="min-w-[160px]"
                            />
                        </div>
                    </div>

                    {/* Experience Type Filter Switcher - As Requested: All experience, Ignite, Sprint, Challenge, Riseblog */}
                    <div className="mb-8 p-1.5 bg-gray-100 rounded-2xl inline-flex flex-wrap gap-1">
                        <button
                            type="button"
                            onClick={() => setExperienceTypeFilter('all')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                experienceTypeFilter === 'all'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <span>All experience</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setExperienceTypeFilter('ignite')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                experienceTypeFilter === 'ignite'
                                    ? 'bg-white text-purple-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            <span>Ignite</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setExperienceTypeFilter('sprint')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                experienceTypeFilter === 'sprint'
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <Flame className="w-3.5 h-3.5 text-primary" />
                            <span>Sprint</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setExperienceTypeFilter('challenge')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                experienceTypeFilter === 'challenge'
                                    ? 'bg-white text-amber-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <Trophy className="w-3.5 h-3.5 text-amber-600" />
                            <span>Challenge</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setExperienceTypeFilter('blog')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                experienceTypeFilter === 'blog'
                                    ? 'bg-white text-emerald-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Riseblog</span>
                        </button>
                    </div>

                    {/* SECTION A: SPRINT PARTICIPANT CARDS (MAINTAIN CURRENT CARD DESIGN) */}
                    {(experienceTypeFilter === 'all' || experienceTypeFilter === 'sprint') && (
                        <div className="space-y-6 mb-12">
                            {experienceTypeFilter === 'all' && (
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Flame className="w-5 h-5 text-primary" />
                                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">
                                            Sprint Participants ({sprintEnrollments.length})
                                        </h2>
                                    </div>
                                </div>
                            )}

                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="bg-white rounded-[2rem] border-2 border-gray-100 p-6 shadow-sm space-y-4">
                                            <div className="h-10 bg-gray-100 rounded-full w-10"></div>
                                            <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                                            <div className="h-8 bg-gray-100 rounded-xl"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : sprintEnrollments.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {sprintEnrollments.map((e) => {
                                        const latestCompleted = [...e.progress].filter(p => p.completed).sort((a,b) => b.day - a.day)[0];
                                        const displayDay = latestCompleted ? latestCompleted.day : 1;

                                        return (
                                            <div 
                                                key={e.id} 
                                                className="bg-white rounded-[2rem] border-2 border-gray-100 p-6 shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
                                            >
                                                <div>
                                                    {/* Profile Header */}
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <img 
                                                                    src={e.student.profileImageUrl || 'https://picsum.photos/seed/student/100/100'} 
                                                                    alt="" 
                                                                    className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm" 
                                                                />
                                                                {e.isActiveToday && (
                                                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-gray-900 leading-tight">
                                                                    {e.student.name}
                                                                </p>
                                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">
                                                                    Started {formatTimeAgo(e.started_at)}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Quick Direct Discussion */}
                                                        <button 
                                                            onClick={() => {
                                                                setViewingSubmission({ enrollment: e, day: displayDay });
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all cursor-pointer"
                                                            title="Review move submissions"
                                                        >
                                                            <MessageSquare className="h-5 w-5" />
                                                        </button>
                                                    </div>

                                                    {/* Sprint Title & Progress Info */}
                                                    <div className="mb-4">
                                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                                            {e.sprint.title} • {e.completedCount} / {e.sprint.duration} Days
                                                        </p>
                                                    </div>

                                                    {/* Structural Divider */}
                                                    <div className="border-t border-gray-100 my-3"></div>

                                                    {/* Schedule Tracker: ■ ■ ■ ■ ■ */}
                                                    <div className="mb-4">
                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                                            Schedule Tracker
                                                        </p>
                                                        <div className="flex gap-1 items-center flex-wrap">
                                                            {e.progress.map((p) => {
                                                                const isCompleted = p.completed;
                                                                const isCurrentMilestone = !isCompleted && p.day === e.currentMilestoneDay;
                                                                return (
                                                                    <button 
                                                                        key={p.day}
                                                                        onClick={() => {
                                                                            if (isCompleted) {
                                                                                setViewingSubmission({ enrollment: e, day: p.day });
                                                                            }
                                                                        }}
                                                                        disabled={!isCompleted}
                                                                        title={`Day ${p.day}: ${isCompleted ? 'Click to Review Submission' : 'Pending'}`}
                                                                        className={`text-base leading-none transition-all duration-200 select-none ${
                                                                            isCompleted 
                                                                                ? 'text-primary hover:scale-125 cursor-pointer' 
                                                                                : isCurrentMilestone
                                                                                    ? 'text-amber-500 animate-pulse'
                                                                                    : 'text-gray-200 cursor-default'
                                                                        }`}
                                                                    >
                                                                        ■
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Review Day button - Click opens Sprint View style */}
                                                <div className="mt-2 pt-2 border-t border-gray-50 flex flex-col">
                                                    <button 
                                                        onClick={() => {
                                                            setViewingSubmission({ enrollment: e, day: displayDay });
                                                        }}
                                                        className="w-full py-2.5 px-4 bg-primary text-white hover:bg-primary-dark font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-between group/vbtn cursor-pointer"
                                                    >
                                                        <span>Review Day {displayDay}</span>
                                                        <span className="font-bold text-xs transform group-hover/vbtn:translate-x-1 transition-transform">&rarr;</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                experienceTypeFilter === 'sprint' && (
                                    <div className="py-20 text-center flex flex-col items-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
                                        <Flame className="w-10 h-10 text-gray-300 mb-3" />
                                        <h3 className="text-lg font-bold text-gray-800">No Sprint Participants Found</h3>
                                        <p className="text-gray-400 text-xs mt-1">Once students enroll in your sprints, they'll appear here.</p>
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {/* SECTION B: NON-SPRINT EXPERIENCES (IGNITE, RISEBLOG, CHALLENGE) */}
                    {(experienceTypeFilter === 'all' || experienceTypeFilter !== 'sprint') && (
                        <div className="space-y-6">
                            {experienceTypeFilter === 'all' && (
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-purple-600" />
                                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">
                                            Other Experiences (Ignite, Riseblog, Challenge)
                                        </h2>
                                    </div>
                                </div>
                            )}

                            {filteredNonSprintExperiences.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredNonSprintExperiences.map((exp) => {
                                        const ct = String(exp.contentType || 'ignite').toLowerCase();
                                        const isIgnite = ct === 'ignite';
                                        const isBlog = ct === 'blog';
                                        const isChallenge = ct === 'challenge';

                                        return (
                                            <div
                                                key={exp.id}
                                                onClick={() => setViewingExperienceTracker(exp)}
                                                className="bg-white rounded-[2rem] border-2 border-gray-100 p-6 shadow-sm hover:border-[#0E7850]/30 hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer group"
                                            >
                                                <div className="space-y-4">
                                                    {/* Top Badges */}
                                                    <div className="flex items-center justify-between">
                                                        <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 ${
                                                            isIgnite ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                                            isBlog ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                            'bg-amber-50 text-amber-700 border border-amber-100'
                                                        }`}>
                                                            {isIgnite && <Sparkles className="w-3 h-3" />}
                                                            {isBlog && <BookOpen className="w-3 h-3" />}
                                                            {isChallenge && <Trophy className="w-3 h-3" />}
                                                            <span>{isIgnite ? 'Ignite' : isBlog ? 'Riseblog' : 'Challenge'}</span>
                                                        </span>

                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                            {formatTimeAgo(exp.createdAt)}
                                                        </span>
                                                    </div>

                                                    {/* Card Preview / Content Snippet */}
                                                    {isIgnite && (
                                                        <div 
                                                            className="p-5 rounded-2xl text-white shadow-inner flex flex-col justify-between min-h-[120px]"
                                                            style={{ backgroundColor: exp.igniteBgColor || '#6D28D9' }}
                                                        >
                                                            <p className="text-xs font-black leading-relaxed line-clamp-3">
                                                                "{exp.igniteBody || exp.description || 'Sparks of daily inspiration'}"
                                                            </p>
                                                            {exp.igniteDate && (
                                                                <span className="text-[9px] font-bold text-white/80 uppercase tracking-widest mt-2">
                                                                    Scheduled: {exp.igniteDate}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {isBlog && (
                                                        <div className="space-y-3">
                                                            {exp.blogImage || exp.coverImageUrl ? (
                                                                <div className="w-full h-32 rounded-2xl overflow-hidden bg-gray-900">
                                                                    <img 
                                                                        src={exp.blogImage || exp.coverImageUrl} 
                                                                        alt="" 
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                    />
                                                                </div>
                                                            ) : null}
                                                            <h3 className="text-sm font-black text-gray-900 leading-snug line-clamp-2">
                                                                {exp.title}
                                                            </h3>
                                                        </div>
                                                    )}

                                                    {isChallenge && (
                                                        <div className="space-y-2">
                                                            <h3 className="text-sm font-black text-gray-900 leading-snug">
                                                                {exp.title}
                                                            </h3>
                                                            <p className="text-xs text-gray-500 font-medium line-clamp-2">
                                                                {exp.challengeData?.whatToDo || exp.description || 'Action-driven habit challenge'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Bottom Action & Live View/Like Counters */}
                                                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1 text-gray-500 text-xs font-bold">
                                                            <Eye className="w-3.5 h-3.5 text-gray-400" />
                                                            <span>{exp.views || 0}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-rose-500 text-xs font-bold">
                                                            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                                                            <span>{exp.likes || 0}</span>
                                                        </div>
                                                    </div>

                                                    <span className="text-[10px] font-black text-[#0E7850] uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                        <span>View Accounts</span>
                                                        <span>&rarr;</span>
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-20 text-center flex flex-col items-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
                                    <Sparkles className="w-10 h-10 text-gray-300 mb-3" />
                                    <h3 className="text-lg font-bold text-gray-800">No Experiences Found</h3>
                                    <p className="text-gray-400 text-xs mt-1">Create an Ignite spark, Riseblog article, or Challenge to track viewer accounts.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* 3. NON-SPRINT VIEW & LIKES ACCOUNT TRACKER MODAL */}
            <AnimatePresence>
                {viewingExperienceTracker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 16 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 16 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-1 bg-[#0E7850]/10 text-[#0E7850] text-[9px] font-black uppercase tracking-widest rounded-md">
                                            {viewingExperienceTracker.contentType?.toUpperCase() || 'EXPERIENCE'}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase">
                                            Account Tracker
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-black text-gray-900 leading-tight">
                                        {viewingExperienceTracker.title || viewingExperienceTracker.igniteBody?.slice(0, 40) || 'Experience Analytics'}
                                    </h3>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setViewingExperienceTracker(null)}
                                    className="p-2.5 rounded-full bg-white hover:bg-gray-100 text-gray-500 border border-gray-200 transition-all cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Quick Metrics Bar */}
                            <div className="p-6 grid grid-cols-2 gap-4 bg-white border-b border-gray-100">
                                <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Eye className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Views</p>
                                        <p className="text-2xl font-black text-gray-900">{trackerInteractions.viewCount}</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                        <Heart className="w-5 h-5 fill-rose-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Likes</p>
                                        <p className="text-2xl font-black text-rose-600">{trackerInteractions.likeCount}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tab Switcher: Views vs Likes */}
                            <div className="px-6 pt-4 flex items-center justify-between gap-4">
                                <div className="inline-flex p-1 bg-gray-100 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setTrackerActiveTab('views')}
                                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                                            trackerActiveTab === 'views'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Views ({trackerInteractions.viewCount})</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setTrackerActiveTab('likes')}
                                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                                            trackerActiveTab === 'likes'
                                                ? 'bg-white text-rose-600 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                    >
                                        <Heart className="w-3.5 h-3.5" />
                                        <span>Likes ({trackerInteractions.likeCount})</span>
                                    </button>
                                </div>

                                {/* Account Search Input */}
                                <div className="relative min-w-[180px]">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search account..."
                                        value={trackerSearchTerm}
                                        onChange={(e) => setTrackerSearchTerm(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-primary transition-all"
                                    />
                                </div>
                            </div>

                            {/* Accounts List */}
                            <div className="p-6 overflow-y-auto flex-1 space-y-3 custom-scrollbar min-h-[220px]">
                                {isTrackerLoading ? (
                                    <div className="py-12 text-center flex flex-col items-center">
                                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Accounts...</p>
                                    </div>
                                ) : filteredTrackerAccounts.length > 0 ? (
                                    filteredTrackerAccounts.map((acc, aIdx) => (
                                        <div
                                            key={acc.userId || aIdx}
                                            className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-emerald-50/40 hover:border-emerald-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={acc.userPhoto || `https://picsum.photos/seed/${acc.userId}/80/80`}
                                                    alt=""
                                                    className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                                                />
                                                <div>
                                                    <p className="text-xs font-black text-gray-900 leading-tight">
                                                        {acc.userName}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-medium truncate max-w-[200px] sm:max-w-none">
                                                        {acc.userEmail}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                                                    {formatTimestamp(acc.timestamp)}
                                                </span>
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                                    trackerActiveTab === 'views' 
                                                        ? 'bg-blue-100 text-blue-700' 
                                                        : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                    {trackerActiveTab === 'views' ? 'Viewed' : 'Liked'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 text-center flex flex-col items-center text-gray-400">
                                        <UserCheck className="w-8 h-8 text-gray-300 mb-2" />
                                        <p className="text-xs font-bold uppercase tracking-wider">
                                            No {trackerActiveTab} recorded yet
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            When participants interact with this experience, their accounts will appear here.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 px-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
                                <button
                                    type="button"
                                    onClick={() => setViewingExperienceTracker(null)}
                                    className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-all cursor-pointer"
                                >
                                    Close Tracker
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CoachParticipants;
