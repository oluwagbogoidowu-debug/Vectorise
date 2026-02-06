
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ParticipantSprint, Sprint, Notification } from '../../types';
import { sprintService } from '../../services/sprintService';
import { notificationService } from '../../services/notificationService';
import LocalLogo from '../../components/LocalLogo';

const getDayStatus = (enrollment: ParticipantSprint, sprint: Sprint, now: number) => {
    const currentDayIndex = enrollment.progress.findIndex(p => !p.completed);
    
    if (currentDayIndex === -1) {
        return { 
            day: sprint.duration, 
            isCompleted: true, 
            isLocked: false, 
            content: sprint.dailyContent[sprint.dailyContent.length - 1]
        };
    }

    const currentDay = enrollment.progress[currentDayIndex].day;
    const content = sprint.dailyContent.find(c => c.day === currentDay);

    let isLocked = false;
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
            if (now < nextMidnight) isLocked = true;
        }
    }

    return { day: currentDay, isCompleted: false, isLocked, content };
};

const ParticipantDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mySprints, setMySprints] = useState<{ enrollment: ParticipantSprint; sprint: Sprint }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
        if (!user) return;
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
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchData();
    const timerInterval = setInterval(() => setNow(Date.now()), 10000);

    let unsubscribeNotifs = () => {};
    if (user) {
        unsubscribeNotifs = notificationService.subscribeToNotifications(user.id, (newNotifs) => {
            setNotifications(newNotifs);
        });
    }

    return () => {
        clearInterval(timerInterval);
        unsubscribeNotifs();
    };
  }, [user]);

  const activeSprintsData = useMemo(() => {
      return mySprints
        .map(item => ({ ...item, status: getDayStatus(item.enrollment, item.sprint, now) }))
        .sort((a, b) => (a.status.isLocked ? 1 : 0) - (b.status.isLocked ? 1 : 0));
  }, [mySprints, now]);

  const tasksReady = useMemo(() => activeSprintsData.filter(item => !item.status.isLocked), [activeSprintsData]);
  
  const overallProgress = useMemo(() => {
      if (mySprints.length === 0) return 0;
      const totalDays = mySprints.reduce((acc, curr) => acc + curr.sprint.duration, 0);
      const completedDays = mySprints.reduce((acc, curr) => acc + curr.enrollment.progress.filter(p => p.completed).length, 0);
      return Math.round((completedDays / totalDays) * 100);
  }, [mySprints]);

  const handleNotificationClick = async (n: Notification) => {
    await notificationService.markAsRead(n.id);
    if (n.actionUrl) {
        navigate(n.actionUrl);
        setShowNotifications(false);
    }
  };

  if (!user) return null;

  const mainTask = tasksReady[0] || activeSprintsData[0];

  return (
    <div className="flex flex-col h-full w-full bg-[#FDFDFD] font-sans overflow-hidden">
      
      {/* HEADER - Fixed height to keep content strictly aligned */}
      <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-white/80 backdrop-blur-md z-30">
        <div className="max-w-screen-md mx-auto flex items-center justify-between gap-4">
            <Link to="/" className="hover:scale-105 transition-transform">
                <LocalLogo type="green" className="h-7 w-auto object-contain" />
            </Link>
            
            <div className="flex items-center gap-4">
                <div className="relative">
                    <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-gray-400 hover:text-primary transition-all rounded-full hover:bg-primary/5 active:scale-90">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        {notifications.some(n => !n.isRead) && <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white animate-pulse"></span>}
                    </button>

                    {showNotifications && (
                      <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-100 rounded-3xl shadow-2xl z-[100] overflow-hidden animate-slide-up origin-top-right">
                          <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Registry Feed</span>
                              <button onClick={() => setShowNotifications(false)} className="text-[9px] font-black text-primary uppercase">Close</button>
                          </div>
                          <div className="max-h-96 overflow-y-auto custom-scrollbar">
                              {notifications.length > 0 ? (
                                  notifications.map((n) => (
                                      <div key={n.id} onClick={() => handleNotificationClick(n)} className={`px-6 py-4 border-b border-gray-50 cursor-pointer transition-colors flex gap-3 items-start ${!n.isRead ? 'bg-primary/5' : 'hover:bg-gray-50 opacity-60'}`}>
                                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${!n.isRead ? 'bg-primary' : 'bg-transparent'}`}></div>
                                          <div>
                                              <p className="text-xs font-black text-gray-900 leading-none mb-1">{n.title}</p>
                                              <p className="text-[11px] font-medium text-gray-500 leading-relaxed italic">{n.body}</p>
                                          </div>
                                      </div>
                                  ))
                              ) : (
                                  <div className="p-10 text-center text-gray-300 italic text-xs">Horizon Clear.</div>
                              )}
                          </div>
                      </div>
                    )}
                </div>
                <Link to="/profile" className="flex-shrink-0 transition-transform hover:scale-110 active:scale-95">
                    <img src={user.profileImageUrl} alt="" className="w-8 h-8 rounded-xl object-cover border border-gray-100 shadow-sm" />
                </Link>
            </div>
        </div>
      </div>

      {/* BODY CONTENT - Only this area scrolls if needed */}
      <div className="flex-1 overflow-y-auto px-5 py-6 custom-scrollbar pb-16">
          <div className="max-w-screen-md mx-auto w-full">
            
            {/* 1. TOP STATS ROW */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                {/* Tasks Ready Card */}
                <div className="bg-primary text-white p-6 rounded-[2rem] shadow-lg shadow-primary/10 flex flex-col justify-between h-[150px] relative overflow-hidden">
                    <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center relative z-10">
                        <svg className="w-4.5 h-4.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.95a1 1 0 010-1.414l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM6.464 14.95a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414z" />
                        </svg>
                    </div>
                    <div className="relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Tasks Ready</p>
                        <h3 className="text-xl font-black leading-none">{tasksReady.length} Remaining</h3>
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                </div>

                {/* Growth Analysis Card */}
                <div className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between h-[150px]">
                    <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                        <svg className="w-4.5 h-4.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-2">
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Growth Analysis</p>
                           <p className="text-xl font-black text-gray-900 leading-none">{overallProgress}%</p>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${overallProgress}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. SECTION HEADER */}
            <div className="flex justify-between items-center mb-5 px-1">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Today's Focus</h2>
                <Link to="/my-sprints" className="text-[9px] font-black text-primary uppercase tracking-[0.2em] hover:opacity-80 transition-opacity">
                    View Journey
                </Link>
            </div>

            {/* 3. MAIN TASK CARD */}
            {isLoading ? (
                <div className="bg-white rounded-[2.5rem] h-64 animate-pulse border border-gray-100 shadow-sm"></div>
            ) : mainTask ? (
                <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.06)] border border-gray-100 relative overflow-hidden flex animate-fade-in">
                    {/* Vertical accent bar */}
                    <div className="w-3 bg-primary flex-shrink-0"></div>
                    
                    <div className="flex-1 p-8 md:p-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{mainTask.sprint.category}</p>
                                <h3 className="text-2xl font-black text-gray-900 leading-tight mb-6">{mainTask.sprint.title}</h3>
                            </div>
                            <div className="px-2.5 py-1 border border-primary/20 rounded-lg bg-primary/5">
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest">Day {mainTask.status.day}</span>
                            </div>
                        </div>

                        <div className="mb-10">
                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-3">Action for Today</p>
                            <div className="bg-[#FAFAFA] rounded-2xl p-5 border border-gray-50">
                                <p className="text-gray-700 font-bold text-base leading-relaxed italic">
                                    "{mainTask.status.content?.taskPrompt || "Your task for today is being generated..."}"
                                </p>
                            </div>
                        </div>

                        <Link to={`/participant/sprint/${mainTask.enrollment.id}`} className="block">
                            <button className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.25em] text-[10px] shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3">
                                Open Task
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7" />
                                </svg>
                            </button>
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="py-20 text-center bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">No Active Focus. Explore Sprints to begin.</p>
                    <Link to="/discover" className="mt-4 inline-block text-primary font-black uppercase text-[9px] tracking-widest border-b-2 border-primary/20 pb-1">Discover Sprints</Link>
                </div>
            )}
          </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.05); border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ParticipantDashboard;
