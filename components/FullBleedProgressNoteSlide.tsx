import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ChevronDown, Sparkles, X } from 'lucide-react';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

interface FullBleedProgressNoteSlideProps {
  isOpen: boolean;
  day: number;
  noteText: string;
  onContinue: () => void;
  isCoachPreview?: boolean;
  onExitPreview?: () => void;
}

interface ParsedAccordionSection {
  number: string;
  title: string;
  bodyLines: string[];
}

interface ParsedProgressNote {
  headerLines: string[];
  sections: ParsedAccordionSection[];
}

const parseProgressNoteSections = (rawText: string): ParsedProgressNote => {
  const lines = rawText.split(/\r?\n/);
  const headerLines: string[] = [];
  const sections: ParsedAccordionSection[] = [];
  let currentSection: ParsedAccordionSection | null = null;

  const headingRegex = /^\s*(0?\d{1,2})[.\):]\s+(.+?)\s*$/;

  for (const line of lines) {
    const match = line.match(headingRegex);
    if (match) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        number: match[1],
        title: match[2].trim(),
        bodyLines: [],
      };
    } else if (currentSection) {
      currentSection.bodyLines.push(line);
    } else {
      headerLines.push(line);
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  // Trim leading/trailing empty lines from header and each section body
  const trimBlankEdges = (arr: string[]) => {
    let start = 0;
    let end = arr.length - 1;
    while (start <= end && !arr[start].trim()) start++;
    while (end >= start && !arr[end].trim()) end--;
    return arr.slice(start, end + 1);
  };

  return {
    headerLines: trimBlankEdges(headerLines),
    sections: sections.map((sec) => ({
      ...sec,
      bodyLines: trimBlankEdges(sec.bodyLines),
    })),
  };
};

export const FullBleedProgressNoteSlide: React.FC<FullBleedProgressNoteSlideProps> = ({
  isOpen,
  day,
  noteText,
  onContinue,
  isCoachPreview,
  onExitPreview,
}) => {
  const [openIndices, setOpenIndices] = useState<Set<number>>(() => new Set([0]));

  const parsed = useMemo(() => parseProgressNoteSections(noteText || ''), [noteText]);
  const hasAccordion = parsed.sections.length > 0;

  useEffect(() => {
    if (isOpen) {
      setOpenIndices(new Set([0]));
    }
  }, [isOpen, noteText]);

  if (!isOpen || !noteText || !noteText.trim()) return null;

  const toggleIndex = (idx: number) => {
    triggerHaptic(hapticPatterns.light);
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const content = (
    <div className="fixed inset-0 z-[120] min-h-[100dvh] w-screen bg-[#FDFDFD] flex flex-col justify-between p-6 md:p-12 overflow-y-auto overflow-x-hidden">
      {/* Background Ambience matching Bridge Card */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[50%] bg-[#0E7850]/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-[#0E7850]/5 rounded-full blur-[120px]" />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 w-full max-w-md mx-auto flex justify-between items-center pt-2 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0E7850]/10 border border-[#0E7850]/20 rounded-full text-[#0E7850]">
          <Sparkles className="w-3.5 h-3.5 text-[#0E7850] animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider">
            Move {day} Progress
          </span>
        </div>

        {isCoachPreview && onExitPreview && (
          <button
            type="button"
            onClick={onExitPreview}
            className="w-9 h-9 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-all cursor-pointer flex items-center justify-center shadow-xs active:scale-95 shrink-0"
            title="Exit Preview"
            aria-label="Exit Preview"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Progress Note Content */}
      <main className="relative z-10 max-w-md w-full mx-auto flex-1 flex flex-col justify-center items-start py-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          className="w-full text-left my-auto py-4"
        >
          {hasAccordion ? (
            <div className="w-full space-y-5">
              {parsed.headerLines.length > 0 && (
                <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-snug whitespace-pre-line">
                  {parsed.headerLines.join('\n')}
                </h2>
              )}

              <div className="w-full bg-white rounded-2xl border border-gray-200/80 divide-y divide-gray-100 overflow-hidden shadow-xs">
                {parsed.sections.map((section, idx) => {
                  const isExpanded = openIndices.has(idx);
                  return (
                    <div key={`${section.number}-${idx}`} className="w-full">
                      <button
                        type="button"
                        onClick={() => toggleIndex(idx)}
                        aria-expanded={isExpanded}
                        className="w-full px-4 sm:px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-gray-50/70 transition-colors cursor-pointer"
                      >
                        <div className="flex items-baseline gap-2.5 min-w-0">
                          <span className="text-xs font-bold text-[#0E7850] tabular-nums shrink-0">
                            {section.number}.
                          </span>
                          <span className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
                            {section.title}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-[#0E7850]' : ''
                          }`}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 sm:px-5 pb-4 pt-0.5 pl-10 sm:pl-11">
                              {section.bodyLines.length > 0 ? (
                                <div className="space-y-1.5 text-sm text-gray-700 font-medium leading-relaxed">
                                  {section.bodyLines.map((line, lIdx) => {
                                    const trimmed = line.trim();
                                    if (!trimmed) {
                                      return <div key={lIdx} className="h-1" />;
                                    }
                                    const isBullet = /^[•\-*]\s+/.test(trimmed);
                                    if (isBullet) {
                                      const cleanText = trimmed.replace(/^[•\-*]\s+/, '');
                                      return (
                                        <div key={lIdx} className="flex items-start gap-2">
                                          <span className="text-[#0E7850] mt-0.5 select-none">•</span>
                                          <span>{cleanText}</span>
                                        </div>
                                      );
                                    }
                                    return (
                                      <p key={lIdx} className="whitespace-pre-line">
                                        {trimmed}
                                      </p>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 italic">No items recorded</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight whitespace-pre-line">
              {noteText}
            </p>
          )}
        </motion.div>
      </main>

      {/* Continue CTA Footer */}
      <footer className="relative z-10 w-full max-w-md mx-auto py-2">
        <motion.button
          type="button"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.45 }}
          onClick={() => {
            triggerHaptic(hapticPatterns.light);
            onContinue();
          }}
          className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-3xl font-black uppercase tracking-[0.15em] text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4 text-white" />
        </motion.button>
      </footer>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
};

export default FullBleedProgressNoteSlide;
