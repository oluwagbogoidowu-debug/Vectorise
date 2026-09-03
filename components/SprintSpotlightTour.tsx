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
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

export interface SpotlightStep {
  id: string;
  targetId: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ReactNode;
  accentBg: string;
  accentText: string;
  body: string;
  detail?: React.ReactNode;
  preferredPlacement?: 'top' | 'bottom' | 'auto';
}

export const SPOTLIGHT_STEPS: SpotlightStep[] = [
  {
    id: 'insight',
    targetId: 'tour-step-insight',
    stepNumber: 1,
    title: "Today's Insight",
    subtitle: "Set the thinking before the action.",
    badge: "01 · Thinking",
    icon: <Lightbulb className="w-4 h-4 text-amber-500" />,
    accentBg: "bg-amber-50",
    accentText: "text-amber-700",
    body: "Give the participant the key idea they need to understand before taking action.",
    detail: (
      <p className="text-[11px] text-gray-600 leading-relaxed font-normal">
        Use a story, example, tension, perspective shift, or explanation when it helps. You don't need all of them.
      </p>
    ),
    preferredPlacement: 'bottom'
  },
  {
    id: 'action-steps',
    targetId: 'tour-step-action-steps',
    stepNumber: 2,
    title: "Action Steps",
    subtitle: "Turn understanding into action.",
    badge: "02 · Action",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    accentBg: "bg-emerald-50",
    accentText: "text-emerald-700",
    body: "Create what the participant will actually do to move the Move forward.",
    detail: (
      <p className="text-[11px] text-gray-600 leading-relaxed font-normal">
        Keep the action connected to the Insight and the outcome of the Move.
      </p>
    ),
    preferredPlacement: 'bottom'
  },
  {
    id: 'input-type',
    targetId: 'tour-step-input-type',
    stepNumber: 3,
    title: "Input",
    subtitle: "Capture what matters.",
    badge: "03 · Input",
    icon: <TextCursorInput className="w-4 h-4 text-blue-600" />,
    accentBg: "bg-blue-50",
    accentText: "text-blue-700",
    body: "Choose what the participant should provide after completing the action.",
    detail: (
      <p className="text-[11px] text-gray-600 leading-relaxed font-normal">
        This could be a choice, written response, number, tag, upload, link, or another useful output.
      </p>
    ),
    preferredPlacement: 'top'
  },
  {
    id: 'dynamic-logic',
    targetId: 'tour-step-dynamic-logic',
    stepNumber: 4,
    title: "Dynamic Logic",
    subtitle: "Let the Sprint respond to the participant.",
    badge: "04 · Logic",
    icon: <GitFork className="w-4 h-4 text-purple-600" />,
    accentBg: "bg-purple-50",
    accentText: "text-purple-700",
    body: "Use a participant's response to influence what they see or do next.",
    detail: (
      <p className="text-[11px] text-gray-600 leading-relaxed font-normal">
        For example, a choice can determine the next question, tag, input, or path.
      </p>
    ),
    preferredPlacement: 'top'
  },
  {
    id: 'bridge-note',
    targetId: 'tour-step-bridge-note',
    stepNumber: 5,
    title: "Bridge Note",
    subtitle: "Connect one Move to the next.",
    badge: "05 · Bridge",
    icon: <ArrowRight className="w-4 h-4 text-teal-600" />,
    accentBg: "bg-teal-50",
    accentText: "text-teal-700",
    body: "Acknowledge what the participant just discovered, decided, or accomplished, then connect it naturally to what's coming next.",
    detail: (
      <p className="text-[11px] text-gray-600 leading-relaxed font-normal">
        Use it to create continuity, reinforce learning, or build anticipation.
      </p>
    ),
    preferredPlacement: 'top'
  },
  {
    id: 'kebab-menu',
    targetId: 'tour-step-kebab-menu',
    stepNumber: 6,
    title: "⋮ Menu",
    subtitle: "Access tools beyond the main builder.",
    badge: "06 · Menu",
    icon: <MoreVertical className="w-4 h-4 text-indigo-600" />,
    accentBg: "bg-indigo-50",
    accentText: "text-indigo-700",
    body: "Open the menu for deeper guidance and Sprint management tools.",
    detail: (
      <div className="space-y-1 text-[11px] text-gray-700 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
          <span><strong>Coach Guide</strong> → Learn how to build each part of a Sprint.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
          <span><strong>Sprint Versioning</strong> → Manage different versions.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
          <span><strong>Sprint Settings</strong> → Manage your Sprint configuration.</span>
        </div>
      </div>
    ),
    preferredPlacement: 'bottom'
  },
  {
    id: 'preview',
    targetId: 'tour-step-preview',
    stepNumber: 7,
    title: "Preview",
    subtitle: "Experience the Sprint as your participant will.",
    badge: "07 · Preview",
    icon: <Eye className="w-4 h-4 text-cyan-600" />,
    accentBg: "bg-cyan-50",
    accentText: "text-cyan-700",
    body: "Preview the complete experience before submitting it.",
    detail: (
      <p className="text-[11px] text-gray-600 leading-relaxed font-normal">
        Check that the Insight, Actions, Inputs, Dynamic Logic, and Bridge Notes work together and lead toward the intended outcome.
      </p>
    ),
    preferredPlacement: 'bottom'
  },
  {
    id: 'save-submit',
    targetId: 'tour-step-save-submit',
    stepNumber: 8,
    title: "Save / Submit",
    subtitle: "Finish and manage your Sprint.",
    badge: "08 · Save / Submit",
    icon: <Send className="w-4 h-4 text-emerald-700" />,
    accentBg: "bg-emerald-50",
    accentText: "text-emerald-800",
    body: "Save your progress and continue editing later.",
    detail: (
      <div className="space-y-1.5 text-[11px] text-gray-700">
        <p className="font-medium text-gray-800">
          Submit for Approval when the Sprint is complete and ready for review.
        </p>
        <p className="text-gray-500">
          Once submitted, it enters the approval process.
        </p>
      </div>
    ),
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

  const cardRef = useRef<HTMLDivElement>(null);
  const currentStep = SPOTLIGHT_STEPS[currentStepIndex] || SPOTLIGHT_STEPS[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === SPOTLIGHT_STEPS.length - 1;

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
        const cardHeight = 290;
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
    const handleResize = () => {
      if (isOpen) {
        updateTargetBounds();
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
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
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed z-[255] w-[calc(100vw-32px)] max-w-[420px] bg-white rounded-3xl shadow-2xl border border-gray-150 overflow-hidden flex flex-col pointer-events-auto"
        style={{
          top: cardPosition.top,
          left: cardPosition.left,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
          <span className="text-[11px] font-black text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
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

        {/* Card Body */}
        <div className="p-5 space-y-3">
          {/* Step Title & Subtitle */}
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl ${currentStep.accentBg} flex items-center justify-center shrink-0 shadow-xs border border-gray-100`}>
              {currentStep.icon}
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 tracking-tight leading-tight">
                {currentStep.title}
              </h3>
              <p className="text-xs font-bold text-[#0E7850] mt-0.5">
                {currentStep.subtitle}
              </p>
            </div>
          </div>

          {/* Body Description */}
          <p className="text-xs text-gray-700 font-medium leading-relaxed">
            {currentStep.body}
          </p>

          {/* Details / Guidance */}
          {currentStep.detail && (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-150/80">
              {currentStep.detail}
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-[11px] font-bold text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            Skip
          </button>

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
