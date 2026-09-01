import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  CheckCircle2, 
  TextCursorInput, 
  GitFork, 
  ArrowRight, 
  MoreVertical, 
  Eye, 
  Send, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Compass, 
  Sparkles, 
  BookOpen, 
  Sliders, 
  Layers, 
  HelpCircle,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LocalLogo from './LocalLogo';

export interface TourStep {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ReactNode;
  accentColor: string;
  bgLight: string;
  borderLight: string;
  content: React.ReactNode;
  bridgeLabel?: string;
  bridgeText?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'insight',
    stepNumber: 1,
    title: "Today's Insight",
    subtitle: "Set the thinking before the action.",
    badge: "01 · Thinking & Context",
    icon: <Lightbulb className="w-6 h-6 text-amber-500" />,
    accentColor: "text-amber-600 bg-amber-500",
    bgLight: "bg-amber-50/70",
    borderLight: "border-amber-200/80",
    content: (
      <div className="space-y-3.5 text-sm leading-relaxed text-gray-600">
        <p className="font-medium text-gray-800">
          Today's Insight helps the participant understand the idea behind the Move, see something differently, and become ready for what comes next.
        </p>
        <p className="text-xs text-gray-500">
          You can use a story, example, tension, perspective shift, or explanation when it helps. You don't need all of them.
        </p>
      </div>
    ),
    bridgeLabel: "Bridge to Action Steps",
    bridgeText: "Once they understand the idea, give them something meaningful to do with it."
  },
  {
    id: 'action-steps',
    stepNumber: 2,
    title: "Action Steps",
    subtitle: "Turn understanding into action.",
    badge: "02 · Practical Execution",
    icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
    accentColor: "text-emerald-600 bg-emerald-500",
    bgLight: "bg-emerald-50/70",
    borderLight: "border-emerald-200/80",
    content: (
      <div className="space-y-3.5 text-sm leading-relaxed text-gray-600">
        <p className="font-medium text-gray-800">
          This is where you create what the participant will actually do to move the Move forward.
        </p>
        <p className="text-xs text-gray-500">
          Keep the action connected to the Insight and the outcome of the Move. Keep instructions clear and actionable.
        </p>
      </div>
    ),
    bridgeLabel: "Bridge to Input",
    bridgeText: "Now decide what useful response or result you want to capture from that action."
  },
  {
    id: 'input',
    stepNumber: 3,
    title: "Input",
    subtitle: "Capture what matters.",
    badge: "03 · Output Capture",
    icon: <TextCursorInput className="w-6 h-6 text-blue-600" />,
    accentColor: "text-blue-600 bg-blue-500",
    bgLight: "bg-blue-50/70",
    borderLight: "border-blue-200/80",
    content: (
      <div className="space-y-3.5 text-sm leading-relaxed text-gray-600">
        <p className="font-medium text-gray-800">
          Choose the type of response the participant should provide after completing the action.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-semibold text-gray-700">
          <span className="px-2.5 py-1.5 bg-gray-50 rounded-xl border border-gray-150 text-center">Multiple Choice</span>
          <span className="px-2.5 py-1.5 bg-gray-50 rounded-xl border border-gray-150 text-center">Written Text</span>
          <span className="px-2.5 py-1.5 bg-gray-50 rounded-xl border border-gray-150 text-center">Numeric / Metric</span>
          <span className="px-2.5 py-1.5 bg-gray-50 rounded-xl border border-gray-150 text-center">Tag Selection</span>
          <span className="px-2.5 py-1.5 bg-gray-50 rounded-xl border border-gray-150 text-center">File Upload</span>
          <span className="px-2.5 py-1.5 bg-gray-50 rounded-xl border border-gray-150 text-center">External Link</span>
        </div>
      </div>
    ),
    bridgeLabel: "Bridge to Dynamic Logic",
    bridgeText: "If their response should affect what they see or do next, you can connect it with Dynamic Logic."
  },
  {
    id: 'dynamic-logic',
    stepNumber: 4,
    title: "Dynamic Logic",
    subtitle: "Let the Sprint respond to the participant.",
    badge: "04 · Adaptive Flow",
    icon: <GitFork className="w-6 h-6 text-purple-600" />,
    accentColor: "text-purple-600 bg-purple-500",
    bgLight: "bg-purple-50/70",
    borderLight: "border-purple-200/80",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-gray-600">
        <p className="font-medium text-gray-800">
          Use responses from earlier Actions to influence later questions, options, inputs, tags, or paths.
        </p>
        <div className="space-y-2 pt-1">
          <div className="p-2.5 bg-white rounded-xl border border-purple-100 flex items-start gap-2.5 text-xs">
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 font-bold rounded-md shrink-0">Poll → Poll</span>
            <span className="text-gray-600">A participant's choice determines the next question.</span>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-purple-100 flex items-start gap-2.5 text-xs">
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 font-bold rounded-md shrink-0">Poll → Tag</span>
            <span className="text-gray-600">A participant's choice saves a tag that can be referenced later.</span>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-purple-100 flex items-start gap-2.5 text-xs">
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 font-bold rounded-md shrink-0">Poll → Input</span>
            <span className="text-gray-600">A participant's choice determines what information they are asked to provide.</span>
          </div>
        </div>
      </div>
    ),
    bridgeLabel: "Bridge to Bridge Note",
    bridgeText: "Once a Move is complete, help the participant carry what they discovered into the next one."
  },
  {
    id: 'bridge-note',
    stepNumber: 5,
    title: "Bridge Note",
    subtitle: "Connect one Move to the next.",
    badge: "05 · Continuity & Rhythm",
    icon: <ArrowRight className="w-6 h-6 text-teal-600" />,
    accentColor: "text-teal-600 bg-teal-500",
    bgLight: "bg-teal-50/70",
    borderLight: "border-teal-200/80",
    content: (
      <div className="space-y-3.5 text-sm leading-relaxed text-gray-600">
        <p className="font-medium text-gray-800">
          A Bridge Note creates continuity between sessions. Use it to acknowledge what the participant has just discovered, decided, or accomplished and connect it naturally to the next Move.
        </p>
        <div className="p-3 bg-white rounded-xl border-l-4 border-teal-500 border-t border-r border-b border-gray-100 text-xs italic text-gray-700 space-y-1.5">
          <p className="font-semibold text-teal-900 not-italic">Example Bridge Note:</p>
          <p>“You've chosen what you want to build this skill towards. Now you have a direction.</p>
          <p>But knowing where you want to go doesn't tell you what it takes to get there.</p>
          <p>Next, let's look at the real work and see what it demands.”</p>
        </div>
      </div>
    ),
    bridgeLabel: "Bridge to the next Move",
    bridgeText: "The participant should feel like they're continuing the same journey, not starting a completely new task."
  },
  {
    id: 'kebab-menu',
    stepNumber: 6,
    title: "⋮ Menu & Tools",
    subtitle: "Access the tools beyond the main builder.",
    badge: "06 · Advanced Tools",
    icon: <MoreVertical className="w-6 h-6 text-indigo-600" />,
    accentColor: "text-indigo-600 bg-indigo-500",
    bgLight: "bg-indigo-50/70",
    borderLight: "border-indigo-200/80",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-gray-600">
        <p className="font-medium text-gray-800">
          Open the menu when you need deeper guidance or Sprint management tools.
        </p>
        <div className="space-y-2 pt-1 text-xs">
          <div className="p-2.5 bg-white rounded-xl border border-indigo-100 flex items-start gap-2.5">
            <BookOpen className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-900">Coach Guide</p>
              <p className="text-gray-500">Learn how to design Moves, Insights, Actions, Inputs, Bridge Notes, and Dynamic Logic.</p>
            </div>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-indigo-100 flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-900">Sprint Versioning</p>
              <p className="text-gray-500">Manage different versions of your Sprint as you make changes over time.</p>
            </div>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-indigo-100 flex items-start gap-2.5">
            <Sliders className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-900">Sprint Settings</p>
              <p className="text-gray-500">Manage the duration, audience, pricing, outcome tags, and configuration.</p>
            </div>
          </div>
        </div>
      </div>
    ),
    bridgeLabel: "Bridge to Preview",
    bridgeText: "Once your Sprint is built, step into the participant experience and check how everything works together."
  },
  {
    id: 'preview',
    stepNumber: 7,
    title: "Preview",
    subtitle: "Experience the Sprint as your participant will.",
    badge: "07 · Participant Simulation",
    icon: <Eye className="w-6 h-6 text-cyan-600" />,
    accentColor: "text-cyan-600 bg-cyan-500",
    bgLight: "bg-cyan-50/70",
    borderLight: "border-cyan-200/80",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-gray-600">
        <p className="font-medium text-gray-800">
          Preview the complete experience before submitting it. Check each critical touchpoint:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-150">
            <Check className="w-3.5 h-3.5 text-cyan-600" />
            <span>The Insight makes sense</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-150">
            <Check className="w-3.5 h-3.5 text-cyan-600" />
            <span>The Actions are clear</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-150">
            <Check className="w-3.5 h-3.5 text-cyan-600" />
            <span>The Inputs capture what matters</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-150">
            <Check className="w-3.5 h-3.5 text-cyan-600" />
            <span>Dynamic paths behave as intended</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-150">
            <Check className="w-3.5 h-3.5 text-cyan-600" />
            <span>Bridge Notes connect Moves naturally</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-150">
            <Check className="w-3.5 h-3.5 text-cyan-600" />
            <span>Flows toward intended outcome</span>
          </div>
        </div>
      </div>
    ),
    bridgeLabel: "Bridge to Save / Submit",
    bridgeText: "If everything works as intended, you're ready to save your work or submit the Sprint for approval."
  },
  {
    id: 'save-submit',
    stepNumber: 8,
    title: "Save / Submit",
    subtitle: "Finish and manage your Sprint.",
    badge: "08 · Publishing & Approval",
    icon: <Send className="w-6 h-6 text-emerald-700" />,
    accentColor: "text-emerald-700 bg-emerald-600",
    bgLight: "bg-emerald-50/70",
    borderLight: "border-emerald-200/80",
    content: (
      <div className="space-y-3 text-sm leading-relaxed text-gray-600">
        <p className="font-medium text-gray-800">
          Finish and manage your Sprint when you are ready:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
          <div className="p-3 bg-white rounded-2xl border border-gray-150 shadow-xs">
            <p className="font-bold text-gray-900 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              Save
            </p>
            <p className="text-gray-500">Save your progress and continue editing later at any time.</p>
          </div>
          <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 shadow-xs">
            <p className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Submit for Approval
            </p>
            <p className="text-emerald-700 font-medium">Send the completed Sprint for review to enter the approval process.</p>
          </div>
        </div>
      </div>
    ),
    bridgeLabel: "Ready to Build",
    bridgeText: "You are now equipped with everything you need to craft high-impact guided experiences."
  }
];

interface SprintEditorTourProps {
  isOpen: boolean;
  onClose: () => void;
  initialStepIndex?: number;
}

export const SprintEditorTour: React.FC<SprintEditorTourProps> = ({
  isOpen,
  onClose,
  initialStepIndex = 0
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(initialStepIndex);
    }
  }, [isOpen, initialStepIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight' && currentStepIndex < TOUR_STEPS.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentStepIndex > 0) {
        setCurrentStepIndex(prev => prev - 1);
      } else if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleDismiss();
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('vectorise_sprint_editor_tour_seen', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-gray-150 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-b from-gray-50/80 to-white">
          <div className="flex items-center gap-3">
            <LocalLogo type="green" className="h-7 w-auto object-contain" />
            <div className="h-4 w-px bg-gray-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
              Sprint Builder Tour
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400">
              {currentStepIndex + 1} <span className="text-gray-300">/</span> {TOUR_STEPS.length}
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Close Tour"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-gray-100">
          <div 
            className="h-full bg-[#0E7850] transition-all duration-300 rounded-r-full"
            style={{ width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Step Header */}
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl ${currentStep.bgLight} border ${currentStep.borderLight} flex items-center justify-center shrink-0 shadow-xs`}>
                  {currentStep.icon}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 block mb-1">
                    {currentStep.badge}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
                    {currentStep.title}
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-gray-500 mt-0.5">
                    {currentStep.subtitle}
                  </p>
                </div>
              </div>

              {/* Step Core Content */}
              <div className="bg-gray-50/70 p-4 sm:p-5 rounded-2xl border border-gray-100">
                {currentStep.content}
              </div>

              {/* Bridge Note / Bridge to Next */}
              {currentStep.bridgeText && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-transparent border border-emerald-100/80">
                  <div className="flex items-center gap-1.5 mb-1.5 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{currentStep.bridgeLabel || "Bridge"}</span>
                  </div>
                  <blockquote className="text-xs font-medium text-emerald-950/80 leading-relaxed italic">
                    "{currentStep.bridgeText}"
                  </blockquote>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Step Indicator Dots */}
        <div className="px-6 sm:px-8 py-2.5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-center gap-1.5">
          {TOUR_STEPS.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => setCurrentStepIndex(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === currentStepIndex 
                  ? 'w-6 bg-[#0E7850]' 
                  : idx < currentStepIndex 
                    ? 'w-2 bg-emerald-200 hover:bg-emerald-300' 
                    : 'w-2 bg-gray-200 hover:bg-gray-300'
              }`}
              title={`Jump to Step ${idx + 1}: ${step.title}`}
            />
          ))}
        </div>

        {/* Footer Actions */}
        <div className="px-6 sm:px-8 py-4 border-t border-gray-150 bg-white flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all cursor-pointer"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2.5">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 bg-[#0E7850] hover:bg-[#0b5d3e] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>{isLastStep ? "Start Building" : "Next Step"}</span>
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SprintEditorTour;
