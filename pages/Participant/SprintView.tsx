
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ParticipantSprint, Sprint, UserRole, CoachingComment, Review } from '../../types';
import { MOCK_PARTICIPANT_SPRINTS, MOCK_SPRINTS, MOCK_COACHING_COMMENTS, MOCK_REVIEWS } from '../../services/mockData';
import Button from '../../components/Button';
import ProgressBar from '../../components/ProgressBar';
import { useAuth } from '../../contexts/AuthContext';
import { chatService } from '../../services/chatService';
import { sprintService } from '../../services/sprintService';

// Helper duplicated from Landing Page for consistent data simulation
const getSprintOutcomes = (category: string) => {
    const outcomes: Record<string, string[]> = {
        'Productivity': ['Master your daily schedule', 'Eliminate procrastination', 'Achieve deep focus states'],
        'Personal Fitness': ['Boost daily energy levels', 'Build sustainable physical habits', 'Improve overall vitality'],
        'Leadership': ['Communicate with authority', 'Inspire and motivate teams', 'Make decisions with confidence'],
        'Personal Branding': ['Define your unique voice', 'Grow your audience organically', 'Monetize your expertise'],
        'Interpersonal Relationship': ['Deepen meaningful connections', 'Resolve conflicts gracefully', 'Build a strong support network'],
        'Skill Acquisition': ['Accelerate learning speed', 'Apply new skills immediately', 'Overcome the learning curve'],
        'default': ['Gain clarity on your goals', 'Build consistent daily habits', 'See visible progress in days']
    };
    return outcomes[category] || outcomes['default'];
};

const SprintView: React.FC = () => {
    const { user } = useAuth();
    const { enrollmentId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { from } = location.state || {};

    const [enrollment, setEnrollment] = useState<ParticipantSprint | null>(null);
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [viewingDay, setViewingDay] = useState<number>(1);
    const [now, setNow] = useState(Date.now());
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showReviewsModal, setShowReviewsModal] = useState(false);
    
    // Coaching Comment State
    const [chatMessage, setChatMessage] = useState('');
    const [dayComments, setDayComments] = useState<CoachingComment[]>([]);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // Reviews State
    const [sprintReviews, setSprintReviews] = useState<Review[]>([]);
    const [newReviewText, setNewReviewText] = useState('');
    const [newReviewRating, setNewReviewRating] = useState(5);

    // Submission State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<string | null>(null);
    const [textSubmission, setTextSubmission] = useState('');

    // Update timer every second for countdowns
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Load Enrollment from DB or Mock
    useEffect(() => {
        const loadSprintData = async () => {
            if (!enrollmentId) return;

            // Use service to fetch from DB first, then fallback to mock
            const foundEnrollment = await sprintService.getEnrollmentById(enrollmentId);
            
            if (foundEnrollment) {
                setEnrollment(foundEnrollment);
                const foundSprint = MOCK_SPRINTS.find(s => s.id === foundEnrollment.sprintId);
                setSprint(foundSprint || null);
                
                // Initial load: Find first incomplete day or default to 1
                const firstIncomplete = foundEnrollment.progress.find(p => !p.completed);
                setViewingDay(firstIncomplete ? firstIncomplete.day : 1);
            } else {
                console.error("Enrollment not found");
                // Optional: navigate back if not found
            }
        };
        loadSprintData();
    }, [enrollmentId]);

    // Reset submission states when day changes
    useEffect(() => {
        if (enrollment) {
            const dayProgress = enrollment.progress.find(p => p.day === viewingDay);
            setUploadedFile(dayProgress?.submissionFileUrl || null);
            setTextSubmission(dayProgress?.submission || '');
        } else {
            setUploadedFile(null);
            setTextSubmission('');
        }
    }, [viewingDay, enrollment]);

    // Load Comments for the viewing day from DB
    useEffect(() => {
        if (!user || !sprint) return;

        const fetchComments = async () => {
            // Fetch entire conversation from DB for this sprint/user
            const allMessages = await chatService.getConversation(sprint.id, user.id);
            
            // Filter locally for the specific day view
            const daySpecific = allMessages.filter(c => c.day === viewingDay);
            
            setDayComments(prev => {
                if (prev.length !== daySpecific.length) return daySpecific;
                return daySpecific;
            });
        };

        fetchComments();
        // Poll for new messages
        const interval = setInterval(fetchComments, 3000);

        return () => clearInterval(interval);
    }, [sprint, viewingDay, user]);

    // Load Reviews
    useEffect(() => {
        if (sprint) {
            const reviews = MOCK_REVIEWS.filter(r => r.sprintId === sprint.id)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setSprintReviews(reviews);
        }
    }, [sprint]);

    // Scroll to bottom of chat on load/update
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [dayComments, viewingDay]);

    const progressPercent = useMemo(() => {
        if (!enrollment || !sprint) return 0;
        const completedCount = enrollment.progress.filter(p => p.completed).length;
        return (completedCount / sprint.duration) * 100;
    }, [enrollment, sprint]);
    
    const handleToggleDay = (dayToToggle: number) => {
        if (!enrollment) return;
        
        const dayProgress = enrollment.progress.find(p => p.day === dayToToggle);
        const newStatus = !dayProgress?.completed;
        
        // 1. Update local state object
        const updatedProgress = enrollment.progress.map(p => 
            p.day === dayToToggle ? { 
                ...p, 
                completed: newStatus,
                // IMPORTANT: Add timestamp when completing, remove when un-completing
                completedAt: newStatus ? new Date().toISOString() : undefined,
                submissionFileUrl: uploadedFile || undefined,
                submission: textSubmission || undefined
            } : p
        );
        const updatedEnrollment = { ...enrollment, progress: updatedProgress };
        setEnrollment(updatedEnrollment);

        // 2. Persist to Firestore
        sprintService.updateProgress(enrollment.id, updatedProgress);

        // 3. Update mock data reference (simulation fallback)
        const idx = MOCK_PARTICIPANT_SPRINTS.findIndex(e => e.id === enrollment.id);
        if (idx !== -1) {
            MOCK_PARTICIPANT_SPRINTS[idx] = updatedEnrollment;
        }
    };

    const handleCompleteCurrentDay = () => {
        handleToggleDay(viewingDay);
        // Advance to next day immediately so user sees the "Locked" timer state
        if (viewingDay < (sprint?.duration || 0)) {
            setViewingDay(viewingDay + 1);
            window.scrollTo(0, 0);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            // Simulate upload delay
            setTimeout(() => {
                setUploadedFile(`https://fake-storage.com/${file.name}`);
                setIsUploading(false);
            }, 1500);
        }
    };

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatMessage.trim() || !user || !sprint) return;

        const newMessage: Omit<CoachingComment, 'id'> = {
            sprintId: sprint.id,
            day: viewingDay,
            participantId: user.id,
            authorId: user.id,
            content: chatMessage,
            timestamp: new Date().toISOString(),
            read: false
        };

        // Optimistic update
        const tempMsg = { ...newMessage, id: `temp_${Date.now()}` };
        setDayComments(prev => [...prev, tempMsg]);
        setChatMessage('');

        // Save to DB
        try {
            await chatService.sendMessage(newMessage);
        } catch (error) {
            console.error("Failed to send message");
        }
    };

    const handleSubmitReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReviewText.trim() || !user || !sprint) return;

        const newReview: Review = {
            id: `rev_${Date.now()}`,
            sprintId: sprint.id,
            userId: user.id,
            userName: user.name,
            userAvatar: user.profileImageUrl,
            rating: newReviewRating,
            comment: newReviewText,
            timestamp: new Date().toISOString()
        };

        MOCK_REVIEWS.unshift(newReview);
        setSprintReviews([newReview, ...sprintReviews]);
        setNewReviewText('');
    };

    // Lock Logic Helper
    const getDayLockStatus = (day: number) => {
        // Bypass all locks if user is Owner or Admin
        if (user && sprint && (user.id === sprint.coachId || user.role === UserRole.ADMIN)) {
            return { isLocked: false };
        }

        if (!enrollment) return { isLocked: false };
        if (day === 1) return { isLocked: false };

        const prevDayProgress = enrollment.progress.find(p => p.day === day - 1);
        
        // Lock 1: Previous day not completed
        if (!prevDayProgress?.completed) {
            return { isLocked: true, reason: 'incomplete_previous' };
        }

        // Lock 2: 24 Hour Timer
        if (prevDayProgress.completedAt) {
            const completedTime = new Date(prevDayProgress.completedAt).getTime();
            const unlockTime = completedTime + (24 * 60 * 60 * 1000); // 24 hours later
            
            if (now < unlockTime) {
                return { isLocked: true, reason: 'time_lock', unlockTime };
            }
        }

        return { isLocked: false };
    };

    const formatCountdown = (endTime: number) => {
        const diff = endTime - now;
        if (diff <= 0) return "00:00:00";
        
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleBack = () => {
        if (from) {
            navigate(from);
        } else {
            navigate(-1);
        }
    };

    if (!enrollment || !sprint) return <div className="p-10 text-center">Loading sprint...</div>;
    
    const currentLockStatus = getDayLockStatus(viewingDay);
    const currentDayContent = sprint.dailyContent.find(dc => dc.day === viewingDay);
    const outcomes = getSprintOutcomes(sprint.category);
    
    // Check if user is owner for UI hints
    const isOwner = user && (user.id === sprint.coachId || user.role === UserRole.ADMIN);
    const isCompleted = enrollment.progress.find(p => p.day === viewingDay)?.completed;
    
    // Validation for completion
    const needsFile = currentDayContent?.submissionType === 'file' || currentDayContent?.submissionType === 'both';
    const needsText = !currentDayContent?.submissionType || currentDayContent?.submissionType === 'text' || currentDayContent?.submissionType === 'both';
    const isNone = currentDayContent?.submissionType === 'none';

    let canComplete = true;
    if (needsFile && !uploadedFile) canComplete = false;
    if (needsText && textSubmission.trim().length === 0) canComplete = false;

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 mb-20">
            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <button 
                        onClick={handleBack} 
                        className="group flex items-center text-gray-500 hover:text-primary transition-colors text-sm font-medium"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowReviewsModal(true)}
                            className="text-gray-500 hover:text-primary transition-colors px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-bold flex items-center gap-1"
                        >
                            <span>⭐</span> Reviews
                        </button>
                        <button 
                            onClick={() => setShowInfoModal(true)}
                            className="text-gray-400 hover:text-primary transition-colors p-2 rounded-full hover:bg-gray-100"
                            title="Sprint Info"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                {isOwner && (
                    <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg mb-4 text-sm font-medium border border-indigo-100 flex items-center gap-2 animate-fade-in">
                        <span className="text-lg">👀</span>
                        <span>Owner Preview Mode: All content is unlocked for you.</span>
                    </div>
                )}
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{sprint.title}</h1>
                        <p className="text-gray-500">{sprint.difficulty} • {sprint.category} Sprint</p>
                    </div>
                    <div className="w-full md:w-64">
                        <ProgressBar value={progressPercent} label="Total Progress" />
                    </div>
                </div>
            </div>

            {/* Layout: Main Content Stack */}
            <div className="flex flex-col gap-8">
                
                {/* Horizontal Roadmap (Top) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-100">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sprint Roadmap</h3>
                    </div>
                    <div className="flex overflow-x-auto p-4 gap-3 hide-scrollbar snap-x">
                        {enrollment.progress.map((dayProgress) => {
                            const dayLock = getDayLockStatus(dayProgress.day);
                            const isSelected = viewingDay === dayProgress.day;
                            const isCompleted = dayProgress.completed;
                            const isLocked = dayLock.isLocked;

                            return (
                                <button
                                    key={dayProgress.day}
                                    onClick={() => !isLocked && setViewingDay(dayProgress.day)}
                                    disabled={isLocked}
                                    className={`flex-shrink-0 snap-center flex flex-col justify-center items-center w-24 h-20 rounded-xl border transition-all duration-200 ${
                                        isSelected 
                                            ? 'bg-primary border-primary text-white shadow-md scale-105 z-10' 
                                            : isLocked
                                                ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'
                                                : isCompleted 
                                                    ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                                                    : 'bg-white border-gray-200 text-gray-700 hover:border-primary/50'
                                    }`}
                                >
                                    <span className="text-xs font-bold uppercase mb-1">Day {dayProgress.day}</span>
                                    {isCompleted ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : isLocked ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`}></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px] flex flex-col">
                    {currentLockStatus.isLocked ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-gray-50">
                            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Day {viewingDay} Locked</h2>
                            {currentLockStatus.reason === 'incomplete_previous' ? (
                                <p className="text-gray-600">Please complete Day {viewingDay - 1} to unlock this content.</p>
                            ) : (
                                <div>
                                    <p className="text-gray-600 mb-4">This content will unlock in:</p>
                                    <p className="text-4xl font-mono font-bold text-gray-900 tracking-widest">
                                        {currentLockStatus.unlockTime ? formatCountdown(currentLockStatus.unlockTime) : '--:--:--'}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-8 md:p-10">
                            {/* Header for Day */}
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Day {viewingDay} Lesson</span>
                                {currentDayContent?.audioUrl && (
                                    <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-xs font-bold text-gray-700 hover:bg-gray-200 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                        </svg>
                                        Listen
                                    </button>
                                )}
                            </div>
                            
                            <div className="prose max-w-none">
                                <p className="text-lg leading-relaxed text-gray-800 whitespace-pre-wrap mb-8">
                                    {currentDayContent?.lessonText || "No content available for this day."}
                                </p>
                                
                                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-8">
                                    <h4 className="text-blue-800 font-bold text-sm uppercase tracking-wide mb-2 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                        </svg>
                                        Action Task
                                    </h4>
                                    <p className="text-blue-900 font-medium text-lg mb-4">
                                        {currentDayContent?.taskPrompt}
                                    </p>

                                    {/* Text Answer UI if required */}
                                    {needsText && !isCompleted && (
                                        <div className="mt-4">
                                            <label className="text-xs font-bold text-blue-700 uppercase mb-2 block">Your Answer</label>
                                            <textarea 
                                                value={textSubmission}
                                                onChange={(e) => setTextSubmission(e.target.value)}
                                                className="w-full p-3 rounded-lg border border-blue-200 bg-white/70 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm text-gray-800 placeholder-blue-300"
                                                rows={4}
                                                placeholder="Type your response here..."
                                            />
                                        </div>
                                    )}
                                    {isCompleted && needsText && textSubmission && (
                                        <div className="mt-4 bg-white/60 p-4 rounded-lg border border-blue-200">
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Your Submission</p>
                                            <p className="text-sm text-gray-800 italic">"{textSubmission}"</p>
                                        </div>
                                    )}

                                    {/* File Upload UI if required */}
                                    {needsFile && (
                                        <div className="mt-4">
                                            {isCompleted && uploadedFile ? (
                                                <div className="flex items-center gap-4 bg-white/60 p-4 rounded-lg border border-blue-200">
                                                    <div className="bg-green-100 p-2 rounded-full text-green-600">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">File Submitted</p>
                                                        <a href={uploadedFile} target="_blank" rel="noreferrer" className="text-xs text-primary underline truncate max-w-[200px] block">View Upload</a>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-xs font-bold text-blue-700 uppercase mb-2 mt-4">File Attachment Required</p>
                                                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploadedFile ? 'border-green-400 bg-green-50' : 'border-blue-300 bg-blue-50/50 hover:bg-blue-100'}`}>
                                                        {isUploading ? (
                                                            <div className="flex flex-col items-center">
                                                                <svg className="animate-spin h-8 w-8 text-blue-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                                <span className="text-sm text-blue-600 font-medium">Uploading...</span>
                                                            </div>
                                                        ) : uploadedFile ? (
                                                            <div className="flex flex-col items-center text-green-700">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                <span className="font-bold text-sm">File Uploaded</span>
                                                                <span className="text-xs opacity-70">Click to change</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center text-blue-500">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                                </svg>
                                                                <span className="font-bold text-sm">Upload Task File</span>
                                                                <span className="text-xs opacity-70">Drag & Drop or Click</span>
                                                            </div>
                                                        )}
                                                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                                    </label>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {currentDayContent?.resourceUrl && (
                                    <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                                        <div className="p-2 bg-gray-100 rounded-lg text-gray-500 group-hover:text-primary group-hover:bg-white transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">Day {viewingDay} Resource</p>
                                            <a href={currentDayContent.resourceUrl} target="_blank" rel="noreferrer" className="text-xs text-gray-500 truncate max-w-[200px] block group-hover:text-primary">
                                                {currentDayContent.resourceUrl}
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-10 pt-6 border-t border-gray-100 flex justify-between items-center">
                                <div className="text-sm text-gray-500 italic">
                                    {isCompleted ? 'Completed on ' + new Date(enrollment.progress.find(p => p.day === viewingDay)?.completedAt!).toLocaleDateString() : 'Not completed yet'}
                                </div>
                                {!isCompleted ? (
                                    <Button 
                                        onClick={handleCompleteCurrentDay} 
                                        disabled={!canComplete}
                                        className={`shadow-lg px-8 ${!canComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title={!canComplete ? 'Complete required fields' : 'Complete Task'}
                                    >
                                        Mark Complete
                                    </Button>
                                ) : (
                                    <Button variant="secondary" onClick={() => handleToggleDay(viewingDay)} className="bg-green-100 text-green-700 hover:bg-green-200 border-none">
                                        ✓ Completed
                                    </Button>
                                )}
                            </div>

                            {/* COACHING CORNER - Vertical Layout (200px) */}
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                                    {/* Header */}
                                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Private Coaching Chat</h3>
                                        <span className="text-xs font-bold text-gray-400">Day {viewingDay}</span>
                                    </div>

                                    {/* Message Body - Height 200px */}
                                    <div className="h-[200px] overflow-y-auto p-4 bg-white space-y-3" ref={chatScrollRef}>
                                        {dayComments.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                                <p className="text-sm">No messages yet.</p>
                                                <p className="text-xs mt-1">Ask your coach anything about today's task.</p>
                                            </div>
                                        ) : (
                                            dayComments.map(comment => {
                                                const isMe = comment.authorId === user?.id;
                                                return (
                                                    <div key={comment.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed relative shadow-sm ${
                                                            isMe 
                                                            ? 'bg-[#0E7850] text-white rounded-br-none' 
                                                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                                        }`}>
                                                            <p>{comment.content}</p>
                                                            <span className={`text-[9px] block mt-1 text-right ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                                                                {new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>

                                    {/* Input Area */}
                                    <div className="p-3 bg-white border-t border-gray-100">
                                        <form onSubmit={handleSendComment} className="flex gap-2 items-center">
                                            <div className="flex-1 relative">
                                                <input 
                                                    type="text" 
                                                    value={chatMessage}
                                                    onChange={(e) => setChatMessage(e.target.value)}
                                                    placeholder="Type your question..." 
                                                    className="w-full pl-4 pr-3 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none placeholder-gray-400"
                                                />
                                            </div>
                                            <button 
                                                type="submit" 
                                                disabled={!chatMessage.trim()}
                                                className="w-10 h-10 flex items-center justify-center bg-[#6B9E7D] text-white rounded-xl hover:bg-[#0E7850] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform rotate-0" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* INFO MODAL */}
            {showInfoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">{sprint.title}</h3>
                            <button onClick={() => setShowInfoModal(false)} className="text-gray-400 hover:text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <p className="text-gray-600 mb-6 leading-relaxed">{sprint.description}</p>
                            <h4 className="font-bold text-gray-900 mb-3 uppercase text-xs tracking-wider">Expected Outcomes</h4>
                            <ul className="space-y-3">
                                {outcomes.map((outcome, i) => (
                                    <li key={i} className="flex items-start gap-3 bg-green-50 p-3 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-sm text-gray-800">{outcome}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* REVIEWS MODAL */}
            {showReviewsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">Sprint Reviews</h3>
                            <button onClick={() => setShowReviewsModal(false)} className="text-gray-400 hover:text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {sprintReviews.length > 0 ? (
                                sprintReviews.map(review => (
                                    <div key={review.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <img src={review.userAvatar} alt="" className="w-8 h-8 rounded-full bg-gray-200" />
                                                <span className="font-bold text-sm text-gray-900">{review.userName}</span>
                                            </div>
                                            <div className="flex text-yellow-400 text-xs">
                                                {'★'.repeat(review.rating)}
                                                <span className="text-gray-200">{'★'.repeat(5 - review.rating)}</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(review.timestamp).toLocaleDateString()}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-gray-400 py-8">No reviews yet. Be the first!</div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50">
                            <h4 className="font-bold text-sm text-gray-900 mb-3">Write a Review</h4>
                            <form onSubmit={handleSubmitReview}>
                                <div className="flex gap-1 mb-3">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setNewReviewRating(star)}
                                            className={`text-2xl focus:outline-none transition-colors ${star <= newReviewRating ? 'text-yellow-400' : 'text-gray-300'}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={newReviewText}
                                    onChange={(e) => setNewReviewText(e.target.value)}
                                    placeholder="Share your experience..."
                                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary mb-3 bg-white"
                                    rows={3}
                                />
                                <Button type="submit" className="w-full" disabled={!newReviewText.trim()}>Submit Review</Button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default SprintView;
