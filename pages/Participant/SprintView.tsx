import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ParticipantSprint, Sprint, DailyContent, GlobalOrchestrationSettings, MicroSelector, MicroSelectorStep, CoachingComment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { chatService } from '../../services/chatService';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '../../services/firebase';
import FormattedText from '../../components/FormattedText';
import LocalLogo from '../../components/LocalLogo';

const ReflectionModal: React.FC<{
    day: number;
    isOpen: boolean;
    question?: string;
    onClose: () => void;
    onFinish: (reflection: string) => void;
    isSubmitting: boolean;
}> = ({ isOpen, day, question, onClose, onFinish, isSubmitting }) => {
    const [text, setText] = useState('');
    if (!isOpen) return null;
    return (
        <div className="modal-overlay animate-fade-in" onClick={onClose}>
            <div className="modal-content-wrapper" onClick={onClose}>
                <div className="modal-content w-full max-w-sm bg-white rounded-[2.5rem] relative overflow-y-auto animate-slide-up flex flex-col p-8 max-h-[80vh] custom-scrollbar" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-4">Sprint Reflection</h3>
                <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-6 leading-tight">
                    {question || "One idea that shifted my thinking was..."}
                </p>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter your breakthrough..."
                    className="w-full bg-[#FAFAFA] border border-gray-100 rounded-2xl p-5 text-sm font-medium min-h-[140px] mb-8"
                />
                <button 
                    onClick={() => onFinish(text)}
                    disabled={isSubmitting}
                    className="w-full bg-[#0E7850] text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50"
                >
                    {isSubmitting ? 'Finalizing...' : `Finish Day ${day}`}
                </button>
                <button 
                    onClick={() => onFinish("")}
                    disabled={isSubmitting}
                    className="w-full mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors"
                >
                    Skip reflection for today
                </button>
            </div>
        </div>
    </div>
    );
};

const SprintSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    reflectionsEnabled: boolean;
    onToggleReflections: () => void;
    soundEnabled: boolean;
    onToggleSound: () => void;
    notificationsEnabled: boolean;
    onToggleNotifications: () => void;
}> = ({ isOpen, onClose, reflectionsEnabled, onToggleReflections, soundEnabled, onToggleSound, notificationsEnabled, onToggleNotifications }) => {
    if (!isOpen) return null;

    const Toggle = ({ enabled, onToggle, label }: { enabled: boolean, onToggle: () => void, label: string }) => (
        <div className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
            <span className="text-xs font-black text-gray-700 uppercase tracking-widest">{label}</span>
            <button 
                onClick={onToggle}
                className={`w-12 h-6 rounded-full transition-all duration-300 relative ${enabled ? 'bg-primary' : 'bg-gray-200'}`}
            >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${enabled ? 'right-1' : 'left-1'}`} />
            </button>
        </div>
    );

    return (
        <div className="modal-overlay animate-fade-in" onClick={onClose}>
            <div className="modal-content-wrapper" onClick={onClose}>
                <div className="modal-content w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden animate-slide-up flex flex-col max-h-[80vh] border border-gray-100" onClick={e => e.stopPropagation()}>
                <div className="p-8 pb-4 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Sprint Settings</h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-dark transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto px-8 py-2 min-h-0 custom-scrollbar">
                    <Toggle enabled={reflectionsEnabled} onToggle={onToggleReflections} label="Daily Reflections" />
                    <Toggle enabled={soundEnabled} onToggle={onToggleSound} label="Completion Sound" />
                    <Toggle enabled={notificationsEnabled} onToggle={onToggleNotifications} label="Unlock Notifications" />
                </div>

                <div className="p-8 pt-4 flex-shrink-0">
                    <button 
                        onClick={onClose}
                        className="w-full bg-dark text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    </div>
    );
};

const CoachingChatModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    sprintId: string;
    participantId: string;
    day: number;
    sprintTitle: string;
}> = ({ isOpen, onClose, sprintId, participantId, day, sprintTitle }) => {
    const [messages, setMessages] = useState<CoachingComment[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            const fetchMessages = async () => {
                const conversation = await chatService.getConversation(sprintId, participantId, day);
                setMessages(conversation);
                // Mark as read
                await chatService.markMessagesAsRead(sprintId, participantId, day, participantId);
            };
            fetchMessages();
        }
    }, [isOpen, sprintId, participantId, day]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim() || isSending) return;
        setIsSending(true);
        try {
            const msg = await chatService.sendMessage({
                sprintId,
                participantId,
                authorId: participantId,
                content: newMessage.trim(),
                day,
                timestamp: new Date().toISOString(),
                read: false
            });
            setMessages(prev => [...prev, msg]);
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay animate-fade-in" onClick={onClose}>
            <div className="modal-content-wrapper" onClick={onClose}>
                <div className="modal-content w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden flex flex-col animate-slide-up h-[70vh] max-h-[80vh] border border-gray-100" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-white flex-shrink-0">
                    <div>
                        <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Private Coaching Chat</h3>
                        <p className="text-sm font-black text-gray-900 truncate max-w-[200px]">{sprintTitle}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-50 px-3 py-1.5 rounded-full">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Day {day}</span>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-dark transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FAFAFA] min-h-0 custom-scrollbar">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No messages yet</p>
                            <p className="text-[9px] font-medium text-gray-400 mt-2">Start the conversation with your coach.</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isMe = msg.authorId === participantId;
                            return (
                                <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                                        isMe 
                                        ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10' 
                                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-sm'
                                    }`}>
                                        <p className="font-medium leading-relaxed">{msg.content}</p>
                                        <p className={`text-[8px] mt-2 font-black uppercase tracking-widest opacity-40 ${isMe ? 'text-white text-right' : 'text-gray-400'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Input */}
                <div className="p-6 bg-white border-t border-gray-50 flex-shrink-0">
                    <div className="relative flex items-center gap-2">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Type your message..."
                            className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all resize-none max-h-32"
                            rows={1}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!newMessage.trim() || isSending}
                            className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
};

interface SectionHeadingProps {
    children: React.ReactNode;
    color?: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ children, color = "primary" }) => (
    <h2 className={`text-[8px] font-black text-${color} uppercase tracking-[0.4em] mb-4`}>
        {children}
    </h2>
);

const SprintView: React.FC = () => {
    const { user } = useAuth();
    const { enrollmentId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [enrollment, setEnrollment] = useState<ParticipantSprint | null>(null);
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [viewingDay, setViewingDay] = useState<number>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [timeToUnlock, setTimeToUnlock] = useState<string>('00:00:00');
    
    // Day Completion State (Proof)
    const [proofInput, setProofInput] = useState('');
    const [proofSelected, setProofSelected] = useState('');

    const [reflectionsEnabled, setReflectionsEnabled] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [globalSettings, setGlobalSettings] = useState<GlobalOrchestrationSettings | null>(null);

    useEffect(() => {
        if (!enrollmentId) return;
        const unsubscribe = sprintService.subscribeToEnrollment(enrollmentId, async (data) => {
            if (data) {
                setEnrollment(data);
                if (data.reflectionsDisabled !== undefined) {
                    setReflectionsEnabled(!data.reflectionsDisabled);
                }
                if (data.soundDisabled !== undefined) {
                    setSoundEnabled(!data.soundDisabled);
                }
                if (data.notificationsDisabled !== undefined) {
                    setNotificationsEnabled(!data.notificationsDisabled);
                }
                if (!sprint) {
                    const found = await sprintService.getSprintById(data.sprint_id);
                    setSprint(found);
                    
                    // Handle deep linking from query params
                    const params = new URLSearchParams(location.search);
                    const dayParam = params.get('day');
                    const openChatParam = params.get('openChat');
                    
                    if (dayParam) {
                        setViewingDay(parseInt(dayParam));
                        if (openChatParam === 'true') {
                            setIsChatModalOpen(true);
                        }
                    } else {
                        const firstIncomplete = data.progress?.find(p => !p.completed);
                        setViewingDay(firstIncomplete ? firstIncomplete.day : (data.progress?.length || 1));
                    }
                }
            }
        });
        return () => unsubscribe();
    }, [enrollmentId, sprint, location.search]);

    // Check for unread messages
    useEffect(() => {
        if (!enrollment || !user || isChatModalOpen) return;
        
        const checkUnread = async () => {
            const hasUnread = await chatService.hasUnreadMessages(enrollment.sprint_id, user.id, viewingDay, user.id);
            setHasUnreadMessages(hasUnread);
        };
        
        checkUnread();
        const interval = setInterval(checkUnread, 10000); // Check every 10s
        return () => clearInterval(interval);
    }, [enrollment, user, viewingDay, isChatModalOpen]);

    useEffect(() => {
      const loadSettings = async () => {
        const settings = await sprintService.getGlobalOrchestrationSettings();
        setGlobalSettings(settings);
      };
      loadSettings();
    }, []);

    useEffect(() => {
        setProofInput('');
        setProofSelected('');
    }, [viewingDay]);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!notificationsEnabled || !enrollment || !sprint || !enrollment.progress) return;
        
        // Check if the next day is unlocked
        const firstIncomplete = enrollment.progress.find(p => !p.completed);
        if (firstIncomplete && firstIncomplete.day > 1) {
            const prevDay = enrollment.progress.find(p => p.day === firstIncomplete.day - 1);
            if (prevDay?.completedAt) {
                const completedDate = new Date(prevDay.completedAt);
                const nextMidnight = new Date(
                    completedDate.getFullYear(),
                    completedDate.getMonth(),
                    completedDate.getDate() + 1,
                    0, 0, 0
                ).getTime();
                
                // If it's exactly midnight or just passed it, show a notification
                // We'll use a ref to prevent multiple notifications for the same day
                const lastNotifiedDay = localStorage.getItem(`last_notified_day_${enrollment.id}`);
                if (now >= nextMidnight && lastNotifiedDay !== firstIncomplete.day.toString()) {
                    toast.success(`Day ${firstIncomplete.day} is now unlocked!`, {
                        description: "Time to take action.",
                        icon: <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    });
                    localStorage.setItem(`last_notified_day_${enrollment.id}`, firstIncomplete.day.toString());
                }
            }
        }
    }, [now, notificationsEnabled, enrollment, sprint]);

    const dayLockDetails = useMemo(() => {
        if (!enrollment || !sprint || !enrollment.progress) return { isLocked: false, unlockTime: 0 };
        
        if (viewingDay === 1) return { isLocked: false, unlockTime: 0 };

        const prevDay = enrollment.progress.find(p => p.day === viewingDay - 1);
        
        if (!prevDay?.completed) return { isLocked: true, unlockTime: 0, reason: 'Complete previous day first.' };

        if (prevDay.completedAt) {
            const completedDate = new Date(prevDay.completedAt);
            const nextMidnight = new Date(
                completedDate.getFullYear(),
                completedDate.getMonth(),
                completedDate.getDate() + 1,
                0, 0, 0
            ).getTime();
            
            const isLocked = now < nextMidnight;
            return { isLocked, unlockTime: nextMidnight };
        }

        return { isLocked: false, unlockTime: 0 };
    }, [enrollment, sprint, viewingDay, now]);

    useEffect(() => {
        if (dayLockDetails.isLocked && dayLockDetails.unlockTime) {
            const diff = dayLockDetails.unlockTime - now;
            if (diff > 0) {
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeToUnlock(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            } else {
                setTimeToUnlock('00:00:00');
            }
        }
    }, [dayLockDetails, now]);

    const toggleReflectionState = async () => {
        if (!enrollment) return;
        const newState = !reflectionsEnabled;
        setReflectionsEnabled(newState);
        try {
            const enrollmentRef = doc(db, 'enrollments', enrollment.id);
            await updateDoc(enrollmentRef, { reflectionsDisabled: !newState });
        } catch (err) {
            console.error("Toggle reflection state failed", err);
        }
    };

    const toggleSoundState = async () => {
        if (!enrollment) return;
        const newState = !soundEnabled;
        setSoundEnabled(newState);
        try {
            const enrollmentRef = doc(db, 'enrollments', enrollment.id);
            await updateDoc(enrollmentRef, { soundDisabled: !newState });
        } catch (err) {
            console.error("Toggle sound state failed", err);
        }
    };

    const toggleNotificationsState = async () => {
        if (!enrollment) return;
        const newState = !notificationsEnabled;
        setNotificationsEnabled(newState);
        try {
            const enrollmentRef = doc(db, 'enrollments', enrollment.id);
            await updateDoc(enrollmentRef, { notificationsDisabled: !newState });
        } catch (err) {
            console.error("Toggle notifications state failed", err);
        }
    };

    const handleFinishDay = async (reflection: string) => {
        if (!enrollment || !user || isSubmitting || !enrollment.progress) return;
        setIsSubmitting(true);
        try {
            const timestamp = new Date().toISOString();
            const isLastDay = viewingDay === enrollment.progress.length;
            const updatedProgress = enrollment.progress.map(p => 
                p.day === viewingDay ? { 
                    ...p, 
                    completed: true, 
                    completedAt: timestamp, 
                    reflection: reflection.trim(),
                    submission: proofInput,
                    proofSelection: proofSelected
                } : p
            );
            
            const enrollmentRef = doc(db, 'enrollments', enrollment.id);
            const updatePayload: any = { 
                progress: updatedProgress,
                last_activity_at: timestamp
            };

            if (isLastDay && updatedProgress.every(p => p.completed)) {
                updatePayload.completed_at = timestamp;
                updatePayload.status = 'completed';
            }

            await updateDoc(enrollmentRef, updatePayload);
            setIsReflectionModalOpen(false);

            // Play completion sound if enabled
            if (soundEnabled) {
                try {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
                    audio.play().catch(e => console.error("Sound playback failed:", e));
                } catch (e) {
                    console.error("Audio initialization failed:", e);
                }
            }

            if (isLastDay && updatedProgress.every(p => p.completed)) {
                console.log("[SprintView] Last day finished. Checking for queued sprints...");
                // Check if there are queued sprints
                const enrollments = await sprintService.getUserEnrollments(user.id);
                const hasQueued = enrollments.some(e => e.status === 'queued');
                console.log("[SprintView] hasQueued:", hasQueued);
                
                if (hasQueued) {
                    navigate('/dashboard', { replace: true, state: { showNextSprintPopup: true } });
                } else {
                    navigate('/discover', { replace: true });
                }
            }
        } catch (err) {
            console.error("Completion failed", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const dayContent = Array.isArray(sprint?.dailyContent) ? sprint?.dailyContent.find(dc => dc.day === viewingDay) : undefined;
    const dayProgress = enrollment?.progress?.find(p => p.day === viewingDay);

    const isProofMet = useMemo(() => {
        if (!dayContent) return false;
        if (dayContent.proofType === 'picker') return !!proofSelected;
        if (dayContent.proofType === 'note') return proofInput.trim().length > 2;
        return true; // confirmation
    }, [dayContent, proofInput, proofSelected]);

    const handleQuickComplete = () => {
        if (!isProofMet) return;
        if (reflectionsEnabled) {
            setIsReflectionModalOpen(true);
        } else {
            handleFinishDay("");
        }
    };

    if (!enrollment || !sprint || !enrollment.progress) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <>
            <div className="page-content w-full bg-[#FAFAFA] flex flex-col font-sans text-dark animate-fade-in pb-24">
                <header className="px-6 pt-10 pb-4 max-w-2xl mx-auto w-full sticky top-0 z-50 bg-[#FAFAFA]/90 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 active:scale-95 transition-all">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="text-center flex-1 mx-4 min-w-0">
                        <h1 className="text-lg font-black text-gray-900 truncate">{sprint.title}</h1>
                    </div>
                    <div className="flex gap-2">
                        <Link to={`/sprint/${sprint.id}`} className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 active:scale-95 transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </Link>
                        <button 
                            onClick={() => setIsChatModalOpen(true)}
                            disabled={dayLockDetails.isLocked}
                            className={`p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm transition-all relative ${dayLockDetails.isLocked ? 'opacity-40 cursor-not-allowed' : 'text-gray-400 active:scale-95'}`}
                            title={dayLockDetails.isLocked ? "Complete previous day first" : "Coaching Chat"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            {!dayLockDetails.isLocked && hasUnreadMessages && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
                            )}
                        </button>
                        <button 
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 active:scale-95 transition-all"
                            title="Sprint Settings"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                    </div>
                </div>
            </header>

            <div className="px-6 max-w-2xl mx-auto w-full space-y-6 mt-4">
                <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar scroll-smooth px-1">
                    {Array.from({ length: sprint.duration }, (_, i) => i + 1).map((day) => {
                        const isActive = viewingDay === day;
                        const prog = enrollment.progress?.find(p => p.day === day);
                        const isCompleted = prog?.completed;
                        
                        const firstIncomplete = enrollment.progress?.find(p => !p.completed)?.day || sprint.duration;
                        const isDisabled = day > firstIncomplete;

                        return (
                            <button
                                key={day}
                                disabled={isDisabled}
                                onClick={() => setViewingDay(day)}
                                className={`flex-shrink-0 w-20 h-20 rounded-[1.5rem] flex flex-col items-center justify-center relative transition-all duration-300 active:scale-95 ${
                                    isActive
                                        ? 'bg-[#0E7850] text-white shadow-xl shadow-primary/20 scale-105'
                                        : isDisabled 
                                        ? 'bg-[#F3F4F6] text-gray-200 cursor-not-allowed opacity-50'
                                        : 'bg-[#F3F4F6] text-gray-400'
                                }`}
                            >
                                {isCompleted && (
                                    <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-[#0E7850]'}`}></div>
                                )}
                                <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-white/60' : 'text-gray-300'}`}>Day</span>
                                <span className="text-3xl font-black leading-none">{day}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="bg-white rounded-3xl p-6 md:p-10 border border-gray-100 shadow-sm animate-slide-up relative overflow-hidden min-h-[400px]">
                    {enrollment.status === 'queued' && (
                        <div className="absolute inset-0 z-[150] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                            <div className="mb-6 opacity-20">
                                <LocalLogo type="favicon" className="w-24 h-24" />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight mb-2">In the Queue.</h2>
                            <p className="text-[10px] text-gray-500 font-medium mb-8 max-w-xs">
                                You have an active sprint running. This journey will automatically unlock once your current focus is complete.
                            </p>
                            <button 
                                onClick={() => navigate('/dashboard')}
                                className="px-6 py-3 bg-primary text-white rounded-2xl text-[8px] font-black uppercase tracking-widest shadow-xl active:scale-95"
                            >
                                Return to Active Focus
                            </button>
                        </div>
                    )}

                    {dayLockDetails.isLocked && (
                        <div className="absolute inset-0 z-[140] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                            <div className="mb-6 opacity-20">
                                <LocalLogo type="favicon" className="w-24 h-24" />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight mb-2">Access Locked.</h2>
                            <p className="text-[10px] text-gray-500 font-medium mb-8 max-w-xs">
                                {dayLockDetails.unlockTime 
                                    ? `Next lesson unlocks at midnight.`
                                    : dayLockDetails.reason || 'Complete previous day first.'}
                            </p>
                            
                            {dayLockDetails.unlockTime && (
                                <div className="space-y-2">
                                    <p className="text-[8px] font-black text-primary uppercase tracking-[0.4em]">Available In</p>
                                    <p className="text-3xl font-black text-gray-900 tabular-nums tracking-tighter">{timeToUnlock}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className={dayLockDetails.isLocked ? 'blur-sm pointer-events-none opacity-20' : ''}>
                        <h2 className="text-[7px] font-black text-gray-300 uppercase tracking-[0.25em] mb-6">Execution Path Day {viewingDay}</h2>
                        
                        <div className="space-y-2 mb-10">
                            <SectionHeading>Today's Insight</SectionHeading>
                            <div className="text-gray-700 font-medium text-base leading-[1.6] max-w-[60ch]">
                                <FormattedText text={dayContent?.lessonText || ""} />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 relative group">
                                <SectionHeading>Today's Action Step</SectionHeading>
                                <div className="text-gray-900 font-bold text-sm sm:text-base leading-snug">
                                    <FormattedText text={dayContent?.taskPrompt || ""} />
                                </div>
                                <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                            </div>

                            {dayContent?.coachInsight && (
                                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                    <SectionHeading color="gray-400">Coach Insight</SectionHeading>
                                    <div className="text-gray-600 font-medium text-xs md:text-sm leading-relaxed">
                                        <FormattedText text={dayContent.coachInsight} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {!dayProgress?.completed && (
                            <div className="mt-12 space-y-6 animate-fade-in">
                                {dayContent?.proofType === 'picker' && (
                                    <div className="space-y-4">
                                        <SectionHeading>Choose from options curated by you</SectionHeading>
                                        <div className="grid grid-cols-1 gap-3">
                                            {dayContent.proofOptions?.map((opt, idx) => (
                                                <button 
                                                    key={idx}
                                                    onClick={() => setProofSelected(opt)}
                                                    className={`w-full group relative overflow-hidden py-5 px-6 rounded-2xl transition-all duration-500 border text-center flex items-center justify-center active:scale-95 ${
                                                        proofSelected === opt 
                                                        ? 'bg-primary border-primary shadow-xl scale-[1.02]' 
                                                        : 'bg-white border-gray-100 hover:border-primary/30 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <div className="relative z-10 flex items-center gap-3">
                                                        <span className={`text-[10px] font-black uppercase tracking-[0.15em] transition-colors ${proofSelected === opt ? 'text-white' : 'text-gray-600'}`}>
                                                            {opt}
                                                        </span>
                                                    </div>
                                                    {proofSelected === opt && (
                                                        <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {dayContent?.proofType === 'note' && (
                                    <div className="space-y-3">
                                        <SectionHeading>Send Submission</SectionHeading>
                                        {dayContent.submissionPrompt && (
                                            <p className="text-[10px] font-bold text-gray-400 mb-2">
                                                {dayContent.submissionPrompt}
                                            </p>
                                        )}
                                        <textarea 
                                            value={proofInput}
                                            onChange={e => setProofInput(e.target.value)}
                                            placeholder="User must write a response"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm font-medium min-h-[120px] focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all"
                                        />
                                    </div>
                                )}

                                <button 
                                  onClick={handleQuickComplete}
                                  disabled={isSubmitting || !isProofMet}
                                  className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] shadow-xl transition-all ${isProofMet ? 'bg-[#159E5B] text-white shadow-primary/10 active:scale-95' : 'bg-gray-100 text-gray-300 cursor-not-allowed grayscale'}`}
                                >
                                  {dayContent?.proofType === 'note' ? 'Send Submission' : "Today's task completed"}
                                </button>
                            </div>
                        )}

                        {dayProgress?.completed && (
                            <div className="mt-12 space-y-6">
                                <div className="w-full py-5 bg-gray-50 text-gray-400 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] text-center border border-gray-100">
                                    Mission Complete
                                </div>

                                {dayProgress.submission && (
                                    <div className="animate-fade-in pt-4 border-t border-gray-50">
                                        <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Your Submission</p>
                                        <div className="bg-gray-50 rounded-[1.5rem] p-6 border border-gray-100">
                                            <p className="text-gray-700 font-bold text-sm leading-relaxed">
                                                {dayProgress.submission}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {dayProgress.proofSelection && (
                                    <div className="animate-fade-in pt-4 border-t border-gray-50">
                                        <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Confirmed Outcome</p>
                                        <div className="bg-gray-50 rounded-[1.5rem] p-4 border border-gray-100 flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                                            <p className="text-xs font-black uppercase text-gray-700">{dayProgress.proofSelection}</p>
                                        </div>
                                    </div>
                                )}

                                {dayProgress.reflection && (
                                    <div className="animate-fade-in pt-4 border-t border-gray-50">
                                        <p className="text-[7px] font-black text-primary uppercase tracking-[0.2em] mb-4">Your Breakthrough</p>
                                        <div className="bg-primary/5 rounded-[1.5rem] p-6 border border-primary/10">
                                            <p className="text-gray-800 font-medium text-sm leading-relaxed">
                                                {dayProgress.reflection}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .modal-overlay {
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  z-index: 9999;
                  background-color: transparent;
                  pointer-events: none;
                }
                .modal-content-wrapper {
                  width: 90%;
                  height: 90vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background-color: rgba(0, 0, 0, 0.1);
                  border-radius: 3rem;
                  pointer-events: auto;
                }
                .modal-content {
                  box-shadow: 0 0 60px rgba(0, 0, 0, 0.15), 0 20px 40px rgba(0, 0, 0, 0.1);
                  border: 1px solid rgba(0, 0, 0, 0.05);
                }
                @media (min-width: 768px) {
                  .modal-content-wrapper {
                    width: 60%;
                    height: 80vh;
                  }
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
            </div>

            <SprintSettingsModal 
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                reflectionsEnabled={reflectionsEnabled}
                onToggleReflections={toggleReflectionState}
                soundEnabled={soundEnabled}
                onToggleSound={toggleSoundState}
                notificationsEnabled={notificationsEnabled}
                onToggleNotifications={toggleNotificationsState}
            />
            <CoachingChatModal 
                isOpen={isChatModalOpen}
                onClose={() => setIsChatModalOpen(false)}
                sprintId={sprint.id}
                participantId={user?.id || ''}
                day={viewingDay}
                sprintTitle={sprint.title}
            />
            <ReflectionModal 
                isOpen={isReflectionModalOpen} 
                day={viewingDay} 
                question={dayContent?.reflectionQuestion}
                onClose={() => setIsReflectionModalOpen(false)} 
                onFinish={handleFinishDay} 
                isSubmitting={isSubmitting} 
            />
        </>
    );
};

export default SprintView;