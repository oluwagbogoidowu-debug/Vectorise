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
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LocalLogo from './LocalLogo';

export interface SpotlightStep {
  id: string;
  targetId: string;
  stepNumber: number;
  title: string;
  badge: string;
  icon: React.ReactNode;
  accentBg: string;
  accentText: string;
  description: string;
  keyRule: string;
  proTip: string;
  preferredPlacement?: 'top' | 'bottom' | 'auto';
}

export const SPOTLIGHT_STEPS: SpotlightStep[] = [
  {
    id: 'insight',
    targetId: 'tour-step-insight',
    stepNumber: 1,
    title: "Today's Insight",
    badge: "01 · Context & Thinking",
    icon: <Lightbulb className="w-4 h-4 text-amber-500" />,
    accentBg: "bg-amber-50",
    accentText: "text-amber-700",
    description: "Prime participants with the core idea, perspective shift, or mental model before asking them to take action.",
    keyRule: "Keep it focused on one concise, high-impact takeaway.",
    proTip: "Short, engaging insights lead to significantly higher step completion rates.",
    preferredPlacement: 'bottom'
  },
  {
    id: 'action-steps',
    targetId: 'tour-step-action-steps',
    stepNumber: 2,
    title: "Action Steps",
    badge: "02 · Practical Moves",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    accentBg: "bg-emerald-50",
    accentText: "text-emerald-700",
    description: "Define the specific, practical actions the participant must execute today.",
    keyRule: "Every Move requires a minimum of 3 distinct action steps.",
    proTip: "Use 'Smart Setup' to paste raw outlines and auto-assign steps instantly.",
    preferredPlacement: 'bottom'
  },
  {
    id: 'input-type',
    targetId: 'tour-step-input-type',
    stepNumber: 3,
    title: "Input Selection",
    badge: "03 · Output Format",
    icon: <TextCursorInput className="w-4 h-4 text-blue-600" />,
    accentBg: "bg-blue-50",
    accentText: "text-blue-700",
    description: "Choose how participants respond: written reflection (Text), classification (Tags), multiple-choice (Poll), or completion check (Mark).",
    keyRule: "Match the input format to the cognitive load of the step.",
    proTip: "Poll and Tag choices can dynamically branch into subsequent questions.",
    preferredPlacement: 'top'
  },
  {
    id: 'dynamic-logic',
    targetId: 'tour-step-dynamic-logic',
    stepNumber: 4,
    title: "Dynamic Logic & Branching",
    badge: "04 · Adaptive Journeys",
    icon: <GitFork className="w-4 h-4 text-purple-600" />,
    accentBg: "bg-purple-50",
    accentText: "text-purple-700",
    description: "Connect choices and insert previous answers directly into future prompts.",
    keyRule: "Use {Step 1} tokens or Poll link icons to create personalized flows.",
    proTip: "Write customized feedback for specific poll answers using the sub-tabs (+ 1 2).",
    preferredPlacement: 'top'
  },
  {
    id: 'bridge-note',
    targetId: 'tour-step-bridge-note',
    stepNumber: 5,
    title: "Bridge Note",
    badge: "05 · Daily Continuity",
    icon: <ArrowRight className="w-4 h-4 text-teal-600" />,
    accentBg: "bg-teal-50",
    accentText: "text-teal-700",
    description: "Displays on the completion screen to celebrate today's progress and create anticipation for tomorrow.",
    keyRule: "Acknowledge today's win in 1-2 sentences and hint at tomorrow's Move.",
    proTip: "Dynamic answer tokens work inside the Bridge Note as well.",
    preferredPlacement: 'top'
  },
  {
    id: 'kebab-menu',
    targetId: 'tour-step-kebab-menu',
    stepNumber: 6,
    title: "⋮ Menu & Settings",
    badge: "06 · Builder Utilities",
    icon: <MoreVertical className="w-4 h-4 text-indigo-600" />,
    accentBg: "bg-indigo-50",
    accentText: "text-indigo-700",
    description: "Access Sprint Versioning, Sprint Metadata/Settings, and reopen the full Coach Guide anytime.",
    keyRule: "Create immutable snapshots before publishing major updates.",
    proTip: "Open this menu anytime you want to re-read the Coach Guide.",
    preferredPlacement: 'bottom'
  },
  {
    id: 'preview',
    targetId: 'tour-step-preview',
    stepNumber: 7,
    title: "Preview & Stimulation",
    badge: "07 · Participant Simulation",
    icon: <Eye className="w-4 h-4 text-cyan-600" />,
    accentBg: "bg-cyan-50",
    accentText: "text-cyan-700",
    description: "Simulate the live participant experience in real-time with full animations, timers, and branch logic.",
    keyRule: "Always test both primary and branching pathways before submitting.",
    proTip: "Simulating gives you immediate visual feedback on spacing and readability.",
    preferredPlacement: 'bottom'
  },
  {
    id: 'save-submit',
    targetId: 'tour-step-save-submit',
    stepNumber: 8,
    title: "Save & Submit for Review",
    badge: "08 · Publishing",
    icon: <Send className="w-4 h-4 text-emerald-700" />,
    accentBg: "bg-emerald-50",
    accentText: "text-emerald-800",
    description: "Save drafts safely as you build, and submit the completed sprint for admin verification when ready.",
    keyRule: "Drafts are auto-saved locally and can be published after approval.",
    proTip: "You're all set! Enjoy crafting high-impact sprint experiences.",
    preferredPlacement: 'bottom'
  }
];

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

interface SprintSpotlightTourProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCoachGuide?: () => void;
}

export const SprintSpotlightTour: React.FC<SprintSpotlightTourProps> = ({
  isOpen,
  onClose,
  onOpenCoachGuide
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [cardPosition, setCardPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({
    top: 100,
    left: 20,
    placement: 'bottom'
  });
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const currentStep = SPOTLIGHT_STEPS[currentStepIndex] || SPOTLIGHT_STEPS[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === SPOTLIGHT_STEPS.length - 1;

  // Handle resize and scroll
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate target element position and scroll into view
  const updateTargetBounds = useCallback(() => {
    if (!isOpen) return;
    const targetElement = document.getElementById(currentStep.targetId);

    if (targetElement) {
      // Scroll element smoothly into view if needed
      const rect = targetElement.getBoundingClientRect();
      const isOutOfView = rect.top < 80 || rect.bottom > window.innerHeight - 80;

      if (isOutOfView) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }

      // Re-measure after scroll animation starts
      const timeoutId = setTimeout(() => {
        const freshRect = targetElement.getBoundingClientRect();
        const padding = 8;
        const computedRect: TargetRect = {
          top: Math.max(0, freshRect.top - padding),
          left: Math.max(0, freshRect.left - padding),
          width: freshRect.width + padding * 2,
          height: freshRect.height + padding * 2,
          bottom: freshRect.bottom + padding,
          right: freshRect.right + padding
        };
        setTargetRect(computedRect);

        // Position the card relative to target
        const cardWidth = Math.min(420, window.innerWidth - 32);
        const cardHeight = 310;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let placement: 'top' | 'bottom' = currentStep.preferredPlacement === 'top' ? 'top' : 'bottom';
        let top = 0;
        let left = computedRect.left + computedRect.width / 2 - cardWidth / 2;

        // Clamp left position so card stays on screen
        left = Math.max(16, Math.min(left, viewportWidth - cardWidth - 16));

        // Determine top vs bottom placement based on available space
        const spaceBelow = viewportHeight - computedRect.bottom;
        const spaceAbove = computedRect.top;

        if (placement === 'bottom' && spaceBelow < cardHeight + 20 && spaceAbove > cardHeight + 20) {
          placement = 'top';
        } else if (placement === 'top' && spaceAbove < cardHeight + 20 && spaceBelow > cardHeight + 20) {
          placement = 'bottom';
        }

        if (placement === 'bottom') {
          top = computedRect.bottom + 14;
        } else {
          top = computedRect.top - cardHeight - 14;
        }

        // Clamp top
        top = Math.max(16, Math.min(top, viewportHeight - cardHeight - 16));

        setCardPosition({ top, left, placement });
      }, 100);

      return () => clearTimeout(timeoutId);
    } else {
      // Fallback center position if target ID is not found on page
      setTargetRect(null);
      const cardWidth = Math.min(420, window.innerWidth - 32);
      setCardPosition({
        top: Math.max(60, window.innerHeight / 2 - 160),
        left: Math.max(16, window.innerWidth / 2 - cardWidth / 2),
        placement: 'bottom'
      });
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    updateTargetBounds();
    const handleScroll = () => {
      if (isOpen) {
        updateTargetBounds();
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [updateTargetBounds, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (!isLastStep) {
          setCurrentStepIndex(prev => prev + 1);
        } else {
          handleDismiss();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (!isFirstStep) {
          setCurrentStepIndex(prev => prev - 1);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, isFirstStep, isLastStep]);

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
    localStorage.setItem('vectorise_sprint_spotlight_tour_seen', 'true');
    onClose();
  };

  const handleOpenGuideFromTour = () => {
    handleDismiss();
    if (onOpenCoachGuide) {
      onOpenCoachGuide();
    }
  };

  return (
    <div className="fixed inset-0 z-[250] pointer-events-auto select-none overflow-hidden animate-fade-in">
      {/* SVG Spotlight Mask Cutout */}
      <svg 
        className="fixed inset-0 w-full h-full pointer-events-none transition-all duration-300 ease-out"
        style={{ width: '100vw', height: '100vh' }}
      >
        <defs>
          <mask id="spotlight-mask">
            {/* Full opaque white canvas (covers screen with dark overlay) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Transparent hole cutout over the target element */}
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Dark backdrop with mask applied */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(8, 15, 25, 0.72)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Target Focus Ring & Pulse */}
      {targetRect && (
        <div
          className="fixed pointer-events-none transition-all duration-300 ease-out z-[251] rounded-2xl ring-4 ring-[#0E7850] ring-offset-2 ring-offset-transparent shadow-[0_0_30px_rgba(14,120,80,0.45)]"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        >
          <span className="absolute -top-3 -right-3 flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-6 w-6 bg-[#0E7850] text-[11px] font-black text-white items-center justify-center shadow-md">
              {currentStep.stepNumber}
            </span>
          </span>
        </div>
      )}

      {/* Floating Anchored Card */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        key={currentStep.id}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="fixed z-[255] w-[calc(100vw-32px)] max-w-[420px] bg-white rounded-3xl shadow-2xl border border-gray-150 overflow-hidden flex flex-col pointer-events-auto"
        style={{
          top: cardPosition.top,
          left: cardPosition.left,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-gray-50/50">
          <div className="flex items-center gap-2">
            <LocalLogo type="green" className="h-4 w-auto object-contain" />
            <div className="h-3.5 w-[1px] bg-gray-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0E7850]">
              Spotlight Tour
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {currentStepIndex + 1} / {SPOTLIGHT_STEPS.length}
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Close Spotlight Tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-3.5">
          {/* Step Title & Icon */}
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl ${currentStep.accentBg} flex items-center justify-center shrink-0 shadow-xs border border-gray-100`}>
              {currentStep.icon}
            </div>
            <div>
              <span className={`text-[10px] font-black uppercase tracking-wider ${currentStep.accentText} block mb-0.5`}>
                {currentStep.badge}
              </span>
              <h3 className="text-base font-black text-gray-900 tracking-tight leading-tight">
                {currentStep.title}
              </h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-gray-600 font-medium leading-relaxed">
            {currentStep.description}
          </p>

          {/* Key Rule Box */}
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-150/80 text-[11px] text-gray-800 font-semibold flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0E7850] mt-1.5 shrink-0" />
            <span>{currentStep.keyRule}</span>
          </div>

          {/* Pro-Tip Box */}
          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-950 font-medium flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <span className="font-bold text-amber-900">Pro-Tip:</span> {currentStep.proTip}
            </p>
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-2">
          {onOpenCoachGuide ? (
            <button
              type="button"
              onClick={handleOpenGuideFromTour}
              className="text-[11px] font-bold text-gray-500 hover:text-[#0E7850] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Open Guide</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDismiss}
              className="text-[11px] font-bold text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              Skip
            </button>
          )}

          {/* Step Dots */}
          <div className="flex items-center gap-1">
            {SPOTLIGHT_STEPS.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex 
                    ? 'w-4 bg-[#0E7850]' 
                    : idx < currentStepIndex 
                      ? 'w-1.5 bg-emerald-300' 
                      : 'w-1.5 bg-gray-200 hover:bg-gray-300'
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Next / Back */}
          <div className="flex items-center gap-1.5">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handleBack}
                className="px-2.5 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="px-3.5 py-1.5 bg-[#0E7850] hover:bg-[#0b5d3e] text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1"
            >
              <span>{isLastStep ? "Done" : "Next"}</span>
              {!isLastStep && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SprintSpotlightTour;
