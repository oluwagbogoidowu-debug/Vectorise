
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { Sprint } from '../../types.ts';
import { sprintService } from '../../services/sprintService.ts';
import Button from '../../components/Button.tsx';

const DeleteConfirmationModal: React.FC<{
    sprint: Sprint;
    onClose: () => void;
    onConfirm: (sprintId: string) => void;
    isDeleting: boolean;
}> = ({ sprint, onClose, onConfirm, isDeleting }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden animate-slide-up flex flex-col p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" />
                    </svg>
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Delete Sprint?</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8 italic">
                    "This program will be hidden from new participants. Enrolled students can still complete their journey."
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-gray-50 text-gray-500 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-gray-100 transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => onConfirm(sprint.id)}
                        disabled={isDeleting}
                        className="flex-1 py-3.5 bg-red-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-red-100 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete Sprint'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CoachSprints: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [orchestratedIds, setOrchestratedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'published' | 'pending' | 'rejected' | 'draft'>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  const [sprintToDelete, setSprintToDelete] = useState<Sprint | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    if (user) {
      setIsLoading(true);
      try {
        const [coachSprints, orchestration] = await Promise.all([
            sprintService.getCoachSprints(user.id),
            sprintService.getOrchestration()
        ]);
        
        const liveIds = new Set(
            Object.values(orchestration)
                .map(m => m.sprintId)
                .filter(id => !!id)
        );

        setSprints(coachSprints);
        setOrchestratedIds(liveIds);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, location.key]);

  const filteredSprints = useMemo(() => {
    if (filter === 'all') return sprints;
    if (filter === 'published') return sprints.filter(s => s.published);
    if (filter === 'pending') return sprints.filter(s => s.approvalStatus === 'pending_approval');
    if (filter === 'rejected') return sprints.filter(s => s.approvalStatus === 'rejected');
    if (filter === 'draft') return sprints.filter(s => s.approvalStatus === 'draft');
    return sprints;
  }, [sprints, filter]);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
        await sprintService.deleteSprint(id);
        setSprintToDelete(null);
        await fetchData();
    } catch (err) {
        alert("Failed to delete sprint.");
    } finally {
        setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {sprintToDelete && (
          <DeleteConfirmationModal 
            sprint={sprintToDelete} 
            onClose={() => setSprintToDelete(null)} 
            onConfirm={handleDelete}
            isDeleting={isDeleting}
          />
      )}

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
              {filteredSprints.map(sprint => {
                  const isOrchestrated = orchestratedIds.has(sprint.id);
                  const isApproved = sprint.approvalStatus === 'approved';
                  const showNotLiveBadge = isApproved && !isOrchestrated;

                  return (
                      <div key={sprint.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 group hover:shadow-md transition-all">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-inner">
                              <img src={sprint.coverImageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                          </div>
                          <div className="flex-1 min-w-0 text-center sm:text-left">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-black text-gray-900 text-lg group-hover:text-primary transition-colors truncate tracking-tight">{sprint.title}</h3>
                                {showNotLiveBadge && (
                                    <span className="px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-md text-[7px] font-black uppercase tracking-widest">
                                        Not Live (Pending Orchestration)
                                    </span>
                                )}
                              </div>
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
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Link to={`/coach/sprint/edit/${sprint.id}`} className="flex-1 sm:flex-none">
                                <button className={`w-full sm:w-auto px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                                    sprint.approvalStatus === 'rejected' 
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-100 hover:bg-orange-600' 
                                    : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-primary'
                                }`}>
                                    {sprint.approvalStatus === 'rejected' ? 'Fix Errors' : 'Edit Sprint'}
                                </button>
                            </Link>
                            <button 
                                onClick={() => setSprintToDelete(sprint)}
                                className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                                title="Delete Sprint"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" />
                                </svg>
                            </button>
                          </div>
                      </div>
                  );
              })}
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
