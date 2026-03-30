
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import { FOCUS_OPTIONS, PERSONA_HIERARCHY, PERSONAS } from '../../services/mockData';
import { sprintService } from '../../services/sprintService';
import { useAuth } from '../../contexts/AuthContext';
import { Participant, LifecycleSlotAssignment, OrchestrationTrigger } from '../../types';
import { sanitizeData } from '../../services/userService';

const FocusSelector: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateProfile } = useAuth();
  
  const activeTrigger = (location.state?.trigger || 'after_homepage') as OrchestrationTrigger;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);
  const [pollQuestion, setPollQuestion] = useState<string>("What’s your biggest focus right now?");
  const [activeAssignment, setActiveAssignment] = useState<LifecycleSlotAssignment | null>(null);
  const [activeSlotName, setActiveSlotName] = useState<string>("Growth Catalyst Mapping");
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Hierarchical State
  const [currentLevel, setCurrentLevel] = useState(0);
  const [selections, setSelections] = useState<string[]>([]);
  const [activeOption, setActiveOption] = useState<string | null>(null);

  const currentOptions = useMemo(() => {
    if (currentLevel === 0) return PERSONAS;
    const persona = selections[0];
    const levels = PERSONA_HIERARCHY[persona];
    if (levels && levels[currentLevel - 1]) {
      return levels[currentLevel - 1];
    }
    return [];
  }, [currentLevel, selections]);

  useEffect(() => {
    const loadDynamicOrchestration = async () => {
      try {
        const orchestration = await sprintService.getOrchestration();

        const assignmentEntry = Object.entries(orchestration).find(
          ([_, a]: any) => a.stateTrigger === activeTrigger
        );
        
        let [slotId, assignment] = assignmentEntry || [null, null];

        // Default to Foundation Clarity if no explicit trigger mapping exists for after_homepage
        if (!assignment && activeTrigger === 'after_homepage') {
          slotId = 'slot_found_clarity';
          assignment = orchestration['slot_found_clarity'];
        }

        if (assignment) {
          setActiveAssignment(assignment as LifecycleSlotAssignment);
          if (slotId === 'slot_found_clarity') {
            setActiveSlotName("Foundation: Clarity");
          } else if (slotId?.includes('found')) {
            setActiveSlotName("Foundation Path");
          } else {
            setActiveSlotName("Growth Catalyst Mapping");
          }
        }

        if (activeTrigger === 'skip_clarity') {
          setPollQuestion("What specific execution goal is your priority?");
        }
      } catch (err) {
        console.warn("Registry sync failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadDynamicOrchestration();
  }, [activeTrigger]);

  const handleSelect = async (option: string, path: string[]) => {
    setIsProcessingSelection(true);
    setLookupError(null);
    
    const userId = user?.id || 'guest_' + Math.random().toString(36).substr(2, 9);

    if (user) {
      try {
        await updateProfile(sanitizeData({
          onboardingAnswers: {
            ...(user as Participant).onboardingAnswers || {},
            selected_focus: option,
            focus_path: path
          }
        }));
      } catch (err) {
        console.error("Profile sync failed:", err);
      }
    }

    try {
      const orchestration = await sprintService.getOrchestration();
      const slots = Object.entries(orchestration);
      
      let resolvedSprintId: string | null = null;
      let resolvedSlotId: string = 'unknown';
      let finalUsedOption: string = option;

      // Prioritized lookup: Check path in reverse order (most specific first)
      for (let i = path.length - 1; i >= 0; i--) {
        const currentOption = path[i];
        
        // 1. Priority check within the triggering slot
        if (activeAssignment?.sprintFocusMap) {
            resolvedSprintId = Object.keys(activeAssignment.sprintFocusMap).find(
                sId => activeAssignment.sprintFocusMap?.[sId]?.includes(currentOption)
            ) || null;
            
            if (resolvedSprintId) {
              const slotEntry = slots.find(([_, val]) => val.stateTrigger === activeTrigger);
              resolvedSlotId = slotEntry ? slotEntry[0] : 'trigger_match';
              finalUsedOption = currentOption;
              break;
            }
        }

        // 2. Global registry check
        if (!resolvedSprintId) {
            for (const [slotId, mapping] of slots) {
                if (mapping.sprintFocusMap) {
                    const match = Object.keys(mapping.sprintFocusMap).find(
                        sId => mapping.sprintFocusMap?.[sId]?.includes(currentOption)
                    );
                    if (match) {
                        resolvedSprintId = match;
                        resolvedSlotId = slotId;
                        finalUsedOption = currentOption;
                        break;
                    }
                }
            }
        }
        if (resolvedSprintId) break;
      }

      if (resolvedSprintId) {
          // TELEMETRY: Log what the orchestrator picked
          await sprintService.logOrchestratorResolution({
              user_id: userId,
              trigger: activeTrigger,
              input_focus: finalUsedOption,
              resolved_sprint_id: resolvedSprintId,
              slot_id: resolvedSlotId
          });

          if (resolvedSprintId === 'system_map') {
            navigate('/onboarding/map', { 
              state: { selectedFocus: finalUsedOption, trigger: activeTrigger } 
            });
          } else {
            navigate(`/onboarding/description/${resolvedSprintId}`, { 
              state: { selectedFocus: finalUsedOption, sprintId: resolvedSprintId, trigger: activeTrigger } 
            });
          }
      } else {
          setLookupError(`No matching path found in the Orchestrator for: "${option}"`);
          setIsProcessingSelection(false);
      }

    } catch (error) {
      setLookupError("The Registry is currently unreachable. Please try again.");
      setIsProcessingSelection(false);
    }
  };

  const handleSpecify = () => {
    if (activeOption && currentLevel < 3) {
      setSelections([...selections, activeOption]);
      setCurrentLevel(currentLevel + 1);
      setActiveOption(null);
    }
  };

  const handlePrevious = () => {
    if (currentLevel > 0) {
      const newSelections = [...selections];
      newSelections.pop();
      setSelections(newSelections);
      setCurrentLevel(currentLevel - 1);
      setActiveOption(null);
    }
  };

  const handleFinalContinue = () => {
    if (activeOption) {
      const fullPath = [...selections, activeOption];
      handleSelect(activeOption, fullPath);
    }
  };

  const handleReset = () => {
    setLookupError(null);
    setIsProcessingSelection(false);
    setCurrentLevel(0);
    setSelections([]);
    setActiveOption(null);
  };

  return (
    <div className="flex flex-col min-h-screen w-full items-center justify-center p-6 bg-primary text-white relative overflow-hidden selection:bg-white/10">
      <div className="w-full max-w-[320px] z-10">
        {isLoading || isProcessingSelection ? (
          <div className="flex flex-col items-center justify-center space-y-8 animate-fade-in py-20">
            <div className="relative">
                <div className="w-16 h-16 border-2 border-white/10 rounded-full"></div>
                <div className="absolute inset-0 w-16 h-16 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">
                  {isProcessingSelection ? "Resolving Path..." : "Synchronizing..."}
                </p>
                <p className="text-[8px] font-bold text-white/30 mt-2 italic uppercase">Registry Sync 4.6</p>
            </div>
          </div>
        ) : lookupError ? (
          <div className="w-full text-center animate-fade-in space-y-8">
            <div className="w-20 h-20 bg-white/10 rounded-[2.5rem] flex items-center justify-center mx-auto text-3xl shadow-inner">⚠️</div>
            <div>
                <h1 className="text-xl font-black tracking-tight mb-2 italic">Registry Mapping Missing</h1>
                <p className="text-xs text-white/60 font-medium leading-relaxed italic px-4">"{lookupError}"</p>
            </div>
            <div className="space-y-3 pt-4">
                <button onClick={handleReset} className="w-full py-4 bg-white text-primary font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl active:scale-95 transition-all">Try Another Focus</button>
                <button onClick={() => navigate('/discover')} className="w-full py-4 bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl border border-white/10 active:scale-95 transition-all">Browse Full Registry</button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <header className="mb-12 text-center">
               <LocalLogo type="white" className="h-5 w-auto mx-auto mb-8 opacity-40" />
               <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight italic">{pollQuestion}</h1>
               <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mt-4">
                 {selections.length > 0 ? selections.join(' > ') : (activeTrigger === 'skip_clarity' ? 'Execution Registry' : activeSlotName)}
               </p>
            </header>
            
            <div className="w-full space-y-3 animate-slide-up">
              {currentOptions.map((option: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveOption(option)}
                  className={`w-full group relative overflow-hidden py-5 px-6 rounded-2xl transition-all duration-500 border flex items-center justify-center ${
                    activeOption === option 
                      ? 'bg-white border-white scale-[1.02] shadow-xl' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="relative z-10">
                    <span className={`text-[9px] font-black uppercase tracking-[0.15em] transition-colors leading-relaxed block ${
                      activeOption === option ? 'text-primary' : 'text-white'
                    }`}>
                      {option}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-10 space-y-4 animate-fade-in">
              {activeOption && (
                <div className="space-y-3">
                  <button 
                    onClick={handleFinalContinue}
                    className="w-full py-4 bg-white text-primary font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl active:scale-95 transition-all"
                  >
                    Continue with {activeOption}
                  </button>
                  
                  {currentLevel < 3 && (
                    <button 
                      onClick={handleSpecify}
                      className="w-full py-3 text-[9px] font-black text-white uppercase tracking-[0.2em] hover:text-white/80 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="opacity-40">──</span> Specify Further <span className="opacity-40">──</span>
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-6 pt-4">
                {currentLevel > 0 && (
                  <button 
                    onClick={handlePrevious}
                    className="text-[9px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Previous
                  </button>
                )}
                
                {activeTrigger !== 'after_homepage' && (
                    <button 
                      onClick={() => navigate('/')} 
                      className="text-[9px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                )}
              </div>
            </div>
          </div>
        )}
        <footer className="mt-12 opacity-20 text-center">
            <p className="text-[7px] font-black uppercase tracking-[0.5em]">Vectorise • System 4.6</p>
        </footer>
      </div>
      <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.99); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default FocusSelector;
