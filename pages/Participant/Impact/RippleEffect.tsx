
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MOCK_USERS } from '../../../services/mockData';
import { Participant, UserRole } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';
import Button from '../../../components/Button';

const RippleEffect: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    // Get participants with impact data and sort them
    const leaders = MOCK_USERS
        .filter(u => u.role === UserRole.PARTICIPANT && (u as Participant).impactStats)
        .map(u => u as Participant)
        .sort((a, b) => (b.impactStats?.peopleHelped || 0) - (a.impactStats?.peopleHelped || 0));

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
             <button 
                onClick={() => navigate('/impact')} 
                className="group flex items-center text-gray-500 hover:text-primary transition-colors mb-6 text-sm font-medium"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
            </button>

            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Ripple Effect</h1>
                <p className="text-gray-600">See how your impact compares with others who are helping people grow.</p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                {leaders.map((leader, index) => {
                    const isMe = user?.id === leader.id;
                    return (
                        <div 
                            key={leader.id} 
                            className={`flex items-center gap-4 p-5 border-b border-gray-50 ${isMe ? 'bg-green-50/50' : 'hover:bg-gray-50'} transition-colors`}
                        >
                            <div className="font-bold text-gray-400 w-6 text-center">{index + 1}</div>
                            <img src={leader.profileImageUrl} alt={leader.name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className={`font-bold ${isMe ? 'text-primary' : 'text-gray-900'}`}>
                                        {leader.name} {isMe && '(You)'}
                                    </h3>
                                    {index < 3 && <span className="text-lg">🏅</span>}
                                </div>
                                <p className="text-xs text-gray-500">
                                    {leader.impactStats?.peopleHelped === 1 
                                        ? 'Helped 1 person start' 
                                        : `Helped ${leader.impactStats?.peopleHelped || 0} people start`}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="block text-2xl font-bold text-gray-900">{leader.impactStats?.peopleHelped || 0}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-gradient-to-r from-primary to-[#0B6040] rounded-2xl p-6 text-white text-center shadow-lg">
                <h3 className="font-bold text-xl mb-2">Expand Your Ripple</h3>
                <p className="text-white/90 mb-6">Invite one more person to climb the leaderboard and help someone grow.</p>
                <Link to="/impact/share">
                    <Button className="bg-white text-primary border-none hover:bg-gray-100 w-full sm:w-auto px-8">
                        Invite More People
                    </Button>
                </Link>
            </div>
        </div>
    );
};

export default RippleEffect;