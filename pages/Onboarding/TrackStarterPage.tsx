import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import { trackService } from '../../services/trackService';
import { Track } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';

export const TrackStarterPage: React.FC = () => {
    const { trackId } = useParams<{ trackId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const [track, setTrack] = useState<Track | null>((location.state as any)?.previewTrack || null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeOptionIndex, setActiveOptionIndex] = useState<number | null>(null);
    const [isResolving, setIsResolving] = useState(false);

    const cleanTrackId = useMemo(() => {
        if (!trackId) return '';
        try {
            return decodeURIComponent(trackId).trim();
        } catch {
            return trackId.trim();
        }
    }, [trackId]);

    useEffect(() => {
        const loadTrack = async () => {
            if (!cleanTrackId) {
                setIsLoading(false);
                return;
            }

            try {
                let fetchedTrack: Track | null = (location.state as any)?.previewTrack || null;
                if (!fetchedTrack) {
                    fetchedTrack = await trackService.getTrackById(cleanTrackId);
                }
                if (!fetchedTrack) {
                    const allTracks = await trackService.getAllTracks().catch(() => []);
                    fetchedTrack = allTracks.find(t => t.id === cleanTrackId || t.id.toLowerCase() === cleanTrackId.toLowerCase()) || null;
                }
                setTrack(fetchedTrack);
            } catch (err) {
                console.error("Failed to load track starter:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadTrack();
    }, [cleanTrackId, location.state]);

    const starterQuestion = track?.starterQuestion?.question || "Where are you right now?";
    const pollOptions = track?.starterQuestion?.pollOptions && track.starterQuestion.pollOptions.length > 0
        ? track.starterQuestion.pollOptions
        : [
            "I want to build a solid foundation",
            "I want to scale my daily execution",
            "I need structured clarity and momentum"
        ];

    const handleSelectOption = (idx: number, optionText: string) => {
        if (!track || isResolving) return;

        setActiveOptionIndex(idx);
        setIsResolving(true);

        // Resolve connected sprint
        const links = track.starterQuestion?.pollSprintLinks || {};
        let connectedSprintId = links[idx.toString()] || links[optionText];

        // If no link explicitly specified, resolve to sprint in track
        if (!connectedSprintId && track.sprintIds && track.sprintIds.length > 0) {
            connectedSprintId = track.sprintIds[idx % track.sprintIds.length] || track.sprintIds[0];
        }

        setTimeout(() => {
            if (connectedSprintId) {
                navigate(`/track-start-here/${track.id}/${connectedSprintId}`, {
                    state: {
                        trackId: track.id,
                        sprintId: connectedSprintId,
                        selectedOption: optionText,
                        previewTrack: track
                    }
                });
            } else {
                // Fallback to discover or dashboard if track has no sprints
                navigate(`/track/${track.id}`, {
                    state: {
                        previewTrack: track
                    }
                });
            }
        }, 280);
    };

    if (isLoading) {
        return (
            <div className="bg-primary min-h-screen text-white flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans">
                <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mt-4">Loading Starter...</p>
                </div>
            </div>
        );
    }

    if (!track) {
        return (
            <div className="bg-primary min-h-screen text-white flex flex-col justify-center items-center px-4 py-8 text-center">
                <LocalLogo type="white" className="h-6 w-auto mb-8 opacity-40" />
                <h1 className="text-xl font-black mb-4">Track Not Found</h1>
                <p className="text-xs text-white/60 mb-6 max-w-xs">We couldn't load the requested track starter.</p>
                <button
                    onClick={() => navigate('/discover')}
                    className="px-6 py-3 bg-white text-primary text-xs font-black uppercase tracking-wider rounded-2xl"
                >
                    Browse Registry
                </button>
            </div>
        );
    }

    return (
        <div className="bg-primary min-h-screen text-white flex flex-col justify-between items-center px-4 py-8 sm:py-12 relative overflow-hidden font-sans select-none">
            {/* Top Navigation */}
            <div className="w-full max-w-[340px] sm:max-w-[420px] flex items-center justify-between z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                    title="Go Back"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <LocalLogo type="white" className="h-5 w-auto opacity-40" />
                <div className="w-8" />
            </div>

            {/* Main Content */}
            <main className="w-full max-w-[340px] sm:max-w-[420px] my-auto py-6 z-10 animate-fade-in space-y-8 text-center">
                <div className="space-y-3">
                    <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-[0.25em] text-white/80 border border-white/10">
                        {track.title}
                    </span>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight italic">
                        {starterQuestion}
                    </h1>
                    <p className="text-[11px] font-semibold text-white/60">
                        Select an option to find the best sprint to kick off your track.
                    </p>
                </div>

                <div className="w-full space-y-3 pt-2">
                    {pollOptions.map((option, idx) => {
                        const isSelected = activeOptionIndex === idx;

                        return (
                            <button
                                key={idx}
                                onClick={() => handleSelectOption(idx, option)}
                                disabled={isResolving}
                                className={`w-full group relative overflow-hidden py-4 sm:py-5 px-6 rounded-2xl transition-all duration-300 border flex items-center justify-center cursor-pointer text-left ${
                                    isSelected
                                        ? 'bg-white border-white scale-[1.02] shadow-2xl'
                                        : 'bg-white/5 border-white/10 hover:bg-white/15 hover:border-white/25 active:scale-[0.99]'
                                }`}
                            >
                                <span className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.12em] transition-colors leading-relaxed block ${
                                    isSelected ? 'text-primary' : 'text-white'
                                }`}>
                                    {option}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full text-center pb-2 opacity-20 z-10">
                <p className="text-[9px] font-black uppercase tracking-[0.3em]">GET 1% BETTER DAILY</p>
            </footer>

            <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>
        </div>
    );
};

export default TrackStarterPage;
