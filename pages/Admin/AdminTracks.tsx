
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Track, Sprint } from '../../types';
import { trackService } from '../../services/trackService';
import { sprintService } from '../../services/sprintService';
import Button from '../../components/Button';
import { Edit2, Trash2, Eye, Package } from 'lucide-react';

const AdminTracks: React.FC = () => {
    const navigate = useNavigate();
    const [tracks, setTracks] = useState<Track[]>([]);
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const unsubscribeTracks = trackService.subscribeToTracks((data) => {
            setTracks(data);
            setIsLoading(false);
        });
        const unsubscribeSprints = sprintService.subscribeToAdminSprints((data) => {
            setSprints(data);
        });
        return () => {
            unsubscribeTracks();
            unsubscribeSprints();
        };
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-8">
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
                    const totalValue = trackSprints.reduce((sum, s) => sum + (s.price || 0), 0);
                    const discountedPrice = totalValue * (1 - track.discountPercentage / 100);

                    return (
                        <div key={track.id} className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-8 hover:shadow-md transition-all group">
                            <div className="w-32 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-50 relative">
                                <img src={track.coverImageUrl} className="w-full h-full object-cover" alt="" />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Package className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            
                            <div className="flex-1 min-w-0 text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                    <h3 className="font-black text-gray-900 text-lg truncate tracking-tight italic">{track.title}</h3>
                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${track.published ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                                        {track.published ? 'Live' : 'Draft'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 font-medium truncate mb-3">{track.subtitle}</p>
                                
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
                                <Link to={`/admin/track/edit/${track.id}`}>
                                    <button className="p-3 bg-gray-50 text-gray-400 hover:text-primary rounded-xl transition-all" title="Edit Track">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </Link>
                                <Link to={`/track/${track.id}`} target="_blank">
                                    <button className="p-3 bg-gray-50 text-gray-400 hover:text-primary rounded-xl transition-all" title="View Landing Page">
                                        <Eye className="w-4 h-4" />
                                    </button>
                                </Link>
                                <button 
                                    onClick={() => trackService.updateTrack(track.id, { published: !track.published })}
                                    className={`p-3 rounded-xl transition-all ${track.published ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}
                                    title={track.published ? 'Unpublish' : 'Publish'}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </button>
                                <button className="p-3 bg-gray-50 text-gray-400 hover:text-red-500 rounded-xl transition-all" title="Delete Track">
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
        </div>
    );
};

export default AdminTracks;
