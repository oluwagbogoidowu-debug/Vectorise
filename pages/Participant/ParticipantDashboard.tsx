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
            
            // Generate nudge after data fetch
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
    }, 6000);

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
    <div className="flex flex-col h-[calc(100vh-6rem)] w-full overflow-y-auto px-4 md:px-8 py-4 hide-scrollbar bg-light font-sans text-base">
      {showGuide && <FirstTimeGuide onClose={() => setShowGuide(false)} />}
      
      {/* Header Area */}
      <div className="flex-shrink-0 mb-6 max-w-screen-xl mx-auto w-full">
        <div className="bg-white rounded-[1.5rem] p-2.5 shadow-sm border border-gray-50 flex items-center gap-3">
            <LocalLogo type="green" className="h-8 md:h-10 w-auto ml-1.5 flex-shrink-0" />
            <div className="h-6 w-px bg-gray-100 flex-shrink-0"></div>
            <Link to="/discover" className="flex-1 flex items-center gap-2 text-gray-400 hover:text-primary transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Discover</span>
            </Link>
            <button onClick={() => setShowNotifications(!showNotifications)} className="p-2.5 bg-gray-50 text-gray-500 hover:text-primary rounded-xl relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </button>
        </div>
      </div>

      {/* AI Nudge Block - Standardized text size */}
      {aiNudge && (
        <div className="mb-6 animate-fade-in max-w-screen-xl mx-auto w-full px-1">
          <div className="bg-white rounded-2xl p-4 border border-primary/10 shadow-sm flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/5 text-primary rounded-xl flex items-center justify-center flex-shrink-0">⚡</div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{aiNudge.title}</p>
                <p className="text-sm font-medium text-gray-600 leading-snug italic">"{aiNudge.body}"</p>
              </div>
          </div>
        </div>
      )}

      {/* Stats Summary - Responsive stack */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-3 mb-6 max-w-screen-xl mx-auto w-full px-1">
            <div className={`h-full p-4 rounded-2xl border transition-all ${tasksReady.length > 0 ? 'bg-primary text-white border-primary shadow-lg shadow-primary/10' : 'bg-white border-gray-100 text-gray-400'}`}>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">Ready Now</p>
                <h3 className="text-xl font-black leading-none">{tasksReady.length} Sprint Tasks</h3>
            </div>
            <Link to="/growth" className="bg-white p-4 border border-gray-100 rounded-2xl flex flex-col justify-between hover:border-primary/20 transition-all">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Growth Index</p>
                <div className="flex items-end justify-between">
                    <span className="text-xl font-black text-gray-900">Portfolio</span>
                    <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7"/></svg>
                </div>
            </Link>
      </div>

      {/* Focus Section - Main Content */}
      <div className="flex-shrink-0 mb-8 max-w-screen-xl mx-auto w-full px-1">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Today's Focus</h2>
            <Link to="/my-sprints" className="text-primary font-black uppercase text-[10px] tracking-widest hover:underline">Full Journey</Link>
          </div>

          <div className="space-y-4">
            {isLoading ? (
                <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
            ) : activeSprintsData.length > 0 ? (
                activeSprintsData.map((item) => (
                    <Link key={item.enrollment.id} to={`/participant/sprint/${item.enrollment.id}`} className="block group">
                        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all flex gap-5 overflow-hidden">
                            <div className={`w-1 flex-shrink-0 rounded-full ${item.status.isLocked ? 'bg-green-500' : 'bg-primary'}`}></div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 truncate pr-4">{item.sprint.category}</p>
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${item.status.isLocked ? 'bg-green-50 text-green-700' : 'bg-primary/5 text-primary'}`}>
                                        {item.status.isLocked ? 'Done' : `Day ${item.status.day}`}
                                    </span>
                                </div>
                                <h3 className="font-black text-lg text-gray-900 leading-tight mb-3 truncate">{item.sprint.title}</h3>
                                {!item.status.isLocked && (
                                    <p className="text-sm font-medium text-gray-500 leading-snug italic line-clamp-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        "{item.status.content?.taskPrompt || "Open session to view action."}"
                                    </p>
                                )}
                            </div>
                        </div>
                    </Link>
                ))
            ) : (
                <Link to="/discover" className="block text-center py-16 bg-gray-900 rounded-3xl text-white px-6">
                    <h3 className="text-xl font-black mb-2 italic">New Horizons</h3>
                    <p className="text-sm text-white/50 mb-6 font-medium">Browse high-impact tracks tailored for your profile.</p>
                    <button className="px-6 py-3 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-full">Explore Catalog</button>
                </Link>
            )}
          </div>
      </div>

      {/* Daily Quote Footer */}
      <div className="flex-shrink-0 mt-auto mb-2 max-w-screen-xl mx-auto w-full px-1">
          <div className={`bg-white rounded-2xl p-4 border border-gray-50 transition-all duration-700 text-center ${isQuoteFading ? 'opacity-40' : 'opacity-100'}`}>
              <h2 className="text-xs sm:text-sm font-bold text-gray-600 italic mb-1.5 px-4 line-clamp-2">
                  "{activeQuote.text}"
              </h2>
              <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">
                  {activeQuote.author}
              </p>
          </div>
      </div>
    </div>
  );
};

export default ParticipantDashboard;