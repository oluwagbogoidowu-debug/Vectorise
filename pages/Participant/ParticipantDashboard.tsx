import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ParticipantSprint, Sprint, Participant, Notification, NotificationPayload } from '../../types';
import { sprintService } from '../../services/sprintService';
import { notificationService } from '../../services/notificationService';
import { quoteService } from '../../services/quoteService';
import { notificationEngine, TimeOfDay, UserStage, NotificationType } from '../../services/notificationEngine';
import LocalLogo from '../../components/LocalLogo';
import FirstTimeGuide from '../../components/FirstTimeGuide';

const FALLBACK_QUOTES = [
    { text: "Your big opportunity may be right where you are now.", author: "Napoleon Hill" },
    { text: "Success is the sum of small efforts, repeated day-in and day-out.", author: "Robert Collier" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" }
];

const getDayStatus = (enrollment: ParticipantSprint, sprint: Sprint, now: number) => {
    const currentDayIndex = enrollment.progress.findIndex(p => !p.completed);
    
    if (currentDayIndex === -1) {
        return { 
            day: sprint.duration, 
            isCompleted: true, 
            isLocked: false, 
            unlockTime: 0,
            content: sprint.dailyContent[sprint.dailyContent.length - 1]
        };
    }

    const currentDay = enrollment.progress[currentDayIndex].day;
    const content = sprint.dailyContent.find(c => c.day === currentDay);

    let isLocked = false;
    let unlockTime = 0;

    if (currentDay > 1) {
        const prevDay = enrollment.progress.find(p => p.day === currentDay - 1);
        if (prevDay?.completedAt) {
            const completedDate = new Date(prevDay.completedAt);
            const nextMidnight = new Date(
                completedDate.getFullYear(),
                completedDate.getMonth(),
                completedDate.getDate() + 1,
                0, 0, 0
            ).getTime();
            
            if (now < nextMidnight) {
                isLocked = true;
                unlockTime = nextMidnight;
            }
        }
    }

    return {
        day: currentDay,
        isCompleted: false,
        isLocked,
        unlockTime,
        content
    };
};

const ParticipantDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mySprints, setMySprints] = useState<{ enrollment: ParticipantSprint; sprint: Sprint }[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [currentQuoteIdx, setCurrentQuoteIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isQuoteFading, setIsQuoteFading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  
  const [aiNudge, setAiNudge] = useState<NotificationPayload | null>(null);
  const [isGeneratingNudge, setIsGeneratingNudge] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
        if (!user) return;
        const guideSeen = localStorage.getItem('vectorise_guide_seen');
        if (!guideSeen) setShowGuide(true);

        setIsLoading(true);
        try {
            const enrollments = await sprintService.getUserEnrollments(user.id);
            const enriched = await Promise.all(enrollments.map(async (enrollment) => {
                const sprint = await sprintService.getSprintById(enrollment.sprintId);
                return sprint ? { enrollment, sprint } : null;
            }));
            const activeOnly = enriched.filter((item): item is { enrollment: ParticipantSprint; sprint: Sprint } => {
                return item !== null && item.enrollment.progress.some(p => !p.completed);
            });
            setMySprints(activeOnly);

            const fetchedQuotes = await quoteService.getQuotes();
            setQuotes(fetchedQuotes.length > 0 ? fetchedQuotes : FALLBACK_QUOTES);
            generateAiNudge(activeOnly);
        } catch (err) {
            setQuotes(FALLBACK_QUOTES);
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchData();

    let unsubscribeNotifs = () => {};
    if (user) {
        unsubscribeNotifs = notificationService.subscribeToNotifications(user.id, (newNotifs) => {
            setNotifications(newNotifs);
        });
    }
    
    const timerInterval = setInterval(() => setNow(Date.now()), 1000);
    const quoteInterval = setInterval(() => {
        setIsQuoteFading(true);
        setTimeout(() => {
            setCurrentQuoteIdx(prev => (prev + 1) % (quotes.length || 1));
            setIsQuoteFading(false);
        }, 400); 
    }, 5000);

    return () => {
        clearInterval(timerInterval);
        clearInterval(quoteInterval);
        unsubscribeNotifs();
    };
  }, [user, quotes.length]);

  const generateAiNudge = async (activeSprints: any[]) => {
    if (isGeneratingNudge) return;
    setIsGeneratingNudge(true);
    const hour = new Date().getHours();
    const timeOfDay: TimeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    let userStage: UserStage = 'clarity';
    const totalCompleted = activeSprints.reduce((acc, curr) => 
      acc + curr.enrollment.progress.filter((p: any) => p.completed).length, 0
    );
    if (totalCompleted > 10) userStage = 'execution';
    else if (totalCompleted > 3) userStage = 'skill-building';
    const type: NotificationType = Math.random() > 0.5 ? 'nudge' : 'reflection';
    const nudge = await notificationEngine.generateNotification(timeOfDay, userStage, type);
    setAiNudge(nudge);
    setIsGeneratingNudge(false);
  };

  const calculateProgress = (enrollment: ParticipantSprint) => {
    const completedDays = enrollment.progress.filter(p => p.completed).length;
    const totalDays = enrollment.progress.length;
    return totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
  };

  const activeSprintsData = useMemo(() => {
      return mySprints
        .map(item => ({ ...item, status: getDayStatus(item.enrollment, item.sprint, now) }))
        .sort((a, b) => {
            const getRank = (item: any) => item.status.isLocked ? 1 : 0;
            return getRank(a) - getRank(b);
        });
  }, [mySprints, now]);

  const tasksReady = useMemo(() => activeSprintsData.filter(item => !item.status.isLocked), [activeSprintsData]);

  const avgProgress = activeSprintsData.length > 0
    ? activeSprintsData.reduce((acc, s) => acc + calculateProgress(s.enrollment), 0) / activeSprintsData.length
    : 0;

  const handleNotificationClick = async (notif: Notification) => {
    await notificationService.markAsRead(notif.id);
    if (notif.link) navigate(notif.link);
    setShowNotifications(false);
  };

  const formatTimeAgo = (dateString: string) => {
    const diff = new Date().getTime() - new Date(dateString).getTime();
    if (diff < 60000) return 'Just now';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (!user) return null;
  const activeQuote = quotes[currentQuoteIdx] || FALLBACK_QUOTES[0];

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] w-full overflow-y-auto px-4 pt-4 pb-2 hide-scrollbar bg-light font-sans text-base">
      {showGuide && <FirstTimeGuide onClose={() => setShowGuide(false)} />}
      
      {/* Header Area */}
      <div className="flex-shrink-0 mb-8 mt-1">
        <div className="bg-white rounded-[2rem] p-3 shadow-sm border border-gray-50 flex items-center gap-4">
            <LocalLogo type="green" className="h-12 w-auto ml-2 flex-shrink-0" />
            <div className="h-8 w-px bg-gray-100 flex-shrink-0"></div>
            <Link to="/discover" className="flex-1 flex items-center gap-3 text-gray-400 hover:text-primary transition-all group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-sm font-bold uppercase tracking-widest pt-0.5">Explore</span>
            </Link>
            <div className="relative" ref={notificationRef}>
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-3 bg-gray-50 text-gray-500 hover:text-primary rounded-xl transition-all relative border border-transparent hover:border-primary/10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    {unreadCount > 0 && <span className="absolute top-2 right-2 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>}
                </button>
                {showNotifications && (
                    <div className="absolute right-0 mt-4 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 animate-fade-in origin-top-right overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><h3 className="font-black text-xs text-gray-400 uppercase tracking-widest">Updates</h3><span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full">{unreadCount} NEW</span></div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            {notifications.length > 0 ? notifications.map(n => (
                                <button key={n.id} onClick={() => handleNotificationClick(n)} className="w-full text-left px-6 py-4 border-b border-gray-50 bg-white hover:bg-gray-50 transition-colors relative group">
                                    {!n.read && <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full"></span>}
                                    <p className={`text-sm leading-snug ${n.read ? 'text-gray-500 font-medium' : 'text-gray-900 font-bold'}`}>{n.text}</p>
                                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-black tracking-widest">{formatTimeAgo(n.timestamp)}</p>
                                </button>
                            )) : <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No updates</div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* AI Nudge Block */}
      {aiNudge && (
        <div className="mb-8 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 border border-primary/10 shadow-sm relative overflow-hidden group">
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-12 h-12 bg-primary/5 text-primary rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-xs font-black text-primary uppercase tracking-widest mb-1.5">{aiNudge.title}</p>
                <p className="text-base font-medium text-gray-600 leading-relaxed italic">"{aiNudge.body}"</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 grid grid-cols-2 gap-4 mb-8">
            <div className="h-full">
                {tasksReady.length > 0 ? (
                    <div className="h-full bg-primary text-white p-6 rounded-3xl shadow-lg shadow-primary/10 flex flex-col items-start animate-fade-in overflow-hidden">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Tasks Ready</p>
                            <h3 className="text-2xl font-black leading-none">{tasksReady.length} Remaining</h3>
                        </div>
                    </div>
                ) : (
                    <div className="h-full bg-white border border-gray-100 p-6 rounded-3xl shadow-sm flex flex-col items-start animate-fade-in">
                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
                            <h3 className="text-2xl font-black text-gray-900 leading-none">All Caught Up</h3>
                        </div>
                    </div>
                )}
            </div>

            <Link to="/growth" className="bg-white p-6 border border-gray-100 rounded-3xl shadow-sm flex flex-col items-start group hover:border-primary/20 transition-all overflow-hidden">
                <div className="w-full flex justify-between items-start mb-6">
                    <div className="w-10 h-10 bg-primary/5 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                    <span className="text-2xl font-black text-primary leading-none">{avgProgress.toFixed(0)}%</span>
                </div>
                <div className="w-full">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Overall Growth</p>
                    <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${avgProgress}%` }}></div>
                    </div>
                </div>
            </Link>
      </div>

      <div className="flex-shrink-0 flex flex-col min-h-[380px] mb-10">
          <div className="flex justify-between items-end mb-4 px-1">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Focus</h2>
            <Link to="/my-sprints" className="text-primary font-bold uppercase text-xs tracking-widest hover:underline">View Journey</Link>
          </div>

          <div className="relative w-full flex-1">
              <div className="absolute inset-0 flex items-center overflow-x-auto gap-5 pb-6 snap-x hide-scrollbar px-1">
                {isLoading ? (
                    <div className="w-full h-full flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                    <>
                        {activeSprintsData.length > 0 ? (
                            activeSprintsData.map((item) => {
                                const isDoneToday = item.status.isLocked;
                                const totalDays = item.sprint.duration;
                                const completedCount = item.enrollment.progress.filter(p => p.completed).length;

                                return (
                                    <Link key={item.enrollment.id} to={`/participant/sprint/${item.enrollment.id}`} className="block h-full min-w-[90%] sm:min-w-[420px] snap-center">
                                        <div className="h-full bg-white rounded-[2.5rem] shadow-md border border-gray-50 hover:shadow-xl transition-all duration-300 flex flex-row overflow-hidden group">
                                            <div className={`w-3 h-full flex-shrink-0 ${isDoneToday ? 'bg-green-500' : 'bg-primary opacity-90 group-hover:opacity-100'}`}></div>
                                            <div className="flex-1 p-8 flex flex-col h-full">
                                                <div className="flex-1 flex flex-col overflow-hidden">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 truncate">{item.sprint.category}</p>
                                                            <h3 className="font-black text-2xl text-gray-900 leading-tight line-clamp-1">{item.sprint.title}</h3>
                                                        </div>
                                                        <span className={`text-[10px] px-3 py-1 rounded-lg font-black uppercase tracking-widest border flex-shrink-0 ${isDoneToday ? 'bg-green-50 text-green-700 border-green-100' : 'bg-primary/5 text-primary border-primary/10'}`}>
                                                            {isDoneToday ? 'DONE' : `DAY ${item.status.day}`}
                                                        </span>
                                                    </div>
                                                    
                                                    {isDoneToday ? (
                                                        <div className="flex-1 flex flex-col justify-center items-center text-center animate-fade-in space-y-8">
                                                            <div className="w-full">
                                                                <div className="flex justify-between items-end mb-3">
                                                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Today’s task completed</p>
                                                                    <p className="text-sm font-black text-gray-900">Day {completedCount} <span className="text-gray-300">/ {totalDays}</span></p>
                                                                </div>
                                                                <div className="w-full h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100 p-[2px]">
                                                                    <div className="h-full bg-green-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${(completedCount / totalDays) * 100}%` }}></div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3 py-2.5 px-5 bg-orange-50/50 rounded-full border border-orange-100 text-orange-600">
                                                                <p className="text-xs font-black uppercase tracking-widest">Next step unlocks tomorrow</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-2">
                                                            <p className="text-xs font-black text-gray-300 uppercase tracking-[0.2em] mb-3">Action for Today</p>
                                                            <p className="text-lg font-medium text-gray-700 leading-relaxed line-clamp-3 italic bg-gray-50/50 p-6 rounded-3xl border border-gray-50">"{item.status.content?.taskPrompt || "Resume your session."}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-6 pt-6 border-t border-gray-50">
                                                    <span className={`w-full inline-flex items-center justify-center gap-3 py-5 font-black uppercase tracking-widest text-sm rounded-2xl shadow-lg transition-all active:scale-[0.98] ${isDoneToday ? 'bg-gray-100 text-gray-400 shadow-none' : 'bg-primary text-white shadow-primary/20 group-hover:bg-primary-hover'}`}>
                                                        {isDoneToday ? 'View Progress' : 'Open Task'}
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <Link to="/discover" className="block h-full min-w-[90%] sm:min-w-[420px] snap-center">
                                <div className="h-full bg-gray-900 rounded-[2.5rem] shadow-xl border border-gray-800 p-10 flex flex-col justify-between text-white relative overflow-hidden group">
                                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black leading-tight mb-3 italic">New Horizons</h3>
                                        <p className="text-lg text-white/50 font-medium leading-relaxed max-w-xs">Browse high-impact tracks tailored for your blueprint.</p>
                                    </div>
                                </div>
                            </Link>
                        )}
                    </>
                )}
              </div>
          </div>
      </div>

      <div className="flex-shrink-0 mt-auto mb-2 px-1">
          <div className={`bg-white rounded-2xl p-4 border border-gray-50 shadow-sm transition-all duration-700 text-center ${isQuoteFading ? 'opacity-40' : 'opacity-100'}`}>
              <h2 className="text-sm font-bold text-gray-700 tracking-tight leading-relaxed mb-1.5 italic max-w-sm mx-auto">
                  "{activeQuote.text}"
              </h2>
              <p className="text-xs font-black text-primary/60 uppercase tracking-widest">
                  {activeQuote.author}
              </p>
          </div>
      </div>
    </div>
  );
};

export default ParticipantDashboard;