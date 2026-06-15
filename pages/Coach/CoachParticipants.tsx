import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_USERS } from '../../services/mockData';
import { Participant, Sprint, ParticipantSprint, CoachingComment, UserRole } from '../../types';
import Button from '../../components/Button';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { chatService } from '../../services/chatService';
import { notificationService } from '../../services/notificationService';

interface ExtendedEnrollment extends ParticipantSprint {
    student: Participant;
    sprint: Sprint;
    isActiveToday: boolean;
    completedCount: number;
    currentMilestoneDay: number;
}

const CoachParticipants: React.FC = () => {
    const { user } = useAuth();
    const [selectedSprintId, setSelectedSprintId] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [sortBy, setSortBy] = useState<'recent' | 'progress'>('recent');
    const [allEnrollments, setAllEnrollments] = useState<ExtendedEnrollment[]>([]);
    const [mySprints, setMySprints] = useState<Sprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [viewingSubmission, setViewingSubmission] = useState<{enrollment: ExtendedEnrollment, day: number} | null>(null);
    const [activePreviewTaskIndex, setActivePreviewTaskIndex] = useState(0);
    const [isContentExpanded, setIsContentExpanded] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [promptText, setPromptText] = useState('');
    const [chatMessage, setChatMessage] = useState('');
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);
    const [feedbackSent, setFeedbackSent] = useState(false);

    const [dayComments, setDayComments] = useState<CoachingComment[]>([]);
    const [focusedCommentId, setFocusedCommentId] = useState<string | null>(null);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setIsLoading(true);

            try {
                let coachSprints: Sprint[] = [];
                
                if (user.role === UserRole.ADMIN) {
                    // Admins in coach mode see specific categories
                    const adminSprints = await sprintService.getAdminCoachSprints();
                    const myOwnSprints = await sprintService.getCoachSprints(user.id);
                    
                    // Combine and deduplicate
                    const combined = [...adminSprints, ...myOwnSprints];
                    const uniqueIds = new Set();
                    coachSprints = combined.filter(s => {
                        if (uniqueIds.has(s.id)) return false;
                        uniqueIds.add(s.id);
                        return true;
                    });
                } else {
                    coachSprints = await sprintService.getCoachSprints(user.id);
                }

                const approvedSprints = coachSprints.filter(s => s.approvalStatus === 'approved');
                setMySprints(approvedSprints);

                const mySprintIds = approvedSprints
                    .map(s => s.id)
                    .filter(id => !!id);

                if (mySprintIds.length === 0) {
                    setAllEnrollments([]);
                    setIsLoading(false);
                    return;
                }

                const enrollments = await sprintService.getEnrollmentsForSprints(mySprintIds);
                const uniqueParticipantIds = Array.from(new Set(enrollments.map(e => e.user_id))) as string[];
                const dbParticipants = await userService.getUsersByIds(uniqueParticipantIds);

                const now = new Date();
                const enriched = enrollments.map(ps => {
                    const student = dbParticipants.find(u => u.id === ps.user_id) || 
                                   MOCK_USERS.find(u => u.id === ps.user_id) as Participant;
                    const sprint = approvedSprints.find(s => s.id === ps.sprint_id) as Sprint;
                    
                    if (!sprint || !student) return null;

                    const completions = ps.progress.filter(p => p.completed);
                    const lastCompletion = completions.length > 0 
                        ? [...completions].sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())[0]
                        : null;

                    const isActiveToday = lastCompletion 
                        ? (now.getTime() - new Date(lastCompletion.completedAt!).getTime()) < (24 * 60 * 60 * 1000)
                        : false;

                    const nextIncomplete = ps.progress.find(p => !p.completed);

                    return {
                        ...ps,
                        student,
                        sprint,
                        isActiveToday,
                        completedCount: completions.length,
                        currentMilestoneDay: nextIncomplete ? nextIncomplete.day : sprint.duration
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
                    setIsContentExpanded(false);
                    setIsChatOpen(false);
                    setViewingSubmission({ enrollment: matchingEnrollment, day });
                    // Clean URL query parameters
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, '', newUrl);
                }
            }
        }
    }, [isLoading, allEnrollments]);

    useEffect(() => {
        if (!viewingSubmission || !user) {
            setDayComments([]);
            return;
        }
        
        setActivePreviewTaskIndex(0);

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

    useEffect(() => {
        if (chatScrollRef.current && isChatOpen) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [dayComments, isChatOpen]);

    const filteredEnrollments = useMemo(() => {
        return allEnrollments.filter(e => {
            const matchesSprint = selectedSprintId === 'all' || e.sprint_id === selectedSprintId;
            const matchesSearch = e.student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 e.sprint.title.toLowerCase().includes(searchTerm.toLowerCase());
            
            let matchesStatus = true;
            if (statusFilter === 'active') {
                matchesStatus = e.completedCount < e.sprint.duration;
            } else if (statusFilter === 'inactive') {
                matchesStatus = e.completedCount === e.sprint.duration;
            }

            return matchesSprint && matchesSearch && matchesStatus;
        }).sort((a, b) => {
            if (sortBy === 'recent') {
                const dateA = new Date(a.started_at || 0).getTime();
                const dateB = new Date(b.started_at || 0).getTime();
                return dateB - dateA;
            } else {
                return b.completedCount - a.completedCount;
            }
        });
    }, [allEnrollments, selectedSprintId, searchTerm, statusFilter, sortBy]);

    const handleSendFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = feedbackText.trim() || chatMessage.trim();
        if (!content || !user || !viewingSubmission) return;

        setIsSendingFeedback(true);
        const newMessage: Omit<CoachingComment, 'id'> = {
            sprintId: viewingSubmission.enrollment.sprint_id,
            day: viewingSubmission.day,
            participantId: viewingSubmission.enrollment.user_id,
            authorId: user.id,
            content: content,
            prompt: promptText.trim() || undefined,
            timestamp: new Date().toISOString(),
            read: false
        };

        try {
            await chatService.sendMessage(newMessage);
            
            await notificationService.createNotification(
                viewingSubmission.enrollment.user_id, 
                'coach_message',
                'New Coaching Guidance',
                `Coach ${user.name} sent feedback for Day ${viewingSubmission.day} of ${viewingSubmission.enrollment.sprint.title}`,
                { 
                    actionUrl: `/participant/sprint/${viewingSubmission.enrollment.id}?day=${viewingSubmission.day}&openChat=true`,
                    bypassActiveCheck: true
                }
            );

            setFeedbackSent(true);
            setFeedbackText('');
            setPromptText('');
            setChatMessage('');
            setTimeout(() => setFeedbackSent(false), 3000);
        } catch (error) {
            console.error("Failed to send feedback", error);
        } finally {
            setIsSendingFeedback(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!viewingSubmission) return;
        try {
            await chatService.deleteMessage(commentId);
            // Reload comments
            const dayMessages = await chatService.getConversation(
                viewingSubmission.enrollment.sprint_id, 
                viewingSubmission.enrollment.user_id,
                viewingSubmission.day
            );
            setDayComments(dayMessages);
        } catch (err) {
            console.error("Failed to delete comment:", err);
        }
    };

    const hasAlreadySentFeedback = useMemo(() => {
        if (!user) return false;
        return dayComments.some(c => c.authorId === user.id);
    }, [dayComments, user]);

    if (!user) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
            {!viewingSubmission ? (
                <>
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Participant Tracker</h1>
                            <p className="text-gray-500 font-medium">Tracking students in your {mySprints.length} live programs.</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                            <div className="relative min-w-[200px]">
                                <input 
                                    type="text"
                                    placeholder="Search student/sprint..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 placeholder:text-gray-400 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none shadow-sm h-11"
                                />
                                <svg className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            </div>
                            <select 
                                value={selectedSprintId}
                                onChange={(e) => setSelectedSprintId(e.target.value)}
                                className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-black text-gray-700 focus:ring-4 focus:ring-primary/10 outline-none shadow-sm cursor-pointer h-11 min-w-[160px]"
                            >
                                <option value="all">All Sprints</option>
                                {mySprints.map(s => (
                                    <option key={s.id} value={s.id}>{s.title}</option>
                                ))}
                            </select>
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-black text-gray-700 focus:ring-4 focus:ring-primary/10 outline-none shadow-sm cursor-pointer h-11 min-w-[140px]"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="inactive">Completed</option>
                            </select>
                            <select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-black text-gray-700 focus:ring-4 focus:ring-primary/10 outline-none shadow-sm cursor-pointer h-11 min-w-[160px]"
                            >
                                <option value="recent">Most Recent First</option>
                                <option value="progress">Highest Progress</option>
                            </select>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Syncing Registry Data...</p>
                        </div>
                    ) : filteredEnrollments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredEnrollments.map((e) => {
                                const latestCompleted = [...e.progress].filter(p => p.completed).sort((a,b) => b.day - a.day)[0];
                                const displayDay = latestCompleted ? latestCompleted.day : 1;
                                const subData = e.progress.find(p => p.day === displayDay);

                                return (
                                    <div key={e.id} className="bg-white rounded-[2rem] border-2 border-gray-100 p-6 shadow-sm hover:border-primary/10 hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
                                        <div>
                                            {/* Profile and connection/chat quick access */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <img src={e.student.profileImageUrl || 'https://picsum.photos/seed/student/100/100'} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm" />
                                                        {e.isActiveToday && (
                                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 leading-tight">{e.student.name}</p>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">Started {formatTimeAgo(e.started_at)}</p>
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={() => {
                                                        setIsContentExpanded(false);
                                                        setViewingSubmission({ enrollment: e, day: displayDay });
                                                        setIsChatOpen(true);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all border border-transparent hover:border-primary/10 cursor-pointer"
                                                    title="Open direct discussion channel"
                                                >
                                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* Sprint detail info text */}
                                            <div className="mb-4">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                                    {e.sprint.title} • {e.completedCount} / {e.sprint.duration} Days
                                                </p>
                                            </div>

                                            {/* Required structural divider: "----" */}
                                            <div className="border-t border-gray-100 my-3"></div>

                                            {/* Progress symbol dots block: "■■■■■     those dots for each day" */}
                                            <div className="mb-4">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5 label-dots">Schedule Tracker</p>
                                                <div className="flex gap-1 items-center flex-wrap">
                                                    {e.progress.map((p) => {
                                                        const isCompleted = p.completed;
                                                        const isCurrentMilestone = !isCompleted && p.day === e.currentMilestoneDay;
                                                        return (
                                                            <button 
                                                                key={p.day}
                                                                onClick={() => {
                                                                    if (isCompleted) {
                                                                        setIsContentExpanded(false);
                                                                        setIsChatOpen(false);
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

                                        {/* Review Day present day trigger button */}
                                        <div className="mt-2 pt-2 border-t border-gray-50 flex flex-col">
                                            <button 
                                                onClick={() => {
                                                    setIsContentExpanded(false);
                                                    setIsChatOpen(false);
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
                        <div className="py-32 text-center flex flex-col items-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <svg className="h-10 w-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">No Participants Found</h3>
                            <p className="text-gray-400 max-w-sm px-6">Once students enroll in your live sprints and start submitting tasks, they'll appear here automatically.</p>
                        </div>
                    )}
                </>
            ) : (
                <div className="space-y-8 animate-fade-in">
                    {/* Header bar and day switches */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-6">
                        <div>
                            <button 
                                onClick={() => setViewingSubmission(null)}
                                className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 hover:text-primary tracking-widest transition-all mb-3 cursor-pointer"
                            >
                                &larr; Back to Tracker
                            </button>
                            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Day {viewingSubmission.day} Review</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                                {viewingSubmission.enrollment.student.name} • {viewingSubmission.enrollment.sprint.title}
                            </p>
                        </div>

                        {/* Pagination switches */}
                        <div className="inline-flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                            {(() => {
                                const currentDay = viewingSubmission.day;
                                const doneDays = (viewingSubmission.enrollment.progress || [])
                                    .filter(p => p.completed)
                                    .map(p => p.day)
                                    .sort((a, b) => a - b);
                                
                                // Ensure current active day is included safely
                                if (!doneDays.includes(currentDay)) {
                                    doneDays.push(currentDay);
                                    doneDays.sort((a, b) => a - b);
                                }

                                const currentIndex = doneDays.indexOf(currentDay);
                                let visibleDays: number[] = [];

                                if (doneDays.length <= 3) {
                                    visibleDays = [...doneDays];
                                } else {
                                    if (currentIndex === 0) {
                                        visibleDays = doneDays.slice(0, 3);
                                    } else if (currentIndex === doneDays.length - 1) {
                                        visibleDays = doneDays.slice(doneDays.length - 3);
                                    } else {
                                        visibleDays = doneDays.slice(currentIndex - 1, currentIndex + 2);
                                    }
                                }

                                return visibleDays.map((d) => {
                                    const isActive = d === currentDay;
                                    return (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => {
                                                setViewingSubmission({
                                                    ...viewingSubmission,
                                                    day: d
                                                });
                                            }}
                                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                                isActive 
                                                    ? 'bg-primary text-white shadow-md' 
                                                    : 'text-gray-400 hover:text-primary hover:bg-gray-50'
                                            }`}
                                        >
                                            Day {d}{isActive ? '(active)' : ''}
                                        </button>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    {/* Highly responsive side-by-side workspace split grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* LEFT COLUMN: Lesson materials & Student response context */}
                        <div className="lg:col-span-7 space-y-6">
                            {/* Lesson materials context */}
                            <div className="border-2 border-slate-100 rounded-3xl overflow-hidden bg-white shadow-sm hover:shadow hover:border-emerald-100/50 transition-all duration-300">
                                <button 
                                    type="button"
                                    onClick={() => setIsContentExpanded(!isContentExpanded)}
                                    className="w-full px-6 py-4.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between hover:bg-slate-100/80 transition-colors text-left focus:outline-none cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                        </div>
                                        <span className="text-[11px] font-black text-gray-700 uppercase tracking-widest">Day {viewingSubmission.day} Daily Lesson Guide</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/60 px-2.5 py-1 rounded-full uppercase tracking-wider">Active Lesson</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4.5 w-4.5 text-gray-500 transition-transform duration-300 ${isContentExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </button>
                                {isContentExpanded && (
                                    <div className="p-6 bg-white space-y-4 animate-fade-in border-t border-slate-100">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">Lesson Text</h4>
                                        <div className="text-sm text-gray-800 leading-relaxed font-semibold bg-emerald-50/20 border border-emerald-100/30 p-5 rounded-[1.5rem] relative">
                                            <span className="absolute -top-3 left-4 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase tracking-wider rounded-md shadow-sm">Expository Material</span>
                                            <p className="whitespace-pre-line mt-1.5 italic font-sans block text-gray-805 leading-relaxed">
                                                {(() => {
                                                    const contentData = Array.isArray(viewingSubmission.enrollment.sprint.dailyContent) 
                                                        ? viewingSubmission.enrollment.sprint.dailyContent.find(c => c.day === viewingSubmission.day) 
                                                        : null;
                                                    return contentData?.lessonText || "No lesson text recorded.";
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Student's Submissions */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-yellow-400 rounded-full"></div>
                                    <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Student's Submission</h4>
                                </div>
                                
                                {(() => {
                                    const progressObj = viewingSubmission.enrollment.progress.find(p => p.day === viewingSubmission.day);
                                    const sub = progressObj?.submission;
                                    
                                    if (!sub) {
                                        return (
                                            <div className="p-10 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200 text-center animate-fade-in">
                                                <p className="text-gray-400 italic text-sm font-bold uppercase tracking-widest">No text content provided</p>
                                            </div>
                                        );
                                    }

                                    const contentData = Array.isArray(viewingSubmission.enrollment.sprint.dailyContent) 
                                        ? viewingSubmission.enrollment.sprint.dailyContent.find(c => c.day === viewingSubmission.day) 
                                        : null;
                                    const prompts = contentData?.taskPrompts || (contentData?.taskPrompt ? [contentData.taskPrompt] : []);
                                    const inputTypes = contentData?.taskInputTypes || [];
                                    const answers = progressObj?.answers || sub.split(' | ');

                                    const itemsToDisplay = prompts.length > 0
                                        ? prompts.map((promptText, i) => ({
                                              prompt: promptText,
                                              answer: answers[i] || '',
                                              type: inputTypes[i] || 'text',
                                              index: i
                                          }))
                                        : answers.map((ans, i) => ({
                                              prompt: `Task Question ${i + 1}`,
                                              answer: ans,
                                              type: 'text',
                                              index: i
                                          }));

                                    return (
                                        <div className="space-y-4 animate-fade-in">
                                            <div className="flex items-center justify-between px-1">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Step Responses Deck</h4>
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                                                    Swipe Sideways ➔
                                                </span>
                                            </div>
                                            <div className="flex gap-4 overflow-x-auto pb-6 pt-1 px-1 snap-x snap-mandatory scrollbar-hidden">
                                                {itemsToDisplay.map((item, idx) => {
                                                    const isArrayFormat = typeof item.answer === 'string' && item.answer.trim().startsWith('[') && item.answer.trim().endsWith(']');
                                                    const isTagOrPollType = item.type === 'tags' || item.type === 'poll' || isArrayFormat;
                                                    let tags: string[] = [];
                                                    let displayAsTags = false;
                                                    if (isTagOrPollType && item.answer) {
                                                        if (isArrayFormat) {
                                                            try {
                                                                const parsed = JSON.parse(item.answer);
                                                                if (Array.isArray(parsed)) {
                                                                    tags = parsed.map(String).filter(Boolean);
                                                                    displayAsTags = true;
                                                                }
                                                            } catch (e) {}
                                                        }
                                                        if (!displayAsTags && (item.type === 'tags' || item.type === 'poll')) {
                                                            tags = item.answer.split(',').map((t: string) => t.trim()).filter(Boolean);
                                                            displayAsTags = true;
                                                        }
                                                    }

                                                    return (
                                                        <div key={idx} className="flex-shrink-0 w-[290px] sm:w-[325px] md:w-[360px] bg-white rounded-[2rem] border-2 border-gray-100 shadow-sm p-6 snap-start flex flex-col justify-between hover:border-primary/10 transition-all duration-300 min-h-[300px]">
                                                            <div className="space-y-4 flex flex-col h-full justify-between">
                                                                <div>
                                                                    <div className="text-[10px] font-black text-primary uppercase tracking-[0.15em] mb-1">
                                                                        Question {item.index + 1}
                                                                    </div>
                                                                    <p className="text-sm font-black text-gray-800 leading-tight line-clamp-3" title={item.prompt}>
                                                                        "{item.prompt}"
                                                                    </p>
                                                                    {contentData?.taskFootnotes?.[item.index] && (
                                                                        <div className="text-xs text-emerald-600 font-bold leading-relaxed mt-1 italic pl-1 truncate" title={contentData.taskFootnotes[item.index]}>
                                                                            {contentData.taskFootnotes[item.index]}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="border-t border-gray-50 my-2"></div>

                                                                <div className="flex-1 flex flex-col justify-end">
                                                                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                                                        Submitted Response
                                                                    </div>
                                                                    
                                                                    {displayAsTags ? (
                                                                        <div className="flex flex-wrap gap-1.5 py-1 max-h-[140px] overflow-y-auto custom-scrollbar">
                                                                            {tags.length > 0 ? (
                                                                                tags.map((tag, tIdx) => (
                                                                                    <span 
                                                                                        key={tIdx} 
                                                                                        className="inline-flex items-center px-3 py-1 rounded-xl text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 shadow-sm animate-fade-in uppercase tracking-wider h-fit"
                                                                                    >
                                                                                        {tag}
                                                                                    </span>
                                                                                ))
                                                                            ) : (
                                                                                <span className="text-xs text-gray-400 font-medium italic">Empty tags submitted</span>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-gray-900 font-bold text-sm whitespace-pre-wrap leading-relaxed py-1 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                                                                            {item.answer || <span className="text-gray-350 italic font-medium text-xs">No response provided</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Attached resource download option */}
                                {viewingSubmission.enrollment.progress.find(p => p.day === viewingSubmission.day)?.submissionFileUrl && (
                                    <div className="flex flex-col sm:flex-row items-center gap-4 p-5 bg-blue-50 border-2 border-blue-100 rounded-[1.5rem]">
                                        <div className="bg-white p-3 rounded-2xl text-blue-600 shadow-sm">
                                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                        </div>
                                        <div className="flex-1 min-w-0 text-center sm:text-left">
                                            <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Attached Resource</p>
                                            <p className="text-[10px] text-blue-600 font-bold truncate">{viewingSubmission.enrollment.progress.find(p => p.day === viewingSubmission.day)?.submissionFileUrl}</p>
                                        </div>
                                        <a 
                                            href={viewingSubmission.enrollment.progress.find(p => p.day === viewingSubmission.day)?.submissionFileUrl} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="w-full sm:w-auto text-center px-5 py-2.5 bg-white text-blue-600 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm hover:shadow-md transition-all border border-blue-100"
                                        >
                                            Download
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Real-time, instant-access direct feedback and comments correspondence */}
                        <div className="lg:col-span-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Coaching Correspondence & feedback</h4>
                            </div>

                            <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col h-[520px] lg:h-[620px]">
                                <div className="px-6 py-4 border-b border-gray-150 flex justify-between items-center bg-gray-50/50">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Direct Channel</span>
                                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">Day {viewingSubmission.day} History</span>
                                </div>
                                
                                {/* Messages viewport */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gray-50/10" ref={chatScrollRef}>
                                    {dayComments.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-300 text-center px-4 py-8">
                                            <svg className="h-8 w-8 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                            <p className="text-[10px] font-black uppercase tracking-widest">No history yet.</p>
                                            <p className="text-[9px] font-bold text-gray-400 mt-1 max-w-xs">Send custom suggestions or active milestones below to begin communication loops.</p>
                                        </div>
                                    ) : (
                                        dayComments.map(comment => {
                                            const isMe = comment.authorId === user.id;
                                            return (
                                                <div key={comment.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <div 
                                                        onClick={() => setFocusedCommentId(focusedCommentId === comment.id ? null : comment.id)}
                                                        className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs shadow-sm relative cursor-pointer select-none transition-all duration-200 hover:scale-[0.99] active:scale-[0.97] hover:ring-2 hover:ring-red-100/50 ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'} ${focusedCommentId === comment.id ? 'ring-2 ring-red-300' : ''}`}
                                                    >
                                                        {isMe && (
                                                            <span className="text-[8px] font-black text-primary/70 uppercase tracking-widest mb-1.5 block">Today's Feedback</span>
                                                        )}
                                                        {!isMe && (
                                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Participant</span>
                                                        )}
                                                        <p className="font-semibold leading-relaxed">{comment.content}</p>
                                                        {comment.prompt && (
                                                            <div className="mt-2 pt-2 border-t border-white/20">
                                                                <p className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">Next Step/Prompt:</p>
                                                                <p className="font-bold italic">"{comment.prompt}"</p>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center justify-between mt-1 gap-2 border-t border-black/5 pt-1.5">
                                                            <div className="min-h-[16px] flex items-center">
                                                                {focusedCommentId === comment.id && !isDeletingId && (
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation(); // Stop click from toggling bubble focus
                                                                            setIsDeletingId(comment.id);
                                                                            await handleDeleteComment(comment.id);
                                                                            setIsDeletingId(null);
                                                                            setFocusedCommentId(null);
                                                                        }}
                                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white font-black text-[8px] uppercase tracking-widest rounded-md shadow-sm transition-all focus:outline-none"
                                                                        title="Permanently remove message"
                                                                    >
                                                                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                        Delete
                                                                    </button>
                                                                )}
                                                                {isDeletingId === comment.id && (
                                                                    <span className="text-[8px] text-red-500 font-black uppercase tracking-widest animate-pulse">Deleting...</span>
                                                                )}
                                                            </div>
                                                            <span className={`text-[7px] font-black uppercase tracking-tighter ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                                                                {new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Form submission controls */}
                                <div className="p-4 bg-white border-t border-gray-100">
                                    <form onSubmit={handleSendFeedback} className="relative flex items-center bg-white border border-gray-200 rounded-2xl shadow-sm focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-primary transition-all">
                                        <input 
                                            type="text"
                                            value={feedbackText.trim() ? feedbackText : chatMessage}
                                            onChange={(e) => {
                                                setFeedbackText(e.target.value);
                                                setChatMessage(e.target.value);
                                            }}
                                            placeholder="Write message to participant..."
                                            className="w-full pl-5 pr-14 py-3.5 bg-transparent text-sm font-semibold text-gray-800 outline-none placeholder:text-gray-400"
                                            required
                                        />
                                        <button 
                                            type="submit"
                                            disabled={(!feedbackText.trim() && !chatMessage.trim()) || isSendingFeedback}
                                            className="absolute right-2 w-9 h-9 flex items-center justify-center bg-primary text-white rounded-xl shadow-sm hover:shadow hover:bg-primary/95 transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95"
                                            title="Send Message"
                                        >
                                            {isSendingFeedback ? (
                                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform rotate-45 -translate-x-[1px] translate-y-[1px]" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                                </svg>
                                            )}
                                        </button>
                                    </form>
                                    
                                    {feedbackSent && (
                                        <p className="text-center text-[9px] font-black text-green-600 uppercase tracking-widest mt-2 animate-fade-in">Guidance delivered perfectly.</p>
                                    )}
                                </div>
                            </div>

                            {/* Back and finish review control */}
                            <button 
                                type="button"
                                onClick={() => setViewingSubmission(null)}
                                className="w-full py-4 bg-white hover:bg-gray-50 text-gray-450 font-black text-[10px] uppercase tracking-[0.25em] rounded-2xl transition-all border border-gray-150 shadow-sm"
                            >
                                Finish Daily Review &larr;
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                  from { transform: translateY(30px); opacity: 0; }
                  to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up {
                  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out forwards;
                }
                .custom-scrollbar::-webkit-scrollbar {
                  width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: #e5e7eb;
                  border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: #d1d5db;
                }
                .scrollbar-hidden::-webkit-scrollbar {
                  display: none;
                }
                .scrollbar-hidden {
                  -ms-overflow-style: none; /* IE and Edge */
                  scrollbar-width: none; /* Firefox */
                }
            `}</style>
        </div>
    );
};

const formatTimeAgo = (dateString: string) => {
    const diff = new Date().getTime() - new Date(dateString).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
};

export default CoachParticipants;