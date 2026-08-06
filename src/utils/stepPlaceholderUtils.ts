export interface StepPlaceholderDetail {
  stepNum: number;
  opNum?: number;
  mode: 'normal' | 'list';
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

/**
 * Validates `{step N}`, `{Step N list}`, `{Step N normal}`, or `{Step N OpM}` placeholders in prompt text.
 * Rule:
 * - Placeholders can be used on ANY step input type ('text', 'tags', 'poll', 'mark', 'note', 'none') to receive input from a preceding step.
 * - For option syntax `{Step N OpM}`, the target step MUST have inputType 'poll'.
 * - Placeholders must reference a preceding step (stepNum < current stepIndex + 1).
 */
export function validateStepPlaceholders(
  prompt: string,
  stepIndex: number,
  taskInputTypes: string[],
  taskTags?: string[][],
  taskPollOptions?: string[][]
): StepPlaceholderValidation {
  if (!prompt) return { isValid: true, hasPlaceholders: false, invalidStepRefs: [], validStepRefs: [], validStepLabels: [], invalidStepLabels: [], placeholderDetails: [] };

  const regex = /\{[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal))?\}/gi;
  let match: RegExpExecArray | null;
  const references: StepPlaceholderDetail[] = [];

  while ((match = regex.exec(prompt)) !== null) {
    const stepNum = parseInt(match[1], 10);
    const opNum = match[2] ? parseInt(match[2], 10) : undefined;
    const modeStr = match[3] ? match[3].toLowerCase() : undefined;
    const mode: 'normal' | 'list' = modeStr === 'list' ? 'list' : 'normal';
    const rawLabel = opNum !== undefined ? `${stepNum} Op${opNum}` : `${stepNum}`;
    const token = match[0];

    if (!references.some(r => r.token === token)) {
      references.push({ stepNum, opNum, mode, rawLabel, token });
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
    const targetIndex = ref.stepNum - 1; // 1-based to 0-based

    // Check 1: Must precede current step
    if (targetIndex < 0 || targetIndex >= stepIndex) {
      invalidStepRefs.push(ref.stepNum);
      invalidStepLabels.push(ref.rawLabel);
      if (!invalidReason) {
        invalidReason = `Invalid placeholder {step ${ref.rawLabel}}: Step ${ref.stepNum} must precede Step ${stepIndex + 1}.`;
      }
      continue;
    }

    const targetType = taskInputTypes?.[targetIndex];

    // Check 2: Target step input type for option syntax
    if (ref.opNum !== undefined) {
      if (targetType !== 'poll') {
        invalidStepRefs.push(ref.stepNum);
        invalidStepLabels.push(ref.rawLabel);
        if (!invalidReason) {
          invalidReason = `Invalid placeholder {step ${ref.rawLabel}}: Option syntax (Op${ref.opNum}) can only be used on 'poll' steps. Step ${ref.stepNum} is set to '${targetType || 'text'}'.`;
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
      errorMsg: invalidReason || `Invalid placeholder logic: ${invalidStepLabels.map(l => `{step ${l}}`).join(', ')}.`
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
 * Toggles or sets the mode ('normal' | 'list') of a {Step N} placeholder within a prompt string.
 */
export function togglePlaceholderMode(
  prompt: string,
  targetStepNum: number,
  targetMode: 'normal' | 'list'
): string {
  if (!prompt) return prompt;

  const regex = /\{[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal))?\}/gi;

  return prompt.replace(regex, (fullMatch, stepNumStr, opNumStr) => {
    const stepNum = parseInt(stepNumStr, 10);
    if (stepNum !== targetStepNum) {
      return fullMatch;
    }

    const opNum = opNumStr ? parseInt(opNumStr, 10) : undefined;
    const opPart = opNum !== undefined ? ` Op${opNum}` : '';
    const modePart = targetMode === 'list' ? ' list' : '';

    return `{Step ${stepNum}${opPart}${modePart}}`;
  });
}

/**
 * Replaces `{step N}` or `{Step N list}` or `{Step N OpM}` placeholders in prompt with user's choices from step N.
 */
export function formatInterpolatedText(
  prompt: string,
  dayContent?: any,
  taskInputs?: any
): string {
  if (!prompt) return '';

  const regex = /\{[sS]?tep\s*(\d+)(?:\s*[oO][pP]\s*(\d+))?(?:\s*(list|normal))?\}/gi;

  // First pass: identify explicitly called written option indices for each step across all step prompts in the day
  const explicitlyCalledOptsMap = new Map<number, Set<number>>();

  const scanPromptForOpClaims = (pStr: string) => {
    if (!pStr || typeof pStr !== 'string') return;
    const scanRegex = /\{[sS]?tep\s*(\d+)\s*[oO][pP]\s*(\d+)(?:\s*(?:list|normal))?\}/gi;
    let m: RegExpExecArray | null;
    while ((m = scanRegex.exec(pStr)) !== null) {
      const sNum = parseInt(m[1], 10);
      const oNum = parseInt(m[2], 10);
      const sIdx = sNum - 1;
      const oIdx = oNum - 1;
      if (!explicitlyCalledOptsMap.has(sIdx)) {
        explicitlyCalledOptsMap.set(sIdx, new Set());
      }
      explicitlyCalledOptsMap.get(sIdx)!.add(oIdx);
    }
  };

  if (Array.isArray(dayContent?.taskPrompts)) {
    dayContent.taskPrompts.forEach((p: string) => scanPromptForOpClaims(p));
  }
  scanPromptForOpClaims(prompt);

  // Helper to get custom written poll options for a step (defined directly in setup)
  const getWrittenPollOptions = (stepIndex: number): string[] => {
    if (dayContent?.taskPollOptions?.[stepIndex]) {
      try {
        const parsed = JSON.parse(dayContent.taskPollOptions[stepIndex]);
        if (Array.isArray(parsed)) return parsed.map((s: any) => String(s).trim()).filter(Boolean);
      } catch (e) {}
    }
    return [];
  };

  // Helper to get all options for a poll step (combining linked sources + custom written poll options)
  const getPollOptionsList = (stepIndex: number): string[] => {
    const customOptions = getWrittenPollOptions(stepIndex);

    let linkedItems: string[] = [];
    if (Array.isArray(dayContent?.taskLinkedSources?.[stepIndex])) {
      dayContent.taskLinkedSources[stepIndex].forEach((srcIdx: number) => {
        if (srcIdx >= 0 && srcIdx < stepIndex) {
          const val = taskInputs?.[srcIdx];
          if (val) {
            if (typeof val === 'string' && val.trim().startsWith('[')) {
              try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) linkedItems.push(...parsed.filter(Boolean));
              } catch (e) {}
            } else if (typeof val === 'string') {
              linkedItems.push(...val.split(',').map((s: string) => s.trim()).filter(Boolean));
            }
          } else {
            const srcType = dayContent?.taskInputTypes?.[srcIdx];
            if (srcType === 'tags') {
              const configuredTags = dayContent?.taskTags?.[srcIdx];
              if (Array.isArray(configuredTags)) linkedItems.push(...configuredTags.filter(Boolean));
            } else if (srcType === 'poll') {
              const configuredPoll = dayContent?.taskPollOptions?.[srcIdx];
              if (configuredPoll) {
                try {
                  const parsed = JSON.parse(configuredPoll);
                  if (Array.isArray(parsed)) linkedItems.push(...parsed.filter(Boolean));
                } catch (e) {}
              }
            }
          }
        }
      });
    }

    return Array.from(new Set([...linkedItems, ...customOptions])).filter(Boolean);
  };

  regex.lastIndex = 0;

  return prompt.replace(regex, (fullMatch, stepNumStr, opNumStr, modeStr) => {
    const stepNum = parseInt(stepNumStr, 10);
    const opNum = opNumStr ? parseInt(opNumStr, 10) : undefined;
    const mode: 'normal' | 'list' = modeStr && modeStr.toLowerCase() === 'list' ? 'list' : 'normal';
    const stepIndex = stepNum - 1;

    const inputType = dayContent?.taskInputTypes?.[stepIndex];

    const formatOutput = (rawList: string[]): string => {
      const cleaned = rawList.map((item) => item.trim()).filter(Boolean);

      if (cleaned.length === 0) {
        return opNum !== undefined ? `[Step ${stepNum} Op${opNum}]` : `[Step ${stepNum}]`;
      }

      if (mode === 'list') {
        return '\n' + cleaned.map((item) => `• ${item}`).join('\n');
      }

      return cleaned.map(c => c.toLowerCase()).join(', ');
    };

    // CASE 1: Explicit Option Reference e.g. {Step 6 Op1}
    if (opNum !== undefined) {
      if (inputType !== 'poll') {
        return fullMatch;
      }
      const optIndex = opNum - 1;
      const writtenOpts = getWrittenPollOptions(stepIndex);
      if (optIndex >= 0 && optIndex < writtenOpts.length) {
        const targetWrittenText = writtenOpts[optIndex].trim();
        if (!targetWrittenText) return `[Step ${stepNum} Op${opNum}]`;

        const val = taskInputs?.[stepIndex];
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
          const matchChoice = userChoices.find((c) => c.toLowerCase() === targetWrittenText.toLowerCase());
          if (matchChoice) {
            return formatOutput([matchChoice]);
          }
        }

        return formatOutput([targetWrittenText]);
      }
      return `[Step ${stepNum} Op${opNum}]`;
    }

    // CASE 2: General Step Reference e.g. {Step 6}
    let items: string[] = [];
    const val = taskInputs?.[stepIndex];

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
      if (inputType === 'tags') {
        const configuredTags = dayContent?.taskTags?.[stepIndex] || [];
        if (Array.isArray(configuredTags) && configuredTags.length > 0) items = configuredTags;
      } else if (inputType === 'poll') {
        items = getPollOptionsList(stepIndex);
      } else if (inputType === 'text' || inputType === 'note') {
        const promptText = dayContent?.taskPrompts?.[stepIndex];
        if (promptText) items = [promptText];
      }
    }

    // EXCLUSION RULE: If specific written options (e.g. Op1) for this step were explicitly called,
    // exclude those written options from general {Step N} expansion!
    if (inputType === 'poll' && explicitlyCalledOptsMap.has(stepIndex)) {
      const excludedOptIndices = explicitlyCalledOptsMap.get(stepIndex)!;
      const writtenOptsList = getWrittenPollOptions(stepIndex);
      const excludedTexts = new Set<string>();

      excludedOptIndices.forEach((idx) => {
        if (idx >= 0 && idx < writtenOptsList.length) {
          excludedTexts.add(writtenOptsList[idx].trim().toLowerCase());
        }
      });

      if (excludedTexts.size > 0) {
        const filteredItems = items.filter((item) => !excludedTexts.has(item.trim().toLowerCase()));
        if (filteredItems.length > 0) {
          items = filteredItems;
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
    const inputTypes = day.taskInputTypes || Array(day.taskPrompts.length).fill('text');
    for (let i = 0; i < day.taskPrompts.length; i++) {
      const prompt = day.taskPrompts[i];
      if (!prompt) continue;
      const val = validateStepPlaceholders(prompt, i, inputTypes);
      if (!val.isValid) {
        return true;
      }
    }
  }

  return false;
}
