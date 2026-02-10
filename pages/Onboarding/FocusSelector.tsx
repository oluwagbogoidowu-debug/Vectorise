import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import { FOCUS_OPTIONS } from '../../services/mockData';
import { sprintService } from '../../services/sprintService';
import { useAuth } from '../../contexts/AuthContext';
import { Participant, LifecycleSlotAssignment } from '../../types';

const FocusSelector: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [matchingStatus, setMatchingStatus] = useState<string | null>(null);
  const [focusOptions, setFocusOptions] = useState<string[]>(FOCUS_OPTIONS);
  const [homepageAssignment, setHomepageAssignment] = useState<LifecycleSlotAssignment | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [settings, orchestration] = await Promise.all([
          sprintService.getGlobalOrchestrationSettings(),
          sprintService.getOrchestration()
        ]);

        // Find the slot assigned to the homepage trigger
        const assignment = Object.values(orchestration).find(
          (a: any) => a.stateTrigger === 'after_homepage'
        ) as LifecycleSlotAssignment | undefined;

        if (assignment) {
          setHomepageAssignment(assignment);
          if (assignment.availableFocusOptions && assignment.availableFocusOptions.length > 0) {
            setFocusOptions(assignment.availableFocusOptions);
          }
        } else if (settings?.focusOptions && settings.focusOptions.length > 0) {
          setFocusOptions(settings.focusOptions);
        }
      } catch (err) {
        console.warn("Could not load dynamic focus registry:", err);
      }
    };
    loadSettings();
  }, []);

  const handleSelect = async (option: string, index: number) => {
    setIsLoading(true);
    setMatchingStatus("Authorized Scan...");
    
    // Persist focus to user profile if logged in
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
        console.error("Failed to save focus to profile:", err);
      }
    }

    // Simulate analysis phase for high-end UX feel
    setTimeout(() => setMatchingStatus("Polling Registry..."), 600);
    setTimeout(() => setMatchingStatus("Foundation Check..."), 1200);

    try {
      // Priority: Resolve sprint from the explicit homepage assignment map
      let resolvedSprintId: string | null = null;

      if (homepageAssignment?.sprintFocusMap) {
          resolvedSprintId = Object.keys(homepageAssignment.sprintFocusMap).find(
              sId => homepageAssignment.sprintFocusMap?.[sId]?.includes(option)
          ) || null;
      }

      // Fallback: If no explicit map match, look at general Foundation slots
      if (!resolvedSprintId) {
          const orchestration = await sprintService.getOrchestration();
          const foundationSlotIds = ['slot_found_clarity', 'slot_found_orient', 'slot_found_core'];
          
          for (const slotId of foundationSlotIds) {
              const mapping = orchestration[slotId] as LifecycleSlotAssignment;
              if (mapping?.sprintFocusMap) {
                  const matchedId = Object.keys(mapping.sprintFocusMap).find(sId => mapping.sprintFocusMap?.[sId]?.includes(option));
                  if (matchedId) {
                      resolvedSprintId = matchedId;
                      break;
                  }
              }
              if (mapping?.sprintId && mapping.focusCriteria?.includes(option)) {
                  resolvedSprintId = mapping.sprintId;
                  break;
              }
          }
      }
      
      if (resolvedSprintId) {
          setTimeout(() => {
            navigate(`/onboarding/clarity-description/${resolvedSprintId}`, { 
              state: { selectedFocus: option, sprintId: resolvedSprintId } 
            });
          }, 1800);
      } else {
          setMatchingStatus("Broadening Search...");
          setTimeout(() => {
              navigate('/discover');
          }, 1800);
      }
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
             What’s your biggest <br/> focus right now?
           </h1>
           <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mt-4">Growth Catalyst Mapping</p>
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
                <p className="text-[8px] font-bold text-white/40 mt-2 italic uppercase">Registry Sync in Progress</p>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-3 animate-slide-up">
            {focusOptions.map((option, idx) => (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => handleSelect(option, idx)}
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
          </div>
        )}

        <footer className="mt-12 opacity-20 text-center">
            <p className="text-[7px] font-black uppercase tracking-[0.5em]">Vectorise • Growth Registry Protocol</p>
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