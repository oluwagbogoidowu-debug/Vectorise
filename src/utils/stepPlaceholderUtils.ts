export type StepPlaceholderMode = 'normal' | 'list' | 'hide' | 'sentence' | 'disconnect' | 'main';

export interface MetadataFieldDef {
  key: string;
  label: string;
  category?: string;
  aliases: string[];
  placeholderSample: string;
}

export const DEFAULT_METADATA_FIELDS: MetadataFieldDef[] = [
  { key: 'lifeStage', label: 'Life Stage', category: 'Identity', aliases: ['lifestage', 'life stage', 'stage'], placeholderSample: 'College Graduate' },
  { key: 'currentGoal', label: 'Current Goal', category: 'Objectives', aliases: ['currentgoal', 'current goal', 'goal', 'primarygoal'], placeholderSample: 'Secure first tech role' },
  { key: 'currentPriority', label: 'Current Priority', category: 'Objectives', aliases: ['currentpriority', 'current priority', 'priority'], placeholderSample: 'Portfolio building & networking' },
  { key: 'desiredDirection', label: 'Desired Direction', category: 'Progression', aliases: ['desireddirection', 'desired direction', 'direction', 'pathway', 'risepathway'], placeholderSample: 'Full-Stack Product Engineering' },
  { key: 'interests', label: 'Interests', category: 'Identity', aliases: ['interests', 'interest', 'growthareas', 'growth areas'], placeholderSample: 'AI Systems, Web Development' },
  { key: 'strengths', label: 'Strengths', category: 'Experience', aliases: ['strengths', 'strength', 'skills'], placeholderSample: 'System Design, Rapid Prototyping' },
  { key: 'occupation', label: 'Occupation / Role', category: 'Demographics', aliases: ['occupation', 'role', 'job', 'career'], placeholderSample: 'Product Designer' },
  { key: 'industry', label: 'Industry / Domain', category: 'Demographics', aliases: ['industry', 'domain', 'sector'], placeholderSample: 'FinTech & AI' },
  { key: 'gender', label: 'Gender', category: 'Demographics', aliases: ['gender', 'sex'], placeholderSample: 'Female' },
  { key: 'targetNiche', label: 'Target Audience / Niche', category: 'Business', aliases: ['targetniche', 'target niche', 'niche', 'audience'], placeholderSample: 'Early-stage SaaS Founders' },
];

export const METADATA_FIELDS: MetadataFieldDef[] = [...DEFAULT_METADATA_FIELDS];

// Load initial custom metadata from localStorage if present
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem('vectorise_system_metadata_fields');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const map = new Map<string, MetadataFieldDef>();
        DEFAULT_METADATA_FIELDS.forEach(f => map.set(f.key.toLowerCase(), { ...f }));
        parsed.forEach((f: any) => {
          if (f && f.key && f.label && f.isActive !== false) {
            map.set(f.key.toLowerCase(), {
              key: f.key,
              label: f.label,
              category: f.category || 'Custom',
              aliases: Array.isArray(f.aliases) ? f.aliases : [f.key.toLowerCase(), f.label.toLowerCase()],
              placeholderSample: f.placeholderSample || 'Sample text'
            });
          }
        });
        METADATA_FIELDS.length = 0;
        METADATA_FIELDS.push(...Array.from(map.values()));
      }
    }
  } catch (e) {}

  window.addEventListener('vectorise_metadata_fields_updated', ((e: CustomEvent) => {
    if (e.detail && Array.isArray(e.detail)) {
      setDynamicMetadataFields(e.detail);
    }
  }) as EventListener);
}

export function setDynamicMetadataFields(fields: any[]) {
  const map = new Map<string, MetadataFieldDef>();
  DEFAULT_METADATA_FIELDS.forEach(f => map.set(f.key.toLowerCase(), { ...f }));
  if (Array.isArray(fields)) {
    fields.forEach((f: any) => {
      if (f && f.key && f.label && f.isActive !== false) {
        map.set(f.key.toLowerCase(), {
          key: f.key,
          label: f.label,
          category: f.category || 'Custom',
          aliases: Array.isArray(f.aliases) ? f.aliases : [f.key.toLowerCase(), f.label.toLowerCase()],
          placeholderSample: f.placeholderSample || 'Sample text'
        });
      }
    });
  }
  METADATA_FIELDS.length = 0;
  METADATA_FIELDS.push(...Array.from(map.values()));
}

export function getMetadataFields(): MetadataFieldDef[] {
  return METADATA_FIELDS;
}


export interface MetadataTokenDetail {
  raw: string;
  fieldKey: string;
  fieldLabel: string;
  mode: 'save' | 'receive';
  formatMode?: StepPlaceholderMode;
  token: string;
}

export const METADATA_TOKEN_REGEX = /\{(?:\s*metadata(?:\s*[:\-]?\s*([^}]+?))?)\s*\}/gi;

/**
 * Parses inner metadata directive parts (e.g. "Interests list", "Current Goal save s", "list", "save", "s")
 */
function parseMetadataInnerParts(innerStr: string): {
  fieldKey: string;
  fieldLabel: string;
  mode: 'save' | 'receive';
  formatMode: StepPlaceholderMode;
} {
  let text = innerStr.trim();
  if (text.toLowerCase().startsWith('metadata')) {
    text = text.slice(8).trim();
  }
  text = text.replace(/^[:\-]+/, '').trim();

  let mode: 'save' | 'receive' = 'receive';
  let formatMode: StepPlaceholderMode = 'normal';

  // Check for save / receive flags
  if (/\b(?:save)\b/i.test(text)) {
    mode = 'save';
    text = text.replace(/\b(?:save)\b/gi, '').trim();
  } else if (/\b(?:receive)\b/i.test(text)) {
    mode = 'receive';
    text = text.replace(/\b(?:receive)\b/gi, '').trim();
  }

  // Check for format modes
  if (/\b(?:list|l)\b/i.test(text)) {
    formatMode = 'list';
    text = text.replace(/\b(?:list|l)\b/gi, '').trim();
  } else if (/\b(?:sentence)\b/i.test(text)) {
    formatMode = 'sentence';
    text = text.replace(/\b(?:sentence)\b/gi, '').trim();
  } else if (/\b(?:hide|h)\b/i.test(text)) {
    formatMode = 'hide';
    text = text.replace(/\b(?:hide|h)\b/gi, '').trim();
  } else if (/\b(?:main|m)\b/i.test(text)) {
    formatMode = 'main';
    text = text.replace(/\b(?:main|m)\b/gi, '').trim();
  } else if (/\b(?:disconnect|d)\b/i.test(text)) {
    formatMode = 'disconnect';
    text = text.replace(/\b(?:disconnect|d)\b/gi, '').trim();
  } else if (/\b(?:normal|n)\b/i.test(text)) {
    formatMode = 'normal';
    text = text.replace(/\b(?:normal|n)\b/gi, '').trim();
  } else if (/\b(?:s)\b/i.test(text)) {
    // Shorthand 's' without explicit save is sentence mode
    formatMode = 'sentence';
    text = text.replace(/\b(?:s)\b/gi, '').trim();
  }

  text = text.replace(/^[:\-]+/, '').replace(/[:\-]+$/, '').trim();
  const fieldDef = normalizeMetadataField(text);

  return {
    fieldKey: fieldDef ? fieldDef.key : text,
    fieldLabel: fieldDef ? fieldDef.label : (text || 'Metadata'),
    mode,
    formatMode
  };
}

/**
 * Normalizes a field string against METADATA_FIELDS
 */
export function normalizeMetadataField(rawField?: string): MetadataFieldDef | null {
  if (!rawField) return null;
  const clean = rawField.toLowerCase().replace(/[\s_\-]+/g, '');
  if (!clean) return null;
  for (const def of METADATA_FIELDS) {
    if (def.key.toLowerCase() === clean) return def;
    if (def.label.toLowerCase().replace(/[\s_\-]+/g, '') === clean) return def;
    for (const alias of def.aliases) {
      if (alias.toLowerCase().replace(/[\s_\-]+/g, '') === clean) return def;
    }
  }
  // Partial substring match
  for (const def of METADATA_FIELDS) {
    const defClean = def.label.toLowerCase().replace(/[\s_\-]+/g, '');
    if (clean.includes(defClean) || defClean.includes(clean)) return def;
  }
  return null;
}

/**
 * Parses a single `{Metadata ...}` string
 */
export function parseMetadataToken(tokenStr: string): MetadataTokenDetail | null {
  if (!tokenStr) return null;
  const trimmed = tokenStr.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

  const inner = trimmed.slice(1, -1).trim();
  if (!inner.toLowerCase().startsWith('metadata')) return null;

  const parsed = parseMetadataInnerParts(inner);
  return {
    raw: trimmed,
    fieldKey: parsed.fieldKey,
    fieldLabel: parsed.fieldLabel,
    mode: parsed.mode,
    formatMode: parsed.formatMode,
    token: trimmed
  };
}

/**
 * Extracts all `{Metadata ...}` tokens from text
 */
export function extractMetadataTokens(text: string): MetadataTokenDetail[] {
  if (!text) return [];
  const results: MetadataTokenDetail[] = [];
  const regex = /\{(?:\s*metadata(?:\s*[:\-]?\s*([^}]+?))?)\s*\}/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const full = match[0];
    const inner = full.slice(1, -1).trim();
    const parsed = parseMetadataInnerParts(inner);

    results.push({
      raw: full,
      fieldKey: parsed.fieldKey,
      fieldLabel: parsed.fieldLabel,
      mode: parsed.mode,
      formatMode: parsed.formatMode,
      token: full
    });
  }

  return results;
}

/**
 * Resolves the stored value of a metadata field from user object or cache
 */
export function resolveUserMetadataValue(fieldKeyOrAlias: string, userOrMetadata?: any): string {
  let target = userOrMetadata;
  if (!target && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('vectorise_user') || localStorage.getItem('user');
      if (stored) {
        target = JSON.parse(stored);
      }
    } catch (e) {}
  }
  if (!target) return '';

  const fieldDef = normalizeMetadataField(fieldKeyOrAlias);
  const targetKey = fieldDef ? fieldDef.key : fieldKeyOrAlias;
  const norm = targetKey.toLowerCase().replace(/[\s_\-]+/g, '');

  // 1. Direct metadata object: target.metadata, target.userMetadata, target.identificationData
  const metaObj = target.metadata || target.userMetadata || target.identificationData;
  if (typeof metaObj === 'object' && metaObj !== null) {
    if (metaObj[targetKey] !== undefined && metaObj[targetKey] !== null) {
      const val = metaObj[targetKey];
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && val !== null && 'value' in val) return String((val as any).value);
      if (Array.isArray(val)) return val.join(', ');
    }
    for (const [k, v] of Object.entries(metaObj)) {
      const kNorm = k.toLowerCase().replace(/[\s_\-]+/g, '');
      if (kNorm === norm || (norm && (kNorm.includes(norm) || norm.includes(kNorm)))) {
        if (typeof v === 'string') return v;
        if (typeof v === 'object' && v !== null && 'value' in v) return String((v as any).value);
        if (Array.isArray(v)) return v.join(', ');
      }
    }
  }

  // 2. Direct top-level properties on user
  if (norm.includes('lifestage') || norm === 'stage') {
    return target.lifeStage || target.occupation || target.persona || '';
  }
  if (norm.includes('goal')) {
    return target.currentGoal || target.primaryGoal || target.goal || '';
  }
  if (norm.includes('priority')) {
    return target.currentPriority || target.priority || '';
  }
  if (norm.includes('direction') || norm.includes('pathway')) {
    return target.desiredDirection || target.risePathway || target.direction || '';
  }
  if (norm.includes('interest')) {
    if (Array.isArray(target.interests)) return target.interests.join(', ');
    if (typeof target.interests === 'string') return target.interests;
    if (Array.isArray(target.growthAreas)) return target.growthAreas.join(', ');
    return target.interests || '';
  }
  if (norm.includes('strength')) {
    if (Array.isArray(target.strengths)) return target.strengths.join(', ');
    if (typeof target.strengths === 'string') return target.strengths;
    return target.strengths || '';
  }

  if (target[targetKey] !== undefined && target[targetKey] !== null) {
    const val = target[targetKey];
    return Array.isArray(val) ? val.join(', ') : String(val);
  }

  return '';
}

/**
 * Replaces `{Metadata <field> receive}`, `{Metadata list}`, `{Metadata sentence}` etc. with user's stored metadata value,
 * and removes `{Metadata <field> save}` from participant view.
 */
export function interpolateMetadataInText(text: string, userOrMetadata?: any): string {
  if (!text || typeof text !== 'string') return '';
  const tokens = extractMetadataTokens(text);
  if (tokens.length === 0) return text;

  let result = text;
  for (const tokenDetail of tokens) {
    if (tokenDetail.mode === 'save') {
      // Save directives are instructions to store user answers; hide them in rendered prompt text
      result = result.replace(tokenDetail.token, '');
      continue;
    }

    if (tokenDetail.formatMode === 'hide' || tokenDetail.formatMode === 'disconnect') {
      result = result.replace(tokenDetail.token, '');
      continue;
    }

    const fieldDef = normalizeMetadataField(tokenDetail.fieldKey);
    const resolvedVal = resolveUserMetadataValue(tokenDetail.fieldKey || '', userOrMetadata);

    let replacement = '';
    if (resolvedVal && resolvedVal.trim()) {
      const rawVal = resolvedVal.trim();

      // Split into items if comma or newline separated
      let items: string[] = [];
      if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
        try {
          const parsed = JSON.parse(rawVal);
          if (Array.isArray(parsed)) items = parsed.map(String).map(s => s.trim()).filter(Boolean);
        } catch (e) {}
      }
      if (items.length === 0) {
        items = rawVal.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      }
      if (items.length === 0) {
        items = [rawVal];
      }

      if (tokenDetail.formatMode === 'list') {
        replacement = '\n' + items.map(item => `• ${item}`).join('\n');
      } else if (tokenDetail.formatMode === 'sentence') {
        replacement = items.map(item => {
          if (!item) return item;
          return item.charAt(0).toUpperCase() + item.slice(1);
        }).join(', ');
      } else if (tokenDetail.formatMode === 'main') {
        replacement = items[0] || rawVal;
      } else {
        // normal mode
        replacement = items.map(c => c.toLowerCase()).join(', ');
      }
    } else {
      // Fallback: If not yet set, show sample or clean placeholder
      const placeholderText = fieldDef ? `[${fieldDef.label}]` : '[Metadata]';
      if (tokenDetail.formatMode === 'list') {
        replacement = `\n• ${placeholderText}`;
      } else {
        replacement = placeholderText;
      }
    }

    result = result.replace(tokenDetail.token, replacement);
  }

  return result;
}

/**
 * Inspects a step's prompt, hints, footnotes, and tag notes for any `{Metadata <field> save}` directive.
 */
export function extractSaveMetadataFromStep(
  dayContent: any,
  stepIndex: number
): { fieldKey: string; fieldLabel: string; mode: 'save' } | null {
  if (!dayContent) return null;

  const textsToScan: string[] = [];
  if (Array.isArray(dayContent.taskPrompts) && dayContent.taskPrompts[stepIndex]) {
    textsToScan.push(dayContent.taskPrompts[stepIndex]);
  } else if (stepIndex === 0 && dayContent.taskPrompt) {
    textsToScan.push(dayContent.taskPrompt);
  }
  if (Array.isArray(dayContent.taskHints) && dayContent.taskHints[stepIndex]) {
    textsToScan.push(dayContent.taskHints[stepIndex]);
  }
  if (Array.isArray(dayContent.taskFootnotes) && dayContent.taskFootnotes[stepIndex]) {
    textsToScan.push(dayContent.taskFootnotes[stepIndex]);
  }
  if (Array.isArray(dayContent.taskTagNotes) && dayContent.taskTagNotes[stepIndex]) {
    textsToScan.push(dayContent.taskTagNotes[stepIndex]);
  }

  for (const text of textsToScan) {
    const tokens = extractMetadataTokens(text);
    const saveToken = tokens.find(t => t.mode === 'save');
    if (saveToken && saveToken.fieldKey) {
      return {
        fieldKey: saveToken.fieldKey,
        fieldLabel: saveToken.fieldLabel,
        mode: 'save'
      };
    }
  }

  return null;
}

export interface StepPlaceholderDetail {
  dayNum?: number;
  stepNum: number;
  subStepNum?: number;
  opNum?: number;
  mode: StepPlaceholderMode;
  rawLabel: string;
  token: string;
  isMetadata?: boolean;
  metadataFieldKey?: string;
  metadataFieldLabel?: string;
  metadataMode?: 'save' | 'receive';
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

  const mainRegex = /\{(?:\s*[dDmM](?:ay|ove)?\s*\d+\s+)?\s*[sS]?tep\s*\d*(?:\s*[oO][pP]\s*\d+)?\s+(?:main|m)\}/i;

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
  invalidReason?: string;
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
 * Regex matching placeholders like {Step 1}, {Step 1.2}, {Step 1 Op2}, {Step 1.2 Op 2}, {M1 Step 3}, {M2 Step 4 Op1 m}, {Move 1 Step 3 list}, {D1 Step 3}, {d2 step 4 op 1 h}, {Step 1 Op 4 d}, etc.
 */
export const PLACEHOLDER_REGEX = /\{(?:\s*[dDmM](?:ay|ove)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)?(?:[.:_](\d+))?(?:\s*[oO][pP]\s*(\d+)(?:[.:_](\d+))?)?(?:\s*(list|normal|hide|sentence|disconnect|main|h|s|l|n|d|m))?\}/gi;

/**
 * Validates `{step N}`, `{Step 1.1}`, `{Step 1.2 Op 2}`, `{M1 Step 3}`, `{M2 Step 4 op 1}`, `{Step N list}`, `{Step N h}`, `{Step N Op 4 d}`, `{Step 1 Op 2 m}` etc. placeholders in prompt text.
 */
export function validateStepPlaceholders(
  prompt: string,
  stepIndex: number,
  taskInputTypes: string[],
  taskPollOptions?: string[],
  currentDay: number = 1,
  allDaysContent?: any[],
  isBridgeNote: boolean = false
): StepPlaceholderValidation {
  if (!prompt) return { isValid: true, hasPlaceholders: false, invalidStepRefs: [], validStepRefs: [], validStepLabels: [], invalidStepLabels: [], placeholderDetails: [] };

  const regex = /\{(?:\s*[dDmM](?:ay|ove)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)?(?:[.:_](\d+))?(?:\s*[oO][pP]\s*(\d+)(?:[.:_](\d+))?)?(?:\s*(list|normal|hide|sentence|disconnect|main|h|s|l|n|d|m))?\}/gi;
  let match: RegExpExecArray | null;
  const references: StepPlaceholderDetail[] = [];
  let lastStepNum = 1;

  while ((match = regex.exec(prompt)) !== null) {
    const dayNum = match[1] ? parseInt(match[1], 10) : undefined;
    const stepNum = match[2] ? parseInt(match[2], 10) : lastStepNum;
    if (match[2]) lastStepNum = stepNum;
    const subStepNum = match[3] ? parseInt(match[3], 10) : undefined;
    const opNum = match[4] ? parseInt(match[4], 10) : undefined;
    const modeStr = match[6];
    const mode = parsePlaceholderMode(modeStr);

    let modeSuffix = '';
    if (mode === 'hide') modeSuffix = ' h';
    else if (mode === 'disconnect') modeSuffix = ' d';
    else if (mode === 'sentence') modeSuffix = ' s';
    else if (mode === 'list') modeSuffix = ' list';
    else if (mode === 'main') modeSuffix = ' main';

    const movePrefix = dayNum !== undefined ? `M${dayNum} ` : '';
    const subStepPart = subStepNum !== undefined ? `.${subStepNum}` : '';
    const opPart = opNum !== undefined ? ` Op${opNum}` : '';
    const rawLabel = `${movePrefix}Step ${stepNum}${subStepPart}${opPart}${modeSuffix}`.trim();
    const token = match[0];

    if (!references.some(r => r.token === token)) {
      references.push({ dayNum, stepNum, subStepNum, opNum, mode, rawLabel, token });
    }
  }

  const metaTokens = extractMetadataTokens(prompt);
  const metaPlaceholderDetails: StepPlaceholderDetail[] = metaTokens.map((meta, idx) => ({
    stepNum: -(idx + 99),
    mode: meta.formatMode || 'normal',
    rawLabel: meta.raw.replace(/^\{|\}$/g, ''),
    token: meta.token,
    isMetadata: true,
    metadataFieldKey: meta.fieldKey,
    metadataFieldLabel: meta.fieldLabel,
    metadataMode: meta.mode
  }));

  if (references.length === 0) {
    if (metaTokens.length > 0) {
      return {
        isValid: true,
        hasPlaceholders: true,
        invalidStepRefs: [],
        validStepRefs: [],
        validStepLabels: metaTokens.map(m => m.raw.replace(/^\{|\}$/g, '')),
        invalidStepLabels: [],
        placeholderDetails: metaPlaceholderDetails,
        isLogicLinked: true
      };
    }
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

    // Rule 2: Same move preceding rule (for bridge notes, all steps in the current move precede the bridge note)
    if (targetDay === currentDay) {
      if (isBridgeNote) {
        const maxSteps = (taskInputTypes && taskInputTypes.length) || 10;
        if (targetStepIndex < 0 || targetStepIndex >= maxSteps) {
          invalidStepRefs.push(ref.stepNum);
          invalidStepLabels.push(ref.rawLabel);
          if (!invalidReason) {
            invalidReason = `Invalid placeholder {${ref.rawLabel}}: Step ${ref.stepNum} does not exist on Move ${currentDay}.`;
          }
          continue;
        }
      } else if (targetStepIndex < 0 || targetStepIndex > stepIndex || (targetStepIndex === stepIndex && ref.opNum === undefined && ref.subStepNum === undefined && ref.mode !== 'hide' && ref.mode !== 'disconnect' && ref.mode !== 'main')) {
        invalidStepRefs.push(ref.stepNum);
        invalidStepLabels.push(ref.rawLabel);
        if (!invalidReason) {
          if (targetStepIndex === stepIndex) {
            invalidReason = `Invalid self-referencing placeholder {${ref.rawLabel}} on Step ${stepIndex + 1}.`;
          } else {
            invalidReason = `Invalid placeholder {${ref.rawLabel}}: Step ${ref.stepNum} must precede Step ${stepIndex + 1} on Move ${currentDay}.`;
          }
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
      let hasMultiText = false;
      if (allDaysContent && Array.isArray(allDaysContent)) {
        const foundDC = allDaysContent.find(d => d && Number(d.day) === targetDay);
        if (foundDC?.taskMultiTextLabels?.[targetStepIndex] && foundDC.taskMultiTextLabels[targetStepIndex].length > 0) {
          hasMultiText = true;
        }
      }
      if (targetType && !isTargetPoll && !hasMultiText) {
        invalidStepRefs.push(ref.stepNum);
        invalidStepLabels.push(ref.rawLabel);
        if (!invalidReason) {
          invalidReason = `Invalid placeholder {${ref.rawLabel}}: Option syntax (Op${ref.opNum}) can only be used on 'poll' or multi-text steps. Target step is '${targetType}'.`;
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

  // Include metadata tokens in valid labels and placeholderDetails
  if (metaTokens.length > 0) {
    validStepLabels.push(...metaTokens.map(m => m.raw.replace(/^\{|\}$/g, '')));
    placeholderDetails.push(...metaPlaceholderDetails);
  }

  if (invalidStepLabels.length > 0) {
    const finalReason = invalidReason || `Invalid placeholder logic: ${invalidStepLabels.map(l => `{${l}}`).join(', ')}.`;
    return {
      isValid: false,
      hasPlaceholders: true,
      invalidStepRefs,
      validStepRefs,
      validStepLabels,
      invalidStepLabels,
      placeholderDetails,
      errorMsg: finalReason,
      invalidReason: finalReason
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
 * Toggles or sets the mode ('normal' | 'list' | 'hide' | 'sentence' | 'disconnect' | 'main') of a metadata placeholder within a prompt string.
 */
export function toggleMetadataMode(
  prompt: string,
  fieldKeyOrToken: string | number,
  targetMode: StepPlaceholderMode
): string {
  if (!prompt) return prompt;
  const tokens = extractMetadataTokens(prompt);
  if (tokens.length === 0) return prompt;

  let result = prompt;
  for (const tokenDetail of tokens) {
    const isMatch = !fieldKeyOrToken
      || fieldKeyOrToken === 'metadata'
      || fieldKeyOrToken === -99
      || fieldKeyOrToken === '-99'
      || fieldKeyOrToken === -1
      || fieldKeyOrToken === '-1'
      || tokenDetail.token === fieldKeyOrToken
      || tokenDetail.raw === fieldKeyOrToken
      || (tokenDetail.fieldKey && tokenDetail.fieldKey.toLowerCase() === String(fieldKeyOrToken).toLowerCase())
      || (tokenDetail.fieldLabel && tokenDetail.fieldLabel.toLowerCase() === String(fieldKeyOrToken).toLowerCase());

    if (!isMatch) continue;

    const fieldPart = tokenDetail.fieldKey ? ` ${tokenDetail.fieldLabel}` : '';
    const savePart = tokenDetail.mode === 'save' ? ' save' : '';

    let modePart = '';
    if (targetMode === 'list') modePart = ' list';
    else if (targetMode === 'hide') modePart = ' h';
    else if (targetMode === 'disconnect') modePart = ' d';
    else if (targetMode === 'sentence') modePart = ' s';
    else if (targetMode === 'main') modePart = ' main';

    const newToken = `{Metadata${fieldPart}${savePart}${modePart}}`.replace(/\s+/g, ' ');
    result = result.replace(tokenDetail.token, newToken);
  }

  return result;
}

/**
 * Updates a metadata token within a prompt with a new fieldKey, mode ('save' | 'receive'), and/or formatMode.
 */
export function updateMetadataTokenInPrompt(
  prompt: string,
  targetTokenOrKey: string | number,
  updates: {
    fieldKey?: string;
    fieldLabel?: string;
    mode?: 'save' | 'receive';
    formatMode?: StepPlaceholderMode;
  }
): string {
  if (!prompt) return prompt;
  const tokens = extractMetadataTokens(prompt);
  if (tokens.length === 0) return prompt;

  let targetDetail = tokens.find(t => 
    t.token === targetTokenOrKey || 
    t.raw === targetTokenOrKey ||
    (t.fieldKey && t.fieldKey.toLowerCase() === String(targetTokenOrKey).toLowerCase())
  );
  if (!targetDetail) {
    targetDetail = tokens[0];
  }
  if (!targetDetail) return prompt;

  const newFieldKey = updates.fieldKey !== undefined ? updates.fieldKey : targetDetail.fieldKey;
  const fieldDef = normalizeMetadataField(newFieldKey || updates.fieldLabel);
  const newFieldLabel = fieldDef ? fieldDef.label : (updates.fieldLabel || (newFieldKey && newFieldKey.toLowerCase() !== 'metadata' ? newFieldKey : ''));

  const newMode = updates.mode !== undefined ? updates.mode : targetDetail.mode;
  const newFormatMode = updates.formatMode !== undefined ? updates.formatMode : (targetDetail.formatMode || 'normal');

  const fieldPart = newFieldLabel && newFieldLabel.toLowerCase() !== 'metadata' ? ` ${newFieldLabel}` : '';
  const savePart = newMode === 'save' ? ' save' : '';

  let modePart = '';
  if (newFormatMode === 'list') modePart = ' list';
  else if (newFormatMode === 'hide') modePart = ' h';
  else if (newFormatMode === 'disconnect') modePart = ' d';
  else if (newFormatMode === 'sentence') modePart = ' s';
  else if (newFormatMode === 'main') modePart = ' main';

  const newToken = `{Metadata${fieldPart}${savePart}${modePart}}`.replace(/\s+/g, ' ');
  return prompt.replace(targetDetail.token, newToken);
}

/**
 * Toggles or sets the mode ('normal' | 'list' | 'hide' | 'sentence' | 'disconnect' | 'main') of a placeholder within a prompt string.
 */
export function togglePlaceholderMode(
  prompt: string,
  targetStepNum: number | string,
  targetMode: StepPlaceholderMode,
  targetDayNum?: number
): string {
  if (!prompt) return prompt;

  if (
    (typeof targetStepNum === 'string' && (targetStepNum.toLowerCase().includes('meta') || targetStepNum.startsWith('{'))) ||
    (typeof targetStepNum === 'number' && targetStepNum < 0)
  ) {
    return toggleMetadataMode(prompt, targetStepNum, targetMode);
  }

  const hasStepRegex = /\{(?:\s*[dDmM](?:ay|ove)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)/i;
  if (!hasStepRegex.test(prompt) && /\{(?:\s*metadata)/i.test(prompt)) {
    return toggleMetadataMode(prompt, targetStepNum, targetMode);
  }

  const regex = /\{(?:\s*[dDmM](?:ay|ove)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)?(?:[.:_](\d+))?(?:\s*[oO][pP]\s*(\d+)(?:[.:_](\d+))?)?(?:\s*(list|normal|hide|sentence|disconnect|main|h|s|l|n|d|m))?\}/gi;

  let replaced = false;
  const result = prompt.replace(regex, (fullMatch, dayNumStr, stepNumStr, subStepNumStr, opNumStr) => {
    const stepNum = parseInt(stepNumStr, 10);
    const dayNum = dayNumStr ? parseInt(dayNumStr, 10) : undefined;
    const subStepNum = subStepNumStr ? parseInt(subStepNumStr, 10) : undefined;

    if (stepNum !== Number(targetStepNum)) {
      return fullMatch;
    }
    if (targetDayNum !== undefined && dayNum !== undefined && dayNum !== targetDayNum) {
      return fullMatch;
    }

    replaced = true;
    const movePart = (dayNum !== undefined || targetDayNum !== undefined) ? `M${dayNum ?? targetDayNum} ` : '';
    const subStepPart = subStepNum !== undefined ? `.${subStepNum}` : '';
    const opNum = opNumStr ? parseInt(opNumStr, 10) : undefined;
    const opPart = opNum !== undefined ? ` Op${opNum}` : '';
    let modePart = '';
    if (targetMode === 'list') modePart = ' list';
    else if (targetMode === 'hide') modePart = ' h';
    else if (targetMode === 'disconnect') modePart = ' d';
    else if (targetMode === 'sentence') modePart = ' s';
    else if (targetMode === 'main') modePart = ' main';

    return `{${movePart}Step ${stepNum}${subStepPart}${opPart}${modePart}}`;
  });

  if (!replaced && /\{(?:\s*metadata)/i.test(prompt)) {
    return toggleMetadataMode(prompt, targetStepNum, targetMode);
  }

  return result;
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
  allDaysContent?: any[],
  versionIdx?: number
): { day: number; stepIdx: number; opNum?: number; mode?: StepPlaceholderMode }[] {
  if (!dayContent) return [];
  const currentDay = Number(dayContent.day || 1);
  const links: { day: number; stepIdx: number; opNum?: number; mode?: StepPlaceholderMode }[] = [];

  const addLink = (d: number, s: number, opNum?: number, mode?: StepPlaceholderMode) => {
    if (s < 0 || d < 1) return;
    // An upstream link can come from a preceding day, a preceding step, or option branch on the same step
    if (d > currentDay || (d === currentDay && s > stepIdx) || (d === currentDay && s === stepIdx && opNum === undefined && mode !== 'main' && mode !== 'hide')) return;
    if (mode === 'disconnect') return; // 'd' means disconnect only this
    const existing = links.find(l => l.day === d && l.stepIdx === s && (opNum === undefined || l.opNum === opNum));
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

  // 3. Scan writeup texts
  const writeupTexts: string[] = [];
  const promptVal = dayContent.taskPrompts?.[stepIdx];
  if (typeof promptVal === 'string') {
    if (versionIdx !== undefined) {
      const pVersions = parseStepVersions(promptVal);
      if (pVersions[versionIdx]) writeupTexts.push(pVersions[versionIdx]);
      else writeupTexts.push(promptVal);
    } else {
      writeupTexts.push(promptVal);
    }
  } else if (stepIdx === 0 && typeof dayContent.taskPrompt === 'string') {
    writeupTexts.push(dayContent.taskPrompt);
  }
  const hintVal = dayContent.taskHints?.[stepIdx];
  if (typeof hintVal === 'string') {
    if (versionIdx !== undefined) {
      const hVersions = parseHintVersions(hintVal);
      if (hVersions[versionIdx]) writeupTexts.push(hVersions[versionIdx]);
      else writeupTexts.push(hintVal);
    } else {
      writeupTexts.push(hintVal);
    }
  }
  const footnoteVal = dayContent.taskFootnotes?.[stepIdx];
  if (typeof footnoteVal === 'string') writeupTexts.push(footnoteVal);
  const tagNoteVal = dayContent.taskTagNotes?.[stepIdx];
  if (typeof tagNoteVal === 'string') writeupTexts.push(tagNoteVal);

  const regex = /\{(?:\s*[dDmM](?:ay|ove)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)?(?:[.:_](\d+))?(?:\s*[oO][pP]\s*(\d+)(?:[.:_](\d+))?)?(?:\s*(list|normal|hide|sentence|disconnect|main|h|s|l|n|d|m))?\}/gi;

  for (const text of writeupTexts) {
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;
    let lastStepNum = 1;
    while ((match = regex.exec(text)) !== null) {
      const dayNum = match[1] ? parseInt(match[1], 10) : currentDay;
      const stepNum = match[2] ? parseInt(match[2], 10) : lastStepNum;
      if (match[2]) lastStepNum = stepNum;
      const subStepNum = match[3] ? parseInt(match[3], 10) : undefined;
      const opNum = match[4] ? parseInt(match[4], 10) : subStepNum;
      const mode = parsePlaceholderMode(match[6]);
      const targetStepIdx = stepNum - 1;
      
      // Include if explicitly declared 'main' mode or option link (e.g. {Step 1 Op 2}, {Step 1.2}, {Step 1 main})
      if (mode === 'main' || opNum !== undefined || mode === 'hide') {
        addLink(dayNum, targetStepIdx, opNum, mode);
      }
    }
  }

  // 4. Scan explicit option placeholders configured directly in taskPollOptions
  const optionsVal = dayContent.taskPollOptions?.[stepIdx];
  if (typeof optionsVal === 'string') {
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;
    let lastStepNum = 1;
    while ((match = regex.exec(optionsVal)) !== null) {
      const dayNum = match[1] ? parseInt(match[1], 10) : currentDay;
      const stepNum = match[2] ? parseInt(match[2], 10) : lastStepNum;
      if (match[2]) lastStepNum = stepNum;
      const subStepNum = match[3] ? parseInt(match[3], 10) : undefined;
      const opNum = match[4] ? parseInt(match[4], 10) : subStepNum;
      const mode = parsePlaceholderMode(match[6]);
      const targetStepIdx = stepNum - 1;
      addLink(dayNum, targetStepIdx, opNum, mode);
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
    // Hide mode ('hide' / 'h') and disconnect mode ('disconnect' / 'd') are branching / suppression modes and do not feed poll options
    if (link.mode === 'hide' || link.mode === 'disconnect') return false;
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
  allDaysInputs?: any[] | Record<number, any>,
  userOrMetadata?: any
): string {
  if (!prompt) return '';

  // Interpolate metadata tokens first (e.g. {Metadata interest receive} or {Metadata life stage})
  const textWithMetadata = interpolateMetadataInText(prompt, userOrMetadata);

  // Normalize bare coding tokens like "M2 Step 1 op 2", "M1 Step 1.1 h", or "Step 1.2" into "{M2 Step 1 op 2}"
  const normalizedPrompt = textWithMetadata.replace(
    /\{([^{}]+)\}|(\b[dDmM]\d+\s+[sS]?tep\s*\d+(?:[.:_]\d+)?(?:\s*[oO][pP]\s*\d+(?:[.:_]\d+)?)?(?:\s*(?:list|normal|hide|sentence|disconnect|main|h|s|l|n|d|m))?\b)/gi,
    (m, bracketed, bare) => bracketed ? `{${bracketed}}` : `{${bare}}`
  );

  const regex = /\{(?:\s*[dDmM](?:ay|ove)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)?(?:[.:_](\d+))?(?:\s*[oO][pP]\s*(\d+)(?:[.:_](\d+))?)?(?:\s*(list|normal|hide|sentence|disconnect|main|h|s|l|n|d|m))?\}/gi;

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
  let lastStepNum = 1;

  return normalizedPrompt.replace(regex, (fullMatch, dayNumStr, stepNumStr, subStepNumStr, opNumStr, subOpNumStr, modeStr) => {
    const targetDay = dayNumStr ? parseInt(dayNumStr, 10) : currentDayNum;
    const stepNum = stepNumStr ? parseInt(stepNumStr, 10) : lastStepNum;
    if (stepNumStr) lastStepNum = stepNum;
    const subStepNum = subStepNumStr ? parseInt(subStepNumStr, 10) : undefined;
    const opNum = opNumStr ? parseInt(opNumStr, 10) : subStepNum;
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

    // Hide mode, disconnect mode, or main mode immediately return empty string (suppress display text)
    if (mode === 'hide' || mode === 'disconnect' || mode === 'main') {
      return '';
    }

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
      const targetMultiLabels = Array.isArray(activeDC?.taskMultiTextLabels?.[activeStepIndex])
        ? activeDC.taskMultiTextLabels[activeStepIndex].filter((l: any) => l && String(l).trim())
        : [];

      if (targetMultiLabels.length > 0) {
        const val = getTargetInputValue(targetDay, activeStepIndex);
        let multiValText = '';
        if (val !== undefined && val !== null && typeof val === 'string' && val.trim()) {
          try {
            if (val.trim().startsWith('{')) {
              const parsed = JSON.parse(val);
              const label = targetMultiLabels[optIndex];
              if (label && parsed[label] !== undefined && String(parsed[label]).trim()) {
                multiValText = `"${String(parsed[label]).trim()}"`;
              } else {
                const vals = Object.values(parsed);
                if (vals[optIndex] !== undefined && String(vals[optIndex]).trim()) {
                  multiValText = `"${String(vals[optIndex]).trim()}"`;
                }
              }
            } else if (val.trim().startsWith('[')) {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed) && parsed[optIndex] !== undefined && String(parsed[optIndex]).trim()) {
                multiValText = `"${String(parsed[optIndex]).trim()}"`;
              }
            } else if (optIndex === 0) {
              multiValText = `"${val.trim()}"`;
            }
          } catch (e) {
            if (optIndex === 0) multiValText = `"${val.trim()}"`;
          }
        }
        if (multiValText) {
          return formatOutput([multiValText]);
        }
        if (targetMultiLabels[optIndex]) {
          return formatOutput([`"${targetMultiLabels[optIndex]}"`]);
        }
      }

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

    // Check if target step is a multi-text step
    const targetMultiLabels = Array.isArray(targetDC?.taskMultiTextLabels?.[stepIndex])
      ? targetDC.taskMultiTextLabels[stepIndex].filter((l: any) => l && String(l).trim())
      : [];

    // Normal placeholders: return the target step's direct value (or its configured poll options)
    let val = getTargetInputValue(targetDay, stepIndex);

      if (targetMultiLabels.length > 0) {
        if (val !== undefined && val !== null && typeof val === 'string' && val.trim()) {
          try {
            if (val.trim().startsWith('{')) {
              const parsed = JSON.parse(val);
              const formattedMulti: string[] = [];
              targetMultiLabels.forEach((lbl: string, idx: number) => {
                const ans = parsed[lbl] !== undefined ? parsed[lbl] : Object.values(parsed)[idx];
                if (ans !== undefined && String(ans).trim()) {
                  formattedMulti.push(`Op${idx + 1}: "${String(ans).trim()}"`);
                }
              });
              if (formattedMulti.length > 0) {
                items = formattedMulti;
              }
            } else if (val.trim().startsWith('[')) {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) {
                items = parsed.map((item: any, idx: number) => `Op${idx + 1}: "${String(item).trim()}"`).filter(Boolean);
              }
            } else {
              items = [`Op1: "${val.trim()}"`];
            }
          } catch (e) {
            items = [`Op1: "${val.trim()}"`];
          }
        }
        if (items.length === 0) {
          items = targetMultiLabels.map((lbl: string, idx: number) => `Op${idx + 1}: "${lbl}"`);
        }
      } else if (val !== undefined && val !== null) {
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
      const rawPrompt = day.taskPrompts[i];
      if (!rawPrompt) continue;
      const versions = parseStepVersions(rawPrompt);
      for (const prompt of versions) {
        if (!prompt) continue;
        const val = validateStepPlaceholders(prompt, i, inputTypes, day.taskPollOptions, dayNum, dailyContent);
        if (!val.isValid) {
          return true;
        }
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

export function isStepOrSubStepPoll(rawType?: string | null, pollOptions?: any, prompt?: string | null): boolean {
  if (pollOptions && Array.isArray(pollOptions) && pollOptions.length > 0) return true;
  if (!rawType && !prompt) return false;
  const combined = `${rawType || ''} ${prompt || ''}`.toLowerCase();
  if (combined.includes('poll') || combined.includes('multiple choice') || combined.includes('op ') || combined.includes('options')) return true;
  const versions = parseStepVersions(rawType);
  return versions.some(v => v.trim().toLowerCase() === 'poll' || v.trim().toLowerCase() === 'multiple choice');
}

export function getStepInputType(
  dayContent: any,
  stepIdx: number,
  taskInputs?: any,
  allDaysContent?: any[],
  allDaysInputs?: any[] | Record<number, any>
): string {
  if (!dayContent) return 'text';
  const pollOpts = getAllStepPollOptions(dayContent, stepIdx, taskInputs, allDaysContent, allDaysInputs);
  if (pollOpts.length > 0) {
    return 'poll';
  }
  const promptVal = dayContent.taskPrompts?.[stepIdx] || (stepIdx === 0 ? dayContent?.taskPrompt : '');
  const rawType = dayContent.taskInputTypes?.[stepIdx];
  if (isStepOrSubStepPoll(rawType, pollOpts, promptVal)) {
    return 'poll';
  }
  const verIdx = resolveStepVersionIndex(stepIdx, dayContent, taskInputs, allDaysContent, allDaysInputs);
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
 * Ensures that if step versions (1.1, 1.2, 1.3) are connected to (Op 1, Op 2, Op 3), each resolves independently
 * to its linked option without clashing in path, being omitted, or being hijacked by the first version.
 */
export function resolveStepVersionIndex(
  stepIdx: number = 0,
  dayContent?: any,
  taskInputs?: any,
  allDaysContent?: any[],
  allDaysInputs?: any[] | Record<number, any>
): number {
  if (!dayContent) return 0;
  const currentDayNum = Number(dayContent.day || 1);

  // If prompt has multiple versions (e.g. Step 1.1, 1.2, 1.3, 1.4... separated by |||)
  const rawPrompt = dayContent?.taskPrompts?.[stepIdx] || (stepIdx === 0 ? dayContent?.taskPrompt : undefined);
  const promptVersions = rawPrompt ? parseStepVersions(rawPrompt) : [''];

  if (promptVersions.length <= 1) {
    // Single version step: Check if it's a poll with direct answer
    const currentType = dayContent?.taskInputTypes?.[stepIdx];
    if (currentType === 'poll') {
      const val = taskInputs ? (Array.isArray(taskInputs) ? taskInputs[stepIdx] : taskInputs[stepIdx]) : undefined;
      if (val) {
        const options = getAllStepPollOptions(dayContent, stepIdx, taskInputs, allDaysContent, allDaysInputs);
        if (options.length > 0) {
          const valStr = String(val).trim().toLowerCase();
          const idx = options.findIndex(o => o.toLowerCase() === valStr);
          if (idx >= 0) return idx;
        }
      }
    }
    return 0;
  }

  // Helper to extract input value for any day and step
  const getInputValue = (targetDay: number, targetStepIdx: number) => {
    if (targetDay === currentDayNum) {
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

  const parseUserAnswers = (val: any): string[] => {
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
            if (list.length > 0) return Array.from(new Set(list));
            return Object.values(parsed).map(s => String(s).trim()).filter(Boolean);
          }
        } catch (e) {}
      }
      return [trimmed];
    }
    if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
    return [];
  };

  const isOptionMatchedByAnswers = (targetDay: number, targetStepIdx: number, targetOpNum: number): boolean => {
    const rawVal = getInputValue(targetDay, targetStepIdx);
    const answers = parseUserAnswers(rawVal);
    if (answers.length === 0) return false;

    const targetDC = (targetDay === currentDayNum || !allDaysContent)
      ? dayContent
      : (allDaysContent.find(d => Number(d.day) === targetDay) || dayContent);
    const opts = getAllStepPollOptions(targetDC, targetStepIdx, taskInputs, allDaysContent, allDaysInputs);
    const optIndex = targetOpNum - 1;
    const targetOptText = opts[optIndex] || `Option ${targetOpNum}`;

    return answers.some(ans => {
      const lowerAns = ans.toLowerCase().trim();
      if (targetOptText && lowerAns === targetOptText.toLowerCase().trim()) return true;
      if (lowerAns === `poll ${targetOpNum}` || lowerAns === `op ${targetOpNum}` || lowerAns === `op${targetOpNum}` || lowerAns === `option ${targetOpNum}` || lowerAns === String(targetOpNum)) return true;
      return false;
    });
  };

  // Check each version independently to find which one matches the user's choices!
  // Versioned steps (1.1, 1.2, 1.3) connect to (Op 1, Op 2, Op 3) without clashing or omitting.
  for (let vIdx = 0; vIdx < promptVersions.length; vIdx++) {
    const vPrompt = promptVersions[vIdx] || '';
    const vHint = getStepVersionValue(dayContent.taskHints?.[stepIdx], vIdx, '');
    const vFootnote = getStepVersionValue(dayContent.taskFootnotes?.[stepIdx], vIdx, '');
    const vTagNote = getStepVersionValue(dayContent.taskTagNotes?.[stepIdx], vIdx, '');
    const vCombined = [vPrompt, vHint, vFootnote, vTagNote].join(' ');

    const regex = /\{(?:\s*[dDmM](?:ay|ove)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)?(?:[.:_](\d+))?(?:\s*[oO][pP]\s*(\d+)(?:[.:_](\d+))?)?(?:\s*(list|normal|hide|sentence|disconnect|main|h|s|l|n|d|m))?\}/gi;
    let match: RegExpExecArray | null;
    let hasMatchedToken = false;

    while ((match = regex.exec(vCombined)) !== null) {
      const dayNum = match[1] ? parseInt(match[1], 10) : currentDayNum;
      const stepNum = match[2] ? parseInt(match[2], 10) : (stepIdx + 1);
      const subStepNum = match[3] ? parseInt(match[3], 10) : undefined;
      const opNum = match[4] ? parseInt(match[4], 10) : undefined;
      const targetStepIdx = stepNum - 1;

      const targetOpNum = opNum !== undefined ? opNum : subStepNum;
      if (targetOpNum !== undefined) {
        if (isOptionMatchedByAnswers(dayNum, targetStepIdx, targetOpNum)) {
          hasMatchedToken = true;
          break;
        }
      }
    }

    if (hasMatchedToken) {
      return vIdx;
    }
  }

  // If current step is a poll and user directly answered current step, map answer to version index
  const currentType = dayContent?.taskInputTypes?.[stepIdx];
  if (currentType === 'poll' || isStepOrSubStepPoll(currentType)) {
    const val = getInputValue(currentDayNum, stepIdx);
    const answers = parseUserAnswers(val);
    if (answers.length > 0) {
      const opts = getAllStepPollOptions(dayContent, stepIdx, taskInputs, allDaysContent, allDaysInputs);
      for (let i = 0; i < opts.length; i++) {
        if (opts[i] && answers.some(a => a.toLowerCase().trim() === opts[i].toLowerCase().trim() || a.toLowerCase().trim() === `option ${i + 1}` || a.toLowerCase().trim() === `op ${i + 1}` || a.toLowerCase().trim() === String(i + 1))) {
          if (i < promptVersions.length) return i;
        }
      }
    }
  }

  // If step has taskPollOptionLinks (e.g. step0:poll 2)
  const pollLink = dayContent.taskPollOptionLinks?.[stepIdx];
  if (pollLink && pollLink !== 'none') {
    const info = parsePollLinkInfo(pollLink);
    if (info && info.optNum !== undefined && info.optNum > 0) {
      const optIdx = info.optNum - 1;
      if (optIdx < promptVersions.length) {
        if (isOptionMatchedByAnswers(currentDayNum, info.targetPollIdx >= 0 ? info.targetPollIdx : 0, info.optNum)) {
          return optIdx;
        }
      }
    }
  }

  // Check progressive selection narrowing
  const progRes = resolveProgressiveStepSelections(stepIdx, dayContent, taskInputs, allDaysContent, allDaysInputs);
  if (progRes.isNarrowed && progRes.activeOptionIndex >= 0 && progRes.activeOptionIndex < promptVersions.length) {
    return progRes.activeOptionIndex;
  }

  return 0;
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
  const rawHint = dayContent.taskHints?.[stepIndex];
  const rawFootnote = dayContent.taskFootnotes?.[stepIndex];
  const rawTagNote = dayContent.taskTagNotes?.[stepIndex];

  const textsToScan: string[] = [];
  if (rawPrompt) {
    const promptVersions = parseStepVersions(rawPrompt);
    if (promptVersions.length > 1) {
      const activeVerIdx = resolveStepVersionIndex(stepIndex, dayContent, taskInputs, allDaysContent, allDaysInputs);
      textsToScan.push(promptVersions[activeVerIdx] || promptVersions[0]);
    } else {
      textsToScan.push(rawPrompt);
    }
  }
  if (rawHint) textsToScan.push(rawHint);
  if (rawFootnote) textsToScan.push(rawFootnote);
  if (rawTagNote) textsToScan.push(rawTagNote);

  if (textsToScan.length === 0) return true;

  const checkTextVisibility = (promptText: string): boolean => {
    if (!promptText) return true;
    const regex = /\{(?:\s*[dDmM](?:ay|ove)?\s*(\d+)\s+)?\s*[sS]?tep\s*(\d+)?(?:[.:_](\d+))?(?:\s*[oO][pP]\s*(\d+)(?:[.:_](\d+))?)?(?:\s*(list|normal|hide|sentence|disconnect|main|h|s|l|n|d|m))?\}/gi;
    let match: RegExpExecArray | null;

    const stepPlaceholders: { dayNum?: number; stepNum: number; subStepNum?: number; opNum?: number; mode: StepPlaceholderMode }[] = [];
    let lastStepNum = 1;
    while ((match = regex.exec(promptText)) !== null) {
      const dayNum = match[1] ? parseInt(match[1], 10) : undefined;
      const stepNum = match[2] ? parseInt(match[2], 10) : lastStepNum;
      if (match[2]) lastStepNum = stepNum;
      const subStepNum = match[3] ? parseInt(match[3], 10) : undefined;
      const opNum = match[4] ? parseInt(match[4], 10) : subStepNum;
      const mode = parsePlaceholderMode(match[6]);
      stepPlaceholders.push({ dayNum, stepNum, subStepNum, opNum, mode });
    }

    if (stepPlaceholders.length === 0) return true;

    // Group placeholders by target (targetDay:targetIdx)
    const targetGroups: Record<string, {
      targetDay: number;
      targetIdx: number;
      placeholders: { opNum?: number; mode: StepPlaceholderMode }[];
    }> = {};

    for (const placeholder of stepPlaceholders) {
      const { dayNum, stepNum, opNum, mode } = placeholder;
      const targetIdx = stepNum - 1;
      const targetDay = dayNum !== undefined ? dayNum : viewingDay;
      const key = `${targetDay}:${targetIdx}`;
      if (!targetGroups[key]) {
        targetGroups[key] = {
          targetDay,
          targetIdx,
          placeholders: []
        };
      }
      targetGroups[key].placeholders.push({ opNum, mode });
    }

    for (const group of Object.values(targetGroups)) {
      const { targetDay, targetIdx, placeholders } = group;

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

        // If only main connector without opNum, skip
        if (placeholders.length === 1 && placeholders[0].mode === 'main' && placeholders[0].opNum === undefined) {
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

          const writtenOpts = getAllStepPollOptions(targetDC, targetIdx, taskInputs, allDaysContent, allDaysInputs);

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
              const lowerC = c.toLowerCase().trim();
              if (targetWrittenText && lowerC === targetWrittenText.toLowerCase().trim()) return true;
              if (lowerC === `option ${oNum}` || lowerC === `option${oNum}` || lowerC === `poll ${oNum}` || lowerC === `op ${oNum}` || lowerC === `op${oNum}` || lowerC === String(oNum)) return true;
              return false;
            });
          };

          const disconnectOpNums = placeholders
            .filter(p => p.mode === 'disconnect' && p.opNum !== undefined)
            .map(p => p.opNum as number);

          const positiveOpNums = placeholders
            .filter(p => p.mode !== 'disconnect' && p.opNum !== undefined)
            .map(p => p.opNum as number);

          // If disconnected option selected -> hide step
          if (disconnectOpNums.length > 0) {
            if (disconnectOpNums.some(oNum => isOptionSelected(oNum))) {
              return false;
            }
          }

          // If positive options specified (e.g. {Step 1 Op 2 h} {Step Op 3 h}) -> show if ANY positive option matches!
          if (positiveOpNums.length > 0) {
            if (!positiveOpNums.some(oNum => isOptionSelected(oNum))) {
              return false;
            }
          }
        }
      }
    }

    return true;
  };

  return textsToScan.every(text => checkTextVisibility(text));
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

  // Also include metadata tokens in task content tokens
  tokens.push(...getMetadataHintTokens());

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

/**
 * Returns available metadata placeholder tokens (e.g. {Metadata}, {Metadata Life Stage receive}, {Metadata Life Stage save}, etc.)
 */
export function getMetadataHintTokens(): HintToken[] {
  const tokens: HintToken[] = [
    { token: '{Metadata}', label: '{Metadata}', isOption: false, stepNum: 0 },
  ];
  for (const field of METADATA_FIELDS) {
    tokens.push({
      token: `{Metadata ${field.label} receive}`,
      label: `📥 Receive ${field.label}`,
      isOption: false,
      stepNum: 0
    });
    tokens.push({
      token: `{Metadata ${field.label} save}`,
      label: `💾 Save ${field.label}`,
      isOption: false,
      stepNum: 0
    });
  }
  return tokens;
}

/**
 * Returns available placeholder tokens for Bridge Notes (e.g. {M1 Step 1}, {M2 Step 1 op 2}, etc.)
 * for all moves from Move 1 up to the current move.
 */
export function getHintTokensForBridgeNote(
  currentDayNum: number,
  allDaysContent?: any[],
  currentDayContent?: any
): HintToken[] {
  const tokens: HintToken[] = [];
  const maxDay = currentDayNum || 1;

  for (let d = 1; d <= maxDay; d++) {
    const dc = d === currentDayNum 
      ? (currentDayContent || (allDaysContent && allDaysContent.find(c => Number(c?.day) === d)))
      : (allDaysContent && allDaysContent.find(c => Number(c?.day) === d));

    const promptsCount = Math.max(
      dc?.taskPrompts?.length || 0,
      dc?.taskInputTypes?.length || 0,
      1
    );

    const movePrefix = `M${d} `;

    for (let s = 0; s < promptsCount; s++) {
      const stepNum = s + 1;
      const inputType = dc?.taskInputTypes?.[s] || 'text';

      // Base step token
      tokens.push({
        token: `{${movePrefix}Step ${stepNum}}`,
        label: `${movePrefix}Step ${stepNum}`,
        isOption: false,
        stepNum
      });

      // Poll option tokens (e.g. {M2 Step 1 op 1}, {M2 Step 1 op 2})
      const isPoll = inputType === 'poll' || (typeof inputType === 'string' && inputType.includes('poll'));
      if (isPoll) {
        let options: string[] = [];
        if (dc?.taskPollOptions?.[s]) {
          try {
            const parsed = JSON.parse(dc.taskPollOptions[s]);
            if (Array.isArray(parsed)) options = parsed.filter(Boolean);
          } catch (e) {}
        }

        const optCount = Math.max(options.length, 2);
        for (let o = 1; o <= optCount; o++) {
          tokens.push({
            token: `{${movePrefix}Step ${stepNum} op ${o}}`,
            label: `${movePrefix}Step ${stepNum} op ${o}`,
            isOption: true,
            optNum: o,
            stepNum
          });
        }
      }
    }
  }

  // Also include metadata tokens in bridge notes
  tokens.push(...getMetadataHintTokens());

  return tokens;
}

