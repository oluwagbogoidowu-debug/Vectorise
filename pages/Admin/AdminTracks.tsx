
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Track, Sprint } from '../../types';
import { trackService } from '../../services/trackService';
import { sprintService } from '../../services/sprintService';
import Button from '../../components/Button';
import { Edit2, Trash2, Eye, Package, AlertTriangle, Copy, Check, Sparkles, CalendarClock, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { adminCache } from './adminCache';
import { getSprintCashPrice } from '../../utils/sprintUtils';
import {
    LaunchConfigModal,
    LaunchConfigPayload,
    GoingLiveSetupFields,
    defaultLaunchIsoDate,
    validateLaunchConfig,
} from '../../components/LaunchConfigModal';
import { getRemainingSlots } from '../../services/launchService';

const AdminTracks: React.FC = () => {
    const navigate = useNavigate();
    const [tracks, setTracks] = useState<Track[]>([]);
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [launchConfigTrack, setLaunchConfigTrack] = useState<Track | null>(null);
    const [activeTab, setActiveTab] = useState<'tracks' | 'settings'>('tracks');
    const [selectedSettingsTrackId, setSelectedSettingsTrackId] = useState<string>('');
    const [inlineLaunchConfig, setInlineLaunchConfig] = useState<LaunchConfigPayload>({
        isComingSoon: false,
        launchDate: defaultLaunchIsoDate(),
        preRegistrationEnabled: false,
        hasLimitedSlots: false,
        slotLimit: 50,
    });
    const [inlineLaunchError, setInlineLaunchError] = useState<string>('');
    const [isSavingInlineLaunch, setIsSavingInlineLaunch] = useState(false);
    const [inlineLaunchSaved, setInlineLaunchSaved] = useState(false);

    const handleCopyLink = async (trackId: string) => {
        const url = `${window.location.origin}/track/${trackId}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopiedId(trackId);
            toast.success('Track link copied to clipboard!');
            setTimeout(() => {
                setCopiedId((prev) => (prev === trackId ? null : prev));
            }, 2000);
        } catch (error) {
            console.error('Failed to copy track link:', error);
            toast.error('Failed to copy track link');
        }
    };

    const handleDelete = async (id: string) => {
        setIsDeleting(true);
        try {
            await trackService.deleteTrack(id);
            toast.success('Track deleted successfully');
            const updatedTracks = tracks.filter(t => t.id !== id);
            setTracks(updatedTracks);
            if (adminCache.tracks) {
                adminCache.tracks.tracks = updatedTracks;
            }
            setDeletingId(null);
        } catch (error) {
            console.error('Error deleting track:', error);
            toast.error('Failed to delete track');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSaveLaunchConfig = async (config: LaunchConfigPayload) => {
        if (!launchConfigTrack) return;
        await trackService.updateTrack(launchConfigTrack.id, {
            isComingSoon: config.isComingSoon,
            launchDate: config.launchDate,
            preRegistrationEnabled: config.preRegistrationEnabled,
            hasLimitedSlots: config.hasLimitedSlots,
            slotLimit: config.slotLimit,
        });
        const updatedTracks = tracks.map((t) =>
            t.id === launchConfigTrack.id ? { ...t, ...config } : t
        );
        setTracks(updatedTracks);
        if (adminCache.tracks) {
            adminCache.tracks.tracks = updatedTracks;
        }
        toast.success(
            config.isComingSoon
                ? `${launchConfigTrack.title} set to Going Live Soon`
                : `${launchConfigTrack.title} is back to standard launch mode`
        );
    };

    useEffect(() => {
        let hasCache = false;
        if (adminCache.tracks) {
            setTracks(adminCache.tracks.tracks);
            setSprints(adminCache.tracks.sprints);
            setIsLoading(false);
            hasCache = true;
        }
        if (!hasCache) {
            setIsLoading(true);
        }
        const unsubscribeTracks = trackService.subscribeToTracks((data) => {
            setTracks(data);
            adminCache.tracks = {
                tracks: data,
                sprints: adminCache.tracks?.sprints || [],
            };
            setIsLoading(false);
        });
        const unsubscribeSprints = sprintService.subscribeToAdminSprints((data) => {
            setSprints(data);
            adminCache.tracks = {
                tracks: adminCache.tracks?.tracks || [],
                sprints: data,
            };
        });
        return () => {
            unsubscribeTracks();
            unsubscribeSprints();
        };
    }, []);

    const selectedSettingsTrack = useMemo(
        () => tracks.find((t) => t.id === selectedSettingsTrackId) || tracks[0] || null,
        [tracks, selectedSettingsTrackId]
    );

    useEffect(() => {
        if (!selectedSettingsTrackId && tracks.length > 0) {
            setSelectedSettingsTrackId(tracks[0].id);
        }
    }, [tracks, selectedSettingsTrackId]);

    useEffect(() => {
        if (!selectedSettingsTrack) return;
        setInlineLaunchConfig({
            isComingSoon: Boolean(selectedSettingsTrack.isComingSoon),
            launchDate: selectedSettingsTrack.launchDate || defaultLaunchIsoDate(),
            preRegistrationEnabled: Boolean(selectedSettingsTrack.preRegistrationEnabled),
            hasLimitedSlots: Boolean(selectedSettingsTrack.hasLimitedSlots),
            slotLimit:
                selectedSettingsTrack.slotLimit && Number(selectedSettingsTrack.slotLimit) > 0
                    ? Number(selectedSettingsTrack.slotLimit)
                    : 50,
        });
        setInlineLaunchError('');
    }, [selectedSettingsTrack?.id]);

    const handleSaveInlineLaunchSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSettingsTrack) return;
        const validationErr = validateLaunchConfig(inlineLaunchConfig);
        if (validationErr) {
            setInlineLaunchError(validationErr);
            return;
        }

        setInlineLaunchError('');
        setIsSavingInlineLaunch(true);
        setInlineLaunchSaved(false);
        try {
            const payload: LaunchConfigPayload = {
                isComingSoon: inlineLaunchConfig.isComingSoon,
                launchDate: inlineLaunchConfig.launchDate,
                preRegistrationEnabled: inlineLaunchConfig.isComingSoon
                    ? inlineLaunchConfig.preRegistrationEnabled
                    : false,
                hasLimitedSlots:
                    inlineLaunchConfig.isComingSoon && inlineLaunchConfig.preRegistrationEnabled
                        ? inlineLaunchConfig.hasLimitedSlots
                        : false,
                slotLimit:
                    inlineLaunchConfig.isComingSoon &&
                    inlineLaunchConfig.preRegistrationEnabled &&
                    inlineLaunchConfig.hasLimitedSlots
                        ? inlineLaunchConfig.slotLimit
                        : null,
            };
            await trackService.updateTrack(selectedSettingsTrack.id, payload);
            const updatedTracks = tracks.map((t) =>
                t.id === selectedSettingsTrack.id ? { ...t, ...payload } : t
            );
            setTracks(updatedTracks);
            if (adminCache.tracks) {
                adminCache.tracks.tracks = updatedTracks;
            }
            setInlineLaunchSaved(true);
            toast.success(
                payload.isComingSoon
                    ? `${selectedSettingsTrack.title} set to Going Live Soon`
                    : `${selectedSettingsTrack.title} updated to standard launch mode`
            );
            setTimeout(() => setInlineLaunchSaved(false), 2500);
        } catch (err: any) {
            console.error('Error saving track going live setup:', err);
            setInlineLaunchError(err?.message || 'Failed to save Going Live setup.');
            toast.error('Failed to save Going Live setup');
        } finally {
            setIsSavingInlineLaunch(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-8 relative">
            {/* Delete Confirmation Modal */}
            {deletingId && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-gray-900 tracking-tight italic">Delete Track?</h4>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">This action cannot be undone</p>
                            </div>
                        </div>
                        
                        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                            Are you sure you want to delete <span className="font-bold text-gray-900">"{tracks.find(t => t.id === deletingId)?.title}"</span>? 
                            This will remove the track bundle and its orchestration assignments.
                        </p>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setDeletingId(null)}
                                disabled={isDeleting}
                                className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => deletingId && handleDelete(deletingId)}
                                disabled={isDeleting}
                                className="flex-1 py-4 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? (
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    'Delete Track'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabbed Interface Selector (Tracks, Track Settings) */}
            <div className="flex justify-start">
                <div className="inline-flex bg-gray-100 p-1 rounded-2xl gap-0.5">
                    <button
                        type="button"
                        onClick={() => setActiveTab('tracks')}
                        className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                            activeTab === 'tracks' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-650'
                        }`}
                    >
                        <Package className="w-3.5 h-3.5" />
                        <span>Tracks</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('settings')}
                        className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                            activeTab === 'settings' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-650'
                        }`}
                    >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Track Settings</span>
                    </button>
                </div>
            </div>

            {activeTab === 'settings' ? (
                <form
                    onSubmit={handleSaveInlineLaunchSetup}
                    className="max-w-3xl bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6"
                >
                    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-5">
                        <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-[#0E7850] border border-emerald-100 text-[9px] font-black uppercase tracking-widest">
                                <CalendarClock className="w-3 h-3" />
                                <span>Launch Countdown &amp; Pre-Registration</span>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                Track Going Live Setup
                            </h3>
                            <p className="text-xs text-gray-500 font-medium leading-relaxed">
                                Select a track bundle to configure its Coming Soon countdown timer, Show Interest notifications, and Reserve My Spot slot capacity.
                            </p>
                        </div>
                    </div>

                    {tracks.length === 0 ? (
                        <p className="text-xs text-gray-400 font-bold py-4">No track bundles created yet.</p>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <label
                                    htmlFor="admin-track-launch-selector"
                                    className="text-[10px] font-black text-gray-500 uppercase tracking-widest block"
                                >
                                    Select Track
                                </label>
                                <select
                                    id="admin-track-launch-selector"
                                    value={selectedSettingsTrack?.id || ''}
                                    onChange={(e) => setSelectedSettingsTrackId(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-black text-gray-900 focus:bg-white focus:border-[#0E7850] focus:ring-2 focus:ring-[#0E7850]/15 outline-none"
                                >
                                    {tracks.map((tr) => (
                                        <option key={tr.id} value={tr.id}>
                                            {tr.title}
                                            {tr.isComingSoon ? ' (Going Live Soon)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedSettingsTrack && (
                                <GoingLiveSetupFields
                                    value={inlineLaunchConfig}
                                    onChange={setInlineLaunchConfig}
                                    interestCount={selectedSettingsTrack.interestCount || 0}
                                    reservedCount={selectedSettingsTrack.reservedCount || 0}
                                    showStats={true}
                                />
                            )}

                            {inlineLaunchError && (
                                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600">
                                    {inlineLaunchError}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <Button
                                    type="submit"
                                    disabled={isSavingInlineLaunch || !selectedSettingsTrack}
                                    className="px-7 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2"
                                >
                                    {inlineLaunchSaved ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            <span>Saved</span>
                                        </>
                                    ) : (
                                        <span>{isSavingInlineLaunch ? 'Saving...' : 'Save Going Live Setup'}</span>
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </form>
            ) : (
            <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight italic">Track Bundles</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Curated Program Packs</p>
                </div>
                <Link to="/admin/track/new">
                    <Button className="px-8 py-3.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                        + Create New Track
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {tracks.length > 0 ? tracks.map(track => {
                    const trackSprints = sprints.filter(s => track.sprintIds?.includes(s.id));
                    const baseValue = trackSprints.reduce((sum, s) => sum + getSprintCashPrice(s), 0);
                    const reruns = track.allowedReruns ?? 2;
                    const isDiscounted = reruns === 1 || reruns === 2;
                    const rerunCost = trackSprints.reduce((sum, s) => {
                        const basePrice = getSprintCashPrice(s);
                        const pricePerRerun = isDiscounted ? basePrice * 0.5 : basePrice;
                        return sum + (pricePerRerun * reruns);
                    }, 0);
                    const totalValue = baseValue + rerunCost;
                    const discountedPrice = totalValue * (1 - track.discountPercentage / 100);

                    return (
                        <div key={track.id} className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-8 hover:shadow-md transition-all group">
                            <div className="w-32 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-50 relative">
                                <img src={track.coverImageUrl} className="w-full h-full object-cover" alt="" />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Package className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            
                            <div className="flex-1 min-w-0 w-full text-center md:text-left">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
                                    <h3 className="font-black text-gray-900 text-lg line-clamp-2 break-words whitespace-normal tracking-tight italic leading-snug">{track.title}</h3>
                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex-shrink-0 ${track.published ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                                        {track.published ? 'Live' : 'Draft'}
                                    </span>
                                    {track.isComingSoon && (
                                        <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex-shrink-0 bg-amber-50 text-amber-700 border border-amber-200/70">
                                            Going Live Soon
                                        </span>
                                    )}
                                    {track.isComingSoon && getRemainingSlots(track) !== null && (
                                        <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex-shrink-0 bg-emerald-50 text-[#0E7850] border border-emerald-200/70">
                                            {getRemainingSlots(track)} slots left
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 font-medium break-words whitespace-normal leading-relaxed mb-3">{track.subtitle}</p>
                                
                                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                                    <div className="flex -space-x-2">
                                        {trackSprints.slice(0, 3).map(s => (
                                            <div key={s.id} className="w-6 h-6 rounded-lg ring-2 ring-white overflow-hidden border border-gray-100">
                                                <img src={s.coverImageUrl} className="w-full h-full object-cover" alt="" />
                                            </div>
                                        ))}
                                        {trackSprints.length > 3 && (
                                            <div className="w-6 h-6 rounded-lg ring-2 ring-white bg-gray-50 flex items-center justify-center text-[8px] font-black text-gray-400 border border-gray-100">
                                                +{trackSprints.length - 3}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{track.sprintIds.length} SPRINTS</span>
                                    <div className="h-4 w-px bg-gray-100"></div>
                                    <span className="text-[10px] font-black text-primary italic uppercase tracking-widest">
                                        SAVE {track.discountPercentage}%
                                    </span>
                                    <div className="h-4 w-px bg-gray-100"></div>
                                    <span className="text-[10px] font-black text-gray-900 italic">
                                        {discountedPrice.toLocaleString()} {track.currency}
                                        <span className="text-[8px] text-gray-300 line-through ml-1">{totalValue.toLocaleString()}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setLaunchConfigTrack(track)}
                                    className={`p-3 rounded-xl transition-all cursor-pointer ${
                                        track.isComingSoon
                                            ? 'bg-emerald-50 text-[#0E7850] border border-emerald-200/70 hover:bg-emerald-100'
                                            : 'bg-gray-50 text-gray-400 hover:text-[#0E7850]'
                                    }`}
                                    title="Going Live Soon & Countdown Settings"
                                >
                                    <CalendarClock className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleCopyLink(track.id)}
                                    className={`p-3 rounded-xl transition-all ${
                                        copiedId === track.id
                                            ? 'bg-green-50 text-green-600'
                                            : 'bg-gray-50 text-gray-400 hover:text-primary'
                                    }`}
                                    title="Copy Track Description Page Link"
                                >
                                    {copiedId === track.id ? (
                                        <Check className="w-4 h-4 text-green-600 animate-scale-in" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </button>
                                <button
                                    onClick={() => navigate(`/admin/track/edit/${track.id}`)}
                                    className="p-3 bg-gray-50 text-gray-400 hover:text-primary rounded-xl transition-all" 
                                    title="Edit Track Setup"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => navigate(`/track/${track.id}`)}
                                    className="p-3 bg-gray-50 text-gray-400 hover:text-primary rounded-xl transition-all" 
                                    title="Preview Track Description Page"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => navigate(`/track-starter/${track.id}`)}
                                    className="p-3 bg-emerald-50 text-[#0E7850] hover:bg-[#0E7850] hover:text-white rounded-xl transition-all border border-emerald-200/60" 
                                    title="Preview After-Payment Flow (Starter Experience)"
                                >
                                    <Sparkles className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => trackService.updateTrack(track.id, { published: !track.published })}
                                    className={`p-3 rounded-xl transition-all ${track.published ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}
                                    title={track.published ? 'Unpublish' : 'Publish'}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </button>
                                <button 
                                    onClick={() => setDeletingId(track.id)}
                                    className="p-3 bg-gray-50 text-gray-400 hover:text-red-500 rounded-xl transition-all" 
                                    title="Delete Track"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="py-20 text-center bg-white rounded-[3rem] border border-gray-100 border-dashed">
                        <Package className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                        <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest">No track bundles created yet.</p>
                        <Link to="/admin/track/new" className="text-primary text-[10px] font-black uppercase tracking-widest mt-4 inline-block hover:underline">Launch First Track Bundle</Link>
                    </div>
                )}
            </div>
            </>
            )}

            {/* Going Live Soon Configuration Modal */}
            <LaunchConfigModal
                isOpen={launchConfigTrack !== null}
                item={launchConfigTrack}
                itemType="track"
                onClose={() => setLaunchConfigTrack(null)}
                onSave={handleSaveLaunchConfig}
            />
        </div>
    );
};

export default AdminTracks;
