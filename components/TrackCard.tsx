
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
                    <img 
                        src={track.coverImageUrl || `https://picsum.photos/seed/${track.id}/1200/600`} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                        alt={track.title} 
                        onError={(e) => { e.currentTarget.src = `https://picsum.photos/seed/${track.id}/1200/600`; }} 
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    
                    <div className="absolute bottom-8 left-8 right-8">
                        <h3 className="text-2xl md:text-3xl font-black text-white tracking-tighter italic mb-2 group-hover:translate-x-1 transition-transform">
                            {track.title}
                        </h3>
                        <p className="text-white/70 text-xs font-medium italic line-clamp-1">
                            {track.subtitle}
                        </p>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                            {trackSprints.slice(0, 4).map(s => (
                                <div key={s.id} className="w-10 h-10 rounded-2xl ring-4 ring-white overflow-hidden border border-gray-100 shadow-sm">
                                    <img src={s.coverImageUrl} className="w-full h-full object-cover" alt="" />
                                </div>
                            ))}
                            {trackSprints.length > 4 && (
                                <div className="w-10 h-10 rounded-2xl ring-4 ring-white bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100">
                                    +{trackSprints.length - 4}
                                </div>
                            )}
                        </div>
                        <div className="h-8 w-px bg-gray-100 hidden md:block"></div>
                        <div className="text-center md:text-left">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Curated Bundle</p>
                            <p className="text-sm font-black text-gray-900 italic">Complete Growth Path</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Bundle Value</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-primary italic">₦{discountedPrice.toLocaleString()}</span>
                                <span className="text-xs font-bold text-gray-300 line-through">₦{totalValue.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
                            <ArrowRight className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default TrackCard;
