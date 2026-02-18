import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IdentityReport, UserSessionReport } from '../../types';
import { analyticsTracker } from '../../services/analyticsTracker';
import LocalLogo from '../../components/LocalLogo';

const UserAnalyticsDetail: React.FC = () => {
    const { identifier } = useParams();
    const navigate = useNavigate();
    const [identity, setIdentity] = useState<IdentityReport | null>(null);
    const [activeSession, setActiveSession] = useState<UserSessionReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUserIdentity = async () => {
            if (!identifier) return;
            setIsLoading(true);
            try {
                const ledger = await analyticsTracker.getIdentityLedger();
                const found = ledger.find(id => id.identifier === identifier);
                if (found) {
                    setIdentity(found);
                    setActiveSession(found.sessions[0] || null);
                } else {
                    navigate('/admin/dashboard');
                }
            } catch (err) {
                console.error("Failed to fetch user analytics", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserIdentity();
    }, [identifier, navigate]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!identity) return null;

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans animate-fade-in">
            {/* Header: Exact design from modal but adapted to page */}
            <header className="p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-center text-3xl">
                        {identity.hasPaid ? '👑' : '👤'}
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight italic">
                            {identity.email || identity.anonymous_id}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">
                                Growth Registry Drill-Down
                            </span>
                            <div className="w-1 h-1 rounded-full bg-gray-200"></div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                Persistent ID: {identity.anonymous_id}
                            </span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={() => navigate('/admin/dashboard')} 
                    className="p-3 text-gray-400 hover:text-gray-900 transition-all bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-90 flex items-center gap-2"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    <span className="text-[9px] font-black uppercase tracking-widest">Back to Ledger</span>
                </button>
            </header>
            
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-[calc(100vh-120px)]">
                {/* Left Panel: Date & Time Session Ledger */}
                <aside className="w-full md:w-80 border-r border-gray-100 overflow-y-auto custom-scrollbar bg-gray-50/30 p-8 flex flex-col">
                    <section className="mb-10">
                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6 px-1">Program Status</h5>
                        <div className="space-y-3">
                            {identity.enrollments.length > 0 ? identity.enrollments.map(enrol => (
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
                            {identity.sessions.map((sess, idx) => {
                                const isActive = activeSession?.session_id === sess.session_id;
                                return (
                                    <button 
                                        key={sess.session_id}
                                        onClick={() => setActiveSession(sess)}
                                        className={`w-full text-left p-5 rounded-3xl transition-all border group relative ${isActive ? 'bg-primary text-white border-primary shadow-lg scale-[1.03] z-10' : 'bg-white border-gray-100 text-gray-600 hover:border-primary/20'}`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <p className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-white/60' : 'text-gray-300'}`}>Session {identity.sessions.length - idx}</p>
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
                        <div className="space-y-12 animate-fade-in max-w-4xl mx-auto">
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
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.5em]">Behavioral Audit Engine v5.3 • Identity Ledger Dedicated View</p>
            </footer>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default UserAnalyticsDetail;