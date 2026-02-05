import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { MOCK_REFERRALS, MOCK_USERS } from '../../../services/mockData';
import { Participant, Referral, UserRole } from '../../../types';
import Button from '../../../components/Button';

// Mapping of Impact Degree Milestone IDs to their point values as defined in Badges.tsx
const IMPACT_DEGREE_POINTS: Record<string, number> = {
    'i1': 5,
    'i3': 15,
    'i5': 25,
    'i10': 50,
    'i15': 75,
    'i20': 100,
    'i25': 125,
    'i30': 150,
    'i35': 175,
    'i40': 200,
    'i45': 225,
    'i50': 250
};

const ImpactDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;
    const participant = user as Participant;

    const myReferrals = MOCK_REFERRALS.filter(r => r.referrerId === user.id);
    const peopleHelped = myReferrals.length;
    
    // Calculate specifically the credits earned from Impact Degrees
    const impactCredits = useMemo(() => {
        const claimed = participant.claimedMilestoneIds || [];
        return claimed.reduce((acc, id) => acc + (IMPACT_DEGREE_POINTS[id] || 0), 0);
    }, [participant.claimedMilestoneIds]);
    
    // Impact Leaderboard Data
    const leaders = useMemo(() => {
        return MOCK_USERS
            .filter(u => u.role === UserRole.PARTICIPANT && (u as Participant).impactStats)
            .map(u => u as Participant)
            .sort((a, b) => (b.impactStats?.peopleHelped || 0) - (a.impactStats?.peopleHelped || 0))
            .slice(0, 5); // Show top 5 in dashboard view
    }, []);

    const getStatusText = (status: Referral['status']) => {
        switch(status) {
            case 'joined': return 'Joined Vectorise';
            case 'started_sprint': return 'Started Sprint';
            case 'completed_week_1': return 'Completed Week 1';
            case 'completed_sprint': return 'Completed Sprint';
            default: return 'Joined';
        }
    };

    const getStatusColor = (status: Referral['status']) => {
        switch(status) {
            case 'joined': return 'bg-gray-100 text-gray-600';
            case 'started_sprint': return 'bg-blue-100 text-blue-700';
            case 'completed_week_1': return 'bg-purple-100 text-purple-700';
            case 'completed_sprint': return 'bg-green-100 text-green-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 pb-24 animate-fade-in bg-[#FAFAFA]">
            {/* Header */}
            <div className="mb-10">
                <button 
                    onClick={() => navigate('/profile')} 
                    className="group flex items-center text-gray-400 hover:text-primary transition-colors mb-6 text-xs font-black uppercase tracking-widest"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                    </svg>
                    My Profile
                </button>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2 italic">Your Impact</h1>
                <p className="text-gray-500 font-medium text-lg">Every person you invite is a legacy of growth you've catalyzed.</p>
            </div>

            {/* Hero Section: Simplified Total Impact Card */}
            <div className="mb-12">
                <div className="bg-gradient-to-br from-[#0E7850] to-[#0B6040] rounded-[2.5rem] p-10 md:p-14 text-white shadow-xl relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center lg:items-center gap-12">
                        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
                            <h2 className="text-8xl md:text-9xl font-black leading-none tracking-tighter mb-4">{peopleHelped}</h2>
                            <div className="flex flex-col md:flex-row items-center lg:items-start gap-3 md:gap-6">
                                <p className="text-xs font-black uppercase tracking-[0.25em] text-white/60">People Catalyzed</p>
                                <div className="hidden md:block w-1.5 h-1.5 bg-white/20 rounded-full mt-1.5"></div>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🪙</span>
                                    <p className="text-xs font-black uppercase tracking-[0.25em] text-white/60">{impactCredits} Credits Earned</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 w-full md:w-auto">
                            <Link to="/impact/share" className="w-full">
                                <button className="w-full md:w-80 px-10 py-5 bg-white text-primary font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg hover:scale-[1.02] transition-all active:scale-95">
                                    Expand My Impact
                                </button>
                            </Link>
                            <Link to="/impact/badges" className="w-full">
                                <button className="w-full md:w-80 px-10 py-5 bg-black/10 text-white border border-white/20 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-black/20 transition-all active:scale-95 backdrop-blur-sm">
                                    Claim Rewards
                                </button>
                            </Link>
                        </div>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>
                </div>
            </div>

            {/* Impact Scale (Leaderboard) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <section className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-8 px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest">Impact Scale</h2>
                        </div>
                        <Link 
                            to="/impact/ripple" 
                            className="p-2.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all border border-transparent"
                            title="Fullscreen Scale"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                        </Link>
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-12">
                        {leaders.map((leader, index) => {
                            const isMe = user?.id === leader.id;
                            return (
                                <div 
                                    key={leader.id} 
                                    className={`flex items-center gap-4 p-5 border-b border-gray-50 last:border-0 ${isMe ? 'bg-primary/5' : 'hover:bg-gray-50'} transition-colors`}
                                >
                                    <div className="font-black text-gray-300 w-6 text-center text-xs">{index + 1}</div>
                                    <img src={leader.profileImageUrl} alt={leader.name} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-bold text-sm ${isMe ? 'text-primary' : 'text-gray-900'}`}>
                                                {leader.name} {isMe && '(You)'}
                                            </h3>
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                            {leader.impactStats?.peopleHelped === 1 
                                                ? '1 Person Guided' 
                                                : `${leader.impactStats?.peopleHelped || 0} People Guided`}
                                        </p>
                                    </div>
                                    <div className="text-right pr-2">
                                        <span className="block text-xl font-black text-gray-900">{leader.impactStats?.peopleHelped || 0}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Impact History */}
                    <div className="px-2 mb-6">
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-6">Recent Growth Catalysts</h3>
                        {myReferrals.length > 0 ? (
                            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
                                <div className="divide-y divide-gray-50">
                                    {myReferrals.slice(0, 4).map((referral) => (
                                        <div key={referral.id} className="p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                                            <img src={referral.refereeAvatar || `https://ui-avatars.com/api/?name=${referral.refereeName}&background=random`} alt={referral.refereeName} className="w-10 h-10 rounded-xl object-cover border border-gray-100 shadow-sm" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-bold text-gray-900 text-sm truncate">{referral.refereeName}</p>
                                                    <span className="text-[10px] text-green-600 font-black uppercase tracking-widest">+1 🪙</span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight truncate">
                                                    Making Progress: {referral.sprintName || 'Joined Platform'}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${getStatusColor(referral.status)}`}>
                                                {getStatusText(referral.status).split(' ')[0]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {myReferrals.length > 4 && (
                                    <div className="p-4 bg-gray-50 text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">+{myReferrals.length - 4} More Impact Records</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white border-2 border-dashed border-gray-100 rounded-3xl p-12 text-center">
                                <span className="text-4xl block mb-4 grayscale opacity-30">🌱</span>
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-8">You haven't catalyzed anyone yet.</p>
                                <Link to="/impact/share">
                                    <Button variant="secondary" className="px-10 bg-gray-100 text-gray-600 hover:bg-gray-200 border-none font-black text-[10px] uppercase tracking-widest">Start Your Impact</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </section>

                <aside>
                    <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm sticky top-6">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-inner">🔗</div>
                        <h3 className="font-black text-gray-900 uppercase tracking-widest mb-2">Catalyst Code</h3>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6 italic">Invite others to Vectorise. When they grow, your impact grows.</p>
                        
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between mb-6 group hover:border-primary/30 transition-all">
                            <code className="text-xs font-bold text-gray-700 truncate flex-1 mr-2">{participant.referralCode || 'GROW123'}</code>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(participant.referralCode || 'GROW123');
                                    alert('Copied!');
                                }}
                                className="text-primary hover:scale-110 p-1.5 bg-white rounded-lg shadow-sm transition-transform" 
                                title="Copy"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                        
                        <Link to="/impact/share" className="block w-full">
                            <button className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-hover active:scale-95 transition-all">
                                Share My Link
                            </button>
                        </Link>
                        
                        <div className="mt-8 pt-8 border-t border-gray-50 space-y-4">
                            <Link to="/impact/badges" className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors group">
                                <span>Impact Milestones</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                            </Link>
                        </div>
                    </div>
                </aside>
            </div>
            
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default ImpactDashboard;