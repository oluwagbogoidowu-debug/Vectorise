import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalyticsEvent, FunnelStats, IdentityReport } from '../../types';
import { analyticsTracker } from '../../services/analyticsTracker';
import { Settings, Shield, ShieldOff, AlertTriangle } from 'lucide-react';

const AdminAnalytics: React.FC = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState<AnalyticsEvent[]>([]);
    const [funnel, setFunnel] = useState<FunnelStats | null>(null);
    const [trafficMap, setTrafficMap] = useState<Record<string, number>>({});
    const [identities, setIdentities] = useState<IdentityReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyticsDisabled, setIsAnalyticsDisabled] = useState(false);
    const [isToggling, setIsToggling] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    
    // Filters
    const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
    const [typeFilter, setTypeFilter] = useState<'all' | 'user' | 'guest'>('all');

    useEffect(() => {
        const unsubscribeEvents = analyticsTracker.subscribeToEvents((data) => {
            setEvents(data);
        });

        analyticsTracker.onDisabledStateChange((disabled) => {
            setIsAnalyticsDisabled(disabled);
        });

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Bulk fetch overview data
                const [funnelData, breakdown, identityData] = await Promise.all([
                    analyticsTracker.getFunnelMetrics(),
                    analyticsTracker.getTrafficBreakdown(),
                    analyticsTracker.getIdentityLedger()
                ]);
                setFunnel(funnelData);
                setTrafficMap(breakdown);
                setIdentities(identityData);
            } catch (err) {
                console.error("Analytics fetch failed", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        return () => unsubscribeEvents();
    }, []);

    const handleToggleAnalytics = async () => {
        setIsToggling(true);
        try {
            await analyticsTracker.toggleAnalytics(!isAnalyticsDisabled);
        } catch (err) {
            alert("Failed to toggle analytics state.");
        } finally {
            setIsToggling(false);
        }
    };

    const funnelStages = useMemo(() => {
        if (!funnel) return [];
        return [
            { label: 'Visitors', value: funnel.visitors, color: 'bg-blue-500' },
            { label: 'Views', value: funnel.sprintViews, color: 'bg-indigo-500' },
            { label: 'Intent', value: funnel.paymentIntents, color: 'bg-purple-500' },
            { label: 'Success', value: funnel.successPayments, color: 'bg-primary' },
            { label: 'Mastered', value: funnel.completions, color: 'bg-green-600' }
        ];
    }, [funnel]);

    const handleSelectIdentity = (id: IdentityReport) => {
        navigate(`/admin/analytics/user/${encodeURIComponent(id.identifier)}`);
    };

    const filteredIdentities = useMemo(() => {
        return identities.filter(id => {
            // Date filter: Check if last active or first touch matches the selected date
            const lastActiveDate = new Date(id.lastActiveAt).toISOString().split('T')[0];
            const firstTouchDate = new Date(id.firstTouch.created_at).toISOString().split('T')[0];
            const matchesDate = lastActiveDate === dateFilter || firstTouchDate === dateFilter;

            // Type filter
            const matchesType = typeFilter === 'all' 
                || (typeFilter === 'user' && !!id.user_id)
                || (typeFilter === 'guest' && !id.user_id);

            return matchesDate && matchesType;
        });
    }, [identities, dateFilter, typeFilter]);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Compiling Global Identity Ledger...</p>
        </div>
    );

    return (
        <div className="space-y-12 animate-fade-in pb-20 font-sans">
            
            {/* CONVERSION FUNNEL - MACRO VIEW */}
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10 relative">
                <div className="flex justify-between items-center mb-12">
                    <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em]">Registry Conversion Funnel</h4>
                    <div className="relative">
                        <button 
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-3 rounded-2xl transition-all ${showSettings ? 'bg-primary text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                        >
                            <Settings className={`w-4 h-4 ${isToggling ? 'animate-spin' : ''}`} />
                        </button>

                        {showSettings && (
                            <div className="absolute right-0 mt-4 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-2 rounded-xl ${isAnalyticsDisabled ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                        {isAnalyticsDisabled ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Global Analytics</p>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase">{isAnalyticsDisabled ? 'Currently Disabled' : 'Currently Active'}</p>
                                    </div>
                                </div>

                                <p className="text-[9px] text-gray-500 leading-relaxed mb-6 font-medium">
                                    Disabling analytics will prevent all event tracking, traffic logging, and data fetching across the entire platform.
                                </p>

                                <button 
                                    onClick={handleToggleAnalytics}
                                    disabled={isToggling}
                                    className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                        isAnalyticsDisabled 
                                        ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200' 
                                        : 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200'
                                    }`}
                                >
                                    {isToggling ? (
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        isAnalyticsDisabled ? 'Enable Analytics' : 'Disable Analytics'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {isAnalyticsDisabled && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 rounded-[2.5rem] flex items-center justify-center">
                        <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 flex flex-col items-center text-center max-w-xs">
                            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <h5 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Analytics Offline</h5>
                            <p className="text-[9px] text-gray-500 font-medium leading-relaxed">
                                The global analytics engine is currently disabled. No data is being recorded or retrieved.
                            </p>
                            <button 
                                onClick={handleToggleAnalytics}
                                className="mt-6 text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                            >
                                Re-enable Engine
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row items-end gap-2 md:gap-4 h-64">
                    {funnelStages.map((stage, i) => {
                        const max = Math.max(...funnelStages.map(s => s.value), 1);
                        const height = (stage.value / max) * 100;
                        const dropoff = i > 0 && funnelStages[i-1].value > 0 
                            ? ((1 - stage.value / funnelStages[i-1].value) * 100).toFixed(1)
                            : null;

                        return (
                            <div key={stage.label} className="flex-1 flex flex-col items-center gap-3 group relative h-full justify-end">
                                {dropoff && parseFloat(dropoff) > 0 && (
                                    <div className="absolute bottom-[110%] text-[8px] font-black text-red-400 bg-red-50 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        -{dropoff}% drop
                                    </div>
                                )}
                                <div 
                                    className={`w-full rounded-t-2xl transition-all duration-1000 ${stage.color} opacity-80 hover:opacity-100 shadow-lg`} 
                                    style={{ height: `${height}%` }}
                                ></div>
                                <div className="text-center">
                                    <p className="text-lg font-black text-gray-900">{stage.value}</p>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{stage.label}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* IDENTITY LEDGER - ONE ENTRY PER IDENTIFIER */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/20">
                        <div>
                            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em]">Identity Registry</h4>
                            <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">Unique entities tracked across multiple sessions</p>
                        </div>
                        
                        <div className="flex items-center gap-3 self-end">
                            <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                                <button 
                                    onClick={() => setTypeFilter('all')}
                                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${typeFilter === 'all' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    All
                                </button>
                                <button 
                                    onClick={() => setTypeFilter('user')}
                                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${typeFilter === 'user' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Users
                                </button>
                                <button 
                                    onClick={() => setTypeFilter('guest')}
                                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${typeFilter === 'guest' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Guests
                                </button>
                            </div>
                            <input 
                                type="date" 
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="px-3 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-gray-600 uppercase tracking-widest shadow-sm outline-none focus:ring-2 focus:ring-primary/10"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-gray-50">
                                    <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Identifier</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">First Acquisition</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Touchpoints</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Last Signal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredIdentities.length > 0 ? filteredIdentities.map(id => (
                                    <tr 
                                        key={id.identifier} 
                                        onClick={() => handleSelectIdentity(id)}
                                        className="hover:bg-primary/[0.02] cursor-pointer transition-colors group"
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-sm border ${id.hasPaid ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                                                    {id.hasPaid ? '👑' : '👤'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-gray-900 truncate max-w-[200px]">
                                                        {id.email || (id.anonymous_id ? id.anonymous_id.substring(0, 13) : 'unknown')}
                                                    </p>
                                                    {id.user_id && <p className="text-[7px] font-black text-primary uppercase tracking-widest">Identified Member</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="px-2 py-1 bg-gray-100 rounded-md text-[8px] font-black text-gray-500 uppercase">
                                                {id.firstTouch.source} / {id.firstTouch.device_type}
                                            </span>
                                            <p className="text-[7px] text-gray-400 mt-1 font-bold uppercase">{new Date(id.firstTouch.created_at).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-[10px] font-black text-gray-900 border border-gray-100">{id.totalSessions}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <p className="text-[9px] font-black text-gray-700 uppercase">{new Date(id.lastActiveAt).toLocaleDateString()}</p>
                                            <p className="text-[7px] font-bold text-gray-400 uppercase">{new Date(id.lastActiveAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center">
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No identities match the selected filters.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    {/* TRAFFIC CORE SUMMARY */}
                    <section className="bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
                        <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-10 relative z-10">Acquisition Channels</h4>
                        <div className="space-y-6 relative z-10">
                            {Object.entries(trafficMap).map(([src, count]) => (
                                <div key={src} className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold italic">
                                        <span className="text-white/60 capitalize">{src}</span>
                                        <span>{count as number}</span>
                                    </div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary rounded-full" 
                                            style={{ width: `${((count as number) / Math.max(funnel?.visitors || 1, 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
                    </section>

                    {/* RECENT ACTIONS STREAM */}
                    <section className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                        <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em] mb-6">Real-Time Behavioral Pulse</h4>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {events.slice(0, 10).map((e) => (
                                <div key={e.id} className="flex gap-4 items-start border-b border-gray-50 pb-4 last:border-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0 animate-pulse"></div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-gray-800 uppercase tracking-tight truncate">{e.event_name.replace(/_/g, ' ')}</p>
                                        <p className="text-[8px] font-bold text-gray-400">
                                            {e.email || 'Anonymous'} • {new Date(e.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </section>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default AdminAnalytics;