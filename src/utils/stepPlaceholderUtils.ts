export type StepPlaceholderMode = 'normal' | 'list' | 'hide' | 'sentence';

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
  if (m === 's' || m === 'sentence') return 'sentence';
  if (m === 'list' || m === 'l') return 'list';
  if (m === 'normal' || m === 'n') return 'normal';
  return 'normal';
}

/**
 * Regex matching placeholders like {Step 1}, {Step 1 Op2}, {D1 Step 3}, {D2 Step 4 Op1}, {Day 1 Step 3 list}, {d2 step 4 op 1 h}, etc.
 */
export const PLACEHOLDER_REGEX = /\{(?:\s*[dD](?:ay)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal|hide|sentence|h|s|l|n))?\}/gi;

/**
 * Validates `{step N}`, `{D1 Step 3}`, `{D2 Step 4 op 1}`, `{Step N list}`, `{Step N h}` etc. placeholders in prompt text.
 * Rules:
 * - Can reference steps on current day (must precede current step: stepNum < stepIndex + 1).
 * - Can reference steps on previous days (D1, D2, Day 1, etc where targetDay <= currentDay).
 * - For option syntax `{Step N OpM}` or `{D2 Step 4 Op1}`, the target step MUST have inputType 'poll'.
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

  const regex = /\{(?:\s*[dD](?:ay)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal|hide|sentence|h|s|l|n))?\}/gi;
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
      if (targetType && targetType !== 'poll') {
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
    else if (targetMode === 'sentence') modePart = ' s';

    return `{${dayPart}Step ${stepNum}${opPart}${modePart}}`;
  });
}

/**
 * Replaces `{step N}`, `{D1 Step 3}`, `{D2 Step 4 op 1}`, `{Step N list}` etc. placeholders in prompt with user's choices.
 */
export function formatInterpolatedText(
  prompt: string,
  dayContent?: any,
  taskInputs?: any,
  allDaysContent?: any[],
  allDaysInputs?: any[] | Record<number, any>
): string {
  if (!prompt) return '';

  const regex = /\{(?:\s*[dD](?:ay)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal|hide|sentence|h|s|l|n))?\}/gi;

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
        // Check if items are enrollment progress objects e.g. { day: 1, answers: [...] }
        const prog = allDaysInputs.find((p: any) => p && Number(p.day) === targetDay);
        if (prog) {
          if (Array.isArray(prog.answers)) return prog.answers[targetStepIdx];
          if (Array.isArray(prog.answersMap)) return prog.answersMap[targetStepIdx];
        }
        // Fallback: 0-indexed array of day inputs
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

    // Fallback if targetDay is current day
    if (targetDay === currentDayNum && taskInputs) {
      if (Array.isArray(taskInputs)) return taskInputs[targetStepIdx];
      if (typeof taskInputs === 'object') return taskInputs[targetStepIdx];
    }

    return undefined;
  };

  // Helper to get custom written poll options for a step
  const getWrittenPollOptions = (targetDC: any, stepIndex: number): string[] => {
    if (targetDC?.taskPollOptions?.[stepIndex]) {
      try {
        const parsed = JSON.parse(targetDC.taskPollOptions[stepIndex]);
        if (Array.isArray(parsed)) return parsed.map((s: any) => String(s).trim()).filter(Boolean);
      } catch (e) {}
    }
    return [];
  };

  // Helper to get all options for a poll step (combining linked sources + custom written poll options)
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
          if (srcType === 'tags') {
            const configuredPoll = srcDC?.taskPollOptions?.[srcStepIdx];
            if (configuredPoll) {
              try {
                const parsed = JSON.parse(configuredPoll);
                if (Array.isArray(parsed)) linkedItems.push(...parsed.filter(Boolean));
              } catch (e) {}
            }
          } else if (srcType === 'poll') {
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
      if (mode === 'hide') {
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
      if (inputType !== 'poll') {
        return fullMatch;
      }
      const optIndex = opNum - 1;
      const writtenOpts = getWrittenPollOptions(targetDC, stepIndex);
      if (optIndex >= 0 && optIndex < writtenOpts.length) {
        const targetWrittenText = writtenOpts[optIndex].trim();
        if (!targetWrittenText) return `[${dayPrefix}Step ${stepNum} Op${opNum}]`;

        const val = getTargetInputValue(targetDay, stepIndex);
        let userChoices: string[] = [];
        if (val && typeof val === 'string' && val.trim()) {
          try {
            if (val.trim().startsWith('[')) {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) userChoices = parsed.filter(Boolean);
            } else if (val.trim().startsWith('{')) {
              const parsed = JSON.parse(val);
              userChoices = Object.values(parsed).filter((v): v is string => typeof v === 'string' && Boolean(v));
            } else {
              userChoices = [val.trim()];
            }
          } catch (e) {
            userChoices = [val.trim()];
          }
        }
        userChoices = userChoices.map((c) => String(c).trim()).filter(Boolean);

        if (userChoices.length > 0) {
          const matchChoice = userChoices.find((c) => {
            const lowerC = c.toLowerCase();
            return lowerC === targetWrittenText.toLowerCase() ||
                   lowerC === `poll ${opNum}` ||
                   lowerC === `op ${opNum}` ||
                   lowerC === `op${opNum}` ||
                   lowerC === String(opNum);
          });
          if (matchChoice) {
            return formatOutput([targetWrittenText]);
          }
        }

        return formatOutput([targetWrittenText]);
      }
      return `[${dayPrefix}Step ${stepNum} Op${opNum}]`;
    }

    // CASE 2: General Step Reference e.g. {D1 Step 3} or {Step 6}
    let items: string[] = [];
    const val = getTargetInputValue(targetDay, stepIndex);

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

    // Fallback if no participant input yet
    if (items.length === 0) {
      if (inputType === 'poll') {
        items = getPollOptionsList(targetDC, stepIndex);
      } else if (inputType === 'text' || inputType === 'note') {
        const promptText = targetDC?.taskPrompts?.[stepIndex];
        if (promptText) items = [promptText];
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
 * Returns helper tokens for Task Hints (e.g. {Step 1}, {Step 1 op 1}, {Step 1 op 2}, {Step 2}...)
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
