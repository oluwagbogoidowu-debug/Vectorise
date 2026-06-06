import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Sprint, DailyContent } from '../../types';
import { sprintService } from '../../services/sprintService';
import FormattedText from '../../components/FormattedText';
import LocalLogo from '../../components/LocalLogo';
import { useAuth } from '../../contexts/AuthContext';
import { createPortal } from 'react-dom';

import { toast } from 'sonner';

const AutoGrowingTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = "What's on your mind...", className = "" }) => {
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
      className={`${className} overflow-y-auto min-h-[80px]`}
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
}> = ({ value, onChange, maxTags = 5, placeholder = "Type and press Enter...", onNext }) => {
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

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    if (!text) return;

    const rawTokens = text.split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
    if (rawTokens.length === 0) return;

    let addedCount = 0;
    const currentTags = [...tags];

    for (const token of rawTokens) {
      if (currentTags.length >= maxTags) {
        setError(`Maximum of ${maxTags} tags allowed. Paste truncated.`);
        toast.error(`You can only add up to ${maxTags} tags.`);
        break;
      }
      if (!currentTags.some(t => t.toLowerCase() === token.toLowerCase())) {
        currentTags.push(token);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      onChange(JSON.stringify(currentTags));
      setInputValue("");
      setError(null);
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
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
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
          onPaste={handlePaste}
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

const SprintPreview: React.FC = () => {
    const { sprintId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTaskIndex, setActiveTaskIndex] = useState(0);
    const [taskInputs, setTaskInputs] = useState<string[]>([]);
    const [showSignupModal, setShowSignupModal] = useState(false);
    const [showLockModal, setShowLockModal] = useState(false);
    const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});

    const prefilledEmail = location.state?.prefilledEmail || localStorage.getItem('guest_email');

    useEffect(() => {
        const fetchSprint = async () => {
            if (!sprintId) return;
            setIsLoading(true);
            try {
                const data = await sprintService.getSprintById(sprintId);
                setSprint(data);
            } catch (err) {
                console.error("Error fetching sprint for preview:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSprint();
    }, [sprintId]);

    if (isLoading) return <div className="flex items-center justify-center h-screen bg-[#FAFAFA]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
    if (!sprint) return <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] p-4 text-center"><h2 className="text-base font-black mb-4">Sprint not found.</h2><button onClick={() => navigate('/discover')} className="text-primary font-black uppercase tracking-widest text-xs">Back to Discover</button></div>;

    const day1Content = Array.isArray(sprint.dailyContent) ? sprint.dailyContent.find(dc => dc.day === 1) : undefined;

    const getLinkedTagsForStep = (stepIndex: number): string[] => {
        if (!day1Content) return [];

        // 1. Check if the new taskLinkedSources tells us which steps are linked
        if (Array.isArray(day1Content.taskLinkedSources?.[stepIndex]) && day1Content.taskLinkedSources[stepIndex].length > 0) {
            const allTags: string[] = [];
            day1Content.taskLinkedSources[stepIndex].forEach(srcIndex => {
                if (srcIndex >= 0 && srcIndex < taskInputs.length && taskInputs[srcIndex]) {
                    try {
                        const val = taskInputs[srcIndex];
                        const tags = val.startsWith("[") ? JSON.parse(val) : val.split(",").filter(Boolean);
                        allTags.push(...tags);
                    } catch (e) {
                        console.error("Error parsing tags for source in preview", srcIndex, e);
                    }
                }
            });
            return Array.from(new Set(allTags)).filter(Boolean);
        }

        // 2. Fallback to legacy structure
        let linkedSourceIndex = -1;
        for (let prevIndex = stepIndex - 1; prevIndex >= 0; prevIndex--) {
            const isLinked = 
                day1Content.taskLinkedToNext?.[prevIndex] === true ||
                (day1Content.taskLinkedToNext?.[prevIndex] as any) === "true";
            if (isLinked) {
                const inputType = String(
                    day1Content.taskInputTypes?.[prevIndex] || ""
                ).trim().toLowerCase();
                if (inputType === "tags") {
                    linkedSourceIndex = prevIndex;
                    break;
                }
            }
        }
        // Robust fallback
        if (linkedSourceIndex === -1) {
            for (let prevIndex = stepIndex - 1; prevIndex >= 0; prevIndex--) {
                const inputType = String(
                    day1Content.taskInputTypes?.[prevIndex] || ""
                ).trim().toLowerCase();
                if (inputType === "tags") {
                    linkedSourceIndex = prevIndex;
                    break;
                }
            }
        }

        if (linkedSourceIndex !== -1 && taskInputs[linkedSourceIndex]) {
            try {
                const val = taskInputs[linkedSourceIndex];
                if (val.startsWith("[")) {
                    return JSON.parse(val);
                } else {
                    return val.split(",").filter(Boolean);
                }
            } catch (e) {
                return [];
            }
        }
        return [];
    };

    const isLinkedTextStep = (stepIndex: number): boolean => {
        return false;
    };

    return (
        <div className="w-full bg-[#FAFAFA] min-h-screen flex flex-col font-sans text-dark animate-fade-in pb-24">
            <header className="px-6 pt-10 pb-4 max-w-2xl mx-auto w-full sticky top-0 z-50 bg-[#FAFAFA]/90 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 active:scale-95 transition-all">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="text-center flex-1 mx-4 min-w-0">
                        <h1 className="text-lg font-black text-gray-900 truncate italic">{sprint.title}</h1>
                    </div>
                    <div className="w-10"></div> {/* Spacer */}
                </div>
            </header>

            <div className="px-6 max-w-2xl mx-auto w-full space-y-6 mt-4">
                {/* Day Selector (Disabled/Preview) */}
                <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar scroll-smooth px-1 opacity-50">
                    {Array.from({ length: sprint.duration }, (_, i) => i + 1).map((day) => (
                        <div
                            key={day}
                            className={`flex-shrink-0 w-20 h-20 rounded-[1.5rem] flex flex-col items-center justify-center relative transition-all duration-300 ${
                                day === 1 ? 'bg-[#0E7850] text-white shadow-xl' : 'bg-[#F3F4F6] text-gray-400'
                            }`}
                        >
                            <span className={`text-[8px] font-black uppercase tracking-widest ${day === 1 ? 'text-white/60' : 'text-gray-300'}`}>Day</span>
                            <span className="text-3xl font-black leading-none">{day}</span>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-3xl p-6 md:p-10 border border-gray-100 shadow-sm animate-slide-up relative overflow-hidden min-h-[400px]">
                    <h2 className="text-[7px] font-black text-gray-300 uppercase tracking-[0.25em] mb-6">Execution Path Day 1 (Preview)</h2>
                    
                    {/* Lesson Content - Fully Visible */}
                    <div className="space-y-2 mb-10">
                        <h2 className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mb-4">Today's Insight</h2>
                        <div className="text-gray-700 font-medium text-base leading-[1.6] max-w-[60ch]">
                            <FormattedText text={day1Content?.lessonText || ""} />
                        </div>
                    </div>

                    {/* Action Step */}
                    <div className="space-y-6 relative">
                        {(() => {
                            const activePrompts = day1Content?.taskPrompts?.filter(p => p && p.trim()) || (day1Content?.taskPrompt ? [day1Content.taskPrompt] : []);
                            if (activePrompts.length === 0) {
                                return (
                                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden text-center text-gray-400 font-medium text-xs">
                                        No action steps defined yet for Day 1.
                                    </div>
                                );
                            }
                            
                            const prompt = activePrompts[activeTaskIndex] || activePrompts[0] || "";
                            const i = activeTaskIndex;
                            return (
                                <>
                                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden animate-fade-in">
                                        <h2 className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mb-4">Action Step {i + 1} of {activePrompts.length}</h2>
                                        
                                        {day1Content?.taskNotes?.[i] && (
                                            <div className="mb-4 text-left border-l-4 border-emerald-500/30 pl-4 py-1 animate-fade-in text-gray-700 font-medium text-xs sm:text-sm leading-relaxed">
                                                <div className="text-emerald-600 font-black text-[10px] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                    <span>📝 Coach Note</span>
                                                </div>
                                                <FormattedText text={day1Content.taskNotes[i]} />
                                            </div>
                                        )}

                                        {getLinkedTagsForStep(i).length > 0 && (
                                            <div className="mb-4 text-left border-l-4 border-amber-500/30 pl-4 py-1 animate-fade-in text-gray-600 font-medium text-xs sm:text-sm leading-relaxed">
                                                <div className="text-amber-600 font-black text-[10px] uppercase tracking-wider mb-1">
                                                    Context Tags
                                                </div>
                                                <span className="font-mono text-amber-700 italic font-bold">#{getLinkedTagsForStep(i).join(" #")}</span>
                                            </div>
                                        )}

                                        {(() => {
                                            let notesMap: Record<string, string> = {};
                                            if (day1Content?.taskTagNotes?.[i]) {
                                                try {
                                                    notesMap = JSON.parse(day1Content.taskTagNotes[i]);
                                                } catch (e) {}
                                            }
                                            
                                            const linkedTags = getLinkedTagsForStep(i);
                                            const tagsWithNotes = linkedTags.filter(tag => notesMap[tag] && notesMap[tag].trim() !== "");
                                            
                                            if (tagsWithNotes.length === 0) return null;
                                            
                                            return (
                                                <div className="mb-4 space-y-3 pl-4 border-l-4 border-indigo-500/30 py-1 text-left animate-fade-in">
                                                    {tagsWithNotes.map((tag, tagIndex) => (
                                                        <div key={tagIndex} className="text-gray-700 font-medium text-xs sm:text-sm leading-relaxed">
                                                            <div className="text-indigo-600 font-black text-[10px] uppercase tracking-wider mb-1">
                                                                [{tag}] Context Note
                                                            </div>
                                                            <FormattedText text={notesMap[tag]} />
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}

                                        <div className="text-gray-900 font-bold text-sm sm:text-base leading-snug relative mb-4">
                                            <FormattedText text={prompt} />
                                        </div>
                                        {day1Content?.taskHints?.[i] && (
                                            <div className="mb-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => setRevealedHints(prev => ({ ...prev, [i]: !prev[i] }))}
                                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${revealedHints[i] ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400 hover:text-primary hover:bg-primary/5'}`}
                                                >
                                                    <svg className={`w-3 h-3 transition-transform duration-300 ${revealedHints[i] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {revealedHints[i] ? 'Hide Hint' : 'View Hint'}
                                                </button>
                                                {revealedHints[i] && (
                                                    <div className="mt-3 p-3 bg-amber-50/50 border border-amber-100/70 rounded-xl text-[11px] sm:text-xs font-medium text-amber-900/90 animate-fade-in leading-relaxed italic">
                                                        <FormattedText text={day1Content.taskHints[i]} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {day1Content?.taskInputTypes?.[i] === "tags" ? (
                                            <TagInput
                                                value={taskInputs[i] || ""}
                                                onChange={(newVal) => {
                                                    const newInputs = [...taskInputs];
                                                    newInputs[i] = newVal;
                                                    setTaskInputs(newInputs);
                                                }}
                                                onNext={() => {
                                                    const tagsVal = taskInputs[i];
                                                    const isValid = !!tagsVal && tagsVal !== "[]" && tagsVal !== "";
                                                    if (isValid) {
                                                        if (i < activePrompts.length - 1) {
                                                            setActiveTaskIndex(i + 1);
                                                        } else if (!user) {
                                                            const pendingObj = {
                                                                sprintId: sprint.id,
                                                                pricingType: sprint.pricingType || 'cash',
                                                                firstActionInput: taskInputs[0],
                                                                prefilledEmail: prefilledEmail || ''
                                                            };
                                                            localStorage.setItem('pending_first_action', JSON.stringify(pendingObj));
                                                            setShowLockModal(true);
                                                        } else {
                                                            setShowSignupModal(true);
                                                        }
                                                    }
                                                }}
                                                placeholder="Type and press Enter to add tags..."
                                            />
                                        ) : day1Content?.taskInputTypes?.[i] === "note" ? (
                                            <div className="space-y-4 animate-fade-in text-left mb-4">
                                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/15 rounded-2xl flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">Informational Step Completed</p>
                                                        <p className="text-xs text-emerald-700 font-medium font-semibold">Review the notes above and click Next to continue.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : day1Content?.taskInputTypes?.[i] === "poll" ? (
                                            <div className="space-y-2 mb-4">
                                                {(() => {
                                                    let pollOptions: string[] = [];
                                                    let customOptions: string[] = [];
                                                    if (day1Content.taskPollOptions?.[i]) {
                                                        try {
                                                            customOptions = JSON.parse(
                                                                day1Content.taskPollOptions[i],
                                                            );
                                                        } catch (e) {}
                                                    }
                                                    customOptions = customOptions.filter(Boolean);

                                                    pollOptions = customOptions;

                                                    const isMultiSelect = !!day1Content.taskPollMultiSelect?.[i];
                                                    let selectedOpts: string[] = [];
                                                    try {
                                                        if (taskInputs[i] && taskInputs[i].startsWith("[")) {
                                                            selectedOpts = JSON.parse(taskInputs[i]);
                                                        } else if (taskInputs[i]) {
                                                            selectedOpts = [taskInputs[i]];
                                                        }
                                                    } catch (e) {}

                                                    if (isMultiSelect) {
                                                        return (
                                                            <>
                                                                <p className="text-[10px] font-black uppercase text-primary tracking-widest pl-1 mb-2 animate-pulse flex items-center gap-1.5 overflow-hidden">
                                                                    <span>☑️ Select one or more:</span>
                                                                </p>
                                                                <div className="space-y-2 w-full">
                                                                    {pollOptions
                                                                        .filter(Boolean)
                                                                        .map((opt: string, optIndex: number) => {
                                                                            const isSel = selectedOpts.includes(opt);
                                                                            return (
                                                                                <button
                                                                                    key={optIndex}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const newInputs = [...taskInputs];
                                                                                        const indexInSel = selectedOpts.indexOf(opt);
                                                                                        let newSelected: string[];
                                                                                        if (indexInSel !== -1) {
                                                                                            newSelected = selectedOpts.filter(o => o !== opt);
                                                                                        } else {
                                                                                            newSelected = [...selectedOpts, opt];
                                                                                        }
                                                                                        newInputs[i] = JSON.stringify(newSelected);
                                                                                        setTaskInputs(newInputs);
                                                                                    }}
                                                                                    className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all text-left border flex items-center justify-between ${isSel ? "bg-primary/10 border-primary text-primary" : "bg-white border-primary/10 hover:border-primary/30 text-gray-700"}`}
                                                                                >
                                                                                    <span>
                                                                                        {String.fromCharCode(65 + optIndex)}. {opt}
                                                                                    </span>
                                                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSel ? "border-primary bg-primary text-white" : "border-gray-300 bg-white"}`}>
                                                                                        {isSel && (
                                                                                            <svg className="w-2.5 h-2.5 text-white animate-fade-in" fill="none" stroke="currentColor" strokeWidth={4} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                                                                        )}
                                                                                    </div>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                </div>
                                                            </>
                                                        );
                                                    }

                                                    return pollOptions
                                                        .filter(Boolean)
                                                        .map(
                                                            (opt: string, optIndex: number) => (
                                                                <button
                                                                    key={optIndex}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newInputs = [
                                                                            ...taskInputs,
                                                                        ];
                                                                        newInputs[i] = opt;
                                                                        setTaskInputs(newInputs);
                                                                    }}
                                                                    className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all text-left border ${taskInputs[i] === opt ? "bg-primary/10 border-primary text-primary" : "bg-white border-primary/10 hover:border-primary/30 text-gray-700"}`}
                                                                >
                                                                    {String.fromCharCode(
                                                                        65 + optIndex,
                                                                    )}
                                                                    . {opt}
                                                                </button>
                                                            ),
                                                        );
                                                })()}
                                            </div>
                                        ) : (
                                            isLinkedTextStep(i) && getLinkedTagsForStep(i).length > 0 ? (
                                                 <div className="space-y-4 animate-fade-in text-left mb-4">
                                                     {getLinkedTagsForStep(i).map((tag, tagIndex) => {
                                                         let currentAnswers: Record<string, string> = {};
                                                         if (taskInputs[i]) {
                                                             try {
                                                                 if (taskInputs[i].startsWith("{")) {
                                                                     currentAnswers = JSON.parse(taskInputs[i]);
                                                                 } else {
                                                                     currentAnswers = { [getLinkedTagsForStep(i)[0] || "default"]: taskInputs[i] };
                                                                 }
                                                             } catch (e) {
                                                                 currentAnswers = {};
                                                             }
                                                         }
                                                         const tagVal = currentAnswers[tag] || "";
                                                         return (
                                                             <div key={tagIndex} className="space-y-1.5 pl-3 border-l-2 border-primary/20">
                                                                 <div className="flex items-center">
                                                                     <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                                                                         🏷️ {tag}
                                                                     </span>
                                                                 </div>
                                                                 <AutoGrowingTextarea
                                                                     value={tagVal}
                                                                     onChange={(val) => {
                                                                         const newAnswers = { ...currentAnswers, [tag]: val };
                                                                         const newInputs = [...taskInputs];
                                                                         newInputs[i] = JSON.stringify(newAnswers);
                                                                         setTaskInputs(newInputs);
                                                                     }}
                                                                     placeholder={`Your answer for ${tag}...`}
                                                                     className="w-full px-4 py-3 bg-white border border-primary/10 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all resize-none"
                                                                 />
                                                             </div>
                                                         );
                                                     })}
                                                 </div>
                                             ) : (
                                                 <AutoGrowingTextarea 
                                                value={taskInputs[i] || ''}
                                                onChange={(val) => {
                                                    const newInputs = [...taskInputs];
                                                    newInputs[i] = val;
                                                    setTaskInputs(newInputs);
                                                }}
                                                placeholder="What's on your mind..."
                                                 className="w-full px-4 py-3 bg-white border border-primary/10 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all mb-4 resize-none"
                                             />
                                         ))}
                                        <div className="flex justify-between items-center gap-4 pt-4">
                                            {i > 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTaskIndex(i - 1)}
                                                    className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/30 active:scale-95"
                                                >
                                                    Back
                                                </button>
                                            ) : <div />}
                                            
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const isTags = day1Content?.taskInputTypes?.[i] === "tags";
                                                    const isNote = day1Content?.taskInputTypes?.[i] === "note";
                                                    const val = taskInputs[i];
                                                    let isValid = isNote;
                                                    if (!isNote && val) {
                                                        if (isTags) {
                                                            isValid = val !== "[]" && val !== "";
                                                        } else if (isLinkedTextStep(i)) {
                                                            const tags = getLinkedTagsForStep(i);
                                                            if (tags.length > 0) {
                                                                try {
                                                                    if (val.startsWith("{")) {
                                                                        const parsed = JSON.parse(val);
                                                                        isValid = tags.every(t => parsed[t] && parsed[t].trim().length > 0);
                                                                    }
                                                                } catch (e) {
                                                                    isValid = false;
                                                                }
                                                            } else {
                                                                isValid = val.trim().length > 0;
                                                            }
                                                        } else {
                                                            isValid = val.trim().length > 0;
                                                        }
                                                    }
                                                    if (!isValid) {
                                                        toast.error("Please provide an answer to continue.");
                                                        return;
                                                    }

                                                    if (!user) {
                                                        // Explicit guest check. First action goes through but next action is locked
                                                        const pendingObj = {
                                                            sprintId: sprint.id,
                                                            pricingType: sprint.pricingType || 'cash',
                                                            firstActionInput: taskInputs[0],
                                                            prefilledEmail: prefilledEmail || ''
                                                        };
                                                        localStorage.setItem('pending_first_action', JSON.stringify(pendingObj));
                                                        setShowLockModal(true);
                                                        return;
                                                    }

                                                    if (i < activePrompts.length - 1) {
                                                        setActiveTaskIndex(i + 1);
                                                    } else {
                                                        // Last step prompts the signup modal
                                                        setShowSignupModal(true);
                                                    }
                                                }}
                                                className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95"
                                            >
                                                {i < activePrompts.length - 1 ? 'Next Step' : 'Complete Action'}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {activePrompts.length > 1 && (
                                        <div className="flex justify-center items-center gap-2 mt-8">
                                            {activePrompts.map((_, idx) => (
                                                <button
                                                    type="button"
                                                    key={idx} 
                                                    onClick={() => {
                                                        if (idx <= activeTaskIndex) {
                                                            setActiveTaskIndex(idx);
                                                        }
                                                    }}
                                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx <= activeTaskIndex ? 'cursor-pointer' : 'cursor-not-allowed'} ${idx === activeTaskIndex ? 'w-8 bg-primary' : idx < activeTaskIndex ? 'w-2 bg-primary/40 hover:bg-primary/60' : 'w-2 bg-gray-200'}`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
            
            {showLockModal && sprint && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center relative overflow-hidden animate-slide-up border border-gray-100">
                        <div className="w-16 h-16 bg-[#0E7850]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[#0E7850]">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        {sprint.pricingType === 'credits' ? (
                            <>
                                <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight mb-3">
                                    You’ve completed the first step.
                                </h3>
                                <p className="text-gray-500 font-semibold text-xs leading-relaxed mb-8">
                                    Create an account to save your progress and continue the next step.
                                </p>
                                
                                <div className="space-y-4">
                                    <button 
                                        onClick={() => {
                                            const pendingObj = {
                                                sprintId: sprint.id,
                                                pricingType: sprint.pricingType || 'credits',
                                                firstActionInput: taskInputs[0],
                                                prefilledEmail: prefilledEmail || ''
                                            };
                                            localStorage.setItem('pending_first_action', JSON.stringify(pendingObj));
                                            navigate('/signup', { state: { prefilledEmail, targetSprintId: sprintId } });
                                        }}
                                        className="w-full py-4 bg-[#0E7850] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#0b5d3e] transition-colors shadow-lg active:scale-95"
                                    >
                                        Sign up to continue
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const pendingObj = {
                                                sprintId: sprint.id,
                                                pricingType: sprint.pricingType || 'credits',
                                                firstActionInput: taskInputs[0],
                                                prefilledEmail: prefilledEmail || ''
                                            };
                                            localStorage.setItem('pending_first_action', JSON.stringify(pendingObj));
                                            navigate('/login', { state: { prefilledEmail, targetSprintId: sprintId } });
                                        }}
                                        className="text-[11px] font-extrabold text-[#0E7850] hover:text-[#0b5d3e] hover:underline transition-colors block mx-auto py-1"
                                    >
                                        Already have an account Login to proceed
                                    </button>
                                    <button 
                                        onClick={() => setShowLockModal(false)}
                                        className="w-full py-2 text-gray-400 rounded-2xl font-bold uppercase tracking-widest text-[9px] hover:text-gray-500 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2 col-auto">Unlock Full Sprint</h3>
                                <p className="text-amber-600 font-extrabold text-[10px] uppercase tracking-widest mb-4">
                                    Unlock full sprint at log in / sign up
                                </p>
                                <p className="text-gray-500 font-medium text-xs leading-relaxed mb-8">
                                    Check out securely to save your Day 1 progress and continue with the remaining steps.
                                </p>
                                
                                <div className="space-y-3">
                                    <button 
                                        onClick={() => {
                                            const pendingObj = {
                                                sprintId: sprint.id,
                                                pricingType: sprint.pricingType || 'cash',
                                                firstActionInput: taskInputs[0],
                                                prefilledEmail: prefilledEmail || ''
                                            };
                                            localStorage.setItem('pending_first_action', JSON.stringify(pendingObj));
                                            navigate('/signup', { state: { prefilledEmail, targetSprintId: sprintId } });
                                        }}
                                        className="w-full py-4 bg-[#0E7850] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#0b5d3e] transition-colors shadow-lg active:scale-95"
                                    >
                                        Sign Up and Unlock
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const pendingObj = {
                                                sprintId: sprint.id,
                                                pricingType: sprint.pricingType || 'cash',
                                                firstActionInput: taskInputs[0],
                                                prefilledEmail: prefilledEmail || ''
                                            };
                                            localStorage.setItem('pending_first_action', JSON.stringify(pendingObj));
                                            navigate('/login', { state: { prefilledEmail, targetSprintId: sprintId } });
                                        }}
                                        className="w-full py-4 bg-gray-50 text-gray-700 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-gray-100 transition-colors"
                                    >
                                        Log In to Unlock
                                    </button>
                                    <button 
                                        onClick={() => setShowLockModal(false)}
                                        className="w-full py-4 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:text-gray-500 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {showSignupModal && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center relative overflow-hidden animate-slide-up border border-gray-100">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Unlock Full Sprint</h3>
                        <p className="text-gray-500 font-medium mb-8 text-sm">Sign up to save your progress and continue with the next execution steps.</p>
                        
                        <div className="space-y-3">
                            <button 
                                onClick={() => navigate('/signup', { state: { prefilledEmail, targetSprintId: sprintId } })}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-primary/90 transition-colors shadow-lg active:scale-95"
                            >
                                Sign Up to Continue
                            </button>
                            <button 
                                onClick={() => setShowSignupModal(false)}
                                className="w-full py-4 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SprintPreview;
