import React, { useState } from 'react';
import { X, Plus, Sparkles, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { parseThoughtSentences } from '../src/utils/stepPlaceholderUtils';

export interface ThoughtTagEditorProps {
  thoughts: string[];
  onChange: (newThoughts: string[]) => void;
  onClose?: () => void;
  selectedText?: string;
  onAssignSelected?: (text: string) => void;
  title?: string;
  placeholder?: string;
}

export const ThoughtTagEditor: React.FC<ThoughtTagEditorProps> = ({
  thoughts = [],
  onChange,
  onClose,
  selectedText = '',
  onAssignSelected,
  title = 'Task Thoughts',
  placeholder = 'Type a thought question and press Enter, or paste text to auto-convert sentences...',
}) => {
  const [inputValue, setInputValue] = useState('');

  const safeThoughts = Array.isArray(thoughts)
    ? thoughts.filter((t) => t && typeof t === 'string' && t.trim().length > 0)
    : [];

  const handleAdd = (textToAdd: string) => {
    const trimmed = textToAdd.trim();
    if (!trimmed) return;
    const sentences = parseThoughtSentences(trimmed);
    if (sentences.length === 0) return;

    const updated = [...safeThoughts, ...sentences];
    onChange(updated);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAdd(inputValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted && pasted.trim()) {
      e.preventDefault();
      handleAdd(pasted);
    }
  };

  const handleRemove = (indexToRemove: number) => {
    const updated = safeThoughts.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= safeThoughts.length) return;
    const updated = [...safeThoughts];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;
    onChange(updated);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const selectedSentences = selectedText ? parseThoughtSentences(selectedText) : [];

  return (
    <div className="mt-2.5 p-3.5 bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/60 rounded-2xl animate-fade-in text-left space-y-3">
      {/* Header */}
      <div className="flex justify-between items-center pb-1 border-b border-teal-150/70 dark:border-teal-900/40">
        <label className="text-[9px] font-black text-teal-800 dark:text-teal-300 uppercase tracking-widest px-0.5 flex items-center gap-1.5">
          <Sparkles size={12} className="text-teal-600" />
          <span>{title}</span>
          <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-100/80 dark:bg-teal-950/60 px-2 py-0.5 rounded-full">
            {safeThoughts.length} {safeThoughts.length === 1 ? 'thought' : 'thoughts'}
          </span>
        </label>

        <div className="flex items-center gap-2">
          {safeThoughts.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[9px] font-bold text-gray-400 hover:text-red-500 transition-colors flex items-center gap-0.5"
              title="Clear all thoughts"
            >
              <Trash2 size={10} />
              <span>Clear</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
              title="Remove Thought from this step"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <p className="text-[10px] text-teal-900/80 dark:text-teal-300/80 leading-relaxed">
        Displays one thought question at a time above the footnote in sprint view (with 5s auto-unveil & next arrow). The action step Next button stays locked until the participant views through to the last thought.
      </p>

      {/* Smart Mode Auto-Fill Banner when text is highlighted */}
      {selectedSentences.length > 0 && (
        <div className="p-2.5 bg-gradient-to-r from-teal-100/90 to-emerald-100/80 dark:from-teal-950/50 dark:to-emerald-950/40 border border-teal-300/70 dark:border-teal-700/60 rounded-xl flex items-center justify-between gap-2 animate-fade-in shadow-2xs">
          <div className="min-w-0 pr-1">
            <p className="text-[10px] font-black text-teal-950 dark:text-teal-200">
              Selected text has {selectedSentences.length} sentence{selectedSentences.length === 1 ? '' : 's'}
            </p>
            <p className="text-[9px] text-teal-800/80 dark:text-teal-300/80 truncate">
              Auto-split each sentence into a thought tag
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onAssignSelected) {
                onAssignSelected(selectedText);
              } else {
                handleAdd(selectedText);
              }
            }}
            className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-[9px] font-black uppercase tracking-wider shrink-0 transition-all active:scale-95 shadow-xs cursor-pointer flex items-center gap-1"
          >
            <Sparkles size={10} />
            <span>Assign Selected</span>
          </button>
        </div>
      )}

      {/* Tags List */}
      {safeThoughts.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {safeThoughts.map((thought, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-zinc-900 rounded-xl border border-teal-200/60 dark:border-zinc-800 shadow-2xs group hover:border-teal-300 transition-all"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-5 h-5 rounded-md bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 text-[10px] font-black flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 truncate">
                  {thought}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {safeThoughts.length > 1 && (
                  <>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'up')}
                      className={`p-1 rounded text-gray-400 hover:text-teal-600 ${
                        idx === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-teal-50'
                      }`}
                      title="Move up"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === safeThoughts.length - 1}
                      onClick={() => handleMove(idx, 'down')}
                      className={`p-1 rounded text-gray-400 hover:text-teal-600 ${
                        idx === safeThoughts.length - 1
                          ? 'opacity-30 cursor-not-allowed'
                          : 'cursor-pointer hover:bg-teal-50'
                      }`}
                      title="Move down"
                    >
                      <ArrowDown size={11} />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Remove this thought"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input row for typing or pasting */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-teal-200 dark:border-zinc-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-100 focus:border-teal-500 outline-none text-gray-800 dark:text-zinc-100 placeholder-gray-400"
        />
        <button
          type="button"
          onClick={() => handleAdd(inputValue)}
          disabled={!inputValue.trim()}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
            inputValue.trim()
              ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer active:scale-95'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Plus size={13} />
          <span>Add</span>
        </button>
      </div>
    </div>
  );
};

export default ThoughtTagEditor;
