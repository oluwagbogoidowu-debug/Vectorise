
import React, { useState, useEffect, useMemo } from 'react';
import { AnalyticsEvent, FunnelStats } from '../../types';
import { analyticsTracker } from '../../services/analyticsTracker';

const AdminAnalytics: React.FC = () => {
    const [events, setEvents] = useState<AnalyticsEvent[]>([]);
    const [funnel, setFunnel] = useState<FunnelStats | null>(null);
    const [trafficMap, setTrafficMap] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = analyticsTracker.subscribeToEvents((data) => {
            setEvents(data);
        });

        const fetchData = async () => {
            const [funnelData, breakdown] = await Promise.all([
                analyticsTracker.getFunnelMetrics(),
                analyticsTracker.getTrafficBreakdown()
            ]);
            setFunnel(funnelData);
            setTrafficMap(breakdown);
            setIsLoading(false);
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

    const topSources = useMemo(() => {
        // Fix: Explicitly cast record values to number to resolve arithmetic operation type errors during sorting
        return Object.entries(trafficMap).sort((a, b) => (b[1] as number) - (a[1] as number));
    }, [trafficMap]);

    if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-12 animate-fade-in pb-20">
            {/* CONVERSION FUNNEL */}
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10">
                <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em] mb-12">Growth Funnel</h4>
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* TRAFFIC SOURCES */}
                <section className="lg:col-span-4 bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-xl">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-10">Traffic Sources</h4>
                    <div className="space-y-6">
                        {topSources.map(([src, count]) => (
                            <div key={src} className="space-y-2">
                                <div className="flex justify-between text-xs font-bold italic">
                                    <span className="text-white/60 capitalize">{src}</span>
                                    <span>{count}</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary rounded-full" 
                                        style={{ width: `${(count / events.length) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {topSources.length === 0 && <p className="text-xs text-white/20 italic">Awaiting traffic data...</p>}
                    </div>
                </section>

                {/* LIVE EVENT LOG */}
                <section className="lg:col-span-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                        <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em]">Behavior Feed</h4>
                        <span className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                             <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Real-time</p>
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-gray-50">
                                {events.map((e) => (
                                    <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-8 py-4">
                                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{e.event_name.replace(/_/g, ' ')}</p>
                                            <p className="text-[8px] text-gray-400 font-mono truncate max-w-[200px]">{e.session_id}</p>
                                        </td>
                                        <td className="px-8 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {Object.entries(e.event_properties || {}).slice(0, 2).map(([k, v]) => (
                                                    <span key={k} className="text-[7px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">{k}: {String(v)}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <p className="text-[9px] text-gray-400 font-bold uppercase">{new Date(e.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </td>
                                    </tr>
                                ))}
                                {events.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="py-20 text-center text-gray-300 italic text-sm font-bold uppercase tracking-widest">Horizon Clear</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

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
