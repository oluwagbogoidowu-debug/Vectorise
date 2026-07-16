import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../services/userService';
import { sprintService } from '../../services/sprintService';
import { Participant, ParticipantSprint, Sprint, UserRole } from '../../types';
import { adminCache } from './adminCache';

export default function AdminUsers() {
    const navigate = useNavigate();
    const [participants, setParticipants] = useState<any[]>([]);
    const [enrollments, setEnrollments] = useState<ParticipantSprint[]>([]);
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [userToDelete, setUserToDelete] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [roleFilter, setRoleFilter] = useState<'active' | 'participant' | 'coach' | 'admin'>('active');

    useEffect(() => {
        if (adminCache.users) {
            setParticipants(adminCache.users.participants);
            setEnrollments(adminCache.users.enrollments);
            setSprints(adminCache.users.sprints);
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [usersData, enrollmentsData, sprintsData] = await Promise.all([
                    userService.getAllUsers(),
                    sprintService.getAllEnrollments(),
                    sprintService.getAdminSprints()
                ]);
                setParticipants(usersData);
                setEnrollments(enrollmentsData);
                setSprints(sprintsData);
                adminCache.users = {
                    participants: usersData,
                    enrollments: enrollmentsData,
                    sprints: sprintsData
                };
            } catch (error) {
                console.error("Error fetching admin users data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleDeleteClick = (e: React.MouseEvent, user: any) => {
        e.stopPropagation(); // prevent clicking on the row which triggers navigate
        setUserToDelete(user);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        try {
            await userService.deleteUserAccount(userToDelete.id);
            // Remove from local state
            setParticipants(prev => prev.filter(u => u.id !== userToDelete.id));
            // Update cache
            if (adminCache.users) {
                adminCache.users.participants = adminCache.users.participants.filter(u => u.id !== userToDelete.id);
            }
            setUserToDelete(null);
        } catch (error) {
            console.error("Error deleting user:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const userStats = useMemo(() => {
        const mapped = participants.map(user => {
            const userEnrollments = enrollments.filter(e => e.user_id === user.id);
            const activeEnrollment = userEnrollments.find(e => e.status === 'active') || userEnrollments[0];
            const sprint = activeEnrollment ? sprints.find(s => s.id === activeEnrollment.sprint_id) : null;
            
            // 1. Inactivity calculation: "In the whole system a user is inactive once it's a day after the last submission of the last task."
            const completedTimestamps = userEnrollments.flatMap(e => 
                (e.progress || [])
                    .filter(p => p.completed && p.completedAt)
                    .map(p => p.completedAt ? new Date(p.completedAt).getTime() : 0)
            ).filter(t => t > 0 && !isNaN(t));

            let lastSubmissionTime: number | null = null;
            if (completedTimestamps.length > 0) {
                lastSubmissionTime = Math.max(...completedTimestamps);
            }

            let isActive = true;
            const oneDay = 24 * 60 * 60 * 1000;

            if (lastSubmissionTime !== null) {
                if (Date.now() - lastSubmissionTime >= oneDay) {
                    isActive = false;
                }
            } else {
                // No submissions at all. Fallback to start dates or joined date.
                const startDates = userEnrollments.map(e => new Date(e.started_at).getTime()).filter(t => !isNaN(t));
                if (startDates.length > 0) {
                    const earliestStart = Math.min(...startDates);
                    if (Date.now() - earliestStart >= oneDay) {
                        isActive = false;
                    }
                } else if (user.createdAt) {
                    const joinedAt = new Date(user.createdAt).getTime();
                    if (!isNaN(joinedAt) && (Date.now() - joinedAt >= oneDay)) {
                        isActive = false;
                    }
                }
            }

            // 2. "No progress when they didn't proceed with a new sprint the next day after they finished the first."
            const completedEnrollments = userEnrollments.filter(e => e.status === 'completed' || e.progress?.every(p => p.completed));
            let isNoProgress = false;
            if (completedEnrollments.length > 0) {
                const sortedCompleted = [...completedEnrollments].sort((a, b) => {
                    const dateA = a.completed_at ? new Date(a.completed_at).getTime() : new Date(a.started_at).getTime();
                    const dateB = b.completed_at ? new Date(b.completed_at).getTime() : new Date(b.started_at).getTime();
                    return dateA - dateB;
                });
                const firstFinished = sortedCompleted[0];
                const finishTime = firstFinished.completed_at ? new Date(firstFinished.completed_at).getTime() : null;

                if (finishTime !== null && !isNaN(finishTime)) {
                    const otherSprints = userEnrollments.filter(e => e.id !== firstFinished.id);
                    const hasProceeded = otherSprints.length > 0;
                    const timeSinceFinish = Date.now() - finishTime;
                    if (!hasProceeded && timeSinceFinish >= oneDay) {
                        isNoProgress = true;
                    }
                }
            }

            const actualCompletionRate = activeEnrollment 
                ? (activeEnrollment.progress.filter(p => p.completed).length / activeEnrollment.progress.length) * 100 
                : 0;
            const rate = isNoProgress ? 0 : actualCompletionRate;

            const actualTasksCompleted = activeEnrollment 
                ? activeEnrollment.progress.filter(p => p.completed).length 
                : 0;
            const tasksCompleted = isNoProgress ? 0 : actualTasksCompleted;

            return {
                ...user,
                activeEnrollment,
                sprintTitle: isNoProgress ? 'No active sprint' : (sprint?.title || 'No active sprint'),
                completionRate: rate,
                tasksCompleted: tasksCompleted,
                totalTasks: activeEnrollment ? activeEnrollment.progress.length : 0,
                isActive,
                isNoProgress,
                hasSprint: userEnrollments.length > 0,
                latestActivityTime: lastSubmissionTime || 
                    (userEnrollments.length > 0 ? Math.max(...userEnrollments.map(e => new Date(e.started_at).getTime()).filter(t => !isNaN(t))) : 0) ||
                    (user.createdAt ? new Date(user.createdAt).getTime() : 0)
            };
        });

        const filtered = mapped.filter(u => {
            const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  u.email.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            if (roleFilter === 'active') {
                return u.isActive;
            } else if (roleFilter === 'participant') {
                return !u.role || u.role === 'participant';
            } else if (roleFilter === 'coach') {
                return u.role === 'coach';
            } else if (roleFilter === 'admin') {
                return u.role === 'admin';
            }
            return true;
        });

        // Multi-tier sorting:
        // Tier 1: Active (isActive === true)
        // Tier 2: Has a sprint but not active
        // Tier 3: No sprint
        // Within each tier, arrange descending by most recent activity timestamp.
        return filtered.sort((a, b) => {
            const getTier = (u: any) => {
                if (u.isActive) return 1;
                if (u.hasSprint) return 2;
                return 3;
            };

            const tierA = getTier(a);
            const tierB = getTier(b);

            if (tierA !== tierB) {
                return tierA - tierB;
            }

            return b.latestActivityTime - a.latestActivityTime;
        });
    }, [participants, enrollments, sprints, searchTerm, roleFilter]);

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
                        className="w-full md:w-80 pl-10 pr-4 py-3 bg-white border border-gray-200 text-gray-900 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-gray-400"
                    />
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Role Filter Tabs */}
            <div className="flex items-center justify-start gap-3 w-full">
                <div className="inline-flex bg-gray-100 p-0.5 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setRoleFilter('active')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                            roleFilter === 'active' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-650'
                        }`}
                    >
                        Active (for all)
                    </button>
                    <button
                        type="button"
                        onClick={() => setRoleFilter('participant')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                            roleFilter === 'participant' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-650'
                        }`}
                    >
                        Participant
                    </button>
                    <button
                        type="button"
                        onClick={() => setRoleFilter('coach')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                            roleFilter === 'coach' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-650'
                        }`}
                    >
                        Coach
                    </button>
                    <button
                        type="button"
                        onClick={() => setRoleFilter('admin')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                            roleFilter === 'admin' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-650'
                        }`}
                    >
                        Admin
                    </button>
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
                                        <div className="relative h-10 w-10 flex-shrink-0">
                                            <div className="h-full w-full rounded-xl bg-gray-100 overflow-hidden border border-gray-100">
                                                {user.profileImageUrl ? (
                                                    <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-gray-400 font-black text-sm">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            {(user.emailVerifiedConfirmed || user.emailVerifiedOverride) && (
                                                <div className="absolute w-[11px] h-[11px] -top-0.5 -right-0.5 bg-[#0E7850] text-white rounded-full flex items-center justify-center ring-1 ring-white shadow-sm z-10">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" className="w-[6px] h-[6px]">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                                <p className="text-sm font-black text-gray-900 leading-none">{user.name}</p>
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-400">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-gray-700 italic">{user.sprintTitle}</p>
                                        {user.activeEnrollment && (
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                Day {user.activeEnrollment.progress.find((p: any) => !p.completed)?.day || user.activeEnrollment.progress.length} of {user.activeEnrollment.progress.length}
                                            </p>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    {user.isNoProgress ? (
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-32 h-1 bg-red-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-red-400 rounded-full" style={{ width: '0%' }}></div>
                                            </div>
                                            <p className="text-[7px] font-black text-red-500 uppercase tracking-widest animate-pulse">
                                                No Progress (Pending New Sprint)
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="flex gap-1">
                                                {user.activeEnrollment?.progress.map((p: any, i: number) => (
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
                                    )}
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center justify-end gap-3">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                            user.isActive 
                                                 ? 'bg-green-50 text-green-600' 
                                                 : 'bg-gray-50 text-gray-400'
                                        }`}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                        <button
                                            onClick={(e) => handleDeleteClick(e, user)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer animate-fade-in"
                                            title="Delete User Account"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
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
                            <div className="relative h-12 w-12 flex-shrink-0">
                                <div className="h-full w-full rounded-2xl bg-gray-100 overflow-hidden border border-gray-100">
                                    {user.profileImageUrl ? (
                                        <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-gray-400 font-black text-lg">
                                            {user.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                {(user.emailVerifiedConfirmed || user.emailVerifiedOverride) && (
                                    <div className="absolute w-[12px] h-[12px] -top-0.5 -right-0.5 bg-[#0E7850] text-white rounded-full flex items-center justify-center ring-1 ring-white shadow-sm z-10">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" className="w-[7px] h-[7px]">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <p className="text-base font-black text-gray-900 truncate leading-none">{user.name}</p>
                                </div>
                                <p className="text-[10px] font-bold text-gray-400 truncate">{user.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                    user.isActive 
                                        ? 'bg-green-50 text-green-600' 
                                        : 'bg-gray-50 text-gray-400'
                                }`}>
                                    {user.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <button
                                    onClick={(e) => handleDeleteClick(e, user)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete User Account"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {user.isNoProgress ? (
                            <div className="pt-4 border-t border-gray-50 space-y-2">
                                <div className="flex justify-between items-center">
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Present Sprint</p>
                                    <p className="text-[8px] font-black text-red-500 uppercase tracking-widest animate-pulse">Pending New Sprint</p>
                                </div>
                                <p className="text-xs font-black text-gray-700 italic truncate">No active sprint</p>
                                <div className="w-full h-1.5 bg-red-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-400 rounded-full" style={{ width: '0%' }}></div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Present Sprint</p>
                                        <p className="text-xs font-black text-gray-700 italic truncate">{user.sprintTitle}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Completion</p>
                                        <div className="flex justify-end gap-0.5 mt-1">
                                            {user.activeEnrollment?.progress.map((p: any, i: number) => (
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
                            </>
                        )}
                    </div>
                ))}
            </div>

            {userStats.length === 0 && (
                <div className="py-20 text-center bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-200">
                    <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic">No matching participants found.</p>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl border border-gray-100 animate-scale-up text-left">
                        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight mb-2">Delete User Account?</h3>
                        <p className="text-xs text-gray-500 font-semibold leading-relaxed mb-6">
                            Are you absolutely sure you want to delete <strong className="text-gray-900">{userToDelete.name}</strong> ({userToDelete.email})? 
                            <br />
                            <span className="text-red-500 font-bold mt-2 block">
                                ⚠️ This action is irreversible and will delete their profile, progress, enrollments, posts, transactions, and all other associated database records.
                            </span>
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setUserToDelete(null)}
                                disabled={isDeleting}
                                className="px-5 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="px-5 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <span>Delete Account</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
