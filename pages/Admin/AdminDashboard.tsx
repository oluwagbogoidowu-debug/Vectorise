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

type Tab = 'pulse' | 'orchestrator' | 'analytics' | 'earning' | 'sprints' | 'tracks' | 'coaches' | 'partners' | 'quotes' | 'roles' | 'users';
type SprintFilter = 'all' | 'active' | 'core' | 'pending' | 'rejected';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { logout, switchRole } = useAuth();
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

    const handleRunMigration = async () => {
        setIsMigrating(true);
        setMigrationResult(null);
        setMigrationLogs(["Initializing migration..."]);
        
        try {
            const report = await sprintService.runSystemMigration((msg) => {
                setMigrationLogs(prev => [...prev, msg]);
            });
            setMigrationResult(report);
            setRefreshKey(prev => prev + 1);
        } catch (err: any) {
            setMigrationLogs(prev => [...prev, `CRITICAL ERROR: ${err.message || err}`]);
        } finally {
            setIsMigrating(false);
        }
    };

    const fetchPulse = async () => {
        const pulse = await analyticsService.getPlatformPulse();
        setPlatformPulse(pulse);
        const bStats = await analyticsTracker.getFunnelMetrics();
        setBehavioralStats(bStats);
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
        <div className="min-h-screen bg-[#FAFAFA] p-6 font-sans">
            <div className="max-w-7xl mx-auto">
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
                            onClick={() => {
                                switchRole(UserRole.COACH);
                                navigate('/coach/dashboard');
                            }} 
                            className="px-5 py-3 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            Switch to Coach
                        </button>
                        <button onClick={handleLogout} disabled={isLoggingOut} className="p-3 bg-white text-red-400 rounded-2xl shadow-sm border border-gray-100 hover:bg-red-50 active:scale-90 disabled:opacity-50"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden min-h-[75vh] flex flex-col">
                    <div className="border-b border-gray-100 bg-gray-50/20 px-10 overflow-x-auto no-scrollbar">
                        <nav className="-mb-px flex space-x-12">
                            {[
                                { id: 'pulse', label: 'Pulse' },
                                { id: 'users', label: 'Users' },
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

                        {activeTab === 'users' && <AdminUsers />}

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

                                {/* 2. Database Centralization & Legacy Purge Utility */}
                                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-sm space-y-8">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-50 pb-8">
                                        <div className="space-y-2 text-left">
                                            <span className="text-[9px] font-black tracking-widest text-[#FF5A5F] bg-[#FF5A5F]/5 px-3 py-1.5 rounded-full uppercase">Database Integrity</span>
                                            <h3 className="text-xl font-black text-gray-900 tracking-tight italic">Sprint Content Centralizer & Purge Tool</h3>
                                            <p className="text-gray-400 text-xs font-semibold leading-relaxed max-w-2xl">
                                                Ensures <code className="font-mono text-primary font-bold">sprints/&#123;sprintId&#125;/days</code> is the unified single-source-of-truth for daily content. This migration scans all sprints, migrates orphan contents, cleans redundant fields from parent paths, and fully deletes legacy <code className="font-mono text-[#FF5A5F]">day X</code> subcollections.
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <button 
                                                id="btn-run-centralizer-migration"
                                                onClick={handleRunMigration}
                                                disabled={isMigrating}
                                                className={`px-8 py-4 rounded-2xl shadow-lg font-black text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer ${isMigrating ? 'bg-gray-100 text-gray-400 shadow-none cursor-not-allowed' : 'bg-primary text-white hover:bg-primary-dark shadow-primary/20 active:scale-95'}`}
                                            >
                                                {isMigrating ? (
                                                    <>
                                                        <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                        </svg>
                                                        Migrating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
                                                        </svg>
                                                        Run Purge & Centralization
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Action Logs Terminal */}
                                    {migrationLogs.length > 0 && (
                                        <div className="space-y-3 text-left">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Migration Audit Stream</h4>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`w-2 h-2 rounded-full ${isMigrating ? 'bg-amber-400 animate-ping' : 'bg-green-400'}`}></span>
                                                    <span className="text-[8px] font-bold text-gray-400 uppercase">{isMigrating ? 'Running' : 'Ready'}</span>
                                                </div>
                                            </div>
                                            <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-inner max-h-72 overflow-y-auto no-scrollbar font-mono text-[10px] text-slate-300 leading-normal space-y-2">
                                                {migrationLogs.map((log, idx) => (
                                                    <div key={idx} className={`border-l-2 pl-3 ${log.includes('Successfully') || log.includes('complete') ? 'border-green-500 text-green-300' : log.includes('Error') || log.includes('Fatal') ? 'border-red-500 text-red-400' : 'border-slate-600 text-slate-300'}`}>
                                                        <span className="text-slate-500 mr-2">[{new Date().toLocaleTimeString([], { hour12: false })}]</span> {log}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Migration Report Cards */}
                                    {migrationResult && (
                                        <div className="space-y-4 text-left animate-fade-in">
                                            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Migration Complete Output Ledger</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 text-center">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Sprints Scanned</p>
                                                    <p className="text-2xl font-black text-slate-700">{migrationResult.sprintsScanned}</p>
                                                </div>
                                                <div className="bg-green-50/30 border border-green-100 rounded-2xl p-5 text-center">
                                                    <p className="text-[8px] font-black text-green-500 uppercase tracking-widest mb-1">Migrated to Days</p>
                                                    <p className="text-2xl font-black text-green-600">{migrationResult.sprintsMigratedToSubcollection}</p>
                                                </div>
                                                <div className="bg-red-50/30 border border-red-100 rounded-2xl p-5 text-center">
                                                    <p className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-1">Redundant Docs Deleted</p>
                                                    <p className="text-2xl font-black text-red-600">{migrationResult.legacyDocsDeleted}</p>
                                                </div>
                                                <div className="bg-blue-50/30 border border-blue-100 rounded-2xl p-5 text-center">
                                                    <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1">Parent Fields Purged</p>
                                                    <p className="text-2xl font-black text-blue-600">{migrationResult.parentFieldsCleaned}</p>
                                                </div>
                                                <div className="bg-[#FF5A5F]/5 border border-[#FF5A5F]/10 rounded-2xl p-5 text-center">
                                                    <p className="text-[8px] font-black text-[#FF5A5F] uppercase tracking-widest mb-1">Details Fields Purged</p>
                                                    <p className="text-2xl font-black text-[#FF5A5F]">{migrationResult.detailsFieldsCleaned}</p>
                                                </div>
                                            </div>

                                            {migrationResult.errors.length > 0 && (
                                                <div className="bg-red-50 border border-red-100 rounded-2xl p-5 space-y-2">
                                                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Encountered Anomalies:</p>
                                                    <ul className="list-disc list-inside text-[11px] text-red-700 font-semibold space-y-1">
                                                        {migrationResult.errors.map((err: string, idx: number) => (
                                                            <li key={idx}>{err}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

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