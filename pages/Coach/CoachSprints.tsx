
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { Sprint } from '../../types';
import Button from '../../components/Button';

interface SprintWithCount extends Sprint {
  participantCount: number;
}

const CoachSprints: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const [sprints, setSprints] = useState<SprintWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'pending' | 'draft' | 'rejected'>('all');

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      sprintService.getSprints()
        .then(async allSprints => {
          const coachSprints = allSprints.filter(s => s.coachId === user.id);
          
          const sprintsWithCounts = await Promise.all(
            coachSprints.map(async sprint => {
              const count = await sprintService.getEnrollmentCountForSprint(sprint.id);
              return { ...sprint, participantCount: count };
            })
          );

          setSprints(sprintsWithCounts);
        })
        .catch(error => {
          console.error("Failed to fetch sprints for coach:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [user, location.key]); 

  const filteredSprints = useMemo(() => {
      if (filter === 'all') return sprints;
      if (filter === 'published') return sprints.filter(s => s.published);
      if (filter === 'pending') return sprints.filter(s => s.approvalStatus === 'pending_approval');
      if (filter === 'rejected') return sprints.filter(s => s.approvalStatus === 'rejected');
      if (filter === 'draft') return sprints.filter(s => s.approvalStatus === 'draft');
      return sprints;
  }, [sprints, filter]);

  const canCreateSprint = hasPermission('sprint:create');
  const canEditSprint = hasPermission('sprint:edit');

  if (isLoading) {
    return <div className="text-center p-8">Loading your sprints...</div>;
  }

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sprint Management</h1>
        {canCreateSprint && (
            <Link to="/coach/sprint/new">
                <Button>+ Create New Sprint</Button>
            </Link>
        )}
      </div>

      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 hide-scrollbar">
          {['all', 'published', 'pending', 'draft', 'rejected'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    filter === f 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
          ))}
      </div>

      <div className="space-y-4">
          {filteredSprints.length > 0 ? filteredSprints.map(sprint => (
            <div key={sprint.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-start gap-4">
                  <img src={sprint.coverImageUrl} alt={sprint.title} className="w-20 h-20 rounded-lg object-cover bg-gray-100" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{sprint.title}</h3>
                        <span className={`font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider ${
                            sprint.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                            sprint.approvalStatus === 'pending_approval' ? 'bg-blue-100 text-blue-700' :
                            sprint.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                            {sprint.approvalStatus.replace('_', ' ')}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <span>{sprint.duration} days</span>
                        <span>•</span>
                        <span>{sprint.category}</span>
                        <span>•</span>
                        <span>{sprint.difficulty}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                        <strong>{sprint.participantCount}</strong> Active Participants
                    </div>
                  </div>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                {canEditSprint ? (
                    <Link to={`/coach/sprint/edit/${sprint.id}`} className="flex-1 md:flex-none">
                        <Button className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200">
                            {sprint.approvalStatus === 'draft' || sprint.approvalStatus === 'rejected' ? 'Edit Content' : 'View Content'}
                        </Button>
                    </Link>
                ) : null}
                {sprint.approvalStatus === 'approved' && (
                    <Link to={`/sprint/${sprint.id}`} state={{ from: location.pathname }} className="flex-1 md:flex-none">
                        <Button variant="secondary" className="w-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50">View Page</Button>
                    </Link>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
                <p className="text-gray-500 mb-4">No sprints found in this category.</p>
                {canCreateSprint && filter === 'all' && (
                    <Link to="/coach/sprint/new">
                        <Button>Get Started</Button>
                    </Link>
                )}
            </div>
          )}
      </div>
    </div>
  );
};

export default CoachSprints;
