
import React, { useState, useMemo, useEffect } from 'react';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { Sprint, Coach, UserRole } from '../../types';
import SprintCard from '../../components/SprintCard';

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
)

const DiscoverSprints: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [coaches, setCoaches] = useState<Record<string, Coach>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSprintsAndCoaches = async () => {
            setIsLoading(true);
            try {
                const fetchedSprints = await sprintService.getSprints();
                const publishedSprints = fetchedSprints.filter(s => s.published);
                setSprints(publishedSprints);

                const coachIds = [...new Set(publishedSprints.map(s => s.coachId))];
                const coachPromises = coachIds.map(id => userService.getUserDocument(id));
                const fetchedCoaches = await Promise.all(coachPromises);

                const coachesMap: Record<string, Coach> = {};
                fetchedCoaches.forEach(coach => {
                    if (coach && coach.role === UserRole.COACH) {
                        coachesMap[coach.id] = coach as Coach;
                    }
                });
                setCoaches(coachesMap);

            } catch (error) {
                console.error("Failed to fetch sprints or coaches:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSprintsAndCoaches();
    }, []);

    const availableSprints = useMemo(() => {
        const sprintsWithCoaches = sprints.map(sprint => ({
            sprint,
            coach: coaches[sprint.coachId]
        })).filter(item => item.coach); // Ensure coach exists

        if (!searchQuery) {
            return sprintsWithCoaches;
        }

        const lowercasedQuery = searchQuery.toLowerCase();
        return sprintsWithCoaches.filter(({ sprint, coach }) => 
            sprint.title.toLowerCase().includes(lowercasedQuery) ||
            sprint.category.toLowerCase().includes(lowercasedQuery) ||
            sprint.difficulty.toLowerCase().includes(lowercasedQuery) ||
            coach.name.toLowerCase().includes(lowercasedQuery)
        );
    }, [searchQuery, sprints, coaches]);

    if (isLoading) {
        return (
            <div className="text-center py-16">
                <h3 className="text-xl font-semibold">Loading Sprints...</h3>
                <p className="text-gray-500 mt-2">Connecting to the database.</p>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold mb-2">Discover Your Next Sprint</h1>
                <p className="text-lg text-gray-600">Find the perfect program to accelerate your growth.</p>
            </div>

            <div className="mb-8 max-w-2xl mx-auto">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by title, category, coach, or difficulty..."
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                    />
                </div>
            </div>
            
            {availableSprints.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {availableSprints.map(({ sprint, coach }) => (
                        <SprintCard key={sprint.id} sprint={sprint} coach={coach} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <h3 className="text-xl font-semibold">No Sprints Found</h3>
                    <p className="text-gray-500 mt-2">Try adjusting your search query to find other programs.</p>
                </div>
            )}
        </div>
    );
};

export default DiscoverSprints;
