import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Sparkles, 
  BookOpen, 
  Sliders, 
  Layers, 
  HelpCircle,
  Check,
  Zap,
  Info,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LocalLogo from './LocalLogo';

export interface TourStep {
  id: string;
  targetId: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ReactNode;
  accentColor: string;
  bgLight: string;
  borderLight: string;
  whatItDoes: string;
  whatToFillIn: string | React.ReactNode;
  proTip?: string;
  bridgeLabel?: string;
  bridgeText?: string;
  preferredPlacement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'insight',
    targetId: 'tour-step-insight',
    stepNumber: 1,
    title: "Today's Insight",
    subtitle: "Set the thinking before the action.",
    badge: "01 · Thinking & Context",
    icon: <Lightbulb className="w-5 h-5 text-amber-500" />,
    accentColor: "text-amber-600 bg-amber-500",
    bgLight: "bg-amber-50",
    borderLight: "border-amber-200",
    preferredPlacement: 'bottom',
    whatItDoes: "Today's Insight helps the participant understand the core concept behind the Move, see something differently, and become mentally primed for what comes next.",
    whatToFillIn: "Write a concise explanation, a relatable real-world scenario, or a perspective shift. You can use stories, contrasts, or foundational frameworks.",
    proTip: "Keep it focused on one single key takeaway before moving to practical action.",
    bridgeLabel: "Bridge to Action Steps",
    bridgeText: "Once they understand the idea, give them something meaningful to do with it."
  },
  {
    id: 'action-steps',
    targetId: 'tour-step-action-steps',
    stepNumber: 2,
    title: "Action Steps",
    subtitle: "Turn understanding into execution.",
    badge: "02 · Practical Execution",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    accentColor: "text-emerald-600 bg-emerald-500",
    bgLight: "bg-emerald-50",
    borderLight: "border-emerald-200",
    preferredPlacement: 'bottom',
    whatItDoes: "This is where you define what the participant will actually do to practice and advance the Move. Every Move requires a minimum of 3 clear action steps.",
    whatToFillIn: "Enter direct, actionable prompts for Step 1, Step 2, and Step 3 (e.g., 'Identify your #1 bottleneck', 'List 3 immediate countermeasures'). Use '+ Add Step' to expand as needed.",
    proTip: "Use 'Smart setup' above to paste bulk text and assign strings directly.",
    bridgeLabel: "Bridge to Input",
    bridgeText: "Now decide what useful response or result you want to capture from that action."
  },
  {
    id: 'input',
    targetId: 'tour-step-input-type',
    stepNumber: 3,
    title: "Input Selection",
    subtitle: "Capture what matters from the participant.",
    badge: "03 · Output Capture",
    icon: <TextCursorInput className="w-5 h-5 text-blue-600" />,
    accentColor: "text-blue-600 bg-blue-500",
    bgLight: "bg-blue-50",
    borderLight: "border-blue-200",
    preferredPlacement: 'bottom',
    whatItDoes: "Configures how the participant interacts and submits their output for each step.",
    whatToFillIn: (
      <div className="space-y-2">
        <p className="text-xs text-gray-600">Select the response format that best suits this step:</p>
        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold text-gray-700">
          <div className="px-2 py-1 bg-white rounded-lg border border-gray-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Text (Reflections)</span>
          </div>
          <div className="px-2 py-1 bg-white rounded-lg border border-gray-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>Tags (Categories)</span>
          </div>
          <div className="px-2 py-1 bg-white rounded-lg border border-gray-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>Poll (Multiple Choice)</span>
          </div>
          <div className="px-2 py-1 bg-white rounded-lg border border-gray-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Mark (Checklist)</span>
          </div>
        </div>
      </div>
    ),
    proTip: "Tag and Poll selections can be linked to dynamic logic in subsequent steps.",
    bridgeLabel: "Bridge to Dynamic Logic",
    bridgeText: "If their response should affect what they see or do next, connect it with Dynamic Logic."
  },
  {
    id: 'dynamic-logic',
    targetId: 'tour-step-dynamic-logic',
    stepNumber: 4,
    title: "Dynamic Logic & Branching",
    subtitle: "Let the sprint adapt to each participant.",
    badge: "04 · Adaptive Flow",
    icon: <GitFork className="w-5 h-5 text-purple-600" />,
    accentColor: "text-purple-600 bg-purple-500",
    bgLight: "bg-purple-50",
    borderLight: "border-purple-200",
    preferredPlacement: 'top',
    whatItDoes: "Pipes answers or tags selected in earlier steps directly into later prompts, generating tailored question paths and personalized journeys.",
    whatToFillIn: (
      <div className="space-y-1.5">
        <p className="text-xs text-gray-600">
          Use tokens like <code className="bg-purple-100 text-purple-800 font-mono px-1 py-0.5 rounded text-[11px] font-bold">&#123;Step 1&#125;</code> in your prompt or click the link icons:
        </p>
        <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 pl-1">
          <li><strong>Poll → Poll:</strong> Choice branches to specific questions</li>
          <li><strong>Poll → Tag:</strong> Selected option saves as an attribute tag</li>
          <li><strong>Poll → Input:</strong> Determines required input field</li>
        </ul>
      </div>
    ),
    proTip: "Use the sub-context version tabs (+ 1 2) to craft custom response branches for each choice.",
    bridgeLabel: "Bridge to Bridge Note",
    bridgeText: "Once a Move is complete, help the participant carry what they discovered into the next one."
  },
  {
    id: 'bridge-note',
    targetId: 'tour-step-bridge-note',
    stepNumber: 5,
    title: "Bridge Note",
    subtitle: "Connect one Move smoothly to the next.",
    badge: "05 · Continuity & Rhythm",
    icon: <ArrowRight className="w-5 h-5 text-teal-600" />,
    accentColor: "text-teal-600 bg-teal-500",
    bgLight: "bg-teal-50",
    borderLight: "border-teal-200",
    preferredPlacement: 'top',
    whatItDoes: "Displayed on the full-screen celebration after completing today's Move. It creates rhythm and bridges today's breakthroughs to tomorrow's challenge.",
    whatToFillIn: "Write 2-3 sentences acknowledging what the participant just completed, why it matters, and what to prepare for in the next Move.",
    proTip: "You can insert dynamic step tokens (e.g. {M1 Step 1 op 1}) directly into the Bridge Note.",
    bridgeLabel: "Bridge to the next Move",
    bridgeText: "The participant should feel like they're continuing one cohesive journey."
  },
  {
    id: 'kebab-menu',
    targetId: 'tour-step-kebab-menu',
    stepNumber: 6,
    title: "⋮ Menu & Tools",
    subtitle: "Access core settings, guide, and version control.",
    badge: "06 · Advanced Tools",
    icon: <MoreVertical className="w-5 h-5 text-indigo-600" />,
    accentColor: "text-indigo-600 bg-indigo-500",
    bgLight: "bg-indigo-50",
    borderLight: "border-indigo-200",
    preferredPlacement: 'bottom',
    whatItDoes: "Quick access to essential builder controls without cluttering your workspace.",
    whatToFillIn: (
      <div className="space-y-1.5 text-xs text-gray-600">
        <p className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> <strong>Coach Guide:</strong> Re-open this interactive tour & curriculum rules</p>
        <p className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> <strong>Sprint Versioning:</strong> Manage revisions and locked snapshots</p>
        <p className="flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> <strong>Sprint Settings:</strong> Configure pricing, tags, duration & access</p>
      </div>
    ),
    proTip: "You can relaunch this spotlight tour anytime from the Coach Guide option.",
    bridgeLabel: "Bridge to Preview",
    bridgeText: "Step into the participant experience and check how everything works together."
  },
  {
    id: 'preview',
    targetId: 'tour-step-preview',
    stepNumber: 7,
    title: "Preview & Stimulation",
    subtitle: "Experience the sprint as your participants will.",
    badge: "07 · Participant Simulation",
    icon: <Eye className="w-5 h-5 text-cyan-600" />,
    accentColor: "text-cyan-600 bg-cyan-500",
    bgLight: "bg-cyan-50",
    borderLight: "border-cyan-200",
    preferredPlacement: 'bottom',
    whatItDoes: "Launches a real-time simulation of the active sprint with full interactivity, animations, and dynamic logic resolution.",
    whatToFillIn: "Click the Preview eye icon to verify that insights read clearly, action steps flow naturally, and dynamic placeholders resolve properly across multiple test selections.",
    proTip: "Try answering differently to verify all branch scenarios before publishing.",
    bridgeLabel: "Bridge to Save / Submit",
    bridgeText: "If everything works as intended, you're ready to save or submit for approval."
  },
  {
    id: 'save-submit',
    targetId: 'tour-step-save-submit',
    stepNumber: 8,
    title: "Save & Submit for Review",
    subtitle: "Finish, persist, and publish your sprint.",
    badge: "08 · Publishing & Approval",
    icon: <Send className="w-5 h-5 text-emerald-700" />,
    accentColor: "text-emerald-700 bg-emerald-600",
    bgLight: "bg-emerald-50",
    borderLight: "border-emerald-200",
    preferredPlacement: 'bottom',
    whatItDoes: "Controls persisting your sprint draft and submitting completed work to the Vectorise Admin review pipeline.",
    whatToFillIn: "Click 'Save Draft' frequently as you work. Once all days, insight lessons, and action steps are complete, click 'Submit for Review' to request publication.",
    proTip: "You will be notified as soon as your sprint is approved or if amendments are requested.",
    bridgeLabel: "Ready to Build",
    bridgeText: "You are now equipped with everything needed to build high-impact sprint experiences!"
  }
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

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
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' | 'left' | 'right' | 'center'; arrowOffset: number }>({
    top: 100,
    left: 100,
    placement: 'bottom',
    arrowOffset: 50
  });
  const popoverRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<any>(null);

  const currentStep = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // Measure and update target position
  const updateTargetPosition = useCallback(() => {
    if (!isOpen) return;
    const targetElement = document.getElementById(currentStep.targetId);

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const padding = 8; // padding around highlighted element
      const adjustedRect: Rect = {
        top: Math.max(0, rect.top - padding),
        left: Math.max(0, rect.left - padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        bottom: rect.bottom + padding,
        right: rect.right + padding
      };
      setTargetRect(adjustedRect);

      // Compute Popover Position
      const popoverWidth = popoverRef.current ? popoverRef.current.offsetWidth : 440;
      const popoverHeight = popoverRef.current ? popoverRef.current.offsetHeight : 420;
      const margin = 14;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      let top = 0;
      let left = 0;
      let placement: 'top' | 'bottom' | 'left' | 'right' | 'center' = 'bottom';
      let arrowOffset = 50; // percentage

      const spaceBelow = viewportH - adjustedRect.bottom;
      const spaceAbove = adjustedRect.top;
      const spaceRight = viewportW - adjustedRect.right;
      const spaceLeft = adjustedRect.left;

      const pref = currentStep.preferredPlacement || 'auto';

      if (pref === 'bottom' && spaceBelow >= popoverHeight + margin) {
        placement = 'bottom';
      } else if (pref === 'top' && spaceAbove >= popoverHeight + margin) {
        placement = 'top';
      } else if (spaceBelow >= popoverHeight + margin) {
        placement = 'bottom';
      } else if (spaceAbove >= popoverHeight + margin) {
        placement = 'top';
      } else if (spaceRight >= popoverWidth + margin) {
        placement = 'right';
      } else if (spaceLeft >= popoverWidth + margin) {
        placement = 'left';
      } else {
        placement = spaceBelow > spaceAbove ? 'bottom' : 'top';
      }

      if (placement === 'bottom') {
        top = adjustedRect.bottom + margin;
        left = adjustedRect.left + (adjustedRect.width / 2) - (popoverWidth / 2);
      } else if (placement === 'top') {
        top = adjustedRect.top - popoverHeight - margin;
        left = adjustedRect.left + (adjustedRect.width / 2) - (popoverWidth / 2);
      } else if (placement === 'right') {
        top = adjustedRect.top + (adjustedRect.height / 2) - (popoverHeight / 2);
        left = adjustedRect.right + margin;
      } else if (placement === 'left') {
        top = adjustedRect.top + (adjustedRect.height / 2) - (popoverHeight / 2);
        left = adjustedRect.left - popoverWidth - margin;
      }

      // Constrain inside viewport horizontally
      const originalLeft = left;
      if (left < 16) {
        left = 16;
      } else if (left + popoverWidth > viewportW - 16) {
        left = viewportW - popoverWidth - 16;
      }

      // Constrain inside viewport vertically
      if (top < 16) {
        top = 16;
      } else if (top + popoverHeight > viewportH - 16) {
        top = viewportH - popoverHeight - 16;
      }

      // Calculate arrow position relative to target center
      if (placement === 'top' || placement === 'bottom') {
        const targetCenter = adjustedRect.left + (adjustedRect.width / 2);
        const relativeCenter = targetCenter - left;
        arrowOffset = Math.max(15, Math.min(85, (relativeCenter / popoverWidth) * 100));
      }

      setPopoverPos({ top, left, placement, arrowOffset });
    } else {
      // Fallback if target element not in DOM
      setTargetRect(null);
      const popoverWidth = 440;
      const popoverHeight = 380;
      setPopoverPos({
        top: Math.max(20, (window.innerHeight - popoverHeight) / 2),
        left: Math.max(16, (window.innerWidth - popoverWidth) / 2),
        placement: 'center',
        arrowOffset: 50
      });
    }
  }, [isOpen, currentStep]);

  // Handle step change with smooth scroll
  useEffect(() => {
    if (!isOpen) return;

    const targetElement = document.getElementById(currentStep.targetId);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }

    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 250);

    return () => clearTimeout(timer);
  }, [currentStepIndex, isOpen, currentStep, updateTargetPosition]);

  // Handle Window Resize and Scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => {
      if (resizeTimeoutRef.current) cancelAnimationFrame(resizeTimeoutRef.current);
      resizeTimeoutRef.current = requestAnimationFrame(() => {
        updateTargetPosition();
      });
    };

    window.addEventListener('resize', handleUpdate, { passive: true });
    window.addEventListener('scroll', handleUpdate, { passive: true });

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
      if (resizeTimeoutRef.current) cancelAnimationFrame(resizeTimeoutRef.current);
    };
  }, [isOpen, updateTargetPosition]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(initialStepIndex);
    }
  }, [isOpen, initialStepIndex]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-[200] overflow-hidden select-none pointer-events-auto">
      {/* SVG Spotlight Cutout Backdrop */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-[201] transition-all duration-300">
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White background = visible backdrop */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black rectangle = cut out hole */}
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="16"
                ry="16"
                fill="black"
                className="transition-all duration-300 ease-out"
              />
            )}
          </mask>
        </defs>
        {/* Darkened backdrop with cutout hole */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.72)"
          mask="url(#tour-spotlight-mask)"
          className="pointer-events-auto cursor-default"
          onClick={(e) => {
            // Clicking backdrop does not dismiss abruptly, guides user to Next
            e.stopPropagation();
          }}
        />
      </svg>

      {/* Pulsing Glowing Ring around highlighted element */}
      {targetRect && (
        <div
          className="fixed pointer-events-none z-[202] rounded-2xl border-2 border-[#0E7850] shadow-[0_0_0_4px_rgba(14,120,80,0.25),0_0_24px_rgba(14,120,80,0.4)] transition-all duration-300 ease-out animate-pulse"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height
          }}
        />
      )}

      {/* Floating Spotlight Card */}
      <div
        ref={popoverRef}
        className="fixed z-[205] w-[420px] max-w-[calc(100vw-32px)] transition-all duration-300 ease-out"
        style={{
          top: popoverPos.top,
          left: popoverPos.left
        }}
      >
        {/* Arrow pointer indicator */}
        {popoverPos.placement === 'bottom' && (
          <div
            className="w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-white absolute -top-2 drop-shadow-sm transition-all duration-300"
            style={{ left: `${popoverPos.arrowOffset}%`, transform: 'translateX(-50%)' }}
          />
        )}
        {popoverPos.placement === 'top' && (
          <div
            className="w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-white absolute -bottom-2 drop-shadow-sm transition-all duration-300"
            style={{ left: `${popoverPos.arrowOffset}%`, transform: 'translateX(-50%)' }}
          />
        )}

        {/* Card Body */}
        <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-150 overflow-hidden flex flex-col max-h-[85vh]">
          {/* Top Bar */}
          <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50/90 via-white to-gray-50/50">
            <div className="flex items-center gap-2">
              <LocalLogo type="green" className="h-5 w-auto object-contain" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0E7850]">
                Sprint Spotlight Tour
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                {currentStepIndex + 1} / {TOUR_STEPS.length}
              </span>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                title="Exit Tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1 bg-gray-100">
            <div 
              className="h-full bg-[#0E7850] transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>

          {/* Content Area */}
          <div className="p-5 overflow-y-auto space-y-4 max-h-[calc(85vh-140px)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {/* Step Header */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${currentStep.bgLight} border ${currentStep.borderLight} flex items-center justify-center shrink-0 shadow-xs`}>
                    {currentStep.icon}
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 block mb-0.5">
                      {currentStep.badge}
                    </span>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
                      {currentStep.title}
                    </h3>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">
                      {currentStep.subtitle}
                    </p>
                  </div>
                </div>

                {/* What it does */}
                <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-100 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-gray-900 text-[10px] font-black uppercase tracking-wider">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    <span>What It Does</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed font-medium">
                    {currentStep.whatItDoes}
                  </p>
                </div>

                {/* What to fill in */}
                <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100/70 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-900 text-[10px] font-black uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5 text-[#0E7850]" />
                    <span>What To Fill In</span>
                  </div>
                  <div className="text-xs text-gray-700 leading-relaxed font-medium">
                    {currentStep.whatToFillIn}
                  </div>
                </div>

                {/* Bridge Note / Pro Tip */}
                {currentStep.bridgeText && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-teal-50/60 via-emerald-50/40 to-transparent border border-teal-100/60">
                    <div className="flex items-center gap-1.5 mb-1 text-teal-800 text-[9px] font-black uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-teal-600" />
                      <span>{currentStep.bridgeLabel || "Bridge"}</span>
                    </div>
                    <p className="text-xs font-semibold text-teal-950/80 italic leading-relaxed">
                      "{currentStep.bridgeText}"
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots Indicator */}
          <div className="px-5 py-2 bg-gray-50/50 border-t border-gray-100 flex items-center justify-center gap-1.5">
            {TOUR_STEPS.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex 
                    ? 'w-5 bg-[#0E7850]' 
                    : idx < currentStepIndex 
                      ? 'w-1.5 bg-emerald-200 hover:bg-emerald-300' 
                      : 'w-1.5 bg-gray-200 hover:bg-gray-300'
                }`}
                title={`Jump to Step ${idx + 1}: ${step.title}`}
              />
            ))}
          </div>

          {/* Bottom Actions */}
          <div className="px-5 py-3.5 border-t border-gray-150 bg-white flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-all cursor-pointer"
            >
              Skip Tour
            </button>

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 bg-[#0E7850] hover:bg-[#0b5d3e] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>{isLastStep ? "Start Building" : "Next"}</span>
                {!isLastStep && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SprintEditorTour;
