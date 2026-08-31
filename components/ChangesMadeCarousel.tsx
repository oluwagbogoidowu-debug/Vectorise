import React, { useState, useRef, useMemo } from 'react';
import { Sprint, DailyContent } from '../types';
import { ChevronLeft, ChevronRight, ArrowRight, History, Sparkles, Layers, FileText, CheckCircle2, Eye, EyeOff, Sliders } from 'lucide-react';

export interface SprintChangeItem {
  id: string;
  category: 'insight' | 'step' | 'step_config' | 'bridge' | 'completion' | 'setting' | 'dynamic_section';
  day?: number; // 1-indexed Move number
  stepIndex?: number; // 0-indexed step index
  title: string; // e.g. "Move 1 Insight Changes Made" or "Move 1 Action Step 1 Changes Made"
  badge: string; // e.g. "Move 1 • Today's Insight" or "Move 1 • Step 1"
  originalValue: string;
  updatedValue: string;
  originalSnippet: string;
  updatedSnippet: string;
  isFullText: boolean;
  linesBeforeHidden?: number;
  linesAfterHidden?: number;
  changeType: 'modified' | 'added' | 'removed';
}

interface ChangesMadeCarouselProps {
  originalSprint: Sprint | null;
  currentSprint: Sprint;
  selectedDay?: number;
  onSelectDay?: (day: number) => void;
  className?: string;
}

// Computes 4 lines before and after or full text if compact
function extractContextSnippet(
  originalStr: string,
  updatedStr: string
): {
  originalSnippet: string;
  updatedSnippet: string;
  isFullText: boolean;
  linesBeforeHidden: number;
  linesAfterHidden: number;
} {
  const orig = String(originalStr || '').trim();
  const up = String(updatedStr || '').trim();

  const origLines = orig.split(/\r?\n/);
  const upLines = up.split(/\r?\n/);

  // If text is short (<= 8 lines), show full text
  if (origLines.length <= 8 && upLines.length <= 8) {
    return {
      originalSnippet: orig,
      updatedSnippet: up,
      isFullText: true,
      linesBeforeHidden: 0,
      linesAfterHidden: 0,
    };
  }

  // Find first different line
  let firstDiff = 0;
  const maxLen = Math.max(origLines.length, upLines.length);
  while (firstDiff < maxLen && origLines[firstDiff] === upLines[firstDiff]) {
    firstDiff++;
  }

  // Find last different line from bottom
  let origEnd = origLines.length - 1;
  let upEnd = upLines.length - 1;
  while (origEnd >= firstDiff && upEnd >= firstDiff && origLines[origEnd] === upLines[upEnd]) {
    origEnd--;
    upEnd--;
  }

  const startLine = Math.max(0, firstDiff - 4);
  const endLineUp = Math.min(upLines.length - 1, upEnd + 4);
  const endLineOrig = Math.min(origLines.length - 1, origEnd + 4);

  const linesBeforeHidden = startLine;
  const linesAfterHidden = Math.max(0, upLines.length - 1 - endLineUp);

  const upSnippet = upLines.slice(startLine, endLineUp + 1).join('\n');
  const origSnippet = origLines.slice(startLine, endLineOrig + 1).join('\n');

  return {
    originalSnippet: origSnippet,
    updatedSnippet: upSnippet,
    isFullText: false,
    linesBeforeHidden,
    linesAfterHidden,
  };
}

// Scans all differences between originalSprint and currentSprint
export function detectSprintChanges(original: Sprint | null, current: Sprint): SprintChangeItem[] {
  if (!original) return [];
  const items: SprintChangeItem[] = [];

  // Helper for string comparison
  const normalize = (v: any) => String(v || '').trim();

  // 1. Scan DailyContent (Moves)
  const duration = Math.max(original.duration || 0, current.duration || 0, current.dailyContent?.length || 0);
  const origDaily = Array.isArray(original.dailyContent) ? original.dailyContent : [];
  const currDaily = Array.isArray(current.dailyContent) ? current.dailyContent : [];

  for (let dayNum = 1; dayNum <= duration; dayNum++) {
    const origDay = origDaily.find(d => d.day === dayNum);
    const currDay = currDaily.find(d => d.day === dayNum);

    if (!origDay && !currDay) continue;

    // Check Today's Insight (lessonText)
    const origInsight = normalize(origDay?.lessonText);
    const currInsight = normalize(currDay?.lessonText);

    if (origInsight !== currInsight) {
      const snippet = extractContextSnippet(origInsight, currInsight);
      items.push({
        id: `move-${dayNum}-insight`,
        category: 'insight',
        day: dayNum,
        title: `Move ${dayNum} Insight Changes Made`,
        badge: `Move ${dayNum} • Today's Insight`,
        originalValue: origInsight,
        updatedValue: currInsight,
        originalSnippet: snippet.originalSnippet,
        updatedSnippet: snippet.updatedSnippet,
        isFullText: snippet.isFullText,
        linesBeforeHidden: snippet.linesBeforeHidden,
        linesAfterHidden: snippet.linesAfterHidden,
        changeType: !origInsight ? 'added' : !currInsight ? 'removed' : 'modified',
      });
    }

    // Check Action Steps (taskPrompts / taskPrompt)
    const origPrompts = Array.isArray(origDay?.taskPrompts) && origDay.taskPrompts.length > 0
      ? origDay.taskPrompts
      : origDay?.taskPrompt ? [origDay.taskPrompt] : [''];
    const currPrompts = Array.isArray(currDay?.taskPrompts) && currDay.taskPrompts.length > 0
      ? currDay.taskPrompts
      : currDay?.taskPrompt ? [currDay.taskPrompt] : [''];

    const maxSteps = Math.max(origPrompts.length, currPrompts.length, currDay?.taskInputTypes?.length || 0);

    for (let sIdx = 0; sIdx < maxSteps; sIdx++) {
      const origPrompt = normalize(origPrompts[sIdx]);
      const currPrompt = normalize(currPrompts[sIdx]);

      if (origPrompt !== currPrompt) {
        const snippet = extractContextSnippet(origPrompt, currPrompt);
        items.push({
          id: `move-${dayNum}-step-${sIdx}`,
          category: 'step',
          day: dayNum,
          stepIndex: sIdx,
          title: `Move ${dayNum} Action Step ${sIdx + 1} Changes Made`,
          badge: `Move ${dayNum} • Action Step ${sIdx + 1}`,
          originalValue: origPrompt,
          updatedValue: currPrompt,
          originalSnippet: snippet.originalSnippet,
          updatedSnippet: snippet.updatedSnippet,
          isFullText: snippet.isFullText,
          linesBeforeHidden: snippet.linesBeforeHidden,
          linesAfterHidden: snippet.linesAfterHidden,
          changeType: !origPrompt ? 'added' : !currPrompt ? 'removed' : 'modified',
        });
      }

      // Check Step Input Types / Poll Config
      const origType = normalize(origDay?.taskInputTypes?.[sIdx]);
      const currType = normalize(currDay?.taskInputTypes?.[sIdx]);
      const origPoll = normalize(origDay?.taskPollOptions?.[sIdx]);
      const currPoll = normalize(currDay?.taskPollOptions?.[sIdx]);

      if ((origType !== currType && (origType || currType)) || (origPoll !== currPoll && (origPoll || currPoll))) {
        items.push({
          id: `move-${dayNum}-step-${sIdx}-config`,
          category: 'step_config',
          day: dayNum,
          stepIndex: sIdx,
          title: `Move ${dayNum} Step ${sIdx + 1} Configuration Changed`,
          badge: `Move ${dayNum} • Step ${sIdx + 1} Settings`,
          originalValue: `Input: ${origType || 'text'} ${origPoll ? `| Options: ${origPoll}` : ''}`,
          updatedValue: `Input: ${currType || 'text'} ${currPoll ? `| Options: ${currPoll}` : ''}`,
          originalSnippet: `Input Type: ${origType || 'text'}\nOptions: ${origPoll || 'None'}`,
          updatedSnippet: `Input Type: ${currType || 'text'}\nOptions: ${currPoll || 'None'}`,
          isFullText: true,
          changeType: 'modified',
        });
      }
    }

    // Check Bridge Note
    const origBridge = normalize(origDay?.bridgeNote);
    const currBridge = normalize(currDay?.bridgeNote);
    if (origBridge !== currBridge) {
      const snippet = extractContextSnippet(origBridge, currBridge);
      items.push({
        id: `move-${dayNum}-bridge`,
        category: 'bridge',
        day: dayNum,
        title: `Move ${dayNum} Bridge Note Changes Made`,
        badge: `Move ${dayNum} • Bridge Note`,
        originalValue: origBridge,
        updatedValue: currBridge,
        originalSnippet: snippet.originalSnippet,
        updatedSnippet: snippet.updatedSnippet,
        isFullText: snippet.isFullText,
        linesBeforeHidden: snippet.linesBeforeHidden,
        linesAfterHidden: snippet.linesAfterHidden,
        changeType: !origBridge ? 'added' : !currBridge ? 'removed' : 'modified',
      });
    }

    // Check Completion Prompt
    const origComp = normalize(origDay?.completionPrompt);
    const currComp = normalize(currDay?.completionPrompt);
    if (origComp !== currComp) {
      const snippet = extractContextSnippet(origComp, currComp);
      items.push({
        id: `move-${dayNum}-completion`,
        category: 'completion',
        day: dayNum,
        title: `Move ${dayNum} Completion Action Changes Made`,
        badge: `Move ${dayNum} • Completion Note`,
        originalValue: origComp,
        updatedValue: currComp,
        originalSnippet: snippet.originalSnippet,
        updatedSnippet: snippet.updatedSnippet,
        isFullText: snippet.isFullText,
        linesBeforeHidden: snippet.linesBeforeHidden,
        linesAfterHidden: snippet.linesAfterHidden,
        changeType: !origComp ? 'added' : !currComp ? 'removed' : 'modified',
      });
    }
  }

  // 2. Scan Sprint-level Settings
  if (normalize(original.title) !== normalize(current.title)) {
    items.push({
      id: 'setting-title',
      category: 'setting',
      title: 'Sprint Title Changes Made',
      badge: 'Sprint Identity • Title',
      originalValue: original.title || '',
      updatedValue: current.title || '',
      originalSnippet: original.title || '—',
      updatedSnippet: current.title || '—',
      isFullText: true,
      changeType: 'modified',
    });
  }

  if (normalize(original.subtitle) !== normalize(current.subtitle)) {
    items.push({
      id: 'setting-subtitle',
      category: 'setting',
      title: 'Sprint Subtitle Changes Made',
      badge: 'Sprint Identity • Subtitle',
      originalValue: original.subtitle || '',
      updatedValue: current.subtitle || '',
      originalSnippet: original.subtitle || '—',
      updatedSnippet: current.subtitle || '—',
      isFullText: true,
      changeType: 'modified',
    });
  }

  const origDesc = normalize(original.description || original.transformation);
  const currDesc = normalize(current.description || current.transformation);
  if (origDesc !== currDesc) {
    const snippet = extractContextSnippet(origDesc, currDesc);
    items.push({
      id: 'setting-overview',
      category: 'setting',
      title: 'Sprint Overview / Description Changes Made',
      badge: 'Sprint Overview',
      originalValue: origDesc,
      updatedValue: currDesc,
      originalSnippet: snippet.originalSnippet,
      updatedSnippet: snippet.updatedSnippet,
      isFullText: snippet.isFullText,
      linesBeforeHidden: snippet.linesBeforeHidden,
      linesAfterHidden: snippet.linesAfterHidden,
      changeType: 'modified',
    });
  }

  return items;
}

// Word-level highlight component
const HighlightedDiffSnippet: React.FC<{
  originalSnippet: string;
  updatedSnippet: string;
  showPrevious: boolean;
}> = ({ originalSnippet, updatedSnippet, showPrevious }) => {
  const origWords = useMemo(() => originalSnippet.split(/\s+/).filter(Boolean), [originalSnippet]);
  const origSet = useMemo(() => new Set(origWords), [origWords]);

  const upWords = useMemo(() => updatedSnippet.split(/\s+/).filter(Boolean), [updatedSnippet]);
  const upSet = useMemo(() => new Set(upWords), [upWords]);

  if (showPrevious) {
    return (
      <div className="text-xs leading-relaxed text-gray-700 font-sans whitespace-pre-wrap select-text">
        {origWords.map((word, i) => {
          const isRemovedInNew = !upSet.has(word);
          return (
            <span
              key={i}
              className={
                isRemovedInNew
                  ? 'bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded font-semibold border border-amber-200/80 mx-0.5 inline-block'
                  : 'mx-0.5 inline-block'
              }
            >
              {word}{' '}
            </span>
          );
        })}
        {origWords.length === 0 && <span className="italic text-gray-400">Empty / None</span>}
      </div>
    );
  }

  // New version view with changes highlighted
  return (
    <div className="text-xs leading-relaxed text-gray-900 font-sans whitespace-pre-wrap select-text">
      {upWords.map((word, i) => {
        const isNewWord = !origSet.has(word);
        return (
          <span
            key={i}
            className={
              isNewWord
                ? 'bg-emerald-100 text-emerald-950 px-1 py-0.5 rounded font-bold border border-emerald-200 mx-0.5 inline-block'
                : 'mx-0.5 inline-block'
            }
          >
            {word}{' '}
          </span>
        );
      })}
      {upWords.length === 0 && <span className="italic text-gray-400">Empty / Removed</span>}
    </div>
  );
};

export const ChangesMadeCarousel: React.FC<ChangesMadeCarouselProps> = ({
  originalSprint,
  currentSprint,
  selectedDay,
  onSelectDay,
  className = '',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Track per-card previous version toggle states (default is false / new version)
  const [previousToggles, setPreviousToggles] = useState<Record<string, boolean>>({});
  const [globalPrevious, setGlobalPrevious] = useState(false);

  // Extract all changes
  const changes = useMemo(() => {
    return detectSprintChanges(originalSprint, currentSprint);
  }, [originalSprint, currentSprint]);

  // If there are no detected changes, do not render (first time review or identical)
  if (changes.length === 0) {
    return null;
  }

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 380;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const toggleCardPrevious = (cardId: string) => {
    setPreviousToggles(prev => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const toggleAllPrevious = () => {
    const nextState = !globalPrevious;
    setGlobalPrevious(nextState);
    const updated: Record<string, boolean> = {};
    changes.forEach(c => {
      updated[c.id] = nextState;
    });
    setPreviousToggles(updated);
  };

  return (
    <div className={`bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-blue-50/50 rounded-3xl p-6 border border-purple-100/90 shadow-sm animate-fade-in ${className}`}>
      {/* Header with summary & scroll controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 px-1">
        <div className="flex flex-col gap-1 text-left">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-2xs">
              <Sparkles className="w-3 h-3" />
              Changes Made ({changes.length})
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-900/80">
              Audit Review • 2nd+ Request
            </span>
          </div>
          <h3 className="text-sm font-black text-gray-950 tracking-tight flex items-center gap-2 mt-0.5">
            <span>Proposed Curriculum Modifications</span>
            <span className="text-[11px] font-normal text-gray-500">
              (Swipe side to inspect each change)
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Global P button */}
          <button
            type="button"
            onClick={toggleAllPrevious}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
              globalPrevious
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-200'
                : 'bg-white text-gray-700 hover:text-purple-700 border-gray-200 hover:border-purple-200'
            }`}
            title={globalPrevious ? 'Switch all to New Version' : 'Switch all to Previous Version (P)'}
          >
            <span className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center font-black text-[9px]">P</span>
            <span>{globalPrevious ? 'Showing Previous (P)' : 'Toggle All (P)'}</span>
          </button>

          {/* Carousel arrow buttons */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className="p-1.5 text-gray-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
              title="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="p-1.5 text-gray-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
              title="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Swipeable Carousel Container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto gap-4 pb-2 pt-1 hide-scrollbar snap-x snap-mandatory scroll-smooth"
      >
        {changes.map((item, index) => {
          const isPreviousActive = previousToggles[item.id] ?? globalPrevious;
          const isCurrentDay = item.day !== undefined && selectedDay === item.day;

          return (
            <div
              key={item.id}
              className={`snap-start flex-shrink-0 w-[330px] sm:w-[380px] bg-white rounded-2xl border transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
                isCurrentDay ? 'border-purple-300 ring-2 ring-purple-100' : 'border-gray-150/90'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100/90 bg-gray-50/50 flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded-md text-[9px] font-black uppercase tracking-wider">
                      {item.badge}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400">
                      Card {index + 1} of {changes.length}
                    </span>
                  </div>
                  <h4 className="font-black text-gray-900 text-xs tracking-tight truncate mt-0.5" title={item.title}>
                    {item.title}
                  </h4>
                </div>

                {/* The P Toggle Icon Button */}
                <button
                  type="button"
                  onClick={() => toggleCardPrevious(item.id)}
                  className={`relative p-1.5 px-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                    isPreviousActive
                      ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-200 border-amber-600'
                      : 'bg-white text-gray-600 hover:text-purple-700 hover:bg-purple-50 border border-gray-200'
                  }`}
                  title={isPreviousActive ? 'Click to show New Version' : 'Click to show Previous Version (P)'}
                >
                  <span className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center font-black text-[9px]">P</span>
                  <span className="text-[9px] font-black">{isPreviousActive ? 'Previous' : 'New'}</span>
                </button>
              </div>

              {/* Card Body with Context Snippet (4 lines before & after) */}
              <div className="p-4 flex-1 flex flex-col justify-between gap-3 bg-white">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                      isPreviousActive ? 'text-amber-700' : 'text-emerald-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${isPreviousActive ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      {isPreviousActive ? 'Live / Previous Version (P)' : 'Proposed New Version'}
                    </span>

                    {!item.isFullText && (
                      <span className="text-[9px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                        4 Lines Context
                      </span>
                    )}
                  </div>

                  {/* Context Snippet Display */}
                  <div className={`p-3 rounded-xl border max-h-48 overflow-y-auto ${
                    isPreviousActive
                      ? 'bg-amber-50/40 border-amber-100 text-amber-950'
                      : 'bg-gray-50/60 border-gray-100 text-gray-900'
                  }`}>
                    {!item.isFullText && item.linesBeforeHidden && item.linesBeforeHidden > 0 ? (
                      <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest pb-1 border-b border-gray-200/50 mb-1.5">
                        ⋯ ({item.linesBeforeHidden} preceding lines hidden)
                      </div>
                    ) : null}

                    <HighlightedDiffSnippet
                      originalSnippet={item.originalSnippet}
                      updatedSnippet={item.updatedSnippet}
                      showPrevious={isPreviousActive}
                    />

                    {!item.isFullText && item.linesAfterHidden && item.linesAfterHidden > 0 ? (
                      <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest pt-1 border-t border-gray-200/50 mt-1.5">
                        ⋯ ({item.linesAfterHidden} subsequent lines hidden)
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Footer Action to jump directly to Move in editor */}
                {item.day !== undefined && onSelectDay && (
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                      {isCurrentDay ? 'Active in Editor' : `Move ${item.day}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectDay(item.day!)}
                      className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        isCurrentDay
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
                      }`}
                    >
                      <span>Jump to Move {item.day}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChangesMadeCarousel;
