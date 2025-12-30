import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import logo from '../assets/images/logo-black.png';
import { Notification } from '../types';
import { notificationService } from '../services/notificationService';

interface ParticipantLayoutProps {
  children?: React.ReactNode;
}

const ParticipantLayout: React.FC<ParticipantLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(notificationService.getNotifications());
  const unreadCount = notifications.filter(n => !n.read).length;
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
            setShowNotifications(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'shine-notifications') {
            setNotifications(notificationService.getNotifications());
        }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('storage', handleStorageChange);
    };

  }, []);

  const handleNotificationClick = (id: string) => {
      const updatedNotifications = notificationService.markAsRead(id);
      setNotifications(updatedNotifications);
  };
  
  const handleMarkAllRead = () => {
      const updatedNotifications = notificationService.markAllAsRead();
      setNotifications(updatedNotifications);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link to="/dashboard">
                <img className="h-10 w-auto" src={logo} alt="Logo" />
              </Link>
            </div>

            {/* Search and Notification buttons */}
            <div className="flex items-center gap-3 relative">
                <button 
                    onClick={() => navigate('/discover')}
                    className="p-3 bg-white rounded-full shadow-sm text-gray-500 hover:text-primary hover:bg-gray-50 transition-all border border-gray-100"
                    title="Search"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </button>

                <div className="relative" ref={notificationRef}>
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="p-3 bg-white rounded-full shadow-sm text-gray-500 hover:text-primary hover:bg-gray-50 transition-all relative border border-gray-100"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                        )}
                    </button>
                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-30 animate-fade-in origin-top-right">
                           <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-xs text-gray-900 uppercase">Notifications</h3>
                                {unreadCount > 0 && 
                                    <button onClick={handleMarkAllRead} className="text-xs text-primary font-semibold hover:underline">
                                        Mark all as read
                                    </button>
                                }
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map(notification => (
                                        <div 
                                            key={notification.id} 
                                            onClick={() => handleNotificationClick(notification.id)}
                                            className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''}`}
                                        >
                                            <div className="flex gap-3">
                                                <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!notification.read ? 'bg-primary' : 'bg-gray-300'}`}></div>
                                                <div className='w-full'>
                                                    <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                                                        {notification.text}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {new Date(notification.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-400 text-sm">
                                        <span className="text-3xl mb-2 block">🎉</span>
                                        You're all caught up!
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 pb-24">
        {children || <Outlet />}
      </div>
    </div>
  );
};

export default ParticipantLayout;