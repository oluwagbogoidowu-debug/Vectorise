import React, { useState, useEffect, useRef } from 'react';
import {
  X, Sparkles, Copy, Check, StickyNote, RotateCcw, Send, Loader2,
  BookOpen, Lightbulb, Compass, AlertCircle, ThumbsUp, ThumbsDown,
  ChevronLeft, ChevronRight, Lock, MessageSquare
} from 'lucide-react';
import FormattedText from './FormattedText';

export interface ResearchMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  preset?: string;
  feedback?: 'up' | 'down' | null;
  feedbackComment?: string;
}

export interface ResearchTab {
  id: number; // 1 to 5
  messages: ResearchMessage[];
}

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

const MAX_TABS = 5;
const MAX_QUESTIONS_PER_TAB = 5;

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
  // Tabs state: exactly 5 tabs (id: 1..5)
  const [tabs, setTabs] = useState<ResearchTab[]>(() =>
    Array.from({ length: MAX_TABS }, (_, i) => ({ id: i + 1, messages: [] }))
  );
  const [activeTab, setActiveTab] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedToNoteId, setSavedToNoteId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const tabsStorageKey = `ai_research_tabs_v3_${sprintKey}_day_${moveDay}_step_${stepIndex}`;

  // Load tabs from storage when opened
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setCustomQuery('');
    setCopiedId(null);
    setSavedToNoteId(null);

    try {
      const stored = localStorage.getItem(tabsStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize to exactly 5 tabs
          const normalized: ResearchTab[] = Array.from({ length: MAX_TABS }, (_, i) => {
            const found = parsed.find((t: any) => t && t.id === i + 1);
            return found || { id: i + 1, messages: [] };
          });
          setTabs(normalized);
          return;
        }
      }

      // Check legacy single-research cache to migrate smoothly
      const legacyStorageKey = `ai_research_${sprintKey}_day_${moveDay}_step_${stepIndex}`;
      const legacyCached = localStorage.getItem(legacyStorageKey);
      const initialTabs: ResearchTab[] = Array.from({ length: MAX_TABS }, (_, i) => ({
        id: i + 1,
        messages: [],
      }));

      if (legacyCached && !/\{(?:\s*[dDmM](?:ay|ove)?\s*\d+\s+)?\s*[sS]?tep\s*\d+[^}]*\}/i.test(legacyCached)) {
        initialTabs[0].messages = [
          {
            id: `u_legacy`,
            role: 'user',
            content: 'Initial Step Research',
            timestamp: Date.now(),
            preset: 'explain_this',
          },
          {
            id: `a_legacy`,
            role: 'assistant',
            content: legacyCached,
            timestamp: Date.now(),
          },
        ];
      }
      setTabs(initialTabs);
    } catch (e) {
      setTabs(Array.from({ length: MAX_TABS }, (_, i) => ({ id: i + 1, messages: [] })));
    }
  }, [isOpen, tabsStorageKey, sprintKey, moveDay, stepIndex]);

  // Persist tabs whenever updated
  const saveTabsState = (newTabs: ResearchTab[]) => {
    setTabs(newTabs);
    try {
      localStorage.setItem(tabsStorageKey, JSON.stringify(newTabs));
    } catch (e) {
      console.error('Failed to save AI research tabs:', e);
    }
  };

  // Cleanup loading state on close or unmount
  useEffect(() => {
    return () => {
      onLoadingChange?.(false);
    };
  }, [onLoadingChange]);

  if (!isOpen) return null;

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];
  const questionCount = currentTab.messages.filter((m) => m.role === 'user').length;
  const isTabLocked = questionCount >= MAX_QUESTIONS_PER_TAB;

  // Run research or follow-up question
  const handleRunResearch = async (presetOrPrompt?: string, isCustom = false) => {
    if (isTabLocked) return;

    const promptToSend = isCustom ? customQuery.trim() : (presetOrPrompt || '');
    if (!promptToSend) return;

    setIsLoading(true);
    onLoadingChange?.(true);
    setError(null);

    const userMessageId = `u_${Date.now()}`;
    const assistantMessageId = `a_${Date.now()}`;

    // Display title for presets
    let displayPrompt = promptToSend;
    if (!isCustom) {
      if (presetOrPrompt === 'explain_this') displayPrompt = 'Explain this action step';
      else if (presetOrPrompt === 'examples') displayPrompt = 'Give me practical examples';
      else if (presetOrPrompt === 'research_this') displayPrompt = 'Research this topic with web sources';
      else if (presetOrPrompt === 'improve_my_answer') displayPrompt = 'Improve my current response';
    }

    const newUserMessage: ResearchMessage = {
      id: userMessageId,
      role: 'user',
      content: displayPrompt,
      timestamp: Date.now(),
      preset: !isCustom ? presetOrPrompt : undefined,
    };

    // Prepare history from existing tab messages
    const historyPayload = currentTab.messages.map((m) => ({
      role: m.role,
      text: m.content,
    }));

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
          history: historyPayload,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete AI research.');
      }

      const generated = data.research || '';
      const newAssistantMessage: ResearchMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: generated,
        timestamp: Date.now(),
        preset: !isCustom ? presetOrPrompt : undefined,
      };

      const updatedTabs = tabs.map((t) => {
        if (t.id === activeTab) {
          return {
            ...t,
            messages: [...t.messages, newUserMessage, newAssistantMessage],
          };
        }
        return t;
      });

      saveTabsState(updatedTabs);
      if (isCustom) setCustomQuery('');

      // Auto scroll down to newly generated content
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 100);
    } catch (err: any) {
      console.error('[AiResearchModal] Error:', err);
      const rawMsg = err?.message || '';
      const isTechOrQuotaError =
        rawMsg.includes('429') ||
        rawMsg.includes('quota') ||
        rawMsg.includes('RESOURCE_EXHAUSTED') ||
        rawMsg.includes('GoogleGenerativeAI') ||
        rawMsg.includes('503');

      const friendlyMsg = isTechOrQuotaError
        ? 'The AI research assistant is currently experiencing high demand. Please tap Try Again in a few moments.'
        : rawMsg || 'The AI research assistant is currently experiencing high demand. Please tap Try Again in a few moments.';

      setError(friendlyMsg);
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveToStepNote = (text: string, id: string) => {
    if (!text) return;
    const noteStorageKey = `express_note_${sprintKey}_day_${moveDay}_step_${stepIndex}`;
    try {
      const existing = localStorage.getItem(noteStorageKey) || '';
      const separator = existing.trim() ? '\n\n---\n\n📝 AI Research Insights:\n' : '📝 AI Research Insights:\n';
      const updated = existing ? `${existing}${separator}${text}` : text;
      localStorage.setItem(noteStorageKey, updated);
      onSaveToNote?.(updated);
      setSavedToNoteId(id);
      setTimeout(() => setSavedToNoteId(null), 2500);
    } catch (e) {
      console.error('Failed to save to note:', e);
    }
  };

  const handleSaveFeedback = (messageId: string, rating: 'up' | 'down') => {
    const updatedTabs = tabs.map((t) => {
      if (t.id === activeTab) {
        return {
          ...t,
          messages: t.messages.map((m) => {
            if (m.id === messageId) {
              return { ...m, feedback: m.feedback === rating ? null : rating };
            }
            return m;
          }),
        };
      }
      return t;
    });
    saveTabsState(updatedTabs);
  };

  const handleSaveFeedbackComment = (messageId: string, comment: string) => {
    const updatedTabs = tabs.map((t) => {
      if (t.id === activeTab) {
        return {
          ...t,
          messages: t.messages.map((m) => {
            if (m.id === messageId) {
              return { ...m, feedbackComment: comment };
            }
            return m;
          }),
        };
      }
      return t;
    });
    saveTabsState(updatedTabs);
  };

  // Restart / Clear the current tab
  const handleClearCurrentTab = () => {
    const updatedTabs = tabs.map((t) => {
      if (t.id === activeTab) {
        return { ...t, messages: [] };
      }
      return t;
    });
    saveTabsState(updatedTabs);
    setError(null);
  };

  // Aggregate text for Copy All / Add All
  const fullTabTranscript = currentTab.messages
    .filter((m) => m.role === 'assistant')
    .map((m) => m.content)
    .join('\n\n---\n\n');

  // Render CoachParticipant-style Pagination Component
  const renderPaginationBar = (extraClass = '') => {
    const canGoLeft = activeTab > 1;
    const canGoRight = activeTab < MAX_TABS;

    return (
      <div className={`flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-900 p-1 border border-gray-200 dark:border-zinc-800 rounded-xl select-none ${extraClass}`}>
        {/* Left Arrow */}
        <button
          type="button"
          disabled={!canGoLeft}
          onClick={() => setActiveTab((prev) => Math.max(1, prev - 1))}
          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
            canGoLeft
              ? 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200/60 dark:border-zinc-700 cursor-pointer'
              : 'opacity-30 cursor-not-allowed text-gray-400 bg-white/50 dark:bg-zinc-900'
          }`}
          title="Previous tab"
          aria-label="Previous tab"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* 1 2 3 4 5 Numbers */}
        {[1, 2, 3, 4, 5].map((tabNum) => {
          const isCurrentActiveStep = activeTab === tabNum;
          const tabData = tabs[tabNum - 1];
          const hasData = tabData && tabData.messages && tabData.messages.length > 0;
          const qCount = tabData ? tabData.messages.filter((m) => m.role === 'user').length : 0;
          const isLocked = qCount >= MAX_QUESTIONS_PER_TAB;

          return (
            <button
              key={tabNum}
              type="button"
              onClick={() => setActiveTab(tabNum)}
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-black transition-all select-none cursor-pointer relative ${
                isCurrentActiveStep
                  ? 'bg-[#0E7850] text-white shadow-xs scale-105'
                  : hasData
                  ? 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200/60 dark:border-zinc-700'
                  : 'bg-white/60 dark:bg-zinc-900/60 text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-dashed border-gray-200 dark:border-zinc-800'
              }`}
              title={`Search Tab ${tabNum}${hasData ? ` (${qCount}/5 questions)` : ' (Empty)'}`}
            >
              {tabNum}
              {hasData && !isCurrentActiveStep && !isLocked && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#0E7850]" />
              )}
              {isLocked && !isCurrentActiveStep && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}

        {/* Right Arrow */}
        <button
          type="button"
          disabled={!canGoRight}
          onClick={() => setActiveTab((prev) => Math.min(MAX_TABS, prev + 1))}
          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
            canGoRight
              ? 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200/60 dark:border-zinc-700 cursor-pointer'
              : 'opacity-30 cursor-not-allowed text-gray-400 bg-white/50 dark:bg-zinc-900'
          }`}
          title="Next tab"
          aria-label="Next tab"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[250] bg-white dark:bg-zinc-950 flex flex-col p-5 sm:p-8 md:p-10 animate-fade-in text-left overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3 mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs border border-purple-200/60 dark:border-purple-800/50">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-purple-700 dark:text-purple-400">
                AI / Research
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-800/50 text-purple-700 dark:text-purple-300 font-bold">
                Tab {activeTab} of 5
              </span>
            </div>
          </div>
        </div>

        {/* Top Header Controls */}
        <div className="flex items-center gap-2">
          {fullTabTranscript && (
            <>
              <button
                type="button"
                onClick={() => handleCopyText(fullTabTranscript, 'all')}
                className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-xs"
                title="Copy all research from this tab"
              >
                {copiedId === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedId === 'all' ? 'Copied' : 'Copy All'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveToStepNote(fullTabTranscript, 'all')}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 border border-amber-200/80 shadow-xs"
                title="Save entire tab transcript to step notes"
              >
                {savedToNoteId === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <StickyNote className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{savedToNoteId === 'all' ? 'Saved' : 'Add All to Note'}</span>
              </button>

              <button
                type="button"
                onClick={handleClearCurrentTab}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                title="Clear current tab and start fresh"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-500 dark:text-gray-300 transition-all cursor-pointer active:scale-95 flex items-center justify-center ml-1"
            title="Close AI / Research"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Step Context Banner */}
      {stepPrompt && (
        <div className="mb-3 px-4 py-2.5 bg-gray-50/80 dark:bg-zinc-900/60 rounded-2xl border border-gray-100 dark:border-zinc-800 text-left shrink-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0E7850]">
              Action Step {stepIndex + 1}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              Questions in Tab: {questionCount}/5
            </span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-zinc-100 line-clamp-2">
            {stepPrompt}
          </p>
        </div>
      )}

      {/* Quick Research Starters (Chips) - Shown if current tab has room for questions */}
      {!isTabLocked && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 shrink-0 scrollbar-none">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleRunResearch('explain_this')}
            className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-xs font-bold border border-purple-200/70 dark:border-purple-800/40 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            <span>Explain this</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleRunResearch('examples')}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200/70 dark:border-emerald-800/40 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
            <span>Give me examples</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleRunResearch('research_this')}
            className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-xs font-bold border border-blue-200/70 dark:border-blue-800/40 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span>Research this</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleRunResearch('improve_my_answer')}
            className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200/70 dark:border-amber-800/40 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Improve my answer</span>
          </button>
        </div>
      )}

      {/* Main Workspace / Research Output Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto my-2 pr-1 w-full max-w-4xl mx-auto flex flex-col justify-start space-y-4"
      >
        {currentTab.messages.length > 0 ? (
          <div className="py-2 space-y-5">
            {/* Group messages in pairs of Q&A */}
            {(() => {
              const elements: React.ReactNode[] = [];
              const msgs = currentTab.messages;

              let questionIndex = 0;
              for (let i = 0; i < msgs.length; i++) {
                const msg = msgs[i];

                if (msg.role === 'user') {
                  questionIndex++;
                  const isFirst = questionIndex === 1;

                  // Render follow-up question header if not first question
                  if (!isFirst) {
                    elements.push(
                      <div
                        key={`q_${msg.id}`}
                        className="flex items-start gap-3 bg-purple-50/70 dark:bg-purple-950/30 p-4 rounded-2xl border border-purple-200/60 dark:border-purple-900/40 mt-4 animate-fade-in"
                      >
                        <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 text-xs font-black">
                          Q{questionIndex}
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
                            Follow-up Question {questionIndex}/5
                          </span>
                          <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-zinc-100 mt-0.5">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    );
                  }
                } else if (msg.role === 'assistant') {
                  const currentAnswerNumber = questionIndex;
                  const isInitialResearch = currentAnswerNumber === 1;

                  elements.push(
                    <div key={`a_${msg.id}`} className="space-y-4 animate-fade-in">
                      {/* Research Output Card */}
                      <div className="bg-gray-50/50 dark:bg-zinc-900/30 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-zinc-800 text-gray-800 dark:text-zinc-200 relative group">
                        <FormattedText text={msg.content} className="text-sm sm:text-base leading-relaxed" />

                        {/* Inline Actions for this specific response */}
                        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800/80">
                          <button
                            type="button"
                            onClick={() => handleCopyText(msg.content, msg.id)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 text-xs font-bold border border-gray-200/60 dark:border-zinc-700 transition-all flex items-center gap-1"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSaveToStepNote(msg.content, msg.id)}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 text-xs font-bold border border-amber-200/70 transition-all flex items-center gap-1"
                            title="Add response to step note"
                          >
                            {savedToNoteId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <StickyNote className="w-3 h-3" />}
                            <span>{savedToNoteId === msg.id ? 'Saved' : 'Add to Note'}</span>
                          </button>
                        </div>
                      </div>

                      {/* If this is the initial research response, show "Was this helpful?" and DIRECTLY BELOW IT the CoachParticipant-style Tabs Bar */}
                      {isInitialResearch && (
                        <>
                          {/* Was this helpful Section */}
                          <div className="p-4 sm:p-5 bg-purple-50/40 dark:bg-purple-950/10 rounded-3xl border border-purple-100/50 dark:border-purple-900/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                              <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-zinc-100 uppercase tracking-wider">
                                Was this research helpful?
                              </h4>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                Your rating directly helps fine-tune our personal growth models.
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleSaveFeedback(msg.id, 'up')}
                                className={`p-2 sm:px-3 sm:py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold ${
                                  msg.feedback === 'up'
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/80 shadow-xs'
                                    : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:border-zinc-800 dark:text-zinc-300'
                                }`}
                                title="Thumbs Up - Helpful"
                              >
                                <ThumbsUp className={`w-3.5 h-3.5 ${msg.feedback === 'up' ? 'fill-emerald-600 dark:fill-emerald-400' : ''}`} />
                                <span>Helpful</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveFeedback(msg.id, 'down')}
                                className={`p-2 sm:px-3 sm:py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold ${
                                  msg.feedback === 'down'
                                    ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/80 shadow-xs'
                                    : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:border-zinc-800 dark:text-zinc-300'
                                }`}
                                title="Thumbs Down - Unhelpful"
                              >
                                <ThumbsDown className={`w-3.5 h-3.5 ${msg.feedback === 'down' ? 'fill-rose-600 dark:fill-rose-400' : ''}`} />
                                <span>Unhelpful</span>
                              </button>
                            </div>
                          </div>

                          {msg.feedback === 'down' && (
                            <div className="p-4 bg-gray-50 dark:bg-zinc-900/60 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-2 animate-fade-in">
                              <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                                What could be improved? (Optional)
                              </label>
                              <textarea
                                value={msg.feedbackComment || ''}
                                onChange={(e) => handleSaveFeedbackComment(msg.id, e.target.value)}
                                placeholder="Too generic, lacked actionable steps, not enough examples, wrong context, etc..."
                                className="w-full p-2.5 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                rows={2}
                              />
                            </div>
                          )}

                          {/* BELOW "IS THIS HELPFUL": TAB SELECTION BAR 1 2 3 4 5 AND ARROW LIKE COACHPARTICIPANT */}
                          <div className="p-3 bg-gray-50/70 dark:bg-zinc-900/50 rounded-2xl border border-gray-200/60 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 mt-3 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                                Search Tabs:
                              </span>
                              {renderPaginationBar()}
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-bold text-gray-700 dark:text-zinc-300">
                                Tab {activeTab} of 5
                              </span>
                              <span className="text-gray-300 dark:text-zinc-700">•</span>
                              <span className={`font-semibold ${questionCount >= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-zinc-400'}`}>
                                {questionCount}/5 questions
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                }
              }

              return elements;
            })()}

            {/* Locked notification card if limit reached */}
            {isTabLocked && (
              <div className="p-4 sm:p-5 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 animate-fade-in mt-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 text-base">
                    🔒
                  </div>
                  <div>
                    <h5 className="font-black text-sm text-amber-950 dark:text-amber-100 tracking-tight">
                      Chat limit reached (5/5).
                    </h5>
                    <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                      You've used all 5 questions for this research tab. Switch to another tab to start a new research session.
                    </p>
                  </div>
                </div>

                {activeTab < MAX_TABS && (
                  <button
                    type="button"
                    onClick={() => setActiveTab((prev) => Math.min(MAX_TABS, prev + 1))}
                    className="self-start sm:self-auto px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer"
                  >
                    <span>Open Tab {activeTab + 1}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Empty Tab Starter Screen */
          <div className="my-auto py-12 flex flex-col items-center justify-center text-center space-y-5 text-gray-400">
            {/* Show Tab Selection Bar at Top of Empty Tab so user can navigate */}
            <div className="flex flex-col items-center gap-2 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Active Search Tab:
              </span>
              {renderPaginationBar()}
            </div>

            <div className="w-16 h-16 rounded-3xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-800/40 shadow-xs">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-zinc-100">
                What do you need help with in Tab {activeTab}?
              </h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Select a quick research preset above or ask anything about this action step below. Each tab allows up to 5 questions.
              </p>
            </div>
          </div>
        )}

        {/* Loading Spinner Indicator */}
        {isLoading && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center border border-purple-200 dark:border-purple-800 shadow-md">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 dark:text-zinc-100 tracking-tight">
                Gemini is Synthesizing Research...
              </p>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                Grounding with live search, action step specifics, and execution patterns.
              </p>
            </div>
          </div>
        )}

        {/* Friendly Error Alert */}
        {error && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 text-left space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Research Temporarily Unavailable</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">{error}</p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleRunResearch('explain_this')}
                className="px-3.5 py-1.5 bg-[#0E7850] hover:bg-[#0b5d3e] text-white text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1.5 shadow-xs"
              >
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Query & Follow-Up Bar */}
      <div className="shrink-0 pt-3 border-t border-gray-100 dark:border-zinc-800 w-full max-w-4xl mx-auto">
        {isTabLocked ? (
          <div className="p-3.5 bg-amber-50/60 dark:bg-zinc-900 rounded-2xl border border-amber-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900 dark:text-zinc-200 font-medium">
              <span className="text-sm">🔒</span>
              <span className="font-bold text-amber-950 dark:text-amber-100">Chat limit reached (5/5).</span>
              <span className="text-amber-800 dark:text-zinc-400 hidden sm:inline text-[11px]">
                You've used all 5 questions for this research tab. Switch to another tab to start a new research session.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-400 hidden md:inline">Switch tab:</span>
              {renderPaginationBar()}
            </div>
          </div>
        ) : (
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
                placeholder={
                  questionCount === 0
                    ? `Ask anything about this step in Tab ${activeTab}...`
                    : `Ask a follow-up question (${MAX_QUESTIONS_PER_TAB - questionCount} remaining in Tab ${activeTab})...`
                }
                disabled={isLoading || isTabLocked}
                className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all disabled:opacity-50"
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
              disabled={isLoading || !customQuery.trim() || isTabLocked}
              className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
                customQuery.trim() && !isLoading && !isTabLocked
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg active:scale-95 cursor-pointer'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {questionCount === 0 ? 'Research' : `Ask (Q${questionCount + 1})`}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AiResearchModal;
