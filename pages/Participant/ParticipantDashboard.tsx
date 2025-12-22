
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ParticipantSprint, Sprint, Participant, Notification } from '../../types';
import { MOCK_SPRINTS, MOCK_NOTIFICATIONS } from '../../services/mockData';
import Button from '../../components/Button';
import { sprintService } from '../../services/sprintService';

const QUOTES = [
    "Your big opportunity may be right where you are now.",
    "Success is the sum of small efforts, repeated day-in and day-out.",
    "Don't watch the clock; do what it does. Keep going.",
    "The future depends on what you do today.",
    "Believe you can and you're halfway there."
];

// Helper to determine the current status of a sprint day
const getDayStatus = (enrollment: ParticipantSprint, sprint: Sprint, now: number) => {
    // Find first incomplete day
    let currentDayIndex = enrollment.progress.findIndex(p => !p.completed);
    
    // If all completed, user is done
    if (currentDayIndex === -1) {
        return { 
            day: sprint.duration, 
            isCompleted: true, 
            isLocked: false, 
            unlockTime: 0,
            content: sprint.dailyContent.find(c => c.day === sprint.duration)
        };
    }

    const currentDay = enrollment.progress[currentDayIndex].day;
    const content = sprint.dailyContent.find(c => c.day === currentDay);

    // Check for time lock (24h after previous submission)
    let isLocked = false;
    let unlockTime = 0;

    if (currentDay > 1) {
        const prevDay = enrollment.progress.find(p => p.day === currentDay - 1);
        if (prevDay?.completedAt) {
            const completedTime = new Date(prevDay.completedAt).getTime();
            const lockPeriod = 24 * 60 * 60 * 1000; // 24 Hours
            const unlocksAt = completedTime + lockPeriod;
            
            if (now < unlocksAt) {
                isLocked = true;
                unlockTime = unlocksAt;
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
  const [quote, setQuote] = useState('');
  
  // Timer State
  const [now, setNow] = useState(Date.now());

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const unreadCount = notifications.filter(n => !n.read).length;
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
        if (user) {
            // Get enrolled sprints from Firestore
            const enrollments = await sprintService.getUserEnrollments(user.id);
            
            const enrichedSprints = enrollments.map(enrollment => {
                const sprint = MOCK_SPRINTS.find(s => s.id === enrollment.sprintId);
                return { enrollment, sprint: sprint! };
            }).filter(item => item.sprint);
            
            setMySprints(enrichedSprints);

            // Set a random quote
            const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
            setQuote(randomQuote);
        }
    };
    fetchData();
    
    // Click outside listener for closing notifications
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
            setShowNotifications(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    // Timer interval
    const timerInterval = setInterval(() => setNow(Date.now()), 1000);

    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        clearInterval(timerInterval);
    };

  }, [user]);

  const handleNotificationClick = (id: string) => {
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  if (!user) return null;

  const calculateProgress = (enrollment: ParticipantSprint) => {
    const completedDays = enrollment.progress.filter(p => p.completed).length;
    const totalDays = enrollment.progress.length;
    return totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
  };

  // New Summary Stats Calculations
  const activeEnrollments = mySprints.filter(s => calculateProgress(s.enrollment) < 100);
  const avgProgress = activeEnrollments.length > 0
    ? activeEnrollments.reduce((acc, s) => acc + calculateProgress(s.enrollment), 0) / activeEnrollments.length
    : 0;

  const tasksReadyCount = mySprints.reduce((acc, item) => {
      const status = getDayStatus(item.enrollment, item.sprint, now);
      return acc + (!status.isCompleted && !status.isLocked ? 1 : 0);
  }, 0);

  // Process sprints for the dashboard cards (Top 5 Active)
  const dashboardSprints = mySprints
    .map(item => {
        const status = getDayStatus(item.enrollment, item.sprint, now);
        return { ...item, ...status };
    })
    .sort((a, b) => {
        // Sort incomplete first, then by start date
        if (a.isCompleted && !b.isCompleted) return 1;
        if (!a.isCompleted && b.isCompleted) return -1;
        // Prioritize unlocked (actionable) over locked (waiting)
        if (!a.isLocked && b.isLocked) return -1;
        if (a.isLocked && !b.isLocked) return 1;
        return new Date(b.enrollment.startDate).getTime() - new Date(a.enrollment.startDate).getTime();
    })
    .slice(0, 5);

  const formatCountdown = (targetTime: number) => {
      const diff = targetTime - now;
      if (diff <= 0) return "00:00:00";
      
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const firstName = user.name ? user.name.split(' ')[0] : '';

  // --- Slideshow Logic for Action Card ---
  const slideIndex = Math.floor(now / 5000) % 3; // Simple cyclical index based on time
  
  // Determine visible slides based on state
  let activeSlide = 'discover';
  if (tasksReadyCount > 0) {
      if (slideIndex === 0) activeSlide = 'up_next';
      else if (slideIndex === 1) activeSlide = 'shine';
      else activeSlide = 'up_next';
  } else {
      if (slideIndex === 0) activeSlide = 'tribe';
      else if (slideIndex === 1) activeSlide = 'discover';
      else activeSlide = 'shine';
  }

  return (
    // Main Container - Changed to allow scrolling if content exceeds viewport
    <div className="flex flex-col h-[calc(100vh-7rem)] w-full overflow-y-auto px-4 pt-4 pb-2 hide-scrollbar">
      
      {/* 1. Header Row: Actions (Search & Notifications) */}
      
            <div className="relative" ref={notificationRef}>
            
                 {/* Notification Dropdown */}
                 {showNotifications && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-40 animate-fade-in origin-top-right">
                        <div className="px-4 py-3 border-b border-gray-50 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-xs text-gray-900 uppercase">Notifications</h3>
                            <span className="text-xs text-gray-500">{unreadCount} new</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            {notifications.length > 0 ? (
                                notifications.map(notification => (
                                    <div 
                                        key={notification.id} 
                                        onClick={() => handleNotificationClick(notification.id)}
                                        className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <div className="flex gap-2">
                                            <div className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${!notification.read ? 'bg-primary' : 'bg-gray-300'}`}></div>
                                            <div>
                                                <p className={`text-xs ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                                    {notification.text}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-gray-400 text-xs">No notifications</div>
                            )}
                        </div>
                    </div>
                )}
      </div>

      {/* 2. Welcome Section */}
      <div className="flex-shrink-0 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome Back, {firstName}</h1>
          <p className="text-gray-500 text-sm italic mt-1">"{quote}"</p>
      </div>

      {/* 3. Progress Summary & Action Slideshow */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-3 mb-6">
            
            {/* Dynamic Slideshow Card */}
            <div className="relative overflow-hidden rounded-2xl shadow-sm h-32 bg-white border border-gray-100">
                {activeSlide === 'up_next' && (
                    <div className="absolute inset-0 p-4 flex flex-col justify-between group animate-fade-in bg-white hover:bg-blue-50/30 transition-colors">
                       <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                       <div className="relative z-10">
                           <div className="flex items-center gap-2 mb-3">
                              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                  </svg>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Up Next</span>
                           </div>
                           <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{tasksReadyCount}</p>
                           <p className="text-xs text-gray-500 font-medium">Tasks Available</p>
                       </div>
                    </div>
                )}

                {activeSlide === 'shine' && (
                    <Link to="/shine" className="absolute inset-0 p-4 flex flex-col justify-between group hover:bg-yellow-50/50 transition-colors animate-fade-in">
                       <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                       <div className="relative z-10">
                           <div className="flex items-center gap-2 mb-2">
                              <div className="p-1.5 bg-yellow-50 text-yellow-500 rounded-lg">
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Shine</span>
                           </div>
                           <p className="text-lg font-bold text-gray-900 leading-none mb-1">Get Inspired</p>
                           <p className="text-xs text-gray-500 font-medium">See Community Wins</p>
                       </div>
                    </Link>
                )}

                {activeSlide === 'tribe' && (
                    <Link to="/tribe" className="absolute inset-0 p-4 flex flex-col justify-between group hover:bg-orange-50/50 transition-colors animate-fade-in">
                       <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                       <div className="relative z-10">
                           <div className="flex items-center gap-2 mb-2">
                              <div className="p-1.5 bg-orange-50 text-orange-500 rounded-lg">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                  </svg>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Tribe</span>
                           </div>
                           <p className="text-lg font-bold text-gray-900 leading-none mb-1">Check Tribe</p>
                           <p className="text-xs text-gray-500 font-medium">Connect & Grow</p>
                       </div>
                    </Link>
                )}

                {activeSlide === 'discover' && (
                    <Link to="/discover" className="absolute inset-0 p-4 flex flex-col justify-between group hover:bg-blue-50/50 transition-colors animate-fade-in">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                               <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg">
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                   </svg>
                               </div>
                               <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Explore</span>
                            </div>
                            <p className="text-lg font-bold text-gray-900 leading-none mb-1">Discover</p>
                            <p className="text-xs text-gray-500 font-medium">Find Next Sprint</p>
                        </div>
                    </Link>
                )}

                {/* Slide Indicators */}
                <div className="absolute bottom-2 right-2 flex gap-1 z-20">
                     {[0, 1, 2].map((_, idx) => (
                        <div 
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === (now % 3) ? 'bg-gray-400' : 'bg-gray-200'}`}
                        ></div>
                     ))}
                </div>
            </div>

           {/* GROWTH CARD */}
           <Link to="/growth" className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100 relative overflow-hidden group hover:border-purple-300 transition-colors h-32 flex flex-col justify-between">
               <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
               <div className="absolute bottom-2 right-2 text-purple-200 group-hover:text-purple-400 transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
               </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                          </svg>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Growth</span>
                   </div>
                   <div className="flex items-baseline gap-1 mb-1">
                      <p className="text-2xl font-bold text-gray-900 leading-none">{avgProgress.toFixed(0)}%</p>
                      <span className="text-[10px] text-gray-400">Avg.</span>
                   </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                         <div className="bg-purple-500 h-full rounded-full transition-all duration-1000" style={{ width: `${avgProgress}%` }}></div>
                     </div>
                </div>
           </Link>
      </div>

      {/* 4. Main Content Area (Carousel) */}
      <div className="flex-1 flex flex-col min-h-[300px] mb-4">
          <div className="flex justify-between items-end mb-2 px-1">
            <h2 className="text-2xl font-bold text-gray-900 leading-none">Task of the Day</h2>
            <Link to="/my-sprints" className="text-primary font-semibold hover:underline text-sm">View All</Link>
          </div>

          <div className="relative w-full flex-1">
              <div className="absolute inset-0 flex items-center overflow-x-auto gap-4 pb-2 snap-x hide-scrollbar px-1">
                {dashboardSprints.length > 0 ? dashboardSprints.map((item) => {
                    const progress = calculateProgress(item.enrollment);
                    // Theme color logic based on state
                    const statusColor = item.isCompleted ? 'bg-green-500' : item.isLocked ? 'bg-gray-400' : 'bg-primary';
                    const statusTextBg = item.isCompleted ? 'bg-green-50' : item.isLocked ? 'bg-gray-100' : 'bg-green-50';
                    const statusTextColor = item.isCompleted ? 'text-green-700' : item.isLocked ? 'text-gray-500' : 'text-primary';

                    return (
                    <Link key={item.enrollment.id} to={`/participant/sprint/${item.enrollment.id}`} className="block h-full min-w-[90%] sm:min-w-[360px] snap-center">
                        <div className="h-full bg-white rounded-3xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-row overflow-hidden relative">
                            
                            {/* Color Bar Left (Front) - Matched to status - REDUCED WIDTH */}
                            <div className={`w-2 h-full flex-shrink-0 ${statusColor}`}></div>
                            
                            {/* REDUCED PADDING */}
                            <div className="flex-1 p-5 flex flex-col">
                                {/* Sprint Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="overflow-hidden mr-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{item.sprint.category}</p>
                                        {/* REDUCED TEXT SIZE */}
                                        <h3 className="font-extrabold text-xl text-gray-900 leading-tight line-clamp-2" title={item.sprint.title}>{item.sprint.title}</h3>
                                    </div>
                                    <span className={`text-xs px-2.5 py-1 rounded-lg font-bold whitespace-nowrap shadow-sm ${statusTextBg} ${statusTextColor}`}>
                                        {item.isCompleted ? 'Done' : `Day ${item.day}`}
                                    </span>
                                </div>

                                {/* Main Content: Center */}
                                <div className="flex-1 flex flex-col justify-center items-center text-center my-2 min-h-0">
                                    {item.isCompleted ? (
                                        <div className="flex flex-col items-center gap-2 text-green-600">
                                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-1 animate-bounce-short">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <span className="font-bold text-xl">All caught up!</span>
                                            <span className="text-sm text-gray-500">Wait for next unlock.</span>
                                        </div>
                                    ) : item.isLocked ? (
                                        <div className="w-full bg-gray-50 rounded-xl p-6 border border-gray-100 relative overflow-hidden flex flex-col items-center justify-center h-full">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                                            </div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Next Lesson In</p>
                                            <p className="text-4xl font-mono font-bold text-gray-800 tracking-tighter tabular-nums">
                                                {formatCountdown(item.unlockTime)}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex flex-col justify-center">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Today's Focus</p>
                                            {/* REDUCED TEXT SIZE */}
                                            <p className="text-lg md:text-xl font-medium text-gray-800 leading-snug line-clamp-4">
                                                "{item.content?.taskPrompt || item.content?.lessonText || "Continue your journey."}"
                                            </p>
                                            <div className="mt-6">
                                                <span className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-full shadow-lg text-base hover:scale-105 transition-transform">
                                                    Start Task
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer: Progress Bar */}
                                <div className="mt-auto pt-4">
                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5 font-bold">
                                        <span>Progress</span>
                                        <span>{progress.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
                                        {/* Progress Bar Color Matches Theme */}
                                        <div 
                                            className={`h-full ${statusColor} rounded-full transition-all duration-500`} 
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                )}) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-dashed border-gray-300 text-center max-w-sm">
                             <p className="text-gray-500 text-lg mb-6">You don't have any active sprints.</p>
                             <Link to="/discover">
                                <Button className="py-4 px-8 text-lg">Find Your First Sprint</Button>
                             </Link>
                        </div>
                    </div>
                )}
              </div>
          </div>
      </div>

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
              animation: fadeIn 0.3s ease-out forwards;
          }
      `}</style>
    </div>
  );
};

export default ParticipantDashboard;
