import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Copy, Check, StickyNote, RotateCcw, Send, Loader2, BookOpen, Lightbulb, Compass, AlertCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import FormattedText from './FormattedText';

export interface AiResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprintTitle?: string;
  sprintKey?: string;
  sprintDescription?: string;
  sprintOutcomes?: string[];
  category?: string;
  totalMoves?: number;
  dailyContent?: any[];
  moveDay: number;
  stepIndex: number;
  stepPrompt?: string;
  footnote?: string;
  askAiGuidance?: string;
  userAnswer?: string;
  onSaveToNote?: (noteText: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export const AiResearchModal: React.FC<AiResearchModalProps> = ({
  isOpen,
  onClose,
  sprintTitle = 'Sprint',
  sprintKey = 'default',
  sprintDescription = '',
  sprintOutcomes = [],
  category = '',
  totalMoves,
  dailyContent = [],
  moveDay,
  stepIndex,
  stepPrompt = '',
  footnote = '',
  askAiGuidance = '',
  userAnswer = '',
  onSaveToNote,
  onLoadingChange,
}) => {
  const [researchText, setResearchText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [savedToNote, setSavedToNote] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [feedbackState, setFeedbackState] = useState<'up' | 'down' | null>(null);
  const [feedbackComment, setFeedbackComment] = useState<string>('');

  const promptKeyPart = stepPrompt ? stepPrompt.trim().replace(/\s+/g, ' ').slice(0, 40) : '';
  const storageKey = `ai_research_${sprintKey}_day_${moveDay}_step_${stepIndex}_${promptKeyPart ? encodeURIComponent(promptKeyPart) : 'v1'}`;

  // Load cached research for this step when opened
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCustomQuery('');
      setCopied(false);
      setSavedToNote(false);
      try {
        const cached = localStorage.getItem(storageKey);
        // If cached research mentions raw unresolved template tags like "{Step 1}", ignore it to ensure fresh research
        if (cached && !/\{(?:\s*[dDmM](?:ay|ove)?\s*\d+\s+)?\s*[sS]?tep\s*\d+[^}]*\}/i.test(cached)) {
          setResearchText(cached);
        } else {
          setResearchText('');
        }
      } catch (e) {
        setResearchText('');
      }

      // Load cached rating feedback
      try {
        const cachedFeedback = localStorage.getItem(`ai_feedback_${sprintKey}_day_${moveDay}_step_${stepIndex}`);
        setFeedbackState(cachedFeedback as 'up' | 'down' | null);
        const cachedComment = localStorage.getItem(`ai_feedback_comment_${sprintKey}_day_${moveDay}_step_${stepIndex}`) || '';
        setFeedbackComment(cachedComment);
      } catch (e) {
        setFeedbackState(null);
        setFeedbackComment('');
      }
    }
  }, [isOpen, storageKey, sprintKey, moveDay, stepIndex]);

  // Cleanup loading state on close or unmount
  useEffect(() => {
    return () => {
      onLoadingChange?.(false);
    };
  }, [onLoadingChange]);

  if (!isOpen) return null;

  const handleRunResearch = async (presetOrPrompt?: string, isCustom = false) => {
    const promptToSend = isCustom ? customQuery.trim() : (presetOrPrompt || '');
    if (isCustom && !promptToSend) return;

    setIsLoading(true);
    onLoadingChange?.(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: sprintTitle,
          sprintDescription,
          sprintOutcomes,
          category,
          totalMoves,
          dailyContent,
          moveDay,
          stepIndex,
          stepPrompt,
          footnote,
          askAiGuidance,
          userAnswer,
          preset: !isCustom ? presetOrPrompt : undefined,
          prompt: isCustom ? promptToSend : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete AI research.');
      }

      const generated = data.research || '';
      setResearchText(generated);
      try {
        localStorage.setItem(storageKey, generated);
      } catch (e) {}

      if (isCustom) setCustomQuery('');

      // Auto scroll to top of research output
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('[AiResearchModal] Error:', err);
      setError(err?.message || 'Unable to connect to Gemini AI. Please try again.');
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleCopy = () => {
    if (!researchText) return;
    navigator.clipboard.writeText(researchText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToNote = () => {
    if (!researchText) return;
    const noteStorageKey = `express_note_${sprintKey}_day_${moveDay}_step_${stepIndex}`;
    try {
      const existing = localStorage.getItem(noteStorageKey) || '';
      const separator = existing.trim() ? '\n\n---\n\n📝 AI Research Insights:\n' : '📝 AI Research Insights:\n';
      const updated = existing ? `${existing}${separator}${researchText}` : researchText;
      localStorage.setItem(noteStorageKey, updated);
      if (onSaveToNote) {
        onSaveToNote(updated);
      }
      setSavedToNote(true);
      setTimeout(() => setSavedToNote(false), 2500);
    } catch (e) {
      console.error('Failed to save to note:', e);
    }
  };

  const handleSaveFeedback = async (rating: 'up' | 'down') => {
    setFeedbackState(rating);
    try {
      localStorage.setItem(`ai_feedback_${sprintKey}_day_${moveDay}_step_${stepIndex}`, rating);
    } catch (e) {}
  };

  const saveFeedbackComment = (comment: string) => {
    try {
      localStorage.setItem(`ai_feedback_comment_${sprintKey}_day_${moveDay}_step_${stepIndex}`, comment);
    } catch (e) {}
  };

  const handleClear = () => {
    setResearchText('');
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {}
  };

  return (
    <div className="fixed inset-0 z-[250] bg-white dark:bg-zinc-950 flex flex-col p-5 sm:p-10 md:p-12 animate-fade-in text-left overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-4 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs border border-purple-200/60 dark:border-purple-800/50">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-purple-700 dark:text-purple-400">
                AI / Research
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {researchText && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-xs"
                title="Copy research"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveToNote}
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 border border-amber-200/80 shadow-xs"
                title="Save into step notes"
              >
                {savedToNote ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <StickyNote className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{savedToNote ? 'Saved to Note' : 'Add to Note'}</span>
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                title="Restart / Clear research"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-500 dark:text-gray-300 transition-all cursor-pointer active:scale-95 flex items-center justify-center ml-1"
            title="Close AI / Research"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Step Context Banner */}
      {stepPrompt && (
        <div className="mb-4 px-4 py-3 bg-gray-50/80 dark:bg-zinc-900/60 rounded-2xl border border-gray-100 dark:border-zinc-800 text-left shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0E7850]">
              Action Step {stepIndex + 1}
            </span>
            {userAnswer && (
              <span className="text-[10px] text-gray-400 font-medium">
                • Has user response
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-zinc-100 line-clamp-2">
            {stepPrompt}
          </p>
        </div>
      )}

      {/* Quick Research Starters (Chips) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 shrink-0 scrollbar-none">
        <button
          type="button"
          disabled={isLoading}
          onClick={() => handleRunResearch('explain_this')}
          className="px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-xs font-bold border border-purple-200/70 dark:border-purple-800/40 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <BookOpen className="w-3.5 h-3.5 text-purple-600" />
          <span>Explain this</span>
        </button>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => handleRunResearch('examples')}
          className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200/70 dark:border-emerald-800/40 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
          <span>Give me examples</span>
        </button>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => handleRunResearch('research_this')}
          className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-xs font-bold border border-blue-200/70 dark:border-blue-800/40 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Compass className="w-3.5 h-3.5 text-blue-600" />
          <span>Research this</span>
        </button>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => handleRunResearch('improve_my_answer')}
          className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200/70 dark:border-amber-800/40 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Improve my answer</span>
        </button>
      </div>

      {/* Main Workspace / Research Output Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto my-2 pr-1 w-full max-w-4xl mx-auto flex flex-col justify-start"
      >
        {isLoading ? (
          <div className="my-auto py-16 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center border border-purple-200 dark:border-purple-800 shadow-md">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <div>
              <p className="text-base font-black text-gray-900 dark:text-zinc-100 tracking-tight">
                Gemini is Synthesizing Research...
              </p>
              <p className="text-xs text-gray-400 font-medium mt-1 max-w-sm mx-auto">
                Analyzing action step context, frameworks, and practical execution strategies.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="my-auto p-6 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-left space-y-2">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Research Generation Error</span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => handleRunResearch('deep_dive')}
              className="mt-2 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
            >
              Retry Research
            </button>
          </div>
        ) : researchText ? (
          <div className="py-4 space-y-4">
            <div className="bg-gray-50/50 dark:bg-zinc-900/30 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-zinc-800 text-gray-800 dark:text-zinc-200">
              <FormattedText text={researchText} className="text-sm sm:text-base leading-relaxed" />
            </div>

            {/* Thumbs Up / Thumbs Down Feedback Mechanism */}
            <div className="p-5 bg-purple-50/40 dark:bg-purple-950/10 rounded-3xl border border-purple-100/50 dark:border-purple-900/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-zinc-100 uppercase tracking-wider">
                  Was this research helpful?
                </h4>
                <p className="text-[11px] text-gray-500 mt-1">
                  Your rating directly helps fine-tune our personal growth models.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveFeedback('up')}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-bold ${
                    feedbackState === 'up'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/80 shadow-xs'
                      : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:border-zinc-800 dark:text-zinc-300'
                  }`}
                  title="Thumbs Up - Helpful"
                >
                  <ThumbsUp className={`w-4 h-4 ${feedbackState === 'up' ? 'fill-emerald-600 dark:fill-emerald-400' : ''}`} />
                  <span>Helpful</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveFeedback('down')}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-bold ${
                    feedbackState === 'down'
                      ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/80 shadow-xs'
                      : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:border-zinc-800 dark:text-zinc-300'
                  }`}
                  title="Thumbs Down - Unhelpful"
                >
                  <ThumbsDown className={`w-4 h-4 ${feedbackState === 'down' ? 'fill-rose-600 dark:fill-rose-400' : ''}`} />
                  <span>Unhelpful</span>
                </button>
              </div>
            </div>

            {feedbackState === 'down' && (
              <div className="p-5 bg-gray-50 dark:bg-zinc-900/60 rounded-3xl border border-gray-100 dark:border-zinc-800 space-y-3 animate-fade-in">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                  What could be improved? (Optional)
                </label>
                <textarea
                  value={feedbackComment}
                  onChange={(e) => {
                    setFeedbackComment(e.target.value);
                    saveFeedbackComment(e.target.value);
                  }}
                  placeholder="Too generic, lacked actionable steps, not enough examples, wrong context, etc..."
                  className="w-full p-3 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  rows={2}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="my-auto py-16 flex flex-col items-center justify-center text-center space-y-4 text-gray-400">
            <div className="w-16 h-16 rounded-3xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-800/40 shadow-xs">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-zinc-100">
                What do you need help with?
              </h3>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Query & Exploration Bar */}
      <div className="shrink-0 pt-3 border-t border-gray-100 dark:border-zinc-800 w-full max-w-4xl mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunResearch(customQuery, true);
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Ask anything about this step..."
              disabled={isLoading}
              className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
            {customQuery && (
              <button
                type="button"
                onClick={() => setCustomQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || !customQuery.trim()}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
              customQuery.trim() && !isLoading
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg active:scale-95 cursor-pointer'
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed'
            }`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Research</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AiResearchModal;
