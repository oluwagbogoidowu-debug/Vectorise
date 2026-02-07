
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { Sprint } from '../../types.ts';
import { sprintService } from '../../services/sprintService.ts';
import Button from '../../components/Button.tsx';

const CoachSprints: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [filter, setFilter] = useState<'all' | 'published' | 'pending' | 'rejected' | 'draft'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSprints = async () => {
      if (user) {
        setIsLoading(true);
        try {
          const coachSprints = await sprintService.getCoachSprints(user.id);
          setSprints(coachSprints);
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchSprints();
  }, [user, location.key]);

  const filteredSprints = useMemo(() => {
    if (filter === 'all') return sprints;
    if (filter === 'published') return sprints.filter(s => s.published);
    if (filter === 'pending') return sprints.filter(s => s.approvalStatus === 'pending_approval');
    if (filter === 'rejected') return sprints.filter(s => s.approvalStatus === 'rejected');
    if (filter === 'draft') return sprints.filter(s => s.approvalStatus === 'draft');
    return sprints;
  }, [sprints, filter]);

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight italic">Manage Sprints</h1>
            <p className="text-gray-500 font-medium text-sm">Curate and track your growth cycles.</p>
        </div>
        {hasPermission('sprint:create') && (
            <Link to="/coach/sprint/new">
                <Button className="rounded-xl px-6 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">+ Create New</Button>
            </Link>
        )}
      </div>

      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {['all', 'published', 'pending', 'rejected', 'draft'].map(f => (
            <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap border ${
                    filter === f 
                    ? 'bg-primary text-white border-primary shadow-md' 
                    : 'bg-white text-gray-400 border-gray-100 hover:border-primary/20 hover:text-primary'
                }`}
            >
                {f === 'rejected' ? 'Amend Required' : f}
            </button>
        ))}
      </div>

      {isLoading ? (
          <div className="text-center py-20 flex flex-col items-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Syncing Registry...</p>
          </div>
      ) : filteredSprints.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
              {filteredSprints.map(sprint => (
                  <div key={sprint.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 group hover:shadow-md transition-all">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-inner">
                          <img src={sprint.coverImageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                      </div>
                      <div className="flex-1 min-w-0 text-center sm:text-left">
                          <h3 className="font-black text-gray-900 text-lg group-hover:text-primary transition-colors truncate tracking-tight">{sprint.title}</h3>
                          <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 text-[9px] font-black text-gray-400 mt-2 uppercase tracking-widest">
                              <span className="px-2 py-1 bg-gray-50 rounded-lg">{sprint.duration} Days</span>
                              <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                              <span className="px-2 py-1 bg-gray-50 rounded-lg">{sprint.category}</span>
                              <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                              <span className={`px-2 py-1 rounded-lg ${
                                  sprint.approvalStatus === 'approved' ? 'bg-green-50 text-green-600 border border-green-100' : 
                                  sprint.approvalStatus === 'rejected' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                  'bg-blue-50 text-blue-500 border border-blue-100'
                              }`}>
                                  {sprint.approvalStatus === 'rejected' ? 'Amend Required' : sprint.approvalStatus.replace('_', ' ')}
                              </span>
                          </div>
                      </div>
                      <Link to={`/coach/sprint/edit/${sprint.id}`} className="w-full sm:w-auto">
                        <button className={`w-full sm:w-auto px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                            sprint.approvalStatus === 'rejected' 
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-100 hover:bg-orange-600' 
                            : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-primary'
                        }`}>
                            {sprint.approvalStatus === 'rejected' ? 'Fix Errors' : 'Edit Registry'}
                        </button>
                      </Link>
                  </div>
              ))}
          </div>
      ) : (
          <div className="text-center py-20 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm grayscale opacity-30">🏝️</div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No cycles found in this registry view.</p>
          </div>
      )}
    </div>
  );
};

export default CoachSprints;
