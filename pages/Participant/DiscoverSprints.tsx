import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Coach, Sprint, Participant, UserRole, ParticipantSprint } from '../../types';
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
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12 animate-fade-in text-base lg:text-lg">
            <header className="mb-12">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-dark tracking-tighter leading-none mb-4 italic">Discover Sprints.</h1>
                <p className="text-gray-500 font-medium max-w-xl">Curated programs designed for immediate application and visible progress.</p>
            </header>

            <div className="flex flex-col md:flex-row gap-4 mb-12">
                <div className="flex-1 relative">
                    <input 
                        type="text" 
                        placeholder="Search topics, categories, coaches..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 outline-none font-medium" 
                    />
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                    {['recommended', 'latest'].map(s => (
                        <button key={s} onClick={() => setActiveSort(s as any)} className={`px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeSort === s ? 'bg-primary text-white' : 'text-gray-400 hover:text-dark'}`}>{s}</button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-[4/5] bg-gray-100 animate-pulse rounded-[2rem]"></div>)}
                </div>
            ) : processedSprints.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 lg:gap-12">
                    {processedSprints.map(({ sprint, coach }) => (
                        <SprintCard key={sprint.id} sprint={sprint} coach={coach} />
                    ))}
                </div>
            ) : (
                <div className="py-32 text-center bg-white rounded-[3rem] border border-gray-50"><p className="text-gray-400 font-bold uppercase tracking-widest">No matching programs found.</p></div>
            )}
            
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default DiscoverSprints;