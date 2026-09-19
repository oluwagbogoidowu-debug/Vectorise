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
  Sparkles, 
  Plus, 
  ArrowRight,
  Repeat,
  ListOrdered,
  X
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Helper to recursively extract a clean array of strings from any raw answer
 * (handling JSON strings like '["A","B"]', nested arrays, objects, etc.)
 */
const extractResponsesArray = (raw: any): string[] => {
  if (raw === undefined || raw === null) return [];

  if (Array.isArray(raw)) {
    return raw.flatMap(item => extractResponsesArray(item));
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    // Check if it's a JSON array or JSON object string
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed);
        const extracted = extractResponsesArray(parsed);
        if (extracted.length > 0) return extracted;
      } catch {
        // Not valid JSON, fallback to cleaned string
      }
    }

    // Clean any leading/trailing quotes if it was serialized with quotes
    const cleaned = trimmed.replace(/^["'`]+|["'`]+$/g, '').trim();
    return cleaned ? [cleaned] : [];
  }

  if (typeof raw === 'object') {
    const list: string[] = [];
    if (raw.choices) list.push(...extractResponsesArray(raw.choices));
    if (raw.answers) list.push(...extractResponsesArray(raw.answers));
    if (raw.options) list.push(...extractResponsesArray(raw.options));
    if (raw.text) list.push(...extractResponsesArray(raw.text));
    if (raw.choice) list.push(...extractResponsesArray(raw.choice));
    if (raw.value) list.push(...extractResponsesArray(raw.value));
    if (list.length > 0) return list;

    // If generic object without known keys
    const vals = Object.values(raw).filter(v => typeof v === 'string' || Array.isArray(v));
    if (vals.length > 0) return extractResponsesArray(vals);
    return [String(raw)];
  }

  return [String(raw)];
};

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
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [customGoalInput, setCustomGoalInput] = useState<string>('');
  const [isSetting, setIsSetting] = useState(false);
  const [isLoading, setIsLoading] = useState(!challenge);

  // Workflow view mode: 'setup' -> 'preview' -> 'active'
  const [viewMode, setViewMode] = useState<'setup' | 'preview' | 'active'>('setup');
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);

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
  const challengeTitle = challenge?.challengeData?.name || challenge?.title || 'Test Your Direction';
  const rawCategory = (challenge?.challengeCategory || challenge?.challengeData?.category || challenge?.category || 'Exploration') as ChallengeCategory;
  const category = rawCategory in CHALLENGE_CATEGORY_DESCRIPTIONS ? rawCategory : 'Exploration';
  const type = (challenge?.challengeType || challenge?.challengeData?.type || 'Sequential') as ChallengeType;
  const isRepetition = type === 'Repetition';

  // Coach recommendations tags
  const coachRecommendations = useMemo(() => {
    const fromChallenge = challenge?.actionRecommendations || challenge?.challengeData?.actionRecommendations;
    if (Array.isArray(fromChallenge) && fromChallenge.length > 0) {
      return fromChallenge;
    }
    return [
      `Research the path you're considering`,
      `Talk to someone in the field`,
      `Try a small activity`,
      `Research real opportunities`,
      `Write down what you discovered`,
    ];
  }, [challenge]);

  // Logic to parse m2 step 2 (or configured placeholder) from the connected sprint response without manufactured fallbacks
  const sprintActionResponses = useMemo(() => {
    const placeholder = challenge?.actionFromSprintPlaceholder || 
      challenge?.challengeData?.actionFromSprintPlaceholder || 
      '{m2 step 2}';

    const match = /(?:[dDmM](?:ay|ove)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)/i.exec(placeholder);
    const targetDay = match && match[1] ? parseInt(match[1], 10) : 2;
    const targetStep = match && match[2] ? parseInt(match[2], 10) : 2;
    const targetStepIdx = targetStep - 1;

    const connectedEnrollment = userEnrollments.find(e => 
      e.sprint_id === connectedSprintId || 
      ((e as any).sprintTitle && connectedSprintTitle && (e as any).sprintTitle.toLowerCase() === connectedSprintTitle.toLowerCase())
    );

    let extracted: string[] = [];

    if (connectedEnrollment && Array.isArray(connectedEnrollment.progress)) {
      const dayProgress = connectedEnrollment.progress.find(p => Number(p.day) === targetDay);
      if (dayProgress && dayProgress.answers && dayProgress.answers[targetStepIdx] !== undefined) {
        const rawAns: any = dayProgress.answers[targetStepIdx];
        extracted = extractResponsesArray(rawAns);
      }
    }

    if (extracted.length > 0) {
      return Array.from(new Set(extracted.filter(s => s.trim().length > 0)));
    }

    return [];
  }, [challenge, connectedSprintId, connectedSprintTitle, userEnrollments]);

  const toggleAction = (actionText: string) => {
    const trimmed = actionText.trim();
    if (!trimmed) return;

    if (isRepetition) {
      setSelectedActions([trimmed]);
    } else {
      setSelectedActions(prev => {
        if (prev.includes(trimmed)) {
          return prev.filter(a => a !== trimmed);
        } else {
          return [...prev, trimmed];
        }
      });
    }
  };

  const handleAddCustomGoal = () => {
    const trimmed = customGoalInput.trim();
    if (!trimmed) return;

    if (isRepetition) {
      setSelectedActions([trimmed]);
    } else {
      if (!selectedActions.includes(trimmed)) {
        setSelectedActions(prev => [...prev, trimmed]);
      }
    }
    setCustomGoalInput('');
  };

  const handleRemoveAction = (actionText: string) => {
    setSelectedActions(prev => prev.filter(a => a !== actionText));
  };

  const handleSetAction = async () => {
    if (selectedActions.length === 0) {
      toast.error('Please select at least one action.');
      return;
    }

    setIsSetting(true);
    const challengeId = challenge?.id || id || `challenge_${Date.now()}`;

    try {
      if (user?.id) {
        await sprintService.enrollUser(user.id, challengeId, 7, {
          firstActionInput: selectedActions[0],
          taskInputs: selectedActions
        }).catch(err => {
          console.warn("Could not enroll directly, saving local challenge state:", err);
        });
      }

      localStorage.setItem(`vectorise_challenge_action_${challengeId}`, JSON.stringify(selectedActions));
      localStorage.setItem(`vectorise_challenge_single_action_${challengeId}`, selectedActions[0]);
      
      toast.success(isRepetition ? `Action set: "${selectedActions[0]}"` : `${selectedActions.length} action(s) set in sequence`);

      // Transition to Challenge Preview view
      setViewMode('preview');
    } catch (e) {
      console.error("Error setting challenge action:", e);
      toast.error('Could not set action. Please try again.');
    } finally {
      setIsSetting(false);
    }
  };

  const currentActionText = selectedActions[currentDay - 1] || selectedActions[0] || 'Research the path you\'re considering.';
  const totalDays = selectedActions.length || 5;

  return (
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="w-full max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (viewMode === 'preview') setViewMode('setup');
            else if (viewMode === 'active') setViewMode('preview');
            else navigate('/explore');
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-900 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold">
            {isRepetition ? <Repeat className="w-3.5 h-3.5" /> : <ListOrdered className="w-3.5 h-3.5" />}
            {category} · {type} Challenge
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 pb-12 pt-1 flex flex-col justify-center animate-fade-in">
        {viewMode === 'setup' && (
          <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-lg shadow-purple-950/5">
            {/* Challenge Badge & Title */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 text-[11px] font-black uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Challenge Setup</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950 dark:text-white">
                What are you working with?
              </h1>

              {/* Instruction Banner based on Challenge Type */}
              <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-300 text-[11px] font-semibold">
                {isRepetition ? (
                  <>
                    <Repeat className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span><strong>Repetition Challenge:</strong> Pick 1 action to practice and repeat daily.</span>
                  </>
                ) : (
                  <>
                    <ListOrdered className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span><strong>Sequential Challenge:</strong> Pick multiple actions to execute in sequence.</span>
                  </>
                )}
              </div>
            </div>

            {/* Selected Actions Display */}
            <div className="mb-4">
              <label className="block text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-1.5">
                {isRepetition ? 'Selected Action' : `Selected Actions (${selectedActions.length})`}
              </label>
              
              {selectedActions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {selectedActions.map((action, i) => (
                    <span 
                      key={i} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100/80 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700 text-purple-950 dark:text-purple-100 rounded-lg text-xs font-bold shadow-xs animate-fade-in"
                    >
                      {!isRepetition && (
                        <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[9px] font-black inline-flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                      )}
                      <span className="line-clamp-1">{action}</span>
                      <button 
                        type="button"
                        onClick={() => handleRemoveAction(action)} 
                        className="w-3.5 h-3.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 inline-flex items-center justify-center transition-colors cursor-pointer ml-0.5"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-dashed border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 text-xs font-medium">
                  No action selected yet. Pick an option below or type your own.
                </div>
              )}
            </div>

            {/* Poll Options Section Header */}
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-500 mb-2">
              Recommendations to pick from
            </div>

            {/* Scrollable Compact Poll Container */}
            <div className="max-h-60 sm:max-h-72 overflow-y-auto pr-1.5 space-y-2 rounded-2xl border border-gray-100 dark:border-zinc-800/80 p-2 bg-gray-50/50 dark:bg-zinc-950/30">
              {/* 1. Sprint Options */}
              {sprintActionResponses.map((sprintAction, idx) => {
                const isSelected = selectedActions.includes(sprintAction);
                const seqIndex = selectedActions.indexOf(sprintAction);

                return (
                  <button
                    key={`sprint-act-${idx}`}
                    type="button"
                    onClick={() => toggleAction(sprintAction)}
                    className={`w-full p-2.5 sm:py-2.5 sm:px-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 group ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 ring-1 ring-purple-600/30'
                        : 'border-gray-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/70 text-gray-800 dark:text-zinc-200'
                    }`}
                  >
                    <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-snug">
                      "{sprintAction}"
                    </p>

                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white'
                        : 'border border-gray-300 dark:border-zinc-600 group-hover:border-purple-400'
                    }`}>
                      {isSelected ? (
                        isRepetition ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <span className="text-[10px] font-black">{seqIndex + 1}</span>
                        )
                      ) : null}
                    </div>
                  </button>
                );
              })}

              {/* 2. Coach Recommendations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {coachRecommendations.map((tag, idx) => {
                  const isSelected = selectedActions.includes(tag);
                  const seqIndex = selectedActions.indexOf(tag);

                  return (
                    <button
                      key={`coach-tag-${idx}`}
                      type="button"
                      onClick={() => toggleAction(tag)}
                      className={`p-2.5 sm:py-2.5 sm:px-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 group ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 ring-1 ring-purple-600/30'
                          : 'border-gray-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/70 text-gray-800 dark:text-zinc-200'
                      }`}
                    >
                      <span className="text-xs font-bold text-gray-900 dark:text-white leading-snug">
                        {tag}
                      </span>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white'
                          : 'border border-gray-300 dark:border-zinc-600 group-hover:border-purple-400'
                      }`}>
                        {isSelected ? (
                          isRepetition ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <span className="text-[9px] font-black">{seqIndex + 1}</span>
                          )
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Add custom action option */}
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 dark:text-zinc-300">
                <Plus className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <span>Add custom action</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customGoalInput}
                  onChange={(e) => setCustomGoalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomGoal();
                    }
                  }}
                  placeholder="Type a custom action..."
                  className="flex-1 px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl outline-none text-xs font-bold text-gray-900 dark:text-white focus:border-purple-600"
                />
                <button
                  type="button"
                  onClick={handleAddCustomGoal}
                  className="px-4 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-200 font-bold text-xs rounded-xl shrink-0 transition-all cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* 4. Set Action Button */}
            <div className="mt-5 pt-3.5 border-t border-gray-150 dark:border-zinc-800 flex items-center justify-end">
              <button
                type="button"
                disabled={isSetting || selectedActions.length === 0}
                onClick={handleSetAction}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <span>{isSetting ? 'Setting Action...' : isRepetition ? 'Set Action' : `Set ${selectedActions.length} Action${selectedActions.length > 1 ? 's' : ''}`}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {viewMode === 'preview' && (
          <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-lg shadow-purple-950/5 animate-fade-in">
            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-black uppercase tracking-wider mb-2">
                Challenge Preview
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950 dark:text-white">
                {challengeTitle}
              </h1>
              <p className="text-xs sm:text-sm font-bold text-gray-500 dark:text-zinc-400 mt-1">
                {category} · {type}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">
                Your actions
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedActions.map((action, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/80 text-xs sm:text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-zinc-400 py-3 border-t border-b border-gray-100 dark:border-zinc-800 mb-6">
              <span>You'll do one action each day.</span>
              <span className="text-purple-600 dark:text-purple-400 font-black">Starts: Today</span>
            </div>

            <button
              type="button"
              onClick={() => setViewMode('active')}
              className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Start Challenge</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {viewMode === 'active' && (
          <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-lg shadow-purple-950/5 text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider mb-4">
              Today
            </div>

            <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-2">
              Day {currentDay} of {totalDays}
            </p>

            <h2 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white leading-snug mb-8">
              "{currentActionText}"
            </h2>

            <button
              type="button"
              onClick={() => setShowCompleteModal(true)}
              className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-purple-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Complete</span>
            </button>
          </div>
        )}
      </main>

      {/* Mark Complete Popup Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl p-8 sm:p-10 max-w-sm w-full text-center relative border border-gray-100 dark:border-zinc-800 animate-slide-up">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-600 dark:text-emerald-400 relative">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-gray-950 dark:text-white tracking-tight mb-2">
              Day {currentDay} Complete!
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 font-medium mb-6 leading-relaxed">
              Great job executing today's action. Keep up the momentum!
            </p>
            <button
              type="button"
              onClick={() => {
                setShowCompleteModal(false);
                if (currentDay < totalDays) {
                  setCurrentDay(prev => prev + 1);
                } else {
                  toast.success("Challenge completed successfully!");
                  navigate(`/sprint/${challenge?.id || id}`, { 
                    state: { 
                      sprint: challenge,
                      selectedActions: selectedActions,
                      selectedAction: selectedActions[0],
                      isChallenge: true,
                    } 
                  });
                }
              }}
              className="w-full py-3.5 bg-gray-950 dark:bg-zinc-800 text-white dark:text-zinc-100 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-colors shadow-lg active:scale-95 cursor-pointer"
            >
              {currentDay < totalDays ? `Continue to Day ${currentDay + 1}` : 'Complete Challenge'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallengeActionSetup;
