import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sprint, Coach } from '../../types';
import { sprintService } from '../../services/sprintService';
import { assetService } from '../../services/assetService';
import Button from '../../components/Button';

const IGNITE_COLORS = [
  { hex: '#111827', name: 'Charcoal' },
  { hex: '#6D28D9', name: 'Magic Purple' },
  { hex: '#0F766E', name: 'Deep Teal' },
  { hex: '#047857', name: 'Emerald' },
  { hex: '#B45309', name: 'Warm Amber' },
  { hex: '#BE123C', name: 'Crimson' },
];

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
                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Delete Course?</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8 italic">
                    "This content will be permanently removed. Enrolled participants may no longer be able to view it."
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-gray-50 text-gray-500 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => onConfirm(sprint.id)}
                        disabled={isDeleting}
                        className="flex-1 py-3.5 bg-red-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-red-100 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const EditBlogModal: React.FC<{
  blog: Sprint;
  onClose: () => void;
  onSave: (updated: Partial<Sprint>) => Promise<void>;
  isSaving: boolean;
}> = ({ blog, onClose, onSave, isSaving }) => {
  const [title, setTitle] = useState(blog.title || '');
  const [image, setImage] = useState(blog.blogImage || blog.coverImageUrl || '');
  const [body, setBody] = useState(blog.blogBody || blog.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
        alert('Please enter a title');
        return;
    }
    onSave({
      title,
      blogBody: body,
      description: body,
      blogImage: image || `https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80`,
      coverImageUrl: image || `https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80`,
    });
  };

  return (
    <div className="fixed inset-0 z-[300] bg-gray-50 flex flex-col overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white border-b border-gray-150 px-8 py-5 sticky top-0 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-primary uppercase tracking-[0.25em]">RiseBlog Studio</span>
          <span className="text-xs text-gray-400 font-extrabold px-3 py-1 bg-gray-50 rounded-lg">Full Bleed Studio</span>
        </div>
        <div className="flex gap-3">
          <button 
            type="button"
            disabled={isSaving}
            onClick={onClose} 
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button"
            disabled={isSaving}
            onClick={handleSubmit} 
            className="px-6 py-2.5 bg-primary text-white hover:bg-primary/95 disabled:opacity-50 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
          >
            {isSaving ? 'Saving Changes...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 space-y-8 animate-slide-up">
        <div className="bg-white rounded-[3.5rem] p-8 md:p-12 border border-gray-100 shadow-sm space-y-6">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Blog Post Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full px-5 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold mt-2 transition-all" 
              required 
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Cover Image URL</label>
            <input 
              type="url" 
              value={image} 
              onChange={e => setImage(e.target.value)} 
              className="w-full px-5 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold mt-2 transition-all" 
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Blog Post Body</label>
            <textarea 
              value={body} 
              onChange={e => setBody(e.target.value)} 
              rows={16} 
              className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-medium font-sans resize-none mt-2 leading-relaxed h-96" 
              required 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const EditIgniteModal: React.FC<{
  ignite: Sprint;
  onClose: () => void;
  onSave: (updated: Partial<Sprint>) => Promise<void>;
  isSaving: boolean;
}> = ({ ignite, onClose, onSave, isSaving }) => {
  const [body, setBody] = useState(ignite.igniteBody || ignite.description || '');
  const [bgColor, setBgColor] = useState(ignite.igniteBgColor || '#6D28D9');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
        alert('Please enter an inspiring thought');
        return;
    }
    const cleanSnippet = body.substring(0, 30) + (body.length > 30 ? '...' : '');
    onSave({
      title: cleanSnippet,
      igniteBody: body,
      description: body,
      igniteBgColor: bgColor,
    });
  };

  return (
    <div className="fixed inset-0 z-[300] bg-gray-50 flex flex-col overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white border-b border-gray-150 px-8 py-5 sticky top-0 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-primary uppercase tracking-[0.25em]">Ignite Studio</span>
          <span className="text-xs text-gray-400 font-extrabold px-3 py-1 bg-gray-50 rounded-lg">Full Bleed Studio</span>
        </div>
        <div className="flex gap-3">
          <button 
            type="button"
            disabled={isSaving}
            onClick={onClose} 
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button"
            disabled={isSaving}
            onClick={handleSubmit} 
            className="px-6 py-2.5 bg-primary text-white hover:bg-primary/95 disabled:opacity-50 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
          >
            {isSaving ? 'Saving Changes...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 space-y-8 animate-slide-up">
        <div className="bg-white rounded-[3.5rem] p-8 md:p-12 border border-gray-100 shadow-sm space-y-6">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Inspire someone today (Double break splits slides)</label>
            <textarea 
              value={body} 
              onChange={e => setBody(e.target.value)} 
              rows={10} 
              className="w-full px-5 py-4 border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none mt-2 font-medium resize-none text-center text-lg leading-relaxed h-[250px] italic pt-16" 
              required 
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Set Background Color theme</label>
            <div className="flex flex-wrap gap-3 mt-3">
              {IGNITE_COLORS.map(color => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setBgColor(color.hex)}
                  className={`w-12 h-12 rounded-full border-2 transition-all relative flex items-center justify-center hover:scale-105 active:scale-95 cursor-pointer`}
                  style={{ 
                    backgroundColor: color.hex,
                    borderColor: bgColor === color.hex ? '#3B82F6' : 'transparent' 
                  }}
                  title={color.name}
                >
                  {bgColor === color.hex && (
                    <span className="text-white text-xs font-black">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
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
  const [activeTab, setActiveTab] = useState<'sprint' | 'blog' | 'ignite'>('sprint');
  const [isLoading, setIsLoading] = useState(true);
  
  const [sprintToDelete, setSprintToDelete] = useState<Sprint | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit states for blog and ignite
  const [editingBlog, setEditingBlog] = useState<Sprint | null>(null);
  const [editingIgnite, setEditingIgnite] = useState<Sprint | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    setIsLoading(true);
    
    // 1. Subscribe to coach's sprints in real-time
    const unsubSprints = sprintService.subscribeToCoachSprints(user.id, (data) => {
        setSprints(data);
        setIsLoading(false);
    });

    // 2. Load orchestration mapping
    const loadOrchestration = async () => {
        try {
            const orchestration = await sprintService.getOrchestration();
            const liveIds = new Set(
                Object.values(orchestration)
                    .map(m => m.sprintId)
                    .filter(id => !!id)
            );
            setOrchestratedIds(liveIds);
        } catch (err) {
            console.error(err);
        }
    };
    
    loadOrchestration();
    return () => unsubSprints();
  }, [user, location.key]);

  const filteredSprints = useMemo(() => {
    // Standard tab isolation
    let tFiltered = sprints.filter(s => {
      if (activeTab === 'sprint') {
        return !s.contentType || s.contentType === 'sprint';
      }
      return s.contentType === activeTab;
    });

    let filtered = tFiltered;
    if (filter === 'published') filtered = tFiltered.filter(s => s.published);
    else if (filter === 'pending') filtered = tFiltered.filter(s => s.approvalStatus === 'pending_approval');
    else if (filter === 'rejected') filtered = tFiltered.filter(s => s.approvalStatus === 'rejected');
    else if (filter === 'draft') filtered = tFiltered.filter(s => s.approvalStatus === 'draft');
    
    return [...filtered].sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
  }, [sprints, activeTab, filter]);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
        await sprintService.deleteSprint(id);
        setSprintToDelete(null);
    } catch (err) {
        alert("Failed to delete sprint.");
    } finally {
        setIsDeleting(false);
    }
  };

  const handleSaveBlogEdit = async (updated: Partial<Sprint>) => {
    if (!editingBlog) return;
    setSavingEdit(true);
    try {
      await sprintService.updateSprint(editingBlog.id, updated);
      setEditingBlog(null);
    } catch (err) {
      console.error(err);
      alert('Save blog edit failed.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveIgniteEdit = async (updated: Partial<Sprint>) => {
    if (!editingIgnite) return;
    setSavingEdit(true);
    try {
      await sprintService.updateSprint(editingIgnite.id, updated);
      setEditingIgnite(null);
    } catch (err) {
      console.error(err);
      alert('Save ignite edit failed.');
    } finally {
      setSavingEdit(false);
    }
  };

  if (!user) return null;

  const fallbackUrl = assetService.URLS.DEFAULT_SPRINT_COVER;

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

      {editingBlog && (
          <EditBlogModal 
            blog={editingBlog}
            onClose={() => setEditingBlog(null)}
            onSave={handleSaveBlogEdit}
            isSaving={savingEdit}
          />
      )}

      {editingIgnite && (
          <EditIgniteModal 
            ignite={editingIgnite}
            onClose={() => setEditingIgnite(null)}
            onSave={handleSaveIgniteEdit}
            isSaving={savingEdit}
          />
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight italic">Manage Sprints</h1>
            <p className="text-gray-500 font-medium text-sm">Curate and track your growth cycles.</p>
        </div>
        {hasPermission('sprint:create') && (
            <Link to="/coach/sprint/new" className="bg-primary text-white rounded-xl px-6 py-3 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-center">
                + Create New
            </Link>
        )}
      </div>

      {/* Tabbed Interface Selector (Sprint, RiseBlog, Ignite) */}
      <div className="flex justify-start mb-6">
        <div className="inline-flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
            <button
                type="button"
                onClick={() => {
                    setActiveTab('sprint');
                    setFilter('all');
                }}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    activeTab === 'sprint' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-primary hover:bg-gray-50'
                }`}
            >
                Sprint
            </button>
            <button
                type="button"
                onClick={() => {
                    setActiveTab('blog');
                    setFilter('all');
                }}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    activeTab === 'blog' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-primary hover:bg-gray-50'
                }`}
            >
                RiseBlog
            </button>
            <button
                type="button"
                onClick={() => {
                    setActiveTab('ignite');
                    setFilter('all');
                }}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    activeTab === 'ignite' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-primary hover:bg-gray-50'
                }`}
            >
                Ignite
            </button>
        </div>
      </div>

      {/* filter menu */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {['all', 'published', 'pending', 'rejected', 'draft'].map(f => (
            <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap border cursor-pointer ${
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
                  const showNotLiveBadge = isApproved && !isOrchestrated && (!sprint.contentType || sprint.contentType === 'sprint');

                  return (
                      <div key={sprint.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 group hover:shadow-md transition-all">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-inner bg-gray-100">
                              <img 
                                src={sprint.coverImageUrl || fallbackUrl} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                alt="" 
                                onError={(e) => { e.currentTarget.src = fallbackUrl }}
                              />
                          </div>
                          <div className="flex-1 min-w-0 text-center sm:text-left">
                              <div className="flex items-center gap-3 mb-1 justify-center sm:justify-start">
                                <h3 className="font-black text-gray-900 text-lg group-hover:text-primary transition-colors truncate tracking-tight">{sprint.title}</h3>
                                {showNotLiveBadge && (
                                    <span className="px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-md text-[7px] font-black uppercase tracking-widest shrink-0">
                                        Not Live (Pending Orchestration)
                                    </span>
                                )}
                              </div>
                              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 text-[9px] font-black text-gray-400 mt-2 uppercase tracking-widest">
                                  <span className="px-2 py-1 bg-gray-50 rounded-lg">{sprint.contentType || 'Sprint'}</span>
                                  <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                                  <span className="px-2 py-1 bg-gray-50 rounded-lg">{sprint.category || 'General'}</span>
                                  <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                                  <span className={`px-2 py-1 rounded-lg ${
                                      sprint.approvalStatus === 'approved' ? 'bg-green-50 text-green-600 border border-green-100' : 
                                      sprint.approvalStatus === 'rejected' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                      'bg-blue-50 text-blue-500 border border-blue-100'
                                  }`}>
                                      {sprint.approvalStatus === 'rejected' ? 'Amend Required' : sprint.approvalStatus?.replace('_', ' ') || 'draft'}
                                  </span>
                              </div>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                            {sprint.contentType === 'blog' ? (
                                <button 
                                    onClick={() => setEditingBlog(sprint)}
                                    className="px-8 py-3 bg-white border border-gray-100 hover:bg-gray-50 hover:text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex-1 sm:flex-none cursor-pointer"
                                >
                                    Edit RiseBlog
                                </button>
                            ) : sprint.contentType === 'ignite' ? (
                                <button 
                                    onClick={() => setEditingIgnite(sprint)}
                                    className="px-8 py-3 bg-white border border-gray-100 hover:bg-gray-50 hover:text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex-1 sm:flex-none cursor-pointer"
                                >
                                    Edit Ignite
                                </button>
                            ) : (
                                <Link to={`/coach/sprint/edit/${sprint.id}`} className="flex-1 sm:flex-none">
                                    <button className={`w-full sm:w-auto px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${
                                        sprint.approvalStatus === 'rejected' 
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-100 hover:bg-orange-600' 
                                        : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-primary'
                                    }`}>
                                        {sprint.approvalStatus === 'rejected' ? 'Fix Errors' : 'Edit Sprint'}
                                    </button>
                                </Link>
                            )}
                            <button 
                                onClick={() => setSprintToDelete(sprint)}
                                className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90 cursor-pointer"
                                title="Delete Course"
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
