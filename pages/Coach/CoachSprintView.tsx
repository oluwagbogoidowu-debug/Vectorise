import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import {
  ParticipantSprint,
  Sprint,
  DailyContent,
  Coach,
} from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { sprintService } from "../../services/sprintService";
import { userService } from "../../services/userService";
import FormattedText from "../../components/FormattedText";
import { formatInterpolatedText } from "../../src/utils/stepPlaceholderUtils";
import CustomSelect from "../../components/CustomSelect";
import LocalLogo from "../../components/LocalLogo";
import { BookOpen, Maximize2, Minimize2, Clock, Trash2, Plus, Check, Bell, X, ArrowLeft, Eye, RefreshCw, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const CoachDaySuccessModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  day: number;
  bridgeNote?: string;
}> = ({ isOpen, onClose, day, bridgeNote }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center relative overflow-hidden animate-slide-up border border-gray-100">
        <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6 text-purple-600 relative">
          <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-20"></div>
          <Sparkles className="w-12 h-12 relative z-10" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
          Day {day} Completed!
        </h3>
        <p className="text-gray-500 text-sm font-medium mb-4">
          Participant Day Success Screen Preview
        </p>
        {bridgeNote && (
          <div className="mb-6 p-4 bg-purple-50/70 border border-purple-100 rounded-2xl text-left">
            <p className="text-[10px] font-black text-purple-700 uppercase tracking-widest mb-1.5">
              Bridge Note
            </p>
            <p className="text-xs text-gray-700 font-bold italic leading-relaxed">
              "{bridgeNote}"
            </p>
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-purple-700 transition-colors shadow-lg active:scale-95 cursor-pointer"
        >
          Close Preview
        </button>
      </div>
    </div>
  );
};

const CoachMirrorReportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  day: number;
  dayContent: any;
  answers: string[];
}> = ({ isOpen, onClose, day, dayContent, answers }) => {
  if (!isOpen) return null;

  const mirrorPrompts = dayContent?.taskPrompts?.filter((_: any, idx: number) => {
    const type = dayContent.taskInputTypes?.[idx];
    return type === 'tags' || type === 'poll' || type === 'text';
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full relative overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🪞</span>
            <h3 className="text-lg font-black text-gray-900">Mirror Report Preview</h3>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          <p className="text-xs text-purple-700 font-bold bg-purple-50 p-3 rounded-xl">
            ✨ Active Coach Design Preview: Below is how participants will see their mirror summary for Day {day}.
          </p>
          {mirrorPrompts.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-6">No tags, polls, or text steps configured for Day {day}.</p>
          ) : (
            mirrorPrompts.map((prompt: string, idx: number) => (
              <div key={idx} className="p-4 bg-gray-50 border border-gray-150 rounded-2xl">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Step Prompt</p>
                <p className="text-xs font-bold text-gray-800 mb-2">{prompt || `Step ${idx + 1}`}</p>
                <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider mb-1">Participant Selection / Answer</p>
                <p className="text-xs font-medium text-gray-600 bg-white p-2.5 rounded-xl border border-gray-200">
                  {answers[idx] || <span className="text-gray-400 italic">No input entered yet in preview</span>}
                </p>
              </div>
            ))
          )}
        </div>
        <div className="pt-4 border-t border-gray-100 mt-4">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Done Previewing
          </button>
        </div>
      </div>
    </div>
  );
};

const CoachSprintView: React.FC = () => {
  const { sprintId } = useParams<{ sprintId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [sprint, setSprint] = useState<Sprint | null>(() => {
    if (location.state?.sprint) {
      const stateSprint = location.state.sprint;
      const pending = stateSprint.pendingChanges;
      if (pending) {
        return {
          ...stateSprint,
          ...pending,
          dailyContent: (Array.isArray(pending.dailyContent)
            ? pending.dailyContent
            : (Array.isArray(stateSprint.dailyContent) ? stateSprint.dailyContent : [])).map((c: any) => ({
              ...c,
              taskPrompts: (c as any).taskPrompts || [c.taskPrompt || '']
            })),
          duration: pending.duration || stateSprint.duration || 0,
          outcomes: Array.isArray(pending.outcomes) ? pending.outcomes : (Array.isArray(stateSprint.outcomes) ? stateSprint.outcomes : []),
          forWho: Array.isArray(pending.forWho) ? pending.forWho : (Array.isArray(stateSprint.forWho) ? stateSprint.forWho : []),
          notForWho: Array.isArray(pending.notForWho) ? pending.notForWho : (Array.isArray(stateSprint.notForWho) ? stateSprint.notForWho : []),
          methodSnapshot: Array.isArray(pending.methodSnapshot) ? pending.methodSnapshot : (Array.isArray(stateSprint.methodSnapshot) ? stateSprint.methodSnapshot : []),
          dynamicSections: Array.isArray(pending.dynamicSections) ? pending.dynamicSections : (Array.isArray(stateSprint.dynamicSections) ? stateSprint.dynamicSections : [])
        };
      }
      return stateSprint;
    }
    return null;
  });

  const [viewingDay, setViewingDay] = useState<number>(1);
  const [taskInputs, setTaskInputs] = useState<string[]>(["", "", "", "", "", ""]);
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [coach, setCoach] = useState<Coach | null>(null);
  const [isDaySuccessModalOpen, setIsDaySuccessModalOpen] = useState(false);
  const [isMirrorReportModalOpen, setIsMirrorReportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(!sprint);

  useEffect(() => {
    if (!sprintId) return;

    const processSprint = (data: any) => {
      if (!data) return data;
      const stateSprint = location.state?.sprint?.id === data.id ? location.state.sprint : null;
      const targetSource = stateSprint || data;
      const pending = targetSource.pendingChanges || (stateSprint ? null : data.pendingChanges);
      return {
        ...targetSource,
        ...(pending || {}),
        dailyContent: (Array.isArray(pending?.dailyContent)
          ? pending.dailyContent
          : (Array.isArray(targetSource.dailyContent) ? targetSource.dailyContent : [])).map((c: any) => ({
            ...c,
            taskPrompts: (c as any).taskPrompts || [c.taskPrompt || '']
          })),
        duration: pending?.duration || targetSource.duration || 0,
        outcomes: Array.isArray(pending?.outcomes) ? pending.outcomes : (Array.isArray(targetSource.outcomes) ? targetSource.outcomes : []),
        forWho: Array.isArray(pending?.forWho) ? pending.forWho : (Array.isArray(targetSource.forWho) ? targetSource.forWho : []),
        notForWho: Array.isArray(pending?.notForWho) ? pending.notForWho : (Array.isArray(targetSource.notForWho) ? targetSource.notForWho : []),
        methodSnapshot: Array.isArray(pending?.methodSnapshot) ? pending.methodSnapshot : (Array.isArray(targetSource.methodSnapshot) ? targetSource.methodSnapshot : []),
        dynamicSections: Array.isArray(pending?.dynamicSections) ? pending.dynamicSections : (Array.isArray(targetSource.dynamicSections) ? targetSource.dynamicSections : [])
      };
    };

    let unsub: (() => void) | undefined;
    sprintService.getSprintById(sprintId).then(data => {
      if (data) setSprint(processSprint(data));
      setIsLoading(false);
    }).catch(err => {
      console.error("[CoachSprintView] Error fetching sprint:", err);
      setIsLoading(false);
    });

    unsub = sprintService.subscribeToSprint(sprintId, (data) => {
      if (data) {
        setSprint(processSprint(data));
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, [sprintId, location.state]);

  useEffect(() => {
    if (sprint?.coachId) {
      userService.getCoaches().then(coaches => {
        const found = coaches.find(c => c.id === sprint.coachId);
        if (found) setCoach(found);
      }).catch(err => console.error("Error loading coach:", err));
    }
  }, [sprint?.coachId]);

  const dayContent = useMemo(() => {
    if (!sprint || !Array.isArray(sprint.dailyContent)) return null;
    return sprint.dailyContent.find(c => c.day === viewingDay) || sprint.dailyContent[viewingDay - 1] || null;
  }, [sprint, viewingDay]);

  const activePrompts = dayContent?.taskPrompts || [dayContent?.taskPrompt || ''];
  const totalDays = sprint?.duration || (Array.isArray(sprint?.dailyContent) ? sprint?.dailyContent.length : 1);

  const resetPreviewState = () => {
    setViewingDay(1);
    setActiveTaskIndex(0);
    setTaskInputs(["", "", "", "", "", ""]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA]">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAFA] p-6 text-center">
        <p className="text-gray-500 font-bold mb-4">Sprint details could not be loaded for preview.</p>
        <button onClick={() => navigate('/coach/sprints')} className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider">
          Return to Sprints
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans text-gray-900 pb-20">
      {/* Top Banner: Coach Preview Header */}
      <header className="sticky top-0 z-40 bg-purple-900 text-white px-4 py-3 shadow-md flex items-center justify-between border-b border-purple-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/coach/sprint/edit/${sprint.id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back to Editor
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 block">Coach Live Interactive Simulation</span>
            <h1 className="text-sm font-black truncate max-w-xs md:max-w-md">{sprint.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetPreviewState}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Reset Preview Simulation"
          >
            <RefreshCw size={13} />
            Reset
          </button>
          <button
            onClick={() => setIsMirrorReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-purple-900 hover:bg-purple-50 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
          >
            🪞 Mirror Report
          </button>
        </div>
      </header>

      {/* Main Preview Workspace Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Day Navigation Tabs */}
        <div className="bg-white p-3 rounded-2xl border border-gray-150 shadow-xs flex items-center justify-between overflow-x-auto gap-2">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
              <button
                key={d}
                onClick={() => {
                  setViewingDay(d);
                  setActiveTaskIndex(0);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer shrink-0 ${
                  viewingDay === d
                    ? 'bg-purple-600 text-white shadow-sm scale-105'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                Day {d}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-3 py-1.5 rounded-xl shrink-0">
            Day {viewingDay} of {totalDays}
          </span>
        </div>

        {/* Day Action Step Workspace Card */}
        {dayContent ? (
          <div className="bg-white rounded-3xl border border-gray-150 shadow-sm p-6 space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">Day {viewingDay} Theme</span>
                <h2 className="text-xl font-black text-gray-900 mt-0.5">{dayContent.title || `Day ${viewingDay} Action`}</h2>
                {dayContent.description && (
                  <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">{dayContent.description}</p>
                )}
              </div>
            </div>

            {/* Step Selection Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100">
              {activePrompts.map((prompt: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveTaskIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeTaskIndex === idx
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Step {idx + 1}
                </button>
              ))}
            </div>

            {/* Current Step Content */}
            {activePrompts[activeTaskIndex] !== undefined && (
              <div className="space-y-4">
                <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-700 block mb-1">
                    Step {activeTaskIndex + 1} Prompt
                  </span>
                  <div className="text-sm font-bold text-gray-800">
                    <FormattedText text={activePrompts[activeTaskIndex] || `Action Step ${activeTaskIndex + 1}`} />
                  </div>
                  {dayContent.taskHints?.[activeTaskIndex] && (
                    <p className="text-xs text-purple-600/90 font-medium italic mt-2">
                      💡 {dayContent.taskHints[activeTaskIndex]}
                    </p>
                  )}
                </div>

                {/* Input Simulation Area */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
                    Participant Input Simulation (Type / Select to test)
                  </span>
                  <textarea
                    rows={3}
                    value={taskInputs[activeTaskIndex] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTaskInputs(prev => {
                        const copy = [...prev];
                        copy[activeTaskIndex] = val;
                        return copy;
                      });
                    }}
                    placeholder="Enter answer here as a participant would..."
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Bottom Controls for Day */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                onClick={() => setIsDaySuccessModalOpen(true)}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-2"
              >
                <Sparkles size={14} />
                Preview Day Success Celebration
              </button>
              <div className="flex items-center gap-2">
                {viewingDay > 1 && (
                  <button
                    onClick={() => {
                      setViewingDay(prev => prev - 1);
                      setActiveTaskIndex(0);
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Previous Day
                  </button>
                )}
                {viewingDay < totalDays && (
                  <button
                    onClick={() => {
                      setViewingDay(prev => prev + 1);
                      setActiveTaskIndex(0);
                    }}
                    className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Next Day
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-150 p-12 text-center text-gray-400">
            <p className="font-bold text-sm">No content configured for Day {viewingDay}.</p>
          </div>
        )}
      </main>

      {/* Modals */}
      <CoachDaySuccessModal
        isOpen={isDaySuccessModalOpen}
        onClose={() => setIsDaySuccessModalOpen(false)}
        day={viewingDay}
        bridgeNote={dayContent?.bridgeNote}
      />
      <CoachMirrorReportModal
        isOpen={isMirrorReportModalOpen}
        onClose={() => setIsMirrorReportModalOpen(false)}
        day={viewingDay}
        dayContent={dayContent}
        answers={taskInputs}
      />
    </div>
  );
};

export default CoachSprintView;
