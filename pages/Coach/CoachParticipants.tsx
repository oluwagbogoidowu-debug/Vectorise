
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Participant, UserRole, DailyContent, ParticipantSprint, Sprint } from '../../types';
import ParticipantDetailView from './ParticipantDetailView';
import { formatDistanceToNow, isToday, isAfter } from 'date-fns';

const getSubmissionIcon = (submissionType?: DailyContent['submissionType']) => {
    switch (submissionType) {
        case 'text': return '📝';
        case 'file': return '📎';
        case 'both': return '📝📎';
        case 'none': return '✅';
        default: return ''
    }
};

interface ParticipantWithSprint extends Participant {
    sprintTitle: string;
    sprintId: string;
    sprintDay: number;
    status: 'On track' | 'At risk' | 'Completed';
    lastActivity: Date;
    isNew: boolean;
    joinedToday: boolean;
    submissionTypeToday?: DailyContent['submissionType'];
    progressLength: number;
    isCompleted: boolean;
}

interface SelectedParticipant {
    participant: Participant;
    sprintId: string;
}

const CoachParticipants: React.FC = () => {
    const { user } = useAuth();
    const [participants, setParticipants] = useState<ParticipantWithSprint[]>([]);
    const [selectedParticipant, setSelectedParticipant] = useState<SelectedParticipant | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [dayFilter, setDayFilter] = useState('all');

    useEffect(() => {
        if (!user) return;

        // Query for participantSprints managed by the current coach
        const participantSprintsQuery = query(
            collection(db, "participantSprints"),
            where("coachId", "==", user.id)
        );

        const unsubscribe = onSnapshot(participantSprintsQuery, async (psSnapshot) => {
            // Fetch all sprints and users once to avoid multiple fetches inside the loop
            const sprintsSnapshot = await getDocs(collection(db, 'sprints'));
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const allSprints = sprintsSnapshot.docs.reduce((acc, doc) => ({ ...acc, [doc.data().id]: doc.data() as Sprint }), {} as {[key: string]: Sprint});
            const allUsers = usersSnapshot.docs.reduce((acc, doc) => ({ ...acc, [doc.data().id]: doc.data() as Participant }), {} as {[key: string]: Participant});

            const participantsData = psSnapshot.docs.map(doc => {
                const ps = doc.data() as ParticipantSprint;
                const participant = allUsers[ps.participantId];
                const sprint = allSprints[ps.sprintId];

                if (!participant || !sprint) {
                    return null;
                }

                const completedProgress = ps.progress.filter(p => p.completed);
                const progressLength = completedProgress.length;

                const lastActivity = progressLength > 0 
                    ? (completedProgress[progressLength - 1].completedAt as any).toDate() 
                    : (ps.startDate as any).toDate();

                const isCompleted = progressLength === sprint.dailyContent.length;

                // Correctly determine the participant's current day
                let sprintDay;
                const firstIncompleteIndex = ps.progress.findIndex(p => !p.completed);
                if (isCompleted) {
                    sprintDay = sprint.dailyContent.length;
                } else {
                    sprintDay = ps.progress[firstIncompleteIndex].day;
                }

                // Calculate status based on calendar days vs progress
                const daysSinceStart = Math.ceil((new Date().getTime() - (ps.startDate as any).toDate().getTime()) / (1000 * 3600 * 24));
                const missedDays = daysSinceStart - progressLength;
                const status = isCompleted ? 'Completed' : missedDays >= 2 ? 'At risk' : 'On track';
                
                const isNew = (new Date().getTime() - (ps.startDate as any).toDate().getTime()) < (1000 * 3600 * 24 * 3);
                const joinedToday = isToday((ps.startDate as any).toDate());
                
                // Get submission type for the current day, not the calendar day
                const submissionTypeToday = sprint.dailyContent.find((dc: DailyContent) => dc.day === sprintDay)?.submissionType;

                return {
                    ...participant,
                    sprintTitle: sprint.title,
                    sprintId: sprint.id,
                    sprintDay,
                    status,
                    lastActivity,
                    isNew,
                    joinedToday,
                    submissionTypeToday,
                    progressLength,
                    isCompleted,
                } as ParticipantWithSprint;
            }).filter(Boolean) as ParticipantWithSprint[];

            // Sort participants by priority
            participantsData.sort((a, b) => {
                if (a.status === 'At risk' && b.status !== 'At risk') return -1;
                if (b.status === 'At risk' && a.status !== 'At risk') return 1;
                if (a.isNew && !b.isNew) return -1;
                if (b.isNew && !a.isNew) return 1;
                return b.lastActivity.getTime() - a.lastActivity.getTime();
            });

            setParticipants(participantsData);
        });

        return () => unsubscribe();
    }, [user]);

    const filteredParticipants = useMemo(() => {
        let participantsList = participants;

        if (statusFilter !== 'all') {
             participantsList = participantsList.filter(p => p.status === statusFilter);
        }

        if (dayFilter !== 'all') {
            participantsList = participantsList.filter(p => p.sprintDay === parseInt(dayFilter, 10));
        }

        return participantsList;
    }, [participants, statusFilter, dayFilter]);

    const overviewStats = useMemo(() => {
        const total = participants.length;
        if (total === 0) {
            return { total: 0, activeToday: 0, onTrack: 0, atRisk: 0, missedToday: 0 };
        }
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const activeToday = participants.filter(p => p.lastActivity >= startOfToday).length;
        const onTrackCount = participants.filter(p => p.status === 'On track').length;
        const atRiskCount = participants.filter(p => p.status === 'At risk').length;
        const missedTodayCount = participants.filter(p => {
             const daysSinceStart = Math.ceil((new Date().getTime() - p.lastActivity.getTime()) / (1000 * 3600 * 24));
             return !p.isCompleted && daysSinceStart > 1;
        }).length;
        return {
            total,
            activeToday,
            onTrack: total > 0 ? Math.round((onTrackCount / total) * 100) : 0,
            atRisk: total > 0 ? Math.round((atRiskCount / total) * 100) : 0,
            missedToday: total > 0 ? Math.round((missedTodayCount / total) * 100) : 0
        };
    }, [participants]);

    const submissionsToReviewCount = useMemo(() => {
        // This logic will also need to be updated to use firestore data
        return 0; // Placeholder
    }, []);

    const actionItems = useMemo(() => {
        const atRiskCount = participants.filter(p => p.status === 'At risk').length;
        const newJoinersCount = participants.filter(p => p.joinedToday).length;

        return [
            { 
                id: 'at-risk', 
                count: atRiskCount, 
                text: `participant${atRiskCount === 1 ? ' has' : 's have'} missed 2+ days`, 
                icon: '⚠️', 
                borderColor: 'border-yellow-400',
                action: () => setStatusFilter('At risk')
            },
            { 
                id: 'new-joiners', 
                count: newJoinersCount, 
                text: `new participant${newJoinersCount === 1 ? ' has' : 's have'} joined today`, 
                icon: '🎉', 
                borderColor: 'border-blue-400',
                 action: () => setStatusFilter('all') // Simple action for now
            },
            { 
                id: 'review', 
                count: submissionsToReviewCount, 
                text: `submission${submissionsToReviewCount === 1 ? ' needs' : 's need'} review`, 
                icon: '👀', 
                borderColor: 'border-indigo-400', 
                action: () => alert('Filtering by submissions to review is not yet implemented.') 
            },
        ].filter(item => item.count > 0);

    }, [participants, submissionsToReviewCount]);

    const handleParticipantClick = (participant: Participant, sprintId: string) => {
        setSelectedParticipant({ participant, sprintId });
    };

    if (selectedParticipant) {
        return <ParticipantDetailView participant={selectedParticipant.participant} sprintId={selectedParticipant.sprintId} onBack={() => setSelectedParticipant(null)} />;
    }

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 bg-white p-6 rounded-2xl shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Participants Overview</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div><p className="text-3xl font-bold text-gray-900">{overviewStats.activeToday}</p><p className="text-sm font-semibold text-gray-600">Active Today</p></div>
                        <div><p className="text-3xl font-bold text-green-600">{overviewStats.onTrack}%</p><p className="text-sm font-semibold text-gray-600">On Track</p></div>
                        <div><p className="text-3xl font-bold text-yellow-600">{overviewStats.atRisk}%</p><p className="text-sm font-semibold text-gray-600">At Risk</p></div>
                        <div><p className="text-3xl font-bold text-red-600">{overviewStats.missedToday}%</p><p className="text-sm font-semibold text-gray-600">Missed Today</p></div>
                    </div>
                </div>

                {actionItems.length > 0 && (
                    <div className="mb-6 space-y-3">
                        {actionItems.map(item => (
                            <div key={item.id} onClick={item.action} className={`p-4 rounded-lg flex items-center bg-white border-l-4 ${item.borderColor} shadow-sm cursor-pointer hover:bg-gray-50`}>
                                <span className="text-2xl mr-4">{item.icon}</span>
                                <p className="font-semibold text-gray-800"><span className="font-bold">{item.count}</span> {item.text}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                        <h2 className="text-2xl font-bold text-gray-800">All Participants</h2>
                        <div className="flex items-center space-x-4">
                            <button onClick={() => { setStatusFilter('all'); setDayFilter('all'); }} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">Clear Filters</button>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="all">All Statuses</option>
                                <option value="On track">On track</option>
                                <option value="At risk">At risk</option>
                                <option value="Completed">Completed</option>
                            </select>
                            <select value={dayFilter} onChange={e => setDayFilter(e.target.value)} className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="all">All Days</option>
                                {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                                    <option key={day} value={day}>Day {day}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {filteredParticipants.length > 0 ? (
                        <div className="divide-y divide-gray-200">
                            {filteredParticipants.map(p => (
                                <div key={p.id} onClick={() => handleParticipantClick(p, p.sprintId)} className="py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors duration-200">
                                    <div className="flex items-center gap-4">
                                        <img src={p.avatar} alt={p.name} className="h-12 w-12 rounded-full" />
                                        <div>
                                            <p className="font-semibold text-lg text-gray-800">{p.name}</p>
                                            <p className="text-sm text-gray-500">{p.sprintTitle}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 text-right">
                                        <div>
                                            <p className="font-semibold text-gray-800">Day {p.sprintDay}</p>
                                            <p className={`text-sm font-medium ${p.status === 'At risk' ? 'text-yellow-600' : p.status === 'Completed' ? 'text-green-600' : 'text-gray-500'}`}>{p.status}</p>
                                        </div>
                                        <div className="hidden md:block">
                                            <p className="text-sm text-gray-800">Last active</p>
                                            <p className="text-sm text-gray-500">{formatDistanceToNow(p.lastActivity, { addSuffix: true })}</p>
                                        </div>
                                        <div className="text-2xl">
                                          {getSubmissionIcon(p.submissionTypeToday)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <h3 className="text-xl font-semibold text-gray-700">No Participants Found</h3>
                            <p className="text-gray-500 mt-2">Adjust your filters or wait for new participants to join.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CoachParticipants;
