import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Coach, Sprint } from '../../types';
import { sprintService } from '../../services/sprintService';
import ArchetypeAvatar from '../../components/ArchetypeAvatar';

const CoachProfile: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const coachSprints = await sprintService.getSprintsByCoach(user.id);
                setSprints(coachSprints);
            } catch (err) {
                console.error("Profile sync failed:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user]);

    if (!user) return null;
    const c = user as Coach;

    const milestones = useMemo(() => {
        const publishedSprints = sprints.filter(s => s.published).length;
        const draftSprints = sprints.length - publishedSprints;

        const list = [
            { id: 's1', title: 'First Sprint Created', icon: '🚀', currentValue: sprints.length, targetValue: 1 },
            { id: 's2', title: 'First Sprint Published', icon: '🏁', currentValue: publishedSprints, targetValue: 1 },
            { id: 's3', title: '5 Sprints Published', icon: '🏆', currentValue: publishedSprints, targetValue: 5 },
        ];

        return list.map(m => ({ ...m, progress: Math.min(100, (m.currentValue / m.targetValue) * 100) }));
    }, [sprints]);

    return (
        <div className="bg-[#FDFDFD] h-screen w-full font-sans overflow-hidden flex flex-col animate-fade-in">
            <div className="bg-white px-6 pt-8 pb-6 border-b border-gray-50 flex-shrink-0">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-5">
                        <div className="relative group">
                            <ArchetypeAvatar 
                                archetypeId={c.archetype} 
                                profileImageUrl={c.profileImageUrl} 
                                size="xl" 
                            />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">{c.name}</h1>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{c.email}</p>
                            <div className="mt-3 flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Joined</span>
                                    <span className="text-[9px] font-bold text-gray-600">{new Date(c.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={logout} className="px-4 py-2 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg">Logout</button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-dark rounded-3xl p-4 text-white relative overflow-hidden flex flex-col justify-center active:scale-[0.98] transition-all">
                        <p className="text-[7px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Active Participants Rating</p>
                        <div className="flex items-end gap-1">
                            <h3 className="text-2xl font-black tracking-tighter">4.8</h3>
                            <span className="text-[10px] mb-1 opacity-40">⭐</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col justify-center active:scale-[0.98] transition-all">
                        <p className="text-[7px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">Total Reviews</p>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tighter">128</h3>
                    </div>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-5">
                <section className="animate-fade-in">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <h2 className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2 px-1">Badges</h2>
                        <a href="#" className="text-[8px] font-black text-primary uppercase tracking-widest hover:underline">See all</a>
                    </div>
                    <div className="space-y-2">
                        {milestones.slice(0, 3).map((m) => (
                            <div key={m.id} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                                    {m.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[9px] font-black text-gray-900 truncate uppercase tracking-tight">{m.title}</h4>
                                    <div className="mt-1.5 h-1 bg-gray-50 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${m.progress}%` }} />
                                    </div>
                                </div>
                                <div className="text-[7px] font-black text-gray-400 uppercase tracking-widest">{m.progress === 100 ? 'Unlocked' : `${m.progress.toFixed(0)}%`}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Placeholder for Account Settings */}
                <div className="px-1">
                    <Link to="/coach/profile/settings" className="w-full py-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm flex items-center justify-between px-6 group active:scale-[0.98] transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-sm">⚙️</div>
                            <span className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Account Settings</span>
                        </div>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>

                <footer className="text-center pt-10">
                    <p className="text-[7px] font-black text-gray-200 uppercase tracking-[0.4em]">Vectorise • Coach Profile</p>
                </footer>
            </main>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.03); border-radius: 10px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default CoachProfile;
