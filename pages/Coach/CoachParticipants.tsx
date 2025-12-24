
import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_PARTICIPANT_SPRINTS, MOCK_USERS, MOCK_SPRINTS } from '../../services/mockData';
import { Participant, Sprint, UserRole } from '../../types';

interface ParticipantWithSprint extends Participant {
    sprintTitle: string;
    sprintId: string;
}

const CoachParticipants: React.FC = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');

    const activeParticipants = useMemo((): ParticipantWithSprint[] => {
        if (!user || user.role !== UserRole.COACH) return [];

        // 1. Find sprints for the current coach
        const coachSprints = MOCK_SPRINTS.filter(s => s.coachId === user.id);
        const coachSprintIds = coachSprints.map(s => s.id);

        // 2. Find all participant sprint entries for those sprints
        const sprintParticipants = MOCK_PARTICIPANT_SPRINTS.filter(ps => coachSprintIds.includes(ps.sprintId));

        // 3. Enrich participant data with sprint and user info
        const participants = sprintParticipants.map(ps => {
            const participantUser = MOCK_USERS.find(u => u.id === ps.participantId) as Participant | undefined;
            const sprint = coachSprints.find(s => s.id === ps.sprintId);
            
            if (!participantUser || participantUser.role !== UserRole.PARTICIPANT || !sprint) {
                return null;
            }

            return {
                ...participantUser,
                sprintTitle: sprint.title,
                sprintId: sprint.id
            };
        }).filter((p): p is ParticipantWithSprint => p !== null);

        return participants;

    }, [user]);

    const filteredParticipants = useMemo(() => {
        if (!searchTerm) return activeParticipants;
        return activeParticipants.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sprintTitle.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [activeParticipants, searchTerm]);

    const participantsBySprint = useMemo(() => {
        return filteredParticipants.reduce((acc, participant) => {
            const { sprintTitle, sprintId } = participant;
            if (!acc[sprintId]) {
                acc[sprintId] = {
                    title: sprintTitle,
                    participants: [],
                };
            }
            acc[sprintId].participants.push(participant);
            return acc;
        }, {} as Record<string, { title: string, participants: Participant[] }>);
    }, [filteredParticipants]);

    if (!user) return null;

    return (
        <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Your Participants</h1>
                    <p className="text-gray-500 mt-1">See who's actively participating in your sprints.</p>
                </div>
            </div>

            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search participants or sprints..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-lg pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
            </div>
            
            {Object.keys(participantsBySprint).length > 0 ? (
                <div className="space-y-8">
                    {Object.entries(participantsBySprint).map(([sprintId, sprintGroup]) => (
                        <div key={sprintId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-5 bg-gray-50/50 border-b border-gray-100">
                                <h2 className="text-xl font-bold text-gray-800">{sprintGroup.title}</h2>
                                <p className="text-sm text-gray-500">{sprintGroup.participants.length} active participant(s)</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-5">
                                {sprintGroup.participants.map(p => (
                                    <div key={p.id} className="bg-white p-4 rounded-lg border border-gray-200/80 hover:shadow-md transition-shadow flex items-center gap-4">
                                        <img src={p.profileImageUrl} alt={p.name} className="w-14 h-14 rounded-full object-cover border-2 border-white ring-2 ring-gray-200" />
                                        <div>
                                            <h3 className="font-bold text-gray-900">{p.name}</h3>
                                            <p className="text-sm text-gray-500">{p.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-semibold text-gray-700">No Active Participants</h3>
                    <p className="text-gray-500 mt-2">When participants join your sprints, they will appear here.</p>
                </div>
            )}
        </div>
    );
};

export default CoachParticipants;
