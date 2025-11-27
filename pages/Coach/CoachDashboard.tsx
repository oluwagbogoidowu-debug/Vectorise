
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_SPRINTS, MOCK_PARTICIPANT_SPRINTS, MOCK_NOTIFICATIONS } from '../../services/mockData';

const CoachDashboard: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  // Simulate polling for new notifications (e.g. approval from admin)
  useEffect(() => {
      const interval = setInterval(() => {
          // In a real app, this would filter by userId. For mock, we show all relevant types.
          const relevantNotifs = MOCK_NOTIFICATIONS.filter(n => 
              n.type === 'sprint_update' || n.type === 'announcement' || n.type === 'referral_update'
          ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setNotifications(relevantNotifs);
      }, 2000);
      return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const mySprints = MOCK_SPRINTS.filter(s => s.coachId === user.id);
  const activeSprints = mySprints.filter(s => s.published);
  const totalStudents = new Set(MOCK_PARTICIPANT_SPRINTS
    .filter(ps => mySprints.some(s => s.id === ps.sprintId))
    .map(ps => ps.participantId)).size;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-8">
         <div>
            <h1 className="text-2xl font-bold text-gray-900">Coach Dashboard</h1>
            <p className="text-gray-500">Overview of your coaching impact.</p>
         </div>
         <Link to="/coach/sprint/new" className="bg-primary text-white px-4 py-2 rounded-lg font-semibold shadow-sm hover:bg-primary-hover transition-colors">
            + New Sprint
         </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-gray-500 text-xs font-bold uppercase">Active Sprints</p>
              <p className="text-2xl font-bold text-gray-900">{activeSprints.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-gray-500 text-xs font-bold uppercase">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-gray-500 text-xs font-bold uppercase">This Week</p>
              <p className="text-2xl font-bold text-green-600">+₦120,000</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-gray-500 text-xs font-bold uppercase">Rating</p>
              <p className="text-2xl font-bold text-gray-900">4.9</p>
          </div>
      </div>

      {/* Recent Activity / Notifications */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="font-bold text-lg mb-4">Important Updates</h2>
          <div className="space-y-4 max-h-64 overflow-y-auto">
              {notifications.length > 0 ? (
                  notifications.map((notif, idx) => (
                    <div key={idx} className={`flex gap-4 items-start p-3 rounded-lg border ${
                        notif.text.includes('approved') ? 'bg-green-50 border-green-100' : 
                        notif.text.includes('not approved') ? 'bg-red-50 border-red-100' :
                        'bg-blue-50 border-blue-100'
                    }`}>
                        <span className="mt-1 text-xl">
                            {notif.text.includes('approved') ? '✅' : notif.text.includes('not approved') ? '⚠️' : 'ℹ️'}
                        </span>
                        <div>
                            <p className="font-semibold text-gray-900 text-sm">{notif.type === 'sprint_update' ? 'Sprint Status Update' : 'Notification'}</p>
                            <p className="text-gray-600 text-sm">{notif.text}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                    </div>
                  ))
              ) : (
                  <p className="text-gray-500 text-sm italic">No new updates.</p>
              )}
          </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/coach/sprints" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-primary transition-colors group">
              <div className="mb-4 bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center text-gray-600 group-hover:bg-primary group-hover:text-white transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
              </div>
              <h3 className="font-bold text-lg text-gray-900">Manage Sprints</h3>
              <p className="text-sm text-gray-500">Edit content, submit drafts for approval, and view analytics.</p>
          </Link>
           <Link to="/coach/participants" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-primary transition-colors group">
              <div className="mb-4 bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center text-gray-600 group-hover:bg-primary group-hover:text-white transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
              </div>
              <h3 className="font-bold text-lg text-gray-900">Participant Progress</h3>
              <p className="text-sm text-gray-500">See who's falling behind and send encouragement.</p>
          </Link>
      </div>
    </div>
  );
};

export default CoachDashboard;
