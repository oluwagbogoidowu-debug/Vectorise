
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ParticipantSprint, Sprint, Notification, NotificationPayload } from '../../types';
import { sprintService } from '../../services/sprintService';
import { notificationService } from '../../services/notificationService';
import { quoteService } from '../../services/quoteService';
import { notificationEngine } from '../../services/notificationEngine';
import LocalLogo from '../../components/LocalLogo';
import FirstTimeGuide from '../../components/FirstTimeGuide';

const FALLBACK_QUOTES = [
    { text: "Your big opportunity may be right where you are now.", author: "Napoleon Hill" },
    { text: "Success is the sum of small efforts, repeated day-in and day-out.", author: "Robert Collier" }
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

    return { day: currentDay, isCompleted: false, isLocked, unlockTime, content };
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
            
            if (activeOnly.length > 0) {
                const nudge = await notificationEngine.generateNotification('morning', 'clarity', 'nudge');
                setAiNudge(nudge);
            }
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
    }, 10000);

    return () => {
        clearInterval(timerInterval);
        clearInterval(quoteInterval);
        unsubscribeNotifs();
    };
  }, [user, quotes.length]);

  const activeSprintsData = useMemo(() => {
      return mySprints
        .map(item => ({ ...item, status: getDayStatus(item.enrollment, item.sprint, now) }))
        .sort((a, b) => (a.status.isLocked ? 1 : 0) - (b.status.isLocked ? 1 : 0));
  }, [mySprints, now]);

  const tasksReady = useMemo(() => activeSprintsData.filter(item => !item.status.isLocked), [activeSprintsData]);

  if (!user) return null;
  const activeQuote = quotes[currentQuoteIdx] || FALLBACK_QUOTES[0];

  return (
    <div className="flex flex-col h-screen w-full bg-[#FDFDFD] font-sans text-sm overflow-hidden">
      {showGuide && <FirstTimeGuide onClose={() => setShowGuide(false)} />}
      
      {/* 1. PREMIUM STICKY HEADER */}
      <div className="px-6 pt-4 pb-4 border-b border-gray-100/60 flex-shrink-0 bg-white/80 backdrop-blur-md z-30">
        <div className="max-w-screen-lg mx-auto flex items-center justify-between gap-4">
            <Link to="/" className="hover:scale-105 transition-transform">
                <LocalLogo type="green" className="h-7 w-auto object-contain" />
            </Link>
            
            <div className="flex items-center gap-4">
                <Link to="/discover" className="hidden sm:flex items-center gap-2 text-gray-400 hover:text-primary transition-all px-3 py-1.5 rounded-full hover:bg-primary/5 group">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Catalog</span>
                </Link>
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-gray-400 hover:text-primary transition-all rounded-full hover:bg-primary/5 active:scale-90">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    {notifications.some(n => !n.read) && <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white animate-pulse"></span>}
                </button>
                <Link to="/profile" className="flex-shrink-0 transition-transform hover:scale-110 active:scale-95">
                    <img src={user.profileImageUrl} alt="" className="w-8 h-8 rounded-xl object-cover border border-gray-100 shadow-sm" />
                </Link>
            </div>
        </div>
      </div>

      {/* 2. SCROLLABLE DASHBOARD CORE */}
      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar pb-32">
          <div className="max-w-screen-lg mx-auto w-full">
            
            {/* AI Catalyst Nudge */}
            {aiNudge && (
                <div className="mb-8 animate-fade-in-up">
                    <div className="bg-white rounded-[2rem] p-6 border border-primary/10 shadow-[0_10px_30px_-15px_rgba(14,120,80,0.15)] flex items-center gap-6 relative overflow-hidden group">
                        <div className="w-12 h-12 bg-primary/5 text-primary rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl shadow-inner group-hover:scale-110 transition-transform duration-500">⚡</div>
                        <div className="min-w-0 flex-1 relative z-10">
                            <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-1.5">Catalyst Protocol</p>
                            <p className="text-base font-bold text-gray-900 leading-tight italic">
                                "{aiNudge.body}"
                            </p>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    </div>
                </div>
            )}

            {/* Top Metrics Hierarchy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                <div className={`p-8 rounded-[2rem] border transition-all duration-500 shadow-sm flex flex-col justify-between h-40 ${tasksReady.length > 0 ? 'bg-primary text-white border-primary shadow-primary/20' : 'bg-white border-gray-100 text-gray-400 opacity-60'}`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Ready Cycles</p>
                    <div>
                        <h3 className="text-5xl font-black leading-none mb-1">{tasksReady.length}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Requires Execution Today</p>
                    </div>
                </div>
                <Link to="/growth" className="bg-white p-8 border border-gray-100 rounded-[2.5rem] flex flex-col justify-between h-40 hover:border-primary/30 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 group">
                    <div className="flex justify-between items-start">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Registry Portfolio</p>
                        <svg className="h-5 w-5 text-gray-300 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7"/></svg>
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-gray-900 leading-none mb-1 italic">Growth Index</h3>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Access Analytics &rarr;</p>
                    </div>
                </Link>
            </div>

            {/* Focus Feed Section */}
            <div className="mb-12">
                <div className="flex justify-between items-end mb-6 px-1">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight italic">Focus.</h2>
                    <Link to="/my-sprints" className="text-primary font-black uppercase text-[9px] tracking-[0.2em] hover:underline pb-1">View Entire Path</Link>
                </div>

                <div className="space-y-4">
                    {isLoading ? (
                        <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                    ) : activeSprintsData.length > 0 ? (
                        activeSprintsData.map((item) => (
                            <Link key={item.enrollment.id} to={`/participant/sprint/${item.enrollment.id}`} className="block group">
                                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:border-primary/20 hover:shadow-xl transition-all duration-500 flex flex-col sm:flex-row gap-6 items-center">
                                    <div className="w-full sm:w-20 h-20 bg-gray-50 rounded-2xl flex-shrink-0 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-700">
                                        <img src={item.sprint.coverImageUrl} className={`w-full h-full object-cover ${item.status.isLocked ? 'grayscale opacity-40' : ''}`} alt="" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-400 truncate pr-4">{item.sprint.category}</p>
                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${item.status.isLocked ? 'bg-gray-100 text-gray-400' : 'bg-primary/10 text-primary animate-pulse'}`}>
                                                {item.status.isLocked ? 'Locked' : `Session ${item.status.day}`}
                                            </span>
                                        </div>
                                        <h3 className="font-black text-lg text-gray-900 leading-tight mb-2 truncate group-hover:text-primary transition-colors">{item.sprint.title}</h3>
                                        {!item.status.isLocked ? (
                                            <p className="text-xs font-medium text-gray-500 leading-relaxed italic line-clamp-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                                "{item.status.content?.taskPrompt || "Session ready for review."}"
                                            </p>
                                        ) : (
                                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Unlocking at Midnight</p>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${item.status.isLocked ? 'bg-gray-50 text-gray-300' : 'bg-primary text-white shadow-lg shadow-primary/20 group-hover:scale-110'}`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7"/></svg>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <Link to="/discover" className="block text-center py-16 bg-gray-900 rounded-[3rem] text-white px-8 shadow-2xl relative overflow-hidden group">
                            <div className="relative z-10">
                                <h3 className="text-3xl font-black mb-2 italic tracking-tighter">Horizon Clear.</h3>
                                <p className="text-sm text-white/50 mb-8 font-medium max-w-xs mx-auto leading-relaxed">No active sprints detected. Your growth legacy awaits its next cycle.</p>
                                <button className="px-10 py-4 bg-primary text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-full shadow-lg group-hover:scale-105 active:scale-95 transition-all">Explore Catalog</button>
                            </div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
                        </Link>
                    )}
                </div>
            </div>
          </div>
      </div>

      {/* 3. ELEGANT QUOTE FOOTER (STICKY) */}
      <div className="flex-shrink-0 px-8 py-5 bg-white border-t border-gray-100/60 mb-16 sm:mb-0 relative z-30">
          <div className={`transition-all duration-1000 max-w-screen-lg mx-auto text-center ${isQuoteFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
              <h2 className="text-xs md:text-sm font-bold text-gray-500 italic mb-1.5 line-clamp-1 tracking-tight">
                  "{activeQuote.text}"
              </h2>
              <p className="text-[8px] font-black text-primary/40 uppercase tracking-[0.3em]">
                  {activeQuote.author}
              </p>
          </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.04); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(14, 120, 80, 0.1); }
        
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default ParticipantDashboard;
