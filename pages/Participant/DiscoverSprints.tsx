
import React, { useState, useMemo, useEffect } from 'react';
import { Coach, Sprint, Participant, UserRole } from '../../types';
import SprintCard from '../../components/SprintCard';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import { translateToTag, calculateMatchScore } from '../../utils/tagUtils';

const DiscoverSprints: React.FC = () => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSort, setActiveSort] = useState<'recommended' | 'latest' | 'popular'>('recommended');

    useEffect(() => {
        const loadDiscoveryData = async () => {
            setIsLoading(true);
            try {
                const [publishedSprints, dbCoaches] = await Promise.all([
                    sprintService.getPublishedSprints(),
                    userService.getCoaches()
                ]);
                setSprints(publishedSprints);
                setCoaches(dbCoaches);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadDiscoveryData();
    }, []);

    const userProfileTags = useMemo(() => {
        if (!user || user.role !== UserRole.PARTICIPANT) return null;
        const p = user as Participant;
        if (!p.onboardingAnswers) return null;
        return {
            persona: p.persona || '',
            p1: translateToTag(p.persona || '', p.onboardingAnswers[1]),
            p2: translateToTag(p.persona || '', p.onboardingAnswers[2]),
            p3: translateToTag(p.persona || '', p.onboardingAnswers[3]),
            occupation: translateToTag('', p.occupation === 'student' ? 'University Student' : p.occupation === 'employed' ? 'Employed' : 'Unemployed')
        };
    }, [user]);

    const processedSprints = useMemo(() => {
        let results = sprints.map(s => ({
            sprint: s,
            coach: coaches.find(c => c.id === s.coachId) || { name: 'Vectorise', profileImageUrl: 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd', id: 'core' } as any
        }));

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            results = results.filter(r => r.sprint.title.toLowerCase().includes(q) || r.sprint.category.toLowerCase().includes(q));
        }

        if (activeSort === 'recommended' && userProfileTags) {
            results.sort((a, b) => calculateMatchScore(userProfileTags, b.sprint.targeting) - calculateMatchScore(userProfileTags, a.sprint.targeting));
        }

        return results;
    }, [sprints, coaches, searchQuery, activeSort, userProfileTags]);

    return (
        <div className="max-w-screen-xl mx-auto px-6 sm:px-10 lg:px-16 py-12 lg:py-20 animate-fade-in text-base pb-32">
            
            {/* Gallery Header */}
            <header className="mb-16 text-center lg:text-left">
                <div className="inline-block px-3 py-1 rounded-full bg-primary/5 border border-primary/10 mb-6">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Curated Growth Catalog</p>
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 tracking-tighter leading-[0.95] mb-6 italic">
                    Discover <br className="hidden lg:block"/>Sprints.
                </h1>
                <p className="text-lg text-gray-500 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed italic">
                    Precision-engineered programs designed for immediate application and visible, tangible progress.
                </p>
            </header>

            {/* Filter Deck */}
            <div className="flex flex-col lg:flex-row gap-6 mb-16 items-center">
                <div className="w-full flex-1 relative group">
                    <input 
                        type="text" 
                        placeholder="Search themes, categories, or coaches..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-8 py-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm focus:ring-8 focus:ring-primary/5 focus:border-primary/30 outline-none font-bold text-gray-800 transition-all placeholder:text-gray-300" 
                    />
                    <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <div className="flex bg-gray-50 p-2 rounded-[1.75rem] border border-gray-100 shadow-inner">
                    {['recommended', 'latest', 'popular'].map(s => (
                        <button 
                            key={s} 
                            onClick={() => setActiveSort(s as any)} 
                            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeSort === s ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid Core */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-14">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-[3/4] bg-gray-50 animate-pulse rounded-[3rem] border border-gray-100"></div>)}
                </div>
            ) : processedSprints.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12 lg:gap-16">
                    {processedSprints.map(({ sprint, coach }) => (
                        <div key={sprint.id} className="animate-fade-in-up" style={{ animationDelay: `${processedSprints.indexOf({sprint, coach}) * 50}ms` }}>
                            <SprintCard sprint={sprint} coach={coach} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-32 text-center bg-white rounded-[4rem] border border-dashed border-gray-100">
                    <p className="text-gray-400 font-black uppercase tracking-[0.4em] text-[10px] mb-2">No matching cycles found</p>
                    <button onClick={() => setSearchQuery('')} className="text-primary font-black uppercase text-[10px] hover:underline">Clear Registry Filters</button>
                </div>
            )}
            
            <style>{`
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default DiscoverSprints;
