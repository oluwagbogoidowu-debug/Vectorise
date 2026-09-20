import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import { sprintService } from '../../services/sprintService';
import { trackService } from '../../services/trackService';
import { userService } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import { Sprint, Coach, Track } from '../../types';
import SprintCard from '../../components/SprintCard';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export const TrackStartHerePage: React.FC = () => {
    const { trackId, sprintId } = useParams<{ trackId: string; sprintId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [track, setTrack] = useState<Track | null>(null);
    const [fetchedCoach, setFetchedCoach] = useState<Coach | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isStarting, setIsStarting] = useState(false);

    const vectoriseCoach: Coach = useMemo(() => ({
        id: 'vectorise-coach-system',
        name: 'The Vectorise Team',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        title: 'Master Coach',
        bio: 'Leading behavioral scientists and high-performance curators at Vectorise.',
        role: 'coach' as any,
        email: 'system@vectorise.app',
        createdAt: new Date().toISOString(),
        niche: 'Behavioral Science',
        approved: true,
        profileImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
    }), []);

    const cleanTrackId = useMemo(() => {
        if (!trackId) return '';
        try {
            return decodeURIComponent(trackId).trim();
        } catch {
            return trackId.trim();
        }
    }, [trackId]);

    const cleanSprintId = useMemo(() => {
        const sid = sprintId || location.state?.sprintId;
        if (!sid) return '';
        try {
            return decodeURIComponent(sid).trim();
        } catch {
            return sid.trim();
        }
    }, [sprintId, location.state?.sprintId]);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                if (cleanTrackId) {
                    let t: Track | null = (location.state as any)?.previewTrack || null;
                    if (!t) {
                        t = await trackService.getTrackById(cleanTrackId);
                    }
                    if (!t) {
                        const allTracks = await trackService.getAllTracks().catch(() => []);
                        t = allTracks.find(item => item.id === cleanTrackId || item.id.toLowerCase() === cleanTrackId.toLowerCase()) || null;
                    }
                    setTrack(t);
                }

                if (cleanSprintId) {
                    let s = await sprintService.getSprintById(cleanSprintId);
                    if (!s) {
                        const allPublished = await sprintService.getPublishedSprints().catch(() => []);
                        s = allPublished.find(item => item.id === cleanSprintId || item.id.toLowerCase() === cleanSprintId.toLowerCase()) || null;
                    }
                    if (!s) {
                        const allAdmin = await sprintService.getAdminSprints().catch(() => []);
                        s = allAdmin.find(item => item.id === cleanSprintId || item.id.toLowerCase() === cleanSprintId.toLowerCase()) || null;
                    }

                    if (s) {
                        setSprint(s);
                        if (s.coachId) {
                            try {
                                const coachData = await userService.getUserDocument(s.coachId);
                                setFetchedCoach((coachData as Coach) || vectoriseCoach);
                            } catch {
                                setFetchedCoach(vectoriseCoach);
                            }
                        } else {
                            setFetchedCoach(vectoriseCoach);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load track start here data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [cleanTrackId, cleanSprintId, location.state, vectoriseCoach]);

    const handleContinue = async () => {
        if (!sprint) return;
        setIsStarting(true);

        const targetSprintId = sprint.id;

        if (user) {
            try {
                // If user is logged in, check for existing enrollments or activate this sprint
                const enrollments = await sprintService.getUserEnrollments(user.id);
                const existing = enrollments.find(e => e.sprint_id === targetSprintId);

                if (existing) {
                    // Activate if queued and user is ready to begin
                    if (existing.status !== 'active') {
                        await sprintService.updateEnrollment(existing.id, { status: 'active' });
                    }
                    navigate(`/participant/sprint/${existing.id}`);
                    return;
                }

                // If not enrolled yet, create active enrollment
                const newEnrollmentId = `enrollment_${user.id}_${targetSprintId}`;
                await sprintService.enrollUser(
                    user.id,
                    targetSprintId,
                    sprint.duration || 7,
                    {
                        coachId: sprint.coachId || 'vectorise',
                        pricePaid: 0,
                        currency: sprint.currency || 'NGN',
                        source: 'track_bundle' as any
                    }
                );
                navigate(`/participant/sprint/${newEnrollmentId}`);
            } catch (err) {
                console.error("Failed to enroll in starter sprint:", err);
                navigate(`/participant/sprint/enrollment_${user.id}_${targetSprintId}`);
            } finally {
                setIsStarting(false);
            }
        } else {
            // Guest -> Login or register and land directly on sprint
            navigate(`/signup?redirect=/participant/sprint/enrollment_${targetSprintId}&sprintId=${targetSprintId}`);
        }
    };

    return (
        <div className="flex flex-col min-h-screen w-full items-center justify-between p-6 bg-primary text-white relative overflow-hidden selection:bg-white/10">
            {/* Header */}
            <header className="w-full max-w-[340px] sm:max-w-[380px] z-10 flex items-center justify-between pt-2">
                <button
                    onClick={() => trackId ? navigate(`/track-starter/${trackId}`) : navigate(-1)}
                    className="group flex items-center text-white/60 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer"
                >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1.5 group-hover:-translate-x-0.5 transition-transform" />
                    Refine Choice
                </button>
                <LocalLogo type="white" className="h-5 w-auto opacity-40" />
            </header>

            {/* Main Content */}
            <main className="w-full max-w-[340px] sm:max-w-[380px] my-auto py-6 z-10 animate-fade-in space-y-6 text-center">
                <div className="space-y-2">
                    {track && (
                        <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-[0.25em] text-white/80 border border-white/10 mb-1">
                            {track.title}
                        </span>
                    )}
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                        Start here
                    </h1>
                    <p className="text-xs text-white/70 font-medium px-2">
                        Your personalized starting sprint based on your focus.
                    </p>
                </div>

                <div className="w-full text-left">
                    {isLoading ? (
                        <div className="py-20 flex justify-center items-center">
                            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        </div>
                    ) : sprint ? (
                        <SprintCard
                            sprint={sprint}
                            coach={fetchedCoach || vectoriseCoach}
                            isStatic={true}
                            hideFooterDetails={true}
                            variant="glass"
                        />
                    ) : (
                        <div className="p-8 text-center bg-white/10 rounded-2xl border border-white/20">
                            <p className="text-xs font-bold text-white/80">Unable to load starting sprint card.</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleContinue}
                    disabled={isLoading || !sprint || isStarting}
                    className="w-full py-5 bg-white text-primary font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isStarting ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <>
                            Continue
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </main>

            {/* Footer */}
            <footer className="w-full text-center pb-4 opacity-20 z-10">
                <p className="text-[9px] font-black uppercase tracking-[0.3em]">GET 1% BETTER DAILY</p>
            </footer>

            <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>
        </div>
    );
};

export default TrackStartHerePage;
