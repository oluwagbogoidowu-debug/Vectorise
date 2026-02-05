
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { Sprint } from '../../types.ts';
import { MOCK_PARTICIPANT_SPRINTS } from '../../services/mockData.ts';
import { sprintService } from '../../services/sprintService.ts';
import Button from '../../components/Button.tsx';

const CoachSprints: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [filter, setFilter] = useState<'all' | 'published' | 'pending' | 'draft'>('all');
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
    if (filter === 'draft') return sprints.filter(s => s.approvalStatus === 'draft');
    return sprints;
  }, [sprints, filter]);

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manage Sprints</h1>
        {hasPermission('sprint:create') && (
            <Link to="/coach/sprint/new">
                <Button className="rounded-xl px-6">+ Create New</Button>
            </Link>
        )}
      </div>

      <div className="flex gap-4 mb-8 overflow-x-auto pb-1">
        {['all', 'published', 'pending', 'draft'].map(f => (
            <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${
                    filter === f ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
                {f}
            </button>
        ))}
      </div>

      {isLoading ? (
          <div className="text-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>
      ) : filteredSprints.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
              {filteredSprints.map(sprint => (
                  <div key={sprint.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-6 group">
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                          <img src={sprint.coverImageUrl} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-lg group-hover:text-primary transition-colors truncate">{sprint.title}</h3>
                          <div className="flex items-center gap-4 text-xs font-medium text-gray-400 mt-1">
                              <span>{sprint.duration} Days</span>
                              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                              <span>{sprint.category}</span>
                              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                              <span className={`capitalize ${sprint.published ? 'text-green-600' : 'text-orange-500'}`}>{sprint.approvalStatus.replace('_', ' ')}</span>
                          </div>
                      </div>
                      <Link to={`/coach/sprint/edit/${sprint.id}`}>
                        <Button variant="secondary" className="px-5 py-2 rounded-lg text-xs">Edit</Button>
                      </Link>
                  </div>
              ))}
          </div>
      ) : (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-medium">No sprints found in this category.</p>
          </div>
      )}
    </div>
  );
};

export default CoachSprints;
