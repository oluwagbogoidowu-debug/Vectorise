
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Coach, Sprint, Participant, UserRole, ParticipantSprint } from '../../types';
import SprintCard from '../../components/SprintCard';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import { translateToTag, calculateMatchScore } from '../../utils/tagUtils';

type SortOption = 'recommended' | 'latest' | 'popular';

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const DiscoverSprints: React.FC = () => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [allEnrollments, setAllEnrollments] = useState<ParticipantSprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    
    const [activeSort, setActiveSort] = useState<SortOption>('recommended');
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);

    const placeholders = [
        "Search by title, category, coach...",
        "Find the perfect program for you.",
        "What's your next growth milestone?"
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        }, 3500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const loadDiscoveryData = async () => {
            setIsLoading(true);
            try {
                const publishedSprints = await sprintService.getPublishedSprints();
                setSprints(publishedSprints);

                const dbCoaches = await userService.getCoaches();
                setCoaches(dbCoaches);

                const sprintIds = publishedSprints.map(s => s.id);
                if (sprintIds.length > 0) {
                    const enrollments = await sprintService.getEnrollmentsForSprints(sprintIds);
                    setAllEnrollments(enrollments);
                }
            } catch (err) {
                console.error("Error loading Discover data:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadDiscoveryData();

        const handleClickOutside = (e: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
                setIsSortOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeParticipantCounts = useMemo(() => {
        return allEnrollments.reduce((acc: Record<string, number>, e) => {
            const isCompleted = e.progress.every(p => p.completed);
            if (!isCompleted) {
                acc[e.sprintId] = (acc[e.sprintId] || 0) + 1;
            }
            return acc;
        }, {});
    }, [allEnrollments]);

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

    const sortedAndFilteredSprints = useMemo(() => {
        let results = sprints.map(sprint => {
            let coach = coaches.find(u => u.id === sprint.coachId);
            const isPlatform = sprint.category === 'Growth Fundamentals' || sprint.category === 'Core Platform Sprint' || sprint.pricingType === 'credits';
            if (!coach && isPlatform) {
                coach = {
                    id: 'vectorise_platform',
                    name: 'Vectorise Platform',
                    profileImageUrl: 'https://lh3.googleusercontent.com/d/1vYOe4SzIrE7kb6DSFkOp9UYz3tHWPnHw',
                    role: UserRole.COACH,
                    bio: 'Official foundational programs for personal evolution.',
                    niche: 'Growth System',
                    approved: true
                } as Coach;
            }
            return { sprint, coach };
        }).filter(item => item.sprint && item.coach);

        const enrolledIds = (user as Participant)?.enrolledSprintIds || [];
        results = results.filter(({ sprint }) => !enrolledIds.includes(sprint.id));

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            results = results.filter(({ sprint, coach }) => 
                (sprint.title?.toLowerCase().includes(query)) ||
                (sprint.category?.toLowerCase().includes(query)) ||
                (coach?.name?.toLowerCase().includes(query))
            );
        }

        // --- Curation Logic for Recommended Sort ---
        if (activeSort === 'recommended') {
            const platformItems = results.filter(item => 
                item.sprint.category === 'Growth Fundamentals' || item.sprint.category === 'Core Platform Sprint'
            );
            const coachItems = results.filter(item => 
                item.sprint.category !== 'Growth Fundamentals' && item.sprint.category !== 'Core Platform Sprint'
            );

            // Find best Platform owned
            const bestPlatform = platformItems.length > 0 ? (
                userProfileTags 
                ? [...platformItems].sort((a, b) => calculateMatchScore(userProfileTags, b.sprint.targeting) - calculateMatchScore(userProfileTags, a.sprint.targeting))[0]
                : platformItems[0]
            ) : null;

            // Find best Coach led
            const bestCoach = coachItems.length > 0 ? (
                userProfileTags
                ? [...coachItems].sort((a, b) => calculateMatchScore(userProfileTags, b.sprint.targeting) - calculateMatchScore(userProfileTags, a.sprint.targeting))[0]
                : coachItems[0]
            ) : null;

            const curated = [];
            if (bestPlatform) curated.push(bestPlatform);
            if (bestCoach) curated.push(bestCoach);
            return curated;
        }

        // Standard sorting for Latest and Popular
        return results.sort((a, b) => {
            switch (activeSort) {
                case 'latest':
                    return new Date(b.sprint.createdAt || 0).getTime() - new Date(a.sprint.createdAt || 0).getTime();
                case 'popular':
                    return (activeParticipantCounts[b.sprint.id] || 0) - (activeParticipantCounts[a.sprint.id] || 0);
                default:
                    return 0;
            }
        });

    }, [searchQuery, sprints, coaches, activeSort, activeParticipantCounts, user, userProfileTags]);

    const sortLabels: Record<SortOption, string> = {
        'recommended': 'Recommended',
        'latest': 'Newest',
        'popular': 'Popular'
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24">
            <div className="mb-10">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Discover Sprints</h1>
                <p className="text-gray-500 font-medium text-lg">Master new skills through official core programs and specialist registry tracks.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-10 items-stretch md:items-center">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <SearchIcon />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={placeholders[placeholderIndex]}
                        className="block w-full pl-14 pr-6 py-4 border border-gray-100 rounded-3xl leading-5 bg-white shadow-sm placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all text-gray-900 font-medium text-lg"
                    />
                </div>

                <div className="relative flex-shrink-0" ref={sortRef}>
                    <button
                        onClick={() => setIsSortOpen(!isSortOpen)}
                        className={`h-full flex items-center justify-between gap-3 px-8 py-4 bg-white border rounded-3xl shadow-sm hover:bg-gray-50 transition-all active:scale-95 group ${isSortOpen ? 'border-primary/40 ring-4 ring-primary/5' : 'border-gray-100'}`}
                    >
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-primary transition-colors">Filter</span>
                            <span className="text-sm font-black text-gray-900 leading-none">{sortLabels[activeSort]}</span>
                        </div>
                        <div className={`p-1.5 rounded-full bg-gray-50 group-hover:bg-primary/10 transition-colors ${isSortOpen ? 'rotate-180 bg-primary/10' : ''}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7-7-7-7" />
                            </svg>
                        </div>
                    </button>

                    {isSortOpen && (
                        <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-[2rem] shadow-2xl border border-gray-100 py-3 z-[60] animate-slide-up origin-top-right overflow-hidden">
                            {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                                <button
                                    key={option}
                                    onClick={() => {
                                        setActiveSort(option);
                                        setIsSortOpen(false);
                                    }}
                                    className={`w-full text-left px-6 py-4 text-sm font-bold transition-all flex justify-between items-center group/item ${
                                        activeSort === option ? 'text-primary bg-primary/5' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className={activeSort === option ? 'scale-105' : 'group-hover/item:translate-x-1 transition-transform'}>{sortLabels[option]}</span>
                                    {activeSort === option && (
                                        <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {activeSort === 'recommended' && sortedAndFilteredSprints.length > 0 && (
                <div className="mb-8 px-2">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-2">High-Signal Matching</p>
                    <p className="text-sm text-gray-400 font-medium italic">We've curated the most relevant foundation and specialist path for your profile. View everything else in 'Newest'.</p>
                </div>
            )}
            
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border border-gray-100 shadow-sm">
                    <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
                    <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-xs">Curating high-impact paths...</p>
                </div>
            ) : sortedAndFilteredSprints.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
                    {sortedAndFilteredSprints.map(({ sprint, coach }) => (
                        <SprintCard key={sprint.id} sprint={sprint} coach={coach!} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 max-w-2xl mx-auto px-6">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 mb-2">No Matching Sprints</h3>
                    <p className="text-gray-500 font-medium text-lg leading-relaxed">Try another keyword or clear your filters.</p>
                    <button onClick={() => {setSearchQuery(''); setActiveSort('recommended');}} className="mt-10 px-10 py-4 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 active:scale-95">Clear all filters</button>
                </div>
            )}

            <style>{`
                @keyframes slideUp { from { opacity: 0; transform: translateY(-12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default DiscoverSprints;
