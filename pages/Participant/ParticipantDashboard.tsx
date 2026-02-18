import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ParticipantSprint, Sprint, Notification } from '../../types';
import { sprintService } from '../../services/sprintService';
import { notificationService } from '../../services/notificationService';
import LocalLogo from '../../components/LocalLogo';

/**
 * Calculates if a day is locked based on the "Next Midnight" protocol.
 * A day is only accessible if the previous day is complete AND it is at least the next calendar day.
 */
const getDayStatus = (enrollment: ParticipantSprint, sprint: Sprint, now: number) => {
    if (!enrollment || !enrollment.progress || !sprint) return { day: 1, isCompleted: false, isLocked: false };
    
    const currentDayIndex = enrollment.progress.findIndex(p => !p.completed);
    
    // If all days are completed
    if (currentDayIndex === -1) {
        return { 
            day: sprint.duration, 
            isCompleted: true, 
            isLocked: false, 
            content: sprint.dailyContent ? sprint.dailyContent[sprint.dailyContent.length - 1] : null
        };
    }

    const currentDay = enrollment.progress[currentDayIndex].day;
    const content = sprint.dailyContent ? sprint.dailyContent.find(c => c.day === currentDay) : null;

    let isLocked = false;
    let unlockTime = 0;

    if (currentDay > 1) {
        const prevDay = enrollment.progress.find(p => p.day === currentDay - 1);
        if (prevDay?.completedAt) {
            const completedDate = new Date(prevDay.completedAt);
            // Lock until midnight of the next day
            const nextMidnight = new Date(
                completedDate.getFullYear(),
                completedDate.getMonth(),
                completedDate.getDate() + 1,
                0, 0, 0
            ).getTime();
            
            unlockTime = nextMidnight;
            if (now < nextMidnight) isLocked = true;
        }
    }

    return { day: currentDay, isCompleted: false, isLocked, unlockTime, content };
};

const ParticipantDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mySprints, setMySprints] = useState<{ enrollment: ParticipantSprint; sprint: Sprint }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [timeToMidnight, setTimeToMidnight] = useState<string>('00:00:00');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const enrollments = await sprintService.getUserEnrollments(user.id);
            const enriched = await Promise.all(enrollments.map(async (enrollment) => {
                const sprint = await sprintService.getSprintById(enrollment.sprint_id);
                return (sprint && enrollment) ? { enrollment, sprint } : null;
            }));
            const activeOnly = enriched.filter((item): item is { enrollment: ParticipantSprint; sprint: Sprint } => {
                return item !== null && item.enrollment.status === 'active';
            });
            setMySprints(activeOnly);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchData();

    const timerInterval = setInterval(() => {
        const currentTime = Date.now();
        setNow(currentTime);
    }, 1000);

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

  const tasksReady = activeSprintsData.filter(item => !item.status.isLocked);
  const mainTask = tasksReady[0] || activeSprintsData[0];

  useEffect(() => {
    if (mainTask?.status?.isLocked && mainTask.status.unlockTime) {
        const diff = mainTask.status.unlockTime - now;
        if (diff > 0) {
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeToMidnight(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        } else {
            setTimeToMidnight('00:00:00');
        }
    }
  }, [mainTask, now]);
  
  const overallProgress = useMemo(() => {
      if (mySprints.length === 0) return 0;
      const totalDays = mySprints.reduce((acc, curr) => acc + (curr.sprint?.duration || 0), 0);
      const completedDays = mySprints.reduce((acc, curr) => acc + (curr.enrollment?.progress?.filter(p => p.completed).length || 0), 0);
      return totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  }, [mySprints]);

  if (!user) return null;

  const isMainTaskLocked = mainTask?.status?.isLocked;
  const mainTaskProgress = mainTask ? Math.round(((mainTask.enrollment?.progress?.filter(p => p.completed).length || 0) / (mainTask.sprint?.duration || 1)) * 100) : 0;

  const hasActiveSprints = mySprints.length > 0;
  const allTasksDoneToday = hasActiveSprints && tasksReady.length === 0;

  return (
    <div className="flex flex-col h-full w-full bg-[#FDFDFD] font-sans overflow-hidden">
      <div className="h-20 flex-shrink-0"></div>

      <div className="flex-1 overflow-y-auto px-[13px] pt-4 md:pt-6 pb-24 custom-scrollbar">
          <div className="max-w-screen-md mx-auto w-full h-full flex flex-col">
            
            <div className="grid grid-cols-2 gap-3 mb-6 flex-shrink-0">
                <div className={`bg-[#0E7850] text-white p-4 rounded-3xl shadow-lg flex flex-col h-[96px] relative overflow-hidden transition-transform active:scale-[0.98] ${allTasksDoneToday ? 'justify-center items-center text-center' : 'justify-between'}`}>
                    {allTasksDoneToday ? (
                        <div className="animate-fade-in relative z-10 w-full flex flex-col items-center">
                            <h3 className="text-[13px] font-black leading-tight">Come back tomorrow</h3>
                            <p className="text-[8px] font-black uppercase tracking-[0.15em] opacity-60 mt-1">to keep rising</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-start relative z-10 w-full">
                                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.95a1 1 0 010-1.414l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM6.464 14.95a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414z" />
                                    </svg>
                                </div>
                                <p className="text-[8px] font-black uppercase tracking-[0.15em] opacity-60 text-right">
                                    Tasks Ready
                                </p>
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-black leading-none">{tasksReady.length} Remaining</h3>
                            </div>
                        </>
                    )}
                    <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                </div>

                <Link to="/growth" className="bg-white border border-gray-100 p-3.5 rounded-3xl shadow-sm flex flex-col h-[96px] hover:border-primary/30 transition-all active:scale-[0.98] group relative overflow-hidden">
                    <div className="flex justify-between items-start relative z-10">
                        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 group-hover:bg-primary/5 transition-colors">
                            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.15em] text-right group-hover:text-primary transition-colors">Growth<br/>Analysis</p>
                    </div>
                    <div className="mt-1.5 relative z-10">
                        <p className="text-xl font-black text-gray-900 leading-none mb-1">{overallProgress}%</p>
                        <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${overallProgress}%` }}></div>
                        </div>
                    </div>
                </Link>
            </div>

            <div className="flex justify-between items-center mb-4 px-1 flex-shrink-0">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                    {allTasksDoneToday ? 'Integrate & Rest' : "Today's Focus"}
                </h2>
                <Link to="/my-sprints" className="text-[8px] font-black text-primary uppercase tracking-[0.2em] hover:opacity-80 transition-opacity">
                    View Journey
                </Link>
            </div>

            <div className="flex-1 flex flex-col min-h-0 mb-6">
                {isLoading ? (
                    <div className="bg-white rounded-3xl flex-1 animate-pulse border border-gray-100 shadow-sm"></div>
                ) : mainTask && mainTask.sprint ? (
                    <Link to={`/participant/sprint/${mainTask.enrollment.id}`} className="flex flex-1 min-h-0 group">
                        <div className="bg-white rounded-[2rem] shadow-[0_15px_40px_-20px_rgba(0,0,0,0.06)] border border-gray-100 relative overflow-hidden flex flex-1 min-h-0 animate-fade-in group-hover:shadow-lg transition-all">
                            <div className={`w-2.5 flex-shrink-0 transition-colors duration-500 ${isMainTaskLocked ? 'bg-gray-200' : 'bg-[#0E7850]'}`}></div>
                            
                            <div className="flex-1 p-5 md:p-8 flex flex-col min-h-0">
                                <div className="flex justify-between items-start mb-4 flex-shrink-0">
                                    <div>
                                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">{mainTask.sprint.category}</p>
                                        <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight tracking-tight truncate max-w-[200px] mb-0.5">{mainTask.sprint.title}</h3>
                                        {!isMainTaskLocked && mainTask.sprint.subtitle && (
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest italic leading-none">{mainTask.sprint.subtitle}</p>
                                        )}
                                    </div>
                                    <div className="px-2 py-1 bg-gray-100 rounded-lg">
                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
                                            {isMainTaskLocked ? `Completed Day ${mainTask.status.day}` : `Day ${mainTask.status.day}`}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0 overflow-hidden flex flex-col mb-4">
                                    {isMainTaskLocked ? (
                                        <div className="bg-[#F9FAFB] rounded-[1.5rem] p-6 flex-1 flex flex-col items-center justify-center text-center relative overflow-hidden border border-gray-100/50">
                                            <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 opacity-[0.02] scale-[2] pointer-events-none">
                                                <LocalLogo type="favicon" className="w-48 h-48" />
                                            </div>
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2 relative z-10">Next Lesson In</p>
                                            <h4 className="text-3xl md:text-5xl font-black text-gray-800 tracking-tighter tabular-nums relative z-10 leading-none">
                                                {timeToMidnight}
                                            </h4>
                                            <p className="text-[10px] font-bold text-primary uppercase mt-4 animate-pulse relative z-10 italic">Integrate your wins...</p>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col min-h-0">
                                            <p className="text-[8px] font-black text-gray-200 uppercase tracking-[0.2em] mb-2 flex-shrink-0">Action for Today</p>
                                            <div className="bg-[#FAFAFA] rounded-xl p-4 border border-gray-100 shadow-inner overflow-y-auto flex-1 custom-scrollbar">
                                                <p className="text-gray-700 font-bold text-sm md:text-base leading-relaxed italic">
                                                    "{mainTask.status.content?.taskPrompt || "Your task for today is being generated..."}"
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-shrink-0">
                                    <div className="flex justify-between items-end mb-1.5">
                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Progress</span>
                                        <span className="text-[8px] font-black text-gray-400">{mainTaskProgress}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${isMainTaskLocked ? 'bg-primary/40' : 'bg-primary'}`} 
                                            style={{ width: `${mainTaskProgress}%` }}
                                        ></div>
                                    </div>
                                    
                                    {!isMainTaskLocked && (
                                        <div className="mt-4 w-full py-3.5 bg-[#0E7850] text-white rounded-xl font-black uppercase tracking-[0.2em] text-[8px] shadow-md flex items-center justify-center gap-2 group-hover:scale-[1.02] transition-transform">
                                            Open Task &rarr;
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Link>
                ) : (
                    <div className="py-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 flex-1 flex flex-col items-center justify-center">
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[8px]">No Active Focus. Explore Sprints to begin.</p>
                        <Link to="/discover" className="mt-2 inline-block text-primary font-black uppercase text-[8px] tracking-widest border-b-2 border-primary/20 pb-0.5">Discover Sprints</Link>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center flex-shrink-0 animate-fade-in">
                <p className="text-gray-600 font-bold italic text-xs mb-1">
                    {allTasksDoneToday ? '"Rest is as productive as action."' : '"The future depends on what you do today."'}
                </p>
                <p className="text-[8px] font-black text-[#0E7850] uppercase tracking-[0.3em]">
                    {allTasksDoneToday ? 'PLATFORM PROTOCOL' : 'MAHATMA GANDHI'}
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
      `}</style>
    </div>
  );
};

export default ParticipantDashboard;