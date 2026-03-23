
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
        <Link to={`/track/${track.id}`} className="block group h-full">
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-700 flex flex-col h-full relative">
                {/* Image Section - Vertical & Large */}
                <div className="relative h-[400px] md:h-[500px] overflow-hidden">
                    <img 
                        src={track.coverImageUrl || `https://picsum.photos/seed/${track.id}/1200/800`} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                        alt={track.title} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"></div>
                    
                    <div className="absolute bottom-10 left-10 right-10">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">Curated Pathway</p>
                        <h3 className="text-4xl md:text-5xl font-black text-white tracking-tighter italic mb-4 leading-tight group-hover:translate-x-2 transition-transform duration-700">
                            {track.title}
                        </h3>
                        <p className="text-white/70 text-sm font-medium italic line-clamp-2 leading-relaxed max-w-md mb-6">
                            {track.subtitle}
                        </p>
                        
                        {/* Badges below subtitle */}
                        <div className="flex items-center gap-3">
                            <span className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-primary/40 animate-fade-in">
                                SAVE {track.discountPercentage}%
                            </span>
                            <span className="px-4 py-2 bg-white/20 backdrop-blur-xl text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-white/20">
                                {track.sprintIds.length} Sprints
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content Section - Bottom */}
                <div className="p-10 flex flex-col flex-grow justify-between gap-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex -space-x-4">
                                {trackSprints.slice(0, 4).map(s => (
                                    <div key={s.id} className="w-12 h-12 rounded-2xl ring-4 ring-white overflow-hidden border border-gray-100 shadow-lg transform hover:-translate-y-1 transition-transform">
                                        <img src={s.coverImageUrl} className="w-full h-full object-cover" alt="" />
                                    </div>
                                ))}
                                {trackSprints.length > 4 && (
                                    <div className="w-12 h-12 rounded-2xl ring-4 ring-white bg-gray-50 flex items-center justify-center text-[11px] font-black text-gray-400 border border-gray-100 shadow-lg">
                                        +{trackSprints.length - 4}
                                    </div>
                                )}
                            </div>
                            <div className="ml-4">
                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-0.5">Includes</p>
                                <p className="text-xs font-black text-gray-900 uppercase tracking-tight">Expert Sprints</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Bundle Price</p>
                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl font-black text-primary italic">₦{discountedPrice.toLocaleString()}</span>
                                <span className="text-sm font-bold text-gray-300 line-through opacity-50">₦{totalValue.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full py-6 bg-gray-900 text-white rounded-[2rem] font-black uppercase tracking-[0.4em] text-[12px] flex items-center justify-center gap-4 group-hover:bg-primary transition-colors duration-500 shadow-2xl shadow-gray-900/20">
                        Unlock Track Bundle
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default TrackCard;
