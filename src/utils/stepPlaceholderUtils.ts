export type StepPlaceholderMode = 'normal' | 'list' | 'hide' | 'sentence' | 'disconnect';

export interface StepPlaceholderDetail {
  dayNum?: number;
  stepNum: number;
  opNum?: number;
  mode: StepPlaceholderMode;
  rawLabel: string;
  token: string;
}

export interface StepPlaceholderValidation {
  isValid: boolean;
  hasPlaceholders: boolean;
  invalidStepRefs: number[];
  validStepRefs: number[];
  validStepLabels?: string[];
  invalidStepLabels?: string[];
  placeholderDetails?: StepPlaceholderDetail[];
  errorMsg?: string;
  isLogicLinked?: boolean;
}

export function parsePlaceholderMode(modeStr?: string): StepPlaceholderMode {
  if (!modeStr) return 'normal';
  const m = modeStr.toLowerCase().trim();
  if (m === 'h' || m === 'hide') return 'hide';
  if (m === 'd' || m === 'disconnect') return 'disconnect';
  if (m === 's' || m === 'sentence') return 'sentence';
  if (m === 'list' || m === 'l') return 'list';
  if (m === 'normal' || m === 'n') return 'normal';
  return 'normal';
}

/**
 * Regex matching placeholders like {Step 1}, {Step 1 Op2}, {D1 Step 3}, {D2 Step 4 Op1}, {Day 1 Step 3 list}, {d2 step 4 op 1 h}, {Step 1 Op 4 d}, etc.
 */
export const PLACEHOLDER_REGEX = /\{(?:\s*[dD](?:ay)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal|hide|sentence|disconnect|h|s|l|n|d))?\}/gi;

/**
 * Validates `{step N}`, `{D1 Step 3}`, `{D2 Step 4 op 1}`, `{Step N list}`, `{Step N h}`, `{Step N Op 4 d}` etc. placeholders in prompt text.
 */
export function validateStepPlaceholders(
  prompt: string,
  stepIndex: number,
  taskInputTypes: string[],
  taskPollOptions?: string[],
  currentDay: number = 1,
  allDaysContent?: any[]
): StepPlaceholderValidation {
  if (!prompt) return { isValid: true, hasPlaceholders: false, invalidStepRefs: [], validStepRefs: [], validStepLabels: [], invalidStepLabels: [], placeholderDetails: [] };

  const regex = /\{(?:\s*[dD](?:ay)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal|hide|sentence|disconnect|h|s|l|n|d))?\}/gi;
  let match: RegExpExecArray | null;
  const references: StepPlaceholderDetail[] = [];

  while ((match = regex.exec(prompt)) !== null) {
    const dayNum = match[1] ? parseInt(match[1], 10) : undefined;
    const stepNum = parseInt(match[2], 10);
    const opNum = match[3] ? parseInt(match[3], 10) : undefined;
    const modeStr = match[4];
    const mode = parsePlaceholderMode(modeStr);

    let modeSuffix = '';
    if (mode === 'hide') modeSuffix = ' h';
    else if (mode === 'disconnect') modeSuffix = ' d';
    else if (mode === 'sentence') modeSuffix = ' s';
    else if (mode === 'list') modeSuffix = ' list';

    const dayPrefix = dayNum !== undefined ? `D${dayNum} ` : '';
    const opPart = opNum !== undefined ? ` Op${opNum}` : '';
    const rawLabel = `${dayPrefix}Step ${stepNum}${opPart}${modeSuffix}`.trim();
    const token = match[0];

    if (!references.some(r => r.token === token)) {
      references.push({ dayNum, stepNum, opNum, mode, rawLabel, token });
    }
  }

  if (references.length === 0) {
    return { isValid: true, hasPlaceholders: false, invalidStepRefs: [], validStepRefs: [], validStepLabels: [], invalidStepLabels: [], placeholderDetails: [] };
  }

  const invalidStepRefs: number[] = [];
  const validStepRefs: number[] = [];
  const validStepLabels: string[] = [];
  const invalidStepLabels: string[] = [];
  const placeholderDetails: StepPlaceholderDetail[] = [];

  let invalidReason = '';

  for (const ref of references) {
    const targetDay = ref.dayNum !== undefined ? ref.dayNum : currentDay;
    const targetStepIndex = ref.stepNum - 1; // 1-based to 0-based

    // Rule 1: Cannot reference future day
    if (targetDay > currentDay) {
      invalidStepRefs.push(ref.stepNum);
      invalidStepLabels.push(ref.rawLabel);
      if (!invalidReason) {
        invalidReason = `Invalid placeholder {${ref.rawLabel}}: Cannot reference future Day ${targetDay} from Day ${currentDay}.`;
      }
      continue;
    }

    // Rule 2: Same day preceding rule
    if (targetDay === currentDay) {
      if (targetStepIndex < 0 || targetStepIndex >= stepIndex) {
        invalidStepRefs.push(ref.stepNum);
        invalidStepLabels.push(ref.rawLabel);
        if (!invalidReason) {
          invalidReason = `Invalid placeholder {${ref.rawLabel}}: Step ${ref.stepNum} must precede Step ${stepIndex + 1} on Day ${currentDay}.`;
        }
        continue;
      }
    } else {
      // Rule 3: Previous day step existence
      if (targetDay < 1) {
        invalidStepRefs.push(ref.stepNum);
        invalidStepLabels.push(ref.rawLabel);
        if (!invalidReason) {
          invalidReason = `Invalid placeholder {${ref.rawLabel}}: Day ${targetDay} must be at least Day 1.`;
        }
        continue;
      }

      if (allDaysContent && Array.isArray(allDaysContent)) {
        const targetDayContent = allDaysContent.find(d => d && (Number(d.day) === targetDay));
        if (targetDayContent) {
          const maxStepsOnDay = targetDayContent.taskPrompts?.length || targetDayContent.taskInputTypes?.length || 0;
          if (targetStepIndex < 0 || (maxStepsOnDay > 0 && targetStepIndex >= maxStepsOnDay)) {
            invalidStepRefs.push(ref.stepNum);
            invalidStepLabels.push(ref.rawLabel);
            if (!invalidReason) {
              invalidReason = `Invalid placeholder {${ref.rawLabel}}: Day ${targetDay} only has ${maxStepsOnDay} step(s). Step ${ref.stepNum} is out of bounds.`;
            }
            continue;
          }
        }
      }
    }

    // Rule 4: Option syntax check
    let targetType = taskInputTypes?.[targetStepIndex];
    if (targetDay !== currentDay && allDaysContent && Array.isArray(allDaysContent)) {
      const targetDayContent = allDaysContent.find(d => d && (Number(d.day) === targetDay));
      if (targetDayContent?.taskInputTypes?.[targetStepIndex]) {
        targetType = targetDayContent.taskInputTypes[targetStepIndex];
      }
    }

    if (ref.opNum !== undefined) {
      const targetVersions = parseStepVersions(targetType);
      const isTargetPoll = targetVersions.some(v => v && v.toLowerCase() === 'poll') || targetType === 'poll';
      if (targetType && !isTargetPoll) {
        invalidStepRefs.push(ref.stepNum);
        invalidStepLabels.push(ref.rawLabel);
        if (!invalidReason) {
          invalidReason = `Invalid placeholder {${ref.rawLabel}}: Option syntax (Op${ref.opNum}) can only be used on 'poll' steps. Target step is '${targetType}'.`;
        }
        continue;
      }
    }

    if (!validStepRefs.includes(ref.stepNum)) {
      validStepRefs.push(ref.stepNum);
    }
    validStepLabels.push(ref.rawLabel);
    placeholderDetails.push(ref);
  }

  if (invalidStepLabels.length > 0) {
    return {
      isValid: false,
      hasPlaceholders: true,
      invalidStepRefs,
      validStepRefs,
      validStepLabels,
      invalidStepLabels,
      placeholderDetails,
      errorMsg: invalidReason || `Invalid placeholder logic: ${invalidStepLabels.map(l => `{${l}}`).join(', ')}.`
    };
  }

  return {
    isValid: true,
    hasPlaceholders: true,
    invalidStepRefs: [],
    validStepRefs,
    validStepLabels,
    invalidStepLabels: [],
    placeholderDetails,
    isLogicLinked: true
  };
}

/**
 * Toggles or sets the mode ('normal' | 'list' | 'hide' | 'sentence') of a placeholder within a prompt string.
 */
export function togglePlaceholderMode(
  prompt: string,
  targetStepNum: number,
  targetMode: StepPlaceholderMode,
  targetDayNum?: number
): string {
  if (!prompt) return prompt;

  const regex = /\{(?:\s*[dD](?:ay)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal|hide|sentence|h|s|l|n))?\}/gi;

  return prompt.replace(regex, (fullMatch, dayNumStr, stepNumStr, opNumStr) => {
    const stepNum = parseInt(stepNumStr, 10);
    const dayNum = dayNumStr ? parseInt(dayNumStr, 10) : undefined;

    if (stepNum !== targetStepNum) {
      return fullMatch;
    }
    if (targetDayNum !== undefined && dayNum !== undefined && dayNum !== targetDayNum) {
      return fullMatch;
    }

    const dayPart = (dayNum !== undefined || targetDayNum !== undefined) ? `D${dayNum ?? targetDayNum} ` : '';
    const opNum = opNumStr ? parseInt(opNumStr, 10) : undefined;
    const opPart = opNum !== undefined ? ` Op${opNum}` : '';
    let modePart = '';
    if (targetMode === 'list') modePart = ' list';
    else if (targetMode === 'hide') modePart = ' h';
    else if (targetMode === 'disconnect') modePart = ' d';
    else if (targetMode === 'sentence') modePart = ' s';

    return `{${dayPart}Step ${stepNum}${opPart}${modePart}}`;
  });
}

export interface ProgressiveSelectionResult {
  activeSelection?: string;
  activeOptionIndex: number;
  allSelections: string[];
  isNarrowed: boolean;
  sourceStepIdx: number;
}

/**
 * Returns list of explicitly linked steps for a given step based on:
 * 1. taskPollOptionLinks (Branching path link e.g. "Step 1 Op 2")
 * 2. taskLinkedSources
 * 3. Explicit placeholder tokens {Step N}, {Step N op M}, {D1 Step N} in prompt, hint, footnote, or options.
 */
export function getExplicitLinkedSteps(
  stepIdx: number,
  dayContent?: any
): { day: number; stepIdx: number }[] {
  if (!dayContent) return [];
  const currentDay = Number(dayContent.day || 1);
  const links: { day: number; stepIdx: number }[] = [];

  const addLink = (d: number, s: number) => {
    if (s < 0 || (d === currentDay && s >= stepIdx)) return;
    if (!links.some(l => l.day === d && l.stepIdx === s)) {
      links.push({ day: d, stepIdx: s });
    }
  };

  // 1. taskPollOptionLinks
  const pollLinkRaw = dayContent.taskPollOptionLinks?.[stepIdx];
  const pollLinkInfo = parsePollLinkInfo(pollLinkRaw);
  if (pollLinkInfo && pollLinkInfo.targetPollIdx >= 0) {
    addLink(currentDay, pollLinkInfo.targetPollIdx);
  }

  // 2. taskLinkedSources
  if (Array.isArray(dayContent.taskLinkedSources?.[stepIdx])) {
    for (const srcIdx of dayContent.taskLinkedSources[stepIdx]) {
      if (typeof srcIdx === 'number') {
        if (srcIdx < 0) {
          const absVal = Math.abs(srcIdx);
          const sDay = Math.floor(absVal / 100);
          const sStep = absVal % 100;
          addLink(sDay, sStep);
        } else {
          addLink(currentDay, srcIdx);
        }
      }
    }
  }

  // 3. Scan placeholders in taskPrompts, taskHints, taskFootnotes, taskPollOptions
  const textsToScan: string[] = [];
  const promptVal = dayContent.taskPrompts?.[stepIdx];
  if (typeof promptVal === 'string') textsToScan.push(promptVal);
  const hintVal = dayContent.taskHints?.[stepIdx];
  if (typeof hintVal === 'string') textsToScan.push(hintVal);
  const footnoteVal = dayContent.taskFootnotes?.[stepIdx];
  if (typeof footnoteVal === 'string') textsToScan.push(footnoteVal);
  const optionsVal = dayContent.taskPollOptions?.[stepIdx];
  if (typeof optionsVal === 'string') textsToScan.push(optionsVal);

  const regex = /\{(?:\s*[dD](?:ay)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal|hide|sentence|disconnect|h|s|l|n|d))?\}/gi;

  for (const text of textsToScan) {
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      const dayNum = match[1] ? parseInt(match[1], 10) : currentDay;
      const stepNum = parseInt(match[2], 10);
      const targetStepIdx = stepNum - 1;
      addLink(dayNum, targetStepIdx);
    }
  }

  return links;
}

/**
 * Implements progressive step linking across the sprint:
 * - Applie ONLY if explicitly linked by {Step N op M}, {Step N}, taskPollOptionLinks, or taskLinkedSources.
 * - Stores all selected options if a previous step allows multi-selections (e.g. Tags/Multi-Poll).
 * - Traces later steps to see if a subsequent step narrowed those selections down to a single choice.
 * - Once narrowed, the most recent single selection becomes the active selection that controls subsequent conditional content, versions, and hints.
 */
export function resolveProgressiveStepSelections(
  stepIdx: number = 0,
  dayContent?: any,
  taskInputs?: any,
  allDaysContent?: any[],
  allDaysInputs?: any[] | Record<number, any>
): ProgressiveSelectionResult {
  const defaultResult: ProgressiveSelectionResult = {
    activeOptionIndex: 0,
    allSelections: [],
    isNarrowed: false,
    sourceStepIdx: stepIdx
  };

  if (!dayContent) return defaultResult;

  // Progressive linking ONLY applies if explicitly linked by {Step N op M}, {Step N}, taskPollOptionLinks, or taskLinkedSources.
  const explicitLinks = getExplicitLinkedSteps(stepIdx, dayContent);
  if (explicitLinks.length === 0) {
    return defaultResult;
  }

  const currentDayNum = Number(dayContent.day || 1);

  const getInputValue = (targetDay: number, targetStepIdx: number) => {
    if (targetDay === currentDayNum || targetDay === Number(dayContent.day)) {
      if (taskInputs) {
        if (Array.isArray(taskInputs)) return taskInputs[targetStepIdx];
        if (typeof taskInputs === 'object') return taskInputs[targetStepIdx];
      }
    }
    if (allDaysInputs) {
      if (Array.isArray(allDaysInputs)) {
        const prog = allDaysInputs.find((p: any) => p && Number(p.day) === targetDay);
        if (prog) {
          if (Array.isArray(prog.answers)) return prog.answers[targetStepIdx];
          if (Array.isArray(prog.answersMap)) return prog.answersMap[targetStepIdx];
        }
        const dayArr = allDaysInputs[targetDay - 1];
        if (dayArr) {
          if (Array.isArray(dayArr)) return dayArr[targetStepIdx];
          if (typeof dayArr === 'object') return dayArr[targetStepIdx];
        }
      } else if (typeof allDaysInputs === 'object') {
        const dayVal = (allDaysInputs as any)[targetDay] || (allDaysInputs as any)[targetDay - 1];
        if (dayVal) {
          if (Array.isArray(dayVal)) return dayVal[targetStepIdx];
          if (typeof dayVal === 'object') return dayVal[targetStepIdx];
        }
      }
    }
    return undefined;
  };

  const parseAnswers = (val: any): string[] => {
    if (val === undefined || val === null) return [];
    if (typeof val === 'boolean') return val ? ['Completed'] : [];
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) return [];
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed.map(s => String(s).trim()).filter(Boolean);
        } catch (e) {}
      }
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          return Object.values(parsed).map(s => String(s).trim()).filter(Boolean);
        } catch (e) {}
      }
      return [trimmed];
    }
    if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
    return [];
  };

  const getStepConfiguredOptions = (targetDC: any, sIdx: number): string[] => {
    if (targetDC?.taskPollOptions?.[sIdx]) {
      try {
        const parsed = JSON.parse(targetDC.taskPollOptions[sIdx]);
        if (Array.isArray(parsed)) return parsed.map(s => String(s).trim()).filter(Boolean);
      } catch (e) {}
    }
    return [];
  };

  const findOptionIndex = (options: string[], ansStr: string): number => {
    if (!ansStr || options.length === 0) return -1;
    const lowerAns = ansStr.toLowerCase();
    const idx = options.findIndex(o => o.toLowerCase() === lowerAns);
    if (idx >= 0) return idx;

    const opMatch = ansStr.match(/^(?:poll|op)\s*(\d+)$/i);
    if (opMatch) {
      const oNum = parseInt(opMatch[1], 10) - 1;
      if (oNum >= 0 && oNum < options.length) return oNum;
    }
    return -1;
  };

  const primarySourceDay = explicitLinks[0].day;
  const primarySourceStep = explicitLinks[0].stepIdx;

  const primaryDC = (primarySourceDay === currentDayNum || !allDaysContent)
    ? dayContent
    : (allDaysContent.find(d => Number(d.day) === primarySourceDay) || dayContent);

  const primaryConfiguredOpts = getStepConfiguredOptions(primaryDC, primarySourceStep);

  // Progressive search: Search from stepIdx - 1 down to primarySourceStep for the MOST RECENT SINGLE SELECTION
  for (let k = stepIdx - 1; k >= primarySourceStep; k--) {
    const val = getInputValue(currentDayNum, k);
    const answers = parseAnswers(val);

    if (answers.length === 1) {
      const singleChoice = answers[0];
      let matchedOptIdx = findOptionIndex(primaryConfiguredOpts, singleChoice);

      if (matchedOptIdx < 0) {
        const kOpts = getStepConfiguredOptions(dayContent, k);
        matchedOptIdx = findOptionIndex(kOpts, singleChoice);
      }

      return {
        activeSelection: singleChoice,
        activeOptionIndex: matchedOptIdx >= 0 ? matchedOptIdx : 0,
        allSelections: [singleChoice],
        isNarrowed: true,
        sourceStepIdx: k
      };
    }
  }

  // Fallback to primarySourceStep itself if no step between primarySourceStep and stepIdx - 1 narrowed it down
  const primaryVal = getInputValue(primarySourceDay, primarySourceStep);
  const primaryAnswers = parseAnswers(primaryVal);

  if (primaryAnswers.length > 0) {
    const optIdx = findOptionIndex(primaryConfiguredOpts, primaryAnswers[0]);
    return {
      activeSelection: primaryAnswers[0],
      activeOptionIndex: optIdx >= 0 ? optIdx : 0,
      allSelections: primaryAnswers,
      isNarrowed: primaryAnswers.length === 1,
      sourceStepIdx: primarySourceStep
    };
  }

  const pollLinkRaw = dayContent.taskPollOptionLinks?.[stepIdx];
  const pollLinkInfo = parsePollLinkInfo(pollLinkRaw);

  if (pollLinkInfo && pollLinkInfo.optNum !== undefined && pollLinkInfo.optNum > 0) {
    const optIdx = pollLinkInfo.optNum - 1;
    const optText = primaryConfiguredOpts[optIdx] || `Option ${pollLinkInfo.optNum}`;
    return {
      activeSelection: optText,
      activeOptionIndex: optIdx,
      allSelections: primaryConfiguredOpts.length > 0 ? primaryConfiguredOpts : [optText],
      isNarrowed: true,
      sourceStepIdx: primarySourceStep
    };
  }

  if (primaryConfiguredOpts.length > 0) {
    return {
      activeSelection: primaryConfiguredOpts[0],
      activeOptionIndex: 0,
      allSelections: primaryConfiguredOpts,
      isNarrowed: false,
      sourceStepIdx: primarySourceStep
    };
  }

  return defaultResult;
}

/**
 * Replaces `{step N}`, `{D1 Step 3}`, `{D2 Step 4 op 1}`, `{Step N list}`, `{Step 1 Op 4 d}` etc. placeholders in prompt with user's choices.
 */
export function formatInterpolatedText(
  prompt: string,
  dayContent?: any,
  taskInputs?: any,
  allDaysContent?: any[],
  allDaysInputs?: any[] | Record<number, any>
): string {
  if (!prompt) return '';

  const regex = /\{(?:\s*[dD](?:ay)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal|hide|sentence|disconnect|h|s|l|n|d))?\}/gi;

  const currentDayNum = Number(dayContent?.day || 1);

  // Helper to resolve day content for any target day
  const getDayContent = (targetDay: number) => {
    if (targetDay === currentDayNum || !allDaysContent || !Array.isArray(allDaysContent)) {
      return dayContent;
    }
    const found = allDaysContent.find(dc => dc && Number(dc.day) === targetDay);
    return found || dayContent;
  };

  // Helper to resolve inputs for any target step on any target day
  const getTargetInputValue = (targetDay: number, targetStepIdx: number) => {
    if (targetDay === currentDayNum || targetDay === Number(dayContent?.day)) {
      if (taskInputs) {
        if (Array.isArray(taskInputs)) return taskInputs[targetStepIdx];
        if (typeof taskInputs === 'object') return taskInputs[targetStepIdx];
      }
    }

    if (allDaysInputs) {
      if (Array.isArray(allDaysInputs)) {
        const prog = allDaysInputs.find((p: any) => p && Number(p.day) === targetDay);
        if (prog) {
          if (Array.isArray(prog.answers)) return prog.answers[targetStepIdx];
          if (Array.isArray(prog.answersMap)) return prog.answersMap[targetStepIdx];
        }
        const dayArr = allDaysInputs[targetDay - 1];
        if (dayArr) {
          if (Array.isArray(dayArr)) return dayArr[targetStepIdx];
          if (typeof dayArr === 'object') return dayArr[targetStepIdx];
        }
      } else if (typeof allDaysInputs === 'object') {
        const dayVal = (allDaysInputs as any)[targetDay] || (allDaysInputs as any)[targetDay - 1];
        if (dayVal) {
          if (Array.isArray(dayVal)) return dayVal[targetStepIdx];
          if (typeof dayVal === 'object') return dayVal[targetStepIdx];
        }
      }
    }

    if (targetDay === currentDayNum && taskInputs) {
      if (Array.isArray(taskInputs)) return taskInputs[targetStepIdx];
      if (typeof taskInputs === 'object') return taskInputs[targetStepIdx];
    }

    return undefined;
  };

  const getWrittenPollOptions = (targetDC: any, stepIndex: number): string[] => {
    if (targetDC?.taskPollOptions?.[stepIndex]) {
      try {
        const parsed = JSON.parse(targetDC.taskPollOptions[stepIndex]);
        if (Array.isArray(parsed)) return parsed.map((s: any) => String(s).trim()).filter(Boolean);
      } catch (e) {}
    }
    return [];
  };

  const getPollOptionsList = (targetDC: any, stepIndex: number): string[] => {
    const customOptions = getWrittenPollOptions(targetDC, stepIndex);

    let linkedItems: string[] = [];
    if (Array.isArray(targetDC?.taskLinkedSources?.[stepIndex])) {
      targetDC.taskLinkedSources[stepIndex].forEach((srcIdx: number) => {
        let srcDay = targetDC?.day || currentDayNum;
        let srcStepIdx = srcIdx;

        if (srcIdx < 0) {
          const absVal = Math.abs(srcIdx);
          srcDay = Math.floor(absVal / 100);
          srcStepIdx = absVal % 100;
        }

        const srcDC = getDayContent(srcDay);
        const val = getTargetInputValue(srcDay, srcStepIdx);

        if (val) {
          if (typeof val === 'string' && val.trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) linkedItems.push(...parsed.filter(Boolean));
            } catch (e) {}
          } else if (typeof val === 'string' && val.trim()) {
            linkedItems.push(val.trim());
          }
        } else {
          const srcType = srcDC?.taskInputTypes?.[srcStepIdx];
          if (srcType === 'tags' || srcType === 'poll') {
            const configuredPoll = srcDC?.taskPollOptions?.[srcStepIdx];
            if (configuredPoll) {
              try {
                const parsed = JSON.parse(configuredPoll);
                if (Array.isArray(parsed)) linkedItems.push(...parsed.filter(Boolean));
              } catch (e) {}
            }
          }
        }
      });
    }

    return Array.from(new Set([...linkedItems, ...customOptions])).filter(Boolean);
  };

  regex.lastIndex = 0;

  return prompt.replace(regex, (fullMatch, dayNumStr, stepNumStr, opNumStr, modeStr) => {
    const targetDay = dayNumStr ? parseInt(dayNumStr, 10) : currentDayNum;
    const stepNum = parseInt(stepNumStr, 10);
    const opNum = opNumStr ? parseInt(opNumStr, 10) : undefined;
    const mode = parsePlaceholderMode(modeStr);
    const stepIndex = stepNum - 1;

    const targetDC = getDayContent(targetDay);
    const inputType = targetDC?.taskInputTypes?.[stepIndex];

    const dayPrefix = dayNumStr ? `D${targetDay} ` : '';

    const formatOutput = (rawList: string[]): string => {
      if (mode === 'hide' || mode === 'disconnect') {
        return '';
      }

      const cleaned = rawList.map((item) => item.trim()).filter(Boolean);

      if (cleaned.length === 0) {
        return opNum !== undefined ? `[${dayPrefix}Step ${stepNum} Op${opNum}]` : `[${dayPrefix}Step ${stepNum}]`;
      }

      if (mode === 'list') {
        return '\n' + cleaned.map((item) => `• ${item}`).join('\n');
      }

      if (mode === 'sentence') {
        return cleaned.map((item) => {
          if (!item) return item;
          return item.charAt(0).toUpperCase() + item.slice(1);
        }).join(', ');
      }

      return cleaned.map(c => c.toLowerCase()).join(', ');
    };

    // CASE 1: Explicit Option Reference e.g. {D2 Step 4 Op1} or {Step 6 Op1}
    if (opNum !== undefined) {
      let activeDC = targetDC;
      let activeStepIndex = stepIndex;

      if (inputType !== 'poll') {
        const pollLinkRaw = targetDC?.taskPollOptionLinks?.[stepIndex];
        const pollLinkInfo = parsePollLinkInfo(pollLinkRaw);
        if (pollLinkInfo) {
          activeStepIndex = pollLinkInfo.targetPollIdx;
        } else if (Array.isArray(targetDC?.taskLinkedSources?.[stepIndex]) && targetDC.taskLinkedSources[stepIndex].length > 0) {
          activeStepIndex = targetDC.taskLinkedSources[stepIndex][0];
        }
      }

      const optIndex = opNum - 1;
      const writtenOpts = getWrittenPollOptions(activeDC, activeStepIndex);

      let optionHintText = '';
      if (activeDC?.taskHints?.[activeStepIndex]) {
        const hVersions = parseHintVersions(activeDC.taskHints[activeStepIndex]);
        if (hVersions[optIndex] !== undefined) {
          optionHintText = hVersions[optIndex].trim();
        } else if (hVersions[0] !== undefined) {
          optionHintText = hVersions[0].trim();
        }
      }

      let optionPromptText = '';
      if (activeDC?.taskPrompts?.[activeStepIndex]) {
        const pVersions = parseStepVersions(activeDC.taskPrompts[activeStepIndex]);
        if (pVersions[optIndex] !== undefined && pVersions.length > 1) {
          optionPromptText = pVersions[optIndex].trim();
        }
      }

      const val = getTargetInputValue(targetDay, activeStepIndex);
      let userChoiceText = '';
      if (val !== undefined && val !== null) {
        if (typeof val === 'string' && val.trim()) {
          try {
            if (val.trim().startsWith('[')) {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed) && parsed[optIndex]) userChoiceText = String(parsed[optIndex]).trim();
            } else if (val.trim().startsWith('{')) {
              const parsed = JSON.parse(val);
              const vals = Object.values(parsed);
              if (vals[optIndex]) userChoiceText = String(vals[optIndex]).trim();
            } else {
              userChoiceText = val.trim();
            }
          } catch (e) {
            userChoiceText = val.trim();
          }
        }
      }

      const targetWrittenText = (optIndex >= 0 && optIndex < writtenOpts.length) ? writtenOpts[optIndex].trim() : '';

      let displayText = '';

      if (userChoiceText &&
          userChoiceText.toLowerCase() !== targetWrittenText.toLowerCase() &&
          !userChoiceText.toLowerCase().match(/^(?:poll|op)\s*\d+$/i)) {
        displayText = userChoiceText;
      }

      if (!displayText && optionHintText) {
        const cleanedHint = optionHintText.replace(/\{(?:\s*[dD](?:ay)?\s*\d+\s+)?\s*[sS]?tep\s*\d+(?:\s*[oO][pP]\s*\d+)?(?:\s*(?:list|normal|hide|sentence|disconnect|h|s|l|n|d))?\}/gi, '').trim();
        if (cleanedHint) {
          if (targetWrittenText &&
              !targetWrittenText.toLowerCase().startsWith('option') &&
              !targetWrittenText.toLowerCase().startsWith('op') &&
              !targetWrittenText.toLowerCase().startsWith('poll')) {
            displayText = `${targetWrittenText}: ${cleanedHint}`;
          } else {
            displayText = cleanedHint;
          }
        }
      }

      if (!displayText && optionPromptText) {
        displayText = optionPromptText;
      }

      if (!displayText && targetWrittenText) {
        displayText = targetWrittenText;
      }

      if (displayText) {
        return formatOutput([displayText]);
      }

      return `[${dayPrefix}Step ${stepNum} Op${opNum}]`;
    }

    // CASE 2: General Step Reference e.g. {D1 Step 3} or {Step 6}
    let items: string[] = [];

    // Progressive step linking check
    const progRes = resolveProgressiveStepSelections(stepIndex, targetDC, taskInputs, allDaysContent, allDaysInputs);
    if (progRes.isNarrowed && progRes.allSelections.length > 0) {
      items = progRes.allSelections;
    } else {
      let val = getTargetInputValue(targetDay, stepIndex);

      if (val === undefined || val === null || val === '') {
        const pollLinkRaw = targetDC?.taskPollOptionLinks?.[stepIndex];
        const pollLinkInfo = parsePollLinkInfo(pollLinkRaw);
        if (pollLinkInfo) {
          const origVal = getTargetInputValue(targetDay, pollLinkInfo.targetPollIdx);
          if (origVal) val = origVal;
        } else if (Array.isArray(targetDC?.taskLinkedSources?.[stepIndex]) && targetDC.taskLinkedSources[stepIndex].length > 0) {
          const srcStepIdx = targetDC.taskLinkedSources[stepIndex][0];
          const origVal = getTargetInputValue(targetDay, srcStepIdx);
          if (origVal) val = origVal;
        }
      }

      if (val !== undefined && val !== null) {
        if (typeof val === 'boolean') {
          if (val) items = ['Completed'];
        } else if (typeof val === 'string' && val.trim()) {
          try {
            if (val.trim().startsWith('[')) {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) items = parsed.filter(Boolean);
            } else if (val.trim().startsWith('{')) {
              const parsed = JSON.parse(val);
              items = Object.values(parsed).filter((v): v is string => typeof v === 'string' && Boolean(v));
            } else {
              items = [val.trim()];
            }
          } catch (e) {
            items = [val.trim()];
          }
        } else if (Array.isArray(val)) {
          items = val.map((v) => String(v).trim()).filter(Boolean);
        }
      }

      if (items.length === 0) {
        if (inputType === 'poll') {
          items = getPollOptionsList(targetDC, stepIndex);
        } else if (inputType === 'text' || inputType === 'note') {
          const promptText = targetDC?.taskPrompts?.[stepIndex];
          if (promptText) items = [promptText];
        }
      }
    }

    return formatOutput(items);
  });
}

/**
 * Returns true if any day content has an invalid placeholder in any of its taskPrompts.
 */
export function hasAnyInvalidPlaceholdersInContent(dailyContent: any[]): boolean {
  if (!Array.isArray(dailyContent)) return false;

  for (const day of dailyContent) {
    if (!day || !Array.isArray(day.taskPrompts)) continue;
    const dayNum = Number(day.day || 1);
    const inputTypes = day.taskInputTypes || Array(day.taskPrompts.length).fill('text');
    for (let i = 0; i < day.taskPrompts.length; i++) {
      const prompt = day.taskPrompts[i];
      if (!prompt) continue;
      const val = validateStepPlaceholders(prompt, i, inputTypes, day.taskPollOptions, dayNum, dailyContent);
      if (!val.isValid) {
        return true;
      }
    }
  }

  return false;
}

export interface HintToken {
  token: string;
  label: string;
  isOption: boolean;
  optNum?: number;
  stepNum: number;
}

/**
 * Parses raw taskHint value into an array of hint string versions.
 */
export function parseHintVersions(hintRaw?: string | null): string[] {
  if (!hintRaw) return [''];
  const trimmed = hintRaw.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.map(v => (v === null || v === undefined) ? '' : String(v));
      }
    } catch (e) {}
  }
  return [hintRaw];
}

/**
 * Serializes an array of hint string versions back into a stored string.
 */
export function serializeHintVersions(versions: string[]): string {
  if (!versions || versions.length === 0) return '';
  if (versions.length === 1) return versions[0];
  return JSON.stringify(versions);
}

/**
 * Helper to parse a poll link string or object e.g. "step0:poll 2", "poll 2", "op 2", or { targetPollIdx, tag }
 */
export function parsePollLinkInfo(link: any): { targetPollIdx: number; tag?: string; optNum?: number } | null {
  if (!link) return null;
  if (typeof link === 'object' && link.targetPollIdx !== undefined) {
    const optNum = link.tag ? parseInt(String(link.tag).replace(/poll|op/gi, '').trim(), 10) : undefined;
    return { targetPollIdx: Number(link.targetPollIdx), tag: link.tag || link.targetLinkTag, optNum: isNaN(Number(optNum)) ? undefined : optNum };
  }
  if (typeof link === 'string' && link !== 'none' && link !== 'null') {
    const str = link.trim();
    if (str.includes(':')) {
      const parts = str.split(':');
      if (parts.length === 3) {
        const stepPart = parts[1].replace('step', '');
        const optPart = parts[2].replace(/poll|op/gi, '').trim();
        const pIdx = parseInt(stepPart, 10);
        const oNum = parseInt(optPart, 10);
        return { targetPollIdx: isNaN(pIdx) ? 0 : pIdx, tag: parts[2], optNum: isNaN(oNum) ? undefined : oNum };
      } else {
        const stepPart = parts[0].replace('step', '');
        const optPart = parts[1].replace(/poll|op/gi, '').trim();
        const pIdx = parseInt(stepPart, 10);
        const oNum = parseInt(optPart, 10);
        return { targetPollIdx: isNaN(pIdx) ? 0 : pIdx, tag: parts[1], optNum: isNaN(oNum) ? undefined : oNum };
      }
    } else {
      const optPart = str.replace(/poll|op/gi, '').trim();
      const oNum = parseInt(optPart, 10);
      return { targetPollIdx: 0, tag: str, optNum: isNaN(oNum) ? undefined : oNum };
    }
  }
  return null;
}

/**
 * Resolves the appropriate task hint version based on user selections and formats it.
 * Accurately tracks original poll step option selection through linked steps (poll-to-poll / step links).
 */
export function resolveTaskHintForUser(
  hintRaw?: string | null,
  stepIdx: number = 0,
  dayContent?: any,
  taskInputs?: any,
  allDaysContent?: any[],
  allDaysInputs?: any[]
): string {
  let effectiveHintRaw = hintRaw;

  if (!effectiveHintRaw || !effectiveHintRaw.trim()) {
    if (dayContent?.taskPollOptionLinks?.[stepIdx]) {
      const pollLinkInfo = parsePollLinkInfo(dayContent.taskPollOptionLinks[stepIdx]);
      if (pollLinkInfo) {
        const originStepIdx = pollLinkInfo.targetPollIdx;
        const originHintRaw = dayContent?.taskHints?.[originStepIdx];
        if (originHintRaw) {
          const originVersions = parseHintVersions(originHintRaw);
          const optIdx = (pollLinkInfo.optNum !== undefined && pollLinkInfo.optNum > 0) ? pollLinkInfo.optNum - 1 : 0;
          effectiveHintRaw = originVersions[optIdx] !== undefined ? originVersions[optIdx] : originVersions[0];
        }
      }
    } else if (Array.isArray(dayContent?.taskLinkedSources?.[stepIdx]) && dayContent.taskLinkedSources[stepIdx].length > 0) {
      const originStepIdx = dayContent.taskLinkedSources[stepIdx][0];
      const originHintRaw = dayContent?.taskHints?.[originStepIdx];
      if (originHintRaw) {
        effectiveHintRaw = originHintRaw;
      }
    }
  }

  if (!effectiveHintRaw || !effectiveHintRaw.trim()) return '';

  const versions = parseHintVersions(effectiveHintRaw);
  if (versions.length === 0) return '';

  const selectedOptIdx = resolveStepVersionIndex(stepIdx, dayContent, taskInputs, allDaysContent, allDaysInputs);

  if (versions.length === 1) {
    return formatInterpolatedText(versions[0], dayContent, taskInputs, allDaysContent, allDaysInputs);
  }

  const chosenHint = versions[selectedOptIdx] !== undefined ? versions[selectedOptIdx] : (versions[0] || '');
  return formatInterpolatedText(chosenHint, dayContent, taskInputs, allDaysContent, allDaysInputs);
}

export function parseStepVersions(raw?: string | null, isPollOptions: boolean = false): string[] {
  if (!raw) return [''];
  const trimmed = raw.trim();
  if (!trimmed) return [''];

  if (trimmed.includes('|||')) {
    return trimmed.split('|||');
  }

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr) && arr.length > 0) {
        if (isPollOptions) {
          if (typeof arr[0] === 'string' && arr[0].trim().startsWith('[')) {
            return arr.map(v => (v === null || v === undefined) ? '' : String(v));
          }
          return [raw];
        }

        // Check if element 0 is a serialized JSON array string
        if (typeof arr[0] === 'string' && arr[0].trim().startsWith('[')) {
          return arr.map(v => (v === null || v === undefined) ? '' : String(v));
        }

        return arr.map(v => (v === null || v === undefined) ? '' : String(v));
      }
    } catch (e) {}
  }

  return [raw];
}

export function serializeStepVersions(versions: string[]): string {
  if (!versions || versions.length === 0) return '';
  if (versions.length === 1) return versions[0];
  return versions.join('|||');
}

export function getStepVersionValue(rawField?: string | null, versionIdx: number = 0, fallbackDefault: string = ''): string {
  if (!rawField) return fallbackDefault;
  const trimmed = rawField.trim();
  if (!trimmed) return fallbackDefault;

  if (trimmed.includes('|||')) {
    const vers = trimmed.split('|||');
    const val = vers[versionIdx] !== undefined ? vers[versionIdx] : vers[0];
    return (val !== undefined && val !== null) ? val : fallbackDefault;
  }

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr) && arr.length > 0) {
        if (fallbackDefault === '[]') {
          if (typeof arr[0] === 'string' && arr[0].trim().startsWith('[')) {
            const val = arr[versionIdx] !== undefined ? arr[versionIdx] : arr[0];
            return val ?? fallbackDefault;
          }
          return trimmed;
        }

        const val = arr[versionIdx] !== undefined ? arr[versionIdx] : arr[0];
        return (val !== undefined && val !== null) ? String(val) : fallbackDefault;
      }
    } catch (e) {}
  }

  const versions = parseStepVersions(rawField);
  if (versionIdx >= 0 && versionIdx < versions.length && versions[versionIdx] !== undefined) {
    return versions[versionIdx];
  }
  return versions[0] ?? fallbackDefault;
}

export function updateStepVersionValue(rawField: string | null | undefined, versionIdx: number, newValue: string): string {
  if (!rawField) {
    if (versionIdx === 0) return newValue;
    const versions = Array(versionIdx + 1).fill('');
    versions[versionIdx] = newValue;
    return serializeStepVersions(versions);
  }

  const trimmed = rawField.trim();

  // If rawField is a poll options field or newValue is a JSON array string
  const isPollOpts = (trimmed.startsWith('[') && trimmed.endsWith(']')) || newValue.trim().startsWith('[');

  if (isPollOpts) {
    if (trimmed.includes('|||')) {
      const versions = trimmed.split('|||');
      while (versions.length <= versionIdx) versions.push('[]');
      versions[versionIdx] = newValue;
      return versions.join('|||');
    } else {
      if (versionIdx === 0) {
        return newValue;
      } else {
        const versions = [trimmed];
        while (versions.length <= versionIdx) versions.push('[]');
        versions[versionIdx] = newValue;
        return versions.join('|||');
      }
    }
  }

  const versions = parseStepVersions(rawField);
  while (versions.length <= versionIdx) {
    versions.push('');
  }
  versions[versionIdx] = newValue;
  return serializeStepVersions(versions);
}

export function getStepInputType(
  dayContent: any,
  stepIdx: number,
  taskInputs?: any,
  allDaysContent?: any[],
  allDaysInputs?: any[]
): string {
  if (!dayContent) return 'text';
  const verIdx = resolveStepVersionIndex(stepIdx, dayContent, taskInputs, allDaysContent, allDaysInputs);
  const rawType = dayContent.taskInputTypes?.[stepIdx];
  const typeVal = getStepVersionValue(rawType, verIdx, 'text');
  return typeVal ? typeVal.trim().toLowerCase() : 'text';
}

export function getStepPollOptions(
  dayContent: any,
  stepIdx: number,
  taskInputs?: any,
  allDaysContent?: any[],
  allDaysInputs?: any[]
): string {
  if (!dayContent) return '[]';
  const verIdx = resolveStepVersionIndex(stepIdx, dayContent, taskInputs, allDaysContent, allDaysInputs);
  const rawOpts = dayContent.taskPollOptions?.[stepIdx];
  return getStepVersionValue(rawOpts, verIdx, '[]');
}

export function getStepMultiTextLabels(
  dayContent: any,
  stepIdx: number,
  taskInputs?: any,
  allDaysContent?: any[],
  allDaysInputs?: any[]
): string[] {
  if (!dayContent) return [];
  const verIdx = resolveStepVersionIndex(stepIdx, dayContent, taskInputs, allDaysContent, allDaysInputs);
  const rawLabels = dayContent.taskMultiTextLabels?.[stepIdx];
  let valStr = '';
  if (typeof rawLabels === 'string') {
    valStr = getStepVersionValue(rawLabels, verIdx, '');
  } else if (Array.isArray(rawLabels)) {
    if (rawLabels[verIdx] !== undefined) {
      const item = rawLabels[verIdx];
      if (Array.isArray(item)) return item;
      if (typeof item === 'string') valStr = item;
    } else if (rawLabels.length > 0) {
      if (Array.isArray(rawLabels[0])) return rawLabels[0];
      if (typeof rawLabels[0] === 'string') valStr = rawLabels[0];
    }
  }
  if (valStr) {
    try {
      const parsed = JSON.parse(valStr);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
}

/**
 * Resolves the active sub-context version index (0, 1, 2...) for a step.
 * Tracks connected poll steps, option links, and linked sources so that an option selected in Step 1
 * determines the path & version active in a linked step (e.g. Step 6).
 */
export function resolveStepVersionIndex(
  stepIdx: number = 0,
  dayContent?: any,
  taskInputs?: any,
  allDaysContent?: any[],
  allDaysInputs?: any[]
): number {
  if (!dayContent) return 0;

  // Direct poll input on current step (if participant is actively answering current step poll)
  const currentType = dayContent?.taskInputTypes?.[stepIdx];
  if (currentType === 'poll') {
    const val = taskInputs ? (Array.isArray(taskInputs) ? taskInputs[stepIdx] : taskInputs[stepIdx]) : undefined;
    if (val) {
      let options: string[] = [];
      if (dayContent?.taskPollOptions?.[stepIdx]) {
        try {
          const parsed = JSON.parse(dayContent.taskPollOptions[stepIdx]);
          if (Array.isArray(parsed)) options = parsed.map((o: any) => String(o).trim());
        } catch (e) {}
      }
      if (options.length > 0) {
        const valStr = String(val).trim().toLowerCase();
        const idx = options.findIndex(o => o.toLowerCase() === valStr);
        if (idx >= 0) return idx;
      }
    }
  }

  const progRes = resolveProgressiveStepSelections(stepIdx, dayContent, taskInputs, allDaysContent, allDaysInputs);
  return progRes.activeOptionIndex;
}

/**
 * Returns helper tokens for Task Hints and Step Prompts (e.g. {Step 1}, {Step 1 op 1}, {Step 1 op 2}, {Step 6}...)
 * Written together with original poll steps when linked (e.g. {Step 1 op 2} -> {Step 6}).
 */
export function getHintTokensForContent(dayContent: any, currentStepIdx: number, dayNum?: number): HintToken[] {
  const tokens: HintToken[] = [];
  if (!dayContent) return tokens;

  const promptsCount = Math.max(
    dayContent.taskPrompts?.length || 0,
    dayContent.taskInputTypes?.length || 0,
    1
  );

  const dayPrefix = (dayNum !== undefined && dayContent.day && Number(dayContent.day) !== dayNum) ? `D${dayContent.day} ` : '';

  // Track linked connections to provide combined origin + linked step tokens
  const pollLinkRaw = dayContent.taskPollOptionLinks?.[currentStepIdx];
  const pollLinkInfo = parsePollLinkInfo(pollLinkRaw);

  if (pollLinkInfo) {
    const origStepNum = pollLinkInfo.targetPollIdx + 1;
    const origOpNum = pollLinkInfo.optNum || 1;
    const currentStepNum = currentStepIdx + 1;

    tokens.push({
      token: `{${dayPrefix}Step ${origStepNum} op ${origOpNum}} {Step ${currentStepNum}}`,
      label: `${dayPrefix}Step ${origStepNum} op ${origOpNum} → Step ${currentStepNum}`,
      isOption: true,
      optNum: origOpNum,
      stepNum: currentStepNum
    });
  }

  for (let s = 0; s < promptsCount; s++) {
    const stepNum = s + 1;
    const inputType = dayContent.taskInputTypes?.[s] || 'text';

    // Base step token
    tokens.push({
      token: `{${dayPrefix}Step ${stepNum}}`,
      label: `${dayPrefix}Step ${stepNum}`,
      isOption: false,
      stepNum
    });

    // If step is poll, add option tokens e.g. {Step 1 op 1}, {Step 1 op 2}
    if (inputType === 'poll') {
      let options: string[] = [];
      if (dayContent.taskPollOptions?.[s]) {
        try {
          const parsed = JSON.parse(dayContent.taskPollOptions[s]);
          if (Array.isArray(parsed)) options = parsed.filter(Boolean);
        } catch (e) {}
      }

      const optCount = Math.max(options.length, 2);
      for (let o = 1; o <= optCount; o++) {
        tokens.push({
          token: `{${dayPrefix}Step ${stepNum} op ${o}}`,
          label: `${dayPrefix}${stepNum} op ${o}`,
          isOption: true,
          optNum: o,
          stepNum
        });
      }
    }
  }

  return tokens;
}

/**
 * Appends or inserts the next placeholder token when the + button on Task Hint is clicked
 */
export function handlePlusHintClick(
  currentHint: string,
  onChangeHint: (newVal: string) => void,
  dayContent: any,
  currentStepIdx: number,
  dayNum?: number
) {
  const tokens = getHintTokensForContent(dayContent, currentStepIdx, dayNum);
  if (tokens.length === 0) return;

  const missingToken = tokens.find(t => !currentHint.includes(t.token));
  let tokenToInsert = '';

  if (missingToken) {
    tokenToInsert = missingToken.token;
  } else {
    tokenToInsert = tokens[0].token;
  }

  const updatedHint = currentHint && currentHint.trim() ? `${currentHint.trim()} ${tokenToInsert}` : tokenToInsert;
  onChangeHint(updatedHint);
}

/**
 * Appends or inserts a specific placeholder token directly
 */
export function insertHintToken(
  currentHint: string,
  onChangeHint: (newVal: string) => void,
  token: string
) {
  const updatedHint = currentHint && currentHint.trim() ? `${currentHint.trim()} ${token}` : token;
  onChangeHint(updatedHint);
}
