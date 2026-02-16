
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import { FOCUS_OPTIONS } from '../../services/mockData';
import { sprintService } from '../../services/sprintService';
import { useAuth } from '../../contexts/AuthContext';
import { Participant, LifecycleSlotAssignment, GlobalOrchestrationSettings } from '../../types';

const FocusSelector: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateProfile } = useAuth();
  
  const activeTrigger = location.state?.trigger || 'after_homepage';
  
  const [isLoading, setIsLoading] = useState(false);
  const [matchingStatus, setMatchingStatus] = useState<string | null>(null);
  const [pollQuestion, setPollQuestion] = useState<string>("What’s your biggest focus right now?");
  const [focusOptions, setFocusOptions] = useState<string[]>(FOCUS_OPTIONS);
  const [activeAssignment, setActiveAssignment] = useState<LifecycleSlotAssignment | null>(null);

  useEffect(() => {
    const loadDynamicOrchestration = async () => {
      try {
        const [settings, orchestration] = await Promise.all([
          sprintService.getGlobalOrchestrationSettings(),
          sprintService.getOrchestration()
        ]);

        // Find the slot assigned to this specific trigger
        const assignment = Object.values(orchestration).find(
          (a: any) => a.stateTrigger === activeTrigger
        ) as LifecycleSlotAssignment | undefined;

        if (assignment) {
          setActiveAssignment(assignment);
          // Only use custom options if they exist, otherwise fallback to global
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
      }
    };
    loadDynamicOrchestration();
  }, [activeTrigger]);

  const handleSelect = async (option: string) => {
    setIsLoading(true);
    setMatchingStatus("Authorized Scan...");
    
    if (user) {
      try {
        const participantUser = user as Participant;
        await updateProfile({
          onboardingAnswers: {
            ...(participantUser.onboardingAnswers || {}),
            selected_focus: option
          } as any
        });
      } catch (err) {
        console.error("Profile sync failed:", err);
      }
    }

    setTimeout(() => setMatchingStatus("Polling Registry..."), 600);
    setTimeout(() => setMatchingStatus("Resolving Logic..."), 1200);

    try {
      let resolvedSprintId: string | null = null;
      const orchestration = await sprintService.getOrchestration();

      // STRICT LOOKUP: Scan ALL orchestrated slots for a match to this specific option
      const slots = Object.values(orchestration) as LifecycleSlotAssignment[];
      
      // Prioritize searching the active trigger's assigned slot first
      if (activeAssignment?.sprintFocusMap) {
          resolvedSprintId = Object.keys(activeAssignment.sprintFocusMap).find(
              sId => activeAssignment.sprintFocusMap?.[sId]?.includes(option)
          ) || null;
      }

      // If not found in primary slot, scan every other orchestrated slot for a specific mapping
      if (!resolvedSprintId) {
          for (const mapping of slots) {
              if (mapping.sprintFocusMap) {
                  const match = Object.keys(mapping.sprintFocusMap).find(
                      sId => mapping.sprintFocusMap?.[sId]?.includes(option)
                  );
                  if (match) {
                      resolvedSprintId = match;
                      break;
                  }
              }
          }
      }

      setTimeout(() => {
        if (resolvedSprintId) {
            // Foundational logic: check if the sprint is platform-owned or categorized as Foundational
            const isFoundational = resolvedSprintId.includes('foundational') || resolvedSprintId.includes('core');
            const pathPrefix = isFoundational ? 'clarity-description' : 'description';
            
            navigate(`/onboarding/${pathPrefix}/${resolvedSprintId}`, { 
              state: { selectedFocus: option, sprintId: resolvedSprintId, trigger: activeTrigger } 
            });
        } else {
            // If the orchestrator has NO mapping for this choice, we cannot show a default.
            // We must take them to discovery to choose manually.
            navigate('/discover');
        }
      }, 1800);
    } catch (error) {
      console.error("Orchestration resolution failed:", error);
      navigate('/discover');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-primary text-white overflow-hidden relative selection:bg-white/10 p-6">
      <main className="flex flex-col h-full w-full justify-center items-center relative z-10 max-w-[320px] mx-auto">
        <header className="mb-12 text-center animate-fade-in">
           <LocalLogo type="white" className="h-5 w-auto mx-auto mb-8 opacity-40" />
           <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight italic">
             {pollQuestion}
           </h1>
           <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mt-4">
             {activeTrigger === 'skip_clarity' ? 'Execution Registry Logic' : 'Growth Catalyst Mapping'}
           </p>
        </header>

        {matchingStatus ? (
          <div className="w-full flex flex-col items-center justify-center space-y-6 animate-fade-in py-12">
            <div className="relative">
                <div className="w-16 h-16 border-2 border-white/10 rounded-full"></div>
                <div className="absolute inset-0 w-16 h-16 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs">⚡</span>
                </div>
            </div>
            <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse text-[#0FB881]">{matchingStatus}</p>
                <p className="text-[8px] font-bold text-white/40 mt-2 italic uppercase">Registry Sync Active</p>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-3 animate-slide-up">
            {focusOptions.map((option, idx) => (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => handleSelect(option)}
                className="w-full group relative overflow-hidden bg-white/5 border border-white/10 py-5 px-6 rounded-2xl transition-all duration-500 hover:bg-white hover:border-white hover:scale-[1.02] active:scale-95 text-center flex items-center justify-center disabled:opacity-50"
              >
                <div className="relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white group-hover:text-primary transition-colors leading-relaxed block">
                    {option}
                  </span>
                </div>
                <div className="absolute inset-0 bg-white group-hover:opacity-100 opacity-0 transition-opacity"></div>
              </button>
            ))}
            
            {activeTrigger !== 'after_homepage' && (
                <button 
                  onClick={() => navigate('/')}
                  className="w-full mt-4 text-[9px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors"
                >
                    Cancel Action
                </button>
            )}
          </div>
        )}

        <footer className="mt-12 opacity-20 text-center">
            <p className="text-[7px] font-black uppercase tracking-[0.5em]">Vectorise • System 4.2</p>
        </footer>
      </main>

      <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-black/10 rounded-full blur-[100px] pointer-events-none"></div>

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
