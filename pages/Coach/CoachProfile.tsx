import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Participant, ParticipantSprint, Sprint, Coach } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService, sanitizeData } from '../../services/userService';
import { shineService } from '../../services/shineService';
import LocalLogo from '../../components/LocalLogo';
import ArchetypeAvatar from '../../components/ArchetypeAvatar';
import { ARCHETYPES, GROWTH_AREAS, RISE_PATHWAYS } from '../../constants';
import { ShinePost } from '../../types';

const CoachProfile: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  const [enrollments, setEnrollments] = useState<{ enrollment: ParticipantSprint; sprint: Sprint; coach: Coach | null }[]>([]);
  const [reflections, setReflections] = useState<ShinePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Identity Task States
  const [currentTaskGroupIdx, setCurrentTaskGroupIdx] = useState(0);
  const [tempGrowthAreas, setTempGrowthAreas] = useState<string[]>([]);
  const [tempRisePathway, setTempRisePathway] = useState<string>('');
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const userEnrollments = await sprintService.getUserEnrollments(user.id);
        const allPosts = await shineService.getPosts();
        setReflections(allPosts.filter(p => p.userId === user.id));
        
        const enriched = await Promise.all(userEnrollments.map(async (en) => {
          const sprint = await sprintService.getSprintById(en.sprint_id);
          if (!sprint) return null;
          const coachData = await userService.getUserDocument(sprint.coachId);
          return { enrollment: en, sprint, coach: (coachData as Coach) || null };
        }));
        
        setEnrollments(enriched.filter((x) => x !== null) as any);
         
         
      } catch (err) {
        console.error("Profile sync failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (!user) return null;
  const p = user as Coach;

  const currentArchetype = useMemo(() => {
    const p = user as Coach;
    return null;
  }, [user]);

  const activeEntry = useMemo(() => enrollments.find(e => e.enrollment.progress.some(p => !p.completed)), [enrollments]);
  const completedEntries = useMemo(() => enrollments.filter(e => e.enrollment.progress.every(p => p.completed)), [enrollments]);

  const milestones = useMemo(() => {
    if (!user) return [];
    const p = user as Coach;
    const completedSprints = enrollments.filter(e => e.enrollment.progress.every(day => day.completed));
    const peopleHelped = 0;
    const reflectionsCount = reflections.length;
    
    const list = [
      { id: 's1', title: 'First Spark', icon: '🚀', currentValue: enrollments.length, targetValue: 1 },
      { id: 's2', title: 'The Closer', icon: '🏁', currentValue: completedSprints.length, targetValue: 1 },
      { id: 'i1', title: 'Impact 1 Degree', icon: '🌱', currentValue: peopleHelped, targetValue: 1 },
      { id: 'c1', title: 'The Start', icon: '💡', currentValue: reflectionsCount, targetValue: 1 },
    ];
    
    return list.map(m => ({ ...m, progress: Math.min(100, (m.currentValue / m.targetValue) * 100) }));
  }, [user, enrollments, reflections]);

  const handleToggleGrowthArea = (area: string) => {
    setTempGrowthAreas(prev => {
      // If we're in the progressive flow, we just replace or add for the current group
      // But the user said "First one appear you pick one then the second one appear"
      // So we pick one per group.
      const currentGroup = GROWTH_AREAS[currentTaskGroupIdx];
      const otherAreas = prev.filter(a => !currentGroup.options.includes(a));
      
      const newAreas = [...otherAreas, area];
      
      // Move to next group if not at the end
      if (currentTaskGroupIdx < GROWTH_AREAS.length - 1) {
        setCurrentTaskGroupIdx(prevIdx => prevIdx + 1);
      }
      
      return newAreas;
    });
  };

  const handleSaveIdentity = async () => {
    setIsSavingIdentity(true);
    try {
      await updateProfile(sanitizeData({ 
        growthAreas: tempGrowthAreas,
        risePathway: tempRisePathway
      }));
    } catch (e) {
      alert("Failed to save identity settings.");
    } finally {
      setIsSavingIdentity(false);
    }
  };

  const SectionLabel = ({ text }: { text: string }) => (
    <h2 className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2 px-1">
      {text}
    </h2>
  );

  const growthAreaColors = [
    "bg-emerald-50 text-emerald-800 border-emerald-100",
    "bg-indigo-50 text-indigo-800 border-indigo-100",
    "bg-orange-50 text-orange-800 border-orange-100",
    "bg-rose-50 text-rose-800 border-rose-100",
    "bg-amber-50 text-amber-800 border-amber-100"
  ];

  return (
    <div className="bg-[#FDFDFD] h-screen w-full font-sans overflow-hidden flex flex-col animate-fade-in">
      
      <div className="bg-white px-6 pt-8 pb-6 border-b border-gray-50 flex-shrink-0">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-5">
            <div className="relative group">
              <ArchetypeAvatar 
 
                profileImageUrl={p.profileImageUrl} 
                size="xl" 
              />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">{p.name}</h1>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{p.email}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Joined</span>

                </div>
              </div>
            </div>
            </div>
            <Link to="/coach/profile/settings" className="p-3.5 bg-white text-gray-400 hover:text-primary rounded-2xl shadow-sm border border-gray-100 transition-all active:scale-90 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </Link>
          </div>

        </div>


      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-5">
        


        {/* Active Path Section */}
        <section>
          <SectionLabel text="Active Path" />
          {activeEntry ? (
            <Link to={`/participant/sprint/${activeEntry.enrollment.id}`} className="block">
              <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm relative overflow-hidden flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0 text-xl">🎯</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[7px] font-black text-primary uppercase tracking-widest mb-0.5">{'Active Path'}</p>
                  <h3 className="text-xs font-black text-gray-900 truncate">{activeEntry.sprint.title}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-gray-50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all" 
                        style={{ width: `${(activeEntry.enrollment.progress.filter(x => x.completed).length / activeEntry.sprint.duration) * 100}%` }}
                      />
                    </div>
                    <span className="text-[8px] font-bold text-gray-400">Day {activeEntry.enrollment.progress.filter(x => x.completed).length + 1}</span>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="p-4 bg-gray-50 rounded-3xl border border-dashed border-gray-100 text-center">
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">No active cycles</p>
            </div>
          )}
        </section>











        <footer className="text-center pt-10">
            <p className="text-[7px] font-black text-gray-200 uppercase tracking-[0.4em]">Vectorise • Profile 5.0 Progressive</p>
        </footer>

      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.03); border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default CoachProfile;
