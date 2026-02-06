
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

  if (!user) return null;

  const mainTask = tasksReady[0] || activeSprintsData[0];

  return (
    <div className="flex flex-col h-full w-full bg-[#FDFDFD] font-sans overflow-hidden">
      
      {/* Spacer for Floating Header */}
      <div className="h-20 flex-shrink-0"></div>

      {/* BODY CONTENT - pb-24 added for navigation space */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 md:pt-6 pb-24 custom-scrollbar">
          <div className="max-w-screen-md mx-auto w-full h-full flex flex-col">
            
            {/* 1. TOP STATS ROW - Rearranged for space maximization */}
            <div className="grid grid-cols-2 gap-3 mb-6 flex-shrink-0">
                <div className="bg-[#0E7850] text-white p-4 rounded-3xl shadow-lg flex flex-col h-[115px] relative overflow-hidden transition-transform active:scale-[0.98]">
                    <div className="flex justify-between items-start relative z-10">
                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.95a1 1 0 010-1.414l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM6.464 14.95a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414z" />
                            </svg>
                        </div>
                        <p className="text-[8px] font-black uppercase tracking-[0.15em] opacity-60 text-right">Tasks<br/>Ready</p>
                    </div>
                    <div className="mt-auto relative z-10">
                        <h3 className="text-xl font-black leading-none">{tasksReady.length} Remaining</h3>
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                </div>

                <Link to="/growth" className="bg-white border border-gray-100 p-4 rounded-3xl shadow-sm flex flex-col h-[115px] hover:border-primary/30 transition-all active:scale-[0.98] group relative overflow-hidden">
                    <div className="flex justify-between items-start relative z-10">
                        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 group-hover:bg-primary/5 transition-colors">
                            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.15em] text-right group-hover:text-primary transition-colors">Growth<br/>Analysis</p>
                    </div>
                    <div className="mt-auto relative z-10">
                        <p className="text-xl font-black text-gray-900 leading-none mb-1.5">{overallProgress}%</p>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${overallProgress}%` }}></div>
                        </div>
                    </div>
                </Link>
            </div>

            {/* 2. SECTION HEADER - Static */}
            <div className="flex justify-between items-center mb-4 px-1 flex-shrink-0">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Today's Focus</h2>
                <Link to="/my-sprints" className="text-[8px] font-black text-primary uppercase tracking-[0.2em] hover:opacity-80 transition-opacity">
                    View Journey
                </Link>
            </div>

            {/* 3. MAIN TASK CARD - Flex-Grow to fill middle */}
            <div className="flex-1 flex flex-col min-h-0 mb-6">
                {isLoading ? (
                    <div className="bg-white rounded-3xl flex-1 animate-pulse border border-gray-100 shadow-sm"></div>
                ) : mainTask ? (
                    <div className="bg-white rounded-[2rem] shadow-[0_15px_40px_-20px_rgba(0,0,0,0.06)] border border-gray-100 relative overflow-hidden flex flex-1 min-h-0 animate-fade-in">
                        {/* The thick vertical green bar */}
                        <div className="w-2.5 bg-[#0E7850] flex-shrink-0"></div>
                        
                        <div className="flex-1 p-5 md:p-8 flex flex-col min-h-0">
                            <div className="flex justify-between items-start mb-3 flex-shrink-0">
                                <div>
                                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">{mainTask.sprint.category}</p>
                                    <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight tracking-tight truncate max-w-[200px]">{mainTask.sprint.title}</h3>
                                </div>
                                <div className="px-2 py-0.5 border border-primary/20 rounded-md bg-primary/5">
                                    <span className="text-[8px] font-black text-primary uppercase tracking-widest">Day {mainTask.status.day}</span>
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 overflow-hidden flex flex-col mb-4">
                                <p className="text-[8px] font-black text-gray-200 uppercase tracking-[0.2em] mb-2 flex-shrink-0">Action for Today</p>
                                <div className="bg-[#FAFAFA] rounded-xl p-4 border border-gray-50 shadow-inner overflow-y-auto flex-1 custom-scrollbar">
                                    <p className="text-gray-700 font-bold text-sm md:text-base leading-relaxed italic">
                                        "{mainTask.status.content?.taskPrompt || "Your task for today is being generated..."}"
                                    </p>
                                </div>
                            </div>

                            <Link to={`/participant/sprint/${mainTask.enrollment.id}`} className="block flex-shrink-0">
                                <button className="w-full py-4 bg-[#0E7850] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[9px] shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2">
                                    Open Task
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="py-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 flex-1 flex flex-col items-center justify-center">
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[8px]">No Active Focus. Explore Sprints to begin.</p>
                        <Link to="/discover" className="mt-2 inline-block text-primary font-black uppercase text-[8px] tracking-widest border-b-2 border-primary/20 pb-0.5">Discover Sprints</Link>
                    </div>
                )}
            </div>

            {/* 4. QUOTE CARD - Positioned with space for bottom navigation */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center flex-shrink-0 animate-fade-in">
                <p className="text-gray-600 font-bold italic text-xs mb-1">
                    "The future depends on what you do today."
                </p>
                <p className="text-[8px] font-black text-[#0E7850] uppercase tracking-[0.3em]">
                    MAHATMA GANDHI
                </p>
            </div>
          </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.05); border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ParticipantDashboard;
