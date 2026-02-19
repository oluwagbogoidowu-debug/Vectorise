import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalyticsEvent, FunnelStats, IdentityReport } from '../../types';
import { analyticsTracker } from '../../services/analyticsTracker';

const AdminAnalytics: React.FC = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState<AnalyticsEvent[]>([]);
    const [funnel, setFunnel] = useState<FunnelStats | null>(null);
    const [trafficMap, setTrafficMap] = useState<Record<string, number>>({});
    const [identities, setIdentities] = useState<IdentityReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = analyticsTracker.subscribeToEvents((data) => {
            setEvents(data);
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
        return () => unsubscribe();
    }, []);

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

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Compiling Global Identity Ledger...</p>
        </div>
    );

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