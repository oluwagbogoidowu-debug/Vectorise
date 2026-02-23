
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Participant, ParticipantSprint, Sprint, Coach } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import LocalLogo from '../../components/LocalLogo';
import ArchetypeAvatar from '../../components/ArchetypeAvatar';
import { ARCHETYPES, GROWTH_AREAS, RISE_PATHWAYS } from '../../constants';

const Profile: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  const [enrollments, setEnrollments] = useState<{ enrollment: ParticipantSprint; sprint: Sprint; coach: Coach | null }[]>([]);
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
        const enriched = await Promise.all(userEnrollments.map(async (en) => {
          const sprint = await sprintService.getSprintById(en.sprint_id);
          if (!sprint) return null;
          const coachData = await userService.getUserDocument(sprint.coachId);
          return { enrollment: en, sprint, coach: (coachData as Coach) || null };
        }));
        
        setEnrollments(enriched.filter((x) => x !== null) as any);
        setTempGrowthAreas((user as Participant).growthAreas || []);
        setTempRisePathway((user as Participant).risePathway || '');
      } catch (err) {
        console.error("Profile sync failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (!user) return null;
  const p = user as Participant;

  const currentArchetype = useMemo(() => {
    const p = user as Participant;
    return ARCHETYPES.find(a => a.id === p.archetype);
  }, [user]);

  const activeEntry = useMemo(() => enrollments.find(e => e.enrollment.progress.some(p => !p.completed)), [enrollments]);
  const completedEntries = useMemo(() => enrollments.filter(e => e.enrollment.progress.every(p => p.completed)), [enrollments]);

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
      await updateProfile({ 
        growthAreas: tempGrowthAreas,
        risePathway: tempRisePathway
      });
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
          <div className="flex items-center gap-5">
            <div className="relative group">
              <ArchetypeAvatar 
                archetypeId={p.archetype} 
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
                  <span className="text-[9px] font-bold text-gray-600">{new Date(p.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-200"></div>
                <Link 
                  to="/profile/settings"
                  className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                >
                  Account Settings
                </Link>
              </div>
            </div>
          </div>
          <button onClick={logout} className="p-2 text-gray-200 hover:text-red-400 transition-all active:scale-90">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>

        {/* Rise and Impact Cards Moved Up */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-dark rounded-3xl p-4 text-white relative overflow-hidden flex flex-col justify-center">
             <p className="text-[7px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Rise</p>
             <div className="flex items-end gap-1">
               <h3 className="text-2xl font-black tracking-tighter">{p.walletBalance || 0}</h3>
               <span className="text-[10px] mb-1 opacity-40">🪙</span>
             </div>
          </div>

          <Link to="/impact" className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-[7px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">Impact</p>
            <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{p.impactStats?.peopleHelped || 0}</h3>
          </Link>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-5">
        
        {/* Progressive Identity Tasks */}
        {(!p.growthAreas || p.growthAreas.length === 0 || !p.risePathway) && (
          <div className="space-y-3 animate-fade-in">
            <SectionLabel text="Identity Setup" />
            
            {/* Task 1: Growth Areas (Progressive) */}
            {(!p.growthAreas || p.growthAreas.length === 0) ? (
              <div className="bg-white rounded-[2rem] p-6 border border-primary/10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <svg className="w-12 h-12 text-primary" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
                </div>
                <h3 className="text-sm font-black text-gray-900 mb-1">Where do you want to grow next?</h3>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">Pick one from each group ({currentTaskGroupIdx + 1}/5)</p>
                
                <div className="mb-6">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3">{GROWTH_AREAS[currentTaskGroupIdx].group}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {GROWTH_AREAS[currentTaskGroupIdx].options.map(area => (
                      <button
                        key={area}
                        onClick={() => handleToggleGrowthArea(area)}
                        className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${tempGrowthAreas.includes(area) ? 'bg-primary text-white shadow-md scale-105' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {currentTaskGroupIdx > 0 && (
                    <button 
                      onClick={() => setCurrentTaskGroupIdx(prev => prev - 1)}
                      className="flex-1 py-3 bg-gray-50 text-gray-400 rounded-xl font-black uppercase tracking-widest text-[9px] border border-gray-100"
                    >
                      Back
                    </button>
                  )}
                  <button 
                    onClick={handleSaveIdentity}
                    disabled={tempGrowthAreas.length === 0 || isSavingIdentity}
                    className="flex-[2] py-3 bg-primary text-white rounded-xl font-black uppercase tracking-[0.2em] text-[9px] shadow-md disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
                  >
                    {isSavingIdentity ? 'Saving...' : currentTaskGroupIdx < 4 ? 'Next Group' : 'Confirm Growth Areas'}
                  </button>
                </div>
              </div>
            ) : !p.risePathway ? (
              /* Task 2: Rise Pathway */
              <div className="bg-white rounded-[2rem] p-6 border border-primary/10 shadow-sm relative overflow-hidden animate-slide-up">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <svg className="w-12 h-12 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" /></svg>
                </div>
                <h3 className="text-sm font-black text-gray-900 mb-1">What best describes your current focus?</h3>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">Select your Rise Pathway.</p>
                
                <div className="space-y-2 mb-6">
                  {RISE_PATHWAYS.map(path => (
                    <button
                      key={path.id}
                      onClick={() => setTempRisePathway(path.id)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all ${tempRisePathway === path.id ? 'bg-primary/5 border-primary/20 scale-[1.02] shadow-sm' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                    >
                      <h4 className="text-[10px] font-black text-gray-900">{path.name}</h4>
                      <p className="text-[8px] text-gray-400 font-medium mt-0.5">{path.description}</p>
                    </button>
                  ))}
                </div>
                
                <button 
                  onClick={handleSaveIdentity}
                  disabled={!tempRisePathway || isSavingIdentity}
                  className="w-full py-3 bg-primary text-white rounded-xl font-black uppercase tracking-[0.2em] text-[9px] shadow-md disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
                >
                  {isSavingIdentity ? 'Saving...' : 'Complete Setup'}
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Active Path Section */}
        <section>
          <SectionLabel text="Active Path" />
          {activeEntry ? (
            <Link to={`/participant/sprint/${activeEntry.enrollment.id}`} className="block">
              <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm relative overflow-hidden flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0 text-xl">🎯</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[7px] font-black text-primary uppercase tracking-widest mb-0.5">{p.currentStage || 'Active Path'}</p>
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

        {/* Growth Areas Display (Below Active Path) */}
        {p.growthAreas && p.growthAreas.length > 0 && (
          <section className="animate-fade-in">
            <SectionLabel text="Growth Focus" />
            <div className="flex flex-wrap gap-2 px-1">
              {p.growthAreas.map((area, i) => (
                <div 
                  key={i} 
                  className={`${growthAreaColors[i % growthAreaColors.length]} px-4 py-2 rounded-full border font-black italic text-[10px] shadow-sm`}
                >
                  {area}.
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Rise Archive Click-through Button */}
        <div className="px-1 pt-2">
          <Link 
            to="/profile/archive"
            className="w-full py-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm flex items-center justify-between px-6 group active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-sm">📂</div>
              <span className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Rise Archive</span>
            </div>
            <svg 
              className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

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

export default Profile;
