import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ParticipantSprint, Sprint, Notification } from '../../types';
import { sprintService } from '../../services/sprintService';
import { notificationService } from '../../services/notificationService';
import LocalLogo from '../../components/LocalLogo';
import ArchetypeAvatar from '../../components/ArchetypeAvatar';
import { ARCHETYPES } from '../../constants';
import { Participant } from '../../types';

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
  const [queuedSprints, setQueuedSprints] = useState<{ enrollment: ParticipantSprint; sprint: Sprint }[]>([]);
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
            
            const queuedOnly = enriched.filter((item): item is { enrollment: ParticipantSprint; sprint: Sprint } => {
                return item !== null && item.enrollment.status === 'queued';
            });

            setMySprints(activeOnly);
            setQueuedSprints(queuedOnly);
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

  const p = user as Participant;
  const currentArchetype = ARCHETYPES.find(a => a.id === p.archetype);

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#FDFDFD] font-sans overflow-x-hidden">
      <header className="h-20 flex-shrink-0 px-6 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-gray-50 fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="relative group">
            <ArchetypeAvatar 
              archetypeId={p.archetype} 
              profileImageUrl={p.profileImageUrl} 
              size="md" 
            />
            <div className="absolute -bottom-1 -right-1 bg-primary text-white w-3.5 h-3.5 rounded-md flex items-center justify-center shadow-md text-[6px] font-black italic">V</div>
          </Link>
          <div>
            <h2 className="text-xs font-black text-gray-900 tracking-tight italic leading-none">{p.name}</h2>
            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{currentArchetype?.name || 'Initiate'}</p>
          </div>
        </div>
        <LocalLogo type="favicon" className="w-6 h-6 opacity-20" />
      </header>

      <div className="h-20 flex-shrink-0"></div>

      <div className="flex-1 px-4 md:px-6 pt-4 md:pt-6 pb-24">
          <div className="max-w-screen-md mx-auto w-full flex flex-col">
            
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
                <div className={`bg-[#0E7850] text-white p-4 md:p-5 rounded-[1.5rem] shadow-lg flex flex-col min-h-[100px] md:min-h-[120px] relative overflow-hidden transition-transform active:scale-[0.98] ${allTasksDoneToday ? 'justify-center items-center text-center' : 'justify-between'}`}>
                    {allTasksDoneToday ? (
                        <div className="animate-fade-in relative z-10 w-full flex flex-col items-center">
                            <h3 className="text-xs md:text-sm font-black leading-tight">Come back tomorrow</h3>
                        </div>
                    ) : (
                        <>
                            <div className="w-7 h-7 md:w-8 md:h-8 bg-white/20 rounded-lg flex items-center justify-center mb-1">
                                <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="relative z-10">
                                <p className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.1em] opacity-70 mb-0.5">
                                    Today's Task Ready
                                </p>
                                <h3 className="text-sm md:text-base font-black leading-none">{tasksReady.length} Remaining</h3>
                            </div>
                        </>
                    )}
                    <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
                </div>

                <Link to="/growth" className="bg-white border border-gray-100 p-4 md:p-5 rounded-[1.5rem] shadow-sm flex flex-col min-h-[100px] md:min-h-[120px] hover:border-primary/30 transition-all active:scale-[0.98] group relative overflow-hidden">
                    <div className="flex justify-between items-start relative z-10">
                        <div className="w-7 h-7 md:w-8 md:h-8 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100 group-hover:bg-primary/5 transition-colors">
                            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0E7850]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                        <p className="text-sm md:text-base font-black text-gray-900 leading-none">{overallProgress}%</p>
                    </div>
                    <div className="mt-auto relative z-10">
                        <p className="text-[7px] md:text-[8px] font-black text-gray-400 uppercase tracking-[0.1em] mb-1.5 group-hover:text-primary transition-colors">Growth Analysis</p>
                        <div className="h-1 w-full bg-gray-50 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0E7850] rounded-full transition-all duration-1000" style={{ width: `${overallProgress}%` }}></div>
                        </div>
                    </div>
                </Link>
            </div>

            <div className="flex justify-between items-end mb-6 px-1">
                <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                    {allTasksDoneToday ? 'Integrate & Rest' : "Today's Focus"}
                </h2>
                <Link to="/my-sprints" className="text-[8px] md:text-[9px] font-black text-[#0E7850] uppercase tracking-[0.15em] hover:opacity-80 transition-opacity mb-1">
                    View Journey
                </Link>
            </div>

            <div className="mb-8">
                {isLoading ? (
                    <div className="bg-white rounded-[2.5rem] h-64 animate-pulse border border-gray-100 shadow-sm"></div>
                ) : mainTask && mainTask.sprint ? (
                    <Link to={`/participant/sprint/${mainTask.enrollment.id}`} className="block group">
                        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] border border-gray-100 relative overflow-hidden flex animate-fade-in group-hover:shadow-xl transition-all duration-500">
                            <div className={`w-2 md:w-3 flex-shrink-0 transition-colors duration-500 ${isMainTaskLocked ? 'bg-gray-200' : 'bg-[#0E7850]'}`}></div>
                            
                            <div className="flex-1 p-6 md:p-10 lg:p-12 flex flex-col">
                                <div className="flex justify-between items-start mb-6 md:mb-8">
                                    <div className="pr-4">
                                        <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-gray-900 leading-tight tracking-tight mb-2">{mainTask.sprint.title}</h3>
                                        <p className="text-[9px] md:text-[10px] font-black text-[#0E7850] uppercase tracking-[0.1em]">Day {mainTask.status.day} unlocked.</p>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    {isMainTaskLocked ? (
                                        <div className="bg-[#F9FAFB] rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 flex flex-col items-center justify-center text-center relative overflow-hidden border border-gray-100/50">
                                            <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 relative z-10">Next Lesson In</p>
                                            <h4 className="text-3xl md:text-5xl lg:text-6xl font-black text-gray-800 tracking-tighter tabular-nums relative z-10 leading-none">
                                                {timeToMidnight}
                                            </h4>
                                            <p className="text-[10px] md:text-[11px] font-bold text-[#0E7850] uppercase mt-6 md:mt-8 animate-pulse relative z-10 italic tracking-widest">Integrate your wins...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            <div className="bg-[#F8F9FA] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border border-gray-50 shadow-inner flex flex-col justify-center">
                                                <p className="text-gray-700 font-bold text-sm md:text-base lg:text-lg leading-relaxed italic mb-4">
                                                    "{mainTask.status.content?.taskPrompt || "Your task for today is being generated..."}"
                                                </p>
                                                <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                    You have {100 - Math.round((mainTask.status.day / mainTask.sprint.duration) * 100)}% more to complete your {mainTask.sprint.title} sprint
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto">
                                    {!isMainTaskLocked && (
                                        <div className="w-full py-4 md:py-6 bg-[#0E7850] text-white rounded-2xl md:rounded-3xl font-black uppercase tracking-[0.3em] text-[10px] md:text-[12px] shadow-2xl shadow-emerald-900/30 flex items-center justify-center gap-3 md:gap-4 group-hover:scale-[1.02] transition-transform active:scale-[0.98]">
                                            Open Task 
                                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Link>
                ) : (
                    <div className="py-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center">
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[8px]">No Active Focus. Explore Sprints to begin.</p>
                        <Link to="/discover" className="mt-2 inline-block text-primary font-black uppercase text-[8px] tracking-widest border-b-2 border-primary/20 pb-0.5">Discover Sprints</Link>
                    </div>
                )}
            </div>

            {queuedSprints.length > 0 && (
                <div className="mb-6 animate-fade-in">
                    <div className="flex justify-between items-center mb-3 px-1">
                        <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Next in Queue</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {queuedSprints.map(({ enrollment, sprint }) => (
                            <Link key={enrollment.id} to={`/participant/sprint/${enrollment.id}`} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                                        <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black text-gray-900 leading-tight group-hover:text-primary transition-colors">{sprint.title}</h4>
                                        <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">{sprint.duration} Days • {sprint.category}</p>
                                    </div>
                                </div>
                                <div className="px-2 py-1 bg-primary/5 rounded-lg border border-primary/10">
                                    <span className="text-[6px] font-black text-primary uppercase tracking-widest">Queued</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center flex-shrink-0 animate-fade-in">
                <p className="text-gray-600 font-bold italic text-[11px] mb-1">
                    {allTasksDoneToday ? '"Rest is as productive as action."' : '"The future depends on what you do today."'}
                </p>
                <p className="text-[7px] font-black text-[#0E7850] uppercase tracking-[0.3em]">
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