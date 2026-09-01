
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { notificationService } from '../../services/notificationService';
import { userService } from '../../services/userService';
import { Sprint, Notification, Review, UserRole } from '../../types';
import { triggerHaptic, hapticPatterns } from '../../utils/haptics';
import LocalLogo from '../../components/LocalLogo';
import CreateTypeModal from '../../components/CreateTypeModal';
import { MoreVertical, User, Layers, Compass, TrendingUp, Plus, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CoachDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dynamicNotifications, setDynamicNotifications] = useState<Notification[]>([]);
  const [mySprints, setMySprints] = useState<Sprint[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatesExpanded, setIsUpdatesExpanded] = useState(false);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isKebabMenuOpen, setIsKebabMenuOpen] = useState(false);
  const kebabMenuRef = useRef<HTMLDivElement>(null);

  // Close kebab menu when clicking outside
  useEffect(() => {
    if (!isKebabMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (kebabMenuRef.current && !kebabMenuRef.current.contains(event.target as Node)) {
        setIsKebabMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isKebabMenuOpen]);

  useEffect(() => {
      let unsubscribeNotifs = () => {};
      let unsubscribeReviews = () => {};

      const fetchData = async () => {
          if (!user) return;
          setIsLoading(true);
          try {
              let fetched: Sprint[] = [];
              
              if (user.role === UserRole.ADMIN) {
                  const adminSprints = await sprintService.getAdminCoachSprints();
                  const myOwnSprints = await sprintService.getCoachSprints(user.id);
                  const combined = [...adminSprints, ...myOwnSprints];
                  const uniqueIds = new Set();
                  fetched = combined.filter(s => {
                      if (uniqueIds.has(s.id)) return false;
                      uniqueIds.add(s.id);
                      return true;
                  });
              } else {
                  fetched = await sprintService.getCoachSprints(user.id);
              }
              
              setMySprints(fetched);
              
              const sprintIds = fetched.map(s => s.id).filter(id => !!id);
              
              if (sprintIds.length > 0) {
                  // 1. Get student counts
                  const enrollments = await sprintService.getEnrollmentsForSprints(sprintIds);
                  setTotalStudentsCount(new Set(enrollments.map(e => e.user_id)).size);

                  // 1b. Load participants details to enrich notifications
                  const uniqueParticipantIds = Array.from(new Set(enrollments.map(e => e.user_id))) as string[];
                  const dbParticipants = await userService.getUsersByIds(uniqueParticipantIds);

                  const completionNotifications: Notification[] = [];
                  const formatSprintName = (title: string) => {
                      const t = title.toLowerCase();
                      if (t.includes('sprint')) return t;
                      return `${t} sprint`;
                  };

                  enrollments.forEach(enrollment => {
                      const student = dbParticipants.find(u => u.id === enrollment.user_id);
                      const studentName = student?.name || 'A student';
                      const sprint = fetched.find(s => s.id === enrollment.sprint_id);
                      const sprintTitle = sprint?.title || 'sprint';

                      if (enrollment.progress && Array.isArray(enrollment.progress)) {
                          enrollment.progress.forEach(item => {
                              // Track via day 1 (and other days) submission or completed state
                              const isCompleted = item.completed || !!item.submission;
                              if (isCompleted) {
                                  completionNotifications.push({
                                      id: `comp_${enrollment.id}_day_${item.day}`,
                                      userId: user.id, // For the coach
                                      title: `${studentName} completed day ${item.day} of ${formatSprintName(sprintTitle)}.`,
                                      body: '',
                                      createdAt: item.completedAt || enrollment.last_activity_at || enrollment.started_at || new Date().toISOString(),
                                      isRead: false,
                                      type: 'sprint_day_completed',
                                      actionUrl: `/coach/participants?studentId=${enrollment.user_id}&sprintId=${enrollment.sprint_id}&day=${item.day}`
                                  });
                              }
                          });
                      }
                  });

                  setDynamicNotifications(completionNotifications);

                  // 2. Subscribe to real-time reviews for impact score
                  unsubscribeReviews = sprintService.subscribeToReviewsForSprints(sprintIds, (updatedReviews) => {
                      setReviews(updatedReviews);
                  });
              }

              // 3. Subscribe to real-time notifications
              unsubscribeNotifs = notificationService.subscribeToNotifications(user.id, (newNotifs) => {
                  setNotifications(newNotifs);
              });

          } catch (err) {
              console.error(err);
          } finally {
              setIsLoading(false);
          }
      };
      
      fetchData();
      
      return () => {
          unsubscribeNotifs();
          unsubscribeReviews();
      };
  }, [user]);

  // Merge database notifications with dynamic step completion notifications
  const allNotificationsMerged = useMemo(() => {
      const combined = [...notifications, ...dynamicNotifications];
      const seenIds = new Set();
      return combined.filter(n => {
          if (seenIds.has(n.id)) return false;
          seenIds.add(n.id);
          return true;
      }).sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
      });
  }, [notifications, dynamicNotifications]);

  // Real-time Impact Score calculation
  const impactScore = useMemo(() => {
      if (reviews.length === 0) return "5.0";
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const handleNotificationClick = async (notif: Notification) => {
      triggerHaptic(hapticPatterns.notification);
      if (notif.id.startsWith('comp_')) {
          if (notif.actionUrl) {
              navigate(notif.actionUrl);
          }
          return;
      }
      await notificationService.markAsRead(notif.userId, notif.id);
      if (notif.actionUrl) {
          navigate(notif.actionUrl);
      }
  };

  if (!user) return null;

  const activeSprints = mySprints.filter(s => s.published);

  const NotificationItem: React.FC<{ notif: Notification }> = ({ notif }) => {
      const type = notif.type;
      
      return (
          <div 
              onClick={() => handleNotificationClick(notif)}
              className={`flex gap-3 items-start p-3 sm:p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  !notif.isRead ? 'bg-white border-primary/30 shadow-md ring-1 ring-primary/5' : 'bg-white border-primary/10'
              }`}
          >
              <span className="mt-0.5 text-lg sm:text-xl flex-shrink-0">
                  {type === 'coach_message' ? '💬' : type === 'payment_success' ? '💳' : type === 'sprint_day_unlocked' ? '🔓' : type === 'sprint_day_completed' ? '🏁' : '🔔'}
              </span>
              <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                      <div>
                          <p className={`text-xs sm:text-sm leading-snug font-black mb-0.5 ${!notif.isRead ? 'text-gray-900' : 'text-gray-500'}`}>
                              {notif.title}
                          </p>
                          {notif.body && (
                              <p className={`text-[10px] sm:text-xs leading-snug mb-1 font-medium ${!notif.isRead ? 'text-gray-700' : 'text-gray-400'}`}>
                                  {notif.body}
                              </p>
                          )}
                      </div>
                      {!notif.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5 animate-pulse"></span>}
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                      {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
              </div>
          </div>
      );
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 pb-32 bg-white animate-pulse">
        {/* Header skeleton */}
        <div className="flex justify-between items-center mb-8">
           <div>
              <div className="h-8 w-40 bg-gray-200 rounded-xl mb-2"></div>
              <div className="h-4 w-60 bg-gray-100 rounded-lg"></div>
           </div>
           <div className="flex items-center gap-2">
              <div className="h-10 w-10 bg-gray-200 rounded-2xl"></div>
              <div className="h-10 w-10 bg-gray-200 rounded-2xl"></div>
           </div>
        </div>

        {/* Quick Stats skeleton */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white p-4 h-24 rounded-2xl border border-gray-100 flex flex-col justify-center">
                    <div className="h-3 w-12 bg-gray-200 rounded mb-2"></div>
                    <div className="h-6 w-8 bg-gray-300 rounded"></div>
                </div>
            ))}
        </div>

        {/* Real-time Updates Section skeleton */}
        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 mb-6 h-[320px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded-lg"></div>
                </div>
                <div className="w-5 h-5 bg-gray-200 rounded-lg"></div>
            </div>

            <div className="flex-1 space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
                            <div className="h-2 w-1/2 bg-gray-100 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Quick Actions skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6">
            {[1, 2].map((i) => (
                <div key={i} className="bg-white p-6 h-40 rounded-[2rem] border border-gray-100 flex flex-col justify-between">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                    <div>
                        <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 w-48 bg-gray-100 rounded"></div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    );
  }

  if (mySprints.length === 0) {
    return (
      <div className="relative w-full max-w-4xl mx-auto py-7 sm:py-9 px-5 sm:px-10 flex flex-col items-center justify-between min-h-[calc(100vh-140px)] bg-gradient-to-b from-white via-gray-50/70 to-emerald-50/20 rounded-[2.5rem] sm:rounded-[3rem] border border-gray-200/80 shadow-sm my-2 animate-fade-in select-none overflow-hidden">
          {/* Subtle decorative background glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -z-10" />

          {/* Header & Hero */}
          <div className="text-center max-w-xl mx-auto w-full my-auto py-2 z-10">
              {/* Brand Logo & Tagline Pill */}
              <div className="flex flex-col items-center justify-center mb-4">
                  <LocalLogo type="green" className="h-9 sm:h-11 w-auto object-contain mb-3 hover:scale-105 transition-transform" />
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-50 border border-emerald-200/70 rounded-full shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
                          Empowering growth through focused sprints.
                      </p>
                  </div>
              </div>

              {/* Main Headline */}
              <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight mb-2.5 sm:mb-3">
                  Welcome to Coach Mode
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed mb-7 max-w-lg mx-auto">
                  Turn what you know into a guided experience that helps people make real progress. You’ll build the experience, guide participants through it, and see how they move.
              </p>

              {/* Action Button */}
              <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="group relative px-8 py-4 bg-[#0E7850] hover:bg-[#0b5d3e] text-white rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-700/20 hover:shadow-emerald-700/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer inline-flex items-center gap-2.5"
              >
                  <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
                  <span>Create your first experience</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </button>
          </div>

          {/* How it works section (Side by Side cards) */}
          <div className="w-full mt-auto pt-5 border-t border-gray-100 z-10">
              <div className="flex items-center justify-center gap-2 mb-3.5">
                  <span className="h-px w-8 bg-gray-200" />
                  <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                      How it works
                  </h2>
                  <span className="h-px w-8 bg-gray-200" />
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:gap-4 w-full">
                  {/* Card 1: Build */}
                  <div className="group bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100/90 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all duration-200 flex flex-col justify-between text-left relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div>
                          <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] sm:text-[11px] font-black text-emerald-700 uppercase tracking-wider">
                                  01 · Build
                              </span>
                              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                  <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              </div>
                          </div>
                          <p className="text-[9px] sm:text-xs text-gray-600 leading-snug sm:leading-relaxed font-medium">
                              Define the transformation and structure the journey.
                          </p>
                      </div>
                  </div>

                  {/* Card 2: Guide */}
                  <div className="group bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100/90 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all duration-200 flex flex-col justify-between text-left relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div>
                          <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] sm:text-[11px] font-black text-emerald-700 uppercase tracking-wider">
                                  02 · Guide
                              </span>
                              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                  <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              </div>
                          </div>
                          <p className="text-[9px] sm:text-xs text-gray-600 leading-snug sm:leading-relaxed font-medium">
                              Give participants focused actions instead of overwhelming them with information.
                          </p>
                      </div>
                  </div>

                  {/* Card 3: See progress */}
                  <div className="group bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100/90 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all duration-200 flex flex-col justify-between text-left relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div>
                          <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] sm:text-[11px] font-black text-emerald-700 uppercase tracking-wider">
                                  03 · See progress
                              </span>
                              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                  <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              </div>
                          </div>
                          <p className="text-[9px] sm:text-xs text-gray-600 leading-snug sm:leading-relaxed font-medium">
                              Review their work, give feedback, and understand where they are.
                          </p>
                      </div>
                  </div>
              </div>
          </div>
          <CreateTypeModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-32 bg-white">
      <div className="flex justify-between items-center mb-8">
         <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-gray-500 font-medium text-xs sm:text-sm">Empowering growth through focused sprints.</p>
         </div>
         <div className="flex items-center gap-2">
           <button 
              type="button" 
              onClick={() => setIsCreateModalOpen(true)} 
              className="bg-primary text-white w-10 h-10 rounded-2xl font-black uppercase text-base shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95 cursor-pointer flex items-center justify-center"
              title="Create New Sprint"
           >
              +
           </button>

           <div className="relative" ref={kebabMenuRef}>
             <button
               type="button"
               onClick={() => setIsKebabMenuOpen((prev) => !prev)}
               className={`w-10 h-10 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-700 hover:text-gray-950 active:scale-95 transition-all cursor-pointer flex items-center justify-center ${isKebabMenuOpen ? 'ring-2 ring-primary/20' : ''}`}
               title="Options"
             >
               <MoreVertical className="w-5 h-5" />
             </button>

             <AnimatePresence>
               {isKebabMenuOpen && (
                 <motion.div
                   initial={{ opacity: 0, scale: 0.92, y: -4 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.92, y: -4 }}
                   transition={{ duration: 0.16, ease: "easeOut" }}
                   className="absolute right-0 mt-2 w-52 bg-white rounded-3xl shadow-2xl border border-gray-100/90 py-2 px-2 z-[100] origin-top-right overflow-hidden select-none"
                 >
                   <div className="space-y-1">
                     <button
                       type="button"
                       onClick={() => {
                         setIsKebabMenuOpen(false);
                         navigate('/coach/profile');
                       }}
                       className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-all text-left cursor-pointer group"
                     >
                       <div className="w-8 h-8 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                         <User className="w-4 h-4" />
                       </div>
                       <div className="text-xs truncate">
                         <span className="font-bold text-gray-900">View profile</span>
                       </div>
                     </button>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
           </div>
         </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-6">
          <Link to="/coach/sprints" className="bg-white p-2 sm:p-4 rounded-2xl shadow-sm border border-primary/10 flex flex-col justify-center min-w-0 hover:border-primary/40 hover:shadow-md transition-all group">
              <p className="text-gray-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1 leading-tight truncate group-hover:text-primary transition-colors">Active<br/>Experiences</p>
              <p className="text-lg sm:text-2xl font-black text-gray-900 leading-none">{isLoading ? '...' : activeSprints.length}</p>
          </Link>
          <Link to="/coach/participants" className="bg-white p-2 sm:p-4 rounded-2xl shadow-sm border border-primary/10 flex flex-col justify-center min-w-0 hover:border-primary/40 hover:shadow-md transition-all group">
              <p className="text-gray-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1 leading-tight truncate group-hover:text-primary transition-colors">Total<br/>Students</p>
              <p className="text-lg sm:text-2xl font-black text-gray-900 leading-none">{isLoading ? '...' : totalStudentsCount}</p>
          </Link>
          <Link to="/coach/earnings" className="bg-white p-2 sm:p-4 rounded-2xl shadow-sm border border-primary/10 flex flex-col justify-center min-w-0 hover:border-primary/40 hover:shadow-md transition-all group">
              <p className="text-gray-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1 leading-tight truncate group-hover:text-primary transition-colors">Total<br/>Earned</p>
              <p className="text-lg sm:text-2xl font-black text-green-600 leading-none truncate">₦0</p>
          </Link>
          <Link to="/coach/impact" className="bg-white p-2 sm:p-4 rounded-2xl shadow-sm border border-primary/10 flex flex-col justify-center min-w-0 hover:border-primary/40 hover:shadow-md transition-all group">
              <p className="text-gray-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1 leading-tight truncate group-hover:text-primary transition-colors">Impact<br/>Score</p>
              <p className="text-lg sm:text-2xl font-black text-gray-900 leading-none truncate">
                {isLoading ? '...' : impactScore} ⭐
              </p>
          </Link>
      </div>

      {/* Real-time Updates Section */}
      <div className={`bg-white rounded-[2rem] shadow-lg border border-primary/10 p-6 mb-6 transition-all duration-500 overflow-hidden flex flex-col ${isUpdatesExpanded ? 'fixed inset-4 z-[60] mb-0' : 'h-[320px]'}`}>
          <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(14,120,80,0.4)]"></div>
                  <h2 className="font-black text-gray-900 text-sm uppercase tracking-tight">Updates</h2>
                  {allNotificationsMerged.filter(n => !n.isRead).length > 0 && (
                      <span className="bg-primary text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm">
                          {allNotificationsMerged.filter(n => !n.isRead).length} NEW
                      </span>
                  )}
              </div>
              <button 
                onClick={() => setIsUpdatesExpanded(!isUpdatesExpanded)}
                className="p-1.5 text-gray-400 hover:text-primary hover:bg-white border border-transparent hover:border-primary/10 rounded-lg transition-all cursor-pointer group"
              >
                  {isUpdatesExpanded ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                  )}
              </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {allNotificationsMerged.length > 0 ? (
                  allNotificationsMerged.map((notif) => (
                    <NotificationItem key={notif.id} notif={notif} />
                  ))
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-10 grayscale opacity-40">
                      <span className="text-4xl mb-4">🏝️</span>
                      <h3 className="font-black text-gray-400 uppercase tracking-[0.2em] text-[10px]">Horizon Clear</h3>
                  </div>
              )}
          </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 bg-white">
          <Link to="/coach/sprints" className="bg-white p-4 sm:p-8 rounded-[2rem] shadow-sm border border-primary/10 hover:border-primary/50 hover:shadow-lg transition-all group relative overflow-hidden flex flex-col">
              <div className="mb-4 sm:mb-6 bg-white w-10 h-10 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white transition-all shadow-md border border-primary/5">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012v2M7 7h10" />
                    </svg>
              </div>
              <h3 className="font-black text-sm sm:text-xl text-gray-900 tracking-tight mb-1">Manage Programs</h3>
              <p className="text-[10px] sm:text-sm text-gray-500 font-medium leading-tight sm:leading-relaxed line-clamp-2">Refine curriculum and track lifecycle.</p>
              <div className="absolute -right-4 -bottom-4 w-16 h-16 sm:w-24 sm:h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-all"></div>
          </Link>
           <Link to="/coach/participants" className="bg-white p-4 sm:p-8 rounded-[2rem] shadow-sm border border-primary/10 hover:border-primary/50 hover:shadow-lg transition-all group relative overflow-hidden flex flex-col">
              <div className="mb-4 sm:mb-6 bg-white w-10 h-10 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white transition-all shadow-md border border-primary/5">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
              </div>
              <h3 className="font-black text-sm sm:text-xl text-gray-900 tracking-tight mb-1">Student Insights</h3>
              <p className="text-[10px] sm:text-sm text-gray-500 font-medium leading-tight sm:leading-relaxed line-clamp-2">Review work and send direct feedback.</p>
              <div className="absolute -right-4 -bottom-4 w-16 h-16 sm:w-24 sm:h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-all"></div>
          </Link>
      </div>

      <CreateTypeModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #FFFFFF; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(14, 120, 80, 0.2); border-radius: 10px; border: 1px solid #FFFFFF; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(14, 120, 80, 0.4); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default CoachDashboard;
