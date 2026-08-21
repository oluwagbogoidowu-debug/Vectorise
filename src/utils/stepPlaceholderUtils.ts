export type StepPlaceholderMode = 'normal' | 'list' | 'hide' | 'sentence' | 'disconnect' | 'main';

export interface StepPlaceholderDetail {
  dayNum?: number;
  stepNum: number;
  opNum?: number;
  mode: StepPlaceholderMode;
  rawLabel: string;
  token: string;
}

export interface DualInputState {
  choice: string;
  selectedChoices: string[];
  text: string;
}

export function parseDualInputState(rawVal?: string | null): DualInputState {
  if (!rawVal || typeof rawVal !== 'string') {
    return { choice: '', selectedChoices: [], text: '' };
  }
  const trimmed = rawVal.trim();
  if (!trimmed) {
    return { choice: '', selectedChoices: [], text: '' };
  }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        const choice = typeof parsed.choice === 'string' ? parsed.choice.trim() : (typeof parsed.selection === 'string' ? parsed.selection.trim() : '');
        let selectedChoices: string[] = [];
        if (Array.isArray(parsed.choices)) {
          selectedChoices = parsed.choices.map((c: any) => String(c).trim()).filter(Boolean);
        } else if (Array.isArray(parsed.selectedChoices)) {
          selectedChoices = parsed.selectedChoices.map((c: any) => String(c).trim()).filter(Boolean);
        } else if (choice) {
          selectedChoices = [choice];
        }
        const text = typeof parsed.text === 'string' ? parsed.text : (typeof parsed.answer === 'string' ? parsed.answer : '');
        return { choice: choice || (selectedChoices[0] || ''), selectedChoices, text };
      }
    } catch (e) {}
  }
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const selectedChoices = parsed.map(c => String(c).trim()).filter(Boolean);
        return { choice: selectedChoices[0] || '', selectedChoices, text: '' };
      }
    } catch (e) {}
  }
  return { choice: trimmed, selectedChoices: [trimmed], text: trimmed };
}

export function serializeDualInputState(state: { choice?: string; selectedChoices?: string[]; text?: string }): string {
  const choice = state.choice || (state.selectedChoices && state.selectedChoices.length > 0 ? state.selectedChoices[0] : '');
  const selectedChoices = state.selectedChoices || (choice ? [choice] : []);
  const text = (state.text !== undefined && state.text !== null) ? state.text : '';
  
  if (!choice && selectedChoices.length === 0 && !text) {
    return '';
  }
  
  return JSON.stringify({
    choice,
    choices: selectedChoices,
    selectedChoices,
    text
  });
}

/**
 * Checks if 'main' mode is active for a specific action step.
 * Main is active if ANY version/prompt of this step contains a placeholder in 'main' mode
 * (e.g. {M1 Step 7 main}, {Step 1 main}, {M1 Step 1 Op1 m}, {D1 Step 7 main}, etc.).
 * When active, this applies to the action step and all its substeps (1, 2, 3, 4 versions under it),
 * without leaking to other action steps.
 */
export function isMainActiveForStep(
  stepIdx: number,
  dayContent?: any,
  allDaysContent?: any[]
): boolean {
  if (!dayContent) return false;

  const mainRegex = /\{(?:\s*[dDmM](?:ay|ove)?\s*\d+\s+)?\s*[sS]?tep\s*\d+(?:\s*[oO][pP]\s*\d+)?\s+(?:main|m)\}/i;

  const rawPrompt = dayContent.taskPrompts?.[stepIdx];
  if (typeof rawPrompt === 'string') {
    const versions = parseStepVersions(rawPrompt);
    for (const v of versions) {
      if (!v) continue;
      if (mainRegex.test(v)) return true;
    }
  } else if (stepIdx === 0 && typeof dayContent.taskPrompt === 'string') {
    const versions = parseStepVersions(dayContent.taskPrompt);
    for (const v of versions) {
      if (!v) continue;
      if (mainRegex.test(v)) return true;
    }
  }

  const rawHint = dayContent.taskHints?.[stepIdx];
  if (typeof rawHint === 'string' && mainRegex.test(rawHint)) {
    return true;
  }

  const rawFootnote = dayContent.taskFootnotes?.[stepIdx];
  if (typeof rawFootnote === 'string' && mainRegex.test(rawFootnote)) {
    return true;
  }

  const rawTagNote = dayContent.taskTagNotes?.[stepIdx];
  if (typeof rawTagNote === 'string' && mainRegex.test(rawTagNote)) {
    return true;
  }

  const rawPollOption = dayContent.taskPollOptions?.[stepIdx];
  if (typeof rawPollOption === 'string' && mainRegex.test(rawPollOption)) {
    return true;
  }

  return false;
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
  if (m === 'm' || m === 'main') return 'main';
  if (m === 'h' || m === 'hide') return 'hide';
  if (m === 'd' || m === 'disconnect') return 'disconnect';
  if (m === 's' || m === 'sentence') return 'sentence';
  if (m === 'list' || m === 'l') return 'list';
  if (m === 'normal' || m === 'n') return 'normal';
  return 'normal';
}

/**
 * Regex matching placeholders like {Step 1}, {Step 1 Op2}, {M1 Step 3}, {M2 Step 4 Op1 m}, {Move 1 Step 3 list}, {D1 Step 3}, {d2 step 4 op 1 h}, {Step 1 Op 4 d}, etc.
 */
export const PLACEHOLDER_REGEX = /\{(?:\s*[dDmM](?:ay|ove)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal|hide|sentence|disconnect|main|h|s|l|n|d|m))?\}/gi;

/**
 * Validates `{step N}`, `{M1 Step 3}`, `{M2 Step 4 op 1}`, `{Step N list}`, `{Step N h}`, `{Step N Op 4 d}`, `{Step 1 Op 2 m}` etc. placeholders in prompt text.
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

  const regex = /\{(?:\s*[dDmM](?:ay|ove)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal|hide|sentence|disconnect|main|h|s|l|n|d|m))?\}/gi;
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
    else if (mode === 'main') modeSuffix = ' main';

    const movePrefix = dayNum !== undefined ? `M${dayNum} ` : '';
    const opPart = opNum !== undefined ? ` Op${opNum}` : '';
    const rawLabel = `${movePrefix}Step ${stepNum}${opPart}${modeSuffix}`.trim();
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

    // Rule 1: Move range check
    if (targetDay < 1) {
      invalidStepRefs.push(ref.stepNum);
      invalidStepLabels.push(ref.rawLabel);
      if (!invalidReason) {
        invalidReason = `Invalid placeholder {${ref.rawLabel}}: Move ${targetDay} must be at least Move 1.`;
      }
      continue;
    }

    if (allDaysContent && Array.isArray(allDaysContent) && allDaysContent.length > 0) {
      if (targetDay > allDaysContent.length) {
        invalidStepRefs.push(ref.stepNum);
        invalidStepLabels.push(ref.rawLabel);
        if (!invalidReason) {
          invalidReason = `Invalid placeholder {${ref.rawLabel}}: Move ${targetDay} exceeds the sprint duration (${allDaysContent.length} moves).`;
        }
        continue;
      }
    } else if (targetDay > currentDay) {
      invalidStepRefs.push(ref.stepNum);
      invalidStepLabels.push(ref.rawLabel);
      if (!invalidReason) {
        invalidReason = `Invalid placeholder {${ref.rawLabel}}: Cannot reference future Move ${targetDay} from Move ${currentDay}.`;
      }
      continue;
    }

    // Rule 2: Same move preceding rule
    if (targetDay === currentDay) {
      if (targetStepIndex < 0 || targetStepIndex >= stepIndex) {
        invalidStepRefs.push(ref.stepNum);
        invalidStepLabels.push(ref.rawLabel);
        if (!invalidReason) {
          invalidReason = `Invalid placeholder {${ref.rawLabel}}: Step ${ref.stepNum} must precede Step ${stepIndex + 1} on Move ${currentDay}.`;
        }
        continue;
      }
    } else {
      // Rule 3: Cross-move step existence
      if (allDaysContent && Array.isArray(allDaysContent)) {
        const targetDayContent = allDaysContent.find(d => d && (Number(d.day) === targetDay));
        if (targetDayContent) {
          const maxStepsOnDay = targetDayContent.taskPrompts?.length || targetDayContent.taskInputTypes?.length || 0;
          if (targetStepIndex < 0 || (maxStepsOnDay > 0 && targetStepIndex >= maxStepsOnDay)) {
            invalidStepRefs.push(ref.stepNum);
            invalidStepLabels.push(ref.rawLabel);
            if (!invalidReason) {
              invalidReason = `Invalid placeholder {${ref.rawLabel}}: Move ${targetDay} only has ${maxStepsOnDay} step(s). Step ${ref.stepNum} is out of bounds.`;
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
 * Toggles or sets the mode ('normal' | 'list' | 'hide' | 'sentence' | 'disconnect' | 'main') of a placeholder within a prompt string.
 */
export function togglePlaceholderMode(
  prompt: string,
  targetStepNum: number,
  targetMode: StepPlaceholderMode,
  targetDayNum?: number
): string {
  if (!prompt) return prompt;

  const regex = /\{(?:\s*[dDmM](?:ay|ove)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal|hide|sentence|disconnect|main|h|s|l|n|d|m))?\}/gi;

  return prompt.replace(regex, (fullMatch, dayNumStr, stepNumStr, opNumStr) => {
    const stepNum = parseInt(stepNumStr, 10);
    const dayNum = dayNumStr ? parseInt(dayNumStr, 10) : undefined;

    if (stepNum !== targetStepNum) {
      return fullMatch;
    }
    if (targetDayNum !== undefined && dayNum !== undefined && dayNum !== targetDayNum) {
      return fullMatch;
    }

    const movePart = (dayNum !== undefined || targetDayNum !== undefined) ? `M${dayNum ?? targetDayNum} ` : '';
    const opNum = opNumStr ? parseInt(opNumStr, 10) : undefined;
    const opPart = opNum !== undefined ? ` Op${opNum}` : '';
    let modePart = '';
    if (targetMode === 'list') modePart = ' list';
    else if (targetMode === 'hide') modePart = ' h';
    else if (targetMode === 'disconnect') modePart = ' d';
    else if (targetMode === 'sentence') modePart = ' s';
    else if (targetMode === 'main') modePart = ' main';

    return `{${movePart}Step ${stepNum}${opPart}${modePart}}`;
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
 * 3. Explicit placeholder tokens {Step N}, {Step N op M}, {Step N op M m}, {Step N main}, {D1 Step N} in prompt, hint, footnote, or options.
 */
export function getExplicitLinkedSteps(
  stepIdx: number,
  dayContent?: any,
  allDaysContent?: any[]
): { day: number; stepIdx: number; opNum?: number; mode?: StepPlaceholderMode }[] {
  if (!dayContent) return [];
  const currentDay = Number(dayContent.day || 1);
  const links: { day: number; stepIdx: number; opNum?: number; mode?: StepPlaceholderMode }[] = [];

  const addLink = (d: number, s: number, opNum?: number, mode?: StepPlaceholderMode) => {
    if (s < 0 || d < 1) return;
    // An upstream link can ONLY come from a preceding day or a strictly preceding step on the same day
    if (d > currentDay || (d === currentDay && s >= stepIdx)) return;
    if (mode === 'disconnect') return; // 'd' means disconnect only this
    const existing = links.find(l => l.day === d && l.stepIdx === s);
    if (!existing) {
      links.push({ day: d, stepIdx: s, opNum, mode });
    } else {
      if (existing.mode === undefined && mode !== undefined) existing.mode = mode;
      if (existing.opNum === undefined && opNum !== undefined) existing.opNum = opNum;
    }
  };

  // 1. taskPollOptionLinks
  const pollLinkRaw = dayContent.taskPollOptionLinks?.[stepIdx];
  const pollLinkInfo = parsePollLinkInfo(pollLinkRaw);
  if (pollLinkInfo && pollLinkInfo.targetPollIdx >= 0) {
    addLink(currentDay, pollLinkInfo.targetPollIdx, pollLinkInfo.optNum);
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

  // 3. Scan explicit main links or option placeholders ONLY (e.g. {Step M Op N m}, {Step M main}, {Step M Op N})
  // Plain {Step 3} in prompt / hint / footnote is text interpolation only and does not create a poll option link!
  const textsToScan: string[] = [];
  const promptVal = dayContent.taskPrompts?.[stepIdx];
  if (typeof promptVal === 'string') textsToScan.push(promptVal);
  else if (stepIdx === 0 && typeof dayContent.taskPrompt === 'string') textsToScan.push(dayContent.taskPrompt);
  const hintVal = dayContent.taskHints?.[stepIdx];
  if (typeof hintVal === 'string') textsToScan.push(hintVal);
  const footnoteVal = dayContent.taskFootnotes?.[stepIdx];
  if (typeof footnoteVal === 'string') textsToScan.push(footnoteVal);
  const tagNoteVal = dayContent.taskTagNotes?.[stepIdx];
  if (typeof tagNoteVal === 'string') textsToScan.push(tagNoteVal);
  const optionsVal = dayContent.taskPollOptions?.[stepIdx];
  if (typeof optionsVal === 'string') textsToScan.push(optionsVal);

  const regex = /\{(?:\s*[dDmM](?:ay|ove)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal|hide|sentence|disconnect|main|h|s|l|n|d|m))?\}/gi;

  for (const text of textsToScan) {
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      const dayNum = match[1] ? parseInt(match[1], 10) : currentDay;
      const stepNum = parseInt(match[2], 10);
      const opNum = match[3] ? parseInt(match[3], 10) : undefined;
      const mode = parsePlaceholderMode(match[4]);
      const targetStepIdx = stepNum - 1;
      
      // ONLY include if it's an explicit main link ({Step M Op N m}, {Step M main}) or explicit option reference ({Step M Op N})
      if (mode === 'main' || opNum !== undefined) {
        addLink(dayNum, targetStepIdx, opNum, mode);
      } else if (allDaysContent && Array.isArray(allDaysContent)) {
        // If placeholder references another day (or target step) that itself declared 'main' or an option link on that day
        const targetDC = allDaysContent.find(d => d && Number(d.day) === dayNum);
        if (targetDC) {
          const targetIsMain = isMainActiveForStep(targetStepIdx, targetDC);
          const targetPollLink = parsePollLinkInfo(targetDC.taskPollOptionLinks?.[targetStepIdx]);
          if (targetIsMain) {
            addLink(dayNum, targetStepIdx, opNum, 'main');
          } else if (targetPollLink) {
            addLink(dayNum, targetStepIdx, targetPollLink.optNum);
          }
        }
      }
    }
  }

  return links;
}

/**
 * Implements progressive step linking across the sprint:
 * - Applied when explicitly linked by {Step N main}, {Step N op M}, taskPollOptionLinks, or taskLinkedSources.
 * - Stores all selected options if a previous step allows multi-selections (e.g. Tags/Multi-Poll).
 * - Traces later steps to see if a subsequent step narrowed those selections down to a single choice.
 * - When linked via 'main' (e.g. {Step 2 main}), connects to that step as a second-layer connection and vets/picks the single option at that stage as the active one.
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

  // Progressive linking ONLY applies if explicitly linked by {Step N main}, {Step N op M}, {Step N}, taskPollOptionLinks, or taskLinkedSources.
  const explicitLinks = getExplicitLinkedSteps(stepIdx, dayContent, allDaysContent);
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
          if (prog.answersMap && typeof prog.answersMap === 'object') return (prog.answersMap as any)[targetStepIdx];
          if (typeof prog.submission === 'string' && prog.submission.includes(' | ')) {
            const parts = prog.submission.split(' | ');
            if (parts[targetStepIdx] !== undefined) return parts[targetStepIdx];
          }
        }
        const dayArr = allDaysInputs[targetDay - 1];
        if (dayArr) {
          if (Array.isArray(dayArr)) return dayArr[targetStepIdx];
          if (typeof dayArr === 'object') return (dayArr as any)[targetStepIdx];
        }
      } else if (typeof allDaysInputs === 'object') {
        const dayVal = (allDaysInputs as any)[targetDay] || (allDaysInputs as any)[targetDay - 1];
        if (dayVal) {
          if (Array.isArray(dayVal)) return dayVal[targetStepIdx];
          if (typeof dayVal === 'object') return (dayVal as any)[targetStepIdx];
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
          if (parsed && typeof parsed === 'object') {
            const list: string[] = [];
            if (typeof parsed.choice === 'string' && parsed.choice) list.push(parsed.choice);
            if (Array.isArray(parsed.choices)) list.push(...parsed.choices.map((c: any) => String(c).trim()).filter(Boolean));
            if (Array.isArray(parsed.selectedChoices)) list.push(...parsed.selectedChoices.map((c: any) => String(c).trim()).filter(Boolean));
            if (typeof parsed.text === 'string' && parsed.text) list.push(parsed.text);
            if (typeof parsed.answer === 'string' && parsed.answer) list.push(parsed.answer);
            if (list.length > 0) {
              return Array.from(new Set(list));
            }
            return Object.values(parsed).map(s => String(s).trim()).filter(Boolean);
          }
        } catch (e) {}
      }
      return [trimmed];
    }
    if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
    return [];
  };

  const getStepConfiguredOptions = (targetDC: any, sIdx: number): string[] => {
    return getAllStepPollOptions(targetDC, sIdx, taskInputs, allDaysContent, allDaysInputs);
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

  // 1. Check if there is an explicit Main Linking placeholder {Step M main} or {Step M Op N main}
  const mainLink = explicitLinks.find(l => l.mode === 'main');
  if (mainLink) {
    const targetDay = mainLink.day;
    const targetStep = mainLink.stepIdx;
    const targetOpNum = mainLink.opNum;

    const targetDC = (targetDay === currentDayNum || !allDaysContent)
      ? dayContent
      : (allDaysContent.find(d => Number(d.day) === targetDay) || dayContent);

    const configuredOpts = getStepConfiguredOptions(targetDC, targetStep);
    const rawVal = getInputValue(targetDay, targetStep);
    const answers = parseAnswers(rawVal);

    if (targetOpNum !== undefined) {
      const targetOptIndex = targetOpNum - 1;
      const targetOptText = configuredOpts[targetOptIndex] || `Option ${targetOpNum}`;

      // Is target option selected by the user in Step M?
      const isSelected = answers.some(ans => {
        const lowerAns = ans.toLowerCase();
        if (lowerAns === targetOptText.toLowerCase()) return true;
        if (lowerAns === `poll ${targetOpNum}` || lowerAns === `op ${targetOpNum}` || lowerAns === `op${targetOpNum}` || lowerAns === String(targetOpNum)) return true;
        return false;
      });

      if (isSelected) {
        // Connected! Draw the narrowed option
        return {
          activeSelection: targetOptText,
          activeOptionIndex: targetOptIndex,
          allSelections: [targetOptText],
          isNarrowed: true,
          sourceStepIdx: targetStep
        };
      } else {
        // Not connected! Don't draw the option.
        return {
          activeSelection: undefined,
          activeOptionIndex: 0,
          allSelections: [],
          isNarrowed: false,
          sourceStepIdx: targetStep
        };
      }
    } else {
      // Second layer connection: {Step M main}
      // Picks the single option at that stage as the active one based on what was clicked on Step M
      if (answers.length > 0) {
        const chosen = answers[0];
        let optIdx = findOptionIndex(configuredOpts, chosen);

        // If not found in target step's configured options, trace back through targetStep's links or previous steps
        if (optIdx < 0) {
          const targetStepLinks = getExplicitLinkedSteps(targetStep, targetDC, allDaysContent);
          for (const parentLink of targetStepLinks) {
            const pDay = parentLink.day;
            const pStep = parentLink.stepIdx;
            const pDC = (pDay === currentDayNum || !allDaysContent)
              ? dayContent
              : (allDaysContent.find(d => Number(d.day) === pDay) || dayContent);
            const parentOpts = getStepConfiguredOptions(pDC, pStep);
            const pOptIdx = findOptionIndex(parentOpts, chosen);
            if (pOptIdx >= 0) {
              optIdx = pOptIdx;
              break;
            }
          }
        }

        // If still not found, scan other steps in targetDC / dayContent for the option position
        if (optIdx < 0) {
          const daysToScan = [targetDC, dayContent].filter(Boolean);
          for (const dc of daysToScan) {
            const promptsLen = dc?.taskPrompts?.length || dc?.taskInputTypes?.length || 0;
            for (let s = 0; s < promptsLen; s++) {
              if (s === targetStep) continue;
              const sOpts = getStepConfiguredOptions(dc, s);
              const sOptIdx = findOptionIndex(sOpts, chosen);
              if (sOptIdx >= 0) {
                optIdx = sOptIdx;
                break;
              }
            }
            if (optIdx >= 0) break;
          }
        }

        return {
          activeSelection: chosen,
          activeOptionIndex: optIdx >= 0 ? optIdx : 0,
          allSelections: [chosen],
          isNarrowed: true,
          sourceStepIdx: targetStep
        };
      } else if (configuredOpts.length > 0) {
        return {
          activeSelection: configuredOpts[0],
          activeOptionIndex: 0,
          allSelections: configuredOpts,
          isNarrowed: false,
          sourceStepIdx: targetStep
        };
      }
    }
  }

  // 2. Explicit poll-to-poll / step links to source step(s)
  // When multiple tag or poll steps are connected, collect from each and every one of them to turn all tags into polls
  const validExplicitLinks = explicitLinks.filter(link => {
    const sDay = link.day;
    const sStep = link.stepIdx;
    const sDC = (sDay === currentDayNum || !allDaysContent)
      ? dayContent
      : (allDaysContent.find(d => Number(d.day) === sDay) || dayContent);
    const rawType = sDC?.taskInputTypes?.[sStep];
    const sType = String(rawType || "").trim().toLowerCase();
    return isStepOrSubStepPoll(rawType) || sType === "tags" || sType.includes("tags");
  });

  if (validExplicitLinks.length === 0) {
    return defaultResult;
  }

  const primarySourceDay = validExplicitLinks[0].day;
  const primarySourceStep = validExplicitLinks[0].stepIdx;
  const primaryDC = (primarySourceDay === currentDayNum || !allDaysContent)
    ? dayContent
    : (allDaysContent.find(d => Number(d.day) === primarySourceDay) || dayContent);

  // If only 1 source step is connected, preserve existing single-step behavior
  if (validExplicitLinks.length === 1) {
    const primaryConfiguredOpts = getStepConfiguredOptions(primaryDC, primarySourceStep);
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

  // When MORE THAN 1 tag / poll step is connected:
  // Gather from each and every connected source step so all tags turn into polls
  const combinedAnswers: string[] = [];
  const combinedConfiguredOpts: string[] = [];

  validExplicitLinks.forEach(link => {
    const sDay = link.day;
    const sStep = link.stepIdx;
    const sDC = (sDay === currentDayNum || !allDaysContent)
      ? dayContent
      : (allDaysContent.find(d => Number(d.day) === sDay) || dayContent);

    const sOpts = getStepConfiguredOptions(sDC, sStep);
    combinedConfiguredOpts.push(...sOpts);

    const sVal = getInputValue(sDay, sStep);
    const sAnswers = parseAnswers(sVal);
    combinedAnswers.push(...sAnswers);
  });

  const uniqueAnswers = Array.from(new Set(combinedAnswers)).filter(Boolean);
  const uniqueConfigured = Array.from(new Set(combinedConfiguredOpts)).filter(Boolean);

  if (uniqueAnswers.length > 0) {
    const optIdx = findOptionIndex(uniqueConfigured, uniqueAnswers[0]);
    return {
      activeSelection: uniqueAnswers[0],
      activeOptionIndex: optIdx >= 0 ? optIdx : 0,
      allSelections: uniqueAnswers,
      isNarrowed: uniqueAnswers.length === 1,
      sourceStepIdx: primarySourceStep
    };
  }

  if (uniqueConfigured.length > 0) {
    return {
      activeSelection: uniqueConfigured[0],
      activeOptionIndex: 0,
      allSelections: uniqueConfigured,
      isNarrowed: false,
      sourceStepIdx: primarySourceStep
    };
  }

  return defaultResult;
}

/**
 * Replaces `{step N}`, `{M1 Step 3}`, `{M2 Step 4 op 1}`, `{Step N list}`, `{Step 1 Op 4 d}` etc. placeholders in prompt with user's choices.
 */
export function formatInterpolatedText(
  prompt: string,
  dayContent?: any,
  taskInputs?: any,
  allDaysContent?: any[],
  allDaysInputs?: any[] | Record<number, any>
): string {
  if (!prompt) return '';

  const regex = /\{(?:\s*[dDmM](?:ay|ove)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal|hide|sentence|disconnect|main|h|s|l|n|d|m))?\}/gi;

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
    return getAllStepPollOptions(targetDC, stepIndex, taskInputs, allDaysContent, allDaysInputs);
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
          const rawSrcType = srcDC?.taskInputTypes?.[srcStepIdx];
          const srcType = String(rawSrcType || "").trim().toLowerCase();
          if (srcType === 'tags' || srcType.includes('tags') || isStepOrSubStepPoll(rawSrcType)) {
            const configuredOpts = getAllStepPollOptions(srcDC, srcStepIdx, taskInputs, allDaysContent, allDaysInputs);
            if (configuredOpts.length > 0) {
              linkedItems.push(...configuredOpts);
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

    const movePrefix = dayNumStr ? `M${targetDay} ` : '';

    const formatOutput = (rawList: string[]): string => {
      if (mode === 'hide' || mode === 'disconnect' || mode === 'main') {
        return '';
      }

      const cleaned = rawList.map((item) => item.trim()).filter(Boolean);

      if (cleaned.length === 0) {
        return opNum !== undefined ? `[${movePrefix}Step ${stepNum} Op${opNum}]` : `[${movePrefix}Step ${stepNum}]`;
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

    // CASE 1: Explicit Option Reference e.g. {M2 Step 4 Op1} or {Step 6 Op1}
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
        const cleanedHint = optionHintText.replace(/\{(?:\s*[dDmM](?:ay|ove)?\s*\d+\s+)?\s*[sS]?tep\s*\d+(?:\s*[oO][pP]\s*\d+)?(?:\s*(?:list|normal|hide|sentence|disconnect|h|s|l|n|d))?\}/gi, '').trim();
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

      return `[${movePrefix}Step ${stepNum} Op${opNum}]`;
    }

    // CASE 2: General Step Reference e.g. {M1 Step 3} or {Step 6}
    let items: string[] = [];

    // Only run progressive/main linking when the placeholder explicitly requests it (mode === 'main')
    if (mode === 'main') {
      const progRes = resolveProgressiveStepSelections(stepIndex, targetDC, taskInputs, allDaysContent, allDaysInputs);
      if (progRes.isNarrowed && progRes.allSelections.length > 0) {
        items = progRes.allSelections;
      }
    } else {
      // Normal placeholders: return the target step's direct value (or its configured poll options) and skip resolveProgressiveStepSelections
      let val = getTargetInputValue(targetDay, stepIndex);

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
              if (parsed && typeof parsed === 'object') {
                const list: string[] = [];
                if (typeof parsed.text === 'string' && parsed.text.trim()) list.push(parsed.text.trim());
                if (typeof parsed.choice === 'string' && parsed.choice.trim()) list.push(parsed.choice.trim());
                if (Array.isArray(parsed.choices)) list.push(...parsed.choices.map((c: any) => String(c).trim()).filter(Boolean));
                if (Array.isArray(parsed.selectedChoices)) list.push(...parsed.selectedChoices.map((c: any) => String(c).trim()).filter(Boolean));
                if (list.length > 0) {
                  items = Array.from(new Set(list));
                } else {
                  items = Object.values(parsed).filter((v): v is string => typeof v === 'string' && Boolean(v));
                }
              }
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
 * Accurately tracks original poll step option selection through linked steps (poll-to-poll / step links)
 * and 'main' decision routing without requiring the step to receive/display poll options.
 */
export function resolveTaskHintForUser(
  hintRaw?: string | null,
  stepIdx: number = 0,
  dayContent?: any,
  taskInputs?: any,
  allDaysContent?: any[],
  allDaysInputs?: any[] | Record<number, any>
): string {
  if (!hintRaw || !hintRaw.trim()) return '';

  const versions = parseHintVersions(hintRaw);
  if (versions.length === 0) return '';

  if (versions.length === 1) {
    const text = formatInterpolatedText(versions[0], dayContent, taskInputs, allDaysContent, allDaysInputs);
    return text ? text.trim() : '';
  }

  const progRes = resolveProgressiveStepSelections(stepIdx, dayContent, taskInputs, allDaysContent, allDaysInputs);
  const selectedOptIdx = resolveStepVersionIndex(stepIdx, dayContent, taskInputs, allDaysContent, allDaysInputs);

  // Check if any hint version explicitly contains a matching {Step N Op M} or {Mx/Dx Step N Op M} token
  let matchingVerIdx = -1;
  const targetOpNum = (progRes.activeOptionIndex !== undefined ? progRes.activeOptionIndex : selectedOptIdx) + 1;
  const opTokenRegex = new RegExp(`\\{(?:[dDmM](?:ay|ove)?\\s*\\d+\\s+)?\\s*[sS]?tep\\s*\\d+\\s*[oO][pP]\\s*${targetOpNum}(?:\\s+[a-zA-Z]+)?\\}`, 'i');

  for (let vIdx = 0; vIdx < versions.length; vIdx++) {
    if (opTokenRegex.test(versions[vIdx])) {
      matchingVerIdx = vIdx;
      break;
    }
  }

  const chosenVerIdx = matchingVerIdx >= 0 ? matchingVerIdx : (versions[selectedOptIdx] !== undefined ? selectedOptIdx : 0);
  const chosenHint = versions[chosenVerIdx] || versions[0] || '';
  const text = formatInterpolatedText(chosenHint, dayContent, taskInputs, allDaysContent, allDaysInputs);
  return text ? text.trim() : '';
}

export function parseStepVersions(raw?: string | null): string[] {
  if (!raw) return [''];
  const trimmed = raw.trim();
  if (!trimmed) return [''];

  if (trimmed.includes('|||')) {
    return trimmed.split('|||');
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
    const val = (vers[versionIdx] !== undefined && vers[versionIdx] !== '') 
      ? vers[versionIdx] 
      : ((vers[0] !== undefined && vers[0] !== '') ? vers[0] : fallbackDefault);
    return (val !== undefined && val !== null) ? val : fallbackDefault;
  }

  return rawField;
}

export function updateStepVersionValue(rawField: string | null | undefined, versionIdx: number, newValue: string): string {
  if (!rawField) {
    if (versionIdx === 0) return newValue;
    const versions = Array(versionIdx + 1).fill('');
    versions[versionIdx] = newValue;
    return serializeStepVersions(versions);
  }

  const versions = parseStepVersions(rawField);
  while (versions.length <= versionIdx) {
    versions.push('');
  }
  versions[versionIdx] = newValue;
  return serializeStepVersions(versions);
}

export function isStepOrSubStepPoll(rawType?: string | null): boolean {
  if (!rawType) return false;
  if (rawType.trim().toLowerCase() === 'poll') return true;
  const versions = parseStepVersions(rawType);
  return versions.some(v => v.trim().toLowerCase() === 'poll');
}

export function getStepInputType(
  dayContent: any,
  stepIdx: number,
  taskInputs?: any,
  allDaysContent?: any[],
  allDaysInputs?: any[] | Record<number, any>
): string {
  if (!dayContent) return 'text';
  const verIdx = resolveStepVersionIndex(stepIdx, dayContent, taskInputs, allDaysContent, allDaysInputs);
  const rawType = dayContent.taskInputTypes?.[stepIdx];
  const baseType = getStepVersionValue(rawType, 0, (rawType || 'text'));
  const typeVal = getStepVersionValue(rawType, verIdx, baseType);
  return typeVal ? typeVal.trim().toLowerCase() : (baseType ? baseType.trim().toLowerCase() : 'text');
}

export function getStepPollOptions(
  dayContent: any,
  stepIdx: number,
  taskInputs?: any,
  allDaysContent?: any[],
  allDaysInputs?: any[] | Record<number, any>
): string {
  if (!dayContent) return '[]';
  const verIdx = resolveStepVersionIndex(stepIdx, dayContent, taskInputs, allDaysContent, allDaysInputs);
  const rawOpts = dayContent.taskPollOptions?.[stepIdx];
  const baseOpts = getStepVersionValue(rawOpts, 0, (rawOpts || '[]'));
  const verOpts = getStepVersionValue(rawOpts, verIdx, baseOpts);
  return verOpts || baseOpts || '[]';
}

export function getAllStepPollOptions(
  dayContent: any,
  stepIdx: number,
  taskInputs?: any,
  allDaysContent?: any[],
  allDaysInputs?: any[] | Record<number, any>
): string[] {
  if (!dayContent?.taskPollOptions?.[stepIdx]) return [];
  const raw = dayContent.taskPollOptions[stepIdx];
  const allOpts: string[] = [];

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        allOpts.push(...parsed.map((s: any) => String(s).trim()).filter(Boolean));
      }
    } catch (e) {}

    const versions = parseStepVersions(raw);
    if (versions.length > 1 || allOpts.length === 0) {
      versions.forEach(v => {
        try {
          const parsed = JSON.parse(v);
          if (Array.isArray(parsed)) {
            allOpts.push(...parsed.map((s: any) => String(s).trim()).filter(Boolean));
          }
        } catch (e) {}
      });
    }
  } else if (Array.isArray(raw)) {
    allOpts.push(...raw.map((s: any) => String(s).trim()).filter(Boolean));
  }

  return Array.from(new Set(allOpts));
}

export function getStepMultiTextLabels(
  dayContent: any,
  stepIdx: number,
  taskInputs?: any,
  allDaysContent?: any[],
  allDaysInputs?: any[] | Record<number, any>
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
 * determines the path & version active in a linked step (e.g. Step 6) or downstream action steps (Step 1.1, 1.2...).
 */
export function resolveStepVersionIndex(
  stepIdx: number = 0,
  dayContent?: any,
  taskInputs?: any,
  allDaysContent?: any[],
  allDaysInputs?: any[] | Record<number, any>
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

  // If prompt has multiple versions (e.g. Step 1.1, 1.2, 1.3, 1.4...)
  const rawPrompt = dayContent?.taskPrompts?.[stepIdx] || (stepIdx === 0 ? dayContent?.taskPrompt : undefined);
  if (rawPrompt) {
    const promptVersions = parseStepVersions(rawPrompt);
    if (promptVersions.length > 1) {
      const targetOpNum = (progRes.activeOptionIndex !== undefined ? progRes.activeOptionIndex : 0) + 1;
      const opTokenRegex = new RegExp(`\\{(?:[dDmM](?:ay|ove)?\\s*\\d+\\s+)?\\s*[sS]?tep\\s*\\d+\\s*[oO][pP]\\s*${targetOpNum}(?:\\s+[a-zA-Z]+)?\\}`, 'i');
      
      for (let vIdx = 0; vIdx < promptVersions.length; vIdx++) {
        if (opTokenRegex.test(promptVersions[vIdx])) {
          return vIdx;
        }
      }

      // Check if any version matches an explicit option token for the source step
      if (progRes.activeSelection) {
        const lowerSel = progRes.activeSelection.toLowerCase().trim();
        for (let vIdx = 0; vIdx < promptVersions.length; vIdx++) {
          const vText = promptVersions[vIdx];
          const regex = /\{(?:\s*[dD](?:ay)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal|hide|sentence|disconnect|main|h|s|l|n|d|m))?\}/gi;
          let m: RegExpExecArray | null;
          while ((m = regex.exec(vText)) !== null) {
            const vDay = m[1] ? parseInt(m[1], 10) : Number(dayContent.day || 1);
            const vStep = parseInt(m[2], 10) - 1;
            const vOp = m[3] ? parseInt(m[3], 10) : undefined;
            if (vOp !== undefined) {
              const vDC = (allDaysContent && Array.isArray(allDaysContent))
                ? (allDaysContent.find(d => Number(d.day) === vDay) || dayContent)
                : dayContent;
              let vOpts: string[] = [];
              if (vDC?.taskPollOptions?.[vStep]) {
                try {
                  const parsed = JSON.parse(vDC.taskPollOptions[vStep]);
                  if (Array.isArray(parsed)) vOpts = parsed.map((o: any) => String(o).trim());
                } catch (e) {}
              }
              const optText = vOpts[vOp - 1];
              if (optText && optText.toLowerCase().trim() === lowerSel) {
                return vIdx;
              }
            }
          }
        }
      }

      if (progRes.activeOptionIndex < promptVersions.length && progRes.activeOptionIndex >= 0) {
        return progRes.activeOptionIndex;
      }
    }
  }

  return progRes.activeOptionIndex >= 0 ? progRes.activeOptionIndex : 0;
}

/**
 * Universal Step Visibility Engine for Participant SprintView, SprintPreview, and Coach Workspaces.
 * Correctly evaluates multi-version sub-step branches, cross-day D1/D2 connections, and poll option conditions
 * without hiding versioned action steps that have matching selections.
 */
export function isStepVisibleForSprint(
  stepIndex: number,
  dayContent: any,
  taskInputs: any,
  allDaysContent?: any[],
  allDaysInputs?: any[] | Record<number, any>,
  previewSprintId?: string
): boolean {
  if (!dayContent) return true;
  const viewingDay = Number(dayContent.day || 1);

  // 1. Explicit poll-to-poll / step link
  const pollLink = dayContent.taskPollOptionLinks?.[stepIndex];
  if (pollLink && pollLink !== 'none' && pollLink !== 'null') {
    let pollIdx = -1;
    let targetLinkTag = pollLink;
    let targetPollDay = viewingDay;

    if (pollLink.includes(":")) {
      const parts = pollLink.split(":");
      if (parts.length === 3) {
        const dayPart = parts[0].replace(/move|day|m|d/gi, "");
        targetPollDay = parseInt(dayPart, 10) || viewingDay;
        const stepPart = parts[1].replace("step", "");
        pollIdx = parseInt(stepPart, 10);
        targetLinkTag = parts[2];
      } else {
        const stepPart = parts[0].replace("step", "");
        pollIdx = parseInt(stepPart, 10);
        targetLinkTag = parts[1];
      }
    } else {
      if (dayContent.taskInputTypes) {
        for (let i = stepIndex - 1; i >= 0; i--) {
          if (dayContent.taskInputTypes[i] === 'poll') {
            pollIdx = i;
            break;
          }
        }
      }
      if (pollIdx === -1) {
        if (!dayContent.taskInputTypes || dayContent.taskInputTypes.length === 0 || dayContent.taskInputTypes[0] === 'poll') {
          pollIdx = 0;
        } else {
          return true;
        }
      }
    }

    if (pollIdx >= 0) {
      const pollDC = targetPollDay === viewingDay ? dayContent : (Array.isArray(allDaysContent) ? allDaysContent.find(dc => Number(dc.day) === targetPollDay) : undefined);
      let selection: string | undefined = undefined;
      if (targetPollDay === viewingDay) {
        selection = taskInputs ? (Array.isArray(taskInputs) ? taskInputs[pollIdx] : taskInputs[pollIdx]) : undefined;
      } else {
        if (allDaysInputs) {
          if (Array.isArray(allDaysInputs)) {
            const prevProg = allDaysInputs.find((p: any) => p && Number(p.day) === targetPollDay);
            if (prevProg) {
              if (Array.isArray(prevProg.answers)) selection = prevProg.answers[pollIdx];
              else if (prevProg.answersMap && typeof prevProg.answersMap === 'object') selection = (prevProg.answersMap as any)[pollIdx];
              else if (typeof prevProg.submission === 'string') selection = prevProg.submission.split(' | ')[pollIdx];
            }
          } else if (typeof allDaysInputs === 'object') {
            const dVal = (allDaysInputs as any)[targetPollDay] || (allDaysInputs as any)[targetPollDay - 1];
            if (dVal) selection = Array.isArray(dVal) ? dVal[pollIdx] : (dVal as any)[pollIdx];
          }
        }
        if (!selection && typeof sessionStorage !== 'undefined' && previewSprintId) {
          try {
            const saved = sessionStorage.getItem(`vectorise_preview_enrollment_${previewSprintId}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              const prevProg = parsed?.progress?.find((p: any) => p && Number(p.day) === targetPollDay);
              if (prevProg) {
                if (Array.isArray(prevProg.answers)) selection = prevProg.answers[pollIdx];
                else if (prevProg.answersMap) selection = (prevProg.answersMap as any)[pollIdx];
                else if (typeof prevProg.submission === 'string') selection = prevProg.submission.split(' | ')[pollIdx];
              }
            }
          } catch (e) {}
        }
      }

      if (!selection) return false;

      let customOptions: string[] = getAllStepPollOptions(pollDC, pollIdx, taskInputs, allDaysContent, allDaysInputs);
      customOptions = customOptions.filter(Boolean);

      const prog = resolveProgressiveStepSelections(stepIndex, dayContent, taskInputs, allDaysContent, allDaysInputs);
      const pollOptions = customOptions;

      let selectedOptions: string[] = [];
      try {
        if (typeof selection === 'string' && selection.startsWith("[")) {
          selectedOptions = JSON.parse(selection);
        } else {
          selectedOptions = [String(selection)];
        }
      } catch (e) {
        selectedOptions = [String(selection)];
      }

      const normTarget = targetLinkTag.toLowerCase().trim();
      const match = pollOptions.some((opt, optIndex) => {
        const tag = `poll ${optIndex + 1}`;
        if (tag === normTarget || normTarget === `op ${optIndex + 1}` || normTarget === `op${optIndex + 1}`) {
          if (prog.isNarrowed) {
            if (prog.activeOptionIndex === optIndex) return true;
            if (prog.activeSelection && opt && prog.activeSelection.toLowerCase().trim() === opt.toLowerCase().trim()) return true;
            return false;
          }
          return selectedOptions.some(s => {
            const lowerS = String(s).toLowerCase().trim();
            return lowerS === opt.toLowerCase().trim() || lowerS === tag || lowerS === String(optIndex + 1) || lowerS === `op ${optIndex + 1}` || lowerS === `op${optIndex + 1}`;
          });
        }
        return false;
      });

      if (!match) return false;
    }
  }

  // 2. Implicit placeholder branch checking
  const rawPrompt = dayContent.taskPrompts?.[stepIndex] || (stepIndex === 0 ? dayContent.taskPrompt : undefined);
  if (!rawPrompt) return true;

  const promptVersions = parseStepVersions(rawPrompt);
  const activeVerIdx = promptVersions.length > 1
    ? resolveStepVersionIndex(stepIndex, dayContent, taskInputs, allDaysContent, allDaysInputs)
    : 0;

  const checkPromptVisibility = (promptText: string): boolean => {
    if (!promptText) return true;
    const regex = /\{(?:\s*[dDmM](?:ay|ove)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal|hide|sentence|disconnect|main|h|s|l|n|d|m))?\}/gi;
    let match: RegExpExecArray | null;

    const stepPlaceholders: { dayNum?: number; stepNum: number; opNum?: number; mode: StepPlaceholderMode }[] = [];
    while ((match = regex.exec(promptText)) !== null) {
      const dayNum = match[1] ? parseInt(match[1], 10) : undefined;
      const stepNum = parseInt(match[2], 10);
      const opNum = match[3] ? parseInt(match[3], 10) : undefined;
      const mode = parsePlaceholderMode(match[4]);
      stepPlaceholders.push({ dayNum, stepNum, opNum, mode });
    }

    if (stepPlaceholders.length === 0) return true;

    for (const placeholder of stepPlaceholders) {
      const { dayNum, stepNum, opNum, mode } = placeholder;
      const targetIdx = stepNum - 1;
      const targetDay = dayNum !== undefined ? dayNum : viewingDay;

      if (targetDay <= viewingDay) {
        if (targetDay === viewingDay && targetIdx >= stepIndex) {
          continue;
        }

        const targetDC = targetDay === viewingDay ? dayContent : (Array.isArray(allDaysContent) ? allDaysContent.find(dc => Number(dc.day) === targetDay) : undefined);
        if (!targetDC) continue;

        let val: any = undefined;
        if (targetDay === viewingDay) {
          val = taskInputs ? (Array.isArray(taskInputs) ? taskInputs[targetIdx] : taskInputs[targetIdx]) : undefined;
        } else {
          if (allDaysInputs) {
            if (Array.isArray(allDaysInputs)) {
              const prevProg = allDaysInputs.find((p: any) => p && Number(p.day) === targetDay);
              if (prevProg) {
                if (Array.isArray(prevProg.answers)) val = prevProg.answers[targetIdx];
                else if (prevProg.answersMap && typeof prevProg.answersMap === 'object') val = (prevProg.answersMap as any)[targetIdx];
                else if (typeof prevProg.submission === 'string') val = prevProg.submission.split(' | ')[targetIdx];
              }
            } else if (typeof allDaysInputs === 'object') {
              const dVal = (allDaysInputs as any)[targetDay] || (allDaysInputs as any)[targetDay - 1];
              if (dVal) val = Array.isArray(dVal) ? dVal[targetIdx] : (dVal as any)[targetIdx];
            }
          }
          if (!val && typeof sessionStorage !== 'undefined' && previewSprintId) {
            try {
              const saved = sessionStorage.getItem(`vectorise_preview_enrollment_${previewSprintId}`);
              if (saved) {
                const parsed = JSON.parse(saved);
                const prevProg = parsed?.progress?.find((p: any) => p && Number(p.day) === targetDay);
                if (prevProg) {
                  if (Array.isArray(prevProg.answers)) val = prevProg.answers[targetIdx];
                  else if (prevProg.answersMap) val = (prevProg.answersMap as any)[targetIdx];
                  else if (typeof prevProg.submission === 'string') val = prevProg.submission.split(' | ')[targetIdx];
                }
              }
            } catch (e) {}
          }
        }

        // If mode is 'main' and no opNum is specified (e.g. {M1 Step 7 main}), it is an active progressive connector
        if (mode === 'main' && opNum === undefined) {
          continue;
        }

        if (!val || (typeof val === 'string' && !val.trim())) {
          return false;
        }

        if (targetDC.taskInputTypes?.[targetIdx] === 'poll' || targetDC.taskInputTypes?.[targetIdx] === 'tags') {
          let userChoices: string[] = [];
          try {
            const strVal = String(val).trim();
            if (strVal.startsWith('[')) {
              userChoices = JSON.parse(strVal);
            } else if (strVal.startsWith('{')) {
              userChoices = Object.values(JSON.parse(strVal));
            } else {
              userChoices = [strVal];
            }
          } catch (e) {
            userChoices = [String(val).trim()];
          }
          userChoices = userChoices.map(c => String(c).trim()).filter(Boolean);

          let writtenOpts: string[] = [];
          if (targetDC.taskPollOptions?.[targetIdx]) {
            try {
              writtenOpts = JSON.parse(targetDC.taskPollOptions[targetIdx]).map((s: any) => String(s).trim()).filter(Boolean);
            } catch (e) {}
          }

          const isOptionSelected = (oNum: number) => {
            const optIndex = oNum - 1;
            const targetWrittenText = writtenOpts[optIndex];
            const prog = resolveProgressiveStepSelections(stepIndex, dayContent, taskInputs, allDaysContent, allDaysInputs);
            if (prog.isNarrowed && prog.sourceStepIdx === targetIdx) {
              if (prog.activeOptionIndex === optIndex) return true;
              if (prog.activeSelection && targetWrittenText && prog.activeSelection.toLowerCase().trim() === targetWrittenText.toLowerCase().trim()) return true;
              return false;
            }
            return userChoices.some(c => {
              const lowerC = c.toLowerCase();
              if (targetWrittenText && lowerC === targetWrittenText.toLowerCase()) return true;
              if (lowerC === `poll ${oNum}` || lowerC === `op ${oNum}` || lowerC === `op${oNum}` || lowerC === String(oNum)) return true;
              return false;
            });
          };

          if (mode === 'disconnect' && opNum !== undefined) {
            if (isOptionSelected(opNum)) {
              return false; // Disconnected option selected -> hide step
            }
          } else if (opNum !== undefined) {
            if (!isOptionSelected(opNum)) {
              return false;
            }
          }
        }
      }
    }

    return true;
  };

  if (promptVersions.length > 1) {
    const activeVersionPrompt = promptVersions[activeVerIdx] || promptVersions[0];
    if (checkPromptVisibility(activeVersionPrompt)) {
      return true;
    }
    return promptVersions.some(vPrompt => checkPromptVisibility(vPrompt));
  } else {
    return checkPromptVisibility(rawPrompt);
  }
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

  const movePrefix = (dayNum !== undefined && dayContent.day && Number(dayContent.day) !== dayNum) ? `M${dayContent.day} ` : '';

  // Track linked connections to provide combined origin + linked step tokens
  const pollLinkRaw = dayContent.taskPollOptionLinks?.[currentStepIdx];
  const pollLinkInfo = parsePollLinkInfo(pollLinkRaw);

  if (pollLinkInfo) {
    const origStepNum = pollLinkInfo.targetPollIdx + 1;
    const origOpNum = pollLinkInfo.optNum || 1;
    const currentStepNum = currentStepIdx + 1;

    tokens.push({
      token: `{${movePrefix}Step ${origStepNum} op ${origOpNum}} {Step ${currentStepNum}}`,
      label: `${movePrefix}Step ${origStepNum} op ${origOpNum} → Step ${currentStepNum}`,
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
      token: `{${movePrefix}Step ${stepNum}}`,
      label: `${movePrefix}Step ${stepNum}`,
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
          token: `{${movePrefix}Step ${stepNum} op ${o}}`,
          label: `${movePrefix}${stepNum} op ${o}`,
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
