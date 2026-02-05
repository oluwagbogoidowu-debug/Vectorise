
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

    // Handle marking messages as read when chat is open
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
            
            // AUTOMATIC FLOW: Check for next sprint in queue
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
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resuming Growth Journey...</p>
            </div>
        </div>
    );
    
    const currentLockStatus = getDayLockStatus(viewingDay);
    const currentDayContent = sprint.dailyContent.find(dc => dc.day === viewingDay);
    const outcomes = getSprintOutcomes(sprint);
    const isOwner = user && (user.id === sprint.coachId || user.role === UserRole.ADMIN);
    const isFoundational = sprint.category === 'Core Platform Sprint' || sprint.category === 'Growth Fundamentals';
    const dayProgress = enrollment.progress.find(p => p.day === viewingDay);
    const isCompleted = dayProgress?.completed;
    const needsFile = currentDayContent?.submissionType === 'file' || currentDayContent?.submissionType === 'both';
    const needsText = !currentDayContent?.submissionType || currentDayContent?.submissionType === 'text' || currentDayContent?.submissionType === 'both';
    const canComplete = (!needsFile || !!uploadedFile) && (!needsText || textSubmission.trim().length > 0);

    const sprintCoachName = isFoundational ? 'Vectorise Platform' : (fetchedCoach?.name || 'Assigned Coach');

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 mb-20">
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => navigate(from || -1)} className="group flex items-center text-gray-500 hover:text-primary transition-colors text-sm font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Back
                    </button>
                    <div className="flex items-center gap-2">
                        <Link to={`/impact/share?sprintId=${sprint.id}`} className="text-primary hover:bg-primary/5 transition-all px-3 py-1.5 rounded-full border border-primary/20 text-xs font-black uppercase tracking-widest flex items-center gap-2 group">
                            <span className="group-hover:scale-110 transition-transform">🎁</span> Invite Friend
                        </Link>
                        <button onClick={() => setShowReviewsModal(true)} className="text-gray-500 hover:text-primary transition-colors px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-bold flex items-center gap-1"><span>⭐</span> Reviews</button>
                        <button onClick={() => setShowInfoModal(true)} className="text-gray-400 hover:text-primary transition-colors p-2 rounded-full hover:bg-gray-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                    </div>
                </div>
                {isOwner && <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg mb-4 text-sm font-medium border border-indigo-100 flex items-center gap-2 animate-fade-in"><span className="text-lg">👀</span><span>Owner Preview Mode: All content is unlocked for you.</span></div>}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{sprint.title}</h1>
                        <p className="text-gray-500 font-medium">Guided by <span className="text-primary font-bold">{sprintCoachName}</span> • {sprint.difficulty}</p>
                    </div>
                    <div className="w-full md:w-64"><ProgressBar value={progressPercent} label="Total Progress" /></div>
                </div>
            </div>

            {isSprintFinished && !showReviewForm && !hasSubmittedReview && (
                <div className="mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-3xl p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 animate-fade-in">
                    <div><h2 className="text-2xl font-black text-gray-900 mb-1">Sprint Mastered! 🎉</h2><p className="text-gray-600 font-medium">You've completed every task. Help the coach by sharing your experience.</p></div>
                    <Button onClick={() => setShowReviewForm(true)} className="px-8 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all">Leave a Review</Button>
                </div>
            )}

            <div className="flex flex-col gap-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-100"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sprint Roadmap</h3></div>
                    <div className="flex overflow-x-auto p-4 gap-3 hide-scrollbar snap-x">
                        {enrollment.progress.map((p) => {
                            const lock = getDayLockStatus(p.day);
                            const isSelected = viewingDay === p.day;
                            return (
                                <button key={p.day} onClick={() => !lock.isLocked && setViewingDay(p.day)} disabled={lock.isLocked} className={`flex-shrink-0 snap-center flex flex-col justify-center items-center w-24 h-20 rounded-xl border transition-all duration-200 ${isSelected ? 'bg-primary border-primary text-white shadow-md scale-105 z-10' : lock.isLocked ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed' : p.completed ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-white border-gray-200 text-gray-700 hover:border-primary/50'}`}>
                                    <span className="text-xs font-bold uppercase mb-1">Day {p.day}</span>
                                    {p.completed ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> : lock.isLocked ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg> : <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`}></div>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-[#FAFAFA] rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
                    {currentLockStatus.isLocked ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-gray-50">
                            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6 text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg></div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Day {viewingDay} Locked</h2>
                            {currentLockStatus.reason === 'incomplete_previous' ? <p className="text-gray-600">Please complete Day {viewingDay - 1} to unlock this content.</p> : <div><p className="text-gray-600 mb-4">This content will unlock in:</p><p className="text-4xl font-mono font-bold text-gray-900 tracking-widest">{currentLockStatus.unlockTime ? Math.floor((currentLockStatus.unlockTime - now) / 1000) > 0 ? new Date(currentLockStatus.unlockTime - now).toISOString().substr(11, 8) : '00:00:00' : '--:--:--'}</p></div>}
                        </div>
                    ) : (
                        <div className="p-8 md:p-10">
                            <div className="flex justify-between items-center mb-6"><span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Day {viewingDay} Lesson</span></div>
                            <div className="prose max-w-none">
                                <div className="text-lg leading-relaxed text-gray-900 whitespace-pre-wrap mb-8 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 font-medium">
                                    <FormattedText text={currentDayContent?.lessonText || "No content available for this day."} />
                                </div>
                                <div className="bg-green-50/80 p-6 rounded-2xl border border-green-100 mb-8 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
                                    <h4 className="text-primary font-bold text-sm uppercase tracking-wide mb-2 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>Action Task</h4>
                                    <p className="text-gray-900 font-bold text-lg mb-4">
                                        <FormattedText text={currentDayContent?.taskPrompt || ""} />
                                    </p>
                                    {needsText && !isCompleted && <div className="mt-4"><label className="text-xs font-bold text-primary uppercase mb-2 block">Your Answer</label><textarea value={textSubmission} onChange={(e) => setTextSubmission(e.target.value)} className="w-full p-3 rounded-lg border border-green-200 bg-white/70 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm text-gray-900 placeholder-green-300" rows={4} placeholder="Type your response here..." /></div>}
                                    {isCompleted && needsText && textSubmission && <div className="mt-4 bg-white/60 p-4 rounded-lg border border-green-200"><p className="text-xs font-bold text-gray-500 uppercase mb-1">Your Submission</p><p className="text-sm text-gray-900 font-medium">"{textSubmission}"</p></div>}
                                    {needsFile && (
                                        <div className="mt-4">
                                            {isCompleted && uploadedFile ? <div className="flex items-center gap-4 bg-white/60 p-4 rounded-lg border border-green-200"><div className="bg-green-100 p-2 rounded-full text-green-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div><div><p className="text-sm font-bold text-gray-900">File Submitted</p><a href={uploadedFile} target="_blank" rel="noreferrer" className="text-xs text-primary underline truncate max-w-[200px] block">View Upload</a></div></div> : <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploadedFile ? 'border-green-400 bg-green-50' : 'border-green-300 bg-white/50 hover:bg-white'}`}>{isUploading ? <div className="flex flex-col items-center"><svg className="animate-spin h-8 w-8 text-primary mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div> : uploadedFile ? <div className="flex flex-col items-center text-green-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="font-bold text-sm">File Uploaded</span></div> : <div className="flex flex-col items-center text-primary"><svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg><span className="font-bold text-sm">Upload Task File</span></div>}<input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} /></label>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-10 pt-6 border-t border-gray-200 flex justify-between items-center">
                                <div className="text-sm text-gray-500 italic">{isCompleted ? 'Completed on ' + new Date(dayProgress?.completedAt!).toLocaleDateString() : 'Not completed yet'}</div>
                                {!isCompleted ? <Button onClick={handleCompleteCurrentDay} disabled={!canComplete} className={`shadow-lg px-8 ${!canComplete ? 'opacity-50 cursor-not-allowed' : ''}`}>Mark Complete</Button> : <Button variant="secondary" onClick={() => handleToggleDay(viewingDay)} className="bg-green-100 text-green-700 hover:bg-green-200 border-none">✓ Completed</Button>}
                            </div>
                            <div className="mt-8 pt-6 border-t border-gray-200">
                                <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm mb-4">
                                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setIsChatOpen(!isChatOpen)}>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Private Coaching Chat</h3>
                                            {unreadChatCount > 0 && !isChatOpen && (
                                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-lg shadow-red-500/20 animate-bounce">
                                                {unreadChatCount}
                                              </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-400">Day {viewingDay}</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isChatOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                    {isChatOpen && (
                                        <div className="animate-fade-in">
                                            <div className="h-[250px] overflow-y-auto p-4 bg-white space-y-4" ref={chatScrollRef}>
                                                {dayComments.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-gray-300"><p className="text-xs font-bold uppercase tracking-widest">No messages yet.</p></div> : dayComments.map(comment => { 
                                                    const isMe = comment.authorId === user?.id; 
                                                    const isFromCoach = comment.authorId === sprint.coachId;
                                                    return (
                                                        <div key={comment.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm relative ${isMe ? 'bg-[#0E7850] text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                                                                {isFromCoach && !isMe && <span className="absolute -top-4 left-0 text-[8px] font-black text-primary uppercase tracking-widest">Today's Feedback</span>}
                                                                <p>{comment.content}</p>
                                                                <span className={`text-[8px] block mt-1 text-right font-black uppercase tracking-tighter ${isMe ? 'text-white/70' : 'text-gray-400'}`}>{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                            </div>
                                                        </div>
                                                    ) 
                                                })}
                                            </div>
                                            <div className="p-3 bg-white border-t border-gray-100"><form onSubmit={handleSendComment} className="flex gap-2 items-center"><input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="Type your question..." className="flex-1 pl-4 pr-3 py-2 bg-gray-50 border-none rounded-xl text-sm outline-none font-medium" /><button type="submit" disabled={!chatMessage.trim()} className="w-10 h-10 flex items-center justify-center bg-[#6B9E7D] text-white rounded-xl shadow-md disabled:opacity-50 hover:bg-[#0E7850] transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button></form></div>
                                        </div>
                                    )}
                                </div>
                                {dayProgress?.reflection && <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm animate-fade-in"><div className="flex items-center gap-2 mb-2"><span className="text-lg">💡</span><h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Daily Reflection</h4></div><p className="text-sm text-gray-800 leading-relaxed font-medium">"{dayProgress.reflection}"</p></div>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* SPRINT REVIEW MODAL */}
            {showReviewForm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                        <div className="p-8">
                            <div className="text-center mb-8"><div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-100"><span className="text-4xl">🌟</span></div><h3 className="text-2xl font-black text-gray-900 leading-tight">Rate Your Experience</h3><h4 className="text-gray-500 font-medium mt-1">How has this sprint helped you?</h4></div>
                            {hasSubmittedReview ? (
                                <div className="text-center py-10 animate-fade-in"><div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div><p className="text-lg font-bold text-gray-900">Review Sent!</p><p className="text-sm text-gray-500 mt-2">Preparing your next milestone...</p></div>
                            ) : (
                                <form onSubmit={handleReviewSubmit} className="space-y-6">
                                    <div className="flex justify-center gap-2">{[1, 2, 3, 4, 5].map((star) => (<button key={star} type="button" onClick={() => setReviewRating(star)} className={`text-4xl transition-all ${reviewRating >= star ? 'text-yellow-400 scale-110' : 'text-gray-200'}`}>★</button>))}</div>
                                    <textarea required value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="What were your biggest wins during this sprint?" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all text-sm font-medium" rows={4} />
                                    <div className="flex gap-3"><Button type="submit" isLoading={isSubmittingReview} className="flex-1 py-4 font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-primary/20">Post Review</Button><button type="button" onClick={() => setShowReviewForm(false)} className="px-6 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600">Later</button></div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showReflectionModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"><h3 className="text-xl font-bold text-gray-900">Sprint Reflection</h3><button onClick={() => setShowReflectionModal(false)} className="text-gray-400 hover:text-gray-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                        <div className="p-8">
                            <div className="text-center mb-6"><div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></div><h4 className="text-2xl font-bold text-gray-900 leading-tight">What did you learn today?</h4></div>
                            <form onSubmit={handleReflectionSubmit}>
                                <div className="relative mb-6"><textarea required value={reflectionText} onChange={(e) => setReflectionText(e.target.value)} placeholder={REFLECTION_PROMPTS[promptIndex]} className={`w-full p-4 border border-gray-200 rounded-2xl focus:border-primary outline-none transition-all text-gray-900 bg-gray-50/50 font-medium placeholder-gray-400 ${isPromptFading ? 'opacity-50' : 'opacity-100'}`} rows={4} /></div>
                                <Button type="submit" isLoading={isSubmittingReflection} className="w-full py-4 text-lg font-bold rounded-2xl shadow-lg">Finish Day {viewingDay}</Button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {showInfoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{sprint.title}</h3>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">{sprint.category} • {sprint.difficulty}</p>
                            </div>
                            <button onClick={() => setShowInfoModal(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-white transition-all shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto space-y-10 custom-scrollbar">
                            <section>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Program Intent</h4>
                                <div className="text-sm text-gray-600 leading-relaxed font-medium bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                    <FormattedText text={sprint.description} />
                                </div>
                            </section>
                            
                            <section>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6">Key Outcomes</h4>
                                <div className="grid grid-cols-1 gap-3">
                                    {outcomes.map((outcome, i) => (
                                        <div key={i} className="flex items-start gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                            <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center flex-shrink-0">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                            </div>
                                            <span className="text-sm font-bold text-gray-700 leading-tight pt-1.5">{outcome}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <div className="bg-primary/5 rounded-[2rem] p-6 border border-primary/10 text-center">
                                <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-2">Cycle Info</p>
                                <p className="text-xs font-bold text-gray-700 italic leading-relaxed">
                                    You are currently in a {sprint.duration}-day high-performance loop guided by <span className="font-black text-primary">{sprintCoachName}</span>. Every day is designed to build on the last.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <style>{` .hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } } .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; } @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } } .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.2, 0, 0.2, 1) forwards; } `}</style>
        </div>
    );
};

export default SprintView;
