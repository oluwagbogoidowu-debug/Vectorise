import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_USERS, MOCK_ROLES } from '../../services/mockData';
import { UserRole, Coach, Sprint, RoleDefinition, Permission, Participant, PlatformPulse, Quote, PartnerApplication } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { analyticsService } from '../../services/analyticsService';
import { quoteService } from '../../services/quoteService';
import { partnerService } from '../../services/partnerService';
import Button from '../../components/Button';
import LifecycleOrchestrator from './LifecycleOrchestrator';

type Tab = 'pulse' | 'orchestrator' | 'registry' | 'revenue' | 'sprints' | 'quotes' | 'roles' | 'partners';
type SprintFilter = 'all' | 'active' | 'core' | 'pending' | 'rejected';

const PartnerReviewModal: React.FC<{
    app: PartnerApplication;
    onClose: () => void;
    onStatusChange: (id: string, status: 'approved' | 'rejected') => void;
}> = ({ app, onClose, onStatusChange }) => {
    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-dark/95 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Partner Audit</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{app.fullName} • {app.primaryPlatform}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                    <section className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Email</p>
                            <p className="text-sm font-bold text-gray-900">{app.email}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Country</p>
                            <p className="text-sm font-bold text-gray-900">{app.country}</p>
                        </div>
                    </section>
                    <section>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Platform Context</p>
                        <a href={app.platformLink} target="_blank" rel="noreferrer" className="text-lg font-black text-primary underline underline-offset-4 decoration-primary/20 hover:text-primary-hover">{app.platformLink}</a>
                    </section>
                    <section className="space-y-6">
                        <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">Primary Influence</p>
                            <p className="text-sm font-bold text-gray-900 leading-relaxed italic">"{app.influenceTarget}"</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">What people come for</p>
                            <p className="text-sm font-medium text-gray-600 leading-relaxed italic bg-gray-50 p-6 rounded-2xl">"{app.commonRequests}"</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">Reason for partnering</p>
                            <p className="text-sm font-medium text-gray-600 leading-relaxed italic bg-gray-50 p-6 rounded-2xl">"{app.whyPartner}"</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                             <p className="text-[8px] font-black text-gray-400 uppercase mb-2">Introduction Strategy</p>
                             <div className="flex flex-wrap gap-2">
                                {app.introductionStrategy?.map(s => <span key={s} className="px-2 py-1 bg-white border border-gray-200 rounded text-[9px] font-bold text-gray-600">{s}</span>)}
                             </div>
                        </div>
                    </section>
                </div>
                <div className="p-8 border-t border-gray-50 flex gap-4 bg-gray-50/50">
                    <button onClick={() => onStatusChange(app.id, 'approved')} className="flex-1 py-4 bg-green-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl active:scale-95 transition-all">Approve & Send Access</button>
                    <button onClick={() => onStatusChange(app.id, 'rejected')} className="flex-1 py-4 bg-white text-red-500 border border-red-100 font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-red-50 transition-all">Reject Application</button>
                </div>
            </div>
        </div>
    );
};

const DeleteConfirmationModal: React.FC<{
    sprint: Sprint;
    onClose: () => void;
    onConfirm: (sprintId: string) => void;
    isDeleting: boolean;
}> = ({ sprint, onClose, onConfirm, isDeleting }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in text-center">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden animate-slide-up flex flex-col p-8">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" />
                    </svg>
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Admin Delete</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8 italic">
                    "Permanently hide this sprint from the registry. Existing enrollments will persist."
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-gray-50 text-gray-500 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-gray-100 transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => onConfirm(sprint.id)}
                        disabled={isDeleting}
                        className="flex-1 py-3.5 bg-red-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-red-100 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isDeleting ? 'Deleting...' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('pulse');
    const [sprintFilter, setSprintFilter] = useState<SprintFilter>('all');
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [partnerApps, setPartnerApps] = useState<PartnerApplication[]>([]);
    const [isLoadingSprints, setIsLoadingSprints] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); 
    const [platformPulse, setPlatformPulse] = useState<PlatformPulse | null>(null);

    const [sprintToDelete, setSprintToDelete] = useState<Sprint | null>(null);
    const [viewingPartner, setViewingPartner] = useState<PartnerApplication | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchPulse = async () => {
        const pulse = await analyticsService.getPlatformPulse();
        setPlatformPulse(pulse);
    };

    const fetchSprints = async () => {
        setIsLoadingSprints(true);
        try {
            const fetchedSprints = await sprintService.getAdminSprints();
            setSprints(fetchedSprints);
        } catch (err) { console.error(err); } finally { setIsLoadingSprints(false); }
    };

    const fetchQuotes = async () => {
        const fetched = await quoteService.getQuotes();
        setQuotes(fetched);
    };

    const fetchPartners = async () => {
        const fetched = await partnerService.getApplications();
        setPartnerApps(fetched);
    };

    useEffect(() => {
        fetchPulse();
    }, [refreshKey]);

    useEffect(() => {
        fetchSprints();
    }, [refreshKey]);

    useEffect(() => {
        fetchQuotes();
    }, [refreshKey]);

    useEffect(() => {
        fetchPartners();
    }, [refreshKey]);

    const filteredSprints = useMemo(() => {
        switch (sprintFilter) {
            case 'active': return sprints.filter(s => s.approvalStatus === 'approved');
            case 'core': return sprints.filter(s => s.category === 'Core Platform Sprint' || s.category === 'Growth Fundamentals');
            case 'pending': return sprints.filter(s => s.approvalStatus === 'pending_approval');
            case 'rejected': return sprints.filter(s => s.approvalStatus === 'rejected');
            default: return sprints;
        }
    }, [sprints, sprintFilter]);

    const handleLogout = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await logout();
        } catch (err) {
            console.error("Logout failed:", err);
            setIsLoggingOut(false);
        }
    };

    const handleRefresh = (e: React.MouseEvent) => {
        e.preventDefault();
        setRefreshKey(k => k + 1);
    };

    const handleDelete = async (id: string) => {
        setIsDeleting(true);
        try {
            await sprintService.deleteSprint(id);
            setSprintToDelete(null);
            fetchSprints();
        } catch (err) {
            alert("Delete failed.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handlePartnerStatus = async (id: string, status: 'approved' | 'rejected') => {
        try {
            await partnerService.updateApplicationStatus(id, status);
            if (status === 'approved') {
                const app = partnerApps.find(a => a.id === id);
                const generatedPass = Math.random().toString(36).substring(2, 10).toUpperCase();
                alert(`SUCCESS: Access Message Sent to ${app?.email}.
                
Email content summary:
- Account Email: ${app?.email}
- Initial Password: ${generatedPass}
- Action: Link to change password provided.`);
            }
            setViewingPartner(null);
            fetchPartners();
        } catch (err) {
            alert("Update failed.");
        }
    };

    const MetricBlock = ({ label, value, color = "gray", trend }: { label: string, value: string | number, color?: string, trend?: { label: string, positive: boolean } }) => (
        <div className={`bg-${color}-50 p-8 rounded-[2rem] border border-${color}-100 transition-all`}>
            <div className="flex justify-between items-start mb-2">
                <p className={`text-[10px] font-black text-${color}-400 uppercase tracking-widest`}>{label}</p>
                {trend && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${trend.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {trend.label}
                    </span>
                )}
            </div>
            <p className={`text-4xl font-black text-${color}-900`}>{value}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FAFAFA] p-6">
            {sprintToDelete && (
                <DeleteConfirmationModal 
                    sprint={sprintToDelete} 
                    onClose={() => setSprintToDelete(null)} 
                    onConfirm={handleDelete}
                    isDeleting={isDeleting}
                />
            )}
            {viewingPartner && (
                <PartnerReviewModal 
                    app={viewingPartner} 
                    onClose={() => setViewingPartner(null)} 
                    onStatusChange={handlePartnerStatus}
                />
            )}
            
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-5">
                        <button 
                            type="button"
                            onClick={() => navigate('/')} 
                            className="p-3.5 bg-white text-gray-400 hover:text-primary rounded-2xl shadow-sm border border-gray-100 transition-all active:scale-90 cursor-pointer" 
                            title="Platform Entry"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight italic">Control.</h1>
                            {activeTab === 'orchestrator' && <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-1">Lifecycle Orchestrator</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            type="button"
                            onClick={handleRefresh} 
                            className="p-3 bg-white text-gray-400 hover:text-primary rounded-2xl shadow-sm border border-gray-100 transition-all active:scale-90 cursor-pointer group" 
                            title="Refresh Dashboard"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-active:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                        <button 
                            type="button"
                            onClick={handleLogout} 
                            className="p-3 bg-white text-red-400 rounded-2xl shadow-sm border border-gray-100 hover:bg-red-50 hover:text-red-600 transition-all active:scale-90 cursor-pointer disabled:opacity-50" 
                            title="Terminate Admin Session"
                            disabled={isLoggingOut}
                        >
                            {isLoggingOut ? (
                                <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden min-h-[75vh] flex flex-col">
                    <div className="border-b border-gray-100 bg-gray-50/20 px-10 overflow-x-auto">
                        <nav className="-mb-px flex space-x-12">
                            {[
                                { id: 'pulse', label: 'Pulse' },
                                { id: 'orchestrator', label: 'Orchestrator' },
                                { id: 'sprints', label: 'Sprints' },
                                { id: 'partners', label: 'Partners' },
                                { id: 'quotes', label: 'Quotes' },
                                { id: 'roles', label: 'System' }
                            ].map(t => (
                                <button 
                                    key={t.id} 
                                    type="button"
                                    onClick={() => setActiveTab(t.id as Tab)} 
                                    className={`whitespace-nowrap py-8 px-1 border-b-4 font-black text-[11px] uppercase tracking-[0.2em] transition-all cursor-pointer ${activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                    
                    <div className="p-10 flex-1">
                        {activeTab === 'pulse' && (
                            <div className="animate-fade-in space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <MetricBlock label="Active Users (24h)" value={platformPulse?.activeUsers24h || 0} color="blue" trend={{ label: '+12%', positive: true }} />
                                    <MetricBlock label="Live Programs" value={sprints.filter(s => s.published).length} color="primary" />
                                    <MetricBlock label="At Risk" value={platformPulse?.atRiskCount || 0} color="red" />
                                    <MetricBlock label="Partner Apps" value={partnerApps.filter(a => a.status === 'pending').length} color="orange" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'orchestrator' && <LifecycleOrchestrator allSprints={sprints} refreshKey={refreshKey} />}

                        {activeTab === 'sprints' && (
                            <div className="animate-fade-in space-y-8">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight italic">Registry Catalog</h3>
                                        <p className="text-gray-500 font-medium text-xs">Managing global sprint programs.</p>
                                    </div>
                                    <Link to="/admin/sprint/new">
                                        <Button className="px-8 py-3.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                                            + Launch Platform Sprint
                                        </Button>
                                    </Link>
                                </div>

                                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar border-b border-gray-50">
                                    {[
                                        { id: 'all', label: 'All' },
                                        { id: 'active', label: 'Active' },
                                        { id: 'core', label: 'Platform Core' },
                                        { id: 'pending', label: 'Pending Approval' },
                                        { id: 'rejected', label: 'Amend Required' }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setSprintFilter(f.id as SprintFilter)}
                                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap border ${
                                                sprintFilter === f.id 
                                                ? 'bg-primary text-white border-primary shadow-md' 
                                                : 'bg-white text-gray-400 border-gray-100 hover:border-primary/20 hover:text-primary'
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {isLoadingSprints ? (
                                        <div className="text-center py-20">
                                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Syncing Registry...</p>
                                        </div>
                                    ) : filteredSprints.length > 0 ? (
                                        filteredSprints.map(sprint => {
                                            const isFoundational = sprint.category === 'Core Platform Sprint' || sprint.category === 'Growth Fundamentals';
                                            const priceVal = isFoundational ? (sprint.pointCost || 0) : (sprint.price || 0);
                                            const hasPricingError = priceVal <= 0;

                                            return (
                                                <div key={sprint.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 group hover:shadow-md transition-all">
                                                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-inner">
                                                        <img src={sprint.coverImageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                                                    </div>
                                                    <div className="flex-1 min-w-0 text-center sm:text-left">
                                                        <h3 className="font-black text-gray-900 text-lg group-hover:text-primary transition-colors truncate tracking-tight">{sprint.title}</h3>
                                                        <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 text-[9px] font-black text-gray-400 mt-2 uppercase tracking-widest">
                                                            <span className="px-2 py-1 bg-gray-50 rounded-lg">{sprint.duration} Days</span>
                                                            <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                                                            <span className="px-2 py-1 bg-gray-50 rounded-lg">{sprint.category}</span>
                                                            <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                                                            <span className={`px-2 py-1 rounded-lg ${
                                                                sprint.approvalStatus === 'approved' ? 'bg-green-50 text-green-600 border border-green-100' : 
                                                                sprint.approvalStatus === 'rejected' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                                                'bg-blue-50 text-blue-500 border border-blue-100'
                                                            }`}>
                                                                {sprint.approvalStatus === 'rejected' ? 'Amend Required' : sprint.approvalStatus.replace('_', ' ')}
                                                            </span>
                                                            {hasPricingError && (
                                                                <span className="px-2 py-1 bg-red-50 text-red-600 border border-red-100 rounded-lg animate-pulse font-black text-[8px]">
                                                                    MISSING PRICE
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                                        <Link to={`/coach/sprint/edit/${sprint.id}`} className="flex-1 sm:flex-none">
                                                            <button className={`w-full sm:w-auto px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                                                                hasPricingError || sprint.approvalStatus === 'pending_approval'
                                                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-100 hover:bg-orange-600' 
                                                                : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-primary'
                                                            }`}>
                                                                {hasPricingError ? 'Set Price' : sprint.approvalStatus === 'pending_approval' ? 'Audit Sprint' : 'Edit Sprint'}
                                                            </button>
                                                        </Link>
                                                        <button 
                                                            onClick={() => setSprintToDelete(sprint)}
                                                            className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                                                            title="Delete Sprint"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-20 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm grayscale opacity-30">🏝️</div>
                                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No programs found in this view.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'partners' && (
                            <div className="animate-fade-in space-y-8">
                                <div className="mb-8">
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight italic">Partner Applications</h3>
                                    <p className="text-gray-500 font-medium text-xs uppercase tracking-widest">Vetting the growth catalysts.</p>
                                </div>

                                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Partner</th>
                                                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Platform</th>
                                                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Identity</th>
                                                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                                <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {partnerApps.map(app => (
                                                <tr key={app.id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-8 py-5">
                                                        <p className="font-bold text-gray-900 text-sm">{app.fullName}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{app.email}</p>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <p className="text-xs font-black text-primary uppercase tracking-tight">{app.primaryPlatform}</p>
                                                        <a href={app.platformLink} target="_blank" rel="noreferrer" className="text-[10px] text-gray-400 hover:underline">Link &rarr;</a>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded text-[9px] font-black uppercase tracking-widest">{app.identityType}</span>
                                                    </td>
                                                    <td className="px-8 py-5 text-center">
                                                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${
                                                            app.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                                            app.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                                                            'bg-orange-100 text-orange-700 animate-pulse'
                                                        }`}>
                                                            {app.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <button 
                                                            onClick={() => setViewingPartner(app)}
                                                            className="px-6 py-2 bg-white border border-gray-100 text-gray-400 hover:text-primary hover:border-primary/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            Audit & Review
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {partnerApps.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="py-20 text-center">
                                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No applications found in registry.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'quotes' && (
                             <div className="animate-fade-in">
                                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-widest mb-10">Daily Inspiration</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {quotes.map(q => (
                                        <div key={q.id} className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm group">
                                            <p className="text-lg text-gray-700 font-medium italic leading-relaxed mb-6">"{q.text}"</p>
                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">— {q.author}</p>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.99); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
            `}</style>
        </div>
    );
}