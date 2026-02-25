import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, Coach, Sprint, PartnerApplication, PlatformPulse, Quote, FunnelStats } from '../../types';
import { sprintService } from '../../services/sprintService';
import { analyticsService } from '../../services/analyticsService';
import { quoteService } from '../../services/quoteService';
import { partnerService } from '../../services/partnerService';
import { analyticsTracker } from '../../services/analyticsTracker';
import Button from '../../components/Button';
import LifecycleOrchestrator from './LifecycleOrchestrator';
import AdminEarnings from './AdminEarnings';
import AdminAnalytics from './AdminAnalytics';
import AdminCoaches from './AdminCoaches';
import AdminSprints from './AdminSprints';
import AdminPartners from './AdminPartners';
import AdminQuotes from './AdminQuotes';

type Tab = 'pulse' | 'orchestrator' | 'analytics' | 'earning' | 'sprints' | 'coaches' | 'partners' | 'quotes' | 'roles';
type SprintFilter = 'all' | 'active' | 'core' | 'pending' | 'rejected';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('pulse');
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [partnerApps, setPartnerApps] = useState<PartnerApplication[]>([]);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); 
    const [platformPulse, setPlatformPulse] = useState<PlatformPulse | null>(null);
    const [behavioralStats, setBehavioralStats] = useState<FunnelStats | null>(null);

    const fetchPulse = async () => {
        const pulse = await analyticsService.getPlatformPulse();
        setPlatformPulse(pulse);
        const bStats = await analyticsTracker.getFunnelMetrics();
        setBehavioralStats(bStats);
    };







    useEffect(() => {
        fetchPulse();
    }, [refreshKey]);



    const handleLogout = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try { await logout(); } catch (err) { setIsLoggingOut(false); }
    };

    const MetricBlock = ({ label, value, color = "gray" }: { label: string, value: string | number, color?: string }) => (
        <div className={`bg-${color}-50 p-8 rounded-[2rem] border border-${color}-100 transition-all`}>
            <p className={`text-[10px] font-black text-${color}-400 uppercase tracking-widest mb-2`}>{label}</p>
            <p className={`text-4xl font-black text-${color}-900`}>{value}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FAFAFA] p-6 font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-5">
                        <button onClick={() => navigate('/')} className="p-3.5 bg-white text-gray-400 hover:text-primary rounded-2xl shadow-sm border border-gray-100 transition-all active:scale-90 cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight italic">Admin Control.</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setRefreshKey(k => k + 1)} className="p-3 bg-white text-gray-400 hover:text-primary rounded-2xl shadow-sm border border-gray-100 active:scale-90 group"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-active:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
                        <button onClick={handleLogout} disabled={isLoggingOut} className="p-3 bg-white text-red-400 rounded-2xl shadow-sm border border-gray-100 hover:bg-red-50 active:scale-90 disabled:opacity-50"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden min-h-[75vh] flex flex-col">
                    <div className="border-b border-gray-100 bg-gray-50/20 px-10 overflow-x-auto no-scrollbar">
                        <nav className="-mb-px flex space-x-12">
                            {[
                                { id: 'pulse', label: 'Pulse' },
                                { id: 'orchestrator', label: 'Orchestrator' },
                                { id: 'analytics', label: 'Analytics' },
                                { id: 'earning', label: 'Earning' },
                                { id: 'sprints', label: 'Sprints' },
                                { id: 'coaches', label: 'Coaches' },
                                { id: 'partners', label: 'Partners' },
                                { id: 'quotes', label: 'Quotes' },
                                { id: 'roles', label: 'System' }
                            ].map(t => (
                                <button key={t.id} onClick={() => setActiveTab(t.id as Tab)} className={`whitespace-nowrap py-8 px-1 border-b-4 font-black text-[11px] uppercase tracking-widest transition-all cursor-pointer ${activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>{t.label}</button>
                            ))}
                        </nav>
                    </div>
                    
                    <div className="p-10 flex-1">
                        {activeTab === 'pulse' && (
                            <div className="animate-fade-in space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <MetricBlock label="Logged-in Users (24h)" value={behavioralStats?.activeUserList?.length || 0} color="blue" />
                                    <MetricBlock label="Live Programs" value={sprints.filter(s => s.published).length} color="primary" />
                                    <MetricBlock label="At Risk" value={platformPulse?.atRiskCount || 0} color="red" />
                                    <MetricBlock label="Partner Apps" value={partnerApps.filter(a => a.status === 'pending').length} color="orange" />
                                </div>

                                <section className="bg-gray-50/50 rounded-[2.5rem] p-10 border border-gray-100">
                                    <div className="flex justify-between items-center mb-8">
                                        <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em]">Active Identities (Last 24h)</h4>
                                        <span className="text-[8px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-1 rounded-md">Live behavioral Audit</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {behavioralStats?.activeUserList && behavioralStats.activeUserList.length > 0 ? (
                                            behavioralStats.activeUserList.map((user, idx) => (
                                                <div 
                                                  key={user.id} 
                                                  onClick={() => navigate(`/admin/analytics/user/${encodeURIComponent(user.id)}`)}
                                                  className="bg-white px-5 py-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all cursor-pointer"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                                            <p className="text-[11px] font-bold text-gray-700 truncate">{user.label}</p>
                                                        </div>
                                                        <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest pl-3">
                                                            Last: {new Date(user.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    <svg className="h-3 w-3 text-gray-200 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7"/></svg>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-full py-12 text-center">
                                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No authentications recorded in the last cycle.</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'orchestrator' && <LifecycleOrchestrator allSprints={sprints} refreshKey={refreshKey} />}
                        
                        {activeTab === 'analytics' && <AdminAnalytics />}
                        
                        {activeTab === 'earning' && <AdminEarnings />}

                        {activeTab === 'sprints' && <AdminSprints />}

                        {activeTab === 'coaches' && <AdminCoaches />}

                        {activeTab === 'partners' && <AdminPartners />}
                        {activeTab === 'quotes' && <AdminQuotes />}
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
}