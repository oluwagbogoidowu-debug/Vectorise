
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import { FOCUS_OPTIONS } from '../../services/mockData';
import { sprintService } from '../../services/sprintService';
import { useAuth } from '../../contexts/AuthContext';
import { Participant, LifecycleSlotAssignment, OrchestrationTrigger } from '../../types';

const FocusSelector: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateProfile } = useAuth();
  
  const activeTrigger = (location.state?.trigger || 'after_homepage') as OrchestrationTrigger;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);
  const [pollQuestion, setPollQuestion] = useState<string>("What’s your biggest focus right now?");
  const [focusOptions, setFocusOptions] = useState<string[]>(FOCUS_OPTIONS);
  const [activeAssignment, setActiveAssignment] = useState<LifecycleSlotAssignment | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    const loadDynamicOrchestration = async () => {
      try {
        const [settings, orchestration] = await Promise.all([
          sprintService.getGlobalOrchestrationSettings(),
          sprintService.getOrchestration()
        ]);

        const assignment = Object.values(orchestration).find(
          (a: any) => a.stateTrigger === activeTrigger
        ) as LifecycleSlotAssignment | undefined;

        if (assignment) {
          setActiveAssignment(assignment);
          if (assignment.availableFocusOptions && assignment.availableFocusOptions.length > 0) {
            setFocusOptions(assignment.availableFocusOptions);
          } else if (settings?.focusOptions) {
            setFocusOptions(settings.focusOptions);
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

  const handleSelect = async (option: string) => {
    setIsProcessingSelection(true);
    setLookupError(null);
    
    if (user) {
      try {
        await updateProfile({
          onboardingAnswers: {
            ...(user as Participant).onboardingAnswers || {},
            selected_focus: option
          }
        });
      } catch (err) {
        console.error("Profile sync failed:", err);
      }
    }

    try {
      const orchestration = await sprintService.getOrchestration();
      const slots = Object.entries(orchestration);
      
      let resolvedSprintId: string | null = null;
      let resolvedSlotId: string = 'unknown';

      // 1. Priority check within the triggering slot
      if (activeAssignment?.sprintFocusMap) {
          resolvedSprintId = Object.keys(activeAssignment.sprintFocusMap).find(
              sId => activeAssignment.sprintFocusMap?.[sId]?.includes(option)
          ) || null;
          
          if (resolvedSprintId) {
            const slotEntry = slots.find(([_, val]) => val.stateTrigger === activeTrigger);
            resolvedSlotId = slotEntry ? slotEntry[0] : 'trigger_match';
          }
      }

      // 2. Global registry check
      if (!resolvedSprintId) {
          for (const [slotId, mapping] of slots) {
              if (mapping.sprintFocusMap) {
                  const match = Object.keys(mapping.sprintFocusMap).find(
                      sId => mapping.sprintFocusMap?.[sId]?.includes(option)
                  );
                  if (match) {
                      resolvedSprintId = match;
                      resolvedSlotId = slotId;
                      break;
                  }
              }
          }
      }

      if (resolvedSprintId) {
          // TELEMETRY: Log what the orchestrator picked
          if (user) {
              await sprintService.logOrchestratorResolution({
                  userId: user.id,
                  trigger: activeTrigger,
                  inputFocus: option,
                  resolvedSprintId,
                  slotId: resolvedSlotId
              });
          }

          if (resolvedSprintId === 'system_map') {
            navigate('/onboarding/map', { 
              state: { selectedFocus: option, trigger: activeTrigger } 
            });
          } else {
            navigate(`/onboarding/description/${resolvedSprintId}`, { 
              state: { selectedFocus: option, sprintId: resolvedSprintId, trigger: activeTrigger } 
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

  const handleReset = () => {
    setLookupError(null);
    setIsProcessingSelection(false);
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
                 {activeTrigger === 'skip_clarity' ? 'Execution Registry' : 'Growth Catalyst Mapping'}
               </p>
            </header>
            <div className="w-full space-y-3 animate-slide-up">
              {focusOptions.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(option)}
                  className="w-full group relative overflow-hidden bg-white/5 border border-white/10 py-5 px-6 rounded-2xl transition-all duration-500 hover:bg-white hover:border-white hover:scale-[1.02] active:scale-95 text-center flex items-center justify-center"
                >
                  <div className="relative z-10">
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white group-hover:text-primary transition-colors leading-relaxed block">{option}</span>
                  </div>
                  <div className="absolute inset-0 bg-white group-hover:opacity-100 opacity-0 transition-opacity"></div>
                </button>
              ))}
              {activeTrigger !== 'after_homepage' && (
                  <button onClick={() => navigate('/')} className="w-full mt-4 text-[9px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors">Cancel Action</button>
              )}
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
