import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../services/userService';
import { sprintService } from '../../services/sprintService';
import { Participant, ParticipantSprint, Sprint } from '../../types';

export default function AdminUsers() {
    const navigate = useNavigate();
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [enrollments, setEnrollments] = useState<ParticipantSprint[]>([]);
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [usersData, enrollmentsData, sprintsData] = await Promise.all([
                    userService.getParticipants(),
                    sprintService.getAllEnrollments(),
                    sprintService.getAdminSprints()
                ]);
                setParticipants(usersData);
                setEnrollments(enrollmentsData);
                setSprints(sprintsData);
            } catch (error) {
                console.error("Error fetching admin users data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const userStats = useMemo(() => {
        return participants.map(user => {
            const userEnrollments = enrollments.filter(e => e.user_id === user.id);
            const activeEnrollment = userEnrollments.find(e => e.status === 'active') || userEnrollments[0];
            const sprint = activeEnrollment ? sprints.find(s => s.id === activeEnrollment.sprint_id) : null;
            
            return {
                ...user,
                activeEnrollment,
                sprintTitle: sprint?.title || 'No active sprint',
                completionRate: activeEnrollment 
                    ? (activeEnrollment.progress.filter(p => p.completed).length / activeEnrollment.progress.length) * 100 
                    : 0,
                tasksCompleted: activeEnrollment 
                    ? activeEnrollment.progress.filter(p => p.completed).length 
                    : 0,
                totalTasks: activeEnrollment ? activeEnrollment.progress.length : 0
            };
        }).filter(u => 
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [participants, enrollments, sprints, searchTerm]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 italic">User Directory.</h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                        Monitoring {participants.length} participants across the ecosystem
                    </p>
                </div>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Search by name or email..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-80 pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">User</th>
                            <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Present Sprint</th>
                            <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Progress</th>
                            <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {userStats.map(user => (
                            <tr 
                                key={user.id} 
                                onClick={() => navigate(`/admin/user/${user.id}`)}
                                className="hover:bg-gray-50/30 transition-colors group cursor-pointer"
                            >
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                                            {user.profileImageUrl ? (
                                                <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-gray-400 font-black text-sm">
                                                    {user.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900 leading-none mb-1">{user.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-gray-700 italic">{user.sprintTitle}</p>
                                        {user.activeEnrollment && (
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                Day {user.activeEnrollment.progress.find(p => !p.completed)?.day || user.activeEnrollment.progress.length} of {user.activeEnrollment.progress.length}
                                            </p>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="flex gap-1">
                                            {user.activeEnrollment?.progress.map((p, i) => (
                                                <div 
                                                    key={i}
                                                    className={`w-2 h-2 rounded-sm ${p.completed ? 'bg-primary' : 'bg-gray-100'}`}
                                                    title={`Day ${p.day}: ${p.completed ? 'Completed' : 'Pending'}`}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-32 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-primary rounded-full transition-all duration-500" 
                                                    style={{ width: `${user.completionRate}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                                                {user.tasksCompleted}/{user.totalTasks} Tasks
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                        user.activeEnrollment?.status === 'active' 
                                            ? 'bg-green-50 text-green-600' 
                                            : 'bg-gray-50 text-gray-400'
                                    }`}>
                                        {user.activeEnrollment?.status || 'Inactive'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile List View */}
            <div className="lg:hidden space-y-4">
                {userStats.map(user => (
                    <div 
                        key={user.id} 
                        onClick={() => navigate(`/admin/user/${user.id}`)}
                        className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4 cursor-pointer active:scale-[0.98] transition-transform"
                    >
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                                {user.profileImageUrl ? (
                                    <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-gray-400 font-black text-lg">
                                        {user.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-black text-gray-900 truncate leading-none mb-1">{user.name}</p>
                                <p className="text-[10px] font-bold text-gray-400 truncate">{user.email}</p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                user.activeEnrollment?.status === 'active' 
                                    ? 'bg-green-50 text-green-600' 
                                    : 'bg-gray-50 text-gray-400'
                            }`}>
                                {user.activeEnrollment?.status || 'Inactive'}
                            </span>
                        </div>

                        <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Present Sprint</p>
                                <p className="text-xs font-black text-gray-700 italic truncate">{user.sprintTitle}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Completion</p>
                                <div className="flex justify-end gap-0.5 mt-1">
                                    {user.activeEnrollment?.progress.map((p, i) => (
                                        <div 
                                            key={i}
                                            className={`w-1.5 h-1.5 rounded-sm ${p.completed ? 'bg-primary' : 'bg-gray-100'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-primary rounded-full transition-all duration-500" 
                                style={{ width: `${user.completionRate}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

            {userStats.length === 0 && (
                <div className="py-20 text-center bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-200">
                    <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic">No matching participants found.</p>
                </div>
            )}
        </div>
    );
}
