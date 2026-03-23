
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
                {/* Image Section */}
                <div className="h-48 relative overflow-hidden bg-gray-100">
                    <img 
                        src={track.coverImageUrl || `https://picsum.photos/seed/${track.id}/1200/600`} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                        alt={track.title} 
                        onError={(e) => { e.currentTarget.src = `https://picsum.photos/seed/${track.id}/1200/600`; }} 
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark/40 to-transparent transition-opacity duration-700 opacity-0 group-hover:opacity-100"></div>

                    {/* Badges - Moved to bottom-left */}
                    <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
                        <span className="px-3 py-1.5 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20">
                            SAVE {track.discountPercentage}%
                        </span>
                        <span className="px-3 py-1.5 bg-white/95 backdrop-blur-md text-gray-900 text-[9px] font-black uppercase tracking-widest rounded-xl shadow-sm">
                            {track.sprintIds.length} SPRINTS INCLUDED
                        </span>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-6 flex flex-col flex-grow">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 rounded-lg bg-gray-50 border border-gray-100 text-primary text-[9px] font-black uppercase tracking-[0.25em]">Track Bundle</span>
                    </div>

                    <h3 className="text-xl font-black text-gray-900 mb-1 transition-colors leading-[1.1] tracking-tight group-hover:text-primary">
                        {track.title}
                    </h3>
                    {track.subtitle && (
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-6 leading-none">
                            {track.subtitle}
                        </p>
                    )}

                    <div className="pt-6 border-t border-gray-50 mt-auto space-y-6">
                        {/* Curated Bundle Info */}
                        <div className="flex items-center gap-5">
                            <div className="flex -space-x-4">
                                {trackSprints.slice(0, 3).map(s => (
                                    <div key={s.id} className="w-14 h-14 rounded-full ring-4 ring-white overflow-hidden border border-gray-100 shadow-sm flex-shrink-0">
                                        <img src={s.coverImageUrl} className="w-full h-full object-cover" alt="" />
                                    </div>
                                ))}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Curated Bundle</p>
                                <p className="text-lg font-black text-gray-900 italic leading-none">Complete Growth Path</p>
                            </div>
                        </div>

                        {/* Pricing and Action */}
                        <div className="flex items-center justify-between">
                            <div className="text-left">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Bundle Value</p>
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl font-black text-primary italic leading-none">₦{discountedPrice.toLocaleString()}</span>
                                    <span className="text-sm font-bold text-gray-300 line-through">₦{totalValue.toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <div className="w-16 h-16 bg-primary text-white rounded-[1.75rem] flex items-center justify-center shadow-xl shadow-primary/20 group-hover:scale-105 transition-transform duration-500">
                                <ArrowRight className="w-8 h-8" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default TrackCard;
