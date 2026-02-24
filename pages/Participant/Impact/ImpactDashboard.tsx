import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../services/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Participant, Referral, UserRole } from '../../../types';
import { sanitizeData } from '../../../services/userService';

const IMPACT_DEGREE_POINTS: Record<string, number> = {
    'i1': 5, 'i3': 15, 'i5': 25, 'i10': 50, 'i15': 75, 'i20': 100, 'i25': 125, 'i30': 150, 'i35': 175, 'i40': 200, 'i45': 225, 'i50': 250
};

const ImpactDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [leaders, setLeaders] = useState<Participant[]>([]);
    const [fullLeaderboard, setFullLeaderboard] = useState<Participant[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        
        // Subscribe to my referrals
        const qRef = query(collection(db, 'referrals'), where('referrerId', '==', user.id));
        const unsubRef = onSnapshot(qRef, (snap) => {
            setReferrals(snap.docs.map(d => sanitizeData({ id: d.id, ...d.data() }) as Referral));
        });

        // Fetch top leaders
        const qLead = query(collection(db, 'users'), where('role', '==', 'PARTICIPANT'));
        const unsubLead = onSnapshot(qLead, (snap) => {
            const data = snap.docs.map(d => sanitizeData(d.data()) as Participant);
            const sortedLeaders = data.sort((a, b) => (b.impactStats?.peopleHelped || 0) - (a.impactStats?.peopleHelped || 0));
            setFullLeaderboard(sortedLeaders);
            const myRank = sortedLeaders.findIndex(p => p.id === user.id);
            const focusedLeaders = sortedLeaders.slice(Math.max(0, myRank - 1), myRank + 2);
            setLeaders(focusedLeaders);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching leaders: ", error);
            setIsLoading(false);
        });

        return () => { unsubRef(); unsubLead(); };
    }, [user]);

    if (!user) return null;
    const p = user as Participant;
    
    const impactCredits = useMemo(() => {
        return (p.claimedMilestoneIds || []).reduce((acc, id) => acc + (IMPACT_DEGREE_POINTS[id] || 0), 0);
    }, [p.claimedMilestoneIds]);

    const SectionLabel = ({ text }: { text: string }) => (
        <h2 className="text-[7px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2 px-1">{text}</h2>
    );

    return (
        <div className="bg-[#FDFDFD] h-screen w-full font-sans overflow-hidden flex flex-col animate-fade-in">
            {/* COMPACT HEADER */}
            <header className="flex-shrink-0 bg-white border-b border-gray-50 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/profile')} className="p-2 -ml-2 text-gray-300 hover:text-primary transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-sm font-black text-gray-900 tracking-tight leading-none italic">Impact</h1>
                </div>
                <div className="text-right">
                    <p className="text-[7px] font-black text-gray-300 uppercase tracking-widest">Code</p>
                    <p className="text-[10px] font-bold text-gray-400">{p.referralCode}</p>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
                
                {/* HERO CARD - REDUCED SIZE */}
                <div className="bg-[#0E7850] rounded-[2rem] p-5 text-white shadow-lg relative overflow-hidden flex items-center justify-between">
                    <div className="relative z-10 space-y-1">
                        <div className="flex items-end gap-1">
                            <h2 className="text-4xl font-black italic tracking-tighter leading-none">{p.impactStats?.peopleHelped || 0}</h2>
                        </div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/50">Lives Impacted</p>
                    </div>
                    
                    <div className="relative z-10 flex gap-1.5">
                        <Link to="/impact/share">
                            <button className="bg-white text-primary px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all">Expand</button>
                        </Link>
                        <Link to="/impact/badges">
                            <button className="bg-black/20 text-white border border-white/10 px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest backdrop-blur-sm active:scale-95 transition-all">Claim</button>
                        </Link>
                    </div>
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/5 rounded-full blur-2xl"></div>
                </div>

                <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
                    <div>
                        <h3 className="text-[7px] font-black text-gray-400 uppercase tracking-[0.3em]">Invite Protocol</h3>
                        <p className="text-sm font-black text-gray-900 tracking-tight leading-none italic">Catalyst</p>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Personal Message</p>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            {`"I found a platform that helps me stay consistent with my growth. Join me on this path: https://www.vectorise.online/?ref=${p.referralCode}#/"`}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <a 
                            href={`https://wa.me/?text=I found a platform that helps me stay consistent with my growth. Join me on this path: https://www.vectorise.online/?ref=${p.referralCode}#/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 bg-white border border-gray-100 shadow-sm rounded-xl py-3 text-center text-[10px] font-black text-gray-900 uppercase tracking-widest active:scale-95 transition-transform"
                        >
                            <span>💬</span>
                            <span>WhatsApp</span>
                        </a>
                        <a 
                            href={`mailto:?subject=Join me on Vectorise&body=I found a platform that helps me stay consistent with my growth. Join me on this path: https://www.vectorise.online/?ref=${p.referralCode}#/`}
                            className="flex items-center justify-center gap-2 bg-white border border-gray-100 shadow-sm rounded-xl py-3 text-center text-[10px] font-black text-gray-900 uppercase tracking-widest active:scale-95 transition-transform"
                        >
                            <span>✉️</span>
                            <span>Email</span>
                        </a>
                    </div>

                    <div>
                        <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">🔗 Unified Invite Link</p>
                        <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 text-center">
                            <p className="text-xs text-primary font-mono break-all">{`https://www.vectorise.online/?ref=${p.referralCode}#/`}</p>
                        </div>
                    </div>
                </section>

                {/* HORIZONTAL HISTORY */}
                <section>
                    <SectionLabel text="Recent Catalysts" />
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                        {referrals.length > 0 ? (
                            referrals.map((ref) => (
                                <div key={ref.id} className="flex-shrink-0 w-44 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden grayscale">
                                        <img src={ref.refereeAvatar || `https://ui-avatars.com/api/?name=${ref.refereeName}&background=0E7850&color=fff`} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-gray-900 truncate">{ref.refereeName}</p>
                                        <p className="text-[7px] font-bold text-primary uppercase tracking-widest truncate">{ref.status}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="w-full py-4 text-center text-gray-300 italic text-[9px] bg-gray-50/50 rounded-2xl border border-dashed border-gray-100">No records yet.</div>
                        )}
                    </div>
                </section>

                {/* COMPACT LEADERBOARD */}
                <section>
                    <div className="flex justify-between items-center mb-2 px-1">
                        <SectionLabel text="Impact Scale" />
                        <Link to="/impact/ripple" className="text-[7px] font-black text-primary uppercase">View All</Link>
                    </div>
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        {leaders.map((leader, index) => {
                            const isMe = user.id === leader.id;
                            return (
                                <div key={leader.id} className={`flex items-center gap-3 p-3 border-b border-gray-50 last:border-0 ${isMe ? 'bg-primary/[0.02]' : ''}`}>
                                    <span className="text-[8px] font-black text-gray-300 w-3">{fullLeaderboard.findIndex(l => l.id === leader.id) + 1}</span>
                                    <img src={leader.profileImageUrl} className="w-6 h-6 rounded-lg object-cover border border-gray-100" />
                                    <p className={`text-[10px] font-bold truncate flex-1 ${isMe ? 'text-primary' : 'text-gray-900'}`}>{leader.name}</p>
                                    <div className="text-right">
                                        <p className="text-[11px] font-black text-gray-900 leading-none">{leader.impactStats?.peopleHelped || 0}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <footer className="text-center pt-4">
                    <p className="text-[7px] font-black text-gray-200 uppercase tracking-[0.4em]">Vectorise • Catalyst v4.2</p>
                </footer>
            </main>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.03); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default ImpactDashboard;