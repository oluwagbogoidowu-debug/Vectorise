import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, Coach, Sprint, PartnerApplication, PlatformPulse, Quote, FunnelStats, Track } from '../../types';
import { sprintService } from '../../services/sprintService';
import { trackService } from '../../services/trackService';
import { analyticsService } from '../../services/analyticsService';
import { quoteService } from '../../services/quoteService';
import { partnerService } from '../../services/partnerService';
import { analyticsTracker } from '../../services/analyticsTracker';
import { db } from '../../services/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import Button from '../../components/Button';
import LifecycleOrchestrator from './LifecycleOrchestrator';
import AdminEarnings from './AdminEarnings';
import AdminAnalytics from './AdminAnalytics';
import AdminCoaches from './AdminCoaches';
import AdminSprints from './AdminSprints';
import AdminPartners from './AdminPartners';
import AdminQuotes from './AdminQuotes';
import AdminUsers from './AdminUsers';
import AdminTracks from './AdminTracks';
import AdminNotifications from './AdminNotifications';
import { adminCache, resetAdminCache } from './adminCache';
import { SwitchModeModal } from '../../components/SwitchModeModal';

type Tab = 'pulse' | 'orchestrator' | 'analytics' | 'earning' | 'sprints' | 'tracks' | 'coaches' | 'partners' | 'quotes' | 'roles' | 'users' | 'notifications';
type SprintFilter = 'all' | 'active' | 'core' | 'pending' | 'rejected';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { user, logout, switchRole, activeRole } = useAuth();
    const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('pulse');
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [partnerApps, setPartnerApps] = useState<PartnerApplication[]>([]);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); 
    const [platformPulse, setPlatformPulse] = useState<PlatformPulse | null>(null);
    const [behavioralStats, setBehavioralStats] = useState<FunnelStats | null>(null);
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
    const [migrationResult, setMigrationResult] = useState<any>(null);

    const [cardSettings, setCardSettings] = useState<any>({
        blog: true,
        explore: true,
        growth: true,
        impact: true,
        archive: true,
        ignite: true,
        profile: true,
        hallOfRise: true,
    });

    useEffect(() => {
        const docRef = doc(db, 'settings', 'participant_dashboard');
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCardSettings({
                    blog: data.blog !== false,
                    explore: data.explore !== false,
                    growth: data.growth !== false,
                    impact: data.impact !== false,
                    archive: data.archive !== false,
                    ignite: data.ignite !== false,
                    profile: data.profile !== false,
                    hallOfRise: data.hallOfRise !== false,
                });
            }
        }, (err) => {
            console.error("Error subscribing to cardSettings in admin dashboard:", err);
        });
        return () => unsubscribe();
    }, []);

    const toggleCardSetting = async (key: string) => {
        const newValue = !cardSettings[key];
        const updatedSettings = { ...cardSettings, [key]: newValue };
        const docRef = doc(db, 'settings', 'participant_dashboard');
        try {
            await setDoc(docRef, updatedSettings);
        } catch (err) {
            console.error("Error updating card setting:", err);
        }
    };

    const handleRunMigration = async () => {
        setIsMigrating(true);
        setMigrationResult(null);
        setMigrationLogs(["Initializing migration..."]);
        
        try {
            const report = await sprintService.runSystemMigration((msg) => {
                setMigrationLogs(prev => [...prev, msg]);
            });
            setMigrationResult(report);
            resetAdminCache(); // Clear the local cache to fetch fresh data after migration
            setRefreshKey(prev => prev + 1);
        } catch (err: any) {
            setMigrationLogs(prev => [...prev, `CRITICAL ERROR: ${err.message || err}`]);
        } finally {
            setIsMigrating(false);
        }
    };

    const fetchPulse = async () => {
        if (adminCache.pulse) {
            setPlatformPulse(adminCache.pulse.platformPulse);
            setBehavioralStats(adminCache.pulse.behavioralStats);
            return;
        }
        const pulse = await analyticsService.getPlatformPulse();
        setPlatformPulse(pulse);
        const bStats = await analyticsTracker.getFunnelMetrics();
        setBehavioralStats(bStats);
        adminCache.pulse = {
            platformPulse: pulse,
            behavioralStats: bStats
        };
    };







    useEffect(() => {
        fetchPulse();
        const unsubscribeSprints = sprintService.subscribeToAdminSprints((data) => {
            const sorted = [...data].sort((a, b) => {
                const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return timeB - timeA;
            });
            setSprints(sorted);
        });
        const unsubscribeTracks = trackService.subscribeToTracks((data: Track[]) => {
            setTracks(data);
        });
        return () => {
            unsubscribeSprints();
            unsubscribeTracks();
        };
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
        <div className="min-h-screen bg-[#FAFAFA] font-sans pb-12">
            <div className="max-w-7xl mx-auto p-6">
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-5">
                        <button onClick={() => navigate('/')} className="p-3.5 bg-white text-gray-400 hover:text-primary rounded-2xl shadow-sm border border-gray-100 transition-all active:scale-90 cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight italic">Admin Control.</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsSwitchModalOpen(true)} 
                            className="px-5 py-3 bg-dark text-white rounded-2xl shadow-lg shadow-black/10 text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 flex items-center gap-2"
                            id="admin-switch-mode-btn"
                        >
                            <span>🎛️</span> Switch Mode
                        </button>
                        <button onClick={handleLogout} disabled={isLoggingOut} className="p-3 bg-white text-red-400 rounded-2xl shadow-sm border border-gray-100 hover:bg-red-50 active:scale-90 disabled:opacity-50"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
                    </div>
                </div>
            </div>

            <div className="bg-white border-y border-gray-100 min-h-[75vh] flex flex-col">
                <div className="border-b border-gray-100 bg-gray-50/20 px-6 sm:px-10 overflow-x-auto no-scrollbar">
                    <div className="max-w-7xl mx-auto">
                        <nav className="-mb-px flex space-x-12">
                            {[
                                { id: 'pulse', label: 'Pulse' },
                                { id: 'users', label: 'Users' },
                                { id: 'notifications', label: 'Notifications' },
                                { id: 'analytics', label: 'Analytics' },
                                { id: 'sprints', label: 'Sprints' },
                                { id: 'tracks', label: 'Tracks' },
                                { id: 'orchestrator', label: 'Orchestrator' },
                                { id: 'earning', label: 'Earning' },
                                { id: 'roles', label: 'System' },
                                { id: 'coaches', label: 'Coaches' },
                                { id: 'partners', label: 'Partners' },
                                { id: 'quotes', label: 'Quotes' }
                            ].map(t => (
                                <button key={t.id} onClick={() => setActiveTab(t.id as Tab)} className={`whitespace-nowrap py-8 px-1 border-b-4 font-black text-[11px] uppercase tracking-widest transition-all cursor-pointer ${activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>{t.label}</button>
                            ))}
                        </nav>
                    </div>
                </div>
                
                <div className="p-6 sm:p-10 flex-1 bg-white">
                    <div className="max-w-7xl mx-auto">
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

                        {activeTab === 'users' && <AdminUsers />}

                        {activeTab === 'notifications' && <AdminNotifications />}

                        {activeTab === 'analytics' && <AdminAnalytics />}

                        {activeTab === 'sprints' && <AdminSprints />}

                        {activeTab === 'tracks' && <AdminTracks />}

                        {activeTab === 'orchestrator' && <LifecycleOrchestrator allSprints={sprints} allTracks={tracks} refreshKey={refreshKey} />}

                        {activeTab === 'earning' && <AdminEarnings />}

                        {activeTab === 'roles' && (
                            <div id="admin-system-panel" className="animate-fade-in max-w-4xl mx-auto py-8 space-y-12">
                                {/* 1. Theme Configuration & Role Utility */}
                                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                            </svg>
                                        </div>
                                        <div className="space-y-1 text-left">
                                            <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none italic">System Mode Selector</h3>
                                            <p className="text-gray-400 text-xs font-semibold leading-relaxed max-w-md">
                                                Switch role permissions or access the universal root selector configuration panel.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <Button id="btn-open-role-selector" variant="primary" onClick={() => navigate('/admin/role-selector')}>
                                            Open Role Selector
                                        </Button>
                                    </div>
                                </div>

                                {/* 2. Participant Dashboard Card Control */}
                                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-sm space-y-8 text-left">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-50 pb-8">
                                        <div className="space-y-2 text-left">
                                            <span className="text-[9px] font-black tracking-widest text-[#0E7850] bg-emerald-50 px-3 py-1.5 rounded-full uppercase">Participant Controls</span>
                                            <h3 className="text-xl font-black text-gray-900 tracking-tight italic">Participant Dashboard Card Control</h3>
                                            <p className="text-gray-400 text-xs font-semibold leading-relaxed max-w-2xl">
                                                Toggle which "Step Up Your Rise" cards and widgets are active and visible on the Participant Dashboard in real-time.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {[
                                            { key: 'ignite', title: 'Daily Ignite widget', desc: 'Displays floating Daily Ignite video/thought of the day player.' },
                                            { key: 'blog', title: 'Read RiseBlog card', desc: 'Allows participants to see and read the latest blog post.' },
                                            { key: 'explore', title: 'See what\'s next (Explore) card', desc: 'Recommends and links to the next sprint.' },
                                            { key: 'growth', title: 'See your rise analysis (Growth) card', desc: 'Shows the overall completion progress and stats analyzer.' },
                                            { key: 'impact', title: 'Become a Catalyst (Impact) card', desc: 'Displays sharing/referral options and rewards info.' },
                                            { key: 'archive', title: 'Revisit your Rise (Archive) card', desc: 'Provides quick navigation to completed daily step submissions.' },
                                            { key: 'profile', title: 'Complete Your Profile Card', desc: 'Prompts users to set up their custom Identity & avatar.' },
                                            { key: 'hallOfRise', title: 'Hall of Rise Reward Card', desc: 'Notifies participants about unlocked milestone rewards.' },
                                        ].map((card) => {
                                            const isEnabled = cardSettings[card.key] !== false;
                                            return (
                                                <div key={card.key} className="flex items-center justify-between p-5 bg-gray-50/50 rounded-2xl border border-gray-100 shadow-sm hover:bg-gray-50/85 transition-all">
                                                    <div className="space-y-1 pr-4 text-left">
                                                        <p className="text-xs font-black text-gray-900">{card.title}</p>
                                                        <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">{card.desc}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleCardSetting(card.key)}
                                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isEnabled ? 'bg-primary' : 'bg-gray-300'}`}
                                                        style={{ backgroundColor: isEnabled ? '#0E7850' : '#D1D5DB' }}
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                                                        />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'coaches' && <AdminCoaches />}

                        {activeTab === 'partners' && <AdminPartners />}

                        {activeTab === 'quotes' && <AdminQuotes />}
                    </div>
                </div>
            </div>
            <SwitchModeModal
                isOpen={isSwitchModalOpen}
                onClose={() => setIsSwitchModalOpen(false)}
                user={user}
                activeRole={activeRole}
                onSelectMode={(role, route) => {
                    switchRole(role);
                    navigate(route);
                }}
            />

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
}