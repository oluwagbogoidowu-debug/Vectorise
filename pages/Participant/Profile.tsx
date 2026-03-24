
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Participant, ParticipantSprint, Sprint, Coach } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService, sanitizeData } from '../../services/userService';
import { shineService } from '../../services/shineService';
import LocalLogo from '../../components/LocalLogo';
import ArchetypeAvatar from '../../components/ArchetypeAvatar';
import { ARCHETYPES, GROWTH_AREAS, RISE_PATHWAYS, PERSONA_QUIZZES, INITIAL_OPTIONS, OCCUPATION_QUESTION } from '../../constants';
import { ShinePost } from '../../types';

const Profile: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  const [enrollments, setEnrollments] = useState<{ enrollment: ParticipantSprint; sprint: Sprint; coach: Coach | null }[]>([]);
  const [reflections, setReflections] = useState<ShinePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Identity Task States
  const [currentTaskGroupIdx, setCurrentTaskGroupIdx] = useState(0);
  const [tempPersona, setTempPersona] = useState<string | null>(null);
  const [tempOccupation, setTempOccupation] = useState<string | null>(null);
  const [tempOnboardingAnswers, setTempOnboardingAnswers] = useState<Record<string, any>>({});
  const [tempGrowthAreas, setTempGrowthAreas] = useState<string[]>([]);
  const [tempRisePathway, setTempRisePathway] = useState<string>('');
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);

  // Quiz Step Logic
  // 0: Persona, 1-3: Persona Questions, 4: Occupation, 5-9: Growth Areas, 10: Rise Pathway
  const [setupStep, setSetupStep] = useState(0);

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
        
        const p = user as Participant;
        setTempPersona(p.persona || null);
        setTempOccupation(p.occupation || null);
        setTempOnboardingAnswers(p.onboardingAnswers || {});
        setTempGrowthAreas(p.growthAreas || []);
        setTempRisePathway(p.risePathway || '');

        // Determine initial setup step if incomplete
        if (!p.persona) setSetupStep(0);
        else if (Object.keys(p.onboardingAnswers || {}).length < 3) setSetupStep(1);
        else if (!p.occupation) setSetupStep(4);
        else if (!p.growthAreas || p.growthAreas.length < 5) {
          setSetupStep(5);
          setCurrentTaskGroupIdx(p.growthAreas?.length || 0);
        }
        else if (!p.risePathway) setSetupStep(10);
        else setSetupStep(-1); // Complete

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

  const milestones = useMemo(() => {
    if (!user) return [];
    const p = user as Participant;
    const completedSprints = enrollments.filter(e => e.enrollment.progress.every(day => day.completed));
    const peopleHelped = p.impactStats?.peopleHelped || 0;
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
      const currentGroup = GROWTH_AREAS[currentTaskGroupIdx];
      const otherAreas = prev.filter(a => !currentGroup.options.includes(a));
      const newAreas = [...otherAreas, area];
      
      if (currentTaskGroupIdx < GROWTH_AREAS.length - 1) {
        setCurrentTaskGroupIdx(prevIdx => prevIdx + 1);
        setSetupStep(prevStep => prevStep + 1);
      } else {
        setSetupStep(10); // Move to Rise Pathway
      }
      
      return newAreas;
    });
  };

  const handleSaveIdentity = async () => {
    setIsSavingIdentity(true);
    try {
      await updateProfile(sanitizeData({ 
        persona: tempPersona,
        occupation: tempOccupation,
        onboardingAnswers: tempOnboardingAnswers,
        growthAreas: tempGrowthAreas,
        risePathway: tempRisePathway
      }));
      // If we just finished the last step, set setupStep to -1
      if (setupStep === 10) setSetupStep(-1);
    } catch (e) {
      alert("Failed to save identity settings.");
    } finally {
      setIsSavingIdentity(false);
    }
  };

  const handleQuizOptionSelect = (option: string) => {
    if (setupStep === 0) {
      setTempPersona(option);
      setSetupStep(1);
    } else if (setupStep >= 1 && setupStep <= 3) {
      setTempOnboardingAnswers(prev => ({ ...prev, [setupStep]: option }));
      setSetupStep(prev => prev + 1);
    } else if (setupStep === 4) {
      setTempOccupation(option);
      setSetupStep(5);
      setCurrentTaskGroupIdx(0);
    }
  };

  const totalSetupSteps = 11;
  const setupProgress = setupStep === -1 ? 100 : Math.round((setupStep / totalSetupSteps) * 100);

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
              </div>
            </div>
          </div>

        </div>

        {/* Rise and Impact Cards Moved Up */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/profile/hall-of-rise" className="bg-dark rounded-3xl p-4 text-white relative overflow-hidden flex flex-col justify-center active:scale-[0.98] transition-all">
             <p className="text-[7px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Rise Score</p>
             <div className="flex items-end gap-1">
               <h3 className="text-2xl font-black tracking-tighter">{p.walletBalance || 0}</h3>
               <span className="text-[10px] mb-1 opacity-40">🪙</span>
             </div>
          </Link>

          <Link to="/impact" className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col justify-center active:scale-[0.98] transition-all">
            <p className="text-[7px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">Lives Impacted</p>
            <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{p.impactStats?.peopleHelped || 0}</h3>
          </Link>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-5">
        
        {/* Progressive Identity Tasks */}
        {setupStep !== -1 && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between px-1">
              <SectionLabel text="Identity Setup" />
              <span className="text-[8px] font-black text-primary uppercase tracking-widest">{setupProgress}%</span>
            </div>
            
            <div className="bg-white rounded-[2rem] p-6 border border-primary/10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-50">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ width: `${setupProgress}%` }}
                />
              </div>

              {/* Step 0: Persona */}
              {setupStep === 0 && (
                <div className="animate-fade-in">
                  <h3 className="text-sm font-black text-gray-900 mb-1">Which best describes you today?</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">Select your persona</p>
                  <div className="grid grid-cols-2 gap-2">
                    {INITIAL_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleQuizOptionSelect(opt)}
                        className={`p-3 rounded-2xl border text-[10px] font-bold text-left transition-all ${tempPersona === opt ? 'bg-primary text-white border-primary shadow-md' : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Steps 1-3: Persona Questions */}
              {setupStep >= 1 && setupStep <= 3 && tempPersona && (
                <div className="animate-fade-in">
                  <h3 className="text-sm font-black text-gray-900 mb-1" dangerouslySetInnerHTML={{ __html: PERSONA_QUIZZES[tempPersona][setupStep - 1].title }} />
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">Question {setupStep}/3</p>
                  <div className="space-y-2">
                    {PERSONA_QUIZZES[tempPersona][setupStep - 1].options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleQuizOptionSelect(opt)}
                        className={`w-full p-3 rounded-xl border text-[10px] font-bold text-left transition-all ${tempOnboardingAnswers[setupStep] === opt ? 'bg-primary text-white border-primary shadow-md' : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Occupation */}
              {setupStep === 4 && (
                <div className="animate-fade-in">
                  <h3 className="text-sm font-black text-gray-900 mb-1" dangerouslySetInnerHTML={{ __html: OCCUPATION_QUESTION.title }} />
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">Employment Status</p>
                  <div className="space-y-2">
                    {OCCUPATION_QUESTION.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleQuizOptionSelect(opt)}
                        className={`w-full p-3 rounded-xl border text-[10px] font-bold text-left transition-all ${tempOccupation === opt ? 'bg-primary text-white border-primary shadow-md' : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Steps 5-9: Growth Areas */}
              {setupStep >= 5 && setupStep <= 9 && (
                <div className="animate-fade-in">
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
                </div>
              )}

              {/* Step 10: Rise Pathway */}
              {setupStep === 10 && (
                <div className="animate-fade-in">
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
              )}

              {/* Navigation Controls for Quiz Steps */}
              {setupStep > 0 && setupStep < 10 && (
                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={() => {
                      setSetupStep(prev => prev - 1);
                      if (setupStep > 5) setCurrentTaskGroupIdx(prev => prev - 1);
                    }}
                    className="flex-1 py-3 bg-gray-50 text-gray-400 rounded-xl font-black uppercase tracking-widest text-[9px] border border-gray-100"
                  >
                    Back
                  </button>
                  {/* Save Progress Button */}
                  <button 
                    onClick={handleSaveIdentity}
                    disabled={isSavingIdentity}
                    className="flex-1 py-3 bg-white text-primary border border-primary/20 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-sm active:scale-95 transition-all"
                  >
                    {isSavingIdentity ? 'Saving...' : 'Save Progress'}
                  </button>
                </div>
              )}
            </div>
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

        {/* Hall of Rise Preview (Badges) */}
        <section className="animate-fade-in">
          <div className="flex items-center justify-between mb-2 px-1">
            <SectionLabel text="Hall of Rise" />
            <Link to="/profile/hall-of-rise" className="text-[8px] font-black text-primary uppercase tracking-widest hover:underline">See more</Link>
          </div>
          <div className="space-y-2">
            {milestones.slice(0, 3).map((m) => (
              <div key={m.id} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                  {m.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[9px] font-black text-gray-900 truncate uppercase tracking-tight">{m.title}</h4>
                  <div className="mt-1.5 h-1 bg-gray-50 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${m.progress}%` }} />
                  </div>
                </div>
                <div className="text-[7px] font-black text-gray-400 uppercase tracking-widest">{m.progress === 100 ? 'Unlocked' : `${m.progress.toFixed(0)}%`}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Growth Focus Display */}
        {p.growthAreas && p.growthAreas.length > 0 && (
          <section className="animate-fade-in">
            <div className="flex items-center justify-between mb-2 px-1">
              <SectionLabel text="Growth Focus" />
              <button 
                onClick={() => setSetupStep(0)} 
                className="text-[8px] font-black text-primary uppercase tracking-widest hover:underline"
              >
                Refine
              </button>
            </div>
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

        {/* Hall of Rise Link */}
        <div className="px-1">
          <Link 
            to="/profile/hall-of-rise"
            className="w-full py-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm flex items-center justify-between px-6 group active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-sm">🏆</div>
              <span className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Hall of Rise</span>
            </div>
            <svg 
              className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Rise Archive Link */}
        <div className="px-1">
          <Link 
            to="/profile/archive"
            className="w-full py-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm flex items-center justify-between px-6 group active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-sm">🏛️</div>
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

        {/* Account Settings Button */}
        <div className="px-1">
          <Link 
            to="/profile/settings"
            className="w-full py-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm flex items-center justify-between px-6 group active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-sm">⚙️</div>
              <span className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Account Settings</span>
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
