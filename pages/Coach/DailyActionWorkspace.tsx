import React, { useState, useEffect } from 'react';
import { Sprint, DailyContent } from '../../types';
import { Plus, Trash2, X, Sparkles, Layers, Save, CheckCircle2 } from 'lucide-react';
import LocalLogo from '../../components/LocalLogo';

interface DailyActionWorkspaceProps {
  sprint: Sprint | null;
  setSprint: React.Dispatch<React.SetStateAction<Sprint | null>>;
  selectedDay: number;
  setSelectedDay: (day: number) => void;
  onClose: () => void;
  onSaveDraft?: () => Promise<void>;
  saveStatus?: 'idle' | 'saving' | 'saved';
}

export default function DailyActionWorkspace({
  sprint,
  setSprint,
  selectedDay,
  setSelectedDay,
  onClose,
  onSaveDraft,
  saveStatus = 'idle',
}: DailyActionWorkspaceProps) {
  const [advancedGeneralInput, setAdvancedGeneralInput] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [activeStepIndices, setActiveStepIndices] = useState<Record<number, number>>({});
  const [activeLinkSelectorIndex, setActiveLinkSelectorIndex] = useState<number | null>(null);
  const [activeLinkSelectorType, setActiveLinkSelectorType] = useState<'tag' | 'text' | null>(null);
  const [addingCustomOption, setAddingCustomOption] = useState<Record<number, boolean>>({});
  const [lastAssignedField, setLastAssignedField] = useState<string | null>(null);
  const [showHelpSheet, setShowHelpSheet] = useState(false);

  // Load from database/sprint or fallback to local storage
  useEffect(() => {
    if (sprint) {
      if (sprint.curriculumSource !== undefined) {
        setAdvancedGeneralInput(sprint.curriculumSource || '');
      } else {
        const saved = localStorage.getItem(`curriculum_source_${sprint.id || 'temp'}`);
        if (saved) {
          setAdvancedGeneralInput(saved);
          setSprint(prev => prev ? { ...prev, curriculumSource: saved } : null);
        }
      }
    }
  }, [sprint?.id]);

  const handleGeneralInputChange = (val: string) => {
    setAdvancedGeneralInput(val);
    setSprint(prev => {
      if (!prev) return null;
      return { ...prev, curriculumSource: val };
    });
    localStorage.setItem(`curriculum_source_${sprint?.id || 'temp'}`, val);
  };

  const handleTextareaSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (start !== end) {
      const selected = target.value.substring(start, end).trim();
      if (selected.length > 0) {
        setSelectedText(selected);
      }
    }
  };

  const getDailyContentForDay = (dayNum: number): DailyContent => {
    if (!sprint) return { day: dayNum, lessonText: '', taskPrompt: '', taskPrompts: ['', '', ''], taskHints: [] };
    const content = (Array.isArray(sprint.dailyContent) ? sprint.dailyContent.find(c => c.day === dayNum) : undefined) || {
      day: dayNum, lessonText: '', taskPrompt: '', taskPrompts: ['', '', ''], taskHints: []
    };
    
    const safePrompts = Array.isArray((content as any).taskPrompts) && (content as any).taskPrompts.length > 0
      ? (content as any).taskPrompts
      : [content.taskPrompt || '', '', ''];
      
    const paddedPrompts = [...safePrompts];
    while (paddedPrompts.length < 3) paddedPrompts.push('');

    const safeHints = Array.isArray((content as any).taskHints) ? (content as any).taskHints : [];
    const safeNotes = Array.isArray((content as any).taskNotes) ? (content as any).taskNotes : [];
    const safeTagNotes = Array.isArray((content as any).taskTagNotes) ? (content as any).taskTagNotes : [];
    const safeFootnotes = Array.isArray((content as any).taskFootnotes) ? (content as any).taskFootnotes : [];
    const safePollMultiSelect = Array.isArray((content as any).taskPollMultiSelect) ? (content as any).taskPollMultiSelect : [];
    const safeMultiTextLabels = Array.isArray((content as any).taskMultiTextLabels) ? (content as any).taskMultiTextLabels : [];

    return {
        ...content,
        taskPrompts: paddedPrompts,
        taskHints: safeHints,
        taskNotes: safeNotes,
        taskTagNotes: safeTagNotes,
        taskFootnotes: safeFootnotes,
        taskPollMultiSelect: safePollMultiSelect,
        taskMultiTextLabels: safeMultiTextLabels
    } as any;
  };

  const handleAddStepForDay = (dayNum: number) => {
    setSprint(prev => {
      if (!prev) return null;
      const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === dayNum) : -1;
      let updatedDailyContent = Array.isArray(prev.dailyContent) ? [...prev.dailyContent] : [];
      
      const dayContent = existingContentIndex >= 0 ? updatedDailyContent[existingContentIndex] : {
        day: dayNum, lessonText: '', taskPrompt: '', taskPrompts: ['', '', '']
      };
      
      const currentPrompts = Array.isArray(dayContent.taskPrompts) ? [...dayContent.taskPrompts] : [dayContent.taskPrompt || '', '', ''];
      currentPrompts.push('');
      
      const currentTypes = Array.isArray(dayContent.taskInputTypes) ? [...dayContent.taskInputTypes] : Array(currentPrompts.length - 1).fill('text');
      currentTypes.push('text');

      const currentHints = Array.isArray(dayContent.taskHints) ? [...dayContent.taskHints] : [];
      while (currentHints.length < currentPrompts.length) currentHints.push(null as any);

      const currentNotes = Array.isArray(dayContent.taskNotes) ? [...dayContent.taskNotes] : [];
      while (currentNotes.length < currentPrompts.length) currentNotes.push(null as any);

      const currentFootnotes = Array.isArray(dayContent.taskFootnotes) ? [...dayContent.taskFootnotes] : [];
      while (currentFootnotes.length < currentPrompts.length) currentFootnotes.push(null as any);

      if (existingContentIndex >= 0) {
        updatedDailyContent[existingContentIndex] = {
          ...dayContent,
          taskPrompts: currentPrompts,
          taskInputTypes: currentTypes,
          taskHints: currentHints,
          taskNotes: currentNotes,
          taskFootnotes: currentFootnotes
        };
      } else {
        updatedDailyContent.push({
          day: dayNum,
          lessonText: '',
          taskPrompt: '',
          taskPrompts: currentPrompts,
          taskInputTypes: currentTypes,
          taskHints: currentHints,
          taskNotes: currentNotes,
          taskFootnotes: currentFootnotes
        });
      }
      return { ...prev, dailyContent: updatedDailyContent };
    });
  };

  const handleRemoveStepForDay = (dayNum: number, index: number) => {
    setSprint(prev => {
      if (!prev) return null;
      const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === dayNum) : -1;
      if (existingContentIndex < 0) return prev;
      let updatedDailyContent = [...prev.dailyContent];
      const dayContent = updatedDailyContent[existingContentIndex];

      const currentPrompts = Array.isArray(dayContent.taskPrompts) ? [...dayContent.taskPrompts] : [];
      if (currentPrompts.length <= 1) return prev; // Keep at least 1 step

      const currentTypes = Array.isArray(dayContent.taskInputTypes) ? [...dayContent.taskInputTypes] : [];
      const currentHints = Array.isArray(dayContent.taskHints) ? [...dayContent.taskHints] : [];
      const currentNotes = Array.isArray(dayContent.taskNotes) ? [...dayContent.taskNotes] : [];
      const currentFootnotes = Array.isArray(dayContent.taskFootnotes) ? [...dayContent.taskFootnotes] : [];

      currentPrompts.splice(index, 1);
      if (currentTypes.length > index) currentTypes.splice(index, 1);
      if (currentHints.length > index) currentHints.splice(index, 1);
      if (currentNotes.length > index) currentNotes.splice(index, 1);
      if (currentFootnotes.length > index) currentFootnotes.splice(index, 1);

      updatedDailyContent[existingContentIndex] = {
        ...dayContent,
        taskPrompts: currentPrompts,
        taskInputTypes: currentTypes,
        taskHints: currentHints,
        taskNotes: currentNotes,
        taskFootnotes: currentFootnotes
      };

      return { ...prev, dailyContent: updatedDailyContent };
    });

    setActiveStepIndices(prev => ({ ...prev, [dayNum]: Math.max(0, (prev[dayNum] || 0) - 1) }));
  };

  const updateFieldForDay = (dayNum: number, field: keyof DailyContent, value: any) => {
    setSprint(prev => {
      if (!prev) return null;
      const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === dayNum) : -1;
      let updatedDailyContent = Array.isArray(prev.dailyContent) ? [...prev.dailyContent] : [];
      
      if (existingContentIndex >= 0) {
        updatedDailyContent[existingContentIndex] = {
          ...updatedDailyContent[existingContentIndex],
          [field]: value
        };
      } else {
        updatedDailyContent.push({
          day: dayNum,
          lessonText: '',
          taskPrompt: '',
          [field]: value
        } as any);
      }
      return { ...prev, dailyContent: updatedDailyContent };
    });
  };

  const handleTaskPromptChange = (dayNum: number, index: number, value: string) => {
    const dayContent = getDailyContentForDay(dayNum);
    const prompts = [...(dayContent.taskPrompts || ['', '', ''])];
    while (prompts.length <= index) prompts.push('');
    prompts[index] = value;
    updateFieldForDay(dayNum, 'taskPrompts', prompts);
  };

  const handleTaskNoteChange = (dayNum: number, index: number, value: string | null) => {
    const dayContent = getDailyContentForDay(dayNum);
    const notes = [...(dayContent.taskNotes || [])];
    while (notes.length <= index) notes.push(null as any);
    notes[index] = value as any;
    updateFieldForDay(dayNum, 'taskNotes', notes);
  };

  const handleTaskHintChange = (dayNum: number, index: number, value: string | null) => {
    const dayContent = getDailyContentForDay(dayNum);
    const hints = [...(dayContent.taskHints || [])];
    while (hints.length <= index) hints.push(null as any);
    hints[index] = value as any;
    updateFieldForDay(dayNum, 'taskHints', hints);
  };

  const handleTaskFootnoteChange = (dayNum: number, index: number, value: string | null) => {
    const dayContent = getDailyContentForDay(dayNum);
    const footnotes = [...(dayContent.taskFootnotes || [])];
    while (footnotes.length <= index) footnotes.push(null as any);
    footnotes[index] = value as any;
    updateFieldForDay(dayNum, 'taskFootnotes', footnotes);
  };

  const handleTaskPromptTypeChange = (dayNum: number, index: number, value: 'text' | 'tags' | 'poll' | 'mark') => {
    const dayContent = getDailyContentForDay(dayNum);
    const types = [...(dayContent.taskInputTypes || [])];
    while (types.length <= index) types.push('text');
    types[index] = value;
    updateFieldForDay(dayNum, 'taskInputTypes', types);
  };

  const handleTaskMultiTextLabelsChange = (dayNum: number, index: number, value: string[] | null) => {
    const dayContent = getDailyContentForDay(dayNum);
    const labels = [...(dayContent.taskMultiTextLabels || [])];
    while (labels.length <= index) labels.push([]);
    labels[index] = value as any;
    updateFieldForDay(dayNum, 'taskMultiTextLabels', labels);
  };

  const handleTogglePollMultiSelect = (dayNum: number, index: number) => {
    const dayContent = getDailyContentForDay(dayNum);
    const multi = [...(dayContent.taskPollMultiSelect || [])];
    while (multi.length <= index) multi.push(false);
    multi[index] = !multi[index];
    updateFieldForDay(dayNum, 'taskPollMultiSelect', multi);
  };

  const handleToggleSpread = (dayNum: number, index: number) => {
    const dayContent = getDailyContentForDay(dayNum);
    const spread = [...(dayContent.taskSpread || [])];
    while (spread.length <= index) spread.push(false);
    spread[index] = !spread[index];
    updateFieldForDay(dayNum, 'taskSpread', spread);
  };

  const handleTaskPollOptionChange = (dayNum: number, index: number, optIndex: number, value: string) => {
    const dayContent = getDailyContentForDay(dayNum);
    const options = [...(dayContent.taskPollOptions || [])];
    while (options.length <= index) options.push('[]');
    
    let currentOptionsList: string[] = [];
    try {
      currentOptionsList = JSON.parse(options[index] || '[]');
    } catch (e) {}
    
    while (currentOptionsList.length <= optIndex) currentOptionsList.push('');
    currentOptionsList[optIndex] = value;
    options[index] = JSON.stringify(currentOptionsList);
    updateFieldForDay(dayNum, 'taskPollOptions', options);
  };

  const removeTaskPollOption = (dayNum: number, index: number, optIndex: number) => {
    const dayContent = getDailyContentForDay(dayNum);
    const options = [...(dayContent.taskPollOptions || [])];
    while (options.length <= index) options.push('[]');
    
    let currentOptionsList: string[] = [];
    try {
      currentOptionsList = JSON.parse(options[index] || '[]');
    } catch (e) {}
    
    if (currentOptionsList.length > optIndex) {
      currentOptionsList.splice(optIndex, 1);
    }
    options[index] = JSON.stringify(currentOptionsList);
    updateFieldForDay(dayNum, 'taskPollOptions', options);
  };

  const handleToggleLinkToNext = (dayNum: number, index: number) => {
    const dayContent = getDailyContentForDay(dayNum);
    const linked = [...(dayContent.taskLinkedToNext || [])];
    while (linked.length <= index) linked.push(false);
    linked[index] = !linked[index];
    updateFieldForDay(dayNum, 'taskLinkedToNext', linked);
  };

  const handleToggleSourceLink = (dayNum: number, index: number, val: number) => {
    const dayContent = getDailyContentForDay(dayNum);
    const sources = [...(dayContent.taskLinkedSources || [])];
    while (sources.length <= index) sources.push([]);
    
    const currentSources = Array.isArray(sources[index]) ? [...sources[index]] : [];
    if (currentSources.includes(val)) {
      sources[index] = currentSources.filter(v => v !== val);
    } else {
      currentSources.push(val);
      sources[index] = currentSources;
    }
    updateFieldForDay(dayNum, 'taskLinkedSources', sources);
  };

  const handleClearSourceLinks = (dayNum: number, index: number) => {
    const dayContent = getDailyContentForDay(dayNum);
    const sources = [...(dayContent.taskLinkedSources || [])];
    while (sources.length <= index) sources.push([]);
    sources[index] = [];
    updateFieldForDay(dayNum, 'taskLinkedSources', sources);
  };

  const getPrecedingDaysTagStepsForDay = (day: number) => {
    if (!sprint || day <= 1) return [];
    const result: { day: number; stepIdx: number; type: string; label: string; prompt: string }[] = [];
    
    const sortedContent = [...(sprint.dailyContent || [])].sort((a, b) => b.day - a.day);
    
    sortedContent.forEach(dc => {
      if (dc.day < day) {
        dc.taskInputTypes?.forEach((type, idx) => {
          if (type === 'tags' || type === 'poll' || type === 'text' || !type) {
            const prompt = dc.taskPrompts?.[idx] || dc.taskPrompt || `Step ${idx + 1}`;
            result.push({
              day: dc.day,
              stepIdx: idx,
              type: type || 'text',
              label: `D${dc.day} - Step ${idx + 1}`,
              prompt
            });
          }
        });
      }
    });
    
    return result;
  };

  const smallEditorInputClasses = "w-full p-3 bg-white border border-gray-150 rounded-xl shadow-xs focus:ring-4 focus:ring-purple-100 focus:border-purple-400 outline-none text-sm font-medium transition-all placeholder-gray-350 resize-none disabled:bg-gray-50 disabled:text-gray-500 disabled:italic";

  return (
    <div className="fixed inset-0 z-[120] bg-gray-50 w-screen h-screen overflow-y-auto animate-fade-in font-sans">
      {/* Full Bleed Body with two columns that flows together */}
      <div className="flex flex-col lg:flex-row w-full min-h-full p-4 sm:p-6 gap-6 justify-center items-start">
        {/* Left Column: General Content Hub */}
        <div className="w-full lg:w-[420px] bg-white border border-gray-200 rounded-3xl flex flex-col p-5 space-y-4 shadow-sm relative shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">General Content Hub</label>
              
              <div className="inline-block">
                <button 
                  type="button" 
                  onClick={() => setShowHelpSheet(true)}
                  className="text-gray-400 hover:text-[#0E7850] transition-colors p-0.5 rounded flex items-center justify-center cursor-pointer"
                  title="How to use General Content Hub"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {advancedGeneralInput && (
                <button 
                  type="button"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear the general text area?")) {
                      handleGeneralInputChange('');
                      setSelectedText('');
                    }
                  }}
                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-755 transition-colors flex items-center justify-center cursor-pointer border border-red-100"
                  title="Delete Entire Content"
                >
                  <Trash2 size={12} />
                </button>
              )}

              <button 
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center cursor-pointer border border-gray-200"
                title="Exit"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          <textarea 
            value={advancedGeneralInput}
            onChange={e => handleGeneralInputChange(e.target.value)}
            onSelect={handleTextareaSelect}
            className="w-full h-[500px] p-4 bg-white border border-gray-150 rounded-2xl shadow-inner focus:ring-4 focus:ring-purple-100 focus:border-purple-400 outline-none text-sm font-medium transition-all placeholder-gray-300 resize-none overflow-y-auto"
            placeholder="paste or type all your sprint actions steps and other details here...."
          />

          {/* Compact Curriculum Timeline Selector */}
          <div className="shrink-0 bg-purple-50/30 p-3 rounded-2xl border border-purple-100/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-purple-700/80 uppercase tracking-wider">
                Curriculum Timeline
              </span>
              <span className="text-[9px] font-bold text-purple-600 uppercase tracking-widest bg-white px-2 py-0.5 rounded-md border border-purple-100 shadow-3xs">
                Day {selectedDay} Active
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scroll-smooth">
              {Array.from({ length: sprint?.duration || 7 }, (_, i) => i + 1).map((dayNum) => {
                const dayContent = getDailyContentForDay(dayNum);
                const stepCount = dayContent.taskPrompts?.filter(p => p && p.trim()).length || 0;
                const isSelected = selectedDay === dayNum;
                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setSelectedDay(dayNum)}
                    className={`flex-shrink-0 min-w-[54px] h-10 px-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-600/25 scale-102 font-black'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600 font-semibold'
                    }`}
                  >
                    <span className="text-[7px] uppercase tracking-tight leading-none opacity-80">Day</span>
                    <span className="text-xs leading-none mt-0.5">{dayNum}</span>
                    {stepCount > 0 && (
                      <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-500 animate-pulse'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Day Card for currently selected day, flows naturally */}
        <div className="flex-1 w-full max-w-[560px]">
          {(() => {
            const dayNum = selectedDay;
            const dayContent = getDailyContentForDay(dayNum);
            const activeStepIdx = activeStepIndices[dayNum] !== undefined ? activeStepIndices[dayNum] : 0;
            const totalSteps = dayContent.taskPrompts?.length || 0;
            const activeIdx = activeStepIdx < totalSteps ? activeStepIdx : 0;

            const prompt = dayContent.taskPrompts?.[activeIdx] || '';
            const isLastAssignedPrompt = lastAssignedField === `prompt-${activeIdx}` && selectedDay === dayNum;
            const isLastAssignedNote = lastAssignedField === `note-${activeIdx}` && selectedDay === dayNum;
            const isLastAssignedHint = lastAssignedField === `hint-${activeIdx}` && selectedDay === dayNum;
            const isLastAssignedFootnote = lastAssignedField === `footnote-${activeIdx}` && selectedDay === dayNum;
            const isLinkedFromPrevious = (activeIdx > 0 && dayContent.taskLinkedToNext?.[activeIdx - 1]) || (Array.isArray(dayContent.taskLinkedSources?.[activeIdx]) && dayContent.taskLinkedSources[activeIdx].length > 0);

            const isActiveCard = true;

            return (
              <div 
                key={dayNum}
                className="w-full bg-white rounded-3xl border border-purple-400 ring-4 ring-purple-100/50 flex flex-col p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 h-auto relative text-left"
              >
                {/* Day Header inside Card - Removed Day 1 Day 2 indicators */}
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isActiveCard ? 'bg-purple-600' : 'bg-gray-300'}`} />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Action Steps</span>
                  </div>

                  {/* Pagination with "+" button next to it */}
                  <div className="flex items-center gap-1.5 bg-gray-50 p-1 border border-gray-150 rounded-xl">
                    {Array.from({ length: totalSteps }, (_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDay(dayNum);
                          setActiveStepIndices(prev => ({ ...prev, [dayNum]: idx }));
                        }}
                        className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black transition-all cursor-pointer ${
                          activeIdx === idx 
                            ? 'bg-purple-600 text-white shadow-xs scale-105' 
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                    
                    {/* "+" Button to add step to this card */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDay(dayNum);
                        handleAddStepForDay(dayNum);
                      }}
                      className="w-5 h-5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200/50 flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                      title="Add Action Step"
                    >
                      <Plus size={10} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                  {/* Day Action Step edit Workspace inside card */}
                  <div className="flex-grow flex flex-col space-y-4">
                    {/* Step title & Coach Note Trigger */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-black bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg flex items-center gap-1">
                        Action Step {activeIdx + 1}
                      </span>

                      <div className="flex items-center gap-2">
                        {/* Coach Note toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDay(dayNum);
                            const currentNote = dayContent.taskNotes?.[activeIdx];
                            if (typeof currentNote !== 'string') {
                              handleTaskNoteChange(dayNum, activeIdx, '');
                            } else {
                              handleTaskNoteChange(dayNum, activeIdx, null as any);
                            }
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                            typeof dayContent.taskNotes?.[activeIdx] === 'string'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50'
                              : 'bg-white text-gray-500 hover:text-purple-600 hover:bg-purple-50 border-gray-205'
                          }`}
                          title="Coach Note: Add context note that appears before the prompt."
                        >
                          <Plus size={11} strokeWidth={2.5} className="shrink-0" />
                          <span>Coach Note</span>
                        </button>

                        {/* Trash Step Button if total steps > 1 */}
                        {totalSteps > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDay(dayNum);
                              if (window.confirm(`Are you sure you want to delete Action Step ${activeIdx + 1} for Day ${dayNum}?`)) {
                                handleRemoveStepForDay(dayNum, activeIdx);
                              }
                            }}
                            className="p-1 text-red-400 hover:text-red-605 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete this action step"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Coach Note Field if present */}
                    {typeof dayContent.taskNotes?.[activeIdx] === 'string' && (
                      <div className={`border border-emerald-100/70 rounded-2xl p-3 bg-emerald-50/5 ${isLastAssignedNote ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-1">Coach Note</label>
                          <div className="flex items-center gap-1.5">
                            {selectedText && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDay(dayNum);
                                  handleTaskNoteChange(dayNum, activeIdx, selectedText);
                                  setLastAssignedField(`note-${activeIdx}`);
                                  setTimeout(() => setLastAssignedField(null), 1500);
                                  setSelectedText('');
                                }}
                                className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[8px] font-bold rounded border border-emerald-200 flex items-center gap-0.5"
                              >
                                Assign Selected
                              </button>
                            )}
                            <button 
                              type="button" 
                              onClick={() => {
                                setSelectedDay(dayNum);
                                handleTaskNoteChange(dayNum, activeIdx, null as any);
                              }}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                        <textarea 
                          value={dayContent.taskNotes[activeIdx] || ''} 
                          onChange={e => {
                            setSelectedDay(dayNum);
                            handleTaskNoteChange(dayNum, activeIdx, e.target.value);
                          }} 
                          rows={2} 
                          className={smallEditorInputClasses + " p-3 !py-2.5 w-full border-emerald-105 bg-emerald-50/10 text-gray-700 font-medium text-sm"} 
                          placeholder="Add a context note..." 
                        />
                      </div>
                    )}

                    {/* Prompt Input with direct selection assign */}
                    <div className={`space-y-1.5 ${isLastAssignedPrompt ? 'ring-2 ring-purple-500 ring-offset-2 p-1 rounded-2xl' : ''}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Action Step Prompt</span>
                        {selectedText && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDay(dayNum);
                              handleTaskPromptChange(dayNum, activeIdx, selectedText);
                              setLastAssignedField(`prompt-${activeIdx}`);
                              setTimeout(() => setLastAssignedField(null), 1500);
                              setSelectedText('');
                            }}
                            className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[9px] font-bold rounded border border-purple-200 flex items-center gap-0.5"
                          >
                            Assign Selected
                          </button>
                        )}
                      </div>
                      <textarea 
                        value={prompt} 
                        onChange={e => {
                          setSelectedDay(dayNum);
                          handleTaskPromptChange(dayNum, activeIdx, e.target.value);
                        }} 
                        rows={2} 
                        className={smallEditorInputClasses + " p-3 !py-3 w-full font-medium text-sm"} 
                        placeholder={`Describe Action Step ${activeIdx + 1}...`} 
                      />
                    </div>

                    {/* Input Type Selector and Helper toggles */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest shrink-0">Input Type:</label>
                        <div className="flex p-0.5 bg-gray-100 rounded-lg">
                          {(['text', 'tags', 'poll', 'mark'] as const).map((type) => {
                            const isSelected = (!dayContent.taskInputTypes?.[activeIdx] && type === 'text') || dayContent.taskInputTypes?.[activeIdx] === type;
                            return (
                              <button 
                                key={type}
                                type="button"
                                onClick={() => {
                                  setSelectedDay(dayNum);
                                  handleTaskPromptTypeChange(dayNum, activeIdx, type);
                                }}
                                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all uppercase ${
                                  isSelected 
                                    ? 'bg-white text-purple-600 shadow-xs' 
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                              >
                                {type}
                              </button>
                            );
                          })}
                        </div>
                        
                        {/* Step Relationships Link trigger */}
                        {(() => {
                          const precedingTagSteps = (dayContent.taskInputTypes || [])
                            .map((type, idx) => ({ type, idx }))
                            .filter(item => item.idx < activeIdx && (item.type === 'tags' || item.type === 'poll' || item.type === 'text' || !item.type));
                          
                          const precedingDaysSteps = getPrecedingDaysTagStepsForDay(dayNum);
                          const showSingleLink = dayContent.taskInputTypes?.[activeIdx] === 'tags';
                          
                          const precedingTagOnlySteps = precedingTagSteps.filter(item => item.type === 'tags' || item.type === 'poll');
                          const precedingTextOnlySteps = precedingTagSteps.filter(item => item.type === 'text' || !item.type);

                          const precedingDaysTagOnlySteps = precedingDaysSteps.filter(item => item.type === 'tags' || item.type === 'poll');
                          const precedingDaysTextOnlySteps = precedingDaysSteps.filter(item => item.type === 'text' || !item.type);

                          const hasPrecedingForTagLink = precedingTagSteps.length > 0 || precedingDaysSteps.length > 0;
                          const hasPrecedingTexts = precedingTextOnlySteps.length > 0 || precedingDaysTextOnlySteps.length > 0;

                          const showTagLink = hasPrecedingForTagLink && (dayContent.taskInputTypes?.[activeIdx] === 'tags' || dayContent.taskInputTypes?.[activeIdx] === 'poll');
                          const showTextLink = hasPrecedingTexts && (dayContent.taskInputTypes?.[activeIdx] === 'text' || !dayContent.taskInputTypes?.[activeIdx]);
                          const hasSelectedSources = (dayContent.taskLinkedSources?.[activeIdx]?.length || 0) > 0;

                          return (
                            <div className="flex items-center gap-1.5 ml-1">
                              {showSingleLink && (
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setSelectedDay(dayNum);
                                    handleToggleLinkToNext(dayNum, activeIdx);
                                  }}
                                  title={dayContent.taskLinkedToNext?.[activeIdx] ? "Link Active: This step is linked to dynamically populate choices or follow-ups for the exact next step. Click to disconnect." : "Link Step: Link this step to feed its selected tags/options as active choices or follow-ups for the exact next question."}
                                  className={`p-1 rounded-md transition-all flex items-center justify-center ${dayContent.taskLinkedToNext?.[activeIdx] ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-150 text-gray-400 hover:text-gray-650'}`}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                </button>
                              )}
                              {showTagLink && (
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setSelectedDay(dayNum);
                                    if (activeLinkSelectorIndex === activeIdx && activeLinkSelectorType === 'tag') {
                                      setActiveLinkSelectorIndex(null);
                                    } else {
                                      setActiveLinkSelectorIndex(activeIdx);
                                      setActiveLinkSelectorType('tag');
                                    }
                                  }}
                                  title={hasSelectedSources ? `Connected to ${dayContent.taskLinkedSources?.[activeIdx]?.length} preceding step(s). Click to configure or link more dynamic tag/poll source questions.` : "Link Tag Sources: Pull selected labels/options from previous tag/poll steps to populate this question dynamically."}
                                  className={`p-1 rounded-md transition-all flex items-center justify-center ${activeLinkSelectorIndex === activeIdx && activeLinkSelectorType === 'tag' ? 'bg-purple-650 text-white shadow-sm ring-2 ring-purple-100' : hasSelectedSources ? 'bg-purple-100 text-purple-700 border border-purple-200 font-bold' : 'bg-gray-150 text-gray-400 hover:text-gray-650'}`}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20h.01M21 12.1a1 1 0 01-.29.7l-7 7a1 1 0 01-1.4 0l-7-7A1 1 0 015 12.1V5a2 2 0 012-2h7.1a1 1 0 01.7.3l7 7a1 1 0 01.29.7z" />
                                  </svg>
                                  {hasSelectedSources && (
                                    <span className="ml-0.5 text-[9px] font-black bg-purple-600 text-white rounded-full px-1 min-w-[12px]">
                                      {dayContent.taskLinkedSources?.[activeIdx]?.length}
                                    </span>
                                  )}
                                </button>
                              )}
                              {showTextLink && (
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setSelectedDay(dayNum);
                                    if (activeLinkSelectorIndex === activeIdx && activeLinkSelectorType === 'text') {
                                      setActiveLinkSelectorIndex(null);
                                    } else {
                                      setActiveLinkSelectorIndex(activeIdx);
                                      setActiveLinkSelectorType('text');
                                    }
                                  }}
                                  title={hasSelectedSources ? `Connected to ${dayContent.taskLinkedSources?.[activeIdx]?.length} preceding step(s). Click to configure or link more text source questions.` : "Text to Text Link: Pull responses from previous text steps to auto-spread/fill this question."}
                                  className={`p-1 rounded-md transition-all flex items-center justify-center ${activeLinkSelectorIndex === activeIdx && activeLinkSelectorType === 'text' ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20' : hasSelectedSources ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold' : 'bg-emerald-50/50 text-emerald-500 border border-emerald-100 hover:bg-emerald-100/80 hover:text-emerald-600'}`}
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="4 7 4 4 20 4 20 7" />
                                    <line x1="9" y1="20" x2="15" y2="20" />
                                    <line x1="12" y1="4" x2="12" y2="20" />
                                  </svg>
                                  {hasSelectedSources && (
                                    <span className="ml-0.5 text-[9px] font-black bg-emerald-600 text-white rounded-full px-1 min-w-[12px]">
                                      {dayContent.taskLinkedSources?.[activeIdx]?.length}
                                    </span>
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Quick Add Buttons: Hint, Footnote, Multi Text */}
                      <div className="flex items-center gap-1.5">
                        {(!dayContent.taskInputTypes?.[activeIdx] || dayContent.taskInputTypes[activeIdx] === 'text') && (
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedDay(dayNum);
                              const currentLabels = dayContent.taskMultiTextLabels?.[activeIdx];
                              if (!currentLabels || currentLabels.length === 0) {
                                handleTaskMultiTextLabelsChange(dayNum, activeIdx, ['Label 1']);
                              } else {
                                handleTaskMultiTextLabelsChange(dayNum, activeIdx, null as any);
                              }
                            }}
                            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${(dayContent.taskMultiTextLabels?.[activeIdx] && dayContent.taskMultiTextLabels[activeIdx].length > 0) ? 'bg-purple-100 text-purple-705 border border-purple-200 shadow-xs' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'}`}
                            title="Multi Text fields configuration"
                          >
                            <span>Multi Text</span>
                          </button>
                        )}

                        {(!dayContent.taskInputTypes?.[activeIdx] || dayContent.taskInputTypes[activeIdx] === 'text') && isLinkedFromPrevious && (
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedDay(dayNum);
                              handleToggleSpread(dayNum, activeIdx);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${(dayContent.taskSpread?.[activeIdx]) ? 'bg-purple-100 text-purple-705 border border-purple-200 shadow-xs' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'}`}
                            title="Spread Option: Receive input from previous linked step to edit/revise."
                          >
                            {dayContent.taskSpread?.[activeIdx] ? (
                              <>
                                <span className="text-[10px] text-purple-600 mr-0.5">●</span>
                                <span>Spread</span>
                              </>
                            ) : (
                              <span>Spread</span>
                            )}
                          </button>
                        )}

                        <button 
                          type="button"
                          onClick={() => {
                            setSelectedDay(dayNum);
                            const currentHint = dayContent.taskHints?.[activeIdx];
                            if (currentHint === undefined || currentHint === null) {
                              handleTaskHintChange(dayNum, activeIdx, '');
                            }
                          }}
                          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${(dayContent.taskHints?.[activeIdx] !== undefined && dayContent.taskHints?.[activeIdx] !== null) ? 'bg-amber-50 text-amber-605 border border-amber-100 shadow-xs' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'}`}
                        >
                          <span>Hint</span>
                        </button>

                        <button 
                          type="button"
                          onClick={() => {
                            setSelectedDay(dayNum);
                            const currentFootnote = dayContent.taskFootnotes?.[activeIdx];
                            if (currentFootnote === undefined || currentFootnote === null) {
                              handleTaskFootnoteChange(dayNum, activeIdx, '');
                            }
                          }}
                          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${(dayContent.taskFootnotes?.[activeIdx] !== undefined && dayContent.taskFootnotes?.[activeIdx] !== null) ? 'bg-indigo-50 text-indigo-605 border border-indigo-100 shadow-xs' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'}`}
                        >
                          <span>Footnote</span>
                        </button>
                      </div>
                    </div>

                    {/* Multi-Link selector inside card */}
                    {(() => {
                      const rawPrecedingSteps = (dayContent.taskInputTypes || [])
                        .map((type, idx) => ({ type, idx }))
                        .filter(item => item.idx < activeIdx && (item.type === 'tags' || item.type === 'poll' || item.type === 'text' || !item.type));
                      
                      const rawPrecedingDaysSteps = getPrecedingDaysTagStepsForDay(dayNum);

                      const precedingTagSteps = rawPrecedingSteps.filter(item => {
                        if (activeLinkSelectorType === 'tag') {
                          return item.type === 'tags' || item.type === 'poll';
                        } else {
                          return item.type === 'text' || !item.type;
                        }
                      });

                      const precedingDaysSteps = rawPrecedingDaysSteps.filter(item => {
                        if (activeLinkSelectorType === 'tag') {
                          return item.type === 'tags' || item.type === 'poll';
                        } else {
                          return item.type === 'text' || !item.type;
                        }
                      });

                      const showSelector = activeLinkSelectorIndex === activeIdx && isActiveCard && (precedingTagSteps.length > 0 || precedingDaysSteps.length > 0);
                      
                      if (showSelector) {
                        const yesterdayNum = dayNum - 1;
                        const yesterdaySteps = precedingDaysSteps.filter(s => s.day === yesterdayNum);

                        return (
                          <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl animate-fade-in relative z-30 space-y-2 text-left text-[11px]">
                            <div className="text-[9px] font-black text-gray-550 uppercase tracking-wider flex items-center justify-between">
                              <span>{activeLinkSelectorType === 'tag' ? "Link choices/options from preceding tag/poll steps:" : "Link dynamic responses from preceding text steps:"}</span>
                              {((dayContent.taskLinkedSources?.[activeIdx]?.length || 0) > 0) && (
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setSelectedDay(dayNum);
                                    handleClearSourceLinks(dayNum, activeIdx);
                                  }}
                                  className="p-1 px-2 bg-red-50 hover:bg-red-100 text-red-500 rounded border border-red-100 transition-colors cursor-pointer text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 ml-auto mr-2"
                                >
                                  <Trash2 size={8} /> Clear
                                </button>
                              )}
                              <button 
                                type="button" 
                                onClick={() => setActiveLinkSelectorIndex(null)}
                                className="text-gray-400 hover:text-gray-600 font-bold"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {precedingTagSteps.map(step => {
                                const isLinked = dayContent.taskLinkedSources?.[activeIdx]?.includes(step.idx);
                                return (
                                  <button
                                    key={step.idx}
                                    type="button"
                                    onClick={() => {
                                      setSelectedDay(dayNum);
                                      handleToggleSourceLink(dayNum, activeIdx, step.idx);
                                    }}
                                    className={`px-2 py-1 text-xs rounded border inline-flex items-center gap-1 ${
                                      isLinked 
                                        ? 'bg-purple-600 text-white border-purple-600' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                                  >
                                    <span>Step {step.idx + 1}</span>
                                  </button>
                                );
                              })}

                              {yesterdaySteps.map(step => {
                                const encodedVal = -(step.day * 100 + step.stepIdx);
                                const isLinked = dayContent.taskLinkedSources?.[activeIdx]?.includes(encodedVal);
                                return (
                                  <button
                                    key={`prev-${step.day}-${step.stepIdx}`}
                                    type="button"
                                    onClick={() => {
                                      setSelectedDay(dayNum);
                                      handleToggleSourceLink(dayNum, activeIdx, encodedVal);
                                    }}
                                    className={`px-2 py-1 text-xs rounded border inline-flex items-center gap-1 ${
                                      isLinked 
                                        ? 'bg-purple-600 text-white border-purple-600' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                                  >
                                    <span>Day {step.day} Step {step.stepIdx + 1}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Task Hint edit input */}
                    {dayContent.taskHints?.[activeIdx] !== undefined && dayContent.taskHints?.[activeIdx] !== null && (
                      <div className={`mt-2 animate-fade-in border border-amber-100 rounded-2xl p-3 bg-amber-50/5 ${isLastAssignedHint ? 'ring-2 ring-amber-500 ring-offset-2' : ''}`}>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest px-1">Task Hint</label>
                          <div className="flex items-center gap-1.5">
                            {selectedText && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDay(dayNum);
                                  handleTaskHintChange(dayNum, activeIdx, selectedText);
                                  setLastAssignedField(`hint-${activeIdx}`);
                                  setTimeout(() => setLastAssignedField(null), 1500);
                                  setSelectedText('');
                                }}
                                className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[8px] font-bold rounded border border-amber-200 flex items-center gap-0.5"
                              >
                                Assign Selected
                              </button>
                            )}
                            <button 
                              type="button" 
                              onClick={() => {
                                setSelectedDay(dayNum);
                                handleTaskHintChange(dayNum, activeIdx, null as any);
                              }}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                        <textarea 
                          value={dayContent.taskHints[activeIdx] || ''} 
                          onChange={e => {
                            setSelectedDay(dayNum);
                            handleTaskHintChange(dayNum, activeIdx, e.target.value);
                          }} 
                          rows={2} 
                          className={smallEditorInputClasses + " p-3 !py-2.5 w-full border-amber-100 bg-amber-50/20 text-gray-750 font-medium text-sm"} 
                          placeholder="Add a hint..." 
                        />
                      </div>
                    )}

                    {/* Task Footnote edit input */}
                    {dayContent.taskFootnotes?.[activeIdx] !== undefined && dayContent.taskFootnotes?.[activeIdx] !== null && (
                      <div className={`mt-2 animate-fade-in border border-indigo-100 rounded-2xl p-3 bg-indigo-50/5 ${isLastAssignedFootnote ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest px-1">Task Footnote</label>
                          <div className="flex items-center gap-1.5">
                            {selectedText && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDay(dayNum);
                                  handleTaskFootnoteChange(dayNum, activeIdx, selectedText);
                                  setLastAssignedField(`footnote-${activeIdx}`);
                                  setTimeout(() => setLastAssignedField(null), 1500);
                                  setSelectedText('');
                                }}
                                className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[8px] font-bold rounded border border-indigo-200 flex items-center gap-0.5"
                              >
                                Assign Selected
                              </button>
                            )}
                            <button 
                              type="button" 
                              onClick={() => {
                                setSelectedDay(dayNum);
                                handleTaskFootnoteChange(dayNum, activeIdx, null as any);
                              }}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                        <textarea 
                          value={dayContent.taskFootnotes[activeIdx] || ''} 
                          onChange={e => {
                            setSelectedDay(dayNum);
                            handleTaskFootnoteChange(dayNum, activeIdx, e.target.value);
                          }} 
                          rows={2} 
                          className={smallEditorInputClasses + " p-3 !py-2.5 w-full border-indigo-100 bg-indigo-50/20 text-gray-750 font-medium text-sm"} 
                          placeholder="Add a footnote..." 
                        />
                      </div>
                    )}

                    {/* Multi Text label configuration */}
                    {(!dayContent.taskInputTypes?.[activeIdx] || dayContent.taskInputTypes[activeIdx] === 'text') && dayContent.taskMultiTextLabels?.[activeIdx] && dayContent.taskMultiTextLabels[activeIdx].length > 0 && (
                      <div className="mt-2 pl-2 border-l-2 border-purple-200/50 space-y-2 animate-fade-in text-[11px]">
                        <p className="font-semibold text-purple-600">Labels for Multi-Text Fields:</p>
                        <div className="space-y-1.5">
                          {dayContent.taskMultiTextLabels[activeIdx].map((lbl, lblIndex) => (
                            <div key={lblIndex} className="flex gap-1.5 items-center">
                              <span className="text-gray-450 text-[10px] font-bold w-4 shrink-0">{lblIndex + 1}</span>
                              <input 
                                type="text"
                                value={lbl}
                                onChange={(e) => {
                                  setSelectedDay(dayNum);
                                  const updatedLabels = [...(dayContent.taskMultiTextLabels?.[activeIdx] || [])];
                                  updatedLabels[lblIndex] = e.target.value;
                                  handleTaskMultiTextLabelsChange(dayNum, activeIdx, updatedLabels);
                                }}
                                className="flex-1 px-2.5 py-1 bg-white border border-gray-205 rounded-lg text-xs font-semibold outline-none transition-all focus:ring-2 focus:ring-purple-100 focus:border-purple-300"
                                placeholder="Field label..."
                              />
                              <button 
                                type="button"
                                onClick={() => {
                                  setSelectedDay(dayNum);
                                  const updatedLabels = (dayContent.taskMultiTextLabels?.[activeIdx] || []).filter((_, lIdx) => lIdx !== lblIndex);
                                  handleTaskMultiTextLabelsChange(dayNum, activeIdx, updatedLabels.length === 0 ? null as any : updatedLabels);
                                }}
                                className="text-gray-400 hover:text-red-500 shrink-0"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedDay(dayNum);
                              const updatedLabels = [...(dayContent.taskMultiTextLabels?.[activeIdx] || [])];
                              updatedLabels.push(`Label ${updatedLabels.length + 1}`);
                              handleTaskMultiTextLabelsChange(dayNum, activeIdx, updatedLabels);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-black text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all"
                          >
                            <Plus size={10} /> Add Label
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Poll option configuration */}
                    {dayContent.taskInputTypes?.[activeIdx] === 'poll' && (
                      <div className="mt-2 pl-2 border-l-2 border-purple-200/50 space-y-2 text-[11px]">
                        <div className="flex items-center gap-2 mb-2 bg-white p-2 rounded-xl border border-gray-100 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDay(dayNum);
                              handleTogglePollMultiSelect(dayNum, activeIdx);
                            }}
                            className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${dayContent.taskPollMultiSelect?.[activeIdx] ? 'bg-purple-650 justify-end' : 'bg-gray-200 justify-start'}`}
                          >
                            <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
                          </button>
                          <span className="text-[10px] font-bold text-gray-750 select-none">Multi-Select</span>
                        </div>

                        <div className="space-y-1.5">
                          {(() => {
                            let opts: string[] = [];
                            if (dayContent.taskPollOptions?.[activeIdx]) {
                              try { opts = JSON.parse(dayContent.taskPollOptions[activeIdx]); } catch(e) {}
                            }
                            const isDynamicPoll = isLinkedFromPrevious && !dayContent.taskTagNoteActive?.[activeIdx];
                            if (isDynamicPoll) {
                              opts = opts.filter(o => o !== null && o !== undefined && o.trim() !== '');
                              if (addingCustomOption[activeIdx]) {
                                opts.push('');
                              }
                            } else {
                              while (opts.length < 4) {
                                opts.push('');
                              }
                            }
                            return opts.map((opt, optIndex) => (
                              <div key={optIndex} className="flex gap-1.5 items-center">
                                <span className="text-gray-400 font-bold shrink-0">●</span>
                                <input 
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    setSelectedDay(dayNum);
                                    if (isDynamicPoll) {
                                      setAddingCustomOption(prev => ({ ...prev, [activeIdx]: e.target.value.trim() === '' }));
                                    }
                                    handleTaskPollOptionChange(dayNum, activeIdx, optIndex, e.target.value);
                                  }}
                                  className="flex-1 px-2.5 py-1.5 bg-white border border-gray-205 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-purple-100 focus:border-purple-300"
                                  placeholder="Custom Option..."
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setSelectedDay(dayNum);
                                    if (isDynamicPoll) {
                                      setAddingCustomOption(prev => ({ ...prev, [activeIdx]: false }));
                                    }
                                    removeTaskPollOption(dayNum, activeIdx, optIndex);
                                  }}
                                  className="text-gray-400 hover:text-red-500 shrink-0"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ));
                          })()}

                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedDay(dayNum);
                              const isDynamicPoll = isLinkedFromPrevious && !dayContent.taskTagNoteActive?.[activeIdx];
                              if (isDynamicPoll) {
                                setAddingCustomOption(prev => ({ ...prev, [activeIdx]: true }));
                                let curOpts: string[] = [];
                                try { curOpts = JSON.parse(dayContent.taskPollOptions?.[activeIdx] || '[]'); } catch(e) {}
                                curOpts = curOpts.filter(o => o && o.trim() !== '');
                                const newLen = curOpts.length;
                                handleTaskPollOptionChange(dayNum, activeIdx, newLen, '');
                              } else {
                                let currentLength = 0;
                                try {
                                  const curOpts = JSON.parse(dayContent.taskPollOptions?.[activeIdx] || '[]');
                                  currentLength = Array.isArray(curOpts) ? curOpts.length : 0;
                                } catch(e) {}
                                handleTaskPollOptionChange(dayNum, activeIdx, currentLength, '');
                              }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-black text-purple-650 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all"
                          >
                            <Plus size={10} /> Add Option
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

      {onSaveDraft && (
        <button 
          type="button"
          id="fixed-workspace-save-draft-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSaveDraft();
          }}
          disabled={saveStatus === 'saving'}
          className="fixed bottom-6 right-6 z-[250] w-12 h-12 bg-primary text-white rounded-full shadow-2xl hover:bg-primary/95 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer border border-primary/20"
          title="Save Draft"
        >
          {saveStatus === 'saving' ? (
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : saveStatus === 'saved' ? (
            <CheckCircle2 className="h-5.5 w-5.5 text-white" />
          ) : (
            <Save className="h-5.5 w-5.5" />
          )}
        </button>
      )}

      {/* General Content Hub bottom sheet */}
      {showHelpSheet && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-[300] backdrop-blur-sm transition-opacity duration-300 animate-fade-in-quick cursor-pointer"
            onClick={() => setShowHelpSheet(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.15)] border-t border-gray-100 z-[301] p-6 sm:p-8 pb-10 flex flex-col animate-slide-up-quick text-left">
            {/* Drag Handle indicator */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6"></div>
            
            {/* Protocol Tag */}
            <div className="flex items-center gap-2 mb-4 justify-center">
              <LocalLogo type="favicon" className="h-5 w-5 animate-pulse" />
              <div className="h-[1px] w-8 bg-gray-150"></div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0E7850]">The Protocol</span>
            </div>

            {/* Heading */}
            <h3 className="text-xl font-black tracking-tight leading-tight text-center text-gray-900 mb-1 uppercase">
              General Content Hub
            </h3>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 text-center mb-6">How to use this setup</p>

            {/* Content list */}
            <div className="space-y-4 max-w-xs sm:max-w-sm mx-auto">
              <div className="flex items-start gap-3">
                <span className="text-emerald-600 text-sm font-black mt-0.5">•</span>
                <p className="text-xs font-bold leading-relaxed text-gray-700">
                  <span className="font-extrabold text-gray-900">Paste or Write Content:</span> Type or paste raw curriculum outlines, source notes, or general text directly into this text area.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-600 text-sm font-black mt-0.5">•</span>
                <p className="text-xs font-bold leading-relaxed text-gray-700">
                  <span className="font-extrabold text-gray-900">Highlight & Assign:</span> Select or highlight any text block inside this text area to activate instant assignment to active steps on the right.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-600 text-sm font-black mt-0.5">•</span>
                <p className="text-xs font-bold leading-relaxed text-gray-700">
                  <span className="font-extrabold text-gray-900">Fast Assembly:</span> Use assignments to quickly map guidelines into steps, hints, footnotes, or notes without copy-paste hassle.
                </p>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => setShowHelpSheet(false)}
              className="mt-8 w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md active:scale-95 cursor-pointer text-center"
            >
              Understand
            </button>
          </div>
        </>
      )}
    </div>
  );
}
