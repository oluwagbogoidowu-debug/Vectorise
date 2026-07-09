import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, AlertTriangle, Flame, BookOpen, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Sprint } from '../../types';
import { sprintService } from '../../services/sprintService';
import Button from '../../components/Button';
import { adminCache } from './adminCache';

type SprintFilter = 'all' | 'active' | 'core' | 'pending' | 'rejected';

const AdminSprints: React.FC = () => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sprint' | 'blog' | 'ignite'>('sprint');
  const [sprintFilter, setSprintFilter] = useState<SprintFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (adminCache.sprints) {
      setSprints(adminCache.sprints);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsubscribe = sprintService.subscribeToAdminSprints((data) => {
      setSprints(data);
      adminCache.sprints = data;
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredSprints = useMemo(() => {
    let tFiltered = sprints.filter(s => {
      if (activeTab === 'sprint') {
        return !s.contentType || s.contentType === 'sprint';
      }
      return s.contentType === activeTab;
    });

    let filtered: Sprint[] = [];
    switch (sprintFilter) {
      case 'active':
        filtered = tFiltered.filter(s => s.approvalStatus === 'approved');
        break;
      case 'core':
        filtered = tFiltered.filter(s => 
          s.sprintType === 'Foundational' || 
          s.sprintType === 'Fundamentals' || 
          s.sprintType === 'Core' || 
          s.sprintType === 'Expert' || 
          s.category === 'Core Platform Sprint' || 
          s.category === 'Growth Fundamentals'
        );
        break;
      case 'pending':
        filtered = tFiltered.filter(s => s.approvalStatus === 'pending_approval');
        break;
      case 'rejected':
        filtered = tFiltered.filter(s => s.approvalStatus === 'rejected');
        break;
      default:
        filtered = tFiltered;
        break;
    }

    return [...filtered].sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
  }, [sprints, sprintFilter, activeTab]);

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await sprintService.deleteSprint(deletingId);
      toast.success("Sprint deleted successfully");
      const updatedSprints = sprints.filter(s => s.id !== deletingId);
      setSprints(updatedSprints);
      adminCache.sprints = updatedSprints;
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting sprint:", error);
      toast.error("Failed to delete sprint");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePublish = async (sprint: Sprint) => {
    const newPublished = !sprint.published;
    try {
      await sprintService.updateSprint(sprint.id, { published: newPublished });
      toast.success(`${sprint.title} is now ${newPublished ? 'ON (Published)' : 'OFF (Hidden)'}`);
    } catch (error) {
      console.error("Error toggling publish state:", error);
      toast.error("Failed to update status");
    }
  };

  const handleToggleBlogLive = async (sprint: Sprint) => {
    const isLive = sprint.approvalStatus === 'approved';
    const newStatus = isLive ? 'pending_approval' : 'approved';
    try {
      await sprintService.updateSprint(sprint.id, { approvalStatus: newStatus });
      toast.success(`${sprint.title} is now ${newStatus === 'approved' ? 'LIVE' : 'NOT LIVE (Hidden)'}`);
    } catch (error) {
      console.error("Error toggling blog status:", error);
      toast.error("Failed to update status");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 relative">
      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xl font-black text-gray-900 tracking-tight italic">Delete Sprint?</h4>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-gray-900">"{sprints.find(s => s.id === deletingId)?.title}"</span>? 
              This will remove the sprint and clean up its references in tracks and orchestration.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Delete Sprint'
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Tabbed Interface Selector (Sprint, RiseBlog, Ignite) */}
      <div className="flex justify-start">
        <div className="inline-flex bg-gray-100 p-0.5 rounded-xl">
            <button
                type="button"
                onClick={() => {
                    setActiveTab('sprint');
                    setSprintFilter('all');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeTab === 'sprint' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-650'
                }`}
            >
                <Flame className="w-3 h-3" />
                Sprint
            </button>
            <button
                type="button"
                onClick={() => {
                    setActiveTab('blog');
                    setSprintFilter('all');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeTab === 'blog' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-650'
                }`}
            >
                <BookOpen className="w-3 h-3" />
                RiseBlog
            </button>
            <button
                type="button"
                onClick={() => {
                    setActiveTab('ignite');
                    setSprintFilter('all');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeTab === 'ignite' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-650'
                }`}
            >
                <Sparkles className="w-3 h-3" />
                Ignite
            </button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar border-b border-gray-50">
        {['all', 'active', 'core', 'pending', 'rejected'].map(f => (
          <button key={f} onClick={() => setSprintFilter(f as SprintFilter)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap border ${sprintFilter === f ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-primary/20 hover:text-primary'}`}>{f.replace('_', ' ')}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4">
        {filteredSprints.map(s => (
          <div key={s.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 hover:shadow-md transition-all">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-50"><img src={s.coverImageUrl} className="w-full h-full object-cover" alt="" /></div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h3 className="font-black text-gray-900 text-lg truncate tracking-tight">{s.title}</h3>
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 text-[9px] font-black text-gray-400 mt-2 uppercase tracking-widest">
                <span className="px-2 py-1 bg-gray-50 rounded-lg">{s.duration} Days</span>
                <span className="px-2 py-1 bg-gray-50 rounded-lg">{s.category}</span>
                <span className={`px-2 py-1 rounded-lg ${s.approvalStatus === 'approved' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-500'}`}>{s.approvalStatus.replace('_', ' ')}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {activeTab === 'blog' && (
                <div className="flex items-center gap-2 border-r border-gray-150 pr-4 mr-1">
                  <span className={`text-[9px] font-black uppercase tracking-wider ${s.approvalStatus === 'approved' ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {s.approvalStatus === 'approved' ? 'LIVE' : 'HIDDEN'}
                  </span>
                  <button
                    onClick={() => handleToggleBlogLive(s)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      s.approvalStatus === 'approved' ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}
                    title={s.approvalStatus === 'approved' ? "Hide Blog" : "Make Blog Live"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        s.approvalStatus === 'approved' ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}
              {activeTab === 'ignite' && (
                <div className="flex items-center gap-2 border-r border-gray-150 pr-4 mr-1">
                  <span className={`text-[9px] font-black uppercase tracking-wider ${s.published ? 'text-emerald-600' : 'text-gray-405'}`}>
                    {s.published ? 'ON' : 'OFF'}
                  </span>
                  <button
                    onClick={() => handleTogglePublish(s)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      s.published ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}
                    title={s.published ? "Turn Off" : "Turn On"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        s.published ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}
              <Link to={`/coach/sprint/edit/${s.id}`}><button className="px-8 py-3 bg-white border border-gray-100 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-primary transition-all">Edit</button></Link>
              <button 
                onClick={() => setDeletingId(s.id)}
                className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Delete Sprint"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSprints;
