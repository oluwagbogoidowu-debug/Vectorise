
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { notificationService } from '../../services/notificationService';
import { Sprint, Notification, Review } from '../../types';

const CoachDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mySprints, setMySprints] = useState<Sprint[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatesExpanded, setIsUpdatesExpanded] = useState(false);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);

  useEffect(() => {
      let unsubscribeNotifs = () => {};
      let unsubscribeReviews = () => {};

      const fetchData = async () => {
          if (!user) return;
          setIsLoading(true);
          try {
              const fetched = await sprintService.getCoachSprints(user.id);
              setMySprints(fetched);
              
              const sprintIds = fetched.map(s => s.id).filter(id => !!id);
              
              if (sprintIds.length > 0) {
                  // 1. Get student counts
                  const enrollments = await sprintService.getEnrollmentsForSprints(sprintIds);
                  setTotalStudentsCount(new Set(enrollments.map(e => e.participantId)).size);

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

  // Real-time Impact Score calculation
  const impactScore = useMemo(() => {
      if (reviews.length === 0) return "5.0";
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const handleNotificationClick = async (notif: Notification) => {
      await notificationService.markAsRead(notif.id);
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
                  {type === 'coach_message' ? '💬' : type === 'payment_success' ? '💳' : type === 'sprint_day_unlocked' ? '🔓' : '🔔'}
              </span>
              <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                      <div>
                          <p className={`text-xs sm:text-sm leading-snug font-black mb-0.5 ${!notif.isRead ? 'text-gray-900' : 'text-gray-500'}`}>
                              {notif.title}
                          </p>
                          <p className={`text-[10px] sm:text-xs leading-snug mb-1 font-medium ${!notif.isRead ? 'text-gray-700' : 'text-gray-400'}`}>
                              {notif.body}
                          </p>
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-32 bg-white">
      <div className="flex justify-between items-center mb-8">
         <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-gray-500 font-medium text-xs sm:text-sm">Empowering growth through focused sprints.</p>
         </div>
         <Link to="/coach/sprint/new" className="bg-primary text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95">
            + New Sprint
         </Link>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-6">
          <Link to="/coach/sprints" className="bg-white p-2 sm:p-4 rounded-2xl shadow-sm border border-primary/10 flex flex-col justify-center min-w-0 hover:border-primary/40 hover:shadow-md transition-all group">
              <p className="text-gray-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1 leading-tight truncate group-hover:text-primary transition-colors">Active<br/>Sprints</p>
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
                  {notifications.filter(n => !n.isRead).length > 0 && (
                      <span className="bg-primary text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm">
                          {notifications.filter(n => !n.isRead).length} NEW
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
              {notifications.length > 0 ? (
                  notifications.map((notif) => (
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
