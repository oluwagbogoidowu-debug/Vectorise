
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import { Notification } from '../types';
import LocalLogo from './LocalLogo';

const Header: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = notificationService.subscribeToNotifications(user.id, (data) => {
      setNotifications(data);
    });

    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = async (notif: Notification) => {
    await notificationService.markAsRead(notif.id);
    setIsOpen(false);
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    await Promise.all(unread.map(n => notificationService.markAsRead(n.id)));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'sprint_day_unlocked': return '🔓';
      case 'payment_success': return '💳';
      case 'coach_message': return '💬';
      case 'sprint_completed': return '🏁';
      case 'referral_update': return '🌱';
      default: return '🔔';
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full z-[100] px-4 pt-4 pointer-events-none">
      <div className="max-w-md mx-auto bg-white rounded-full border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between px-6 py-2.5 pointer-events-auto relative">
        
        {/* LOGO */}
        <Link to="/" className="flex-shrink-0 transition-transform active:scale-95">
          <LocalLogo type="green" className="h-[2.125rem] w-auto object-contain" />
        </Link>

        {/* SEARCH AREA SEPARATOR & BUTTON */}
        <div className="flex items-center flex-1 ml-4 border-l border-gray-100 pl-4 h-8 gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Link to="/discover" className="flex flex-col text-left group">
            <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em] leading-none group-hover:text-primary transition-colors">Explore</span>
            <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em] leading-none group-hover:text-primary transition-colors">Sprints</span>
          </Link>
        </div>

        {/* NOTIFICATION BELL */}
        <div className="relative ml-2" ref={dropdownRef}>
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90 relative ${isOpen ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-50 text-gray-500 hover:text-primary'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <div className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
            )}
          </button>

          {/* DROPDOWN OVERLAY */}
          {isOpen && (
            <div className="absolute top-14 right-0 w-80 bg-white/95 backdrop-blur-md rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden animate-slide-down origin-top-right z-[110]">
              <div className="p-5 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Registry Updates</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-[8px] font-black text-primary uppercase tracking-widest hover:underline">Mark all read</button>
                )}
              </div>
              
              <div className="max-h-96 overflow-y-auto py-2 custom-scrollbar">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      onClick={() => handleNotificationClick(notif)}
                      className={`px-5 py-4 flex gap-4 cursor-pointer hover:bg-gray-50 transition-colors relative ${!notif.isRead ? 'bg-primary/[0.02]' : ''}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border ${!notif.isRead ? 'bg-primary/5 border-primary/10' : 'bg-gray-50 border-gray-100'}`}>
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                           <p className={`text-xs font-black leading-tight mb-0.5 truncate ${!notif.isRead ? 'text-gray-900' : 'text-gray-500'}`}>{notif.title}</p>
                           {!notif.isRead && <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1 flex-shrink-0"></div>}
                        </div>
                        <p className={`text-[10px] leading-snug line-clamp-2 ${!notif.isRead ? 'text-gray-700 font-bold' : 'text-gray-400 font-medium'}`}>{notif.body}</p>
                        <p className="text-[8px] text-gray-300 font-black uppercase mt-1.5 tracking-tighter">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Horizon Clear</p>
                  </div>
                )}
              </div>
              
              <div className="p-3 bg-gray-50/50 border-t border-gray-50 text-center">
                 <Link to="/dashboard" onClick={() => setIsOpen(false)} className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors">Close Portal</Link>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slide-down { animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}</style>
    </header>
  );
};

export default Header;
