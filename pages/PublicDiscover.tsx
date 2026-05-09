import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { sprintService } from '../services/sprintService';
import { trackService } from '../services/trackService';
import { assetService } from '../services/assetService';
import { Sprint, Track } from '../types';

const PublicDiscover: React.FC = () => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedSprints, fetchedTracks] = await Promise.all([
          sprintService.getLiveSprints(),
          trackService.getLiveTracks()
        ]);
        // Filter to only approved and active sprints if needed
        setSprints(fetchedSprints.filter(s => s.status === 'published' || s.status === 'active' || s.approvalStatus === 'approved'));
        setTracks(fetchedTracks.filter(t => t.status === 'published' || t.status === 'active'));
      } catch (error) {
        console.error('Failed to fetch public registry', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const fallbackUrl = assetService.URLS.DEFAULT_SPRINT_COVER;

  return (
    <div className="min-h-screen bg-light">
      <div className="pt-20 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight italic mb-4">Discover Sprints & Tracks</h1>
            <p className="text-gray-500 font-medium text-sm">Explore our curated collection of personal growth paths.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-20">
        {isLoading ? (
            <div className="text-center py-20 flex flex-col items-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Loading Registry...</p>
            </div>
        ) : (
          <div className="flex flex-col gap-10">
            {tracks.length > 0 && (
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight mb-4">Featured Tracks</h2>
                <div className="grid grid-cols-1 gap-4">
                  {tracks.map(track => (
                      <div key={track.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 group hover:shadow-md transition-all">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-inner bg-gray-50">
                              <img 
                                src={track.coverImageUrl || fallbackUrl} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                alt="" 
                                onError={(e) => { e.currentTarget.src = fallbackUrl }}
                              />
                          </div>
                          <div className="flex-1 min-w-0 text-center sm:text-left">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-black text-gray-900 text-lg group-hover:text-primary transition-colors truncate tracking-tight">{track.title}</h3>
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-2 mt-1">{track.description}</p>
                              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 text-[9px] font-black text-gray-400 mt-2 uppercase tracking-widest">
                                  <span className="px-2 py-1 bg-gray-50 rounded-lg">{track.enrollmentCost} Coins</span>
                              </div>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                            <Link to={`/track/${track.id}`} className="w-full sm:w-auto">
                                <button className="w-full px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02]">
                                    View Track
                                </button>
                            </Link>
                          </div>
                      </div>
                  ))}
                </div>
              </div>
            )}

            {sprints.length > 0 && (
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight mb-4">All Sprints</h2>
                <div className="grid grid-cols-1 gap-4">
                  {sprints.map(sprint => (
                      <div key={sprint.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 group hover:shadow-md transition-all">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-inner bg-gray-50">
                              <img 
                                src={sprint.coverImageUrl || fallbackUrl} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                alt="" 
                                onError={(e) => { e.currentTarget.src = fallbackUrl }}
                              />
                          </div>
                          <div className="flex-1 min-w-0 text-center sm:text-left">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-black text-gray-900 text-lg group-hover:text-primary transition-colors truncate tracking-tight">{sprint.title}</h3>
                              </div>
                              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 text-[9px] font-black text-gray-400 mt-2 uppercase tracking-widest">
                                  <span className="px-2 py-1 bg-gray-50 rounded-lg">{sprint.duration} Days</span>
                                  <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                                  <span className="px-2 py-1 bg-gray-50 rounded-lg">{sprint.category}</span>
                              </div>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                            <Link to={`/sprint/${sprint.id}`} className="w-full sm:w-auto">
                                <button className="w-full px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-primary">
                                    View Details
                                </button>
                            </Link>
                          </div>
                      </div>
                  ))}
                </div>
              </div>
            )}

            {sprints.length === 0 && tracks.length === 0 && (
                <div className="text-center py-20 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No content available at the moment.</p>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicDiscover;
