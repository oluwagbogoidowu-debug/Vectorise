import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_USERS } from '../../services/mockData';
import { Participant, Sprint, ParticipantSprint, CoachingComment } from '../../types';
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
    const [allEnrollments, setAllEnrollments] = useState<ExtendedEnrollment[]>([]);
    const [mySprints, setMySprints] = useState<Sprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Detail Modal States
    const [viewingSubmission, setViewingSubmission] = useState<{enrollment: ExtendedEnrollment, day: number} | null>(null);
    const [isContentExpanded, setIsContentExpanded] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [chatMessage, setChatMessage] = useState('');
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);
    const [feedbackSent, setFeedbackSent] = useState(false);
    const [dayComments, setDayComments] = useState<CoachingComment[]>([]);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setIsLoading(true);

            try {
                const coachSprints = await sprintService.getCoachSprints(user.id);
                const approvedSprints = coachSprints.filter(s => s.approvalStatus === 'approved');
                setMySprints(approvedSprints);

                const mySprintIds = approvedSprints
                    .map(s => s.id)
                    .filter(id => id !== undefined && id !== null && id !== '');

                if (mySprintIds.length === 0) {
                    setAllEnrollments([]);
                    setIsLoading(false);
                    return;
                }

                const enrollments = await sprintService.getEnrollmentsForSprints(mySprintIds);
                const uniqueParticipantIds = Array.from(new Set(enrollments.map(e => e.participantId)));
                const dbParticipants = await userService.getUsersByIds(uniqueParticipantIds);

                const now = new Date();
                const enriched = enrollments.map(ps => {
                    const student = dbParticipants.find(u => u.id === ps.participantId) || 
                                   MOCK_USERS.find(u => u.id === ps.participantId) as Participant;
                    const sprint = approvedSprints.find(s => s.id === ps.sprintId) as Sprint;
                    
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

    // Fetch and Sync Chat for Modal
    useEffect(() => {
        if (!viewingSubmission || !user) {
            setDayComments([]);
            return;
        }

        const fetchChat = async () => {
            const allMessages = await chatService.getConversation(
                viewingSubmission.enrollment.sprintId, 
                viewingSubmission.enrollment.participantId
            );
            setDayComments(allMessages.filter(c => c.day === viewingSubmission.day));
        };

        fetchChat();
        const interval = setInterval(fetchChat, 3000);
        return () => clearInterval(interval);
    }, [viewingSubmission, user]);

    // Scroll chat to bottom
    useEffect(() => {
        if (chatScrollRef.current && isChatOpen) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [dayComments, isChatOpen]);

    const filteredEnrollments = useMemo(() => {
        return allEnrollments.filter(e => {
            const matchesSprint = selectedSprintId === 'all' || e.sprintId === selectedSprintId;
            const matchesSearch = e.student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 e.sprint.title.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSprint && matchesSearch;
        }).sort((a, b) => {
            if (a.isActiveToday && !b.isActiveToday) return -1;
            if (!a.isActiveToday && b.isActiveToday) return 1;
            return b.completedCount - a.completedCount;
        });
    }, [allEnrollments, selectedSprintId, searchTerm]);

    const handleSendFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = feedbackText.trim() || chatMessage.trim();
        if (!content || !user || !viewingSubmission) return;

        setIsSendingFeedback(true);
        const newMessage: Omit<CoachingComment, 'id'> = {
            sprintId: viewingSubmission.enrollment.sprintId,
            day: viewingSubmission.day,
            participantId: viewingSubmission.enrollment.participantId,
            authorId: user.id,
            content: content,
            timestamp: new Date().toISOString(),
            read: false
        };

        try {
            await chatService.sendMessage(newMessage);
            
            // Fix: Corrected positional arguments for createNotification and used valid type 'coach_message'.
            await notificationService.createNotification(
                viewingSubmission.enrollment.participantId, 
                'coach_message',
                'New Coaching Guidance',
                `Coach ${user.name} sent feedback for Day ${viewingSubmission.day} of ${viewingSubmission.enrollment.sprint.title}`,
                { 
                    actionUrl: `/participant/sprint/${viewingSubmission.enrollment.id}?day=${viewingSubmission.day}&openChat=true` 
                }
            );

            setFeedbackSent(true);
            setFeedbackText('');
            setChatMessage('');
            setTimeout(() => setFeedbackSent(false), 3000);
        } catch (error) {
            console.error("Failed to send feedback", error);
        } finally {
            setIsSendingFeedback(false);
        }
    };

    const hasAlreadySentFeedback = useMemo(() => {
        if (!user) return false;
        return dayComments.some(c => c.authorId === user.id);
    }, [dayComments, user]);

    if (!user) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Participant Tracker</h1>
                    <p className="text-gray-500 font-medium">Tracking students in your {mySprints.length} live programs.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <input 
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none shadow-sm"
                        />
                        <svg className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </div>
                    <select 
                        value={selectedSprintId}
                        onChange={(e) => setSelectedSprintId(e.target.value)}
                        className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 focus:ring-4 focus:ring-primary/10 outline-none min-w-[220px] shadow-sm cursor-pointer"
                    >
                        <option value="all">All Live Sprints</option>
                        {mySprints.map(s => (
                            <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Syncing Registry Data...</p>
                </div>
            ) : filteredEnrollments.length > 0 ? (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-100">
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Participant</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sprint Program</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress (Click Day to Review)</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Latest Task</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Connect</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredEnrollments.map((e) => {
                                const latestCompleted = [...e.progress].filter(p => p.completed).sort((a,b) => b.day - a.day)[0];
                                const displayDay = latestCompleted ? latestCompleted.day : 1;
                                const subData = e.progress.find(p => p.day === displayDay);

                                return (
                                    <tr key={e.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <img src={e.student.profileImageUrl} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm" />
                                                    {e.isActiveToday && (
                                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{e.student.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Started {formatTimeAgo(e.startDate)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-xs font-black text-primary uppercase mb-1.5">{e.sprint.title}</p>
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
                                                e.completedCount === e.sprint.duration 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {e.completedCount} / {e.sprint.duration} Days
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex gap-1.5 flex-wrap max-w-[140px]">
                                                {e.progress.map((p) => (
                                                    <button 
                                                        key={p.day}
                                                        onClick={() => {
                                                            if (p.completed) {
                                                                setIsContentExpanded(false);
                                                                setIsChatOpen(false);
                                                                setViewingSubmission({ enrollment: e, day: p.day });
                                                            }
                                                        }}
                                                        disabled={!p.completed}
                                                        title={`Day ${p.day}: ${p.completed ? 'Click to Review Submission' : 'Pending'}`}
                                                        className={`w-3.5 h-3.5 rounded-sm transition-all duration-300 ${
                                                            p.completed 
                                                                ? 'bg-primary shadow-sm cursor-pointer hover:scale-125 hover:ring-2 hover:ring-primary/40' 
                                                                : 'bg-gray-100 cursor-default'
                                                        } ${!p.completed && p.day === e.currentMilestoneDay ? 'ring-2 ring-primary/20 animate-pulse' : ''}`}
                                                    />
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {subData?.submission || subData?.submissionFileUrl ? (
                                                <div className="max-w-[220px]">
                                                    <p className="text-xs text-gray-600 line-clamp-1 italic font-medium mb-1.5">
                                                        {subData.submission || "File submission detected"}
                                                    </p>
                                                    <button 
                                                        onClick={() => {
                                                            setIsContentExpanded(false);
                                                            setIsChatOpen(false);
                                                            setViewingSubmission({ enrollment: e, day: displayDay });
                                                        }}
                                                        className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest"
                                                    >
                                                        Review Day {displayDay} &rarr;
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-gray-300 uppercase italic">No submissions</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button 
                                                className="p-3 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all border border-transparent hover:border-primary/10"
                                                title="Open Chat"
                                            >
                                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
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

            {/* Submission Preview Modal */}
            {viewingSubmission && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-gray-100 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Day {viewingSubmission.day} Review</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{viewingSubmission.enrollment.student.name} • {viewingSubmission.enrollment.sprint.title}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setIsChatOpen(!isChatOpen)}
                                    className={`p-2.5 rounded-full transition-all shadow-sm ${isChatOpen ? 'bg-primary text-white' : 'bg-white text-gray-400 hover:text-primary hover:bg-gray-50 border border-gray-100'}`}
                                    title="View Coaching Chat"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                </button>
                                <button onClick={() => setViewingSubmission(null)} className="text-gray-400 hover:text-gray-900 p-2 rounded-full hover:bg-white transition-all shadow-sm border border-transparent">
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            {!isChatOpen ? (
                                <>
                                    {/* COLLAPSIBLE DAY CONTENT */}
                                    <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm transition-all duration-300">
                                        <button 
                                            onClick={() => setIsContentExpanded(!isContentExpanded)}
                                            className="w-full px-6 py-4 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl ${isContentExpanded ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                                </div>
                                                <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Day {viewingSubmission.day} Content Context</span>
                                            </div>
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${isContentExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        {isContentExpanded && (
                                            <div className="p-6 animate-fade-in border-t border-gray-50 bg-white">
                                                <div className="mb-6">
                                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Lesson Text</h4>
                                                    <p className="text-sm text-gray-700 leading-relaxed italic font-medium bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                                        {viewingSubmission.enrollment.sprint.dailyContent.find(c => c.day === viewingSubmission.day)?.lessonText || "No lesson text recorded."}
                                                    </p>
                                                </div>
                                                <div>
                                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3">Task Prompt</h4>
                                                    <p className="text-sm text-gray-900 font-bold leading-tight bg-primary/5 p-4 rounded-2xl border border-primary/10">
                                                        "{viewingSubmission.enrollment.sprint.dailyContent.find(c => c.day === viewingSubmission.day)?.taskPrompt}"
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* STUDENT WORK */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-yellow-400 rounded-full"></div>
                                            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Student's Submission</h4>
                                        </div>
                                        
                                        {viewingSubmission.enrollment.progress.find(p => p.day === viewingSubmission.day)?.submission ? (
                                            <div className="p-6 bg-white rounded-[2rem] border-2 border-gray-100 text-gray-900 font-bold text-lg whitespace-pre-wrap leading-tight shadow-sm min-h-[120px]">
                                                {viewingSubmission.enrollment.progress.find(p => p.day === viewingSubmission.day)?.submission}
                                            </div>
                                        ) : (
                                            <div className="p-10 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200 text-center">
                                                <p className="text-gray-400 italic text-sm font-bold uppercase tracking-widest">No text content provided</p>
                                            </div>
                                        )}

                                        {viewingSubmission.enrollment.progress.find(p => p.day === viewingSubmission.day)?.submissionFileUrl && (
                                            <div className="flex items-center gap-4 p-5 bg-blue-50 border-2 border-blue-100 rounded-[1.5rem]">
                                                <div className="bg-white p-3 rounded-2xl text-blue-600 shadow-sm">
                                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Attached Resource</p>
                                                    <p className="text-[10px] text-blue-600 font-bold truncate">{viewingSubmission.enrollment.progress.find(p => p.day === viewingSubmission.day)?.submissionFileUrl}</p>
                                                </div>
                                                <a 
                                                    href={viewingSubmission.enrollment.progress.find(p => p.day === viewingSubmission.day)?.submissionFileUrl} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="px-5 py-2.5 bg-white text-blue-600 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm hover:shadow-md transition-all border border-blue-100"
                                                >
                                                    Download
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                /* PRIVATE COACHING CHAT (Exclusive View) */
                                <div className="space-y-4 animate-fade-in flex flex-col h-full">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                        <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Coaching Correspondence</h4>
                                    </div>
                                    <div className="border border-gray-100 rounded-[2rem] overflow-hidden bg-white shadow-sm flex flex-col flex-1 min-h-[400px]">
                                        <div className="px-5 py-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Student Interaction</span>
                                            <span className="text-[9px] font-black text-primary uppercase tracking-widest">Day {viewingSubmission.day} History</span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-white" ref={chatScrollRef}>
                                            {dayComments.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                                    <p className="text-xs font-bold uppercase tracking-widest">No history yet.</p>
                                                </div>
                                            ) : (
                                                dayComments.map(comment => {
                                                    const isMe = comment.authorId === user.id;
                                                    return (
                                                        <div key={comment.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm relative ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                                                                {isMe && (
                                                                    <span className="absolute -top-4 right-0 text-[8px] font-black text-primary uppercase tracking-widest">Today's Feedback</span>
                                                                )}
                                                                {!isMe && (
                                                                    <span className="absolute -top-4 left-0 text-[8px] font-black text-gray-400 uppercase tracking-widest">Participant</span>
                                                                )}
                                                                <p className="font-medium leading-relaxed">{comment.content}</p>
                                                                <span className={`text-[8px] block mt-1 text-right font-black uppercase tracking-tighter ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                                                                    {new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* FEEDBACK FORM / CHAT INPUT */}
                        <div className="p-8 border-t border-gray-50 bg-gray-50/30 flex-shrink-0">
                            {isChatOpen ? (
                                /* Standard Chat Input Bar (Like Participants) */
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Message Participant</h4>
                                    <form onSubmit={handleSendFeedback} className="flex gap-2 items-center">
                                        <input 
                                            type="text" 
                                            value={chatMessage} 
                                            onChange={(e) => setChatMessage(e.target.value)} 
                                            placeholder="Type your message..." 
                                            className="flex-1 pl-4 pr-3 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none font-medium shadow-sm focus:ring-2 focus:ring-primary/10 transition-all" 
                                        />
                                        <button 
                                            type="submit" 
                                            disabled={!chatMessage.trim() || isSendingFeedback} 
                                            className="w-12 h-12 flex items-center justify-center bg-[#6B9E7D] text-white rounded-xl shadow-md disabled:opacity-50 hover:bg-[#0E7850] transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </form>
                                    <button 
                                        type="button"
                                        onClick={() => setViewingSubmission(null)}
                                        className="w-full py-4 bg-white text-gray-400 font-black text-xs uppercase tracking-[0.15em] rounded-2xl hover:bg-gray-100 transition-all border border-gray-100 mt-2"
                                    >
                                        Close Review
                                    </button>
                                </div>
                            ) : (
                                /* Initial Feedback Interface */
                                <>
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">
                                        {hasAlreadySentFeedback ? "Today's Guidance Sent" : 'Send Direct Feedback'}
                                    </h4>
                                    
                                    {!hasAlreadySentFeedback ? (
                                        <form onSubmit={handleSendFeedback} className="space-y-4">
                                            <textarea 
                                                value={feedbackText}
                                                onChange={(e) => setFeedbackText(e.target.value)}
                                                placeholder="Share your thoughts or guidance with the student..."
                                                className="w-full p-4 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none min-h-[100px] resize-none font-medium shadow-sm"
                                                required
                                            />
                                            <div className="flex gap-4">
                                                <Button 
                                                    type="submit"
                                                    isLoading={isSendingFeedback}
                                                    disabled={!feedbackText.trim() || isSendingFeedback}
                                                    className="flex-1 py-4 text-xs font-black uppercase tracking-[0.15em] rounded-2xl shadow-xl transition-all active:scale-95"
                                                >
                                                    {feedbackSent ? 'Feedback Sent!' : 'Post Guidance'}
                                                </Button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setViewingSubmission(null)}
                                                    className="px-8 py-4 bg-white text-gray-400 font-black text-xs uppercase tracking-[0.15em] rounded-2xl hover:bg-gray-100 transition-all border border-gray-100"
                                                >
                                                    Done
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm text-center">
                                                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Feedback delivered for Day {viewingSubmission.day}.</p>
                                                <p className="text-[10px] text-gray-400 mt-1">You can view the full correspondence by toggling the chat icon.</p>
                                            </div>
                                            <div className="flex gap-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => setIsChatOpen(true)}
                                                    className="flex-1 py-4 bg-primary text-white font-black text-xs uppercase tracking-[0.15em] rounded-2xl shadow-lg hover:bg-primary-hover transition-all active:scale-95"
                                                >
                                                    View Chat Conversation
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setViewingSubmission(null)}
                                                    className="px-8 py-4 bg-white text-gray-400 font-black text-xs uppercase tracking-[0.15em] rounded-2xl hover:bg-gray-100 transition-all border border-gray-100"
                                                >
                                                    Close Review
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {feedbackSent && (
                                <p className="text-center text-[10px] font-black text-green-600 uppercase tracking-widest mt-4 animate-fade-in">Guidance delivered to private chat.</p>
                            )}
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