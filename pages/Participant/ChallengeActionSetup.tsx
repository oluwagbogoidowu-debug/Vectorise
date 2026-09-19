import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sprint, ChallengeCategory, ChallengeType, ParticipantSprint } from '../../types';
import { sprintService } from '../../services/sprintService';
import { CHALLENGE_CATEGORY_DESCRIPTIONS } from '../../constants/sprintConstants';
import { 
  Trophy, 
  ArrowLeft, 
  CheckCircle2, 
  Link2, 
  Sparkles, 
  PlusCircle, 
  UserCheck, 
  Target,
  ArrowRight,
  Flame,
  HelpCircle,
  Repeat,
  ListOrdered
} from 'lucide-react';
import { toast } from 'sonner';

const ChallengeActionSetup: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [challenge, setChallenge] = useState<Sprint | null>(() => {
    if (location.state?.sprint && (location.state.sprint.id === id || !id)) {
      return location.state.sprint;
    }
    return null;
  });

  const [connectedSprint, setConnectedSprint] = useState<Sprint | null>(null);
  const [userEnrollments, setUserEnrollments] = useState<ParticipantSprint[]>([]);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [activeSelectionType, setActiveSelectionType] = useState<'sprint' | 'coach' | 'custom'>('sprint');
  const [selectedCoachTag, setSelectedCoachTag] = useState<string | null>(null);
  const [customGoalInput, setCustomGoalInput] = useState<string>('');
  const [isSetting, setIsSetting] = useState(false);
  const [isLoading, setIsLoading] = useState(!challenge);

  // Load Challenge if not already passed in state
  useEffect(() => {
    let isMounted = true;
    const loadChallenge = async () => {
      if (!id) return;
      if (!challenge) {
        setIsLoading(true);
        try {
          let data = await sprintService.getSprintById(id);
          if (!data) {
            const allPublished = await sprintService.getPublishedSprints().catch(() => []);
            data = allPublished.find(s => s.id === id) || null;
          }
          if (isMounted && data) {
            setChallenge(data);
          }
        } catch (e) {
          console.error("Error loading challenge:", e);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      }
    };
    loadChallenge();
    return () => { isMounted = false; };
  }, [id, challenge]);

  // Load User Enrollments to pull connected sprint responses
  useEffect(() => {
    if (!user?.id) return;
    const unsub = sprintService.subscribeToUserEnrollments(user.id, (enrollments) => {
      setUserEnrollments(enrollments || []);
    });
    return () => unsub();
  }, [user]);

  // Load Connected Sprint if recommendedAfterSprintId is defined
  const connectedSprintId = challenge?.recommendedAfterSprintId || challenge?.challengeData?.recommendedAfterSprintId;
  const connectedSprintTitle = challenge?.recommendedAfterSprintTitle || 
    challenge?.challengeData?.recommendedAfterSprintTitle || 
    'Gain Clarity First';

  useEffect(() => {
    let isMounted = true;
    if (connectedSprintId) {
      sprintService.getSprintById(connectedSprintId).then(sprintData => {
        if (isMounted && sprintData) {
          setConnectedSprint(sprintData);
        }
      }).catch(err => console.error("Error fetching connected sprint:", err));
    }
    return () => { isMounted = false; };
  }, [connectedSprintId]);

  // Extract challenge parameters
  const challengeTitle = challenge?.challengeData?.name || challenge?.title || 'Get Clear on What You Want';
  const rawCategory = (challenge?.challengeCategory || challenge?.challengeData?.category || challenge?.category || 'Mastery') as ChallengeCategory;
  const category = rawCategory in CHALLENGE_CATEGORY_DESCRIPTIONS ? rawCategory : 'Mastery';
  const type = (challenge?.challengeType || challenge?.challengeData?.type || 'Sequential') as ChallengeType;
  const categoryDescription = CHALLENGE_CATEGORY_DESCRIPTIONS[category] || 'Take a series of focused actions to strengthen your capabilities.';

  // Coach recommendations tags
  const coachRecommendations = useMemo(() => {
    const fromChallenge = challenge?.actionRecommendations || challenge?.challengeData?.actionRecommendations;
    if (Array.isArray(fromChallenge) && fromChallenge.length > 0) {
      return fromChallenge;
    }
    // Contextual fallback tags if coach didn't configure custom ones
    return [
      `Practice 1 high-impact ${category} action daily`,
      `Document key insights and breakthroughs`,
      `Execute 15 minutes of deliberate practice`,
    ];
  }, [challenge, category]);

  // Logic to parse m2 step 2 (or configured placeholder) from the connected sprint response
  const sprintActionResponse = useMemo(() => {
    const placeholder = challenge?.actionFromSprintPlaceholder || 
      challenge?.challengeData?.actionFromSprintPlaceholder || 
      '{m2 step 2}';

    // Parse milestone and step from placeholder e.g. "{m2 step 2}", "m2 step 2", "step 2", etc.
    const match = /(?:[dDmM](?:ay|ove)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)/i.exec(placeholder);
    const targetDay = match && match[1] ? parseInt(match[1], 10) : 2; // default Day 2
    const targetStep = match && match[2] ? parseInt(match[2], 10) : 2; // default Step 2
    const targetStepIdx = targetStep - 1; // 0-indexed

    // Check user's enrollment in the connected sprint
    let userResponse: string | null = null;
    const connectedEnrollment = userEnrollments.find(e => 
      e.sprint_id === connectedSprintId || 
      ((e as any).sprintTitle && connectedSprintTitle && (e as any).sprintTitle.toLowerCase() === connectedSprintTitle.toLowerCase())
    );

    if (connectedEnrollment && Array.isArray(connectedEnrollment.progress)) {
      const dayProgress = connectedEnrollment.progress.find(p => Number(p.day) === targetDay);
      if (dayProgress && dayProgress.answers && dayProgress.answers[targetStepIdx] !== undefined) {
        const rawAns: any = dayProgress.answers[targetStepIdx];
        if (typeof rawAns === 'string' && rawAns.trim().length > 0) {
          // If JSON string for dual input
          try {
            const parsed = JSON.parse(rawAns);
            if (parsed.text) userResponse = parsed.text;
            else if (parsed.choice) userResponse = parsed.choice;
            else userResponse = rawAns;
          } catch {
            userResponse = rawAns;
          }
        } else if (rawAns && typeof rawAns === 'object') {
          userResponse = rawAns.text || rawAns.choice || String(rawAns);
        }
      }
    }

    if (userResponse && userResponse.trim().length > 0) {
      return {
        text: userResponse.trim(),
        hasRealResponse: true,
        sourceLabel: `Your response from Milestone ${targetDay}, Step ${targetStep}`,
      };
    }

    // Fallback if user has not completed that step yet
    let fallbackText = "Define your primary breakthrough focus for the week";
    if (connectedSprint && Array.isArray(connectedSprint.dailyContent)) {
      const dayContent = connectedSprint.dailyContent.find(d => Number(d.day) === targetDay);
      if (dayContent) {
        if (dayContent.taskPrompts && dayContent.taskPrompts[targetStepIdx]) {
          fallbackText = dayContent.taskPrompts[targetStepIdx];
        } else if (dayContent.taskPrompt) {
          fallbackText = dayContent.taskPrompt;
        }
      }
    }

    return {
      text: fallbackText,
      hasRealResponse: false,
      sourceLabel: `Suggested from Milestone ${targetDay}, Step ${targetStep}`,
    };
  }, [challenge, connectedSprintId, connectedSprintTitle, connectedSprint, userEnrollments]);

  // Set default selection on initial render
  useEffect(() => {
    if (!selectedAction && sprintActionResponse.text) {
      setSelectedAction(sprintActionResponse.text);
      setActiveSelectionType('sprint');
    }
  }, [sprintActionResponse.text]);

  const handleSelectSprintAction = () => {
    setSelectedAction(sprintActionResponse.text);
    setActiveSelectionType('sprint');
    setSelectedCoachTag(null);
  };

  const handleSelectCoachTag = (tag: string) => {
    setSelectedAction(tag);
    setActiveSelectionType('coach');
    setSelectedCoachTag(tag);
  };

  const handleCustomActionChange = (val: string) => {
    setCustomGoalInput(val);
    setSelectedAction(val);
    setActiveSelectionType('custom');
    setSelectedCoachTag(null);
  };

  const handleSetAction = async () => {
    if (!selectedAction.trim()) {
      toast.error('Please select or enter what you are working with.');
      return;
    }

    setIsSetting(true);
    const challengeId = challenge?.id || id || `challenge_${Date.now()}`;

    try {
      if (user?.id) {
        // Enroll participant or save challenge action configuration
        await sprintService.enrollUser(user.id, challengeId, 7, {
          firstActionInput: selectedAction.trim(),
          taskInputs: [selectedAction.trim()]
        }).catch(err => {
          console.warn("Could not enroll directly, saving local challenge state:", err);
        });
      }

      // Also cache locally for instant retrieval
      localStorage.setItem(`vectorise_challenge_action_${challengeId}`, selectedAction.trim());
      
      toast.success(`Action set: "${selectedAction.trim()}"`);

      // Navigate to challenge workspace / sprint view
      navigate(`/sprint/${challengeId}`, { 
        state: { 
          sprint: challenge,
          selectedAction: selectedAction.trim(),
          isChallenge: true,
        } 
      });
    } catch (e) {
      console.error("Error setting challenge action:", e);
      toast.error('Could not set action. Please try again.');
    } finally {
      setIsSetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="w-full max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/explore')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-900 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-[0.2em]">
            <Trophy className="w-3 h-3" />
            {category} • {type} Challenge
          </span>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 pb-20 pt-4 flex flex-col justify-center animate-fade-in">
        <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-[2.5rem] p-7 md:p-10 shadow-xl shadow-purple-950/5">
          {/* Challenge Badge & Title */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Challenge Setup</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-950 dark:text-white">
              What are you working with?
            </h1>
            <p className="text-sm md:text-[15px] text-gray-500 dark:text-zinc-400 mt-2 font-medium leading-relaxed">
              {challengeTitle} • {categoryDescription}
            </p>
          </div>

          {/* Current Active Action Input Box */}
          <div className="mb-8">
            <label className="block text-[11px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-2">
              Selected Action
            </label>
            <div className="relative">
              <input
                type="text"
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                placeholder="e.g. Publish one focused insight daily on LinkedIn"
                className="w-full px-5 py-4 bg-gray-50 dark:bg-zinc-800/80 border-2 border-purple-500/30 focus:border-purple-600 dark:focus:border-purple-400 focus:bg-white dark:focus:bg-zinc-800 rounded-2xl outline-none text-base md:text-lg font-bold text-gray-900 dark:text-white shadow-inner transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Target className="w-5 h-5 text-purple-500/60" />
              </div>
            </div>
          </div>

          {/* Recommendations to pick from */}
          <div className="space-y-6">
            <div className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 dark:text-zinc-500">
              Recommendations to pick from
            </div>

            {/* 1. Recommended action from sprint title */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-gray-700 dark:text-zinc-300">
                <Link2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Recommended action from {connectedSprintTitle}</span>
              </div>

              <button
                type="button"
                onClick={handleSelectSprintAction}
                className={`w-full p-4 md:p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 group ${
                  activeSelectionType === 'sprint' && selectedAction === sprintActionResponse.text
                    ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200 ring-2 ring-purple-600/20'
                    : 'border-gray-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/50 text-gray-800 dark:text-zinc-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                      {sprintActionResponse.hasRealResponse ? 'Connected Sprint Check-In' : 'Sprint Milestone Default'}
                    </span>
                  </div>
                  <p className="text-sm md:text-[15px] font-bold mt-1 text-gray-900 dark:text-white">
                    "{sprintActionResponse.text}"
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                    {sprintActionResponse.sourceLabel}
                  </p>
                </div>

                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 transition-all ${
                  activeSelectionType === 'sprint' && selectedAction === sprintActionResponse.text
                    ? 'bg-purple-600 text-white'
                    : 'border border-gray-300 dark:border-zinc-600 group-hover:border-purple-400'
                }`}>
                  {activeSelectionType === 'sprint' && selectedAction === sprintActionResponse.text && (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </div>
              </button>
            </div>

            {/* 2. Recommendations from coach */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-gray-700 dark:text-zinc-300">
                <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Recommendations from coach</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {coachRecommendations.map((tag, idx) => {
                  const isSelected = activeSelectionType === 'coach' && selectedAction === tag;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectCoachTag(tag)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 group ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200 ring-2 ring-purple-600/20'
                          : 'border-gray-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/50 text-gray-800 dark:text-zinc-200'
                      }`}
                    >
                      <span className="text-xs md:text-sm font-bold text-gray-900 dark:text-white leading-snug">
                        {tag}
                      </span>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white'
                          : 'border border-gray-300 dark:border-zinc-600 group-hover:border-purple-400'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Add new action based on your goal */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2 text-xs font-black text-gray-700 dark:text-zinc-300">
                <PlusCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Add new action based on your goal</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customGoalInput}
                  onChange={(e) => handleCustomActionChange(e.target.value)}
                  placeholder="Type your own custom action..."
                  className="flex-1 px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl outline-none text-xs md:text-sm font-bold text-gray-900 dark:text-white focus:border-purple-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customGoalInput.trim()) {
                      setSelectedAction(customGoalInput.trim());
                      setActiveSelectionType('custom');
                    }
                  }}
                  className="px-5 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 font-black text-xs uppercase tracking-wider rounded-2xl shrink-0 transition-all cursor-pointer"
                >
                  Use Custom
                </button>
              </div>
            </div>
          </div>

          {/* 4. Set Button */}
          <div className="mt-10 pt-6 border-t border-gray-150 dark:border-zinc-800 flex items-center justify-end">
            <button
              type="button"
              disabled={isSetting || !selectedAction.trim()}
              onClick={handleSetAction}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs md:text-sm font-black uppercase tracking-widest shadow-xl shadow-purple-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              <span>{isSetting ? 'Setting Action...' : 'Set Action'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChallengeActionSetup;
