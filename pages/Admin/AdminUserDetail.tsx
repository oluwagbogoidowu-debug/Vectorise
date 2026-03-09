import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userService } from '../../services/userService';
import { sprintService } from '../../services/sprintService';
import { Participant, ParticipantSprint, Sprint } from '../../types';
import { ArrowLeft, Calendar, Mail, User as UserIcon, Zap, Target, Clock, AlertCircle } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

export default function AdminUserDetail() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<Participant | null>(null);
    const [enrollments, setEnrollments] = useState<ParticipantSprint[]>([]);
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return;
            setIsLoading(true);
            try {
                const [userData, enrollmentsData, sprintsData] = await Promise.all([
                    userService.getUserDocument(userId),
                    sprintService.getUserEnrollments(userId),
                    sprintService.getAdminSprints()
                ]);
                setUser(userData as Participant);
                setEnrollments(enrollmentsData);
                setSprints(sprintsData);
            } catch (error) {
                console.error("Error fetching user detail:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [userId]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-light">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-light p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-2xl font-black text-gray-900 italic">User not found.</h2>
                <button 
                    onClick={() => navigate('/admin/dashboard')}
                    className="mt-6 px-6 py-3 bg-primary text-white font-black rounded-2xl shadow-lg hover:scale-105 transition-transform"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    const activeEnrollment = enrollments.find(e => e.status === 'active');
    const sortedEnrollments = [...enrollments].sort((a, b) => 
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
    
    const lastCompletedEnrollment = enrollments
        .filter(e => e.status === 'completed')
        .sort((a, b) => {
            const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
            const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
            return dateB - dateA;
        })[0];

    // Inactivity logic
    let inactivityWarning = null;
    if (activeEnrollment) {
        const lastActivity = activeEnrollment.last_activity_at ? parseISO(activeEnrollment.last_activity_at) : parseISO(activeEnrollment.started_at);
        const daysSinceLastActivity = differenceInDays(new Date(), lastActivity);
        if (daysSinceLastActivity >= 1) {
            inactivityWarning = `${daysSinceLastActivity} day${daysSinceLastActivity > 1 ? 's' : ''} inactive in current sprint`;
        }
    } else if (lastCompletedEnrollment && lastCompletedEnrollment.completed_at) {
        const daysSinceLastSprint = differenceInDays(new Date(), parseISO(lastCompletedEnrollment.completed_at));
        if (daysSinceLastSprint > 0) {
            inactivityWarning = `${daysSinceLastSprint} day${daysSinceLastSprint > 1 ? 's' : ''} without a new sprint`;
        }
    }

    const getSprintTitle = (sprintId: string) => {
        return sprints.find(s => s.id === sprintId)?.title || 'Unknown Sprint';
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => navigate(-1)}
                                className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-gray-900"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-xl font-black text-gray-900 italic">User Profile.</h1>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Administrative View</p>
                            </div>
                        </div>
                        {inactivityWarning && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl border border-red-100 animate-pulse">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{inactivityWarning}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: Profile Card */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                            <div className="flex flex-col items-center text-center">
                                <div className="h-32 w-32 rounded-[2rem] bg-gray-100 overflow-hidden border-4 border-white shadow-xl mb-6">
                                    {user.profileImageUrl ? (
                                        <img src={user.profileImageUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-gray-300 font-black text-4xl">
                                            {user.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 leading-tight">{user.name}</h2>
                                <p className="text-sm font-bold text-gray-400 mt-1">{user.email}</p>
                                <div className="mt-4 inline-flex items-center px-4 py-1.5 bg-gray-50 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    @{user.persona || 'participant'}
                                </div>
                            </div>

                            <div className="mt-10 space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                        <Target className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Stage</p>
                                        <p className="text-sm font-bold text-gray-900">{user.currentStage || 'Foundation'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Joined Vectorise</p>
                                        <p className="text-sm font-bold text-gray-900">{format(parseISO(user.createdAt), 'MMMM d, yyyy')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Login</p>
                                        <p className="text-sm font-bold text-gray-900">
                                            {user.lastLoginAt 
                                                ? format(parseISO(user.lastLoginAt), 'MMM d, h:mm a')
                                                : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Activity</p>
                                        <p className="text-sm font-bold text-gray-900">
                                            {enrollments[0]?.last_activity_at 
                                                ? format(parseISO(enrollments[0].last_activity_at), 'MMM d, h:mm a')
                                                : 'No recent activity'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* User Goal Section */}
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <Target className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-black text-gray-900 italic">User Goal.</h3>
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Focus Areas</p>
                                    <div className="flex flex-wrap gap-2">
                                        {user.interests?.map((interest, idx) => (
                                            <span key={idx} className="px-3 py-1.5 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg">
                                                {interest}
                                            </span>
                                        )) || <p className="text-xs font-bold text-gray-400 italic">No interests selected</p>}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Growth Focus</p>
                                    <div className="flex flex-wrap gap-2">
                                        {user.growthAreas?.map((area, idx) => (
                                            <span key={idx} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">
                                                {area}
                                            </span>
                                        )) || <p className="text-xs font-bold text-gray-400 italic">No growth areas defined</p>}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Career / Business Focus</p>
                                    <p className="text-sm font-bold text-gray-700 leading-relaxed">
                                        {user.occupation || 'Not specified'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bio / Intention</p>
                                    <p className="text-sm font-bold text-gray-700 leading-relaxed italic">
                                        "{user.bio || 'No bio provided.'}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sprint History */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <Zap className="w-5 h-5 text-primary" />
                                    <h3 className="text-lg font-black text-gray-900 italic">Sprint History.</h3>
                                </div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    {enrollments.length} Total Sprints
                                </span>
                            </div>

                            <div className="space-y-6">
                                {sortedEnrollments.length > 0 ? (
                                    sortedEnrollments.map((enrollment, idx) => {
                                        const completionRate = (enrollment.progress.filter(p => p.completed).length / enrollment.progress.length) * 100;
                                        const isCurrent = enrollment.status === 'active';
                                        
                                        return (
                                            <div 
                                                key={enrollment.id}
                                                className={`p-6 rounded-3xl border transition-all ${
                                                    isCurrent 
                                                        ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10' 
                                                        : 'bg-gray-50/50 border-gray-100'
                                                }`}
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                                                            isCurrent ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white text-gray-400'
                                                        }`}>
                                                            <Zap className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-base font-black text-gray-900">{getSprintTitle(enrollment.sprint_id)}</h4>
                                                                {isCurrent && (
                                                                    <span className="px-2 py-0.5 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded-md">Active</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                                                Started {format(parseISO(enrollment.started_at), 'MMM d, yyyy')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-black text-gray-900 leading-none">{Math.round(completionRate)}%</p>
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Completion</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="bg-white/50 p-3 rounded-2xl border border-gray-100/50">
                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                                        <p className="text-xs font-black text-gray-700 uppercase tracking-widest">{enrollment.status}</p>
                                                    </div>
                                                    <div className="bg-white/50 p-3 rounded-2xl border border-gray-100/50">
                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Last Activity</p>
                                                        <p className="text-xs font-black text-gray-700">
                                                            {enrollment.last_activity_at 
                                                                ? format(parseISO(enrollment.last_activity_at), 'MMM d')
                                                                : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Daily Progress</p>
                                                        <div className="flex gap-1">
                                                            {enrollment.progress.map((p, i) => (
                                                                <div 
                                                                    key={i}
                                                                    className={`flex-1 h-2 rounded-sm ${p.completed ? 'bg-primary' : 'bg-gray-200'}`}
                                                                    title={`Day ${p.day}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-12 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic">No sprint history found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
