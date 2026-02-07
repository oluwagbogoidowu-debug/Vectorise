
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_USERS, MOCK_ROLES, MOCK_SPRINTS } from '../../services/mockData';
import { UserRole, Coach, Sprint, RoleDefinition, Permission, Participant, UserEvent, UserAnalytics, PlatformPulse, CoachAnalytics, Quote, ParticipantSprint } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { analyticsService } from '../../services/analyticsService';
import { quoteService } from '../../services/quoteService';
import Button from '../../components/Button';

type Tab = 'pulse' | 'movement' | 'registry' | 'revenue' | 'sprints' | 'quotes' | 'roles';
type SortField = 'title' | 'price' | 'date';

interface ListDetail {
    title: string;
    items: any[];
    type: 'users' | 'sprints' | 'transactions' | 'coaches';
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('pulse');
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [isLoadingSprints, setIsLoadingSprints] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); 
    
    const [sortBy, setSortBy] = useState<SortField>('date');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const [allCoaches, setAllCoaches] = useState<(Coach | Participant)[]>([]);
    const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
    const [platformPulse, setPlatformPulse] = useState<PlatformPulse | null>(null);
    const [isProcessingAction, setIsProcessingAction] = useState(false);

    // Quote adding state
    const [newQuoteText, setNewQuoteText] = useState('');
    const [newQuoteAuthor, setNewQuoteAuthor] = useState('');

    // Modal States
    const [viewingSprintDrilldown, setViewingSprintDrilldown] = useState<Sprint | null>(null);
    const [activeListDetail, setActiveListDetail] = useState<ListDetail | null>(null);

    // Unified user map for identity resolution
    const userMap = useMemo(() => {
        const map = new Map<string, any>();
        MOCK_USERS.forEach(u => map.set(u.id, u));
        allCoaches.forEach(u => map.set(u.id, u));
        allParticipants.forEach(u => map.set(u.id, u));
        return map;
    }, [allCoaches, allParticipants]);

    useEffect(() => {
        const fetchPulse = async () => {
            const pulse = await analyticsService.getPlatformPulse();
            setPlatformPulse(pulse);
        };
        fetchPulse();
    }, [refreshKey]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dbCoaches, dbParticipants] = await Promise.all([
                    userService.getCoaches(),
                    userService.getParticipants()
                ]);
                setAllCoaches(dbCoaches);
                setAllParticipants(dbParticipants);
            } catch (err) { console.error(err); }
        };
        fetchData();
    }, [refreshKey]);

    useEffect(() => {
        const fetchSprints = async () => {
            setIsLoadingSprints(true);
            try {
                const fetchedSprints = await sprintService.getAdminSprints();
                setSprints(fetchedSprints);
            } catch (err) { console.error(err); } finally { setIsLoadingSprints(false); }
        };
        fetchSprints();
    }, [refreshKey]);

    useEffect(() => {
        const fetchQuotes = async () => {
            const fetched = await quoteService.getQuotes();
            setQuotes(fetched);
        };
        fetchQuotes();
    }, [refreshKey]);

    const sortedSprints = useMemo(() => {
        return [...sprints].sort((a, b) => {
            let valA: any, valB: any;
            if (sortBy === 'title') { valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); }
            else if (sortBy === 'price') { valA = a.price; valB = b.price; }
            else { valA = new Date(a.updatedAt || 0).getTime(); valB = new Date(b.updatedAt || 0).getTime(); }
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [sprints, sortBy, sortOrder]);

    const handleSort = (field: SortField) => {
        if (sortBy === field) setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
        else { setSortBy(field); setSortOrder('desc'); }
    };

    const handleLogout = async () => {
        if (isLoggingOut) return;
        if (!window.confirm("Terminate Admin Session?")) return;
        
        setIsLoggingOut(true);
        try {
            await logout();
            navigate('/login', { replace: true });
        } catch (err) {
            console.error("Logout failed:", err);
            setIsLoggingOut(false);
        }
    };

    const handleApproveUpdates = async (sprintId: string) => {
        if (!window.confirm("Merge these staged updates into the live version?")) return;
        setIsProcessingAction(true);
        try {
            await sprintService.approveSprintUpdates(sprintId);
            setRefreshKey(k => k + 1);
        } catch (err) {
            alert("Failed to approve updates.");
        } finally {
            setIsProcessingAction(false);
        }
    };

    const handleAddQuote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newQuoteText.trim()) return;
        setIsProcessingAction(true);
        try {
            await quoteService.addQuote(newQuoteText, newQuoteAuthor || 'Anonymous');
            setNewQuoteText('');
            setNewQuoteAuthor('');
            setRefreshKey(k => k + 1);
        } catch (err) {
            alert("Failed to add quote.");
        } finally {
            setIsProcessingAction(false);
        }
    };

    const handleDeleteQuote = async (id: string) => {
        if (!window.confirm("Delete this quote?")) return;
        try {
            await quoteService.deleteQuote(id);
            setRefreshKey(k => k + 1);
        } catch (err) {
            alert("Failed to delete quote.");
        }
    };

    const MetricBlock = ({ label, value, sub, onClick, color = "gray", alert = false, trend }: { label: string, value: string | number, sub?: string, onClick?: () => void, color?: string, alert?: boolean, trend?: { label: string, positive: boolean } }) => (
        <div 
            onClick={onClick}
            className={`bg-${color}-50 p-8 rounded-[2rem] border border-${color}-100 transition-all ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg active:scale-95' : ''} ${alert ? 'animate-pulse border-red-200' : ''}`}
        >
            <div className="flex justify-between items-start mb-2">
                <p className={`text-[10px] font-black text-${color}-400 uppercase tracking-widest`}>{label}</p>
                {trend && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${trend.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {trend.label}
                    </span>
                )}
            </div>
            <div className="flex items-baseline gap-2">
                <p className={`text-4xl font-black text-${color}-900`}>{value}</p>
                {onClick && (
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-${color}-300`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                )}
            </div>
            {sub && <p className={`text-[10px] font-bold text-${color}-400 uppercase mt-2`}>{sub}</p>}
        </div>
    );

    const DetailListModal = ({ detail, onClose }: { detail: ListDetail, onClose: () => void }) => (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-gray-900/95 backdrop-blur-xl p-4 sm:p-8 animate-fade-in">
            <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-white/10">
                <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">{detail.title}</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{detail.items.length} records identified</p>
                    </div>
                    <button onClick={onClose} className="p-4 bg-white text-gray-400 hover:text-gray-900 rounded-2xl transition-all border border-gray-100 shadow-sm active:scale-90">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    {(detail.type === 'users' || detail.type === 'coaches') && (
                        <div className="space-y-4">
                            {detail.items.map((u: Participant | Coach) => (
                                <div key={u.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <img src={u.profileImageUrl} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                                        <div>
                                            <p className="font-bold text-gray-900">{u.name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{u.email} • {u.role}</p>
                                        </div>
                                    </div>
                                    <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline" onClick={() => {onClose(); navigate(`/profile/${u.id}`);}}>View Profile</button>
                                </div>
                            ))}
                        </div>
                    )}
                    {detail.type === 'sprints' && (
                        <div className="space-y-4">
                            {detail.items.map((s: Sprint) => (
                                <div key={s.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <img src={s.coverImageUrl} className="w-14 h-14 rounded-xl object-cover shadow-sm" />
                                        <div>
                                            <p className="font-bold text-gray-900">{s.title}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{s.category} • {s.duration} Days</p>
                                        </div>
                                    </div>
                                    <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline" onClick={() => {onClose(); setViewingSprintDrilldown(s);}}>Analytics</button>
                                </div>
                            ))}
                        </div>
                    )}
                    {detail.type === 'transactions' && (
                        <div className="text-center py-20 grayscale opacity-40">
                             <span className="text-4xl block mb-4">💳</span>
                             <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Transaction Ledger Syncing...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FAFAFA] p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-5">
                        <button onClick={() => navigate('/')} className="p-3.5 bg-white text-gray-400 hover:text-primary rounded-2xl shadow-sm border border-gray-100 transition-all hover:-translate-x-1 active:scale-90" title="Platform Entry">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight italic">Control.</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setRefreshKey(k => k + 1)} className="p-3 bg-white text-gray-400 hover:text-primary rounded-2xl shadow-sm border border-gray-100 hover:rotate-180 transition-all duration-700 active:scale-90" title="Refresh Registry">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                        <button 
                            onClick={handleLogout} 
                            disabled={isLoggingOut}
                            className="p-3 bg-white text-red-400 rounded-2xl shadow-sm border border-gray-100 hover:bg-red-50 hover:text-red-600 transition-all active:scale-90 group disabled:opacity-50" 
                            title="Terminate Admin Session"
                        >
                            {isLoggingOut ? (
                                <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden min-h-[75vh] flex flex-col">
                    <div className="border-b border-gray-100 bg-gray-50/20 px-10 overflow-x-auto">
                        <nav className="-mb-px flex space-x-12">
                            {[
                                { id: 'pulse', label: 'Pulse' },
                                { id: 'movement', label: 'Movement' },
                                { id: 'registry', label: 'Coach Registry' },
                                { id: 'revenue', label: 'Revenue' },
                                { id: 'sprints', label: 'Sprints' },
                                { id: 'quotes', label: 'Quotes' },
                                { id: 'roles', label: 'System' }
                            ].map(t => (
                                <button key={t.id} onClick={() => setActiveTab(t.id as Tab)} className={`whitespace-nowrap py-8 px-1 border-b-4 font-black text-[11px] uppercase tracking-[0.2em] transition-all ${activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>{t.label}</button>
                            ))}
                        </nav>
                    </div>
                    
                    <div className="p-10 flex-1">
                        {activeTab === 'pulse' && (
                            <div className="animate-fade-in space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <MetricBlock label="Active Users (24h)" value={platformPulse?.activeUsers24h || 0} color="blue" trend={{ label: '+12%', positive: true }} onClick={() => setActiveListDetail({ title: "Active Users", items: allParticipants, type: 'users' })} />
                                    <MetricBlock label="Live Programs" value={sprints.filter(s => s.published).length} color="primary" />
                                    <MetricBlock label="Stalled Users" value={allParticipants.filter(p => (p.walletBalance || 0) < 10).length} color="red" alert={true} />
                                    <MetricBlock label="Registry Health" value="Stable" color="green" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'sprints' && (
                            <div className="animate-fade-in space-y-12">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-widest">Sprint Catalog</h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">First-time approvals and pending updates</p>
                                    </div>
                                    <Link to="/admin/sprint/new">
                                        <Button className="px-8 py-4 bg-primary text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.03] transition-all active:scale-95">
                                            + Launch Platform Sprint
                                        </Button>
                                    </Link>
                                </div>

                                <div className="space-y-8">
                                    {/* 1. APPROVAL QUEUE (NEW SPRINTS) */}
                                    <div className="bg-orange-50/30 border border-orange-100 rounded-[2.5rem] p-8">
                                        <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                                            New Approval Requests
                                        </h4>
                                        <div className="overflow-x-auto bg-white rounded-3xl border border-orange-100 overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead className="bg-orange-50/50">
                                                    <tr>
                                                        <th className="px-8 py-4 text-[9px] font-black text-orange-800 uppercase tracking-widest">Sprint Info</th>
                                                        <th className="px-8 py-4 text-[9px] font-black text-orange-800 uppercase tracking-widest text-right">Oversight</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-orange-50">
                                                    {sprints.filter(s => s.approvalStatus === 'pending_approval' && !s.published).map(s => (
                                                        <tr key={s.id} className="hover:bg-orange-50/10 transition-colors">
                                                            <td className="px-8 py-6 flex items-center gap-4">
                                                                <img src={s.coverImageUrl} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                                                                <div>
                                                                    <p className="font-bold text-gray-900 text-sm">{s.title}</p>
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{userMap.get(s.coachId)?.name || 'Platform'}</p>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => sprintService.approveSprint(s.id).then(() => setRefreshKey(k => k + 1))} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all">Approve Launch</button>
                                                                    <button onClick={() => sprintService.rejectSprint(s.id).then(() => setRefreshKey(k => k + 1))} className="px-4 py-2 bg-white text-orange-500 border border-orange-200 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">Reject</button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {sprints.filter(s => s.approvalStatus === 'pending_approval' && !s.published).length === 0 && (
                                                        <tr><td colSpan={2} className="px-8 py-10 text-center text-gray-300 font-bold text-[10px] uppercase tracking-widest italic">First-time queue clear</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* 2. STAGED UPDATES (LIVE EDITS) */}
                                    <div className="bg-blue-50/30 border border-blue-100 rounded-[2.5rem] p-8">
                                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                                            Pending Live Updates
                                        </h4>
                                        <div className="overflow-x-auto bg-white rounded-3xl border border-blue-100 overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead className="bg-blue-50/50">
                                                    <tr>
                                                        <th className="px-8 py-4 text-[9px] font-black text-blue-800 uppercase tracking-widest">Sprint Info</th>
                                                        <th className="px-8 py-4 text-[9px] font-black text-blue-800 uppercase tracking-widest text-right">Oversight</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-blue-50">
                                                    {sprints.filter(s => !!s.pendingChanges).map(s => (
                                                        <tr key={s.id} className="hover:bg-blue-50/10 transition-colors">
                                                            <td className="px-8 py-6 flex items-center gap-4">
                                                                <img src={s.coverImageUrl} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="font-bold text-gray-900 text-sm">{s.title}</p>
                                                                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[7px] font-black uppercase">LIVE</span>
                                                                    </div>
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{userMap.get(s.coachId)?.name || 'Platform'}</p>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => handleApproveUpdates(s.id)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Merge Updates</button>
                                                                    <button onClick={() => navigate(`/coach/sprint/edit/${s.id}`)} className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">Review Diff</button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {sprints.filter(s => !!s.pendingChanges).length === 0 && (
                                                        <tr><td colSpan={2} className="px-8 py-10 text-center text-gray-300 font-bold text-[10px] uppercase tracking-widest italic">No pending edits detected</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'quotes' && (
                            <div className="animate-fade-in space-y-12">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-widest">Daily Inspiration</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Manage the cycle of wisdom delivered to participants</p>
                                </div>

                                <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-6">Register New Quote</h4>
                                    <form onSubmit={handleAddQuote} className="flex flex-col gap-4">
                                        <textarea 
                                            value={newQuoteText} 
                                            onChange={(e) => setNewQuoteText(e.target.value)}
                                            placeholder="The wisdom text..."
                                            className="w-full p-6 bg-gray-50 border border-gray-100 rounded-3xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold text-gray-700 italic"
                                            rows={3}
                                        />
                                        <div className="flex gap-4">
                                            <input 
                                                type="text" 
                                                value={newQuoteAuthor} 
                                                onChange={(e) => setNewQuoteAuthor(e.target.value)}
                                                placeholder="Author (optional)"
                                                className="flex-1 px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold"
                                            />
                                            <Button type="submit" isLoading={isProcessingAction} disabled={!newQuoteText.trim()} className="px-10 rounded-2xl font-black uppercase tracking-widest text-[10px]">Inject Quote</Button>
                                        </div>
                                    </form>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {quotes.map(q => (
                                        <div key={q.id} className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                                            <div>
                                                <p className="text-lg text-gray-700 font-medium italic leading-relaxed mb-6">"{q.text}"</p>
                                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">— {q.author}</p>
                                            </div>
                                            <div className="mt-8 pt-6 border-t border-gray-50 flex justify-end">
                                                <button onClick={() => handleDeleteQuote(q.id)} className="text-[9px] font-black text-red-300 hover:text-red-500 uppercase tracking-widest transition-colors">Retire Quote</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'roles' && (
                            <div className="animate-fade-in bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm text-center">
                                <span className="text-4xl mb-6 block grayscale opacity-30">🛡️</span>
                                <h3 className="text-2xl font-black text-gray-900 mb-2">Role Management</h3>
                                <p className="text-gray-500 font-medium mb-10 max-w-sm mx-auto">Configure internal permissions for platform administration and certified coaching accounts.</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {MOCK_ROLES.map(role => (
                                        <div key={role.id} className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 text-left">
                                            <h4 className="font-black text-gray-900 text-sm uppercase mb-1">{role.name}</h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6">{role.baseRole}</p>
                                            <p className="text-xs text-gray-500 leading-relaxed font-medium mb-8">"{role.description}"</p>
                                            <div className="flex flex-wrap gap-2">
                                                {role.permissions.slice(0, 3).map(p => (
                                                    <span key={p} className="text-[8px] font-black bg-white border border-gray-200 px-2 py-0.5 rounded uppercase">{p.split(':')[1]}</span>
                                                ))}
                                                {role.permissions.length > 3 && <span className="text-[8px] font-black text-primary">+{role.permissions.length - 3} More</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Drilldown Modal Rendering */}
            {viewingSprintDrilldown && (
                <SprintIntelligenceDashboard 
                    sprint={viewingSprintDrilldown} 
                    onClose={() => setViewingSprintDrilldown(null)} 
                />
            )}

            {/* List Detail Modal Rendering */}
            {activeListDetail && (
                <DetailListModal 
                    detail={activeListDetail} 
                    onClose={() => setActiveListDetail(null)} 
                />
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.99); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
}

// Sprint Intelligence Dashboard Sub-component
const SprintIntelligenceDashboard = ({ sprint, onClose }: { sprint: Sprint, onClose: () => void }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/95 backdrop-blur-2xl p-4 sm:p-10 animate-fade-in">
            <div className="bg-gray-50 rounded-[3.5rem] w-full max-w-7xl h-full flex flex-col overflow-hidden shadow-2xl border border-white/10">
                <div className="bg-white px-10 py-8 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-6">
                        <img src={sprint.coverImageUrl} className="w-20 h-20 rounded-[2rem] object-cover shadow-xl" />
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight">{sprint.title}</h2>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{sprint.category}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="px-8 py-5 bg-gray-100 text-gray-500 hover:text-gray-900 rounded-[1.5rem] transition-all font-black uppercase tracking-widest text-[10px]">Exit Intelligence</button>
                </div>
                <div className="flex-1 overflow-y-auto p-12 text-center text-gray-400 font-bold uppercase tracking-widest">
                    Analytics Engine Loading...
                </div>
            </div>
        </div>
    );
};
