
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
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 relative">
                {/* Image Section */}
                <div className="h-40 relative overflow-hidden bg-gray-100">
                    <img 
                        src={track.coverImageUrl || `https://picsum.photos/seed/${track.id}/1200/600`} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                        alt={track.title} 
                        onError={(e) => { e.currentTarget.src = `https://picsum.photos/seed/${track.id}/1200/600`; }} 
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark/40 to-transparent transition-opacity duration-700 opacity-0 group-hover:opacity-100"></div>

                    {/* Badges - Moved to bottom-left */}
                    <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-primary text-white text-[7px] font-black uppercase tracking-widest rounded-md shadow-lg shadow-primary/20">
                            SAVE {track.discountPercentage}%
                        </span>
                        <span className="px-2 py-0.5 bg-white/95 backdrop-blur-md text-gray-900 text-[7px] font-black uppercase tracking-widest rounded-md shadow-sm">
                            {track.sprintIds.length} SPRINTS
                        </span>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-4 flex flex-col flex-grow">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-primary text-[7px] font-black uppercase tracking-[0.2em]">Track Bundle</span>
                    </div>

                    <h3 className="text-base font-black text-gray-900 mb-0.5 transition-colors leading-tight tracking-tight group-hover:text-primary">
                        {track.title}
                    </h3>
                    {track.subtitle && (
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-3 leading-none">
                            {track.subtitle}
                        </p>
                    )}

                    <div className="pt-3 border-t border-gray-50 mt-auto space-y-3">
                        {/* Curated Bundle Info */}
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-2.5">
                                {trackSprints.slice(0, 3).map(s => (
                                    <div key={s.id} className="w-8 h-8 rounded-full ring-2 ring-white overflow-hidden border border-gray-100 shadow-sm flex-shrink-0">
                                        <img src={s.coverImageUrl} className="w-full h-full object-cover" alt="" />
                                    </div>
                                ))}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.15em] mb-0.5">Curated Bundle</p>
                                <p className="text-xs font-black text-gray-900 italic leading-none">Complete Growth Path</p>
                            </div>
                        </div>

                        {/* Pricing and Action */}
                        <div className="flex items-center justify-between">
                            <div className="text-left">
                                <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.15em] mb-0.5">Bundle Value</p>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xl font-black text-primary italic leading-none">₦{discountedPrice.toLocaleString()}</span>
                                    <span className="text-[10px] font-bold text-gray-300 line-through">₦{totalValue.toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-500">
                                <ArrowRight className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default TrackCard;
