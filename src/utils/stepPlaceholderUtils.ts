export interface StepPlaceholderValidation {
  isValid: boolean;
  hasPlaceholders: boolean;
  invalidStepRefs: number[];
  validStepRefs: number[];
  errorMsg?: string;
  isLogicLinked?: boolean;
}

/**
 * Validates `{step N}` or `{Step N}` placeholders in prompt text.
 * Rule:
 * - Placeholders must only be used on inputType 'none' steps if validly referencing a preceding 'tags' or 'poll' step.
 * - If inputType is NOT 'none' OR if a placeholder references a non-preceding step / non-tags-or-poll step: INVALID (error).
 */
export function validateStepPlaceholders(
  prompt: string,
  stepIndex: number,
  taskInputTypes: string[],
  taskTags?: string[][],
  taskPollOptions?: string[][]
): StepPlaceholderValidation {
  if (!prompt) return { isValid: true, hasPlaceholders: false, invalidStepRefs: [], validStepRefs: [] };

  const regex = /\{[sS]?tep\s*(\d+)\}/g;
  let match;
  const referencedSteps: number[] = [];
  while ((match = regex.exec(prompt)) !== null) {
    const stepNum = parseInt(match[1], 10);
    if (!referencedSteps.includes(stepNum)) {
      referencedSteps.push(stepNum);
    }
  }

  if (referencedSteps.length === 0) {
    return { isValid: true, hasPlaceholders: false, invalidStepRefs: [], validStepRefs: [] };
  }

  const currentInputType = taskInputTypes?.[stepIndex] || 'text';
  const invalidStepRefs: number[] = [];
  const validStepRefs: number[] = [];

  for (const stepNum of referencedSteps) {
    const targetIndex = stepNum - 1; // 1-based to 0-based
    // Check 1: Must precede current step
    if (targetIndex < 0 || targetIndex >= stepIndex) {
      invalidStepRefs.push(stepNum);
      continue;
    }

    // Check 2: Target step input type must be 'tags' or 'poll'
    const targetType = taskInputTypes?.[targetIndex];
    if (targetType !== 'tags' && targetType !== 'poll') {
      invalidStepRefs.push(stepNum);
      continue;
    }

    validStepRefs.push(stepNum);
  }

  // Check 3: Placeholder syntax is only valid on input type 'none'
  if (currentInputType !== 'none') {
    return {
      isValid: false,
      hasPlaceholders: true,
      invalidStepRefs: referencedSteps,
      validStepRefs: [],
      errorMsg: `Placeholder logic {step N} can only be used when Input Type is 'none'. Step ${stepIndex + 1} is currently set to '${currentInputType}'.`
    };
  }

  if (invalidStepRefs.length > 0) {
    const errText = invalidStepRefs.map(n => `{step ${n}}`).join(', ');
    return {
      isValid: false,
      hasPlaceholders: true,
      invalidStepRefs,
      validStepRefs,
      errorMsg: `Invalid placeholder ${errText}: Step ${invalidStepRefs.join(', ')} must precede Step ${stepIndex + 1} and have input type 'tags' or 'poll'.`
    };
  }

  return {
    isValid: true,
    hasPlaceholders: true,
    invalidStepRefs: [],
    validStepRefs,
    isLogicLinked: true
  };
}

/**
 * Replaces `{step N}` or `{Step N}` placeholders in prompt with user's choices from step N.
 */
export function formatInterpolatedText(
  prompt: string,
  dayContent: any,
  taskInputs: string[]
): string {
  if (!prompt) return '';

  return prompt.replace(/\{[sS]?tep\s*(\d+)\}/g, (fullMatch, stepNumStr, offset, fullString) => {
    const stepNum = parseInt(stepNumStr, 10);
    const stepIndex = stepNum - 1;

    const inputType = dayContent?.taskInputTypes?.[stepIndex];
    if (inputType !== 'tags' && inputType !== 'poll') {
      return fullMatch;
    }

    let items: string[] = [];
    const val = taskInputs?.[stepIndex];

    if (val && typeof val === 'string' && val.trim()) {
      try {
        if (val.trim().startsWith('[') && val.trim().endsWith(']')) {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) items = parsed.filter(Boolean);
        } else if (val.trim().startsWith('{') && val.trim().endsWith('}')) {
          const parsed = JSON.parse(val);
          items = Object.values(parsed).filter((v): v is string => typeof v === 'string' && Boolean(v));
        } else {
          items = [val.trim()];
        }
      } catch (e) {
        items = [val.trim()];
      }
    }

    // Fallback if no participant input yet
    if (items.length === 0) {
      if (inputType === 'tags') {
        const configuredTags = dayContent?.taskTags?.[stepIndex] || [];
        if (configuredTags.length > 0) items = configuredTags;
      } else if (inputType === 'poll') {
        const configuredPoll = dayContent?.taskPollOptions?.[stepIndex] || [];
        if (configuredPoll.length > 0) items = configuredPoll;
      }
    }

    if (items.length === 0) {
      return `[Step ${stepNum}]`;
    }

    const isMatchCapitalized = fullMatch.startsWith('{S');
    const isStartOfSentence = offset === 0 || /[.!?]\s*$/.test(fullString.slice(0, offset));
    const shouldCapitalize = isMatchCapitalized || isStartOfSentence;

    const formattedItems = items.map((item, idx) => {
      const clean = item.trim();
      if (!clean) return '';
      if (idx === 0 && shouldCapitalize) {
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      } else {
        return clean.toLowerCase();
      }
    }).filter(Boolean);

    // If 1 item: no comma e.g. "eating"
    // If multiple items: comma separated e.g. "eating, sleeping, reading"
    return formattedItems.join(', ');
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
