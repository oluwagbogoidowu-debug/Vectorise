
import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { MOCK_REFERRALS } from '../../../services/mockData';
import { Participant, Referral } from '../../../types';
import Button from '../../../components/Button';

const ImpactDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;
    const participant = user as Participant;

    const myReferrals = MOCK_REFERRALS.filter(r => r.referrerId === user.id);
    const peopleHelped = myReferrals.length;
    const walletBalance = participant.walletBalance || 0;
    
    // Sort referrals by date (newest first)
    const sortedReferrals = useMemo(() => {
        return [...myReferrals].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [myReferrals]);

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
        <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
            {/* Header */}
            <div className="mb-8">
                 <button 
                    onClick={() => navigate('/profile')} 
                    className="group flex items-center text-gray-500 hover:text-primary transition-colors mb-4 text-sm font-medium"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Profile
                </button>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Growth Impact</h1>
                <p className="text-gray-600 text-lg">Every person you invite is someone you helped take the next step.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Main Stats Card */}
                <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-3xl p-8 relative overflow-hidden shadow-sm flex flex-col justify-between">
                    <div className="relative z-10">
                        <p className="text-sm font-bold text-primary uppercase tracking-wider mb-1">Total Impact</p>
                        <h2 className="text-5xl font-extrabold text-gray-900 mb-2">{peopleHelped}</h2>
                        <p className="text-gray-600 mb-6">People helped on their journey</p>
                        <Link to="/impact/share">
                            <Button className="shadow-lg hover:scale-105 transition-transform w-full md:w-auto">
                                Invite Someone
                            </Button>
                        </Link>
                    </div>
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-green-100 rounded-full blur-3xl -mr-16 -mt-16 opacity-60"></div>
                </div>

                {/* Wallet / Points Card */}
                <div className="bg-gradient-to-br from-yellow-50 to-white border border-yellow-100 rounded-3xl p-8 relative overflow-hidden shadow-sm flex flex-col justify-between">
                     <div className="relative z-10">
                        <div className="flex justify-between items-start">
                             <div>
                                <p className="text-sm font-bold text-yellow-700 uppercase tracking-wider mb-1">Growth Credits</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl">🪙</span>
                                    <h2 className="text-5xl font-extrabold text-gray-900 mb-2">{walletBalance}</h2>
                                </div>
                                <p className="text-gray-600 mb-6">Redeemable Points</p>
                             </div>
                        </div>
                        <div className="flex gap-2">
                             <Link to="/impact/rewards" className="flex-1">
                                <Button variant="secondary" className="w-full bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none">
                                    Redeem / Buy
                                </Button>
                             </Link>
                        </div>
                    </div>
                    {/* Decorative Background */}
                    <div className="absolute bottom-0 right-0 w-48 h-48 bg-yellow-100 rounded-full blur-3xl -mr-10 -mb-10 opacity-60"></div>
                </div>
            </div>

            {/* Quick Links Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <Link to="/impact/ripple" className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-primary/50 transition-colors text-center group">
                    <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">🌍</span>
                    <p className="text-xs font-bold text-gray-500 uppercase">Ripple Effect</p>
                </Link>
                <Link to="/impact/rewards" className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-primary/50 transition-colors text-center group">
                    <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">🎁</span>
                    <p className="text-xs font-bold text-gray-500 uppercase">Rewards</p>
                </Link>
                <Link to="/impact/badges" className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-primary/50 transition-colors text-center group">
                    <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">🏅</span>
                    <p className="text-xs font-bold text-gray-500 uppercase">Badges</p>
                </Link>
            </div>

            {/* Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Recent Impacts List */}
                <div className="lg:col-span-2">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Referral History</h3>
                    
                    {myReferrals.length > 0 ? (
                        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                            <div className="divide-y divide-gray-50">
                                {sortedReferrals.map((referral) => (
                                    <div key={referral.id} className="p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                        <img src={referral.refereeAvatar || `https://ui-avatars.com/api/?name=${referral.refereeName}&background=random`} alt={referral.refereeName} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold text-gray-900">{referral.refereeName}</p>
                                                <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                                                    +1 <span className="text-[10px]">🪙</span>
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                {referral.sprintName ? `Active in ${referral.sprintName}` : 'Joined Vectorise'}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(referral.status)}`}>
                                            {getStatusText(referral.status)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                                <p className="text-xs text-gray-500">Most people you invite take their first action within 24 hours.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">🌱</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Start Your Ripple</h3>
                            <p className="text-gray-500 mb-6 max-w-sm mx-auto">Invite one person who needs a little push. You earn 1 Growth Credit for every referral.</p>
                            <Link to="/impact/share">
                                <Button variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">Invite Someone to Grow</Button>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Sidebar: Invite Link */}
                <div>
                     <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm sticky top-6">
                        <h3 className="font-bold text-gray-900 mb-4">Your Unique Link</h3>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center justify-between mb-4">
                            <code className="text-sm text-gray-600 truncate flex-1 mr-2">vectorise.com/join/{participant.referralCode || 'USER123'}</code>
                            <button className="text-primary hover:text-primary-hover p-1" title="Copy">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                        <Link to="/impact/share" className="block w-full">
                            <Button className="w-full">Share Link</Button>
                        </Link>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default ImpactDashboard;
