
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Participant, ParticipantSprint, Sprint, Coach } from '../../types';
import { sprintService } from '../../services/sprintService';
import { userService, sanitizeData } from '../../services/userService';
import { shineService } from '../../services/shineService';
import LocalLogo from '../../components/LocalLogo';
import ArchetypeAvatar from '../../components/ArchetypeAvatar';
import { ARCHETYPES, GROWTH_AREAS, RISE_PATHWAYS, PERSONA_QUIZZES, INITIAL_OPTIONS } from '../../constants';
import { ShinePost } from '../../types';
import { MILESTONES } from '../../services/milestoneConstants';

const Profile: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  const [enrollments, setEnrollments] = useState<{ enrollment: ParticipantSprint; sprint: Sprint; coach: Coach | null }[]>([]);
  const [reflections, setReflections] = useState<ShinePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Identity Task States
  const [currentTaskGroupIdx, setCurrentTaskGroupIdx] = useState(0);
  const [tempPersona, setTempPersona] = useState<string | null>(null);
  const [tempOnboardingAnswers, setTempOnboardingAnswers] = useState<Record<string, any>>({});
  const [tempGrowthAreas, setTempGrowthAreas] = useState<string[]>([]);
  const [tempRisePathway, setTempRisePathway] = useState<string>('');
  const [tempProfileImageUrl, setTempProfileImageUrl] = useState<string | null>(null);
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);

  // Quiz Step Logic
  // -2: Loading/Checking, -1: Complete, 0: Persona, 1-3: Persona Questions, 4: Occupation, 5-9: Growth Areas, 10: Rise Pathway
  const [setupStep, setSetupStep] = useState(-2);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    const unsubscribes: (() => void)[] = [];

    // 1. Subscribe to enrollments
    const sub1 = sprintService.subscribeToUserEnrollments(user.id, async (userEnrollments) => {
        try {
            // Get all unique sprint IDs
            const sprintIds = Array.from(new Set(userEnrollments.map(en => en.sprint_id)));
            
            // Fetch all sprints in parallel
            const sprintsData = await sprintService.getSprintsByIds(sprintIds);
            const sprintsMap = Object.fromEntries(sprintsData.map(s => [s.id, s]));
            
            // Get all unique coach IDs from the fetched sprints
            const coachIds = Array.from(new Set(sprintsData.map(s => s.coachId)));
            
            // Fetch all coaches in parallel
            const coachesData = await userService.getUsersByIds(coachIds);
            const coachesMap = Object.fromEntries(coachesData.map(c => [c.id || (c as any).uid, c as unknown as Coach]));
            
            const enriched = userEnrollments.map(en => {
                const sprint = sprintsMap[en.sprint_id];
                if (!sprint) return null;
                const coach = coachesMap[sprint.coachId] || null;
                return { enrollment: en, sprint, coach };
            }).filter((x) => x !== null) as any;
            
            setEnrollments(enriched);
            setIsLoading(false);
        } catch (err) {
            console.error("Profile enrollment sync failed:", err);
            setIsLoading(false);
        }
    });
    unsubscribes.push(sub1);

    // 2. Subscribe to reflections (posts)
    const sub2 = shineService.subscribeToPosts((allPosts) => {
        const userReflections = allPosts.filter(p => p.userId === user.id);
        setReflections(userReflections);
    });
    unsubscribes.push(sub2);

    // 3. Initialize temp states from user
    const p = user as Participant;
    setTempPersona(p.persona || null);
    setTempOnboardingAnswers(p.onboardingAnswers || {});
    setTempGrowthAreas(p.growthAreas || []);
    setTempRisePathway(p.risePathway || '');
    setTempProfileImageUrl(p.profileImageUrl || null);

    // Determine initial setup step if incomplete
    if (!userService.isIdentitySet(p)) {
      setSetupStep(0); 
    } else {
      setSetupStep(-1); // Complete
    }

    return () => {
        unsubscribes.forEach(unsub => unsub());
    };
  }, [user?.id]);

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
    const claimedIds = p.claimedMilestoneIds || [];
    
    // Calculate unique days with task completion
    const allCompletedDates = enrollments.flatMap(e => 
        e.enrollment.progress
            .filter(day => day.completed && day.completedAt)
            .map(day => new Date(day.completedAt!).toDateString())
    );
    const totalTaskDays = new Set(allCompletedDates).size;
    const peopleHelped = p.impactStats?.peopleHelped || 0;
    const reflectionsCount = reflections.length;
    const meaningfulReflections = reflections.filter(r => r.content.trim().length > 50).length;
    const startedSprints = enrollments.length;
    const completedSprints = enrollments.filter(e => e.enrollment.progress.every(day => day.completed)).length;

    const getStatValue = (id: string) => {
        switch(id) {
            case 's1': return startedSprints;
            case 's2': return completedSprints;
            case 's4': return totalTaskDays;
            case 'cm1': return totalTaskDays;
            case 'cm2': return totalTaskDays;
            case 'r1': return meaningfulReflections;
            case 'r2': return meaningfulReflections;
            case 'i1': return peopleHelped;
            case 'i3': return peopleHelped;
            case 'i5': return peopleHelped;
            case 'i10': return peopleHelped;
            default: return 0;
        }
    };

    const allMilestones = MILESTONES.map(m => {
        const val = getStatValue(m.id);
        const progress = Math.min(100, (val / m.targetValue) * 100);
        const isClaimed = claimedIds.includes(m.id);
        return { ...m, currentValue: val, progress, isClaimed };
    });

    // 3. Next unclaimed Influence milestone (Constant at #3)
    const nextInfluence = allMilestones.find(m => m.category === 'influence' && !m.isClaimed) || 
                          allMilestones.filter(m => m.category === 'influence').pop();

    // 1. Most recently claimed badge
    const lastClaimedId = claimedIds.length > 0 ? claimedIds[claimedIds.length - 1] : null;
    const lastClaimed = allMilestones.find(m => m.id === lastClaimedId);

    // 2. Next closest to completion (unclaimed, excluding nextInfluence)
    const unclaimed = allMilestones.filter(m => !m.isClaimed && m.id !== nextInfluence?.id);
    const closestToCompletion = [...unclaimed].sort((a, b) => b.progress - a.progress)[0];

    const result: any[] = [];
    
    // Add last claimed if it's not the influence one we're showing at #3
    if (lastClaimed && lastClaimed.id !== nextInfluence?.id) {
        result.push(lastClaimed);
    }
    
    // Add closest to completion
    if (closestToCompletion) {
        result.push(closestToCompletion);
    }

    // Fill up to 2 if needed (excluding nextInfluence)
    if (result.length < 2) {
        const others = allMilestones.filter(m => !result.find(r => r.id === m.id) && m.id !== nextInfluence?.id);
        while (result.length < 2 && others.length > 0) {
            result.push(others.shift()!);
        }
    }

    // Always put nextInfluence at index 2
    if (nextInfluence) {
        result[2] = nextInfluence;
    }

    return result.slice(0, 3).map(m => ({
        ...m,
        displayValue: m.category === 'influence' ? `${m.currentValue}/${m.targetValue} invite` : `${m.progress.toFixed(0)}%`
    }));
  }, [user, enrollments, reflections]);

  const handleStartSetup = () => {
    const p = user as Participant;
    if (!p.persona) setSetupStep(1);
    else if (Object.keys(p.onboardingAnswers || {}).length < 3) {
      setSetupStep(2 + Object.keys(p.onboardingAnswers || {}).length);
    }
    else if (!p.growthAreas || p.growthAreas.length < 5) {
      const currentCount = p.growthAreas?.length || 0;
      setSetupStep(5 + currentCount);
      setCurrentTaskGroupIdx(currentCount);
    }
    else if (!p.risePathway) setSetupStep(10);
    else if (!p.profileImageUrl) setSetupStep(11);
    else setSetupStep(-1);
  };

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
        onboardingAnswers: tempOnboardingAnswers,
        growthAreas: tempGrowthAreas,
        risePathway: tempRisePathway,
        profileImageUrl: tempProfileImageUrl
      }));
      // If we just finished the last step, set setupStep to -1
      if (setupStep === 11) {
        setSetupStep(-1);
        // Auto-claim Identity Setup
        await userService.claimMilestone(user.id, 'setup_identity', 20, true);
      }
    } catch (e) {
      userService.queueNotification('error', "Failed to save identity settings.", { duration: 3000 });
    } finally {
      setIsSavingIdentity(false);
    }
  };

  const handleQuizOptionSelect = (option: string) => {
    if (setupStep === 1) {
      setTempPersona(option);
    } else if (setupStep >= 2 && setupStep <= 4) {
      setTempOnboardingAnswers(prev => ({ ...prev, [setupStep - 1]: option }));
      if (setupStep === 4) {
        setSetupStep(5);
        setCurrentTaskGroupIdx(0);
      } else {
        setSetupStep(prev => prev + 1);
      }
    }
  };

  const currentQuiz = useMemo(() => {
    if (!tempPersona || !PERSONA_QUIZZES[tempPersona]) return null;
    const quizStep = setupStep;
    if (quizStep < 2 || quizStep > 4) return null;
    return PERSONA_QUIZZES[tempPersona];
  }, [tempPersona, setupStep]);

  const currentGrowthGroup = useMemo(() => {
    if (currentTaskGroupIdx < 0 || currentTaskGroupIdx >= GROWTH_AREAS.length) return null;
    return GROWTH_AREAS[currentTaskGroupIdx];
  }, [currentTaskGroupIdx]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempProfileImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const totalSetupSteps = 12;
  const setupProgress = (isLoading || setupStep === -2) ? 0 : (setupStep === -1 ? 100 : Math.max(0, Math.min(99, Math.round((Math.max(0, setupStep) / totalSetupSteps) * 100))));

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

        {/* Rise and Impact Cards Moved Up - Only show if identity is set */}
        {setupStep === -1 && (
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
        )}
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-5">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Syncing Identity...</p>
          </div>
        ) : (
          <>
            {/* Progressive Identity Tasks */}
            {setupStep >= 0 && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between px-1">
              <SectionLabel text="Identity Setup" />
              <span className="text-[8px] font-black text-[#0E7850] uppercase tracking-widest">{setupProgress}%</span>
            </div>
            
            <div className="bg-white rounded-[2rem] p-6 border border-[#0E7850]/10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-50">
                <div 
                  className="h-full bg-[#0E7850] transition-all duration-500" 
                  style={{ width: `${setupProgress}%` }}
                />
              </div>

              {/* Step 0: Start Screen */}
              {setupStep === 0 && (
                <div className="animate-fade-in py-4 text-center flex flex-col items-center justify-center min-h-[240px]">
                  <div className="w-16 h-16 bg-[#E6F2ED] rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">👋</span>
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-3">Welcome to your journey</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.05em] leading-relaxed px-4">
                    We're excited to help you grow. Let's start by setting up your identity profile.
                  </p>
                </div>
              )}

              {/* Step 1: Persona */}
              {setupStep === 1 && (
                <div className="animate-fade-in min-h-[240px]">
                  <h3 className="text-sm font-black text-gray-900 mb-1">Which best describes you today?</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">Select your persona</p>
                  <div className="grid grid-cols-2 gap-2">
                    {INITIAL_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleQuizOptionSelect(opt)}
                        className={`p-3 rounded-2xl border text-[10px] font-bold text-left transition-all ${tempPersona === opt ? 'bg-[#0E7850] text-white border-[#0E7850] shadow-md' : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Steps 2-4: Persona Questions */}
              {setupStep >= 2 && setupStep <= 4 && tempPersona && currentQuiz && currentQuiz[setupStep - 2] && (
                <div className="animate-fade-in min-h-[240px]">
                  <h3 className="text-sm font-black text-gray-900 mb-1" dangerouslySetInnerHTML={{ __html: currentQuiz[setupStep - 2].title }} />
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">Question {setupStep - 1}/3</p>
                  <div className="space-y-2">
                    {currentQuiz[setupStep - 2].options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleQuizOptionSelect(opt)}
                        className={`w-full p-3 rounded-xl border text-[10px] font-bold text-left transition-all ${tempOnboardingAnswers[setupStep - 1] === opt ? 'bg-[#0E7850] text-white border-[#0E7850] shadow-md' : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Steps 5-9: Growth Areas */}
              {setupStep >= 5 && setupStep <= 9 && currentGrowthGroup && (
                <div className="animate-fade-in min-h-[240px]">
                  <h3 className="text-sm font-black text-gray-900 mb-1">Where do you want to grow next?</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">Pick one from each group ({currentTaskGroupIdx + 1}/5)</p>
                  
                  <div className="mb-6">
                    <p className="text-[10px] font-black text-[#0E7850] uppercase tracking-widest mb-3">{currentGrowthGroup.group}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {currentGrowthGroup.options.map(area => (
                        <button
                          key={area}
                          onClick={() => handleToggleGrowthArea(area)}
                          className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${tempGrowthAreas.includes(area) ? 'bg-[#0E7850] text-white shadow-md scale-105' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
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
                <div className="animate-fade-in min-h-[240px]">
                  <h3 className="text-sm font-black text-gray-900 mb-1">What best describes your current focus?</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">Select your Rise Pathway.</p>
                  
                  <div className="space-y-2 mb-6">
                    {RISE_PATHWAYS.map(path => (
                      <button
                        key={path.id}
                        onClick={() => setTempRisePathway(path.id)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all ${tempRisePathway === path.id ? 'bg-[#0E7850]/5 border-[#0E7850]/20 scale-[1.02] shadow-sm' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                      >
                        <h4 className="text-[10px] font-black text-gray-900">{path.name}</h4>
                        <p className="text-[8px] text-gray-400 font-medium mt-0.5">{path.description}</p>
                      </button>
                    ))}
                  </div>
                  
                  <button 
                    onClick={() => setSetupStep(11)}
                    disabled={!tempRisePathway}
                    className="w-full py-3 bg-[#0E7850] text-white rounded-xl font-black uppercase tracking-[0.15em] text-[10px] shadow-md disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* Step 11: Avatar Setup */}
              {setupStep === 11 && (
                <div className="animate-fade-in min-h-[240px] flex flex-col items-center justify-center py-4">
                  <h3 className="text-sm font-black text-gray-900 mb-1">Final Touch: Your Avatar</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-8 text-center">Upload a photo to complete your profile</p>
                  
                  <div className="relative mb-8 group">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative">
                      {tempProfileImageUrl ? (
                        <img src={tempProfileImageUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Add Photo</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    {tempProfileImageUrl && (
                      <button 
                        onClick={() => setTempProfileImageUrl(null)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <button 
                    onClick={handleSaveIdentity}
                    disabled={isSavingIdentity}
                    className="w-full py-4 bg-[#0E7850] text-white rounded-2xl font-black uppercase tracking-[0.15em] text-[11px] shadow-lg shadow-emerald-900/10 active:scale-95 transition-all"
                  >
                    {isSavingIdentity ? 'Saving...' : 'Complete Setup'}
                  </button>
                </div>
              )}

              {/* Navigation Controls for Quiz Steps */}
              {setupStep >= 0 && setupStep < 11 && (
                <div className="mt-4 flex gap-2">
                  {setupStep === 0 ? (
                    <button 
                      onClick={handleStartSetup}
                      className="w-full py-4 bg-[#0E7850] text-white rounded-2xl font-black uppercase tracking-[0.15em] text-[11px] shadow-lg shadow-emerald-900/10 active:scale-95 transition-all"
                    >
                      Let us get to know you better
                    </button>
                  ) : setupStep === 1 ? (
                    <button 
                      onClick={() => setSetupStep(2)}
                      disabled={!tempPersona}
                      className="w-full py-4 bg-[#0E7850] text-white rounded-2xl font-black uppercase tracking-[0.15em] text-[11px] shadow-lg shadow-emerald-900/10 active:scale-95 transition-all disabled:opacity-50"
                    >
                      Continue
                    </button>
                  ) : setupStep === 10 ? (
                    null // Handled inside step 10 UI
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                          setSetupStep(prev => prev - 1);
                          if (setupStep > 5) setCurrentTaskGroupIdx(prev => prev - 1);
                        }}
                        className="flex-1 py-3 bg-gray-50 text-gray-400 rounded-xl font-black uppercase tracking-widest text-[9px] border border-gray-100"
                      >
                        Back
                      </button>
                      <button 
                        onClick={handleSaveIdentity}
                        disabled={isSavingIdentity}
                        className="flex-1 py-3 bg-white text-[#0E7850] border border-[#0E7850]/20 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-sm active:scale-95 transition-all"
                      >
                        {isSavingIdentity ? 'Saving...' : 'Save Progress'}
                      </button>
                    </>
                  )}
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
              <Link 
                key={m.id} 
                to={m.category === 'influence' ? "/impact" : "/profile/hall-of-rise"}
                className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-all block"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                  {m.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[9px] font-black text-gray-900 truncate uppercase tracking-tight">{m.title}</h4>
                  <div className="mt-1.5 h-1 bg-gray-50 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${m.progress}%` }} />
                  </div>
                </div>
                <div className="text-[7px] font-black text-gray-400 uppercase tracking-widest">
                  {m.progress === 100 && m.isClaimed ? 'Awarded' : (m.progress === 100 ? 'Unlocked' : m.displayValue)}
                </div>
              </Link>
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
          </>
        )}
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
