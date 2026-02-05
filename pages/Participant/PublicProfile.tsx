import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import { sprintService } from '../../services/sprintService';
import { shineService } from '../../services/shineService';
import { Participant, ShinePost, ParticipantSprint } from '../../types';

const PublicProfile: React.FC = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    
    const [user, setUser] = useState<Participant | null>(null);
    const [enrollments, setEnrollments] = useState<ParticipantSprint[]>([]);
    const [reflections, setReflections] = useState<ShinePost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [selectedSprintFilter, setSelectedSprintFilter] = useState<string>('all');

    useEffect(() => {
        const fetchPublicData = async () => {
            if (!userId) return;
            setIsLoading(true);
            try {
                const userData = await userService.getUserDocument(userId) as Participant;
                if (!userData) {
                    navigate('/dashboard');
                    return;
                }
                setUser(userData);

                const userEnrollments = await sprintService.getUserEnrollments(userId);
                setEnrollments(userEnrollments);

                const allPosts = await shineService.getPosts();
                setReflections(allPosts.filter(p => p.userId === userId));

                setIsFollowing(false); 
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPublicData();
    }, [userId, navigate]);

    const currentSprint = useMemo(() => {
        return enrollments.find(e => e.progress.some(p => !p.completed));
    }, [enrollments]);

    const previousSprints = useMemo(() => {
        return enrollments.filter(e => e.progress.every(p => p.completed));
    }, [enrollments]);

    const growthThemes = useMemo(() => {
        return ['Focus', 'Discipline', 'Clarity', 'Confidence'].slice(0, Math.floor(Math.random() * 2) + 2);
    }, []);

    const filteredReflections = useMemo(() => {
        if (selectedSprintFilter === 'all') return reflections;
        return reflections.filter(r => r.sprintTitle === selectedSprintFilter);
    }, [reflections, selectedSprintFilter]);

    const sprintOptions = useMemo(() => {
        const titles = reflections.map(r => r.sprintTitle).filter(Boolean) as string[];
        return ['all', ...Array.from(new Set(titles))];
    }, [reflections]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Observing Growth...</p>
            </div>
        );
    }

    if (!user) return null;

    const isMe = currentUser?.id === user.id;

    return (
        <div className="max-w-xl mx-auto px-6 py-12 pb-32 animate-fade-in space-y-16">
            {/* 1. Profile Header */}
            <div className="flex flex-col items-center text-center">
                <div className="w-28 h-28 rounded-full border-4 border-white shadow-sm overflow-hidden bg-gray-50 mb-6">
                    <img src={user.profileImageUrl} alt={user.name} className="w-full h-full object-cover" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{user.name}</h1>
                <p className="text-lg text-gray-600 font-medium leading-relaxed italic max-w-sm">
                    "{user.intention || "Working on consistency in my daily practice."}"
                </p>

                {/* Connection Layer */}
                <div className="mt-8 flex items-center gap-8 text-sm">
                    <div className="flex flex-col items-center">
                        <span className="text-gray-900 font-bold">{user.followers || 0}</span>
                        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Click</span>
                    </div>
                    <div className="w-px h-6 bg-gray-100"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-gray-900 font-bold">{user.following || 0}</span>
                        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Following</span>
                    </div>
                </div>

                {!isMe && (
                    <button 
                        onClick={() => setIsFollowing(!isFollowing)}
                        className={`mt-10 px-12 py-3 rounded-full font-bold text-sm transition-all active:scale-95 shadow-sm border ${
                            isFollowing 
                            ? 'bg-white border-gray-200 text-gray-500' 
                            : 'bg-primary text-white border-primary hover:bg-primary-hover shadow-primary/10'
                        }`}
                    >
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                )}
            </div>

            {/* 2. Growth Context */}
            <section>
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-3">
                    Context
                    <div className="flex-1 h-px bg-gray-50"></div>
                </h2>
                
                <div className="space-y-6">
                    {currentSprint ? (
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Current Sprint</p>
                            <h3 className="text-lg font-bold text-gray-900">Active Process</h3>
                            <div className="mt-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Active</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded-xl text-center border border-dashed border-gray-200">No active sprint at this moment.</p>
                    )}

                    {previousSprints.length > 0 && (
                        <div className="pt-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Previous Cycles</p>
                            <div className="flex flex-wrap gap-2">
                                {previousSprints.map((_, idx) => (
                                    <span key={idx} className="px-3 py-1.5 bg-gray-50 text-gray-500 border border-gray-100 rounded-lg text-[11px] font-bold">
                                        Completed Cycle
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* 3. Growth Themes */}
            <section>
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-3">
                    Growth Themes
                    <div className="flex-1 h-px bg-gray-50"></div>
                </h2>
                <div className="flex flex-wrap gap-6">
                    {growthThemes.map((theme, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary/20"></div>
                            <span className="text-sm font-bold text-gray-700 tracking-tight">{theme}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* 4. Reflection Layer */}
            <section>
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Learning Journal</h2>
                    {sprintOptions.length > 2 && (
                        <select 
                            value={selectedSprintFilter} 
                            onChange={(e) => setSelectedSprintFilter(e.target.value)}
                            className="bg-transparent text-[10px] font-bold uppercase text-gray-400 outline-none border-none cursor-pointer hover:text-primary transition-colors"
                        >
                            {sprintOptions.map(opt => (
                                <option key={opt} value={opt}>{opt === 'all' ? 'Filter' : opt}</option>
                            ))}
                        </select>
                    )}
                </div>

                {filteredReflections.length > 0 ? (
                    <div className="space-y-10 border-l border-gray-50 ml-2 pl-8">
                        {filteredReflections.map((post) => (
                            <div key={post.id} className="relative">
                                <div className="absolute -left-[37px] top-1.5 w-4 h-4 bg-white border-2 border-gray-100 rounded-full flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                                </div>
                                
                                <div className="mb-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">
                                        {new Date(post.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                    <p className="text-[9px] font-bold text-primary uppercase bg-primary/5 px-2 py-0.5 rounded w-fit">
                                        After {post.sprintTitle?.split(' (')[0] || 'Task'}
                                    </p>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed italic font-medium">
                                    "{post.content}"
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
                        <p className="text-sm text-gray-400 font-medium italic">Reflections will appear here as they are shared.</p>
                    </div>
                )}
            </section>

            {/* 5. Expandable Info */}
            {(user.bio || user.interests) && (
                <section className="p-8 bg-gray-50 rounded-3xl border border-gray-100">
                    {user.bio && (
                        <div className="mb-8">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">About</h4>
                            <p className="text-sm text-gray-600 leading-relaxed font-medium line-clamp-3">{user.bio}</p>
                        </div>
                    )}
                    {user.interests && user.interests.length > 0 && (
                        <div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Interests</h4>
                            <div className="flex flex-wrap gap-2">
                                {user.interests.map((int, i) => (
                                    <span key={i} className="text-[11px] font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">
                                        #{int}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default PublicProfile;
