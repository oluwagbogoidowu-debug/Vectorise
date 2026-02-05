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
    }, 8000);

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
    <div className="flex flex-col min-h-screen w-full px-4 md:px-6 py-3 bg-light font-sans text-base">
      {showGuide && <FirstTimeGuide onClose={() => setShowGuide(false)} />}
      
      {/* Header Area */}
      <div className="flex-shrink-0 mb-4 max-w-screen-lg mx-auto w-full">
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-50 flex items-center gap-2">
            <LocalLogo type="green" className="h-7 md:h-8 w-auto ml-1 flex-shrink-0" />
            <div className="h-5 w-px bg-gray-100 flex-shrink-0"></div>
            <Link to="/discover" className="flex-1 flex items-center gap-2 text-gray-400 hover:text-primary transition-all px-2 py-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <span className="text-[10px] font-black uppercase tracking-widest">Discover</span>
            </Link>
            <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-gray-400 hover:text-primary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </button>
        </div>
      </div>

      {/* AI Nudge Block - Condensed */}
      {aiNudge && (
        <div className="mb-4 animate-fade-in max-w-screen-lg mx-auto w-full">
          <div className="bg-white rounded-xl p-3 border border-primary/10 shadow-sm flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/5 text-primary rounded-lg flex items-center justify-center flex-shrink-0 text-sm">⚡</div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-0.5">{aiNudge.title}</p>
                <p className="text-sm font-medium text-gray-600 leading-tight italic line-clamp-2">"{aiNudge.body}"</p>
              </div>
          </div>
        </div>
      )}

      {/* Stats Summary - Tightened */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-3 mb-4 max-w-screen-lg mx-auto w-full">
            <div className={`p-3.5 rounded-xl border transition-all ${tasksReady.length > 0 ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white border-gray-100 text-gray-400'}`}>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Ready Now</p>
                <h3 className="text-lg font-black leading-none">{tasksReady.length} Sprint Tasks</h3>
            </div>
            <Link to="/growth" className="bg-white p-3.5 border border-gray-100 rounded-xl flex flex-col justify-between hover:border-primary/20 transition-all shadow-sm">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Growth Index</p>
                <div className="flex items-end justify-between">
                    <span className="text-lg font-black text-gray-900 leading-none">Portfolio</span>
                    <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7"/></svg>
                </div>
            </Link>
      </div>

      {/* Focus Section - Compact */}
      <div className="flex-shrink-0 mb-6 max-w-screen-lg mx-auto w-full">
          <div className="flex justify-between items-end mb-3 px-1">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Today's Focus</h2>
            <Link to="/my-sprints" className="text-primary font-black uppercase text-[9px] tracking-widest hover:underline">Full Journey</Link>
          </div>

          <div className="space-y-3">
            {isLoading ? (
                <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
            ) : activeSprintsData.length > 0 ? (
                activeSprintsData.map((item) => (
                    <Link key={item.enrollment.id} to={`/participant/sprint/${item.enrollment.id}`} className="block group">
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 hover:shadow-md transition-all flex gap-4 overflow-hidden">
                            <div className={`w-1 flex-shrink-0 rounded-full ${item.status.isLocked ? 'bg-green-500' : 'bg-primary'}`}></div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1.5">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 truncate pr-2">{item.sprint.category}</p>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${item.status.isLocked ? 'bg-green-50 text-green-700' : 'bg-primary/5 text-primary'}`}>
                                        {item.status.isLocked ? 'Done' : `Day ${item.status.day}`}
                                    </span>
                                </div>
                                <h3 className="font-bold text-base text-gray-900 leading-tight mb-2 truncate">{item.sprint.title}</h3>
                                {!item.status.isLocked && (
                                    <p className="text-xs font-medium text-gray-500 leading-snug italic line-clamp-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                        "{item.status.content?.taskPrompt || "Open session to view action."}"
                                    </p>
                                )}
                            </div>
                        </div>
                    </Link>
                ))
            ) : (
                <Link to="/discover" className="block text-center py-10 bg-gray-900 rounded-2xl text-white px-5 shadow-lg">
                    <h3 className="text-lg font-black mb-1 italic">New Horizons</h3>
                    <p className="text-xs text-white/50 mb-5 font-medium">Find your next high-impact sprint cycle.</p>
                    <button className="px-6 py-2.5 bg-primary text-white font-black uppercase tracking-widest text-[9px] rounded-full">Explore Catalog</button>
                </Link>
            )}
          </div>
      </div>

      {/* Daily Quote Footer - Smaller and less padding */}
      <div className="flex-shrink-0 mt-auto mb-20 max-w-screen-lg mx-auto w-full">
          <div className={`bg-white rounded-xl p-3 border border-gray-50 transition-all duration-700 text-center shadow-sm ${isQuoteFading ? 'opacity-30' : 'opacity-100'}`}>
              <h2 className="text-[11px] font-bold text-gray-500 italic mb-1 px-4 line-clamp-2 leading-snug">
                  "{activeQuote.text}"
              </h2>
              <p className="text-[9px] font-black text-primary/50 uppercase tracking-widest">
                  {activeQuote.author}
              </p>
          </div>
      </div>
    </div>
  );
};

export default ParticipantDashboard;