import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, Check, HelpCircle, Tag, Plus, X } from 'lucide-react';
import { MetadataInterventionStepConfig } from '../src/utils/stepPlaceholderUtils';
import FormattedText from './FormattedText';

interface MetadataInterventionCardProps {
  config: MetadataInterventionStepConfig;
  isFullBleed?: boolean;
  onSave: (fieldKey: string, value: string) => Promise<void> | void;
  isSaving?: boolean;
}

export const MetadataInterventionCard: React.FC<MetadataInterventionCardProps> = ({
  config,
  isFullBleed = false,
  onSave,
  isSaving = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [tagList, setTagList] = useState<string[]>([]);
  const [tagInputText, setTagInputText] = useState('');
  const [multiTextAnswers, setMultiTextAnswers] = useState<Record<string, string>>({});
  const [showHint, setShowHint] = useState(false);

  // Parse poll options if applicable
  const pollOptions = useMemo<string[]>(() => {
    if (!config.pollOptions) return [];
    if (Array.isArray(config.pollOptions)) return config.pollOptions.filter(Boolean);
    try {
      const parsed = JSON.parse(config.pollOptions);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (e) {
      return String(config.pollOptions).split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }, [config.pollOptions]);

  const inputType = String(config.inputType || 'text').toLowerCase().trim();
  const isPoll = inputType === 'poll' || inputType === 'multichoice' || pollOptions.length > 0;
  const isTags = inputType === 'tags';
  const isMultiText = inputType === 'multitext' && Array.isArray(config.multiTextLabels) && config.multiTextLabels.length > 0;

  // Handle adding tag
  const handleAddTag = (text: string) => {
    const clean = text.trim().replace(/^[,\s;]+|[,\s;]+$/g, '');
    if (!clean) return;
    if (!tagList.some(t => t.toLowerCase() === clean.toLowerCase())) {
      setTagList([...tagList, clean]);
    }
    setTagInputText('');
  };

  const handleRemoveTag = (index: number) => {
    setTagList(tagList.filter((_, idx) => idx !== index));
  };

  // Determine current value ready for submission
  const hasValidValue = useMemo(() => {
    if (isTags) {
      return tagList.length > 0 || tagInputText.trim().length > 0;
    }
    if (isPoll) {
      return selectedChoices.length > 0 || inputValue.trim().length > 0;
    }
    if (isMultiText) {
      return Object.values(multiTextAnswers).some(val => val && val.trim().length > 0);
    }
    return inputValue.trim().length > 0;
  }, [isTags, tagList, tagInputText, isPoll, selectedChoices, inputValue, isMultiText, multiTextAnswers]);

  const handleSubmit = async () => {
    if (isSaving) return;

    let finalValue = '';
    if (isTags) {
      const allTags = [...tagList];
      if (tagInputText.trim() && !allTags.some(t => t.toLowerCase() === tagInputText.trim().toLowerCase())) {
        allTags.push(tagInputText.trim());
      }
      finalValue = JSON.stringify(allTags);
    } else if (isPoll) {
      if (selectedChoices.length > 1) {
        finalValue = JSON.stringify(selectedChoices);
      } else if (selectedChoices.length === 1) {
        finalValue = selectedChoices[0];
      } else {
        finalValue = inputValue.trim();
      }
    } else if (isMultiText) {
      finalValue = JSON.stringify(multiTextAnswers);
    } else {
      finalValue = inputValue.trim();
    }

    if (!finalValue) return;
    await onSave(config.fieldKey, finalValue);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -10 }}
      transition={{ duration: 0.25 }}
      className={`w-full ${
        isFullBleed 
          ? 'bg-white dark:bg-zinc-900 px-6 sm:px-16 md:px-24 py-10 md:py-16' 
          : 'p-6 sm:p-8 bg-gradient-to-b from-amber-500/[0.04] to-emerald-500/[0.04] dark:from-amber-950/20 dark:to-emerald-950/20 rounded-3xl border border-amber-500/20 dark:border-amber-800/30'
      } text-left relative overflow-hidden shadow-sm`}
    >
      {/* Top Banner / Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 dark:border-amber-800/40 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
            <span>Prerequisite Setup • {config.fieldLabel}</span>
          </span>
          {config.sourceSprintTitle && (
            <span className="hidden sm:inline-flex px-2.5 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 text-[10px] font-bold rounded-lg border border-gray-200 dark:border-zinc-700">
              From: {config.sourceSprintTitle}
            </span>
          )}
        </div>

        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md">
          Action Step Required
        </span>
      </div>

      {/* Main Prompt */}
      <div className={`text-gray-950 dark:text-white font-black leading-tight ${isFullBleed ? 'text-xl sm:text-2xl md:text-3xl' : 'text-lg sm:text-xl'} mb-3`}>
        <FormattedText text={config.prompt} />
      </div>

      {/* Footnote */}
      {config.footnote && (
        <div className="mb-5 text-left text-emerald-600 dark:text-emerald-400 font-bold leading-relaxed text-xs sm:text-sm">
          <FormattedText text={config.footnote} />
        </div>
      )}

      {/* Hint toggle & expandable card */}
      {config.hint && (
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setShowHint(!showHint)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest bg-gray-100 dark:bg-zinc-800 text-gray-500 hover:text-amber-600 transition-all cursor-pointer"
          >
            <HelpCircle className="w-3 h-3" />
            <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
          </button>
          {showHint && (
            <div className="mt-2.5 p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs leading-relaxed italic">
              <FormattedText text={config.hint} />
            </div>
          )}
        </div>
      )}

      {/* Interactive Input Form Area */}
      <div className="space-y-4 my-6">
        {/* Case 1: Poll / Multi-Choice Options */}
        {isPoll && (
          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase text-gray-500 dark:text-zinc-400 tracking-wider">
              Select your choice:
            </p>
            <div className="flex flex-wrap gap-2.5 w-full">
              {pollOptions.map((opt, idx) => {
                const isSelected = selectedChoices.includes(opt) || inputValue === opt;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedChoices([opt]);
                      setInputValue(opt);
                    }}
                    className={`px-4 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer border flex items-center gap-2 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30 scale-[1.02]'
                        : 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border-gray-200 dark:border-zinc-700 hover:border-emerald-500/50 hover:bg-gray-50 dark:hover:bg-zinc-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-gray-300 dark:bg-zinc-600'}`} />
                    <span>{opt}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Case 2: Tags Input */}
        {isTags && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 min-h-[38px] p-2 bg-white dark:bg-zinc-800 rounded-2xl border border-gray-200 dark:border-zinc-700">
              {tagList.map((tag, tIdx) => (
                <span
                  key={tIdx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800/40"
                >
                  <Tag className="w-3 h-3" />
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tIdx)}
                    className="p-0.5 hover:bg-emerald-200/50 rounded-full cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="flex-1 min-w-[140px] flex items-center gap-1.5">
                <input
                  type="text"
                  value={tagInputText}
                  onChange={(e) => setTagInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddTag(tagInputText);
                    }
                  }}
                  placeholder={tagList.length === 0 ? "Type and press Enter or comma..." : "Add another..."}
                  className="w-full bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white outline-none font-medium"
                />
                {tagInputText.trim() && (
                  <button
                    type="button"
                    onClick={() => handleAddTag(tagInputText)}
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-gray-400 font-medium pl-1">
              Press Enter or comma to add tags.
            </p>
          </div>
        )}

        {/* Case 3: Multi-Text Input */}
        {isMultiText && (
          <div className="space-y-4">
            {config.multiTextLabels!.map((label, lIdx) => (
              <div key={lIdx} className="space-y-2 p-3 bg-white dark:bg-zinc-800 rounded-2xl border border-gray-200 dark:border-zinc-700">
                <label className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider block">
                  📝 {label}
                </label>
                <textarea
                  rows={2}
                  value={multiTextAnswers[label] || ''}
                  onChange={(e) => setMultiTextAnswers({ ...multiTextAnswers, [label]: e.target.value })}
                  placeholder={`Your answer for ${label}...`}
                  className="w-full p-3 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white rounded-xl text-sm font-medium border border-gray-200 dark:border-zinc-800 focus:border-emerald-500 outline-none resize-none"
                />
              </div>
            ))}
          </div>
        )}

        {/* Case 4: Standard Text / Textarea (Default) */}
        {!isPoll && !isTags && !isMultiText && (
          <div className="space-y-2">
            <textarea
              rows={3}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Enter your ${config.fieldLabel.toLowerCase()} here...`}
              className="w-full p-4 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white rounded-2xl text-base font-medium border border-gray-200 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none shadow-xs"
            />
          </div>
        )}
      </div>

      {/* Submit Action Button */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium hidden sm:block">
          This will save your {config.fieldLabel.toLowerCase()} and personalize your upcoming sprint steps.
        </p>

        <button
          type="button"
          disabled={!hasValidValue || isSaving}
          onClick={handleSubmit}
          className={`ml-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${
            hasValidValue && !isSaving
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              : 'bg-gray-200 dark:bg-zinc-800 text-gray-400 cursor-not-allowed opacity-70'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>Save & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default MetadataInterventionCard;
