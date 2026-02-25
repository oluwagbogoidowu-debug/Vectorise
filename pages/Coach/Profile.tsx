import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Coach, Sprint } from '../../types';
import { sprintService } from '../../services/sprintService';
import ArchetypeAvatar from '../../components/ArchetypeAvatar';

const CoachProfile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const coachSprints = await sprintService.getSprintsByCoach(user.id);
        setSprints(coachSprints);
      } catch (err) {
        console.error("Profile sync failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }
  const c = user as Coach;

  return (
    <div className="bg-[#FDFDFD] h-screen w-full font-sans overflow-hidden flex flex-col animate-fade-in">
      
      <div className="bg-white px-6 pt-8 pb-6 border-b border-gray-50 flex-shrink-0">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <ArchetypeAvatar 
                archetypeId={c.archetype} 
                profileImageUrl={c.profileImageUrl} 
                size="xl" 
              />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">{c.name}</h1>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{c.email}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Joined</span>
                  <span className="text-[9px] font-bold text-gray-600">{new Date(c.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-dark rounded-3xl p-4 text-white relative overflow-hidden flex flex-col justify-center active:scale-[0.98] transition-all">
             <p className="text-[7px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Rise Score</p>
             <div className="flex items-end gap-1">
               <h3 className="text-2xl font-black tracking-tighter">{c.walletBalance || 0}</h3>
               <span className="text-[10px] mb-1 opacity-40">🪙</span>
             </div>
          </div>

          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col justify-center active:scale-[0.98] transition-all">
            <p className="text-[7px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">Lives Impacted</p>
            <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{c.impactStats?.peopleHelped || 0}</h3>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-5">
        <h2 className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2 px-1">
          My Sprints
        </h2>
        {sprints.length > 0 ? (
            <div className="space-y-2">
                {sprints.map(sprint => (
                    <Link to={`/coach/sprint/edit/${sprint.id}`} key={sprint.id} className="block bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">🚀</div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[9px] font-black text-gray-900 truncate uppercase tracking-tight">{sprint.title}</h4>
                            <p className="text-[8px] text-gray-400 font-medium mt-0.5">{sprint.subtitle}</p>
                        </div>
                    </Link>
                ))}
            </div>
        ) : (
            <div className="p-4 bg-gray-50 rounded-3xl border border-dashed border-gray-100 text-center">
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">No sprints created yet.</p>
            </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.03); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default CoachProfile;
