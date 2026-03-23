
import React from 'react';
import { Link } from 'react-router-dom';
import { Track, Sprint } from '../types';
import { Package, ArrowRight } from 'lucide-react';

interface TrackCardProps {
    track: Track;
    sprints: Sprint[];
}

const TrackCard: React.FC<TrackCardProps> = ({ track, sprints }) => {
    const trackSprints = sprints.filter(s => track.sprintIds.includes(s.id));
    const totalValue = trackSprints.reduce((sum, s) => sum + (s.price || 0), 0);
    const discountedPrice = totalValue * (1 - track.discountPercentage / 100);

    return (
        <Link to={`/track/${track.id}`} className="block group">
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 relative">
                {/* Badge */}
                <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20">
                        Bundle Save {track.discountPercentage}%
                    </span>
                    <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-gray-900 text-[9px] font-black uppercase tracking-widest rounded-xl shadow-sm">
                        {track.sprintIds.length} Sprints
                    </span>
                </div>

                {/* Image Section */}
                <div className="h-60 relative overflow-hidden bg-gray-100">
                    {/* Badges */}
                    <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
                        <span className="px-3 py-1.5 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20">
                            Bundle Save {track.discountPercentage}%
                        </span>
                        <span className="px-3 py-1.5 bg-white/95 backdrop-blur-md text-gray-900 text-[9px] font-black uppercase tracking-widest rounded-xl shadow-sm">
                            {track.sprintIds.length} Sprints
                        </span>
                    </div>

                    <img 
                        src={track.coverImageUrl || `https://picsum.photos/seed/${track.id}/1200/600`} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                        alt={track.title} 
                        onError={(e) => { e.currentTarget.src = `https://picsum.photos/seed/${track.id}/1200/600`; }} 
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark/40 to-transparent transition-opacity duration-700 opacity-0 group-hover:opacity-100"></div>
                </div>

                {/* Content Section */}
                <div className="p-8 flex flex-col flex-grow">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="px-3 py-1 rounded-lg bg-gray-50 border border-gray-100 text-primary text-[9px] font-black uppercase tracking-[0.25em]">Track Bundle</span>
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 mb-1 transition-colors leading-[1.1] tracking-tight group-hover:text-primary">
                        {track.title}
                    </h3>
                    {track.subtitle && (
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-6 leading-none">
                            {track.subtitle}
                        </p>
                    )}

                    <div className="pt-6 border-t border-gray-50 mt-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-3">
                                    {trackSprints.slice(0, 4).map(s => (
                                        <div key={s.id} className="w-10 h-10 rounded-[1.25rem] ring-4 ring-white overflow-hidden border border-gray-100 shadow-sm">
                                            <img src={s.coverImageUrl} className="w-full h-full object-cover" alt="" />
                                        </div>
                                    ))}
                                    {trackSprints.length > 4 && (
                                        <div className="w-10 h-10 rounded-[1.25rem] ring-4 ring-white bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100">
                                            +{trackSprints.length - 4}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-0.5">Curated Bundle</p>
                                    <p className="text-xs font-black text-gray-900 uppercase tracking-tight truncate">Complete Growth Path</p>
                                </div>
                            </div>
                        </div>

                        <div className="py-4 rounded-[1.5rem] bg-primary text-white font-black text-[11px] uppercase tracking-[0.3em] text-center shadow-sm transition-all duration-500 flex justify-center items-center gap-3 group-hover:bg-primary-hover shadow-primary/20">
                            <div className="flex items-baseline gap-2">
                                <span>₦{discountedPrice.toLocaleString()}</span>
                                <span className="text-[9px] font-bold text-white/60 line-through">₦{totalValue.toLocaleString()}</span>
                            </div>
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default TrackCard;
