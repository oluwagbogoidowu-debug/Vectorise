import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { ParticipantSprint, Sprint, UserRole, CoachingComment, Review, Coach, Participant } from '../../types';
import Button from '../../components/Button';
import ProgressBar from '../../components/ProgressBar';
import { useAuth } from '../../contexts/AuthContext';
import { chatService } from '../../services/chatService';
import { sprintService } from '../../services/sprintService';
import { notificationService } from '../../services/notificationService';
import { eventService } from '../../services/eventService';
import { userService } from '../../services/userService';
import { getSprintOutcomes } from '../../utils/sprintUtils';
import { MOCK_USERS } from '../../services/mockData';
import FormattedText from '../../components/FormattedText';

const REFLECTION_PROMPTS = [
    "I learnt that...",
    "This sprint helped me see that...",
    "I’m getting to understand that...",
    "One idea that shifted my thinking was...",
    "The most important insight from this sprint was..."
];

const SprintView: React.FC = () => {
    const { user } = useAuth();
    const { enrollmentId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { from } = location.state || {};

    const [enrollment, setEnrollment] = useState<ParticipantSprint | null>(null);
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [fetchedCoach, setFetchedCoach] = useState<Coach | null>(null);
    const [viewingDay, setViewingDay] = useState<number>(1);
    const [now, setNow] = useState(Date.now());
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showReviewsModal, setShowReviewsModal] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    
    const [showReflectionModal, setShowReflectionModal] = useState(false);
    const [reflectionText, setReflectionText] = useState('');
    const [isSubmittingReflection, setIsSubmittingReflection] = useState(false);

    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [hasSubmittedReview, setHasSubmittedReview] = useState(false);
    
    const [promptIndex, setPromptIndex] = useState(0);
    const [isPromptFading, setIsPromptFading] = useState(false);

    const [chatMessage, setChatMessage] = useState('');
    const [dayComments, setDayComments] = useState<CoachingComment[]>([]);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<string | null>(null);
    const [textSubmission, setTextSubmission] = useState('');

    useEffect(() => {
        if (user && sprint && viewingDay) {
            eventService.logEvent(user.id, 'lesson_opened', { 
                sprintId: sprint.id, 
                dayNumber: viewingDay 
            });
        }
    }, [viewingDay, sprint?.id, user?.id]);

    useEffect(() => {
        const dayParam = searchParams.get('day');
        const chatParam = searchParams.get('openChat');
        if (dayParam) setViewingDay(parseInt(dayParam));
        if (chatParam === 'true') setIsChatOpen(true);
    }, [searchParams]);

    useEffect(() => {
        if (!showReflectionModal) return;
        const interval = setInterval(() => {
            setIsPromptFading(true);
            setTimeout(() => {
                setPromptIndex((prev) => (prev + 1) % REFLECTION_PROMPTS.length);
                setIsPromptFading(false);
            }, 500);
        }, 4000);
        return () => clearInterval(interval);
    }, [showReflectionModal]);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!enrollmentId) return;
        const unsubscribe = sprintService.subscribeToEnrollment(enrollmentId, async (data) => {
            if (data) {
                setEnrollment(data);
                if (!sprint) {
                    const foundSprint = await sprintService.getSprintById(data.sprintId);
                    setSprint(foundSprint);
                    
                    if (foundSprint) {
                        const mockCoach = MOCK_USERS.find(u => u.id === foundSprint.coachId) as Coach;
                        if (mockCoach) {
                            setFetchedCoach(mockCoach);
                        } else if (foundSprint.category !== 'Core Platform Sprint' && foundSprint.category !== 'Growth Fundamentals') {
                            const dbCoach = await userService.getUserDocument(foundSprint.coachId);
                            setFetchedCoach(dbCoach as Coach);
                        }
                    }

                    if (!searchParams.get('day')) {
                        const firstIncomplete = data.progress.find(p => !p.completed);
                        setViewingDay(firstIncomplete ? firstIncomplete.day : data.progress.length);
                    }
                }
            }
        });
        return () => unsubscribe();
    }, [enrollmentId, sprint, searchParams]);

    useEffect(() => {
        if (enrollment) {
            const dayProgress = enrollment.progress.find(p => p.day === viewingDay);
            setUploadedFile(dayProgress?.submissionFileUrl || null);
            setTextSubmission(dayProgress?.submission || '');
        }
    }, [viewingDay, enrollment]);

    const fetchComments = async () => {
        if (!user || !sprint || !enrollment) return;
        const allMessages = await chatService.getConversation(sprint.id, enrollment.participantId);
        setDayComments(allMessages.filter(c => c.day === viewingDay));
    };

    useEffect(() => {
        fetchComments();
        const interval = setInterval(fetchComments, 4000);
        return () => clearInterval(interval);
    }, [sprint, viewingDay, user, enrollment]);

    useEffect(() => {
        if (isChatOpen && user && sprint && enrollment) {
            chatService.markMessagesAsRead(sprint.id, enrollment.participantId, viewingDay, user.id);
        }
    }, [isChatOpen, viewingDay, user?.id, sprint?.id]);

    useEffect(() => {
        if (chatScrollRef.current && isChatOpen) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [dayComments, isChatOpen]);

    const progressPercent = useMemo(() => {
        if (!enrollment || !sprint) return 0;
        const completedCount = enrollment.progress.filter(p => p.completed).length;
        return (completedCount / sprint.duration) * 100;
    }, [enrollment, sprint]);

    const isSprintFinished = progressPercent === 100;

    const unreadChatCount = useMemo(() => {
        if (!user) return 0;
        return dayComments.filter(c => c.authorId !== user.id && !c.read).length;
    }, [dayComments, user]);
    
    const handleToggleDay = async (dayToToggle: number, reflectionData?: { text: string }) => {
        if (!enrollment || !sprint || !user) return;
        const dayProgress = enrollment.progress.find(p => p.day === dayToToggle);
        const newStatus = reflectionData ? true : !dayProgress?.completed;
        const updatedProgress = enrollment.progress.map(p => 
            p.day === dayToToggle ? { 
                ...p, 
                completed: newStatus,
                completedAt: newStatus ? (p.completedAt || new Date().toISOString()) : null,
                submissionFileUrl: uploadedFile || p.submissionFileUrl || null,
                submission: textSubmission || p.submission || null,
                reflection: reflectionData?.text || p.reflection || null,
                isReflectionPublic: false
            } : p
        );
        await sprintService.updateProgress(enrollment.id, updatedProgress);
        
        if (newStatus && user.role === UserRole.PARTICIPANT) {
            await eventService.logEvent(user.id, 'task_submitted', {
                sprintId: sprint.id,
                dayNumber: dayToToggle
            });

            await notificationService.createNotification(sprint.coachId, {
                type: 'sprint_update',
                text: `${user.name} submitted Day ${dayToToggle} for "${sprint.title}"`,
                timestamp: new Date().toISOString(),
                read: false,
                link: `/coach/participants`
            });
        }
    };

    const handleCompleteCurrentDay = () => {
        if (user && sprint) {
            eventService.logEvent(user.id, 'task_viewed', { 
                sprintId: sprint.id, 
                dayNumber: viewingDay,
                metadata: { context: 'pre_reflection_open' }
            });
        }
        setShowReflectionModal(true);
    };

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !sprint || !reviewComment.trim()) return;
        setIsSubmittingReview(true);
        try {
            await sprintService.submitReview({
                sprintId: sprint.id, userId: user.id, userName: user.name, userAvatar: user.profileImageUrl,
                rating: reviewRating, comment: reviewComment, timestamp: new Date().toISOString()
            });
            await notificationService.createNotification(sprint.coachId, {
                type: 'shine_comment', text: `⭐ ${user.name} left a ${reviewRating}-star review for "${sprint.title}"`,
                timestamp: new Date().toISOString(), read: false, link: `/coach/impact`
            });
            setHasSubmittedReview(true);
            
            const participant = user as Participant;
            const nextSprintId = participant.savedSprintIds && participant.savedSprintIds.length > 0 
                ? participant.savedSprintIds[0] 
                : null;

            setTimeout(() => {
                setShowReviewForm(false);
                if (nextSprintId) {
                    navigate(`/sprint/${nextSprintId}`);
                } else {
                    navigate('/dashboard');
                }
            }, 2500);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleReflectionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !sprint || !enrollment) return;
        setIsSubmittingReflection(true);
        try {
            await handleToggleDay(viewingDay, { text: reflectionText });
            await eventService.logEvent(user.id, 'reflection_shared', {
                sprintId: sprint.id,
                dayNumber: viewingDay,
                metadata: { isPublic: false }
            });
            setShowReflectionModal(false);
            setReflectionText('');
            if (viewingDay < sprint.duration) {
                setViewingDay(viewingDay + 1);
                window.scrollTo(0, 0);
            } else {
                setShowReviewForm(true);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmittingReflection(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            setTimeout(() => {
                setUploadedFile(`https://fake-storage.com/${file.name}`);
                setIsUploading(false);
            }, 1500);
        }
    };

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatMessage.trim() || !user || !sprint || !enrollment) return;
        const newMessage: Omit<CoachingComment, 'id'> = {
            sprintId: sprint.id, day: viewingDay, participantId: enrollment.participantId,
            authorId: user.id, content: chatMessage, timestamp: new Date().toISOString(), read: false
        };
        try {
            await chatService.sendMessage(newMessage);
            if (user.role === UserRole.PARTICIPANT) {
                await notificationService.createNotification(sprint.coachId, {
                    type: 'shine_comment', text: `💬 ${user.name} sent a message for Day ${viewingDay} of "${sprint.title}"`,
                    timestamp: new Date().toISOString(), read: false, link: `/coach/participants`
                });
            }
            setChatMessage('');
            fetchComments();
        } catch (error) {
            console.error(error);
        }
    };

    const getDayLockStatus = (day: number) => {
        if (user && sprint && (user.id === sprint.coachId || user.role === UserRole.ADMIN)) return { isLocked: false };
        if (!enrollment || day === 1) return { isLocked: false };
        const prevDay = enrollment.progress.find(p => p.day === day - 1);
        if (!prevDay?.completed) return { isLocked: true, reason: 'incomplete_previous' };
        if (prevDay.completedAt) {
            const completedDate = new Date(prevDay.completedAt);
            const nextMidnight = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate() + 1, 0, 0, 0).getTime();
            if (now < nextMidnight) return { isLocked: true, reason: 'time_lock', unlockTime: nextMidnight };
        }
        return { isLocked: false };
    };

    if (!enrollment || !sprint) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 text-base">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Resuming Growth Journey...</p>
            </div>
        </div>
    );
    
    const currentLockStatus = getDayLockStatus(viewingDay);
    const currentDayContent = sprint.dailyContent.find(dc => dc.day === viewingDay);
    const outcomes = getSprintOutcomes(sprint);
    const isOwner = user && (user.id === sprint.coachId || user.role === UserRole.ADMIN);
    const dayProgress = enrollment.progress.find(p => p.day === viewingDay);
    const isCompleted = dayProgress?.completed;
    const needsFile = currentDayContent?.submissionType === 'file' || currentDayContent?.submissionType === 'both';
    const needsText = !currentDayContent?.submissionType || currentDayContent?.submissionType === 'text' || currentDayContent?.submissionType === 'both';
    const canComplete = (!needsFile || !!uploadedFile) && (!needsText || textSubmission.trim().length > 0);
    const sprintCoachName = (sprint.category === 'Core Platform Sprint' || sprint.category === 'Growth Fundamentals') ? 'Vectorise Platform' : (fetchedCoach?.name || 'Assigned Coach');

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 mb-20 text-base">
            <div className="mb-10">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => navigate(from || -1)} className="group flex items-center text-gray-500 hover:text-primary transition-colors text-sm font-bold uppercase tracking-widest">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        Back
                    </button>
                    <div className="flex items-center gap-3">
                        <Link to={`/impact/share?sprintId=${sprint.id}`} className="text-primary hover:bg-primary/5 transition-all px-4 py-2 rounded-full border border-primary/20 text-xs font-black uppercase tracking-widest flex items-center gap-2 group">
                            <span className="group-hover:scale-110 transition-transform">🎁</span> Invite Friend
                        </Link>
                        <button onClick={() => setShowInfoModal(true)} className="text-gray-400 hover:text-primary transition-colors p-2.5 rounded-full hover:bg-gray-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-1">{sprint.title}</h1>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Guided by <span className="text-primary font-black">{sprintCoachName}</span> • {sprint.difficulty}</p>
                    </div>
                    <div className="w-full md:w-80"><ProgressBar value={progressPercent} label="Journey Progress" /></div>
                </div>
            </div>

            <div className="flex flex-col gap-10">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-5 bg-gray-50 border-b border-gray-100"><h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Growth Roadmap</h3></div>
                    <div className="flex overflow-x-auto p-5 gap-4 hide-scrollbar snap-x">
                        {enrollment.progress.map((p) => {
                            const lock = getDayLockStatus(p.day);
                            const isSelected = viewingDay === p.day;
                            return (
                                <button key={p.day} onClick={() => !lock.isLocked && setViewingDay(p.day)} disabled={lock.isLocked} className={`flex-shrink-0 snap-center flex flex-col justify-center items-center w-28 h-24 rounded-2xl border transition-all duration-300 ${isSelected ? 'bg-primary border-primary text-white shadow-xl scale-105 z-10' : lock.isLocked ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed opacity-60' : p.completed ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-white border-gray-200 text-gray-700 hover:border-primary/50'}`}>
                                    <span className="text-[10px] font-black uppercase tracking-widest mb-1.5">Day {p.day}</span>
                                    {p.completed ? <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> : lock.isLocked ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-40" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg> : <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`}></div>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-[#FAFAFA] rounded-[2.5rem] shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
                    {currentLockStatus.isLocked ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50/50">
                            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-8 text-gray-400 shadow-inner"><svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg></div>
                            <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Day {viewingDay} Secured</h2>
                            {currentLockStatus.reason === 'incomplete_previous' ? <p className="text-lg text-gray-500 font-medium">Please complete Day {viewingDay - 1} to unlock this lesson.</p> : <div><p className="text-lg text-gray-500 font-medium mb-6 italic">Unlocks for your local time at midnight.</p><p className="text-5xl font-black text-gray-900 tracking-tighter">{currentLockStatus.unlockTime ? Math.floor((currentLockStatus.unlockTime - now) / 1000) > 0 ? new Date(currentLockStatus.unlockTime - now).toISOString().substr(11, 8) : '00:00:00' : '--:--:--'}</p></div>}
                        </div>
                    ) : (
                        <div className="p-10 md:p-14">
                            <div className="flex justify-between items-center mb-8"><span className="text-sm font-black text-gray-300 uppercase tracking-[0.3em]">Phase Day {viewingDay} Lesson</span></div>
                            <div className="prose max-w-none">
                                <div className="text-lg leading-relaxed text-gray-900 whitespace-pre-wrap mb-10 bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 font-medium">
                                    <FormattedText text={currentDayContent?.lessonText || "No content available for this day."} />
                                </div>
                                <div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10 mb-10 shadow-sm">
                                    <h4 className="text-primary font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>Daily Directive</h4>
                                    <p className="text-gray-900 font-black text-xl mb-6 tracking-tight leading-snug">
                                        <FormattedText text={currentDayContent?.taskPrompt || ""} />
                                    </p>
                                    {needsText && !isCompleted && <div className="mt-6"><label className="text-xs font-black text-primary uppercase mb-3 block tracking-widest">Submission Logic</label><textarea value={textSubmission} onChange={(e) => setTextSubmission(e.target.value)} className="w-full p-5 rounded-2xl border border-primary/20 bg-white/70 focus:bg-white focus:border-primary outline-none transition-all text-base text-gray-900 font-bold placeholder-primary/20" rows={5} placeholder="Draft your response..." /></div>}
                                    {isCompleted && needsText && textSubmission && <div className="mt-6 bg-white/80 p-6 rounded-2xl border border-primary/10"><p className="text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Stored Submission</p><p className="text-base text-gray-900 font-bold italic leading-relaxed">"{textSubmission}"</p></div>}
                                </div>
                            </div>
                            <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between items-center">
                                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">{isCompleted ? 'Marked complete' : 'Action pending'}</div>
                                {!isCompleted ? <Button onClick={handleCompleteCurrentDay} disabled={!canComplete} className={`px-12 py-5 shadow-2xl shadow-primary/30 ${!canComplete ? 'opacity-50 grayscale' : ''}`}>Secure Day {viewingDay} Win</Button> : <button disabled className="px-10 py-5 bg-green-50 text-green-600 font-black uppercase text-sm rounded-2xl border border-green-100 flex items-center gap-3">✓ Milestone Reached</button>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reflection Modal */}
            {showReflectionModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-xl animate-fade-in">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"><h3 className="text-2xl font-black text-gray-900 tracking-tight">Cycle Reflection</h3><button onClick={() => setShowReflectionModal(false)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                        <div className="p-10">
                            <div className="text-center mb-10"><div className="w-20 h-20 bg-primary/10 text-primary rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner"><svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></div><h4 className="text-3xl font-black text-gray-900 leading-tight">Insight Synthesis</h4><p className="text-gray-500 font-medium mt-2">What did this win teach you about your rise?</p></div>
                            <form onSubmit={handleReflectionSubmit}>
                                <div className="relative mb-10"><textarea required value={reflectionText} onChange={(e) => setReflectionText(e.target.value)} placeholder={REFLECTION_PROMPTS[promptIndex]} className={`w-full p-8 border-2 border-primary/10 rounded-[2rem] focus:border-primary outline-none transition-all text-gray-900 bg-gray-50/30 text-lg font-bold placeholder-gray-400 ${isPromptFading ? 'opacity-40' : 'opacity-100'}`} rows={4} /></div>
                                <Button type="submit" isLoading={isSubmittingReflection} className="w-full py-6 text-lg font-black uppercase tracking-widest rounded-3xl">Commit Insight & Continue</Button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SprintView;