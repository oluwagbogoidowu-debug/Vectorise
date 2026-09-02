import React, { useState } from 'react';
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
  Sparkles, 
  Zap,
  Info,
  Check,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LocalLogo from './LocalLogo';

export interface GuideSection {
  id: string;
  stepNumber: number;
  shortLabel: string;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ReactNode;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  purpose: string;
  whatToFillIn: React.ReactNode;
  proTip: string;
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'insight',
    stepNumber: 1,
    shortLabel: "1. Insight",
    title: "Today's Insight",
    subtitle: "Set the thinking and context before action.",
    badge: "01 · Context & Thinking",
    icon: <Lightbulb className="w-5 h-5 text-amber-500" />,
    accentBg: "bg-amber-50",
    accentText: "text-amber-700",
    accentBorder: "border-amber-200",
    purpose: "Prime participants mentally with the core concept or perspective shift behind today's Move.",
    whatToFillIn: (
      <ul className="space-y-1 text-xs text-gray-700">
        <li className="flex items-start gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
          <span>Write a concise lesson, relatable scenario, or mental model.</span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
          <span>Keep it focused on <strong>one clear takeaway</strong> before introducing action.</span>
        </li>
      </ul>
    ),
    proTip: "Short, impactful insights drive higher completion rates than long articles."
  },
  {
    id: 'action-steps',
    stepNumber: 2,
    shortLabel: "2. Actions",
    title: "Action Steps",
    subtitle: "Turn understanding into practical execution.",
    badge: "02 · Practical Moves",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    accentBg: "bg-emerald-50",
    accentText: "text-emerald-700",
    accentBorder: "border-emerald-200",
    purpose: "Define what the participant must actually do to practice and advance today's Move.",
    whatToFillIn: (
      <ul className="space-y-1 text-xs text-gray-700">
        <li className="flex items-start gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
          <span>Every Move requires a <strong>minimum of 3 distinct action steps</strong>.</span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
          <span>Provide specific, direct instructions (e.g. <em>"List 3 bottlenecks"</em>).</span>
        </li>
      </ul>
    ),
    proTip: "Use 'Smart Setup' to paste bulk outlines and auto-assign steps in seconds."
  },
  {
    id: 'input-type',
    stepNumber: 3,
    shortLabel: "3. Inputs",
    title: "Input Selection",
    subtitle: "Capture meaningful participant output.",
    badge: "03 · Output Format",
    icon: <TextCursorInput className="w-5 h-5 text-blue-600" />,
    accentBg: "bg-blue-50",
    accentText: "text-blue-700",
    accentBorder: "border-blue-200",
    purpose: "Choose the response format best suited for each action step.",
    whatToFillIn: (
      <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
        <div className="p-2 bg-white rounded-xl border border-gray-200 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          <span className="text-gray-800"><strong>Text:</strong> Written reflections</span>
        </div>
        <div className="p-2 bg-white rounded-xl border border-gray-200 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
          <span className="text-gray-800"><strong>Tags:</strong> Categorization</span>
        </div>
        <div className="p-2 bg-white rounded-xl border border-gray-200 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
          <span className="text-gray-800"><strong>Poll:</strong> Multiple choice</span>
        </div>
        <div className="p-2 bg-white rounded-xl border border-gray-200 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-gray-800"><strong>Mark:</strong> Check completion</span>
        </div>
      </div>
    ),
    proTip: "Poll and Tag choices can dynamically branch into subsequent questions."
  },
  {
    id: 'dynamic-logic',
    stepNumber: 4,
    shortLabel: "4. Logic",
    title: "Dynamic Logic & Branching",
    subtitle: "Personalize the journey based on answers.",
    badge: "04 · Adaptive Journeys",
    icon: <GitFork className="w-5 h-5 text-purple-600" />,
    accentBg: "bg-purple-50",
    accentText: "text-purple-700",
    accentBorder: "border-purple-200",
    purpose: "Pipe previous answers or tags directly into future prompts and branch based on decisions.",
    whatToFillIn: (
      <ul className="space-y-1 text-xs text-gray-700">
        <li className="flex items-start gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
          <span>Insert placeholders like <code className="bg-purple-100 text-purple-800 font-mono px-1 rounded text-[11px] font-bold">&#123;Step 1&#125;</code> in prompts.</span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
          <span>Connect <strong>Poll → Poll</strong> or <strong>Poll → Tag</strong> using the link icons.</span>
        </li>
      </ul>
    ),
    proTip: "Use sub-tabs (+ 1 2) to write tailored feedback for each poll answer."
  },
  {
    id: 'bridge-note',
    stepNumber: 5,
    shortLabel: "5. Bridge",
    title: "Bridge Note",
    subtitle: "Connect today's win smoothly to tomorrow.",
    badge: "05 · Daily Continuity",
    icon: <ArrowRight className="w-5 h-5 text-teal-600" />,
    accentBg: "bg-teal-50",
    accentText: "text-teal-700",
    accentBorder: "border-teal-200",
    purpose: "Displayed on the celebration screen when a participant finishes today's Move.",
    whatToFillIn: (
      <ul className="space-y-1 text-xs text-gray-700">
        <li className="flex items-start gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
          <span>Write 1–2 sentences acknowledging today's win and previewing the next Move.</span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
          <span>Maintains momentum and sets clear expectations for tomorrow.</span>
        </li>
      </ul>
    ),
    proTip: "Dynamic tokens (e.g. {Step 1}) can be used inside the Bridge Note too."
  },
  {
    id: 'kebab-menu',
    stepNumber: 6,
    shortLabel: "6. Tools",
    title: "⋮ Menu & Settings",
    subtitle: "Access versioning, settings, and coach guides.",
    badge: "06 · Builder Utilities",
    icon: <MoreVertical className="w-5 h-5 text-indigo-600" />,
    accentBg: "bg-indigo-50",
    accentText: "text-indigo-700",
    accentBorder: "border-indigo-200",
    purpose: "Access builder options and configurations without workspace clutter.",
    whatToFillIn: (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="p-2 bg-white rounded-xl border border-gray-200 space-y-0.5">
          <p className="font-bold text-gray-900">Coach Guide</p>
          <p className="text-[11px] text-gray-500">Curriculum handbook</p>
        </div>
        <div className="p-2 bg-white rounded-xl border border-gray-200 space-y-0.5">
          <p className="font-bold text-gray-900">Spotlight Tour</p>
          <p className="text-[11px] text-gray-500">Interactive walkthrough</p>
        </div>
        <div className="p-2 bg-white rounded-xl border border-gray-200 space-y-0.5">
          <p className="font-bold text-gray-900">Sprint Settings</p>
          <p className="text-[11px] text-gray-500">Pricing, tags & access</p>
        </div>
      </div>
    ),
    proTip: "Open the ⋮ menu at the top-right whenever you need to adjust sprint metadata."
  },
  {
    id: 'preview',
    stepNumber: 7,
    shortLabel: "7. Preview",
    title: "Preview & Simulation",
    subtitle: "Experience the sprint as participants will.",
    badge: "07 · Participant Simulation",
    icon: <Eye className="w-5 h-5 text-cyan-600" />,
    accentBg: "bg-cyan-50",
    accentText: "text-cyan-700",
    accentBorder: "border-cyan-200",
    purpose: "Launch a real-time simulation with full animations, timer logic, and dynamic paths.",
    whatToFillIn: (
      <ul className="space-y-1 text-xs text-gray-700">
        <li className="flex items-start gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
          <span>Click the <strong>eye icon</strong> in the header bar anytime.</span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
          <span>Test multiple branch scenarios and answer choices to verify flow.</span>
        </li>
      </ul>
    ),
    proTip: "Always test both standard and alternative branch paths before publishing."
  },
  {
    id: 'save-submit',
    stepNumber: 8,
    shortLabel: "8. Publish",
    title: "Save & Submit for Review",
    subtitle: "Persist your draft and request publication.",
    badge: "08 · Publishing",
    icon: <Send className="w-5 h-5 text-emerald-700" />,
    accentBg: "bg-emerald-50",
    accentText: "text-emerald-800",
    accentBorder: "border-emerald-200",
    purpose: "Persist your progress safely and submit completed sprints for admin approval.",
    whatToFillIn: (
      <ul className="space-y-1 text-xs text-gray-700">
        <li className="flex items-start gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
          <span><strong>Save Draft:</strong> Saves your current work without publishing.</span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
          <span><strong>Submit for Review:</strong> Sends the completed sprint for verification.</span>
        </li>
      </ul>
    ),
    proTip: "Once approved by the Vectorise Admin, your sprint will be ready for participants!"
  }
];

interface CoachGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSpotlightTour?: () => void;
}

export const CoachGuideModal: React.FC<CoachGuideModalProps> = ({
  isOpen,
  onClose,
  onStartSpotlightTour
}) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  if (!isOpen) return null;

  const currentSection = GUIDE_SECTIONS[currentSectionIndex] || GUIDE_SECTIONS[0];

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none animate-fade-in">
      <div 
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-150 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50/80 via-white to-gray-50/40">
          <div className="flex items-center gap-2.5">
            <LocalLogo type="green" className="h-5 w-auto object-contain" />
            <div className="h-4 w-[1px] bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#0E7850]" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0E7850]">
                Coach Guide & Curriculum Rules
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            title="Close Guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Selector Pills */}
        <div className="px-6 py-2.5 bg-gray-50/70 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {GUIDE_SECTIONS.map((section, idx) => {
            const isActive = idx === currentSectionIndex;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setCurrentSectionIndex(idx)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                  isActive
                    ? 'bg-[#0E7850] text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-100/80'
                }`}
              >
                <span>{section.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 max-h-[calc(90vh-180px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSection.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="space-y-4"
            >
              {/* Header */}
              <div className="flex items-start gap-3.5">
                <div className={`w-11 h-11 rounded-2xl ${currentSection.accentBg} border ${currentSection.accentBorder} flex items-center justify-center shrink-0 shadow-xs`}>
                  {currentSection.icon}
                </div>
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${currentSection.accentText} block mb-0.5`}>
                    {currentSection.badge}
                  </span>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight leading-tight">
                    {currentSection.title}
                  </h3>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">
                    {currentSection.subtitle}
                  </p>
                </div>
              </div>

              {/* Purpose */}
              <div className="bg-gray-50/90 p-3.5 rounded-2xl border border-gray-100 space-y-1">
                <div className="flex items-center gap-1.5 text-gray-800 text-[10px] font-black uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  <span>Purpose</span>
                </div>
                <p className="text-xs text-gray-700 font-medium leading-relaxed">
                  {currentSection.purpose}
                </p>
              </div>

              {/* Requirements */}
              <div className="bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-100/70 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-900 text-[10px] font-black uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5 text-[#0E7850]" />
                  <span>Key Points & Requirements</span>
                </div>
                <div>
                  {currentSection.whatToFillIn}
                </div>
              </div>

              {/* Pro Tip */}
              <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200/70 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-amber-950/85 leading-snug">
                  <span className="font-black text-amber-900">Pro-Tip:</span> {currentSection.proTip}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-150 bg-white flex items-center justify-between gap-3">
          {onStartSpotlightTour ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartSpotlightTour();
              }}
              className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-[#0E7850] bg-gray-50 hover:bg-emerald-50/60 rounded-xl border border-gray-200 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Launch Spotlight Tour</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-[#0E7850] hover:bg-[#0b5d3e] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachGuideModal;
