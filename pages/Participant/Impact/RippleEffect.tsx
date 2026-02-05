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
                className="group flex items-center text-gray-400 hover:text-primary transition-colors mb-6 text-sm font-bold uppercase tracking-widest"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                My Impact
             </button>

            <div className="text-center mb-10">
                <h1 className="text-3xl font-black text-gray-900 mb-2 italic">The Impact Scale</h1>
                <p className="text-gray-600 font-medium">Measuring the magnitude of growth you've catalyzed in others.</p>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-8">
                {leaders.map((leader, index) => {
                    const isMe = user?.id === leader.id;
                    return (
                        <div 
                            key={leader.id} 
                            className={`flex items-center gap-4 p-5 border-b border-gray-50 last:border-0 ${isMe ? 'bg-primary/5' : 'hover:bg-gray-50'} transition-colors`}
                        >
                            <div className="font-black text-gray-400 w-6 text-center text-xs">{index + 1}</div>
                            <img src={leader.profileImageUrl} alt={leader.name} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm" />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className={`font-bold text-sm ${isMe ? 'text-primary' : 'text-gray-900'}`}>
                                        {leader.name} {isMe && '(You)'}
                                    </h3>
                                    {index < 3 && <span className="text-lg">🏅</span>}
                                </div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                    {leader.impactStats?.peopleHelped === 1 
                                        ? 'Helped 1 person grow' 
                                        : `Helped ${leader.impactStats?.peopleHelped || 0} people grow`}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="block text-2xl font-black text-gray-900">{leader.impactStats?.peopleHelped || 0}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-gradient-to-r from-primary to-[#0B6040] rounded-[2rem] p-8 text-white text-center shadow-xl shadow-primary/20">
                <h3 className="font-black text-xl mb-2 tracking-tight">Catalyze More Growth</h3>
                <p className="text-white/80 mb-8 font-medium italic">Invite someone new to climb the scale and expand your legacy.</p>
                <Link to="/impact/share">
                    <button className="bg-white text-primary px-10 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:scale-105 transition-all active:scale-95">
                        Invite to Grow
                    </button>
                </Link>
            </div>
        </div>
    );
};

export default RippleEffect;