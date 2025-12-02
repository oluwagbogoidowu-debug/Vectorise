
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_SPRINTS } from '../../services/mockData';
import { ParticipantSprint, Sprint, Participant } from '../../types';
import ProgressBar from '../../components/ProgressBar';
import Button from '../../components/Button';
import { sprintService } from '../../services/sprintService';

const MySprints: React.FC = () => {
    const { user } = useAuth();
    const [activeSprints, setActiveSprints] = useState<{ enrollment: ParticipantSprint; sprint: Sprint }[]>([]);
    const [upcomingSprints, setUpcomingSprints] = useState<{ enrollment: ParticipantSprint; sprint: Sprint }[]>([]);
    const [savedSprints, setSavedSprints] = useState<Sprint[]>([]);

    useEffect(() => {
        const loadSprints = async () => {
            if (user) {
                // Filter Enrollments from Firestore
                const myEnrollments = await sprintService.getUserEnrollments(user.id);
                const now = new Date();

                const active: { enrollment: ParticipantSprint; sprint: Sprint }[] = [];
                const upcoming: { enrollment: ParticipantSprint; sprint: Sprint }[] = [];

                myEnrollments.forEach(enrollment => {
                    const sprint = MOCK_SPRINTS.find(s => s.id === enrollment.sprintId);
                    if (!sprint) return;

                    const startDate = new Date(enrollment.startDate);
                    // Logic: Upcoming if start date is in future. Active if start date is past.
                    if (startDate > now) {
                        upcoming.push({ enrollment, sprint });
                    } else {
                        active.push({ enrollment, sprint });
                    }
                });

                setActiveSprints(active);
                setUpcomingSprints(upcoming);

                // Filter Saved Sprints
                const savedIds = (user as Participant).savedSprintIds || [];
                const saved = MOCK_SPRINTS.filter(s => savedIds.includes(s.id));
                setSavedSprints(saved);
            }
        };
        
        loadSprints();
    }, [user]);

    const calculateProgress = (enrollment: ParticipantSprint) => {
        const completedDays = enrollment.progress.filter(p => p.completed).length;
        const totalDays = enrollment.progress.length;
        return totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
    };

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 mb-16">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">My Sprints</h1>

            {/* Quick Stats & Actions Grid */}
            <div className="grid grid-cols-10 gap-4 mb-10 h-24 sm:h-28">
                <div className="col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:border-primary transition-colors group">
                    <span className="block text-3xl font-bold text-gray-900 group-hover:text-primary transition-colors">{activeSprints.length}</span>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Active</p>
                </div>
                <div className="col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:border-primary transition-colors group">
                    <span className="block text-3xl font-bold text-gray-900 group-hover:text-primary transition-colors">{savedSprints.length}</span>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Saved</p>
                </div>
                <Link to="/discover" className="col-span-4 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col items-center justify-center hover:bg-blue-100 transition-colors group relative overflow-hidden">
                    <div className="relative z-10 flex flex-col items-center">
                        <span className="block text-3xl mb-1 group-hover:scale-110 transition-transform">🔍</span>
                        <p className="text-blue-700 text-[10px] font-bold uppercase tracking-wider">Discover</p>
                    </div>
                </Link>
            </div>

            {/* Active Sprints Section (Main Emphasis) */}
            <section className="mb-10">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Active Sprints
                </h2>
                {activeSprints.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activeSprints.map(({ enrollment, sprint }) => (
                            <Link key={enrollment.id} to={`/participant/sprint/${enrollment.id}`} className="block group">
                                <div className="bg-white rounded-2xl shadow-md border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full">
                                    <div className="h-32 w-full overflow-hidden relative">
                                        <img src={sprint.coverImageUrl} alt={sprint.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>
                                        <div className="absolute bottom-3 left-4 text-white font-semibold text-sm">
                                            Day {enrollment.progress.find(p => !p.completed)?.day || 'Done'}
                                        </div>
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">{sprint.title}</h3>
                                        <p className="text-xs text-gray-500 mb-4">{sprint.category} • {sprint.duration} Days</p>
                                        <div className="mt-auto">
                                            <ProgressBar value={calculateProgress(enrollment)} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-300">
                        <p className="text-gray-500 mb-4">No active sprints currently.</p>
                        <Link to="/discover">
                            <Button>Find a Sprint</Button>
                        </Link>
                    </div>
                )}
            </section>

            {/* Upcoming Live Sprints Section */}
            <section className="mb-10">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Live Sprints</h2>
                {upcomingSprints.length > 0 ? (
                     <div className="space-y-4">
                        {upcomingSprints.map(({ enrollment, sprint }) => (
                            <div key={enrollment.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl bg-gray-100 flex flex-col items-center justify-center text-center flex-shrink-0 border border-gray-200">
                                    <span className="text-xs font-bold text-red-500 uppercase">Starts</span>
                                    <span className="text-lg font-bold text-gray-900">{new Date(enrollment.startDate).getDate()}</span>
                                    <span className="text-[10px] text-gray-500 uppercase">{new Date(enrollment.startDate).toLocaleString('default', { month: 'short' })}</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900">{sprint.title}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-1">{sprint.description}</p>
                                </div>
                                <div className="hidden sm:block">
                                     <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">Enrolled</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No upcoming sprints scheduled.</p>
                )}
            </section>

             {/* Saved Sprints Section */}
             <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Saved Sprints</h2>
                {savedSprints.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {savedSprints.map(sprint => (
                             <Link key={sprint.id} to={`/sprint/${sprint.id}`} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center gap-4">
                                <img src={sprint.coverImageUrl} alt={sprint.title} className="w-16 h-16 rounded-lg object-cover" />
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{sprint.title}</h3>
                                    <p className="text-xs text-gray-500 mb-2">{sprint.category}</p>
                                    <span className="text-xs font-semibold text-primary">View Details &rarr;</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">You haven't saved any sprints yet.</p>
                )}
            </section>
        </div>
    );
};

export default MySprints;
