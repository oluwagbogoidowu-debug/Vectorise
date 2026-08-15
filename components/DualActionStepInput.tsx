import React, { useState, useRef, useEffect, useMemo } from 'react';
import { parseDualInputState, serializeDualInputState, DualInputState } from '../src/utils/stepPlaceholderUtils';
import FormattedText from './FormattedText';
import { toast } from 'sonner';

interface AutoGrowingTextareaProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

const AutoGrowingTextarea: React.FC<AutoGrowingTextareaProps> = ({
  value,
  onChange,
  placeholder = "What's on your mind...",
  className = ""
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`text-gray-950 ${className} overflow-y-auto min-h-[80px]`}
      style={{ maxHeight: "180px" }}
    />
  );
};

const TagInput: React.FC<{
  value: string;
  onChange: (newVal: string) => void;
  maxTags?: number;
  placeholder?: string;
  onNext?: () => void;
}> = ({ value, onChange, maxTags = 10, placeholder = "Type and press Enter...", onNext }) => {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tags = useMemo<string[]>(() => {
    if (!value) return [];
    if (value.startsWith("[")) {
      try {
        return JSON.parse(value);
      } catch (err) {
        return [];
      }
    }
    return value.split(",").filter(Boolean);
  }, [value]);

  const addTag = (tag: string) => {
    const cleaned = tag.trim().replace(/^[,\s;]+|[,\s;]+$/g, "");
    if (!cleaned) return;
    
    if (tags.length >= maxTags) {
      setError(`Maximum of ${maxTags} tags allowed`);
      toast.error(`You can only add up to ${maxTags} tags.`);
      return;
    }

    if (tags.some(t => t.toLowerCase() === cleaned.toLowerCase())) {
      setError("This tag is already added");
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

  return (
    <div className="w-full text-left">
      <div className="w-full bg-white border border-gray-200 focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-primary transition-all duration-200 rounded-2xl p-3 flex flex-wrap gap-2 items-center">
        {tags.map((tag, tIndex) => (
          <span
            key={tIndex}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black tracking-tight bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10 transition-colors select-none"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tIndex)}
              className="text-primary/40 hover:text-primary transition-colors hover:bg-primary/15 rounded-full p-0.5"
              title={`Remove ${tag}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : "Add tag..."}
          disabled={tags.length >= maxTags}
          className="flex-1 min-w-[145px] px-2 py-1 text-sm font-medium text-gray-900 outline-none bg-transparent disabled:opacity-50"
        />
      </div>

      {error && (
        <div className="mt-2 px-1 text-[10px] font-black uppercase tracking-widest text-red-500 font-bold lowercase first-letter:uppercase animate-fade-in">
          {error}
        </div>
      )}
    </div>
  );
};

export interface DualActionStepInputProps {
  stepIdx: number;
  dayContent: any;
  taskInputValue: string;
  onInputChange: (serializedValue: string) => void;
  linkedTags?: string[];
  onNext?: () => void;
}

export const DualActionStepInput: React.FC<DualActionStepInputProps> = ({
  stepIdx,
  dayContent,
  taskInputValue,
  onInputChange,
  linkedTags = [],
  onNext
}) => {
  const dualState = parseDualInputState(taskInputValue);
  const inputType = dayContent?.taskInputTypes?.[stepIdx] || "text";

  const handleDualUpdate = (updates: Partial<DualInputState>) => {
    const nextState = { ...dualState, ...updates };
    const serialized = serializeDualInputState(nextState);
    onInputChange(serialized);
  };

  let customPollOptions: string[] = [];
  if (dayContent?.taskPollOptions?.[stepIdx]) {
    try {
      customPollOptions = JSON.parse(dayContent.taskPollOptions[stepIdx]);
    } catch (e) {}
  }
  customPollOptions = customPollOptions.filter(Boolean);
  const pollOptions = Array.from(new Set([...linkedTags, ...customPollOptions])).filter(Boolean);
  const isMultiSelect = !!dayContent?.taskPollMultiSelect?.[stepIdx] || inputType === "tags";

  return (
    <div className="space-y-4 mb-4 animate-fade-in text-left">
      {/* 1. TOP SECTION: Configured input type (Poll, Tags, Mark, Note, Multi-Text, or Connected Choices) */}
      {inputType === "poll" ? (
        <div className="space-y-2.5 p-3.5 bg-primary/5 rounded-2xl border border-primary/10">
          <p className="text-[10px] font-black uppercase text-primary tracking-widest pl-1 mb-1.5 flex items-center gap-1.5">
            <span>{isMultiSelect ? "☑️ Poll Options (Select one or more):" : "🔘 Poll Options (Select one):"}</span>
          </p>
          {pollOptions.length > 6 ? (
            <div className="flex flex-wrap gap-1.5 w-full">
              {pollOptions.map((opt: string, optIndex: number) => {
                const isSel = dualState.selectedChoices.includes(opt) || dualState.choice === opt;
                return (
                  <button
                    key={optIndex}
                    type="button"
                    onClick={() => {
                      let newChoices: string[];
                      if (isMultiSelect) {
                        newChoices = isSel
                          ? dualState.selectedChoices.filter((c) => c !== opt)
                          : [...dualState.selectedChoices, opt];
                      } else {
                        newChoices = isSel ? [] : [opt];
                      }
                      handleDualUpdate({
                        choice: newChoices[0] || "",
                        selectedChoices: newChoices,
                      });
                    }}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border cursor-pointer ${
                      isSel
                        ? "bg-primary text-white border-primary shadow-md"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2 w-full">
              {pollOptions.map((opt: string, optIndex: number) => {
                const isSel = dualState.selectedChoices.includes(opt) || dualState.choice === opt;
                return (
                  <button
                    key={optIndex}
                    type="button"
                    onClick={() => {
                      let newChoices: string[];
                      if (isMultiSelect) {
                        newChoices = isSel
                          ? dualState.selectedChoices.filter((c) => c !== opt)
                          : [...dualState.selectedChoices, opt];
                      } else {
                        newChoices = isSel ? [] : [opt];
                      }
                      handleDualUpdate({
                        choice: newChoices[0] || "",
                        selectedChoices: newChoices,
                      });
                    }}
                    className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all text-left border flex items-center justify-between cursor-pointer ${
                      isSel
                        ? "bg-primary/10 border-primary text-primary shadow-sm"
                        : "bg-white border-primary/10 hover:border-primary/30 text-gray-700 hover:bg-gray-50/50"
                    }`}
                  >
                    <span>
                      {String.fromCharCode(65 + optIndex)}. {opt}
                    </span>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSel ? "border-primary bg-primary text-white" : "border-gray-300 bg-white"
                      }`}
                    >
                      {isSel && (
                        <svg className="w-2.5 h-2.5 text-white animate-fade-in" fill="none" stroke="currentColor" strokeWidth={4} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : inputType === "tags" ? (
        <div className="space-y-3">
          <TagInput
            value={JSON.stringify(dualState.selectedChoices)}
            onChange={(newVal) => {
              try {
                const parsed = JSON.parse(newVal);
                if (Array.isArray(parsed)) {
                  handleDualUpdate({
                    choice: parsed[0] || "",
                    selectedChoices: parsed,
                  });
                }
              } catch (e) {}
            }}
            placeholder="Type and press Enter to add tags..."
            onNext={onNext}
          />
          {linkedTags.length > 0 && (
            <div className="pt-2 animate-fade-in text-left">
              <p className="text-[10px] font-black text-[#0E7850] uppercase tracking-widest mb-2">
                🏷️ Connected Choices (Click to Toggle):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {linkedTags.map((tag, tagIndex) => {
                  const isSel = dualState.selectedChoices.some((t) => t.toLowerCase() === tag.toLowerCase());
                  return (
                    <button
                      key={tagIndex}
                      type="button"
                      onClick={() => {
                        let newTags: string[];
                        if (isSel) {
                          newTags = dualState.selectedChoices.filter((t) => t.toLowerCase() !== tag.toLowerCase());
                        } else {
                          newTags = [...dualState.selectedChoices, tag];
                        }
                        handleDualUpdate({
                          choice: newTags[0] || "",
                          selectedChoices: newTags,
                        });
                      }}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border cursor-pointer ${
                        isSel
                          ? "bg-[#0E7850] text-white border-[#0E7850] shadow-md"
                          : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-750"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : inputType === "mark" ? (
        <div className="space-y-4 animate-fade-in text-left">
          <button
            type="button"
            onClick={() => {
              const isCompleted = dualState.choice === "Completed";
              handleDualUpdate({
                choice: isCompleted ? "" : "Completed",
                selectedChoices: isCompleted ? [] : ["Completed"],
              });
            }}
            className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all duration-200 shadow-sm cursor-pointer ${
              dualState.choice === "Completed"
                ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-950"
                : "bg-white border-primary/10 hover:border-primary/20 text-gray-700 hover:bg-gray-50/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                  dualState.choice === "Completed" ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 bg-white"
                }`}
              >
                {dualState.choice === "Completed" && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-bold tracking-wide">
                {dualState.choice === "Completed" ? "Completed & Verified!" : "Mark as Completed"}
              </span>
            </div>
            {dualState.choice === "Completed" && (
              <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                DONE
              </span>
            )}
          </button>
        </div>
      ) : inputType === "note" ? (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/15 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">Informational Step Note</p>
            <p className="text-xs text-emerald-700 font-medium">Review the prompt above and complete the action input below.</p>
          </div>
        </div>
      ) : pollOptions.length > 0 ? (
        <div className="space-y-2 p-3.5 bg-primary/5 rounded-2xl border border-primary/10">
          <p className="text-[10px] font-black uppercase text-primary tracking-widest pl-1 mb-1.5 flex items-center gap-1.5">
            <span>🔘 Connected Choices (Select one or more):</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pollOptions.map((opt: string, optIndex: number) => {
              const isSel = dualState.selectedChoices.includes(opt) || dualState.choice === opt;
              return (
                <button
                  key={optIndex}
                  type="button"
                  onClick={() => {
                    let newChoices: string[];
                    if (isSel) {
                      newChoices = dualState.selectedChoices.filter((c) => c !== opt);
                    } else {
                      newChoices = [...dualState.selectedChoices, opt];
                    }
                    handleDualUpdate({
                      choice: newChoices[0] || "",
                      selectedChoices: newChoices,
                    });
                  }}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border cursor-pointer ${
                    isSel
                      ? "bg-primary text-white border-primary shadow-md"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* 2. BOTTOM SECTION: Action Step Input Textarea (Always rendered in Main mode) */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">
          Action Step Input:
        </label>
        <AutoGrowingTextarea
          value={dualState.text}
          onChange={(val) => {
            handleDualUpdate({ text: val });
          }}
          placeholder="What's on your mind..."
          className="w-full px-4 py-3 bg-white border border-primary/10 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all resize-none animate-fade-in"
        />
      </div>
    </div>
  );
};

export default DualActionStepInput;
