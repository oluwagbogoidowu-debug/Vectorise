import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { ArrowRight, ChevronDown, Download, FileText, Sparkles, X } from 'lucide-react';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import { generateProgressReportDOC, generateProgressReportPDF } from '../utils/pdfGenerator';

interface FullBleedProgressNoteSlideProps {
  isOpen: boolean;
  day: number;
  totalDays?: number;
  sprintTitle?: string;
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
  totalDays,
  sprintTitle,
  noteText,
  onContinue,
  isCoachPreview,
  onExitPreview,
}) => {
  const [openIndices, setOpenIndices] = useState<Set<number>>(() => new Set([0]));
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const parsed = useMemo(() => parseProgressNoteSections(noteText || ''), [noteText]);
  const hasAccordion = parsed.sections.length > 0;
  const isLastMove = typeof totalDays === 'number' && totalDays > 0 && day >= totalDays;

  useEffect(() => {
    if (isOpen) {
      setOpenIndices(new Set([0]));
      setIsDownloadModalOpen(false);
    }
  }, [isOpen, noteText]);

  if (!isOpen || !noteText || !noteText.trim()) return null;

  const handleDownloadFormat = (format: 'doc' | 'pdf') => {
    triggerHaptic(hapticPatterns.light);
    const payload = {
      sprintTitle: sprintTitle?.trim() || 'Sprint',
      day,
      totalDays,
      noteText,
      headerLines: parsed.headerLines,
      sections: parsed.sections,
    };
    if (format === 'pdf') {
      generateProgressReportPDF(payload);
    } else {
      generateProgressReportDOC(payload);
    }
    setIsDownloadModalOpen(false);
  };

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
    <MotionConfig reducedMotion="user">
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
                        <motion.span
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="shrink-0 flex items-center justify-center"
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-colors duration-200 ${
                              isExpanded ? 'text-[#0E7850]' : 'text-gray-400'
                            }`}
                          />
                        </motion.span>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            key={`accordion-panel-${section.number}-${idx}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{
                              height: 'auto',
                              opacity: 1,
                              transition: {
                                height: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                                opacity: { duration: 0.22, ease: 'easeOut', delay: 0.04 },
                              },
                            }}
                            exit={{
                              height: 0,
                              opacity: 0,
                              transition: {
                                height: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
                                opacity: { duration: 0.14, ease: 'easeIn' },
                              },
                            }}
                            className="overflow-hidden"
                          >
                            <motion.div
                              initial={{ y: -6 }}
                              animate={{ y: 0 }}
                              exit={{ y: -6 }}
                              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                              className="px-4 sm:px-5 pb-4 pt-0.5 pl-10 sm:pl-11"
                            >
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
                            </motion.div>
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
        {isLastMove && (
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex justify-end mb-2.5"
          >
            <button
              type="button"
              onClick={() => {
                triggerHaptic(hapticPatterns.light);
                setIsDownloadModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200/90 shadow-2xs transition-all active:scale-95 cursor-pointer max-w-[230px]"
              aria-label={`Download ${sprintTitle || 'Sprint'} Progress report`}
            >
              <Download className="w-3.5 h-3.5 text-[#0E7850] shrink-0" />
              <div className="flex flex-col text-left min-w-0 leading-tight">
                <span className="text-[11px] font-bold text-gray-900 truncate">
                  {sprintTitle || 'Sprint'}
                </span>
                <span className="text-[10px] font-light text-gray-500">
                  Progress report
                </span>
              </div>
            </button>
          </motion.div>
        )}

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

      {/* File Format Selection Modal */}
      <AnimatePresence>
        {isDownloadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[140] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-5"
            onClick={() => setIsDownloadModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs bg-white rounded-3xl border border-gray-100 shadow-2xl p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">
                    {sprintTitle || 'Sprint'}
                  </h3>
                  <p className="text-xs font-light text-gray-500 mt-0.5">
                    Select file format to download progress report
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDownloadModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  aria-label="Close download modal"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleDownloadFormat('doc')}
                  className="flex flex-col items-center justify-center gap-1.5 py-3.5 px-3 rounded-2xl border border-gray-200 hover:border-[#0E7850]/50 hover:bg-[#0E7850]/5 transition-all active:scale-95 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                    DOC
                  </span>
                  <span className="text-[10px] font-light text-gray-500">
                    Word (.doc)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadFormat('pdf')}
                  className="flex flex-col items-center justify-center gap-1.5 py-3.5 px-3 rounded-2xl border border-gray-200 hover:border-[#0E7850]/50 hover:bg-[#0E7850]/5 transition-all active:scale-95 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#0E7850]/10 text-[#0E7850] flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                    PDF
                  </span>
                  <span className="text-[10px] font-light text-gray-500">
                    Document (.pdf)
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
};

export default FullBleedProgressNoteSlide;
