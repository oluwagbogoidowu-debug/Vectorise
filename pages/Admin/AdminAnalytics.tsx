import React, { useState, useEffect, useMemo } from 'react';
import { AnalyticsEvent, FunnelStats, IdentityReport, UserSessionReport } from '../../types';
import { analyticsTracker } from '../../services/analyticsTracker';

const AdminAnalytics: React.FC = () => {
    const [events, setEvents] = useState<AnalyticsEvent[]>([]);
    const [funnel, setFunnel] = useState<FunnelStats | null>(null);
    const [trafficMap, setTrafficMap] = useState<Record<string, number>>({});
    const [identities, setIdentities] = useState<IdentityReport[]>([]);
    const [selectedIdentity, setSelectedIdentity] = useState<IdentityReport | null>(null);
    const [activeSession, setActiveSession] = useState<UserSessionReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = analyticsTracker.subscribeToEvents((data) => {
            setEvents(data);
        });

        const fetchData = async () => {
            setIsLoading(true);
            try {
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
        return () => unsubscribe();
    }, []);

    const funnelStages = useMemo(() => {
        if (!funnel) return [];
        return [
            { label: 'Visitors', value: funnel.visitors, color: 'bg-blue-500' },
            { label: 'Sprint Views', value: funnel.sprintViews, color: 'bg-indigo-500' },
            { label: 'Intent (Pay)', value: funnel.paymentIntents, color: 'bg-purple-500' },
            { label: 'Success', value: funnel.successPayments, color: 'bg-primary' },
            { label: 'Mastered', value: funnel.completions, color: 'bg-green-600' }
        ];
    }, [funnel]);

    const handleSelectIdentity = (id: IdentityReport) => {
        setSelectedIdentity(id);
        // Default to the most recent session
        setActiveSession(id.sessions[0] || null);
    };

    if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-12 animate-fade-in pb-20 font-sans">
            
            {/* CONVERSION FUNNEL - MACRO VIEW */}
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10">
                <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em] mb-12">Registry Conversion Funnel</h4>
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
                    <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                        <div>
                            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em]">Identity Registry</h4>
                            <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">Unique entities tracked across multiple sessions</p>
                        </div>
                        <span className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                             <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Global Persistence</p>
                        </span>
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
                                {identities.map(id => (
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
                                ))}
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

            {/* IDENTITY DRILL-DOWN MODAL - DEEP ANALYTICS BY DATE/TIME */}
            {selectedIdentity && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-dark/90 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[3.5rem] w-full max-w-6xl shadow-2xl relative overflow-hidden flex flex-col h-[90vh] animate-slide-up">
                        <header className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-white rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-center text-3xl">
                                    {selectedIdentity.hasPaid ? '👑' : '👤'}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight italic">
                                        {selectedIdentity.email || selectedIdentity.anonymous_id}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">
                                            Growth Registry Drill-Down
                                        </span>
                                        <div className="w-1 h-1 rounded-full bg-gray-200"></div>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                            Persistent ID: {selectedIdentity.anonymous_id}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedIdentity(null)} className="p-3 text-gray-400 hover:text-gray-900 transition-all bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-90">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </header>
                        
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            {/* Left Panel: Date & Time Session Ledger */}
                            <aside className="w-full md:w-80 border-r border-gray-100 overflow-y-auto custom-scrollbar bg-gray-50/30 p-8 flex flex-col">
                                <section className="mb-10">
                                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6 px-1">Program Status</h5>
                                    <div className="space-y-3">
                                        {selectedIdentity.enrollments.length > 0 ? selectedIdentity.enrollments.map(enrol => (
                                            <div key={enrol.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                                                <p className="text-[8px] font-black text-primary uppercase mb-1">Live Cycle</p>
                                                <h6 className="text-xs font-bold text-gray-900 mb-2 truncate">Sprint Execution</h6>
                                                <div className="h-1 bg-gray-50 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary" style={{ width: `${(enrol.progress.filter(p => p.completed).length / enrol.progress.length) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-[9px] text-gray-300 font-bold uppercase italic px-1">No identified cycles.</p>
                                        )}
                                    </div>
                                </section>

                                <section className="flex-1">
                                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6 px-1">Session Ledger (Dates/Times)</h5>
                                    <div className="space-y-3">
                                        {selectedIdentity.sessions.map((sess, idx) => {
                                            const isActive = activeSession?.session_id === sess.session_id;
                                            return (
                                                <button 
                                                    key={sess.session_id}
                                                    onClick={() => setActiveSession(sess)}
                                                    className={`w-full text-left p-5 rounded-3xl transition-all border group relative ${isActive ? 'bg-primary text-white border-primary shadow-lg scale-[1.03] z-10' : 'bg-white border-gray-100 text-gray-600 hover:border-primary/20'}`}
                                                >
                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-white/60' : 'text-gray-300'}`}>Session {selectedIdentity.sessions.length - idx}</p>
                                                        <p className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-white/60' : 'text-primary/60'}`}>{sess.events.length} Actions</p>
                                                    </div>
                                                    <p className="text-sm font-black truncate leading-none mb-1.5">
                                                        {new Date(sess.traffic.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                    <div className="flex items-center justify-between">
                                                        <p className={`text-[9px] font-bold uppercase tracking-tight ${isActive ? 'text-white/50' : 'text-gray-400'}`}>
                                                            {new Date(sess.traffic.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        <span className={`text-[8px] font-black uppercase ${isActive ? 'text-white/30' : 'text-gray-300'}`}>{sess.totalDwellTime}s</span>
                                                    </div>
                                                    {sess.hasPaid && (
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] shadow-sm">👑</div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            </aside>

                            {/* Right Panel: Detailed Behavioral Analytics for Selected Time */}
                            <main className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-white">
                                {activeSession ? (
                                    <div className="space-y-12 animate-fade-in">
                                        {/* Session Overview Stats */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 shadow-sm">
                                                <p className="text-[8px] font-black text-gray-400 uppercase mb-2">Acquisition Vector</p>
                                                <p className="text-lg font-black text-gray-900 tracking-tight capitalize">{activeSession.traffic.source}</p>
                                                <p className="text-[9px] font-bold text-primary uppercase mt-1">{activeSession.traffic.medium} • {activeSession.traffic.device_type}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 shadow-sm">
                                                <p className="text-[8px] font-black text-gray-400 uppercase mb-2">Behavioral Intensity</p>
                                                <p className="text-lg font-black text-gray-900 tracking-tight">{activeSession.totalDwellTime}s Active</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">{activeSession.maxScrollDepth}% Peak Attention Depth</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 shadow-sm">
                                                <p className="text-[8px] font-black text-gray-400 uppercase mb-2">Entry Context</p>
                                                <p className="text-[10px] font-bold text-gray-700 leading-tight italic line-clamp-2">"{activeSession.traffic.landing_page}"</p>
                                                <p className="text-[9px] font-bold text-gray-300 uppercase mt-1">First Landing Point</p>
                                            </div>
                                        </div>

                                        {/* Funnel Conversion Path */}
                                        <section>
                                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-10 text-center">Path Progression (This Session)</h5>
                                            <div className="flex flex-wrap justify-center gap-4">
                                                {activeSession.conversionPath.length > 0 ? activeSession.conversionPath.map((step, i) => (
                                                    <div key={i} className="flex items-center gap-4">
                                                        <div className="px-4 py-2 bg-primary/5 border border-primary/10 rounded-xl shadow-sm">
                                                            <span className="text-[9px] font-black text-primary uppercase tracking-widest">{step.replace(/_/g, ' ')}</span>
                                                        </div>
                                                        {i < activeSession.conversionPath.length - 1 && (
                                                            <svg className="w-4 h-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                                                        )}
                                                    </div>
                                                )) : (
                                                    <div className="py-4 px-10 border border-dashed border-gray-100 rounded-3xl">
                                                        <p className="text-[9px] text-gray-300 font-black uppercase tracking-[0.2em]">Passive Browsing - No Funnel Progression</p>
                                                    </div>
                                                )}
                                            </div>
                                        </section>

                                        {/* Granular Action Ledger */}
                                        <section className="space-y-6">
                                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-8">Granular Action Ledger</h5>
                                            <div className="relative pl-10 border-l border-gray-50 space-y-12">
                                                {activeSession.events.map((e, idx) => (
                                                    <div key={e.id} className="relative group/event">
                                                        <div className="absolute -left-[49px] top-1 w-4 h-4 rounded-full bg-white border-4 border-primary shadow-sm z-10 transition-transform group-hover/event:scale-125"></div>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{e.event_name.replace(/_/g, ' ')}</p>
                                                                <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">{e.page_url.split('#')[1] || 'Home Core'}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[9px] font-black text-gray-900 uppercase tabular-nums">
                                                                    {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                                </p>
                                                                <p className="text-[7px] font-black text-primary uppercase mt-0.5">T+{e.dwell_time}s into session</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="bg-gray-50/50 rounded-[1.5rem] p-5 border border-gray-100/50 hover:bg-white hover:border-primary/10 transition-all">
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                                <div>
                                                                    <p className="text-[7px] font-black text-gray-300 uppercase mb-1">Scroll Depth</p>
                                                                    <p className="text-[10px] font-bold text-gray-700">{e.scroll_depth || 0}%</p>
                                                                </div>
                                                                {Object.entries(e.event_properties || {}).map(([k, v]) => (
                                                                    <div key={k} className="min-w-0">
                                                                        <p className="text-[7px] font-black text-gray-300 uppercase mb-1 truncate">{k.replace(/_/g, ' ')}</p>
                                                                        <p className="text-[10px] font-bold text-primary truncate" title={String(v)}>{String(v)}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center grayscale opacity-30 text-center animate-pulse">
                                        <div className="w-32 h-32 mb-8 bg-gray-50 rounded-[3rem] flex items-center justify-center text-4xl shadow-inner">🔎</div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-loose">
                                            Awaiting Session Selection<br/>
                                            <span className="text-[8px] opacity-60">Drill into specific timestamps for detailed behavioral auditing</span>
                                        </p>
                                    </div>
                                )}
                            </main>
                        </div>

                        <footer className="p-8 border-t border-gray-50 bg-gray-50/30 text-center flex-shrink-0">
                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.5em]">Behavioral Audit Engine v5.2 • Identity Ledger Secure Portal</p>
                        </footer>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default AdminAnalytics;