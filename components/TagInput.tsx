import React, { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Edit2, Check, X, Scissors, AlertCircle } from 'lucide-react';

export interface TagInputProps {
  value: string;
  onChange: (newVal: string) => void;
  maxTags?: number;
  placeholder?: string;
  onNext?: () => void;
  isFullBleed?: boolean;
}

// Helper to strip bullet list / numbered list / dash prefixes
export const cleanListItemPrefix = (line: string): string => {
  return line
    .replace(/^(\d+[\.\)\-:]|\*|\-|\+|•|–|—|▪|▫|◦|✓|✔)\s*/, '')
    .trim();
};

// Check if string contains bullet or numbered list indicators
export const hasListFormat = (text: string): boolean => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) return true;
  // Even in single line, numbered like "1. Apple 2. Orange" or bulleted
  if (/(?:^|\s)(?:\d+[\.\)]|[•\-\*])\s+/.test(text)) {
    return true;
  }
  return false;
};

// Sentence splitter that respects abbreviations / numbers reasonably well
export const splitIntoSentences = (text: string): string[] => {
  const normalized = text.replace(/\r?\n/g, ' ').trim();
  // Split on . ! ? followed by space or end of string, avoiding decimals
  const rawSentences = normalized
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"']|$)/g)
    .map(s => s.trim())
    .filter(Boolean);
  
  if (rawSentences.length > 0) {
    return rawSentences;
  }
  return [normalized].filter(Boolean);
};

// Parse pasted text based on bullet/number list detection vs unformatted paragraph
export const parsePastedInput = (text: string): { items: string[]; isMultiSentenceParagraph: boolean } => {
  const trimmed = text.trim();
  if (!trimmed) return { items: [], isMultiSentenceParagraph: false };

  // 1. Check for multiline content or explicit list items
  const rawLines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  if (rawLines.length > 1) {
    // Multiline: check if lines are separated list items or paragraphs
    const items = rawLines
      .map(cleanListItemPrefix)
      .map(item => item.replace(/^[,\s;]+|[,\s;]+$/g, ''))
      .filter(Boolean);
    return { items, isMultiSentenceParagraph: false };
  }

  // 2. Single line with inline numbered list like "1. First 2. Second 3. Third"
  if (/(?:^|\s)\d+[\.\)]\s+/.test(trimmed)) {
    const splitMatches = trimmed.split(/(?:^|\s)(?=\d+[\.\)]\s+)/).map(cleanListItemPrefix).filter(Boolean);
    if (splitMatches.length > 1) {
      return { items: splitMatches, isMultiSentenceParagraph: false };
    }
  }

  // 3. Single line with comma/semicolon separation if items are brief
  // E.g., "Design, Code, Test" -> if comma separated and doesn't look like a standard long paragraph
  if ((trimmed.includes(',') || trimmed.includes(';')) && !trimmed.includes('. ')) {
    const tokens = trimmed.split(/[,;]+/).map(t => cleanListItemPrefix(t.trim())).filter(Boolean);
    if (tokens.length > 1) {
      return { items: tokens, isMultiSentenceParagraph: false };
    }
  }

  // 4. Single unformatted paragraph: check if multi-sentence
  const sentences = splitIntoSentences(trimmed);
  if (sentences.length > 1) {
    // Keep unformatted paragraphs together by default, but flag as multi-sentence paragraph
    return { items: [trimmed], isMultiSentenceParagraph: true };
  }

  // 5. Plain single item
  return { items: [cleanListItemPrefix(trimmed)], isMultiSentenceParagraph: false };
};

export const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  maxTags = 10,
  placeholder = "Type one answer at a time and press Enter to add more....",
  onNext,
  isFullBleed = false
}) => {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // State for inline tag editing
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // State for multi-sentence paragraph paste banner
  const [pendingSplitParagraph, setPendingSplitParagraph] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const tags = useMemo<string[]>(() => {
    if (!value) return [];
    if (value.startsWith("[")) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        return [];
      }
    }
    return value.split(",").filter(Boolean);
  }, [value]);

  useEffect(() => {
    if (editingIndex !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingIndex]);

  const addTag = (tag: string) => {
    const cleaned = tag.trim().replace(/^[,\s;]+|[,\s;]+$/g, "");
    if (!cleaned) return;

    if (tags.length >= maxTags) {
      setError(`Maximum of ${maxTags} items allowed`);
      toast.error(`You can only add up to ${maxTags} items.`);
      return;
    }

    if (tags.some(t => t.toLowerCase() === cleaned.toLowerCase())) {
      setError("This item is already added");
      return;
    }

    const newTags = [...tags, cleaned];
    onChange(JSON.stringify(newTags));
    setInputValue("");
    setError(null);
  };

  const removeTag = (tIndex: number) => {
    const newTags = [...tags];
    newTags.splice(tIndex, 1);
    onChange(JSON.stringify(newTags));
    setError(null);
    if (editingIndex === tIndex) {
      setEditingIndex(null);
    }
  };

  const startEditTag = (tIndex: number) => {
    setEditingIndex(tIndex);
    setEditingValue(tags[tIndex] || "");
    setError(null);
  };

  const saveEditTag = () => {
    if (editingIndex === null) return;
    const cleaned = editingValue.trim().replace(/^[,\s;]+|[,\s;]+$/g, "");
    if (!cleaned) {
      removeTag(editingIndex);
      setEditingIndex(null);
      return;
    }

    const isDuplicate = tags.some((t, idx) => idx !== editingIndex && t.toLowerCase() === cleaned.toLowerCase());
    if (isDuplicate) {
      setError("This item is already added");
      return;
    }

    const newTags = [...tags];
    newTags[editingIndex] = cleaned;
    onChange(JSON.stringify(newTags));
    setEditingIndex(null);
    setEditingValue("");
    setError(null);
  };

  const cancelEditTag = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";") {
      e.preventDefault();
      const val = inputValue.trim();
      if (val) {
        addTag(val);
      } else if (e.key === "Enter" && onNext) {
        onNext();
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEditTag();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditTag();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    if (!text || !text.trim()) return;

    const { items, isMultiSentenceParagraph } = parsePastedInput(text);
    if (items.length === 0) return;

    if (isMultiSentenceParagraph) {
      // Kept together as single paragraph by default, but offer option to split into sentences
      setPendingSplitParagraph(items[0]);
    } else {
      setPendingSplitParagraph(null);
    }

    // Add items up to limit
    let addedCount = 0;
    const currentTags = [...tags];

    for (const item of items) {
      if (currentTags.length >= maxTags) {
        setError(`Maximum of ${maxTags} items allowed. Paste truncated.`);
        toast.error(`You can only add up to ${maxTags} items.`);
        break;
      }
      if (!currentTags.some(t => t.toLowerCase() === item.toLowerCase())) {
        currentTags.push(item);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      onChange(JSON.stringify(currentTags));
      setInputValue("");
      setError(null);
    }
  };

  // Option to split the multi-sentence paragraph into individual sentence tags
  const handleSplitParagraphIntoSentences = () => {
    if (!pendingSplitParagraph) return;
    const sentences = splitIntoSentences(pendingSplitParagraph);
    if (sentences.length <= 1) {
      setPendingSplitParagraph(null);
      return;
    }

    // Replace the single combined paragraph tag with individual sentence tags
    const filteredTags = tags.filter(t => t !== pendingSplitParagraph);
    const updatedTags = [...filteredTags];

    for (const sentence of sentences) {
      if (updatedTags.length >= maxTags) {
        toast.error(`Maximum of ${maxTags} items allowed.`);
        break;
      }
      if (!updatedTags.some(t => t.toLowerCase() === sentence.toLowerCase())) {
        updatedTags.push(sentence);
      }
    }

    onChange(JSON.stringify(updatedTags));
    setPendingSplitParagraph(null);
    toast.success(`Split paragraph into ${sentences.length} separate items.`);
  };

  return (
    <div className="w-full text-left space-y-2">
      {/* Container: Stack tags cleanly above or wrapped, keeping input field always prominently visible */}
      <div
        className={`w-full bg-white border border-gray-200 focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-primary transition-all duration-200 rounded-2xl flex flex-col justify-between ${
          isFullBleed ? 'p-4 sm:p-5' : 'p-3'
        }`}
      >
        {/* Tag chips list area: scrollable if long to prevent overwhelming viewport, with max height */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center mb-2.5 max-h-56 overflow-y-auto pr-1 pb-1">
            {tags.map((tag, tIndex) => {
              const isEditing = editingIndex === tIndex;

              if (isEditing) {
                return (
                  <div
                    key={tIndex}
                    className="inline-flex items-center gap-1.5 p-1 bg-white border-2 border-primary rounded-xl shadow-xs"
                  >
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      onBlur={saveEditTag}
                      className="px-2 py-0.5 text-xs sm:text-sm font-semibold text-gray-900 outline-none min-w-[120px] max-w-[260px]"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        saveEditTag();
                      }}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        cancelEditTag();
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <span
                  key={tIndex}
                  className={`group inline-flex items-center gap-1.5 rounded-xl font-bold tracking-tight bg-primary/5 text-primary border border-primary/10 hover:border-primary/30 transition-all select-none max-w-full ${
                    isFullBleed ? 'px-3.5 py-1.5 text-sm sm:text-base' : 'px-2.5 py-1 text-xs sm:text-sm'
                  }`}
                >
                  {/* Truncate long tags with title tooltip so long text never blows up container */}
                  <span
                    className="max-w-[240px] sm:max-w-[340px] md:max-w-[420px] truncate cursor-pointer hover:underline underline-offset-2"
                    title={`Click to edit: "${tag}"`}
                    onClick={() => startEditTag(tIndex)}
                  >
                    {tag}
                  </span>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => startEditTag(tIndex)}
                    className="text-primary/40 hover:text-primary transition-colors p-0.5 rounded-md hover:bg-primary/10"
                    title="Edit item"
                    aria-label={`Edit ${tag}`}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeTag(tIndex)}
                    className="text-primary/40 hover:text-rose-600 transition-colors p-0.5 rounded-md hover:bg-rose-50"
                    title={`Remove ${tag}`}
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Input area: Always clearly visible and prominent at the bottom */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100/80">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={tags.length === 0 ? placeholder : "Type and press Enter to add another..."}
            disabled={tags.length >= maxTags}
            className={`flex-1 min-w-[200px] font-medium text-gray-900 outline-none bg-transparent disabled:opacity-50 placeholder:text-gray-400 ${
              isFullBleed ? 'px-2 py-2 text-base sm:text-lg' : 'px-1.5 py-1 text-sm'
            }`}
          />
          {inputValue.trim() && (
            <button
              type="button"
              onClick={() => addTag(inputValue)}
              className="px-3 py-1 rounded-xl bg-[#0E7850] hover:bg-[#0b6342] text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
            >
              Add
            </button>
          )}
        </div>
      </div>

      {/* Multi-sentence paragraph split helper banner */}
      {pendingSplitParagraph && (
        <div className="p-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-center gap-2 text-emerald-900">
            <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Pasted paragraph kept together. Would you like to split it into separate sentences?</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleSplitParagraphIntoSentences}
              className="px-2.5 py-1 rounded-lg bg-[#0E7850] hover:bg-[#0b6342] text-white font-black text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
            >
              <Scissors className="w-3 h-3" />
              <span>Split Sentences</span>
            </button>
            <button
              type="button"
              onClick={() => setPendingSplitParagraph(null)}
              className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/50 rounded-lg transition-colors cursor-pointer"
              title="Keep together"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className={`mt-1.5 text-rose-500 font-bold animate-fade-in ${isFullBleed ? 'text-sm' : 'text-xs'}`}>
          {error}
        </p>
      )}
    </div>
  );
};

export default TagInput;
