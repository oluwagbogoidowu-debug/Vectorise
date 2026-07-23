
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sprint, DailyContent, SprintDifficulty, UserRole, Coach, DynamicSection } from '../../types';
import { sprintService } from '../../services/sprintService';
import { sanitizeData } from '../../services/userService';
import Button from '../../components/Button';
import { isRegistryIncomplete, isSprintIncomplete } from '../../utils/sprintUtils';
import { useAuth } from '../../contexts/AuthContext';
import { ALL_CATEGORIES } from '../../services/mockData';
import { OUTCOME_TAGS } from '../../constants/sprintConstants';
import { List, Plus, Trash2, Type as TypeIcon, Clock, Save, Settings, Eye, EyeOff, CheckCircle2, AlertCircle, X, ChevronRight, ChevronLeft, BookOpen, ArrowLeft, Layers, Sparkles, HelpCircle, Flame, Coins } from 'lucide-react';
import SprintCard from '../../components/SprintCard';
import LandingPreview from '../../components/LandingPreview';
import FormattedText from '../../components/FormattedText';
import CustomSelect from '../../components/CustomSelect';
import DynamicSectionRenderer from '../../components/DynamicSectionRenderer';
import FormattingToolbar from '../../components/FormattingToolbar';
import DailyActionWorkspace from './DailyActionWorkspace';
import LocalLogo from '../../components/LocalLogo';
import { generateDayPDF } from '../../utils/pdfGenerator';

const SUPPORTED_CURRENCIES = ["NGN", "USD", "GHS", "KES"];

/**
 * Visual Diff Tool
 * Highlights new/modified words in bright red.
 */
const DiffHighlight: React.FC<{ original: any; updated: any; label: string }> = ({ original, updated, label }) => {
    const formatValue = (val: any) => {
        if (Array.isArray(val)) {
            return val.map(item => {
                if (typeof item === 'object' && item !== null) {
                    if ('verb' in item && 'description' in item) return `${item.verb}: ${item.description}`;
                    if ('title' in item && 'body' in item) return `[${item.title}]\n${item.body}`;
                    if ('day' in item) return `Day ${item.day}: ${(item.lessonText || '').substring(0, 30)}...`;
                    try {
                        return JSON.stringify(sanitizeData(item));
                    } catch (e) {
                        return `[Complex Object]`;
                    }
                }
                return String(item);
            }).join('\n---\n');
        }
        return String(val || '').trim();
    };

    const origStr = formatValue(original);
    const upStr = formatValue(updated);

    const hasChanged = origStr !== upStr;

    if (!hasChanged) return (
        <div className="space-y-1">
            <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">{label}</p>
            <p className="text-xs text-gray-500 font-medium whitespace-pre-wrap">{origStr || '—'}</p>
        </div>
    );

    const origWords = useMemo(() => {
        try {
            return origStr.split(/\s+/);
        } catch (e) {
            return [];
        }
    }, [origStr]);
    const origWordsSet = useMemo(() => new Set(origWords), [origWords]);
    const upWords = useMemo(() => {
        try {
            return upStr.split(/\s+/);
        } catch (e) {
            return [];
        }
    }, [upStr]);

    return (
        <div className="space-y-2 p-4 bg-red-50/30 border border-red-100 rounded-2xl animate-fade-in">
            <p className="text-[8px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                {label} (Modified)
            </p>
            <div className="flex flex-col gap-3">
                <div>
                    <p className="text-[7px] font-black text-gray-300 uppercase mb-1">Live Original:</p>
                    <p className="text-xs text-gray-400 line-through decoration-gray-300 whitespace-pre-wrap">{origStr}</p>
                </div>
                <div>
                    <p className="text-[7px] font-black text-red-400 uppercase mb-1">Proposed Update:</p>
                    <div className="text-sm font-bold text-gray-900 leading-relaxed whitespace-pre-wrap">
                        {upWords.map((word, i) => {
                            const isNew = !origWordsSet.has(word);
                            return (
                                <span 
                                    key={i} 
                                    className={isNew ? "bg-red-500 text-white px-1 rounded-sm mx-0.5" : ""}
                                >
                                    {word}{' '}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("EditSprint Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-[2rem] shadow-xl max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-black text-gray-900">Something went wrong</h2>
            <p className="text-gray-500">We encountered an error while loading the editor. This might be due to a data mismatch.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-lg hover:shadow-primary/20 transition-all"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const getPendingChanges = (original: Sprint, updated: Sprint): Partial<Sprint> => {
    const changes: Partial<Sprint> = {};
    
    const isDifferent = (a: any, b: any) => {
        if (a === b) return false;
        if (!a || !b) return true;
        try {
            return JSON.stringify(sanitizeData(a)) !== JSON.stringify(sanitizeData(b));
        } catch (e) {
            console.warn("Circular structure detected in comparison, defaulting to true", e);
            return true;
        }
    };

    // Top level fields
    const fields: (keyof Sprint)[] = [
        'title', 'subtitle', 'coverImageUrl', 'transformation', 'description', 
        'category', 'difficulty', 'audience', 'overrideOrchestrator', 'price', 'currency', 'pointCost', 
        'pricingType', 'duration', 'protocol', 'outcomeTag', 'checkInReminder', 'checkInReminderDays',
        'blogBody', 'blogImage', 'igniteBody', 'igniteBgColor', 'igniteDate', 'curriculumSource'
    ];

    fields.forEach(f => {
        if (isDifferent(original[f], updated[f])) {
            (changes as any)[f] = updated[f];
        }
    });

    // Array fields
    const arrayFields: (keyof Sprint)[] = ['forWho', 'notForWho', 'outcomes', 'methodSnapshot', 'dynamicSections', 'dailyContent'];
    
    arrayFields.forEach(f => {
        if (isDifferent(original[f], updated[f])) {
            (changes as any)[f] = updated[f];
        }
    });

    return changes;
};


const SectionHeading: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = "primary" }) => (
    <h2 className={`text-[8px] font-black text-${color} uppercase tracking-[0.4em] mb-4`}>
        {children}
    </h2>
);

const IGNITE_COLORS = [
  { hex: '#111827', name: 'Charcoal' },
  { hex: '#6D28D9', name: 'Magic Purple' },
  { hex: '#0F766E', name: 'Deep Teal' },
  { hex: '#047857', name: 'Emerald' },
  { hex: '#B45309', name: 'Warm Amber' },
  { hex: '#BE123C', name: 'Crimson' },
];

interface IgniteLivePreviewProps {
  activeSlides: string[];
  bgColor: string;
}

const IgniteLivePreview: React.FC<IgniteLivePreviewProps> = ({ activeSlides, bgColor }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
  }, [activeSlide, activeSlides.length]);

  useEffect(() => {
    const slideDuration = 4500;
    const intervalTime = 50;
    const step = (intervalTime / slideDuration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setActiveSlide(curr => (curr + 1) % activeSlides.length);
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeSlides.length, activeSlide]);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSlide(curr => (curr + 1) % activeSlides.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSlide(curr => (curr - 1 + activeSlides.length) % activeSlides.length);
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-between p-6 select-none text-white font-sans rounded-2xl overflow-hidden">
      {/* Bars at the top */}
      <div className="absolute top-4 left-6 right-6 flex gap-1 z-10">
        {activeSlides.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full"
              style={{
                width: idx < activeSlide ? '100%' : idx === activeSlide ? `${progress}%` : '0%',
                transition: idx === activeSlide ? 'none' : 'width 0.05s linear'
              }}
            />
          </div>
        ))}
      </div>

      {/* Slide Navigation Area */}
      <div className="relative flex-1 flex items-center justify-center px-4 my-8">
        <div className="absolute left-0 top-0 bottom-0 w-1/4 cursor-w-resize z-20" onClick={handlePrev} />
        
        <p className="text-xl md:text-2xl font-extrabold text-center leading-relaxed tracking-wide text-white drop-shadow-md whitespace-pre-wrap max-w-lg pointer-events-none px-4 select-none animate-slide-up">
          {activeSlides[activeSlide]}
        </p>

        <div className="absolute right-0 top-0 bottom-0 w-3/4 cursor-e-resize z-20" onClick={handleNext} />
      </div>

      {/* Slide Indicator Dots */}
      <div className="flex justify-center gap-1.5 z-10">
        {activeSlides.map((_, idx) => (
          <button 
            key={idx} 
            type="button"
            onClick={() => setActiveSlide(idx)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${idx === activeSlide ? 'bg-white scale-125' : 'bg-white/40'}`} 
          />
        ))}
      </div>
    </div>
  );
};

const EditSprint: React.FC = () => {
  const { sprintId } = useParams();
  const navigate = useNavigate();
  const { user, activeRole } = useAuth();
  
  const [originalSprint, setOriginalSprint] = useState<Sprint | null>(null);
  const [sprint, setSprint] = useState<Sprint | null>(null);
   const [selectedDay, setSelectedDay] = useState(1);
  const [showDailyPreview, setShowDailyPreview] = useState(true);
  const [setupView, setSetupView] = useState<'action' | 'mirror'>('action');
  const [previewTaskIndex, setPreviewTaskIndex] = useState(0);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);
  const [activeLinkSelectorIndex, setActiveLinkSelectorIndex] = useState<number | null>(null);
  const [activeLinkSelectorType, setActiveLinkSelectorType] = useState<'tag' | 'text' | null>(null);
  const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});
  const [addingCustomOption, setAddingCustomOption] = useState<Record<number, boolean>>({});
  const [expandedStepEarlierDays, setExpandedStepEarlierDays] = useState<Record<number, boolean>>({});
  const [previewInputs, setPreviewInputs] = useState<Record<number, string>>({});

  const [collapsedBranchingPaths, setCollapsedBranchingPaths] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setPreviewTaskIndex(0);
    setConfirmDeleteIndex(null);
    setSetupView('action');
    setRevealedHints({});
    setAddingCustomOption({});
    setExpandedStepEarlierDays({});
    setPreviewInputs({});
    setCollapsedBranchingPaths({});
  }, [selectedDay]);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [approvalStatus, setApprovalStatus] = useState<'idle' | 'processing'>('idle');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMirrorPreview, setShowMirrorPreview] = useState(false);
  const [showDaySuccessPreview, setShowDaySuccessPreview] = useState(false);
  const [showClearActionConfirm, setShowClearActionConfirm] = useState(false);
  const [showAdvancedActionModal, setShowAdvancedActionModal] = useState(false);
  const [showInsightHelpSheet, setShowInsightHelpSheet] = useState(false);
  const [showActionHelpSheet, setShowActionHelpSheet] = useState(false);
  const [advancedGeneralInput, setAdvancedGeneralInput] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number, y: number } | null>(null);
  const [lastAssignedField, setLastAssignedField] = useState<string | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [activeStepIndices, setActiveStepIndices] = useState<Record<number, number>>({});
  const [showAddVersionFullBleed, setShowAddVersionFullBleed] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [showCreatedPopup, setShowCreatedPopup] = useState(false);
  const [newlyCreatedSprintId, setNewlyCreatedSprintId] = useState('');
  const [allVersions, setAllVersions] = useState<Sprint[]>([]);
  const [versionSettings, setVersionSettings] = useState({
      duration: 7,
      category: '',
      audience: [] as string[],
      difficulty: 'Beginner' as SprintDifficulty,
      pricingType: 'cash' as 'cash' | 'credits',
      price: 0,
      pointCost: 0,
      outcomeTag: '',
      checkInReminder: false,
      checkInReminderDays: 7,
      sprintType: 'Core' as 'Fundamentals' | 'Core' | 'Expert' | 'Foundational' | 'Execution' | 'Skill',
      description: '',
      overrideOrchestrator: false,
      versionNumber: 2,
      versionTag: ''
  });
  const [previewType, setPreviewType] = useState<'card' | 'landing' | 'daily'>('daily');
  const [editSettings, setEditSettings] = useState<Partial<Sprint>>({});
  const [isAudienceDropdownOpen, setIsAudienceDropdownOpen] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>({});
  const [scrolledDown, setScrolledDown] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 120) {
        setScrolledDown(true);
      } else {
        setScrolledDown(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Input Refs for toolbars
  const lessonTextRef = useRef<HTMLTextAreaElement>(null);
  const taskPromptRef = useRef<HTMLTextAreaElement>(null);

  const isAdmin = activeRole === UserRole.ADMIN;
  
  const isFoundational = useMemo(() => {
    const cat = editSettings.category || sprint?.category;
    return cat === 'Core Platform Sprint' || cat === 'Growth Fundamentals';
  }, [editSettings.category, sprint?.category]);

  const canEditDirectly = !isAdmin || isAdmin; // Admins should always be able to edit directly if they choose

  const mergeUserEditsWithLatestDb = (
    original: Sprint,
    userUpdated: Sprint,
    latestDb: Sprint
  ): Sprint => {
    const finalSprint = { ...latestDb };

    const topFields: (keyof Sprint)[] = [
      'title', 'subtitle', 'coverImageUrl', 'transformation', 'description', 
      'category', 'difficulty', 'overrideOrchestrator', 'price', 'currency', 'pointCost', 
      'pricingType', 'duration', 'protocol', 'outcomeTag', 'checkInReminder', 'checkInReminderDays',
      'approvalStatus', 'published', 'blogBody', 'blogImage', 'igniteBody', 'igniteBgColor', 'igniteDate'
    ];

    topFields.forEach(f => {
      const origVal = original[f];
      const userVal = userUpdated[f];
      const isMutated = JSON.stringify(sanitizeData(origVal)) !== JSON.stringify(sanitizeData(userVal));
      if (isMutated) {
        (finalSprint as any)[f] = userVal;
      }
    });

    const listFields: (keyof Sprint)[] = ['forWho', 'notForWho', 'outcomes'];
    listFields.forEach(f => {
      const origVal = original[f];
      const userVal = userUpdated[f];
      const isMutated = JSON.stringify(sanitizeData(origVal)) !== JSON.stringify(sanitizeData(userVal));
      if (isMutated) {
        (finalSprint as any)[f] = userVal;
      }
    });

    if (JSON.stringify(sanitizeData(original.methodSnapshot)) !== JSON.stringify(sanitizeData(userUpdated.methodSnapshot))) {
      finalSprint.methodSnapshot = userUpdated.methodSnapshot;
    }

    if (JSON.stringify(sanitizeData(original.dynamicSections)) !== JSON.stringify(sanitizeData(userUpdated.dynamicSections))) {
      finalSprint.dynamicSections = userUpdated.dynamicSections;
    }

    const originalDaily = Array.isArray(original.dailyContent) ? original.dailyContent : [];
    const userDaily = Array.isArray(userUpdated.dailyContent) ? userUpdated.dailyContent : [];
    const dbDaily = Array.isArray(latestDb.dailyContent) ? latestDb.dailyContent : [];

    const finalDaily = [...dbDaily];

    userDaily.forEach(userDay => {
      const dayNum = userDay.day;
      const origDay = originalDaily.find(d => d.day === dayNum);
      const dbDayIdx = finalDaily.findIndex(d => d.day === dayNum);

      const isModified = !origDay || JSON.stringify(sanitizeData(origDay)) !== JSON.stringify(sanitizeData(userDay));

      if (isModified) {
        if (dbDayIdx >= 0) {
          finalDaily[dbDayIdx] = { ...userDay };
        } else {
          finalDaily.push({ ...userDay });
        }
      }
    });

    if (finalSprint.duration && finalDaily.length > finalSprint.duration) {
      finalSprint.dailyContent = finalDaily.slice(0, finalSprint.duration);
    } else {
      finalSprint.dailyContent = finalDaily;
    }

    return finalSprint;
  };

  const getPreviousDayConfiguredTags = () => {
    if (selectedDay <= 1 || !sprint) return [];
    const prevDay = selectedDay - 1;
    const prevContent = Array.isArray(sprint.dailyContent)
        ? sprint.dailyContent.find((c) => c.day === prevDay)
        : undefined;
    if (!prevContent) return [];
    
    const tags: { prompt: string; options: string[] }[] = [];
    prevContent.taskInputTypes?.forEach((type, idx) => {
        if (type === 'tags' || type === 'poll') {
            const prompt = prevContent.taskPrompts?.[idx] || prevContent.taskPrompt || `Step ${idx + 1}`;
            let options: string[] = [];
            const pollOptsRaw = prevContent.taskPollOptions?.[idx];
            if (pollOptsRaw) {
                try {
                    options = JSON.parse(pollOptsRaw);
                } catch (e) {
                    options = pollOptsRaw.split(',').map((o: any) => String(o).trim()).filter(Boolean);
                }
            }
            tags.push({ prompt, options: options.filter(Boolean) });
        }
    });
    return tags;
  };

  const getPrecedingDaysTagSteps = () => {
    if (!sprint || selectedDay <= 1) return [];
    const result: { day: number; stepIdx: number; type: string; label: string; prompt: string }[] = [];
    
    const sortedContent = [...(sprint.dailyContent || [])].sort((a, b) => b.day - a.day);
    
    sortedContent.forEach(dc => {
        if (dc.day < selectedDay) {
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

  const getSingleTagNoteValue = (tagNotesStr: string | undefined): string => {
    if (!tagNotesStr) return '';
    try {
        if (tagNotesStr.trim().startsWith('{')) {
            const parsed = JSON.parse(tagNotesStr);
            return Object.values(parsed).filter(Boolean)[0] as string || '';
        }
    } catch (e) {}
    return tagNotesStr;
  };

  const getAvailableConnectedTags = (stepIndex: number): string[] => {
    if (!currentContent) return [];
    
    const linkedSources = currentContent.taskLinkedSources?.[stepIndex] || [];
    const allTags: string[] = [];

    let legacyLinkedIndex = -1;
    for (let prevIndex = stepIndex - 1; prevIndex >= 0; prevIndex--) {
      if (currentContent.taskLinkedToNext?.[prevIndex]) {
        legacyLinkedIndex = prevIndex;
        break;
      }
    }
    
    const activeSources = linkedSources.length > 0 
      ? linkedSources 
      : (legacyLinkedIndex >= 0 ? [legacyLinkedIndex] : []);

    activeSources.forEach(srcIndex => {
      if (srcIndex < 0) {
        // Cross-day link!
        const absVal = Math.abs(srcIndex);
        const targetDay = Math.floor(absVal / 100);
        const targetStepIndex = absVal % 100;
        const targetDayContent = Array.isArray(sprint?.dailyContent)
          ? sprint.dailyContent.find((dc) => dc.day === targetDay)
          : undefined;
        if (targetDayContent) {
          const type = String(targetDayContent.taskInputTypes?.[targetStepIndex] || '').trim().toLowerCase();
          if (type === 'poll' || type === 'tags') {
            let hasOpts = false;
            try {
              const opts = JSON.parse(targetDayContent.taskPollOptions?.[targetStepIndex] || '[]');
              if (Array.isArray(opts) && opts.length > 0) {
                allTags.push(...opts.map(o => String(o || '').trim()).filter(Boolean));
                hasOpts = true;
              }
            } catch (e) {}
            if (!hasOpts && type === 'tags') {
              allTags.push("Mindset Shift", "Process Scale", "Goal Alignment");
            }
          }
        }
      } else {
        // Same-day link!
        const type = String(currentContent.taskInputTypes?.[srcIndex] || '').trim().toLowerCase();
        if (type === 'poll' || type === 'tags') {
          let hasOpts = false;
          try {
            const opts = JSON.parse(currentContent.taskPollOptions?.[srcIndex] || '[]');
            if (Array.isArray(opts) && opts.length > 0) {
              allTags.push(...opts.map(o => String(o || '').trim()).filter(Boolean));
              hasOpts = true;
            }
          } catch (e) {}
          if (!hasOpts && type === 'tags') {
            allTags.push("Mindset Shift", "Process Scale", "Goal Alignment");
          }
        }
      }
    });

    return Array.from(new Set(allTags)).filter(Boolean);
  };

  const findNearestPrecedingPoll = (dayContent: DailyContent | undefined, currentIndex: number) => {
    if (!dayContent || !Array.isArray(dayContent.taskInputTypes)) return -1;
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (dayContent.taskInputTypes[i] === 'poll') {
        return i;
      }
    }
    return -1;
  };

  const handleSetPollOptionLink = (index: number, linkValue: string | null) => {
    if (!currentContent) return;
    const links = [...(currentContent.taskPollOptionLinks || [])];
    while (links.length <= index) links.push(undefined);
    links[index] = linkValue || undefined;
    handleContentChange('taskPollOptionLinks', links);
  };

  const registryIncomplete = useMemo(() => sprint ? isRegistryIncomplete(sprint) : true, [sprint]);
  const curriculumIncomplete = useMemo(() => sprint ? isSprintIncomplete(sprint) : true, [sprint]);

  const hasChanges = useMemo(() => {
    if (!originalSprint || !sprint) return false;
    const changes = getPendingChanges(originalSprint, sprint);
    return Object.keys(changes).length > 0;
  }, [originalSprint, sprint]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sprintId || !user) return;
    
    setIsLoading(true);
    let timeoutId: any;

    const loadSprint = async () => {
      try {
        const found = await sprintService.getSprintById(sprintId);
        if (found) {
          if (timeoutId) clearTimeout(timeoutId);
          
          // originalSprint should represent the base sprint without pending changes
          // so that hasChanges correctly detects if there are any pending changes to submit.
          const baseSprint = { 
              ...found,
              dailyContent: Array.isArray(found.dailyContent) ? found.dailyContent : [],
              outcomes: Array.isArray(found.outcomes) ? found.outcomes : [],
              forWho: Array.isArray(found.forWho) ? found.forWho : [],
              notForWho: Array.isArray(found.notForWho) ? found.notForWho : [],
              methodSnapshot: Array.isArray(found.methodSnapshot) ? found.methodSnapshot : [],
              dynamicSections: Array.isArray(found.dynamicSections) ? found.dynamicSections : []
          };
          delete baseSprint.pendingChanges;
          setOriginalSprint(baseSprint);

          const merged: Sprint = {
              ...found,
              ...(found.pendingChanges || {}),
              dailyContent: (Array.isArray(found.pendingChanges?.dailyContent) 
                  ? found.pendingChanges.dailyContent 
                  : (Array.isArray(found.dailyContent) ? found.dailyContent : [])).map((c: any) => ({
                      ...c,
                      taskPrompts: (c as any).taskPrompts || [c.taskPrompt || '']
                  })),
              duration: found.pendingChanges?.duration || found.duration || 0,
              outcomes: Array.isArray(found.pendingChanges?.outcomes)
                  ? found.pendingChanges.outcomes
                  : (Array.isArray(found.outcomes) ? found.outcomes : []),
              forWho: Array.isArray(found.pendingChanges?.forWho)
                  ? found.pendingChanges.forWho
                  : (Array.isArray(found.forWho) ? found.forWho : []),
              notForWho: Array.isArray(found.pendingChanges?.notForWho)
                  ? found.pendingChanges.notForWho
                  : (Array.isArray(found.notForWho) ? found.notForWho : []),
              methodSnapshot: Array.isArray(found.pendingChanges?.methodSnapshot)
                  ? found.pendingChanges.methodSnapshot
                  : (Array.isArray(found.methodSnapshot) ? found.methodSnapshot : []),
              dynamicSections: Array.isArray(found.pendingChanges?.dynamicSections)
                  ? found.pendingChanges.dynamicSections
                  : (Array.isArray(found.dynamicSections) ? found.dynamicSections : [])
          };
          
          setSprint(merged);
          setReviewFeedback(found.reviewFeedback || {});

          // Ensure system sections exist in dynamicSections for unified editing
          const systemSections = [
            { id: 'identity', title: 'Sprint Identity', body: '', type: 'identity' as any },
            { id: 'metadata', title: 'Metadata', body: '', type: 'metadata' as any },
            { id: 'pricing', title: 'Pricing & Economy', body: '', type: 'pricing' as any },
            { id: 'completion', title: 'Completion Assets', body: '', type: 'completion' as any },
            { id: 'overview', title: 'Sprint Overview', body: merged.description || merged.transformation || '', type: 'text' as any }
          ];
          
          const initialDynamicSections = Array.isArray(merged.dynamicSections) ? [...merged.dynamicSections] : [];
          
          // Filter out any old custom sections that aren't 'overview'
          const filteredSections = initialDynamicSections.filter(s => 
            systemSections.find(sys => sys.id === s.id)
          );

          systemSections.forEach(sys => {
              if (!filteredSections.find(s => s.id === sys.id)) {
                  filteredSections.push(sys);
              }
          });

          setEditSettings({
            ...merged,
            audience: merged.audience || [],
            overrideOrchestrator: merged.overrideOrchestrator || false,
            dynamicSections: filteredSections
          });
          setIsLoading(false);
        } else {
          // If not found, wait a bit before giving up (handles race conditions on creation)
          if (!timeoutId) {
            timeoutId = setTimeout(async () => {
              const retryFound = await sprintService.getSprintById(sprintId);
              if (retryFound) {
                loadSprint();
              } else {
                console.error("Sprint not found after timeout");
                navigate('/dashboard');
              }
            }, 3000);
          }
        }
      } catch (err) {
        console.error("Error loading sprint:", err);
        navigate('/dashboard');
      }
    };

    loadSprint();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [sprintId, navigate, user]);

  useEffect(() => {
    if (!user || !sprint) return;
    const loadVersions = async () => {
      try {
        const originalId = sprint.parentSprintId || sprint.id;
        const coachSprints = await sprintService.getCoachSprints(user.id);
        const versions = coachSprints.filter(s => s.id === originalId || s.parentSprintId === originalId);
        
        // Sort them by versionNumber. Original has versionNumber 1 (or undefined/null, which we default to 1)
        const sorted = [...versions].sort((a, b) => {
          const vA = a.id === originalId ? 1 : (a.versionNumber || 1);
          const vB = b.id === originalId ? 1 : (b.versionNumber || 1);
          return vA - vB;
        });
        setAllVersions(sorted);
      } catch (err) {
        console.error("Error loading versions:", err);
      }
    };
    loadVersions();
  }, [user, sprint?.id, sprint?.parentSprintId]);



  const currentContent = useMemo((): DailyContent => {
    if (!sprint) return {
      day: selectedDay, lessonText: '', taskPrompt: '', taskPrompts: ['', '', ''], taskHints: []
    };
    const content = (Array.isArray(sprint.dailyContent) ? sprint.dailyContent.find(c => c.day === selectedDay) : undefined) || {
      day: selectedDay, lessonText: '', taskPrompt: '', taskPrompts: ['', '', ''], taskHints: []
    };
    
    // Return a safe copy with initialized taskPrompts if needed
    const safePrompts = Array.isArray((content as any).taskPrompts) && (content as any).taskPrompts.length > 0
      ? (content as any).taskPrompts
      : [content.taskPrompt || '', '', ''];
      
    // Ensure at least 3 elements for the default display if needed
    const paddedPrompts = [...safePrompts];
    while (paddedPrompts.length < 3) paddedPrompts.push('');

    const safeHints = Array.isArray((content as any).taskHints)
      ? (content as any).taskHints
      : [];

    const safeNotes = Array.isArray((content as any).taskNotes)
      ? (content as any).taskNotes
      : [];

    const safeTagNotes = Array.isArray((content as any).taskTagNotes)
      ? (content as any).taskTagNotes
      : [];

    const safeFootnotes = Array.isArray((content as any).taskFootnotes)
      ? (content as any).taskFootnotes
      : [];

    const safePollMultiSelect = Array.isArray((content as any).taskPollMultiSelect)
      ? (content as any).taskPollMultiSelect
      : [];

    const safeSpread = Array.isArray((content as any).taskSpread)
      ? (content as any).taskSpread
      : [];

    const safeMultiTextLabels = Array.isArray((content as any).taskMultiTextLabels)
      ? (content as any).taskMultiTextLabels
      : [];

    return {
        ...content,
        taskPrompts: paddedPrompts,
        taskHints: safeHints,
        taskNotes: safeNotes,
        taskTagNotes: safeTagNotes,
        taskFootnotes: safeFootnotes,
        taskPollMultiSelect: safePollMultiSelect,
        taskSpread: safeSpread,
        taskMultiTextLabels: safeMultiTextLabels
    };
  }, [sprint, selectedDay]);

  const handleContentChange = (field: keyof DailyContent, value: any) => {
    if (!sprint || !canEditDirectly) return;
    setSprint(prev => {
      if (!prev) return null;
      const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
      let updatedDailyContent = Array.isArray(prev.dailyContent) ? [...prev.dailyContent] : [];
      if (existingContentIndex >= 0) {
        updatedDailyContent[existingContentIndex] = { ...updatedDailyContent[existingContentIndex], [field]: value };
      } else {
        updatedDailyContent.push({ 
          day: selectedDay, 
          lessonText: '', 
          taskPrompt: '', 
          taskPrompts: ['', '', ''],
          [field]: value 
        });
      }
      return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const handleTaskPromptChange = (index: number, value: string) => {
    setSprint(prev => {
        if (!prev) return null;
        const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
        let updatedDailyContent = Array.isArray(prev.dailyContent) ? [...prev.dailyContent] : [];
        
        const currentPrompts = existingContentIndex >= 0 
            ? [...(updatedDailyContent[existingContentIndex].taskPrompts || [updatedDailyContent[existingContentIndex].taskPrompt || '', '', ''])]
            : ['', '', ''];
        
        while (currentPrompts.length <= index) currentPrompts.push('');
        currentPrompts[index] = value;
        
        const filtered = currentPrompts.filter(p => p.trim());
        const legacyValue = filtered.join('\n\n');
        
        if (existingContentIndex >= 0) {
          updatedDailyContent[existingContentIndex] = { 
              ...updatedDailyContent[existingContentIndex], 
              taskPrompts: currentPrompts,
              taskPrompt: legacyValue
          };
        } else {
          updatedDailyContent.push({
            day: selectedDay,
            lessonText: '',
            taskPrompt: legacyValue,
            taskPrompts: currentPrompts,
            taskInputTypes: currentPrompts.map(() => 'text')
          });
        }
        return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const handleTaskHintChange = (index: number, value: string) => {
    setSprint(prev => {
        if (!prev) return null;
        const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
        let updatedDailyContent = Array.isArray(prev.dailyContent) ? [...prev.dailyContent] : [];
        
        const currentHints = existingContentIndex >= 0 
            ? [...(updatedDailyContent[existingContentIndex].taskHints || [])]
            : [];
        
        while (currentHints.length <= index) {
            currentHints.push(null as any);
        }
        currentHints[index] = value;
        
        if (existingContentIndex >= 0) {
          updatedDailyContent[existingContentIndex] = { 
              ...updatedDailyContent[existingContentIndex], 
              taskHints: currentHints,
          };
        } else {
          updatedDailyContent.push({
            day: selectedDay,
            lessonText: '',
            taskPrompt: '',
            taskPrompts: ['', '', ''],
            taskHints: currentHints,
          });
        }
        return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const handleTaskNoteChange = (index: number, value: string) => {
    setSprint(prev => {
        if (!prev) return null;
        const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
        let updatedDailyContent = Array.isArray(prev.dailyContent) ? [...prev.dailyContent] : [];
        
        const currentNotes = existingContentIndex >= 0 
            ? [...(updatedDailyContent[existingContentIndex].taskNotes || [])]
            : [];
        
        while (currentNotes.length <= index) {
            currentNotes.push(null as any);
        }
        currentNotes[index] = value;
        
        if (existingContentIndex >= 0) {
          updatedDailyContent[existingContentIndex] = { 
              ...updatedDailyContent[existingContentIndex], 
              taskNotes: currentNotes,
          };
        } else {
          updatedDailyContent.push({
            day: selectedDay,
            lessonText: '',
            taskPrompt: '',
            taskPrompts: ['', '', ''],
            taskNotes: currentNotes,
          });
        }
        return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const handleTaskFootnoteChange = (index: number, value: string) => {
    setSprint(prev => {
        if (!prev) return null;
        const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
        let updatedDailyContent = Array.isArray(prev.dailyContent) ? [...prev.dailyContent] : [];
        
        const currentFootnotes = existingContentIndex >= 0 
            ? [...(updatedDailyContent[existingContentIndex].taskFootnotes || [])]
            : [];
        
        while (currentFootnotes.length <= index) {
            currentFootnotes.push(null as any);
        }
        currentFootnotes[index] = value;
        
        if (existingContentIndex >= 0) {
          updatedDailyContent[existingContentIndex] = { 
              ...updatedDailyContent[existingContentIndex], 
              taskFootnotes: currentFootnotes,
          };
        } else {
          updatedDailyContent.push({
            day: selectedDay,
            lessonText: '',
            taskPrompt: '',
            taskPrompts: ['', '', ''],
            taskFootnotes: currentFootnotes,
          });
        }
        return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const assignSelectedText = (field: 'prompt' | 'note' | 'hint' | 'footnote', index: number) => {
    if (!selectedText) return;
    
    if (field === 'prompt') {
      handleTaskPromptChange(index, selectedText);
    } else if (field === 'note') {
      handleTaskNoteChange(index, selectedText);
    } else if (field === 'hint') {
      handleTaskHintChange(index, selectedText);
    } else if (field === 'footnote') {
      handleTaskFootnoteChange(index, selectedText);
    }
    
    setLastAssignedField(`${field}-${index}`);
    setTimeout(() => {
      setLastAssignedField(null);
    }, 1500);

    setSelectedText('');
    setTooltipPosition(null);
  };

  const handleTextareaSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (start !== end) {
      const text = target.value.substring(start, end).trim();
      if (text) {
        setSelectedText(text);
      }
    } else {
      setSelectedText('');
    }
  };

  const handleTextareaMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    if (target.selectionStart === target.selectionEnd) {
      setSelectedText('');
      setTooltipPosition(null);
      return;
    }
    
    setTooltipPosition({
      x: e.clientX,
      y: e.clientY - 45
    });
  };

  const handleTaskMultiTextLabelsChange = (index: number, values: string[]) => {
    setSprint(prev => {
        if (!prev) return null;
        const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
        let updatedDailyContent = Array.isArray(prev.dailyContent) ? [...prev.dailyContent] : [];
        
        const currentLabels = existingContentIndex >= 0 
            ? [...(updatedDailyContent[existingContentIndex].taskMultiTextLabels || [])]
            : [];
        
        while (currentLabels.length <= index) {
            currentLabels.push(null as any);
        }
        currentLabels[index] = values;
        
        if (existingContentIndex >= 0) {
          updatedDailyContent[existingContentIndex] = { 
              ...updatedDailyContent[existingContentIndex], 
              taskMultiTextLabels: currentLabels,
          };
        } else {
          updatedDailyContent.push({
            day: selectedDay,
            lessonText: '',
            taskPrompt: '',
            taskPrompts: ['', '', ''],
            taskMultiTextLabels: currentLabels,
          });
        }
        return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const handleToggleTaskTagNoteActive = (index: number, active: boolean) => {
    setSprint(prev => {
        if (!prev) return null;
        const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
        let updatedDailyContent = Array.isArray(prev.dailyContent) ? [...prev.dailyContent] : [];
        
        const currentActive = existingContentIndex >= 0 
            ? [...(updatedDailyContent[existingContentIndex].taskTagNoteActive || [])]
            : [];
        
        while (currentActive.length <= index) {
            currentActive.push(false);
        }
        currentActive[index] = active;
        
        let currentOptions = existingContentIndex >= 0
            ? [...(updatedDailyContent[existingContentIndex].taskPollOptions || [])]
            : [];
        const currentTypes = existingContentIndex >= 0
            ? [...(updatedDailyContent[existingContentIndex].taskInputTypes || [])]
            : [];

        if (currentTypes[index] === 'poll') {
            let optsArr: string[] = [];
            if (currentOptions[index]) {
                try { optsArr = JSON.parse(currentOptions[index]); } catch (e) {}
            }
            if (!Array.isArray(optsArr)) optsArr = [];
            if (active) {
                while (optsArr.length < 4) {
                    optsArr.push('');
                }
            } else {
                optsArr = optsArr.filter(opt => opt && opt.trim() !== '');
            }
            while (currentOptions.length <= index) currentOptions.push('[]');
            currentOptions[index] = JSON.stringify(optsArr);
        }
        
        if (existingContentIndex >= 0) {
          updatedDailyContent[existingContentIndex] = { 
              ...updatedDailyContent[existingContentIndex], 
              taskTagNoteActive: currentActive,
              taskPollOptions: currentOptions,
          };
        } else {
          updatedDailyContent.push({
            day: selectedDay,
            lessonText: '',
            taskPrompt: '',
            taskPrompts: ['', '', ''],
            taskTagNoteActive: currentActive,
            taskPollOptions: currentOptions,
          } as any);
        }
        return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const handleTaskSingleTagNoteChange = (index: number, noteText: string) => {
    setSprint(prev => {
        if (!prev) return null;
        const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
        let updatedDailyContent = Array.isArray(prev.dailyContent) ? [...prev.dailyContent] : [];
        
        const currentTagNotes = existingContentIndex >= 0 
            ? [...(updatedDailyContent[existingContentIndex].taskTagNotes || [])]
            : [];
        
        while (currentTagNotes.length <= index) {
            currentTagNotes.push('');
        }
        
        currentTagNotes[index] = noteText;
        
        if (existingContentIndex >= 0) {
          updatedDailyContent[existingContentIndex] = { 
              ...updatedDailyContent[existingContentIndex], 
              taskTagNotes: currentTagNotes,
          };
        } else {
          updatedDailyContent.push({
            day: selectedDay,
            lessonText: '',
            taskPrompt: '',
            taskPrompts: ['', '', ''],
            taskTagNotes: currentTagNotes,
          } as any);
        }
        return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const handleTaskPromptTypeChange = (index: number, type: 'text' | 'tags' | 'poll' | 'note' | 'mark') => {
    setSprint(prev => {
        if (!prev) return null;
        const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
        let updatedDailyContent = Array.isArray(prev.dailyContent) ? [...prev.dailyContent] : [];
        
        const currentTypes = existingContentIndex >= 0 
            ? [...(updatedDailyContent[existingContentIndex].taskInputTypes || Array((updatedDailyContent[existingContentIndex].taskPrompts?.length || 3)).fill('text'))]
            : ['text', 'text', 'text'];
        
        while (currentTypes.length <= index) currentTypes.push('text');
        currentTypes[index] = type;
        
        let currentOptions = existingContentIndex >= 0 
            ? [...(updatedDailyContent[existingContentIndex].taskPollOptions || [])] 
            : [];
            
        if (type === 'poll') {
            const currentOptsStr = currentOptions[index];
            let currentOptsArr: string[] = [];
            if (currentOptsStr) {
                try { currentOptsArr = JSON.parse(currentOptsStr); } catch (e) {}
            }
            if (!Array.isArray(currentOptsArr)) currentOptsArr = [];
            
            // If linked from previous (follow-up poll) and Tag Note is OFF, default to 0 options, otherwise at least 4
            const isFollowUpPoll = index > 0 && updatedDailyContent[existingContentIndex]?.taskLinkedToNext?.[index - 1];
            const isTagNoteActive = !!updatedDailyContent[existingContentIndex]?.taskTagNoteActive?.[index];
            
            if (isFollowUpPoll && !isTagNoteActive) {
                currentOptsArr = currentOptsArr.filter(opt => opt && opt.trim() !== '');
            } else {
                while (currentOptsArr.length < 4) {
                    currentOptsArr.push('');
                }
            }
            while (currentOptions.length <= index) currentOptions.push('[]');
            currentOptions[index] = JSON.stringify(currentOptsArr);
        }

        // Clean up connections if any step was removed from 'tags'
        let currentLinked = existingContentIndex >= 0
            ? [...(updatedDailyContent[existingContentIndex].taskLinkedToNext || [])]
            : [];
        let currentSources = existingContentIndex >= 0 && Array.isArray(updatedDailyContent[existingContentIndex].taskLinkedSources)
            ? updatedDailyContent[existingContentIndex].taskLinkedSources.map(sources => Array.isArray(sources) ? [...sources] : [])
            : [];

        // Clean up the index element's own relationships if they no longer apply
        if (type !== 'tags') {
            if (currentLinked.length > index) {
                currentLinked[index] = false;
            }
        }
        if (type !== 'poll') {
            while (currentSources.length <= index) {
                currentSources.push([]);
            }
            currentSources[index] = [];
        }

        for (let i = 0; i < currentTypes.length; i++) {
            if (currentTypes[i] !== 'tags') {
                if (currentLinked.length > i) {
                    currentLinked[i] = false;
                }
                currentSources = currentSources.map(sources => {
                    if (Array.isArray(sources)) {
                        return sources.filter(srcIdx => srcIdx !== i);
                    }
                    return [];
                });
            }
        }
        
        if (existingContentIndex >= 0) {
          updatedDailyContent[existingContentIndex] = { 
              ...updatedDailyContent[existingContentIndex], 
              taskInputTypes: currentTypes,
              taskPollOptions: currentOptions,
              taskLinkedToNext: currentLinked,
              taskLinkedSources: currentSources
          };
        } else {
          updatedDailyContent.push({
            day: selectedDay,
            lessonText: '',
            taskPrompt: '',
            taskPrompts: ['', '', ''],
            taskInputTypes: currentTypes,
            taskPollOptions: currentOptions,
            taskLinkedToNext: currentLinked,
            taskLinkedSources: currentSources
          });
        }
        return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const handleTaskPollOptionChange = (promptIndex: number, optionIndex: number, value: string) => {
    setSprint(prev => {
        if (!prev) return null;
        const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
        if (existingContentIndex < 0) return prev;
        
        let updatedDailyContent = [...prev.dailyContent];
        let currentOptions = [...(updatedDailyContent[existingContentIndex].taskPollOptions || [])];
        
        while (currentOptions.length <= promptIndex) currentOptions.push('[]');
        let optionsForPrompt: string[] = [];
        try { optionsForPrompt = JSON.parse(currentOptions[promptIndex] || '[]'); } catch (e) {}
        while (optionsForPrompt.length <= optionIndex) optionsForPrompt.push('');
        
        optionsForPrompt[optionIndex] = value;
        currentOptions[promptIndex] = JSON.stringify(optionsForPrompt);
        
        updatedDailyContent[existingContentIndex] = {
            ...updatedDailyContent[existingContentIndex],
            taskPollOptions: currentOptions
        };
        return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const removeTaskPollOption = (promptIndex: number, optionIndex: number) => {
    setSprint(prev => {
        if (!prev) return null;
        const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
        if (existingContentIndex < 0) return prev;
        
        let updatedDailyContent = [...prev.dailyContent];
        let currentOptions = [...(updatedDailyContent[existingContentIndex].taskPollOptions || [])];
        if (!currentOptions[promptIndex]) return prev;
        
        let optionsForPrompt: string[] = [];
        try { optionsForPrompt = JSON.parse(currentOptions[promptIndex]); } catch (e) {}
        
        optionsForPrompt.splice(optionIndex, 1);
        currentOptions[promptIndex] = JSON.stringify(optionsForPrompt);
        
        updatedDailyContent[existingContentIndex] = {
            ...updatedDailyContent[existingContentIndex],
            taskPollOptions: currentOptions
        };
        return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const handleToggleLinkToNext = (index: number) => {
    setSprint(prev => {
        if (!prev) return null;
        const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
        if (existingContentIndex < 0) return prev;
        
        let updatedDailyContent = [...prev.dailyContent];
        let currentLinked = [...(updatedDailyContent[existingContentIndex].taskLinkedToNext || [])];
        
        while (currentLinked.length <= index) currentLinked.push(false);
        const newState = !currentLinked[index];
        currentLinked[index] = newState;
        
        let currentPrompts = [...(updatedDailyContent[existingContentIndex].taskPrompts || [])];
        let currentTypes = [...(updatedDailyContent[existingContentIndex].taskInputTypes || [])];
        let currentOptions = [...(updatedDailyContent[existingContentIndex].taskPollOptions || [])];
        
        if (newState) {
            if (currentPrompts.length <= index + 1) {
                currentPrompts.push('');
                currentTypes.push('poll');
                currentOptions.push(JSON.stringify(['']));
            } else {
                currentTypes[index + 1] = 'poll';
                currentOptions[index + 1] = JSON.stringify(['']);
            }
        }
        
        updatedDailyContent[existingContentIndex] = {
            ...updatedDailyContent[existingContentIndex],
            taskLinkedToNext: currentLinked,
            taskPrompts: currentPrompts,
            taskInputTypes: currentTypes,
            taskPollOptions: currentOptions
        };
        return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const handleToggleSourceLink = (stepIndex: number, sourceIndex: number) => {
    setSprint(prev => {
        if (!prev) return null;
        const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
        if (existingContentIndex < 0) return prev;
        
        let updatedDailyContent = [...prev.dailyContent];
        let currentSources = Array.isArray(updatedDailyContent[existingContentIndex].taskLinkedSources)
            ? [...(updatedDailyContent[existingContentIndex].taskLinkedSources || [])]
            : [];
        
        while (currentSources.length <= stepIndex) {
            currentSources.push([]);
        }
        
        let sourcesForStep = Array.isArray(currentSources[stepIndex]) ? [...currentSources[stepIndex]] : [];
        if (sourcesForStep.includes(sourceIndex)) {
            sourcesForStep = sourcesForStep.filter(s => s !== sourceIndex);
        } else {
            sourcesForStep.push(sourceIndex);
        }
        currentSources[stepIndex] = sourcesForStep;
        
        let currentTypes = [...(updatedDailyContent[existingContentIndex].taskInputTypes || [])];
        while (currentTypes.length <= stepIndex) {
            currentTypes.push('text');
        }
        if (sourcesForStep.length > 0 && currentTypes[stepIndex] === 'tags') {
            currentTypes[stepIndex] = 'poll';
        }
        
        let currentOptions = [...(updatedDailyContent[existingContentIndex].taskPollOptions || [])];
        if (currentTypes[stepIndex] === 'poll') {
            while (currentOptions.length <= stepIndex) currentOptions.push('[]');
            let optsArr: string[] = [];
            try { optsArr = JSON.parse(currentOptions[stepIndex] || '[]'); } catch (e) {}
            if (!Array.isArray(optsArr) || optsArr.length === 0) {
                optsArr = [''];
            }
            currentOptions[stepIndex] = JSON.stringify(optsArr);
        }

        updatedDailyContent[existingContentIndex] = {
            ...updatedDailyContent[existingContentIndex],
            taskLinkedSources: currentSources,
            taskInputTypes: currentTypes,
            taskPollOptions: currentOptions
        };
        return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const handleClearSourceLinks = (stepIndex: number) => {
    setSprint(prev => {
        if (!prev) return null;
        const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
        if (existingContentIndex < 0) return prev;
        
        let updatedDailyContent = [...prev.dailyContent];
        let currentSources = Array.isArray(updatedDailyContent[existingContentIndex].taskLinkedSources)
            ? [...(updatedDailyContent[existingContentIndex].taskLinkedSources || [])]
            : [];
        
        while (currentSources.length <= stepIndex) {
            currentSources.push([]);
        }
        
        currentSources[stepIndex] = [];
        
        let currentTypes = [...(updatedDailyContent[existingContentIndex].taskInputTypes || [])];
        if (currentTypes[stepIndex] === 'poll') {
            currentTypes[stepIndex] = 'tags';
        }

        updatedDailyContent[existingContentIndex] = {
            ...updatedDailyContent[existingContentIndex],
            taskLinkedSources: currentSources,
            taskInputTypes: currentTypes
        };
        return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const handleTogglePollMultiSelect = (index: number) => {
    setSprint(prev => {
        if (!prev) return null;
        const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
        if (existingContentIndex < 0) return prev;
        
        let updatedDailyContent = [...prev.dailyContent];
        let currentMultiSelect = Array.isArray(updatedDailyContent[existingContentIndex].taskPollMultiSelect)
            ? [...(updatedDailyContent[existingContentIndex].taskPollMultiSelect || [])]
            : [];
        
        while (currentMultiSelect.length <= index) {
            currentMultiSelect.push(false);
        }
        currentMultiSelect[index] = !currentMultiSelect[index];
        
        updatedDailyContent[existingContentIndex] = {
            ...updatedDailyContent[existingContentIndex],
            taskPollMultiSelect: currentMultiSelect
        };
        return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const handleToggleSpread = (index: number) => {
    setSprint(prev => {
        if (!prev) return null;
        const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
        if (existingContentIndex < 0) return prev;
        
        let updatedDailyContent = [...prev.dailyContent];
        let currentSpread = Array.isArray(updatedDailyContent[existingContentIndex].taskSpread)
            ? [...(updatedDailyContent[existingContentIndex].taskSpread || [])]
            : [];
        
        while (currentSpread.length <= index) {
            currentSpread.push(false);
        }
        currentSpread[index] = !currentSpread[index];
        
        updatedDailyContent[existingContentIndex] = {
            ...updatedDailyContent[existingContentIndex],
            taskSpread: currentSpread
        };
        return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const addTaskPrompt = () => {
    setSprint(prev => {
        if (!prev) return null;
        const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
        let updatedDailyContent = Array.isArray(prev.dailyContent) ? [...prev.dailyContent] : [];
        
        const currentPrompts = existingContentIndex >= 0 
            ? [...(updatedDailyContent[existingContentIndex].taskPrompts || [updatedDailyContent[existingContentIndex].taskPrompt || '', '', ''])]
            : ['', '', ''];
            
        const currentTypes = existingContentIndex >= 0 
            ? [...(updatedDailyContent[existingContentIndex].taskInputTypes || Array(currentPrompts.length).fill('text'))]
            : ['text', 'text', 'text'];

        let currentOptions = existingContentIndex >= 0 
            ? [...(updatedDailyContent[existingContentIndex].taskPollOptions || [])]
            : [];

        let currentNotes = existingContentIndex >= 0
            ? [...(updatedDailyContent[existingContentIndex].taskNotes || [])]
            : [];

        let currentTagNotes = existingContentIndex >= 0
            ? [...(updatedDailyContent[existingContentIndex].taskTagNotes || [])]
            : [];

        let currentFootnotes = existingContentIndex >= 0
            ? [...(updatedDailyContent[existingContentIndex].taskFootnotes || [])]
            : [];

        let currentMultiTextLabels = existingContentIndex >= 0
            ? [...(updatedDailyContent[existingContentIndex].taskMultiTextLabels || [])]
            : [];
            
        let currentSpread = existingContentIndex >= 0
            ? [...(updatedDailyContent[existingContentIndex].taskSpread || [])]
            : [];

        let currentPollLinks = existingContentIndex >= 0
            ? [...(updatedDailyContent[existingContentIndex].taskPollOptionLinks || [])]
            : [];
            
        currentPrompts.push('');
        currentTypes.push('text');
        currentOptions.push('[]');
        currentNotes.push(null as any);
        currentTagNotes.push('{}');
        currentFootnotes.push(null as any);
        currentMultiTextLabels.push(null as any);
        currentSpread.push(false);
        currentPollLinks.push(null as any);
        
        if (existingContentIndex >= 0) {
          updatedDailyContent[existingContentIndex] = { 
              ...updatedDailyContent[existingContentIndex], 
              taskPrompts: currentPrompts,
              taskInputTypes: currentTypes,
              taskPollOptions: currentOptions,
              taskNotes: currentNotes,
              taskTagNotes: currentTagNotes,
              taskFootnotes: currentFootnotes,
              taskMultiTextLabels: currentMultiTextLabels,
              taskSpread: currentSpread,
              taskPollOptionLinks: currentPollLinks
          };
        } else {
          updatedDailyContent.push({
            day: selectedDay,
            lessonText: '',
            taskPrompt: '',
            taskPrompts: currentPrompts,
            taskInputTypes: currentTypes,
            taskPollOptions: currentOptions,
            taskNotes: currentNotes,
            taskTagNotes: currentTagNotes,
            taskFootnotes: currentFootnotes,
            taskMultiTextLabels: currentMultiTextLabels,
            taskSpread: currentSpread,
            taskPollOptionLinks: currentPollLinks
          });
        }
        return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const removeTaskPrompt = (index: number) => {
    setSprint(prev => {
        if (!prev) return null;
        const existingContentIndex = Array.isArray(prev.dailyContent) ? prev.dailyContent.findIndex(c => c.day === selectedDay) : -1;
        let updatedDailyContent = Array.isArray(prev.dailyContent) ? [...prev.dailyContent] : [];
        
        const currentPrompts = existingContentIndex >= 0 
            ? [...(updatedDailyContent[existingContentIndex].taskPrompts || [updatedDailyContent[existingContentIndex].taskPrompt || '', '', ''])]
            : ['', '', ''];
            
        if (currentPrompts.length <= 1) return prev;
            
        const currentTypes = existingContentIndex >= 0 
            ? [...(updatedDailyContent[existingContentIndex].taskInputTypes || Array(currentPrompts.length).fill('text'))]
            : ['text', 'text', 'text'];

        let currentOptions = existingContentIndex >= 0 
            ? [...(updatedDailyContent[existingContentIndex].taskPollOptions || [])]
            : [];
            
        let currentLinked = existingContentIndex >= 0 
            ? [...(updatedDailyContent[existingContentIndex].taskLinkedToNext || [])]
            : [];

        let currentHints = existingContentIndex >= 0 
            ? [...(updatedDailyContent[existingContentIndex].taskHints || [])]
            : [];

        let currentNotes = existingContentIndex >= 0
            ? [...(updatedDailyContent[existingContentIndex].taskNotes || [])]
            : [];

        let currentTagNotes = existingContentIndex >= 0
            ? [...(updatedDailyContent[existingContentIndex].taskTagNotes || [])]
            : [];

        let currentFootnotes = existingContentIndex >= 0
            ? [...(updatedDailyContent[existingContentIndex].taskFootnotes || [])]
            : [];

        let currentMultiTextLabels = existingContentIndex >= 0
            ? [...(updatedDailyContent[existingContentIndex].taskMultiTextLabels || [])]
            : [];

        let currentSpread = existingContentIndex >= 0
            ? [...(updatedDailyContent[existingContentIndex].taskSpread || [])]
            : [];

        let currentPollLinks = existingContentIndex >= 0
            ? [...(updatedDailyContent[existingContentIndex].taskPollOptionLinks || [])]
            : [];
            
        let deleteCount = 1;
        if (currentLinked[index]) {
            deleteCount = 2; // Also delete the branch poll to complement for default 3
        }
            
        const maxNeeded = Math.max(currentPrompts.length, index + deleteCount);
        while (currentTypes.length < maxNeeded) currentTypes.push('text');
        while (currentOptions.length < maxNeeded) currentOptions.push('[]');
        while (currentLinked.length < maxNeeded) currentLinked.push(false);
        while (currentHints.length < maxNeeded) currentHints.push(undefined as any);
        while (currentNotes.length < maxNeeded) currentNotes.push(null as any);
        while (currentTagNotes.length < maxNeeded) currentTagNotes.push('{}');
        while (currentFootnotes.length < maxNeeded) currentFootnotes.push(null as any);
        while (currentMultiTextLabels.length < maxNeeded) currentMultiTextLabels.push(null as any);
        while (currentSpread.length < maxNeeded) currentSpread.push(false);
        while (currentPollLinks.length < maxNeeded) currentPollLinks.push(null as any);

        let currentLinkedSources = existingContentIndex >= 0 && Array.isArray(updatedDailyContent[existingContentIndex].taskLinkedSources)
            ? updatedDailyContent[existingContentIndex].taskLinkedSources.map(sources => Array.isArray(sources) ? [...sources] : [])
            : [];
        while (currentLinkedSources.length < maxNeeded) currentLinkedSources.push([]);

        // Adjust source index links (filter out deleted indices, shift down higher ones)
        currentLinkedSources = currentLinkedSources.map(sources => {
            if (!Array.isArray(sources)) return [];
            return sources
                .filter(srcIdx => srcIdx < index || srcIdx >= index + deleteCount)
                .map(srcIdx => srcIdx >= index + deleteCount ? srcIdx - deleteCount : srcIdx);
        });

        currentPrompts.splice(index, deleteCount);
        currentTypes.splice(index, deleteCount);
        currentOptions.splice(index, deleteCount);
        currentHints.splice(index, deleteCount);
        currentNotes.splice(index, deleteCount);
        currentTagNotes.splice(index, deleteCount);
        currentFootnotes.splice(index, deleteCount);
        currentMultiTextLabels.splice(index, deleteCount);
        currentSpread.splice(index, deleteCount);
        currentPollLinks.splice(index, deleteCount);
        
        if (index > 0 && currentLinked.length >= index && currentLinked[index - 1]) {
            currentLinked[index - 1] = false;
        }
        currentLinked.splice(index, deleteCount);
        currentLinkedSources.splice(index, deleteCount);
        
        while (currentPrompts.length < 3) {
            currentPrompts.push('');
            currentTypes.push('text');
            currentOptions.push('[]');
            currentLinked.push(false);
            currentHints.push(undefined as any);
            currentNotes.push(null as any);
            currentTagNotes.push('{}');
            currentFootnotes.push(null as any);
            currentMultiTextLabels.push(null as any);
            currentSpread.push(false);
            currentLinkedSources.push([]);
            currentPollLinks.push(null as any);
        }
        
        const filtered = currentPrompts.filter(p => p.trim());
        const legacyValue = filtered.join('\n\n');
        
        if (existingContentIndex >= 0) {
          updatedDailyContent[existingContentIndex] = { 
              ...updatedDailyContent[existingContentIndex], 
              taskPrompts: currentPrompts,
              taskPrompt: legacyValue,
              taskInputTypes: currentTypes,
              taskPollOptions: currentOptions,
              taskLinkedToNext: currentLinked,
              taskHints: currentHints,
              taskNotes: currentNotes,
              taskTagNotes: currentTagNotes,
              taskFootnotes: currentFootnotes,
              taskMultiTextLabels: currentMultiTextLabels,
              taskSpread: currentSpread,
              taskLinkedSources: currentLinkedSources,
              taskPollOptionLinks: currentPollLinks
          };
        } else {
          updatedDailyContent.push({
            day: selectedDay,
            lessonText: '',
            taskPrompt: legacyValue,
            taskPrompts: currentPrompts,
            taskInputTypes: currentTypes,
            taskPollOptions: currentOptions,
            taskLinkedToNext: currentLinked,
            taskHints: currentHints,
            taskNotes: currentNotes,
            taskTagNotes: currentTagNotes,
            taskFootnotes: currentFootnotes,
            taskMultiTextLabels: currentMultiTextLabels,
            taskSpread: currentSpread,
            taskLinkedSources: currentLinkedSources,
            taskPollOptionLinks: currentPollLinks
          });
        }
        return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const handleSaveDraft = async () => {
    if (!sprint || !originalSprint) return;
    setSaveStatus('saving');
    try {
      const isDraft = sprint.approvalStatus === 'draft';
      const isDirectPush = isDraft || isAdmin;
      const changes = getPendingChanges(originalSprint, sprint);
      
      let updatedSprintData: any = {};

      if (isDirectPush) {
          // Apply all changes directly to the main document
          updatedSprintData = { ...changes };

          if (isAdmin && isFoundational) {
              updatedSprintData.published = true;
              updatedSprintData.approvalStatus = 'approved';
          }
      } else {
          // Review flow
          updatedSprintData = {
              pendingChanges: changes,
          };
      }

      if (!isAdmin && sprint.approvalStatus === 'rejected') {
          updatedSprintData.approvalStatus = 'draft';
      }

      await sprintService.updateSprint(sprint.id, updatedSprintData, isAdmin);
      
      if (isDirectPush) {
          setOriginalSprint({ ...sprint });
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) { 
        console.error("Save failed:", err);
        setSaveStatus('idle'); 
        alert(`Save failed: ${err.message || String(err)}`); 
    }
  };

  const handleSubmitForReview = async () => {
      if (!sprint || !originalSprint || isSubmittingReview) return;

      if (sprint.approvalStatus === 'approved') {
          const confirmAgain = window.confirm("Are you sure you want to submit for review again?");
          if (!confirmAgain) return;
      }

      setIsSubmittingReview(true);
      try {
          const changes = getPendingChanges(originalSprint, sprint);
          await sprintService.updateSprint(sprint.id, {
              pendingChanges: changes,
              approvalStatus: 'pending_approval'
          });
          alert("Sprint submitted for review.");
      } catch (err) {
          alert("Submission failed. Please check your connection.");
      } finally {
          setIsSubmittingReview(false);
      }
  };

  const handleAdminApprove = async () => {
      if (!sprintId || !sprint || approvalStatus === 'processing') return;
      setApprovalStatus('processing');
      try {
          // Pass the full merged sprint to ensure all changes (registry + curriculum) are pushed live
          await sprintService.approveSprint(sprintId, sprint);
          alert("Updates approved and pushed live.");
          navigate('/dashboard');
      } catch (err: any) {
          alert(err.message || "Approval failed.");
          setApprovalStatus('idle');
      }
  };

  const handleAdminAmend = async () => {
      if (!sprintId || !sprint || approvalStatus === 'processing') return;
      setApprovalStatus('processing');
      try {
          const updated = { ...sprint, approvalStatus: 'rejected' as const, reviewFeedback };
          await sprintService.updateSprint(sprintId, updated);
          alert("Amendments sent to coach.");
          navigate('/dashboard');
      } catch (err) { setApprovalStatus('idle'); }
  };

  const handleApplySettings = async () => {
    if (!sprint || !originalSprint) return;
    setSettingsSaveStatus('saving');

    // 2. Prepare updated data
    let updatedSprintData: Partial<Sprint> = {
      title: editSettings.title,
      subtitle: editSettings.subtitle,
      coverImageUrl: editSettings.coverImageUrl,
      dynamicSections: editSettings.dynamicSections,
      category: editSettings.category,
      difficulty: editSettings.difficulty,
      audience: editSettings.audience || [],
      overrideOrchestrator: editSettings.overrideOrchestrator || false,
      price: editSettings.price,
      currency: editSettings.currency,
      pointCost: editSettings.pointCost,
      pricingType: editSettings.pricingType,
      duration: editSettings.duration,
      outcomeTag: editSettings.outcomeTag,
      checkInReminder: editSettings.checkInReminder || false,
      checkInReminderDays: editSettings.checkInReminderDays || 7,
      versionNumber: editSettings.versionNumber ?? 1,
      versionTag: editSettings.versionTag || ''
    };

    // Handle duration change by adjusting dailyContent array
    const newDuration = editSettings.duration || 7;
    if (newDuration !== sprint.duration) {
      const currentDailyContent = Array.isArray(sprint.dailyContent) ? [...sprint.dailyContent] : [];
      if (newDuration > currentDailyContent.length) {
        // Pad with empty days
        const padding = Array.from({ length: newDuration - currentDailyContent.length }, (_, i) => ({
          day: currentDailyContent.length + i + 1,
          lessonText: '',
          taskPrompt: '',
          taskPrompts: ['', '', '']
        }));
        updatedSprintData.dailyContent = [...currentDailyContent, ...padding];
      } else if (newDuration < currentDailyContent.length) {
        // Truncate
        updatedSprintData.dailyContent = currentDailyContent.slice(0, newDuration);
      }
    }

    // Parse dynamic sections back into sprint properties
    editSettings.dynamicSections?.forEach(section => {
      switch (section.id) {
        case 'overview':
          updatedSprintData.transformation = section.body;
          updatedSprintData.description = section.body;
          break;
        case 'forWho':
          updatedSprintData.forWho = section.body.split('\n').map(s => s.trim()).filter(s => s);
          break;
        case 'notForWho':
          updatedSprintData.notForWho = section.body.split('\n').map(s => s.trim()).filter(s => s);
          break;
        case 'methodSnapshot':
          updatedSprintData.methodSnapshot = section.body.split('\n').map(line => {
            const [verb, description] = line.split(':').map(s => s.trim());
            return { verb: verb || '', description: description || '' };
          }).filter(m => m.verb || m.description);
          break;
        case 'outcomes':
          updatedSprintData.outcomes = section.body.split('\n').map(s => s.trim()).filter(s => s);
          break;
      }
    });

    try {
        const updatedLocalSprint = { ...sprint, ...updatedSprintData as any };
        
        setSprint(updatedLocalSprint);
        setEditSettings({
            ...updatedLocalSprint,
            audience: updatedLocalSprint.audience || [],
            overrideOrchestrator: updatedLocalSprint.overrideOrchestrator || false,
            dynamicSections: editSettings.dynamicSections
        });
        setSettingsSaveStatus('saved');
        
        // Confirmation Popup
        setTimeout(() => {
            alert("Settings updated in draft. Please click the Save Draft button to persist changes to the database.");
            setSettingsSaveStatus('idle');
            setShowSettings(false);
        }, 500);
    } catch (err) {
        console.error("Settings update failed:", err);
        setSettingsSaveStatus('idle');
        alert("Failed to update settings in draft. Please try again.");
    }
  };

  const handleDynamicSectionChange = (index: number, field: 'title' | 'body', value: any) => {
    const newSections = [...(editSettings.dynamicSections || [])];
    newSections[index] = { ...newSections[index], [field]: value };
    setEditSettings({ ...editSettings, dynamicSections: newSections });
  };

  const handleInitiateAddVersion = async () => {
    if (!user || !sprint) return;
    if (sprint.parentSprintId) {
      alert("You can only create a version of a sprint from its true source.");
      return;
    }

    // Determine next version number based on sibling versions
    let nextVersion = 2;
    try {
      const allCoachSprints = await sprintService.getCoachSprints(user.id);
      const parentId = sprint.id; // Since we can only create a version from the true source
      const siblingVersions = allCoachSprints.filter(s => s.parentSprintId === parentId || s.id === parentId);
      const maxVersion = siblingVersions.reduce((max, s) => Math.max(max, s.versionNumber || 1), 1);
      nextVersion = maxVersion + 1;
    } catch (e) {
      console.error("Error calculating next version:", e);
    }
    
    setVersionSettings({
      duration: sprint.duration || 7,
      category: sprint.category || '',
      audience: sprint.audience || [],
      difficulty: sprint.difficulty || 'Beginner',
      pricingType: sprint.pricingType || 'cash',
      price: sprint.price || 0,
      pointCost: sprint.pointCost || 0,
      outcomeTag: sprint.outcomeTag || '',
      checkInReminder: sprint.checkInReminder || false,
      checkInReminderDays: sprint.checkInReminderDays || 7,
      sprintType: sprint.sprintType || 'Core',
      description: sprint.description || sprint.transformation || '',
      overrideOrchestrator: sprint.overrideOrchestrator || false,
      versionNumber: nextVersion,
      versionTag: ''
    });
    setShowAddVersionFullBleed(true);
  };

  const handleCreateNewVersion = async () => {
    if (!user || !sprint) return;
    setIsCreatingVersion(true);
    try {
      const newId = `sprint_${Date.now()}`;
      
      const newSprintObj: Sprint = {
        ...sprint,
        id: newId,
        parentSprintId: sprint.id,
        isVersion: true,
        versionNumber: versionSettings.versionNumber,
        versionTag: versionSettings.versionTag || '',
        title: sprint.title,
        subtitle: sprint.subtitle,
        coverImageUrl: sprint.coverImageUrl,
        
        duration: versionSettings.duration,
        category: versionSettings.category,
        difficulty: versionSettings.difficulty,
        audience: versionSettings.audience,
        pricingType: versionSettings.pricingType,
        price: versionSettings.price,
        pointCost: versionSettings.pointCost,
        outcomeTag: versionSettings.outcomeTag,
        checkInReminder: versionSettings.checkInReminder,
        checkInReminderDays: versionSettings.checkInReminderDays,
        sprintType: versionSettings.sprintType as any,
        transformation: versionSettings.description, // also keep transformation in sync if needed
        description: versionSettings.description,
        forWho: [],
        notForWho: [],
        methodSnapshot: [],
        outcomes: [],
        overrideOrchestrator: versionSettings.overrideOrchestrator,
        
        published: false,
        approvalStatus: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      let newDailyContent = [...(sprint.dailyContent || [])];
      if (newDailyContent.length > versionSettings.duration) {
         newDailyContent = newDailyContent.slice(0, versionSettings.duration);
      } else {
         while (newDailyContent.length < versionSettings.duration) {
           newDailyContent.push({
             day: newDailyContent.length + 1,
             lessonText: '',
             taskPrompt: '',
             taskPrompts: ['', '', ''],
           });
         }
      }
      
      newDailyContent = newDailyContent.map((item, idx) => ({
         ...item,
         day: idx + 1
      }));
      
      newSprintObj.dailyContent = newDailyContent;

      await sprintService.createSprint(newSprintObj);
      
      setNewlyCreatedSprintId(newId);
      setShowAddVersionFullBleed(false);
      setShowCreatedPopup(true);
    } catch (err) {
      console.error(err);
      alert("Failed to create new version of the sprint.");
    } finally {
      setIsCreatingVersion(false);
    }
  };

  if (isLoading || !sprint) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Sprint Editor...</p>
        </div>
      </div>
    );
  }

  const baseInputClasses = "w-full rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-medium transition-all placeholder-gray-400 resize-none disabled:bg-gray-50 disabled:text-gray-500 disabled:italic";
  const editorInputClasses = `${baseInputClasses} p-6 bg-white border border-gray-100 text-black`;
  const promptInputClasses = `${baseInputClasses} p-4 bg-white border border-gray-100 text-black`;
  const coachNoteInputClasses = `${baseInputClasses} p-4 py-3 border border-gray-200 bg-white text-black`;
  const footnoteInputClasses = `${baseInputClasses} p-4 py-3 border border-gray-200 bg-white text-black`;
  const hintInputClasses = `${baseInputClasses} p-4 py-3 border border-gray-200 bg-white text-black`;
  const smallEditorInputClasses = "w-full p-3 bg-white border border-gray-100 rounded-xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-xs font-semibold text-black transition-all placeholder-gray-400 resize-none disabled:bg-gray-50 disabled:text-gray-500 disabled:italic";
  const registryInputClasses = "w-full px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold text-black transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:italic";
  const labelClasses = "text-[11px] font-black text-gray-400 uppercase tracking-widest";

  if (sprint.contentType === 'blog') {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50 px-4 py-8 pb-32">
          <div className="w-full">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div className="w-full">
                <div className="flex justify-between items-center mb-4">
                  <button onClick={() => navigate(-1)} className="group flex items-center text-gray-400 hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest cursor-pointer bg-transparent border-0 outline-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                    Go Back
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-[9px] font-black uppercase tracking-widest">
                      RiseBlog
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">{sprint.title || 'Untitled Blog Post'}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {!(isAdmin && !isFoundational) && (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSaveDraft();
                    }} 
                    disabled={saveStatus === 'saving'}
                    title={saveStatus === 'saving' ? 'Saving draft...' : saveStatus === 'saved' ? 'Draft Saved Successfully!' : 'Save Draft'}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all shadow-sm cursor-pointer shrink-0 ${saveStatus === 'saved' ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100' : 'bg-white text-gray-400 border-gray-100 hover:text-primary hover:border-primary/20'}`}
                  >
                    {saveStatus === 'saving' ? (
                      <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : saveStatus === 'saved' ? (
                      <CheckCircle2 size={18} className="text-green-600 animate-bounce" />
                    ) : (
                      <Save size={18} />
                    )}
                  </button>
                )}

                {isAdmin && !isFoundational ? (
                  <>
                    <button onClick={handleAdminApprove} disabled={approvalStatus === 'processing'} className="bg-green-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl px-6 py-3 shadow-lg hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50 cursor-pointer">Approve & Push Updates</button>
                    <button onClick={handleAdminAmend} disabled={approvalStatus === 'processing'} className="bg-orange-50 text-white font-black uppercase tracking-widest text-[10px] rounded-xl px-6 py-3 shadow-lg hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 cursor-pointer">Request Fixes</button>
                  </>
                ) : (
                  <>
                    {!isAdmin && (
                      <Button 
                        onClick={handleSubmitForReview} 
                        isLoading={isSubmittingReview}
                        disabled={isSubmittingReview} 
                        className="font-black uppercase tracking-widest text-[10px] rounded-xl px-6 py-3.5 animate-fade-in"
                        title="Submit the blog post to the Admin workspace for review and approval."
                      >
                        {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </header>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              {/* Left Column: Blog Editor */}
              <div className="space-y-8">
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
                  <h3 className="text-sm font-black text-primary uppercase tracking-[0.25em]">RiseBlog Editor</h3>
                  
                  <div>
                    <label className={labelClasses}>Blog Post Title</label>
                    <input 
                      type="text" 
                      value={sprint.title || ''} 
                      onChange={e => {
                        const updated = { ...sprint, title: e.target.value, blogTitle: e.target.value };
                        setSprint(updated);
                      }} 
                      className="w-full px-5 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold mt-2 text-gray-950 transition-all" 
                      required 
                    />
                  </div>

                  <div>
                    <label className={labelClasses}>Cover Image URL</label>
                    <input 
                      type="url" 
                      value={sprint.coverImageUrl || sprint.blogImage || ''} 
                      onChange={e => {
                        const updated = { ...sprint, coverImageUrl: e.target.value, blogImage: e.target.value };
                        setSprint(updated);
                      }} 
                      className="w-full px-5 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold mt-2 text-gray-950 transition-all" 
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-end">
                      <label className={labelClasses}>Blog Post Body</label>
                      <FormattingToolbar 
                        onFormat={(prefix, suffix) => {
                          const textarea = lessonTextRef.current;
                          if (!textarea) return;
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const text = textarea.value;
                          const before = text.substring(0, start);
                          const selection = text.substring(start, end);
                          const after = text.substring(end);
                          const newValue = before + prefix + selection + suffix + after;
                          const updated = { ...sprint, blogBody: newValue, description: newValue };
                          setSprint(updated);
                          setTimeout(() => textarea.focus(), 50);
                        }}
                      />
                    </div>
                    <textarea 
                      ref={lessonTextRef}
                      value={sprint.blogBody || sprint.description || ''} 
                      onChange={e => {
                        const updated = { ...sprint, blogBody: e.target.value, description: e.target.value };
                        setSprint(updated);
                      }} 
                      rows={16} 
                      className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-medium font-sans text-gray-950 resize-none mt-2 leading-relaxed h-96 animate-fade-in" 
                      placeholder="Write your inspiring article post content here..."
                      required 
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Live Blog Preview */}
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm h-full flex flex-col min-h-[600px]">
                  <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-450 uppercase tracking-widest">Live Interactive Preview</span>
                    <span className="text-[8px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded uppercase tracking-wider">Device Sync Active</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto flex flex-col text-gray-900 bg-white">
                    {/* Cover Image Banner (Full Bleed) */}
                    <div className="relative w-full h-56 bg-gray-100 flex-shrink-0">
                      <img 
                        src={sprint.coverImageUrl || sprint.blogImage || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80'} 
                        className="w-full h-full object-cover" 
                        alt="Cover Image" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/50 to-black/20" />
                      
                      {/* Overlaid Title and Info */}
                      <div className="absolute bottom-0 inset-x-0 p-6 text-white flex flex-col justify-end h-full w-full">
                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-[0.25em] mb-1.5">RiseBlog</span>
                        <h4 className="text-xl font-black leading-tight tracking-tight italic drop-shadow-sm mb-3">
                          {sprint.title || 'Untitled Rising Post'}
                        </h4>
                        
                        <div className="flex items-center gap-2 pt-1 text-[8px] font-black text-white/80 uppercase tracking-widest border-t border-white/20">
                          <span className="px-1.5 py-0.5 bg-white/15 rounded text-white">Author</span>
                          <span className="text-white font-black">{user?.name || 'Coach'}</span>
                          <div className="w-1 h-1 bg-white/30 rounded-full"></div>
                          <span className="text-white/70">
                            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Article content below */}
                    <div className="p-6 md:p-8 space-y-4">
                      <div className="leading-relaxed text-gray-800 text-sm font-sans">
                        <FormattedText text={sprint.blogBody || sprint.description || 'Write something inspiring to rise...'} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (sprint.contentType === 'ignite') {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50 px-4 py-8 pb-32">
          <div className="w-full">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div className="w-full">
                <div className="flex justify-between items-center mb-4">
                  <button onClick={() => navigate(-1)} className="group flex items-center text-gray-400 hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest cursor-pointer bg-transparent border-0 outline-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                    Go Back
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-[9px] font-black uppercase tracking-widest">
                      Ignite
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">{sprint.title || 'Untitled Ignite'}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {!(isAdmin && !isFoundational) && (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSaveDraft();
                    }} 
                    disabled={saveStatus === 'saving'}
                    title={saveStatus === 'saving' ? 'Saving draft...' : saveStatus === 'saved' ? 'Draft Saved Successfully!' : 'Save Draft'}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all shadow-sm cursor-pointer shrink-0 ${saveStatus === 'saved' ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100' : 'bg-white text-gray-400 border-gray-100 hover:text-primary hover:border-primary/20'}`}
                  >
                    {saveStatus === 'saving' ? (
                      <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : saveStatus === 'saved' ? (
                      <CheckCircle2 size={18} className="text-green-600 animate-bounce" />
                    ) : (
                      <Save size={18} />
                    )}
                  </button>
                )}

                {isAdmin && !isFoundational ? (
                  <>
                    <button onClick={handleAdminApprove} disabled={approvalStatus === 'processing'} className="bg-green-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl px-6 py-3 shadow-lg hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50 cursor-pointer">Approve & Push Updates</button>
                    <button onClick={handleAdminAmend} disabled={approvalStatus === 'processing'} className="bg-orange-50 text-white font-black uppercase tracking-widest text-[10px] rounded-xl px-6 py-3 shadow-lg hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 cursor-pointer">Request Fixes</button>
                  </>
                ) : (
                  <>
                    {!isAdmin && (
                      <Button 
                        onClick={handleSubmitForReview} 
                        isLoading={isSubmittingReview}
                        disabled={isSubmittingReview} 
                        className="font-black uppercase tracking-widest text-[10px] rounded-xl px-6 py-3.5 animate-fade-in"
                        title="Submit the ignite to the Admin workspace for review and approval."
                      >
                        {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </header>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              {/* Left Column: Ignite Editor */}
              <div className="space-y-8">
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
                  <h3 className="text-sm font-black text-primary uppercase tracking-[0.25em]">Ignite Studio</h3>

                  <div>
                    <label className={labelClasses}>Inspire someone today (Double break splits slides)</label>
                    <textarea 
                      value={sprint.igniteBody || sprint.description || ''} 
                      onChange={e => {
                        const body = e.target.value;
                        const cleanSnippet = body.substring(0, 30) + (body.length > 30 ? '...' : '');
                        const updated = { 
                          ...sprint, 
                          igniteBody: body, 
                          description: body,
                          title: cleanSnippet
                        };
                        setSprint(updated);
                      }} 
                      rows={10} 
                      className="w-full px-5 py-4 border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none mt-2 font-medium resize-none text-center text-base leading-relaxed h-[220px] italic pt-12 animate-fade-in" 
                      placeholder="Type your inspiring thought here... Double enter to split into multiple slide pages"
                      required 
                    />
                  </div>

                  <div>
                    <label className={labelClasses}>Set Color Theme</label>
                    <div className="flex flex-wrap gap-3 mt-3">
                      {IGNITE_COLORS.map(color => (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => {
                            const updated = { ...sprint, igniteBgColor: color.hex };
                            setSprint(updated);
                          }}
                          className={`w-10 h-10 rounded-full border-2 transition-all relative flex items-center justify-center hover:scale-105 active:scale-95 cursor-pointer`}
                          style={{ 
                            backgroundColor: color.hex,
                            borderColor: sprint.igniteBgColor === color.hex ? '#3B82F6' : 'transparent' 
                          }}
                          title={color.name}
                        >
                          {sprint.igniteBgColor === color.hex && (
                            <span className="text-white text-xs font-black">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClasses}>Live Date (Optional)</label>
                    <input 
                      type="date" 
                      value={sprint.igniteDate || ''} 
                      onChange={e => {
                        const updated = { ...sprint, igniteDate: e.target.value };
                        setSprint(updated);
                      }} 
                      className="w-full px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold transition-all mt-2" 
                    />
                    <p className="text-[9px] text-gray-450 font-bold mt-1.5 uppercase tracking-wider leading-relaxed">Schedule this Ignite to go live on a specific day. If left blank, it comes live immediately.</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Ignite Preview Player */}
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm flex flex-col min-h-[500px]">
                  <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-450 uppercase tracking-widest">Live Interactive Preview</span>
                    <span className="text-[8px] font-black text-purple-500 bg-purple-50 px-2 py-1 rounded uppercase tracking-wider">Ignite Player Active</span>
                  </div>

                  <div className="flex-1 flex flex-col justify-between p-6 select-none text-white relative min-h-[400px]" style={{ backgroundColor: sprint.igniteBgColor || '#6D28D9' }}>
                    {(() => {
                      const slidesText = sprint.igniteBody || sprint.description || '';
                      const slides = slidesText.split(/\r?\n\s*\r?\n/).map(s => s.trim()).filter(Boolean);
                      const activeSlides = slides.length > 0 ? slides : ["Type some inspiration to preview!"];
                      
                      return <IgniteLivePreview activeSlides={activeSlides} bgColor={sprint.igniteBgColor || '#6D28D9'} />;
                    })()}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (isLoading || !sprint) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Sprint Editor...</p>
        </div>
      </div>
    );
  }

  const isDayComplete = (day: number) => {
    if (!sprint) return false;
    const content = Array.isArray(sprint.dailyContent) ? sprint.dailyContent.find(c => c.day === day) : undefined;
    return !!(content && content.lessonText?.trim() && content.taskPrompt?.trim());
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 px-4 py-8 pb-32">

      
      <div className="w-full">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="w-full">
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => navigate(-1)} className="group flex items-center text-gray-400 hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                Go Back
              </button>
              
              {!sprint.parentSprintId ? (
                <div className="flex items-center gap-2">
                  {sprint.versionTag && (
                    <span className="px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-[9px] font-black uppercase tracking-widest">
                      {sprint.versionTag}
                    </span>
                  )}
                  <button 
                    onClick={handleInitiateAddVersion}
                    className="group flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-[8px] font-black uppercase tracking-widest cursor-pointer transition-all"
                  >
                    <Plus className="h-3 w-3" />
                    Create New Version
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest shrink-0">
                    Version {sprint.versionNumber || 2}
                  </span>
                  {sprint.versionTag && (
                    <span className="px-3.5 py-1.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-[9px] font-black uppercase tracking-widest shrink-0">
                      {sprint.versionTag}
                    </span>
                  )}
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest hidden sm:inline-block">
                    (Locked Version)
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">{sprint.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {!(isAdmin && !isFoundational) && (
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveDraft();
                }} 
                disabled={saveStatus === 'saving'}
                title={saveStatus === 'saving' ? 'Saving draft...' : saveStatus === 'saved' ? 'Draft Saved Successfully!' : 'Save Draft'}
                className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all shadow-sm cursor-pointer shrink-0 ${saveStatus === 'saved' ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100' : 'bg-white text-gray-400 border-gray-100 hover:text-primary hover:border-primary/20'}`}
              >
                {saveStatus === 'saving' ? (
                  <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : saveStatus === 'saved' ? (
                  <CheckCircle2 size={18} className="text-green-600 animate-bounce" />
                ) : (
                  <Save size={18} />
                )}
              </button>
            )}
            <button 
              onClick={() => navigate(`/coach/sprint/preview/${sprintId}`)} 
              title="Sprint Stimulation"
              className="w-10 h-10 flex items-center justify-center bg-white text-gray-400 rounded-xl border border-gray-100 hover:text-primary transition-all shadow-sm cursor-pointer shrink-0"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
            <button 
              onClick={() => setShowSettings(true)} 
              title={(isAdmin && !isFoundational) ? 'Audit Registry' : 'Registry Settings'}
              className="w-10 h-10 flex items-center justify-center bg-white text-primary rounded-xl border border-primary/10 hover:bg-primary hover:text-white transition-all shadow-sm cursor-pointer shrink-0"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>

            {isAdmin && !isFoundational ? (
                <>
                    <button onClick={handleAdminApprove} disabled={approvalStatus === 'processing'} className="bg-green-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl px-6 py-3 shadow-lg hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50">Approve & Push Updates</button>
                    <button onClick={handleAdminAmend} disabled={approvalStatus === 'processing'} className="bg-orange-50 text-white font-black uppercase tracking-widest text-[10px] rounded-xl px-6 py-3 shadow-lg hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50">Request Fixes</button>
                </>
            ) : (
                <>
                    {!isAdmin && (
                        <Button 
                            onClick={handleSubmitForReview} 
                            isLoading={isSubmittingReview}
                            disabled={isSubmittingReview || curriculumIncomplete} 
                            className="font-black uppercase tracking-widest text-[10px] rounded-xl px-6 py-3.5 animate-fade-in"
                            title={curriculumIncomplete 
                              ? `Cannot submit yet. Every day in the curriculum must have a completed lesson text and action step (all green dots must be showing). (Registry is currently ${registryIncomplete ? 'Incomplete' : 'Complete'})`
                              : `Submit Review: Submit the fully completed curriculum to the Admin workspace for review and approval. (Registry: ${registryIncomplete ? 'Incomplete' : 'Complete'})`
                            }
                        >
                        {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                        </Button>
                    )}
                </>
            )}
          </div>
        </header>

        <div className="flex flex-col gap-8">
          {/* Version Selector Bar */}
          {allVersions.length > 1 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm animate-fade-in">
              <div className="flex flex-col gap-1 text-left px-1">
                <span className="text-[8px] font-black uppercase text-primary tracking-[0.3em]">Sprint Versioning Control</span>
                <h3 className="text-xs font-black text-gray-950 uppercase tracking-wide">
                  Active Environment: {sprint.id === (sprint.parentSprintId || sprint.id) ? 'Original Version' : `Version ${sprint.versionNumber || 2}`}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 p-1.5 rounded-2xl border border-gray-100/50">
                {allVersions.map((v) => {
                  const isOriginal = !v.parentSprintId;
                  const label = isOriginal ? 'Original Version' : `Version ${v.versionNumber || 2}`;
                  const isActive = v.id === sprint.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        if (isActive) return;
                        navigate(`/coach/sprint/edit/${v.id}`);
                        window.location.reload();
                      }}
                      className={`px-4 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                        isActive
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-gray-400 hover:text-gray-700 bg-transparent'
                      }`}
                    >
                      {label}
                      {v.versionTag && <span className="ml-1.5 opacity-60 text-[7px]">({v.versionTag})</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden p-6">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 px-1">Curriculum Timeline</h2>
            <div className="flex overflow-x-auto gap-3 hide-scrollbar">
              {Array.from({ length: sprint.duration }, (_, i) => i + 1).map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  title={`Day ${day}: Switch active editor workspace to curate lessons and action steps for Day ${day}.`}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl border transition-all duration-300 relative ${selectedDay === day ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-105' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-primary/30 hover:text-primary hover:bg-white'}`}
                >
                  {isDayComplete(day) && <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${selectedDay === day ? 'bg-white' : 'bg-primary'}`}></div>}
                  <span className="text-[10px] font-black uppercase tracking-tight">Day</span>
                  <span className="font-black text-2xl leading-none">{day}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Day PDF download Workspace control bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white rounded-[2rem] border border-gray-100 shadow-sm animate-fade-in">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                      <BookOpen size={20} />
                  </div>
                  <div>
                      <h3 className="text-sm font-black text-gray-950 uppercase tracking-wider">
                          Active Workspace: Day {selectedDay} / {sprint.duration}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          Curate your daily learning materials and interactive tasks.
                      </p>
                  </div>
              </div>
              <button
                  type="button"
                  onClick={() => generateDayPDF(sprint, currentContent)}
                  className="flex items-center gap-2 px-5 py-3 bg-primary text-white hover:bg-primary/95 font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg hover:shadow-primary/20 transition-all cursor-pointer"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Day {selectedDay}/{sprint.duration} PDF
              </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in" key={selectedDay}>
            {/* EDITOR COLUMN */}
            <div className="space-y-8">
                {/* Today's Insight Section */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end gap-4">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <label className={labelClasses}>Today's Insight</label>
                                <button
                                    type="button"
                                    onClick={() => setShowInsightHelpSheet(true)}
                                    className="text-gray-400 hover:text-[#0E7850] transition-colors p-0.5 rounded flex items-center justify-center cursor-pointer"
                                    title="How to use Today's Insight"
                                >
                                    <HelpCircle size={14} />
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm("Are you sure you want to delete Today's Insight content?")) {
                                            handleContentChange('lessonText', '');
                                        }
                                    }}
                                    className="p-1 px-2 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-lg border border-red-100 transition-all flex items-center gap-1 cursor-pointer text-[9px] font-black uppercase tracking-widest"
                                    title="Delete Today's Insight Lesson"
                                >
                                    <Trash2 size={11} />
                                    <span>Delete</span>
                                </button>
                            </div>
                        </div>
                        {canEditDirectly && (
                            <FormattingToolbar 
                                onFormat={(prefix, suffix) => {
                                    const textarea = lessonTextRef.current;
                                    if (!textarea) return;
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const selection = text.substring(start, end);
                                    const after = text.substring(end);
                                    const newValue = before + prefix + selection + suffix + after;
                                    handleContentChange('lessonText', newValue);
                                    setTimeout(() => {
                                        textarea.focus();
                                        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
                                    }, 0);
                                }}
                            />
                        )}
                    </div>
                    {isAdmin && !isFoundational && originalSprint && (
                        <DiffHighlight 
                            label="Today's Insight" 
                            original={Array.isArray(originalSprint.dailyContent) ? originalSprint.dailyContent.find(c => c.day === selectedDay)?.lessonText : undefined} 
                            updated={currentContent.lessonText} 
                        />
                    )}
                    <textarea 
                        ref={lessonTextRef}
                        value={currentContent.lessonText || ''} 
                        onChange={e => handleContentChange('lessonText', e.target.value)} 
                        rows={8} 
                        className={editorInputClasses} 
                        placeholder="Coach curriculum goes here..." 
                    />
                </div>

                {/* Today's Action Steps Section */}
                <div className="space-y-4">
                    {setupView === 'mirror' ? (
                        <div className="space-y-6 bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm animate-fade-in">
                            {/* Mirror Report Header with Left Arrow and On/Off Toggle */}
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSetupView('action')}
                                        className="p-2 bg-gray-50 text-gray-500 hover:bg-primary/10 hover:text-primary rounded-xl border border-gray-100 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                                        title="Back to Today's Action"
                                    >
                                        <ArrowLeft size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowMirrorPreview(true)}
                                        className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100/85 hover:text-amber-700 rounded-xl border border-amber-200 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                                        title="Preview Participant Mirror Report Pop-up"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                            <BookOpen className="text-primary" size={16} />
                                            Rise Report Setup
                                        </h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Configure Reflection Cards</p>
                                    </div>
                                </div>
                                
                                {/* On/Off Switch */}
                                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${currentContent.mirrorActive ? 'text-emerald-500' : 'text-gray-400'}`}>
                                        {currentContent.mirrorActive ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleContentChange('mirrorActive', !currentContent.mirrorActive)}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            currentContent.mirrorActive ? 'bg-emerald-500' : 'bg-gray-200'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                                currentContent.mirrorActive ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Blur container block when Not Active */}
                            <div className={`space-y-6 transition-all duration-300 ${!currentContent.mirrorActive ? 'blur-[1.5px] opacity-50 pointer-events-none select-none' : ''}`}>
                                {/* Intro note config */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                                        Introduction Note
                                    </label>
                                    <textarea
                                        value={currentContent.mirrorIntro || ''}
                                        onChange={e => handleContentChange('mirrorIntro', e.target.value)}
                                        rows={3}
                                        className={editorInputClasses}
                                        placeholder="Enter intro text... e.g., 'Here is a mirror reflection of your insights today:'"
                                    />
                                </div>

                                {/* List questions for Framing and Paraphrase inputs */}
                                <div className="space-y-4">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 block mb-1">
                                        Frame Actions & Paraphrases
                                    </span>
                                    
                                    {(currentContent.taskPrompts || ['', '', '']).map((prompt, index) => {
                                        if (!prompt || !prompt.trim()) return null;
                                        const isStepDisabled = !!currentContent.mirrorDisabledSteps?.[index];
                                        return (
                                            <div key={index} className={`bg-gray-50/50 rounded-[2rem] p-5 border border-gray-100 space-y-4 transition-all duration-350 ${isStepDisabled ? 'opacity-70 bg-gray-100/50' : ''}`}>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-500/10">
                                                        Step {index + 1} Question
                                                    </span>

                                                    {/* Individual step Mirror ON/OFF Switch */}
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${!isStepDisabled ? 'text-emerald-500' : 'text-gray-400'}`}>
                                                            {!isStepDisabled ? 'Mirror ON' : 'Mirror OFF'}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updatedDisabled = [...(currentContent.mirrorDisabledSteps || [])];
                                                                while (updatedDisabled.length <= index) updatedDisabled.push(false);
                                                                updatedDisabled[index] = !updatedDisabled[index];
                                                                handleContentChange('mirrorDisabledSteps', updatedDisabled);
                                                            }}
                                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                                !isStepDisabled ? 'bg-emerald-500' : 'bg-gray-200'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                                                    !isStepDisabled ? 'translate-x-4' : 'translate-x-0'
                                                                }`}
                                                            />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="text-gray-700 bg-white border border-gray-100 p-4 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm">
                                                    {prompt}
                                                </div>

                                                {/* Framing Input */}
                                                <div className={`space-y-1.5 transition-all duration-300 ${isStepDisabled ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                                                        <span>Framing Statement</span>
                                                        <span className="text-gray-300 font-medium normal-case">(coins how the report is framed)</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={currentContent.mirrorFraming?.[index] || ''}
                                                        onChange={e => {
                                                            const updatedFraming = [...(currentContent.mirrorFraming || [])];
                                                            while (updatedFraming.length <= index) updatedFraming.push('');
                                                            updatedFraming[index] = e.target.value;
                                                            handleContentChange('mirrorFraming', updatedFraming);
                                                        }}
                                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                                        placeholder="e.g., You noted that..."
                                                        disabled={isStepDisabled}
                                                    />
                                                </div>
                                                {isStepDisabled && (
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider pl-1.5 italic">
                                                        * This question will not be included in the participant's Rise Report.
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Arrow back to action */}
                            <div className="pt-4 border-t border-gray-100 flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setSetupView('action')}
                                    className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-primary transition-colors duration-200 cursor-pointer pl-1"
                                >
                                    <ArrowLeft size={14} />
                                    <span>Back to Today's Action Steps</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center sm:items-end gap-4">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <label className={labelClasses}>Today's Action Steps</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowActionHelpSheet(true)}
                                            className="text-gray-400 hover:text-[#0E7850] transition-colors p-0.5 rounded flex items-center justify-center cursor-pointer"
                                            title="How to use Today's Action Steps"
                                        >
                                            <HelpCircle size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowClearActionConfirm(true)}
                                            className="p-1.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-105 border border-red-150 shadow-xs hover:text-red-650 transition-all cursor-pointer flex items-center justify-center shrink-0"
                                            title="Clear Today's Action Steps content"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowAdvancedActionModal(true)}
                                            className="h-8 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-650 hover:text-purple-750 border border-purple-150 px-2.5 transition-all flex items-center gap-1 shadow-xs shrink-0 cursor-pointer text-[10px] font-black uppercase tracking-wider"
                                            title="Smart setup: Paste bulk text and select strings to assign"
                                        >
                                            <Sparkles size={11} className="text-purple-500" />
                                            <span>Smart setup</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSetupView('mirror')}
                                            className="h-8 rounded-xl bg-gray-50 text-gray-500 hover:bg-primary/10 hover:text-primary border border-gray-150 px-2.5 transition-all flex items-center gap-1 shadow-xs shrink-0 cursor-pointer text-[10px] font-black uppercase tracking-wider"
                                            title="Configure Rise Report: Set up statements and phrasing that frame daily outputs inside the participant's Rise Report."
                                        >
                                            <BookOpen size={11} className="text-primary/70" />
                                            <span>Rise Report</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end mb-1">
                                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Min. 3 Steps</span>
                                </div>
                            </div>
                            
                            {isAdmin && !isFoundational && originalSprint && (
                        <DiffHighlight 
                            label="Today's Action Steps" 
                            original={Array.isArray(originalSprint.dailyContent) ? (originalSprint.dailyContent.find(c => c.day === selectedDay)?.taskPrompts || [originalSprint.dailyContent.find(c => c.day === selectedDay)?.taskPrompt]) : undefined} 
                            updated={currentContent.taskPrompts} 
                        />
                    )}
                    
                    <div className="space-y-4 relative">
                        {(currentContent.taskPrompts || ['', '', '']).map((prompt, index) => {
                            const isLinkedFromPrevious = 
                                (index > 0 && currentContent.taskLinkedToNext?.[index - 1]) ||
                                (Array.isArray(currentContent.taskLinkedSources?.[index]) && currentContent.taskLinkedSources[index].length > 0);
                            return (
                                <div key={index} className="group relative">
                                    <div className="absolute -left-10 top-6 w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-black text-gray-300 group-focus-within:bg-primary/10 group-focus-within:text-primary transition-all z-10">
                                        {index + 1}
                                    </div>
                                    <div className="flex gap-2 items-start relative z-20">
                                        <div className="flex-1 space-y-2">
                                            {/* Prominent numbering inline badge */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-black bg-primary/10 text-primary px-3 py-1.5 rounded-lg flex items-center gap-1">
                                                    Action Step {index + 1}
                                                </span>

                                                {/* + coach note button right in front of the tag */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const currentNote = currentContent.taskNotes?.[index];
                                                        if (typeof currentNote !== 'string') {
                                                            handleTaskNoteChange(index, '');
                                                        } else {
                                                            const newNotes = [...(currentContent.taskNotes || [])];
                                                            newNotes[index] = null as any;
                                                            handleContentChange('taskNotes', newNotes);
                                                        }
                                                    }}
                                                    className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                                        typeof currentContent.taskNotes?.[index] === 'string'
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50'
                                                            : 'bg-white text-gray-500 hover:text-primary hover:bg-primary/5 hover:border-primary/20 border-gray-200'
                                                    }`}
                                                    title="Coach Note: Add guidance, background information, or resources that will appear immediately above this prompt for the participant."
                                                >
                                                    <Plus size={11} strokeWidth={2.5} className="shrink-0" />
                                                    <span>Coach Note</span>
                                                </button>

                                                {isLinkedFromPrevious && (
                                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1.5">
                                                        <svg className="w-3.5 h-3.5 text-primary shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                        </svg>
                                                        <span>Linked Follow-Up</span>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Note inputs BEFORE the question prompt */}
                                            <div className="space-y-4 mb-3">
                                                {(typeof currentContent.taskNotes?.[index] === 'string') && (
                                                    <div className="animate-fade-in border border-emerald-100/70 rounded-2xl p-4 bg-emerald-50/5">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">Coach Note</label>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => {
                                                                    const newNotes = [...(currentContent.taskNotes || [])];
                                                                    newNotes[index] = null as any;
                                                                    handleContentChange('taskNotes', newNotes);
                                                                }}
                                                                className="text-gray-300 hover:text-red-500 transition-colors"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                        <textarea 
                                                            value={currentContent.taskNotes[index] || ''} 
                                                            onChange={e => handleTaskNoteChange(index, e.target.value)} 
                                                            rows={2} 
                                                            className={coachNoteInputClasses} 
                                                            placeholder="Add a context note. This note will appear just before the question in the participant view." 
                                                         />

                                                     </div>

                                                 )}
                                                                                              {isLinkedFromPrevious && (
                                                    <div className="pl-3 border-l-2 border-emerald-500/20 space-y-3 text-left animate-fade-in w-full">
                                                        <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-gray-700 uppercase tracking-wide">
                                                                    Tag Note
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const currentActive = !!currentContent.taskTagNoteActive?.[index];
                                                                    handleToggleTaskTagNoteActive(index, !currentActive);
                                                                }}
                                                                className={`px-3 py-1 text-xs font-black uppercase rounded-lg border transition-all cursor-pointer ${
                                                                    currentContent.taskTagNoteActive?.[index]
                                                                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                                                                        : 'bg-white text-gray-400 hover:text-gray-600 border-gray-200'
                                                                }`}
                                                                title="Tag Note: Toggle custom feedback or insights that show up for the participant specifically when these active choices/tags are selected."
                                                            >
                                                                {currentContent.taskTagNoteActive?.[index] ? 'ON' : 'OFF'}
                                                            </button>
                                                        </div>

                                                        {currentContent.taskTagNoteActive?.[index] && (
                                                            <div className="space-y-2 animate-fade-in">
                                                                <div className="flex items-center justify-between">
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                                                                        Tag Note Content
                                                                    </label>
                                                                    {getSingleTagNoteValue(currentContent.taskTagNotes?.[index]).trim() && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleTaskSingleTagNoteChange(index, '')}
                                                                            className="p-1 rounded bg-red-50 hover:bg-red-100 text-red-500 transition-colors flex items-center gap-1 cursor-pointer font-bold text-[9px] uppercase tracking-wider pr-2 pl-1.5"
                                                                            title="Delete Tag Note Content"
                                                                        >
                                                                            <Trash2 size={10} />
                                                                            <span>Delete</span>
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                <div className="p-3 bg-white rounded-xl border border-gray-150 shadow-sm space-y-3">
                                                                    <textarea
                                                                        value={getSingleTagNoteValue(currentContent.taskTagNotes?.[index])}
                                                                        onChange={(e) => handleTaskSingleTagNoteChange(index, e.target.value)}
                                                                        rows={3}
                                                                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all resize-none animate-fade-in text-gray-750"
                                                                        placeholder="Write a note to show when these active tags are selected..."
                                                                    />

                                                                    {(() => {
                                                                        const availableTags = getAvailableConnectedTags(index);
                                                                        if (availableTags.length === 0) {
                                                                            return (
                                                                                <div className="text-[10px] text-gray-400 font-bold italic uppercase tracking-wider pt-1 animate-fade-in">
                                                                                    ⚠️ No connected tags received from preceding steps yet.
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return (
                                                                            <div className="pt-2 border-t border-gray-100 animate-fade-in">
                                                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                                                                    CONNECTED DYNAMIC TAGS:
                                                                                </p>
                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                    {availableTags.map((tag, tagIndex) => (
                                                                                        <span key={tagIndex} className="inline-flex items-center gap-1 text-[9px] bg-indigo-50 text-indigo-800 border border-indigo-100 px-2.5 py-1 rounded-full font-black uppercase tracking-wider shadow-sm">
                                                                                            🏷️ {tag}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <textarea 
                                                value={prompt} 
                                                onChange={e => handleTaskPromptChange(index, e.target.value)} 
                                                rows={2} 
                                                className={promptInputClasses} 
                                                placeholder={`Action Step ${index + 1}...`} 
                                            />
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2.5 pt-2 border-t border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">Input Type:</label>
                                                    <div className="flex items-center gap-1">
                                                        <div className="flex p-0.5 bg-gray-100 rounded-lg">
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleTaskPromptTypeChange(index, 'text')}
                                                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${(!currentContent.taskInputTypes?.[index] || currentContent.taskInputTypes[index] === 'text') ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                                title="Text Input: Instructs the participant to enter a freeform text response or reflection."
                                                            >
                                                                Text
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                disabled={isLinkedFromPrevious && !currentContent.taskTagNoteActive?.[index]}
                                                                onClick={() => handleTaskPromptTypeChange(index, 'tags')}
                                                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${isLinkedFromPrevious && !currentContent.taskTagNoteActive?.[index] ? 'opacity-40 cursor-not-allowed text-gray-350' : currentContent.taskInputTypes?.[index] === 'tags' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                                title={isLinkedFromPrevious && !currentContent.taskTagNoteActive?.[index] ? "Locked: This step is a linked follow-up and cannot be Tag-labeled unless Tag Note mode is turned ON." : "Tags Input: Participants select multi-choice labels/tags to categorize their state or choices."}
                                                            >
                                                                Tags
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleTaskPromptTypeChange(index, 'poll')}
                                                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${currentContent.taskInputTypes?.[index] === 'poll' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                                title="Poll Input: A multiple-choice poll. Standard polls use static choices; linked follow-ups use dynamic tags chosen earlier."
                                                            >
                                                                Poll
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleTaskPromptTypeChange(index, 'mark')}
                                                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${currentContent.taskInputTypes?.[index] === 'mark' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                                title="Mark Complete Input: A simple checklist item that participants can mark as finished once they execute the action step."
                                                            >
                                                                Mark
                                                            </button>
                                                        </div>
                                                        {(() => {
                                                            const precedingTagSteps = (currentContent.taskInputTypes || [])
                                                                .map((type, idx) => ({ type, idx }))
                                                                .filter(item => item.idx < index && (item.type === 'tags' || item.type === 'poll' || item.type === 'text' || !item.type));
                                                            
                                                            const precedingDaysSteps = getPrecedingDaysTagSteps();
                                                            const showSingleLink = currentContent.taskInputTypes?.[index] === 'tags';
                                                            
                                                            const precedingTagOnlySteps = precedingTagSteps.filter(item => item.type === 'tags' || item.type === 'poll');
                                                            const precedingTextOnlySteps = precedingTagSteps.filter(item => item.type === 'text' || !item.type);

                                                            const precedingDaysTagOnlySteps = precedingDaysSteps.filter(item => item.type === 'tags' || item.type === 'poll');
                                                            const precedingDaysTextOnlySteps = precedingDaysSteps.filter(item => item.type === 'text' || !item.type);

                                                            const hasPrecedingForTagLink = precedingTagSteps.length > 0 || precedingDaysSteps.length > 0;
                                                            const hasPrecedingTexts = precedingTextOnlySteps.length > 0 || precedingDaysTextOnlySteps.length > 0;

                                                            const showTagLink = hasPrecedingForTagLink && (currentContent.taskInputTypes?.[index] === 'tags' || currentContent.taskInputTypes?.[index] === 'poll');
                                                            const showTextLink = hasPrecedingTexts && (currentContent.taskInputTypes?.[index] === 'text' || !currentContent.taskInputTypes?.[index]);
                                                            
                                                            const hasSelectedSources = (currentContent.taskLinkedSources?.[index]?.length || 0) > 0;

                                                            return (
                                                                <div className="flex items-center gap-1.5 ml-2">
                                                                    {showSingleLink && (
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => handleToggleLinkToNext(index)}
                                                                            title={currentContent.taskLinkedToNext?.[index] ? "Link Active: This step is linked to dynamically populate choices or follow-ups for the exact next step. Click to disconnect." : "Link Step: Link this step to feed its selected tags/options as active choices or follow-ups for the exact next question."}
                                                                            className={`p-1.5 rounded-md transition-all flex items-center justify-center ${currentContent.taskLinkedToNext?.[index] ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                                        </button>
                                                                    )}
                                                                    {showTagLink && (
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (activeLinkSelectorIndex === index && activeLinkSelectorType === 'tag') {
                                                                                    setActiveLinkSelectorIndex(null);
                                                                                } else {
                                                                                    setActiveLinkSelectorIndex(index);
                                                                                    setActiveLinkSelectorType('tag');
                                                                                }
                                                                            }}
                                                                            title={hasSelectedSources ? `Connected to ${currentContent.taskLinkedSources?.[index]?.length} preceding step(s). Click to configure or link more dynamic tag/poll source questions.` : "Link Tag Sources: Pull selected labels/options from previous tag/poll steps to populate this question dynamically."}
                                                                            className={`p-1.5 rounded-md transition-all flex items-center justify-center ${activeLinkSelectorIndex === index && activeLinkSelectorType === 'tag' ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20' : hasSelectedSources ? 'bg-primary/20 text-primary border border-primary/30 font-bold' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20h.01M21 12.1a1 1 0 01-.29.7l-7 7a1 1 0 01-1.4 0l-7-7A1 1 0 015 12.1V5a2 2 0 012-2h7.1a1 1 0 01.7.3l7 7a1 1 0 01.29.7z" />
                                                                            </svg>
                                                                            {hasSelectedSources && (
                                                                                <span className="ml-1 text-[10px] font-black bg-primary text-white rounded-full px-1 min-w-[14px]">
                                                                                    {currentContent.taskLinkedSources?.[index]?.length}
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                    {showTextLink && (
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (activeLinkSelectorIndex === index && activeLinkSelectorType === 'text') {
                                                                                    setActiveLinkSelectorIndex(null);
                                                                                } else {
                                                                                    setActiveLinkSelectorIndex(index);
                                                                                    setActiveLinkSelectorType('text');
                                                                                }
                                                                            }}
                                                                            title={hasSelectedSources ? `Connected to ${currentContent.taskLinkedSources?.[index]?.length} preceding step(s). Click to configure or link more text source questions.` : "Text to Text Link: Pull responses from previous text steps to auto-spread/fill this question."}
                                                                            className={`p-1.5 rounded-md transition-all flex items-center justify-center ${activeLinkSelectorIndex === index && activeLinkSelectorType === 'text' ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20' : hasSelectedSources ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold' : 'bg-emerald-50/50 text-emerald-500 border border-emerald-100 hover:bg-emerald-100/80 hover:text-emerald-600'}`}
                                                                        >
                                                                            <TypeIcon className="w-4 h-4" />
                                                                            {hasSelectedSources && (
                                                                                <span className="ml-1 text-[10px] font-black bg-emerald-600 text-white rounded-full px-1 min-w-[14px]">
                                                                                    {currentContent.taskLinkedSources?.[index]?.length}
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {(!currentContent.taskInputTypes?.[index] || currentContent.taskInputTypes[index] === 'text') && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const currentLabels = currentContent.taskMultiTextLabels?.[index];
                                                                if (!currentLabels || currentLabels.length === 0) {
                                                                    handleTaskMultiTextLabelsChange(index, ['Label 1']);
                                                                } else {
                                                                    handleTaskMultiTextLabelsChange(index, null as any);
                                                                }
                                                            }}
                                                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all ${(currentContent.taskMultiTextLabels?.[index] && currentContent.taskMultiTextLabels[index].length > 0) ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-gray-400 hover:text-primary hover:bg-primary/5'}`}
                                                            title="Multi Text Option: Add multiple labeled text inputs for participants to answer contextually."
                                                        >
                                                            {(currentContent.taskMultiTextLabels?.[index] && currentContent.taskMultiTextLabels[index].length > 0) ? (
                                                                <>
                                                                    <span className="text-[10px] text-primary mr-0.5">●</span>
                                                                    <span>Multi Text</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Plus size={14} />
                                                                    <span>Multi Text</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                    {(!currentContent.taskInputTypes?.[index] || currentContent.taskInputTypes[index] === 'text') && isLinkedFromPrevious && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleToggleSpread(index)}
                                                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all ${(currentContent.taskSpread?.[index]) ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-gray-400 hover:text-primary hover:bg-primary/5 border border-transparent'}`}
                                                            title="Spread Option: Receive input from previous linked step to edit/revise."
                                                        >
                                                            {currentContent.taskSpread?.[index] ? (
                                                                <>
                                                                    <span className="text-[10px] text-primary mr-0.5">●</span>
                                                                    <span>Spread</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sparkles size={14} />
                                                                    <span>Spread</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            const currentHint = currentContent.taskHints?.[index];
                                                            if (currentHint === undefined || currentHint === null) {
                                                                handleTaskHintChange(index, '');
                                                            } else {
                                                                // Toggle - if it exists we can just show/hide the input
                                                                // but here it's always visible if it's not undefined
                                                            }
                                                        }}
                                                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all ${(currentContent.taskHints?.[index] !== undefined && currentContent.taskHints?.[index] !== null) ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'text-gray-400 hover:text-primary hover:bg-primary/5'}`}
                                                        title="Hint Option: Toggle an optional expandable hint or helper prompt to guide the participant if they get stuck."
                                                    >
                                                        {(currentContent.taskHints?.[index] !== undefined && currentContent.taskHints?.[index] !== null) ? (
                                                            <>
                                                                <span className="text-[10px] text-amber-500 mr-0.5">●</span>
                                                                <span>Hint</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus size={14} />
                                                                <span>Hint</span>
                                                            </>
                                                        )}
                                                    </button>

                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            const currentFootnote = currentContent.taskFootnotes?.[index];
                                                            if (currentFootnote === undefined || currentFootnote === null) {
                                                                handleTaskFootnoteChange(index, '');
                                                            } else {
                                                                // Toggle
                                                            }
                                                        }}
                                                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all ${(currentContent.taskFootnotes?.[index] !== undefined && currentContent.taskFootnotes?.[index] !== null) ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'text-gray-400 hover:text-primary hover:bg-primary/5'}`}
                                                        title="Footnote Option: Add normal text that appears just below the question step."
                                                    >
                                                        {(currentContent.taskFootnotes?.[index] !== undefined && currentContent.taskFootnotes?.[index] !== null) ? (
                                                            <>
                                                                <span className="text-[10px] text-indigo-500 mr-0.5">●</span>
                                                                <span>Footnote</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus size={14} />
                                                                <span>Footnote</span>
                                                            </>
                                                        )}
                                                    </button>

                                                    {(currentContent.taskPrompts?.length || 3) > 1 && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                 if (prompt && prompt.trim() !== "") {
                                                                     setConfirmDeleteIndex(index);
                                                                 } else {
                                                                     removeTaskPrompt(index);
                                                                 }
                                                             }}
                                                            className="p-1 px-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50/50 rounded-lg transition-colors flex items-center justify-center ml-1"
                                                            title="Remove Step: Permanently delete this action step from today's active curriculum list."
                                                        >
                                                            <Trash2 size={13} strokeWidth={2} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Multi-Link selector interface */}
                                            {(() => {
                                                const rawPrecedingSteps = (currentContent.taskInputTypes || [])
                                                    .map((type, idx) => ({ type, idx }))
                                                    .filter(item => item.idx < index && (item.type === 'tags' || item.type === 'poll' || item.type === 'text' || !item.type));
                                                
                                                const rawPrecedingDaysSteps = getPrecedingDaysTagSteps();

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

                                                const showSelector = activeLinkSelectorIndex === index && (precedingTagSteps.length > 0 || precedingDaysSteps.length > 0);
                                                
                                                if (showSelector) {
                                                    const yesterdayNum = selectedDay - 1;
                                                    const yesterdaySteps = precedingDaysSteps.filter(s => s.day === yesterdayNum);
                                                    const earlierSteps = precedingDaysSteps.filter(s => s.day < yesterdayNum);
                                                    const hasEarlier = earlierSteps.length > 0;
                                                    const isEarlierExpanded = !expandedStepEarlierDays || !expandedStepEarlierDays[index] ? false : expandedStepEarlierDays[index];

                                                    return (
                                                        <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl animate-fade-in relative z-30 space-y-3 text-left">
                                                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider flex items-center justify-between">
                                                                <span>{activeLinkSelectorType === 'tag' ? "Link this question to receive choices/options from preceding tag/poll steps:" : "Link this question to pull dynamic content/responses from preceding text steps:"}</span>
                                                                {((currentContent.taskLinkedSources?.[index]?.length || 0) > 0) && (
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => handleClearSourceLinks(index)}
                                                                        className="p-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-lg border border-red-100 transition-colors cursor-pointer text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ml-auto mr-4"
                                                                        title="Delete all links: Disconnect all linked dynamic source steps from this question."
                                                                    >
                                                                        <Trash2 size={10} />
                                                                        <span>Delete Links</span>
                                                                    </button>
                                                                )}
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => setActiveLinkSelectorIndex(null)}
                                                                    className="text-gray-400 hover:text-gray-600 text-xs font-bold"
                                                                >
                                                                    ✕ Close
                                                                </button>
                                                            </div>

                                                            {/* Same day steps */}
                                                            {precedingTagSteps.length > 0 && (
                                                                <div className="space-y-1.5">
                                                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Today's Preceding Steps:</div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {precedingTagSteps.map(step => {
                                                                            const isLinked = currentContent.taskLinkedSources?.[index]?.includes(step.idx);
                                                                            return (
                                                                                <button
                                                                                    key={step.idx}
                                                                                    type="button"
                                                                                    onClick={() => handleToggleSourceLink(index, step.idx)}
                                                                                    className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all border flex items-center gap-1.5 ${
                                                                                        isLinked 
                                                                                            ? 'bg-primary text-white border-primary shadow-sm' 
                                                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                                                                    }`}
                                                                                >
                                                                                    <span>Step {step.idx + 1}</span>
                                                                                    {isLinked ? (
                                                                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                                                                    ) : (
                                                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                                                                    )}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Yesterday's steps */}
                                                            {yesterdaySteps.length > 0 && (
                                                                <div className="space-y-1.5 pt-1.5 border-t border-gray-200/50">
                                                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Yesterday (Day {yesterdayNum}):</div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {yesterdaySteps.map(step => {
                                                                            const encodedVal = -(step.day * 100 + step.stepIdx);
                                                                            const isLinked = currentContent.taskLinkedSources?.[index]?.includes(encodedVal);
                                                                            return (
                                                                                <button
                                                                                    key={`prev-${step.day}-${step.stepIdx}`}
                                                                                    type="button"
                                                                                    onClick={() => handleToggleSourceLink(index, encodedVal)}
                                                                                    className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all border flex items-center gap-1.5 ${
                                                                                        isLinked 
                                                                                            ? 'bg-primary text-white border-primary shadow-sm' 
                                                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                                                                    }`}
                                                                                >
                                                                                    <span>Day {step.day} - Step {step.stepIdx + 1}</span>
                                                                                    {isLinked ? (
                                                                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                                                                    ) : (
                                                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                                                                    )}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Earlier steps */}
                                                            {hasEarlier && (
                                                                <div className="pt-1.5 border-t border-gray-200/50">
                                                                    {!isEarlierExpanded ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setExpandedStepEarlierDays(prev => ({ ...prev, [index]: true }))}
                                                                            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                                                                        >
                                                                            ... show more previous days
                                                                        </button>
                                                                    ) : (
                                                                        <div className="space-y-3">
                                                                            {Array.from(new Set(earlierSteps.map(s => s.day))).sort((a, b) => b - a).map(dayNum => {
                                                                                const daySteps = earlierSteps.filter(s => s.day === dayNum);
                                                                                return (
                                                                                    <div key={dayNum} className="space-y-1.5">
                                                                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Day {dayNum}:</div>
                                                                                        <div className="flex flex-wrap gap-2">
                                                                                            {daySteps.map(step => {
                                                                                                const encodedVal = -(step.day * 100 + step.stepIdx);
                                                                                                const isLinked = currentContent.taskLinkedSources?.[index]?.includes(encodedVal);
                                                                                                return (
                                                                                                    <button
                                                                                                        key={`prev-${step.day}-${step.stepIdx}`}
                                                                                                        type="button"
                                                                                                        onClick={() => handleToggleSourceLink(index, encodedVal)}
                                                                                                        className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all border flex items-center gap-1.5 ${
                                                                                                            isLinked 
                                                                                                                ? 'bg-primary text-white border-primary shadow-sm' 
                                                                                                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                                                                                        }`}
                                                                                                    >
                                                                                                        <span>Day {step.day} - Step {step.stepIdx + 1}</span>
                                                                                                        {isLinked ? (
                                                                                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                                                                                        ) : (
                                                                                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                                                                                        )}
                                                                                                    </button>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <p className="text-[9px] font-bold text-gray-400 mt-2 italic">
                                                                Click preceding step numbers to toggle. Any tags/options defined in those steps will feed into this step.
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                            {(currentContent.taskFootnotes?.[index] !== undefined && currentContent.taskFootnotes?.[index] !== null) && (
                                                <div className="mt-2 animate-fade-in">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest px-1">Task Footnote</label>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => {
                                                                const newFootnotes = [...(currentContent.taskFootnotes || [])];
                                                                newFootnotes[index] = null as any;
                                                                handleContentChange('taskFootnotes', newFootnotes);
                                                            }}
                                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                    <textarea 
                                                        value={currentContent.taskFootnotes[index] || ''} 
                                                        onChange={e => handleTaskFootnoteChange(index, e.target.value)} 
                                                        rows={2} 
                                                        className={footnoteInputClasses} 
                                                        placeholder="Add a footnote to show just below the question..." 
                                                    />
                                                </div>
                                            )}
                                            {(currentContent.taskHints?.[index] !== undefined && currentContent.taskHints?.[index] !== null) && (
                                                <div className="mt-2 animate-fade-in">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest px-1">Task Hint</label>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => {
                                                                const newHints = [...(currentContent.taskHints || [])];
                                                                newHints[index] = null as any;
                                                                handleContentChange('taskHints', newHints);
                                                            }}
                                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                    <textarea 
                                                        value={currentContent.taskHints[index] || ''} 
                                                        onChange={e => handleTaskHintChange(index, e.target.value)} 
                                                        rows={2} 
                                                        className={hintInputClasses} 
                                                        placeholder="Add a hint to help the participant..." 
                                                    />
                                                </div>
                                            )}
                                            {(!currentContent.taskInputTypes?.[index] || currentContent.taskInputTypes[index] === 'text') && currentContent.taskMultiTextLabels?.[index] && currentContent.taskMultiTextLabels[index].length > 0 && (
                                                <div className="mt-3 pl-2 border-l-2 border-primary/20 space-y-2 animate-fade-in text-left">
                                                    <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 mb-2">
                                                        <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                                                            <Layers size={14} />
                                                            <span>Configure labels for the Multi-Text fields that participants can fill contextually.</span>
                                                        </p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {currentContent.taskMultiTextLabels[index].map((lbl, lblIndex) => (
                                                            <div key={lblIndex} className="flex gap-2 items-center group/lbl">
                                                                <div className="w-5 h-5 rounded flex items-center justify-center bg-gray-100 text-gray-400 text-[10px] font-bold shrink-0">
                                                                    {lblIndex + 1}
                                                                </div>
                                                                <input 
                                                                    type="text"
                                                                    value={lbl}
                                                                    onChange={(e) => {
                                                                        const updatedLabels = [...(currentContent.taskMultiTextLabels?.[index] || [])];
                                                                        updatedLabels[lblIndex] = e.target.value;
                                                                        handleTaskMultiTextLabelsChange(index, updatedLabels);
                                                                    }}
                                                                    className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                                                    placeholder={`Label for Field ${lblIndex + 1}...`}
                                                                />
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updatedLabels = (currentContent.taskMultiTextLabels?.[index] || []).filter((_, lIdx) => lIdx !== lblIndex);
                                                                        handleTaskMultiTextLabelsChange(index, updatedLabels.length === 0 ? null as any : updatedLabels);
                                                                    }}
                                                                    className="p-1 px-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                                                                    title="Remove label field"
                                                                >
                                                                    <Trash2 size={13} strokeWidth={2} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const updatedLabels = [...(currentContent.taskMultiTextLabels?.[index] || [])];
                                                                updatedLabels.push(`Label ${updatedLabels.length + 1}`);
                                                                handleTaskMultiTextLabelsChange(index, updatedLabels);
                                                            }}
                                                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-primary bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/20 rounded-lg transition-all cursor-pointer mt-1"
                                                        >
                                                            <Plus size={12} strokeWidth={2} />
                                                            <span>Add Field Label</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {currentContent.taskInputTypes?.[index] === 'poll' && (
                                                <div className="mt-3 pl-2 border-l-2 border-primary/20 space-y-2">
                                                    <div className="flex items-center gap-2 mb-3 bg-white p-2.5 rounded-xl border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTogglePollMultiSelect(index)}
                                                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${currentContent.taskPollMultiSelect?.[index] ? 'bg-primary justify-end' : 'bg-gray-200 justify-start'}`}
                                                            title="Multi-Select: Toggle whether the participant can choose multiple options instead of a single choice."
                                                        >
                                                            <span className={`w-4 h-4 rounded-full bg-white shadow-sm transform duration-200 ease-in-out ${currentContent.taskPollMultiSelect?.[index] ? 'translate-x-4' : 'translate-x-0'}`} />
                                                        </button>
                                                        <span className="text-xs font-black text-gray-700 select-none cursor-help" title="Multi-Select: Toggle whether participants can choose multiple options or are constrained to a single response.">Allow multiple options selection (Multi-Select)</span>
                                                    </div>
                                                    <div className="space-y-4">
                                                        {isLinkedFromPrevious && !currentContent.taskTagNoteActive?.[index] ? (
                                                            <div className="bg-indigo-50/75 text-indigo-900 border border-indigo-150 rounded-xl p-3 text-xs font-semibold animate-fade-in flex flex-col gap-1 text-left">
                                                                <div className="flex items-center gap-1.5 text-indigo-800">
                                                                    <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                                    </svg>
                                                                    <span className="font-extrabold uppercase tracking-wide text-[10px]">Dynamic Poll Connected to Tags</span>
                                                                </div>
                                                                <p className="font-medium text-indigo-700/90 text-[11px] leading-relaxed">
                                                                    This poll receives dynamic tags from previous steps. Participants will see their active tags as choices, plus any optional custom options defined below.
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10">
                                                                <p className="text-xs font-medium text-primary italic flex items-center gap-1.5">
                                                                    <svg className="w-3.5 h-3.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                                    <span>All standard poll options can be added here. When active, participants will see these options.</span>
                                                                </p>
                                                            </div>
                                                        )}
                                                        <div className="space-y-2">
                                                            {(() => {
                                                                let opts: string[] = [];
                                                                if (currentContent.taskPollOptions?.[index]) {
                                                                    try { opts = JSON.parse(currentContent.taskPollOptions[index]); } catch(e) {}
                                                                }
                                                                const isDynamicPoll = isLinkedFromPrevious && !currentContent.taskTagNoteActive?.[index];
                                                                if (isDynamicPoll) {
                                                                    // For Dynamic Poll Connected to Tags, show only custom options if they exist
                                                                    opts = opts.filter(o => o !== null && o !== undefined && o.trim() !== '');
                                                                    if (addingCustomOption[index]) {
                                                                        opts.push('');
                                                                    }
                                                                } else {
                                                                    // Normal poll: fill up to 4 inputs for editing ease
                                                                    while (opts.length < 4) {
                                                                        opts.push('');
                                                                    }
                                                                }
                                                                return opts.map((opt, optIndex) => (
                                                                    <div key={optIndex} className="flex gap-2 items-center group/opt">
                                                                        <div className="w-5 h-5 rounded flex items-center justify-center bg-gray-50 text-gray-400 text-xs font-bold shrink-0">
                                                                            ●
                                                                        </div>
                                                                        <input 
                                                                            type="text"
                                                                            value={opt}
                                                                            onChange={(e) => {
                                                                                if (isDynamicPoll) {
                                                                                    setAddingCustomOption(prev => ({ ...prev, [index]: e.target.value.trim() === '' }));
                                                                                }
                                                                                handleTaskPollOptionChange(index, optIndex, e.target.value);
                                                                            }}
                                                                            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                                                            placeholder="Additional custom option..."
                                                                        />
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (isDynamicPoll) {
                                                                                    setAddingCustomOption(prev => ({ ...prev, [index]: false }));
                                                                                }
                                                                                removeTaskPollOption(index, optIndex);
                                                                            }}
                                                                            className="p-2 text-red-400 hover:text-red-500 rounded-lg transition-all"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                        </button>
                                                                    </div>
                                                                ));
                                                            })()}
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    const isDynamicPoll = isLinkedFromPrevious && !currentContent.taskTagNoteActive?.[index];
                                                                    if (isDynamicPoll) {
                                                                        setAddingCustomOption(prev => ({ ...prev, [index]: true }));
                                                                        let curOpts: string[] = [];
                                                                        try { curOpts = JSON.parse(currentContent.taskPollOptions?.[index] || '[]'); } catch(e) {}
                                                                        curOpts = curOpts.filter(o => o && o.trim() !== '');
                                                                        const newLen = curOpts.length;
                                                                        handleTaskPollOptionChange(index, newLen, '');
                                                                    } else {
                                                                        let currentLength = 0;
                                                                        try { 
                                                                            const parsed = JSON.parse(currentContent.taskPollOptions?.[index] || '[]');
                                                                            currentLength = parsed.length;
                                                                        } catch(e) {}
                                                                        handleTaskPollOptionChange(index, currentLength, '');
                                                                    }
                                                                }}
                                                                className="text-xs font-bold text-primary hover:text-primary/70 transition-colors flex items-center gap-1.5 mt-1"
                                                            >
                                                                <Plus size={12} strokeWidth={2.5} /> Custom Option
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Poll Option Branching Selector */}
                                            {(() => {
                                                const pollIdx = findNearestPrecedingPoll(currentContent, index);
                                                if (pollIdx === -1) return null;

                                                let pollOptions: string[] = [];
                                                if (currentContent.taskPollOptions?.[pollIdx]) {
                                                    try {
                                                        pollOptions = JSON.parse(currentContent.taskPollOptions[pollIdx]);
                                                    } catch (e) {}
                                                }
                                                pollOptions = pollOptions.filter(Boolean);

                                                const currentLink = currentContent.taskPollOptionLinks?.[index];

                                                return (
                                                    <div className="mt-3 p-3 bg-purple-50/45 border border-purple-100 rounded-xl space-y-2 text-left">
                                                        <div className="text-[10px] font-black text-purple-700 uppercase tracking-widest flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setCollapsedBranchingPaths(prev => ({ ...prev, [index]: !prev[index] }))}
                                                                    className="p-1 hover:bg-purple-100/80 rounded-md text-purple-700 transition-colors cursor-pointer flex items-center justify-center"
                                                                    title={collapsedBranchingPaths[index] ? "Reveal Branching Path options" : "Hide Branching Path options"}
                                                                >
                                                                    {collapsedBranchingPaths[index] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                                </button>
                                                                <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                                </svg>
                                                                <span>Branching Path (Linked to Poll Step {pollIdx + 1})</span>
                                                            </div>
                                                            {currentLink && (
                                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                                                                    Linked: {currentLink}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {!collapsedBranchingPaths[index] && (
                                                            <>
                                                                <p className="text-[10px] text-gray-500 leading-normal font-medium">
                                                                    Choose if this question should only show when a specific option is clicked in the poll at Step {pollIdx + 1}. If unlinked, it shows normally.
                                                                </p>
                                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            handleSetPollOptionLink(index, null);
                                                                        }}
                                                                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${!currentLink ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                                                    >
                                                                        Normal Progression (Always)
                                                                    </button>
                                                                    {pollOptions.map((opt, optIdx) => {
                                                                        const tag = `poll ${optIdx + 1}`;
                                                                        const isSelected = currentLink === tag;
                                                                        return (
                                                                            <button
                                                                                key={optIdx}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    handleSetPollOptionLink(index, tag);
                                                                                }}
                                                                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${isSelected ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                                                            >
                                                                                If Option {optIdx + 1}: "{opt}" ({tag})
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    <button 
                        type="button"
                        onClick={addTaskPrompt}
                        className="w-full py-3 bg-white border border-gray-200 border-dashed rounded-xl text-sm font-bold text-gray-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                        title="Add Step: Append an additional task, prompt, or feedback point to today's action-step structure."
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        Add Another Step
                    </button>
                        </>
                    )}

                    {/* Bridge Note Section */}
                    <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-3 mt-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
                            <span className="text-xs font-black text-gray-800 uppercase tracking-wider">
                                Bridge Note (Shown after Day {selectedDay} Completion)
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                            This note bridges today and tomorrow. It will be shown on the full-screen success screen after completing all steps for Day {selectedDay}.
                        </p>
                        {isAdmin && !isFoundational && originalSprint && (
                            <DiffHighlight 
                                label="Bridge Note" 
                                original={Array.isArray(originalSprint.dailyContent) ? originalSprint.dailyContent.find(c => c.day === selectedDay)?.bridgeNote : undefined} 
                                updated={currentContent.bridgeNote} 
                            />
                        )}
                        <textarea
                            value={currentContent.bridgeNote || ''}
                            onChange={(e) => handleContentChange('bridgeNote', e.target.value)}
                            rows={3}
                            className={editorInputClasses}
                            placeholder="Write a note to bridge today and tomorrow (e.g. 'You've laid down the foundation today. Tomorrow, we build...')"
                        />
                    </div>
                </div>

              {/* COMPLETION PROTOCOL CURATION */}
              </div>

            {/* PREVIEW COLUMN */}
            <div className="lg:sticky lg:top-8 space-y-6 self-start">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className={labelClasses}>Daily Content Preview</h2>
                  <button
                    type="button"
                    onClick={() => setShowDailyPreview(!showDailyPreview)}
                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#0E7850] transition-colors flex items-center justify-center cursor-pointer animate-fade-in"
                    title={showDailyPreview ? "Hide Preview" : "Reveal Preview"}
                  >
                    {showDailyPreview ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Real-time</span>
                </div>
              </div>

              {showDailyPreview ? (
                <>
                  <div className="space-y-2 animate-fade-in text-left">
                    <h2 className="text-[7px] font-black text-gray-400 uppercase tracking-[0.25em] mb-3">Execution Path Day {selectedDay}</h2>
                    
                    <div className="space-y-2">
                        <SectionHeading>Today's Insight</SectionHeading>
                        <div className="text-gray-700 font-medium text-base leading-[1.6] max-w-[60ch]">
                            <FormattedText text={currentContent.lessonText || "Lesson text will appear here..."} />
                        </div>
                    </div>
                  </div>

                  <div className="space-y-6 animate-fade-in w-full mt-6">
                <div className="space-y-6">
                    {(() => {
                        const activePrompts = currentContent.taskPrompts?.filter(p => p && p.trim()) || (currentContent.taskPrompt ? [currentContent.taskPrompt] : []);
                        if (activePrompts.length === 0) {
                            return (
                                <div className="p-6 border border-dashed border-gray-200 text-gray-400 rounded-2xl relative overflow-hidden text-center font-medium text-xs animate-fade-in">
                                    No action steps defined yet. Use the curriculum section on the left to add your execution steps.
                                </div>
                            );
                        }
                        
                        const validIndex = Math.min(previewTaskIndex, activePrompts.length - 1);
                        const prompt = activePrompts[validIndex] || "";
                        const i = validIndex;

                        const isStepLinked = (stepIndex: number): boolean => {
                            if (Array.isArray(currentContent.taskLinkedSources?.[stepIndex]) && currentContent.taskLinkedSources[stepIndex].length > 0) {
                                return true;
                            }
                            for (let prevIndex = stepIndex - 1; prevIndex >= 0; prevIndex--) {
                                if (currentContent.taskLinkedToNext?.[prevIndex]) {
                                    return true;
                                }
                            }
                            return false;
                        };

                        const getPreviewTagsForStep = (stepIndex: number): string[] => {
                            const tags = getAvailableConnectedTags(stepIndex);
                            if (tags.length > 0) return tags;
                            if (isStepLinked(stepIndex)) {
                                return ["Mindset Shift", "Goal Alignment"];
                            }
                            return [];
                        };
                        
                        return (
                            <>
                                <div className="relative group mb-4 animate-fade-in text-left">
                                    <SectionHeading>Action Step {i + 1} of {activePrompts.length}</SectionHeading>
                                                          {currentContent.taskNotes?.[i] && (
                                        <div className="mb-4 text-left border-l-4 border-emerald-500/30 pl-4 py-1 animate-fade-in text-gray-700 font-bold text-sm sm:text-base leading-relaxed">
                                            <FormattedText text={currentContent.taskNotes[i]} />
                                        </div>
                                    )}
 
                                    {(() => {
                                        const noteText = getSingleTagNoteValue(currentContent.taskTagNotes?.[i]);
                                        if (!noteText.trim()) return null;
                                        
                                        const tags = getPreviewTagsForStep(i);
                                        if (tags.length === 0) return null;
                                        
                                        return (
                                            <div className="mb-4 text-left border-l-4 border-emerald-500/30 pl-4 py-1.5 animate-fade-in space-y-2 bg-amber-500/0">
                                                <div className="text-gray-700 font-bold text-sm sm:text-base leading-relaxed">
                                                    <FormattedText text={noteText} />
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                    {tags.map((tag, tagIndex) => (
                                                        <span key={tagIndex} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 border border-indigo-100 px-2 py-0.5 rounded-full font-black italic text-[9px] uppercase shadow-sm">
                                                            🏷️ {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className={`text-gray-950 font-black text-lg sm:text-xl md:text-2xl leading-relaxed ${currentContent.taskFootnotes?.[i] ? 'mb-2' : 'mb-4'}`}>
                                        <FormattedText text={prompt || "Submit your progress for this step."} />
                                    </div>
                                    {currentContent.taskFootnotes?.[i] && (
                                        <div className="mb-4 text-left text-emerald-600 font-bold text-sm sm:text-base leading-relaxed animate-fade-in">
                                            <FormattedText text={currentContent.taskFootnotes[i]} />
                                        </div>
                                    )}
                                    {currentContent.taskHints?.[i] && (
                                        <div className="mb-4">
                                            <button
                                                type="button"
                                                onClick={() => setRevealedHints(prev => ({ ...prev, [i]: !prev[i] }))}
                                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest transition-all ${revealedHints[i] ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400 hover:text-primary hover:bg-primary/5'}`}
                                            >
                                                <svg className={`w-2.5 h-2.5 transition-transform duration-300 ${revealedHints[i] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>Hint</span>
                                            </button>
                                            {revealedHints[i] && (
                                                <div className="mt-3 p-3 bg-amber-50/50 border border-amber-100/70 rounded-xl text-[11px] sm:text-xs font-medium text-amber-900/90 animate-fade-in leading-relaxed italic">
                                                    <FormattedText text={currentContent.taskHints[i]} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {(() => {
                                        const type = currentContent.taskInputTypes?.[i] || 'text';
                                        const isLinked = isStepLinked(i);
                                        
                                        if (type === 'poll') {
                                            let parsedOpts: string[] = [];
                                            try {
                                                parsedOpts = JSON.parse(currentContent.taskPollOptions?.[i] || '[]');
                                            } catch (e) {}
                                            const optionsList = parsedOpts.filter(o => o.trim());
                                            
                                            const linkedTags = getPreviewTagsForStep(i);
                                            const allOptions = isLinked 
                                                ? Array.from(new Set([...linkedTags, ...optionsList])).filter(Boolean)
                                                : optionsList.filter(Boolean);
                                            
                                            const isMultiSelect = !!currentContent.taskPollMultiSelect?.[i];
                                            let selectedOpts: string[] = [];
                                            try {
                                                const val = previewInputs[i] || '';
                                                if (val.startsWith("[")) {
                                                    selectedOpts = JSON.parse(val);
                                                } else if (val) {
                                                    selectedOpts = [val];
                                                }
                                            } catch (e) {}

                                            const renderPollButtons = () => {
                                                if (allOptions.length === 0) {
                                                    return (
                                                        <div className="p-3 text-center text-xs text-gray-400 font-semibold italic bg-white border border-gray-100 rounded-xl">
                                                            No poll options defined yet.
                                                        </div>
                                                    );
                                                }

                                                if (allOptions.length > 6) {
                                                    return (
                                                        <div className="flex flex-wrap gap-1.5 w-full">
                                                            {allOptions.map((opt, idx) => {
                                                                const isSel = isMultiSelect ? selectedOpts.includes(opt) : (previewInputs[i] === opt);
                                                                return (
                                                                    <button
                                                                        key={idx}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (isMultiSelect) {
                                                                                let newSelected: string[];
                                                                                if (selectedOpts.includes(opt)) {
                                                                                    newSelected = selectedOpts.filter(o => o !== opt);
                                                                                } else {
                                                                                    newSelected = [...selectedOpts, opt];
                                                                                }
                                                                                setPreviewInputs(prev => ({ ...prev, [i]: JSON.stringify(newSelected) }));
                                                                            } else {
                                                                                setPreviewInputs(prev => ({ ...prev, [i]: opt }));
                                                                            }
                                                                        }}
                                                                        className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border cursor-pointer ${
                                                                            isSel 
                                                                                ? "bg-primary text-white border-primary shadow-md scale-95" 
                                                                                : "bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                                                        }`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="space-y-2 w-full">
                                                        {allOptions.map((opt, idx) => {
                                                            const isSel = isMultiSelect ? selectedOpts.includes(opt) : (previewInputs[i] === opt);
                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (isMultiSelect) {
                                                                            let newSelected: string[];
                                                                            if (selectedOpts.includes(opt)) {
                                                                                newSelected = selectedOpts.filter(o => o !== opt);
                                                                            } else {
                                                                                newSelected = [...selectedOpts, opt];
                                                                            }
                                                                            setPreviewInputs(prev => ({ ...prev, [i]: JSON.stringify(newSelected) }));
                                                                        } else {
                                                                            setPreviewInputs(prev => ({ ...prev, [i]: opt }));
                                                                        }
                                                                    }}
                                                                    className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all text-left border flex items-center justify-between cursor-pointer ${
                                                                        isSel 
                                                                            ? "bg-primary/10 border-primary text-primary shadow-sm" 
                                                                            : "bg-white border-primary/10 hover:border-primary/30 text-gray-700"
                                                                    }`}
                                                                >
                                                                    <span>
                                                                        {String.fromCharCode(65 + idx)}. {opt}
                                                                    </span>
                                                                    {isMultiSelect ? (
                                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                                            isSel ? "border-primary bg-primary text-white" : "border-gray-300 bg-white"
                                                                        }`}>
                                                                            {isSel && (
                                                                                <svg className="w-2.5 h-2.5 text-white animate-fade-in" fill="none" stroke="currentColor" strokeWidth={4} viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                                                </svg>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                                                            isSel ? "border-primary bg-primary" : "border-gray-300 bg-white"
                                                                        }`}>
                                                                            {isSel && (
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            };

                                            return (
                                                <div className="space-y-3 bg-indigo-50/5 border border-indigo-100/60 rounded-2xl p-4 text-left animate-fade-in">
                                                    <div className="flex items-center justify-between text-indigo-900/40 text-[10px] font-black uppercase tracking-wide">
                                                        <span className="flex items-center gap-1">📊 Poll Input {isLinked && <span className="text-[9px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md font-bold">(Linked)</span>}</span>
                                                        {isMultiSelect && <span className="text-primary font-black uppercase tracking-widest text-[9px]">☑️ Multi-Select</span>}
                                                    </div>
                                                    <div className="space-y-2">
                                                        {renderPollButtons()}
                                                    </div>
                                                </div>
                                            );
                                        } else if (type === 'tags') {
                                            let selectedTags: string[] = [];
                                            try {
                                                const val = previewInputs[i] || '["Mindset Shift"]';
                                                if (val.startsWith("[")) {
                                                    selectedTags = JSON.parse(val);
                                                }
                                            } catch (e) {}

                                            return (
                                                <div className="space-y-3 bg-emerald-50/20 border border-emerald-100 rounded-2xl p-4 text-left animate-fade-in">
                                                    <div className="flex items-center gap-1.5 text-emerald-800 text-[10px] font-black uppercase tracking-wide">
                                                        <span>🏷️ Dynamic growth focus tags selection (Preview)</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {["Mindset Shift", "Process Scale", "Goal Alignment"].map((tag, idx) => {
                                                            const isChecked = selectedTags.includes(tag);
                                                            return (
                                                                <button 
                                                                    key={idx} 
                                                                    type="button"
                                                                    onClick={() => {
                                                                        let newTags: string[];
                                                                        if (isChecked) {
                                                                            newTags = selectedTags.filter(t => t !== tag);
                                                                        } else {
                                                                            newTags = [...selectedTags, tag];
                                                                        }
                                                                        setPreviewInputs(prev => ({ ...prev, [i]: JSON.stringify(newTags) }));
                                                                    }}
                                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer shadow-sm transition-all select-none border ${
                                                                        isChecked 
                                                                            ? "bg-emerald-500 text-white border-emerald-600 scale-95" 
                                                                            : "bg-white border-emerald-200 text-emerald-800 hover:border-emerald-500 hover:bg-emerald-50/30"
                                                                    }`}
                                                                >
                                                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                                        isChecked ? "border-white bg-white text-emerald-600" : "border-emerald-300 bg-white"
                                                                    }`}>
                                                                        {isChecked && (
                                                                            <svg className="w-2.5 h-2.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={5} viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                                            </svg>
                                                                        )}
                                                                    </div>
                                                                    <span className="uppercase tracking-wider text-[10px]">{tag}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        } else if (type === 'mark') {
                                            const isChecked = previewInputs[i] === "Completed";
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPreviewInputs(prev => ({
                                                            ...prev,
                                                            [i]: isChecked ? "" : "Completed"
                                                        }));
                                                    }}
                                                    className={`w-full space-y-3 border rounded-2xl p-4 text-left animate-fade-in flex items-center justify-between cursor-pointer transition-all ${
                                                        isChecked 
                                                            ? "bg-indigo-50/40 border-indigo-200 shadow-sm" 
                                                            : "bg-white border-gray-150 hover:border-indigo-200"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 shadow-sm transition-all ${
                                                            isChecked ? "border-indigo-500 bg-indigo-50" : "border-gray-300 bg-white"
                                                        }`}>
                                                            {isChecked && (
                                                                <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <span className={`text-xs font-black uppercase tracking-wider transition-colors ${
                                                            isChecked ? "text-indigo-900" : "text-gray-700"
                                                        }`}>
                                                            {isChecked ? "Completed" : "Mark complete"}
                                                        </span>
                                                    </div>
                                                    <span className="text-[9px] font-black text-indigo-500 bg-indigo-100/50 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                                                        PROOFLY MARK
                                                    </span>
                                                </button>
                                            );
                                        } else {
                                            const val = previewInputs[i] || '';
                                            return (
                                                <div className="space-y-2 text-left animate-fade-in">
                                                    {isLinked && (
                                                        <div className="bg-indigo-50/40 border border-indigo-150/40 rounded-xl p-2 px-3 text-[10.5px] font-semibold text-indigo-900 italic flex items-center gap-1.5 mb-2">
                                                            <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>Text to Dynamic Tag link has been set. This participant's response adapts based on dynamic tag context.</span>
                                                        </div>
                                                    )}
                                                    <textarea 
                                                        value={val}
                                                        onChange={e => setPreviewInputs(prev => ({ ...prev, [i]: e.target.value }))}
                                                        className="w-full px-4 py-3 bg-white border border-gray-200 focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none rounded-2xl text-xs font-semibold text-gray-800 placeholder-gray-400 min-h-[80px]"
                                                        placeholder="Type simulated participant comments / text input here to test..."
                                                    />
                                                </div>
                                            );
                                        }
                                    })()}
                                    <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>

                                    <div className="flex justify-between items-center gap-4 mt-6">
                                        {i > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => setPreviewTaskIndex(i - 1)}
                                                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:text-primary transition-colors bg-white active:scale-95"
                                            >
                                                Back
                                            </button>
                                        ) : <div />}
                                        
                                        {i < activePrompts.length - 1 ? (
                                            <button
                                                type="button"
                                                onClick={() => setPreviewTaskIndex(i + 1)}
                                                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-sm shadow-primary/10 active:scale-95"
                                            >
                                                Next
                                            </button>
                                        ) : <div />}
                                    </div>
                                </div>

                                {activePrompts.length > 1 && (
                                    <div className="flex justify-center items-center gap-2 mt-4">
                                        {activePrompts.map((_, idx) => (
                                            <button
                                                type="button"
                                                key={idx} 
                                                onClick={() => setPreviewTaskIndex(idx)}
                                                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${idx === validIndex ? 'w-8 bg-primary' : 'w-2 bg-gray-200 hover:bg-primary/40'}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>

                <div className="mt-12 space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowDaySuccessPreview(true)}
                    className="w-full py-5 bg-[#0E7850] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] text-center shadow-xl shadow-[#0E7850]/20 hover:bg-[#0E7850]/90 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Sparkles size={16} />
                    <span>Complete Day (Preview Day Success Screen)</span>
                  </button>
                  <p className="text-center text-[8px] font-black text-gray-300 uppercase tracking-widest">Click to preview participant Day Success celebration screen</p>
                </div>
              </div>
                </>
              ) : (
                <div className="p-12 border-2 border-dashed border-gray-150 rounded-[2.5rem] flex flex-col items-center justify-center text-center text-gray-400 space-y-2 animate-fade-in">
                  <EyeOff className="w-8 h-8 text-gray-300" />
                  <p className="text-xs font-semibold">Preview Hidden</p>
                  <p className="text-[10px] text-gray-400 max-w-[200px]">Click the eye icon above to reveal the daily execution preview.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Clear Action Steps Confirmation Modal */}
      {showClearActionConfirm && (
        <div className="fixed inset-0 z-[155] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-gray-100 flex flex-col items-center text-center animate-scale-up">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-black text-gray-900 uppercase tracking-wider mb-2">Clear Action Steps</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">Are you sure you want to clear all Today's Action Steps? This action cannot be undone.</p>
            <div className="flex gap-3 w-full">
              <button 
                type="button"
                onClick={() => setShowClearActionConfirm(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-700 bg-white active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={() => {
                  handleContentChange('taskPrompt', '');
                  handleContentChange('taskPrompts', ['', '', '']);
                  handleContentChange('taskInputTypes', ['text', 'text', 'text']);
                  handleContentChange('taskHints', []);
                  handleContentChange('taskNotes', []);
                  handleContentChange('taskTagNotes', []);
                  handleContentChange('taskTagNoteActive', []);
                  handleContentChange('taskFootnotes', []);
                  handleContentChange('taskPollMultiSelect', []);
                  handleContentChange('taskMultiTextLabels', []);
                  handleContentChange('taskLinkedToNext', []);
                  handleContentChange('taskLinkedSources', []);
                  handleContentChange('taskPollOptions', []);
                  setShowClearActionConfirm(false);
                }}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Action Steps Workspace Modal Overlay */}
      {showAdvancedActionModal && (

        <DailyActionWorkspace
          sprint={sprint}
          setSprint={setSprint}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          onClose={() => setShowAdvancedActionModal(false)}
          onSaveDraft={handleSaveDraft}
          saveStatus={saveStatus}
        />
      )}

      {/* Today's Insight Help Bottom Sheet */}
      {showInsightHelpSheet && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-[300] backdrop-blur-sm transition-opacity duration-300 animate-fade-in-quick cursor-pointer"
            onClick={() => setShowInsightHelpSheet(false)}
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
              Today's Insight
            </h3>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 text-center mb-6">How to write high-impact content</p>

            {/* Content list */}
            <div className="space-y-4 max-w-xs sm:max-w-sm mx-auto">
              <div className="flex items-start gap-3">
                <span className="text-emerald-600 text-sm font-black mt-0.5">•</span>
                <p className="text-xs font-bold leading-relaxed text-gray-700">
                  <span className="font-extrabold text-gray-900">Define the Context:</span> This is the core curriculum text the participant reads to start their day. Frame the context and introduce today's focus.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-600 text-sm font-black mt-0.5">•</span>
                <p className="text-xs font-bold leading-relaxed text-gray-700">
                  <span className="font-extrabold text-gray-950">Explain the Why:</span> Help participants understand why today's specific challenge matters and how it connects to their larger transformation goals.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-600 text-sm font-black mt-0.5">•</span>
                <p className="text-xs font-bold leading-relaxed text-gray-700">
                  <span className="font-extrabold text-gray-950">Formatting tools:</span> Use the formatting toolbar to highlight text blocks, italicize for emphasis, or structure with bold titles.
                </p>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => setShowInsightHelpSheet(false)}
              className="mt-8 w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md active:scale-95 cursor-pointer text-center"
            >
              Understand
            </button>
          </div>
        </>
      )}

      {/* Today's Action Steps Help Bottom Sheet */}
      {showActionHelpSheet && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-[300] backdrop-blur-sm transition-opacity duration-300 animate-fade-in-quick cursor-pointer"
            onClick={() => setShowActionHelpSheet(false)}
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
              Today's Action Steps
            </h3>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 text-center mb-6">Designing daily exercises</p>

            {/* Content list */}
            <div className="space-y-4 max-w-xs sm:max-w-sm mx-auto">
              <div className="flex items-start gap-3">
                <span className="text-emerald-600 text-sm font-black mt-0.5">•</span>
                <p className="text-xs font-bold leading-relaxed text-gray-700">
                  <span className="font-extrabold text-gray-900">Make it Actionable:</span> Break down today's goal into distinct, bitesize actionable micro-exercises. A minimum of 3 steps is highly recommended.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-600 text-sm font-black mt-0.5">•</span>
                <p className="text-xs font-bold leading-relaxed text-gray-700">
                  <span className="font-extrabold text-gray-950">Custom Input Types:</span> Select text input, multi-line notes, custom tag selectors, or quick polls based on what type of input you expect from the user.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-600 text-sm font-black mt-0.5">•</span>
                <p className="text-xs font-bold leading-relaxed text-gray-700">
                  <span className="font-extrabold text-gray-950">Set Clear Guides:</span> Utilize footnotes, placeholder hints, and coach-specific tips to make sure participants never feel stuck.
                </p>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => setShowActionHelpSheet(false)}
              className="mt-8 w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md active:scale-95 cursor-pointer text-center"
            >
              Understand
            </button>
          </div>
        </>
      )}

      {/* Floating Selection Tooltip */}
      {selectedText && tooltipPosition && (
        <div 
          className="fixed z-[300] bg-gray-900 text-white rounded-2xl shadow-xl border border-gray-850 p-3 flex flex-col gap-2 min-w-[200px] animate-scale-up select-none font-sans"
          style={{ 
            top: Math.max(80, tooltipPosition.y), 
            left: Math.max(20, Math.min(window.innerWidth - 240, tooltipPosition.x - 100)) 
          }}
        >
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest pb-1 border-b border-gray-800 flex items-center justify-between">
            <span>Assign Selection</span>
            <button 
              type="button"
              onClick={() => {
                setSelectedText('');
                setTooltipPosition(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 py-1">
            {(currentContent.taskPrompts || ['', '', '']).map((_, index) => (
              <div key={index} className="space-y-1">
                <span className="text-[8px] font-black text-primary/80 uppercase tracking-widest pl-1">Step {index + 1}</span>
                <div className="grid grid-cols-4 gap-0.5">
                  <button
                    type="button"
                    onClick={() => assignSelectedText('prompt', index)}
                    className="py-1 px-0.5 bg-gray-800 hover:bg-primary rounded-md text-[8px] font-bold uppercase cursor-pointer text-center"
                    title="Assign to prompt"
                  >
                    Prpt
                  </button>
                  <button
                    type="button"
                    onClick={() => assignSelectedText('note', index)}
                    className="py-1 px-0.5 bg-gray-800 hover:bg-emerald-600 rounded-md text-[8px] font-bold uppercase cursor-pointer text-center"
                    title="Assign to Coach Note"
                  >
                    Note
                  </button>
                  <button
                    type="button"
                    onClick={() => assignSelectedText('hint', index)}
                    className="py-1 px-0.5 bg-gray-800 hover:bg-amber-600 rounded-md text-[8px] font-bold uppercase cursor-pointer text-center"
                    title="Assign to Hint"
                  >
                    Hint
                  </button>
                  <button
                    type="button"
                    onClick={() => assignSelectedText('footnote', index)}
                    className="py-1 px-0.5 bg-gray-800 hover:bg-indigo-600 rounded-md text-[8px] font-bold uppercase cursor-pointer text-center"
                    title="Assign to Footnote"
                  >
                    Foot
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Action Step Confirmation Modal */}
      {confirmDeleteIndex !== null && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-gray-100 flex flex-col items-center text-center animate-scale-up">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-black text-gray-900 uppercase tracking-wider mb-2">Delete Action Step</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">This action step has written content. Are you sure you want to delete it permanently?</p>
            <div className="flex gap-3 w-full">
              <button 
                type="button"
                onClick={() => setConfirmDeleteIndex(null)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-700 bg-white active:scale-95 transition-all"
              >
                No, Keep
              </button>
              <button 
                type="button"
                onClick={() => {
                  removeTaskPrompt(confirmDeleteIndex);
                  setConfirmDeleteIndex(null);
                }}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Bleed Modal for Add New Version */}
      {showAddVersionFullBleed && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-y-auto animate-fade-in text-gray-900 font-sans">
          <div className="max-w-4xl mx-auto w-full px-6 py-12 md:py-20 space-y-12 relative animate-scale-up">
            <button 
              onClick={() => setShowAddVersionFullBleed(false)}
              className="absolute top-8 right-6 text-gray-400 hover:text-gray-600 p-2.5 rounded-full hover:bg-gray-50 transition-all cursor-pointer"
              title="Close and Return"
            >
              <X className="h-6 w-6" />
            </button>
            

            
            {/* Locked Identity Section */}
            <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 space-y-5">
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Sprint Identity (Locked)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Sprint Title</label>
                  <p className="text-base font-black text-gray-800">{sprint.title}</p>
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Sprint Subtitle</label>
                  <p className="text-xs font-semibold text-gray-500">{sprint.subtitle || '—'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Cover Image URL</label>
                  <div className="flex items-center gap-3 mt-1">
                    {sprint.coverImageUrl && (
                      <img src={sprint.coverImageUrl} className="w-16 h-11 object-cover rounded-xl border border-gray-150 shadow-sm" alt="" />
                    )}
                    <span className="text-xs text-gray-400 truncate font-mono">{sprint.coverImageUrl || 'No cover image URL supplied'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Settings Fields */}
            <div className="space-y-16">
              
              {/* 01 Version Profile */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">01</div>
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Version Profile</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Version Number */}
                  <div>
                    <label className={labelClasses}>Version Number</label>
                    <input 
                      type="number" 
                      value={versionSettings.versionNumber} 
                      onChange={e => setVersionSettings({...versionSettings, versionNumber: Math.max(1, Number(e.target.value))})}
                      className={registryInputClasses + " mt-2"}
                      placeholder="e.g. 2"
                    />
                  </div>

                  {/* Version Tag */}
                  <div>
                    <label className={labelClasses}>Version Tag (Admins/Coaches See This)</label>
                    <input 
                      type="text" 
                      value={versionSettings.versionTag} 
                      onChange={e => setVersionSettings({...versionSettings, versionTag: e.target.value})}
                      className={registryInputClasses + " mt-2"}
                      placeholder="e.g. Redesign, A/B Test, Marketing, v1-core"
                    />
                  </div>
                </div>
              </section>

              {/* 02 Sprint Overview */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">02</div>
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Sprint Overview</h4>
                </div>
                <div className="w-full">
                  <label className={labelClasses}>Sprint Description / Overview</label>
                  <textarea
                    value={versionSettings.description}
                    onChange={e => setVersionSettings({...versionSettings, description: e.target.value})}
                    className="w-full p-5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold transition-all resize-none mt-2"
                    rows={8}
                    placeholder="Enter the comprehensive sprint description or overview..."
                  />
                </div>
              </section>

              {/* 03 Metadata */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">03</div>
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Metadata</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Duration */}
                  <div>
                    <label className={labelClasses}>Duration (Days)</label>
                    <CustomSelect
                      value={versionSettings.duration}
                      onChange={val => setVersionSettings({...versionSettings, duration: Number(val)})}
                      options={[3, 5, 7, 10, 14, 21, 30].map(d => ({ value: d, label: `${d} Continuous Days` }))}
                      className="mt-2"
                    />
                  </div>

                  {/* Discovery Category */}
                  <div>
                    <label className={labelClasses}>Discovery Category</label>
                    <CustomSelect
                      value={versionSettings.category}
                      onChange={val => setVersionSettings({...versionSettings, category: String(val)})}
                      options={ALL_CATEGORIES}
                      className="mt-2"
                    />
                  </div>

                  {/* Sprint Difficulty */}
                  <div>
                    <label className={labelClasses}>Difficulty</label>
                    <CustomSelect
                      value={versionSettings.difficulty}
                      onChange={val => setVersionSettings({...versionSettings, difficulty: val as any})}
                      options={["Beginner", "Intermediate", "Advanced"]}
                      className="mt-2"
                    />
                  </div>

                  {/* Sprint Type */}
                  <div>
                    <label className={labelClasses}>Sprint Type</label>
                    <CustomSelect
                      value={versionSettings.sprintType}
                      onChange={val => setVersionSettings({...versionSettings, sprintType: val as any})}
                      options={["Fundamentals", "Core", "Expert"]}
                      className="mt-2"
                    />
                  </div>

                  {/* Target Audience */}
                  <div className="md:col-span-2 relative">
                    <label className={labelClasses}>Audience</label>
                    <div 
                      onClick={() => setIsAudienceDropdownOpen(!isAudienceDropdownOpen)}
                      className={`${registryInputClasses} mt-2 cursor-pointer flex justify-between items-center bg-white border border-gray-100 px-4 py-2.5 rounded-xl`}
                    >
                      <span className="text-gray-700 font-bold text-xs select-none">
                        {versionSettings.audience && versionSettings.audience.length > 0 
                          ? versionSettings.audience.join(", ") 
                          : "Select target audience..."}
                      </span>
                      <span className="text-[10px] text-gray-400">▼</span>
                    </div>
                    {isAudienceDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsAudienceDropdownOpen(false)}></div>
                        <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-250 rounded-2xl shadow-xl z-40 p-2 flex flex-col gap-0.5" onClick={e => e.stopPropagation()}>
                          {(() => {
                            const opts = ["Entrepreneur", "Business Owner", "Freelancer/Consultant", "9-5 Professional", "Student/Graduate", "Creative/Hustler"];
                            if (user?.role === UserRole.ADMIN) {
                              opts.push("Coach");
                            }
                            return opts;
                          })().map(opt => {
                            const isSelected = versionSettings.audience?.includes(opt);
                            return (
                              <div 
                                key={opt}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const currentAudience = versionSettings.audience || [];
                                  const updated = isSelected 
                                    ? currentAudience.filter(x => x !== opt)
                                    : [...currentAudience, opt];
                                  setVersionSettings(prev => ({ 
                                    ...prev, 
                                    audience: updated,
                                    overrideOrchestrator: updated.length === 0 ? false : prev.overrideOrchestrator
                                  }));
                                }}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-xs font-bold transition-all ${
                                  isSelected 
                                    ? 'bg-primary/5 text-primary' 
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="rounded border-gray-350 text-primary focus:ring-primary h-3.5 w-3.5"
                                />
                                <span>{opt}</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Override Orchestrator */}
                  <div className={`md:col-span-2 flex items-center justify-between p-5 border rounded-2xl transition-all ${
                    (!versionSettings.audience || versionSettings.audience.length === 0)
                    ? 'bg-gray-50 border-gray-200 opacity-60'
                    : 'bg-[#F4F9F6] border-emerald-500/10'
                  }`}>
                    <div>
                      <label className={`text-[11px] font-black uppercase tracking-widest block mb-1 ${
                        (!versionSettings.audience || versionSettings.audience.length === 0)
                        ? 'text-gray-400'
                        : 'text-gray-900'
                      }`}>
                        Override Orchestrator to appear in the Explore page
                      </label>
                      <p className={`text-[10px] font-medium leading-relaxed ${
                        (!versionSettings.audience || versionSettings.audience.length === 0)
                        ? 'text-gray-400'
                        : 'text-emerald-700/70'
                      }`}>
                        {(!versionSettings.audience || versionSettings.audience.length === 0)
                          ? '⚠️ Select at least one target audience above to enable override.'
                          : 'Force this sprint to bypass orchestrator assignment and appear in the Explore page.'
                        }
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!versionSettings.audience || versionSettings.audience.length === 0}
                      onClick={() => setVersionSettings(prev => ({ ...prev, overrideOrchestrator: !prev.overrideOrchestrator }))}
                      className={`w-12 h-6 rounded-full transition-all duration-300 relative shrink-0 ${
                        (!versionSettings.audience || versionSettings.audience.length === 0)
                        ? "bg-gray-100 cursor-not-allowed"
                        : versionSettings.overrideOrchestrator 
                        ? "bg-[#047857] shadow-lg shadow-emerald-500/10" 
                        : "bg-gray-200"
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${
                        (!versionSettings.audience || versionSettings.audience.length === 0)
                        ? 'left-1'
                        : versionSettings.overrideOrchestrator 
                        ? "right-1" 
                        : "left-1"
                      }`} />
                    </button>
                  </div>
                </div>
              </section>

              {/* 04 Pricing & Economy */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">04</div>
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Pricing & Economy</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Pricing Type */}
                  <div>
                    <label className={labelClasses}>Pricing Type</label>
                    <CustomSelect
                      value={versionSettings.pricingType}
                      onChange={val => setVersionSettings({...versionSettings, pricingType: val as 'cash' | 'credits'})}
                      options={[
                        { value: 'cash', label: 'Cash (NGN/USD)' },
                        { value: 'credits', label: 'Credits (Points)' }
                      ]}
                      className="mt-2"
                    />
                  </div>

                  {/* Price / points cost */}
                  {versionSettings.pricingType === 'credits' ? (
                    <div>
                      <label className={labelClasses}>Point Cost</label>
                      <input 
                        type="number" 
                        value={versionSettings.pointCost} 
                        onChange={e => setVersionSettings({...versionSettings, pointCost: Number(e.target.value)})}
                        className={registryInputClasses + " mt-2"}
                        placeholder="0" 
                      />
                    </div>
                  ) : (
                    <div>
                      <label className={labelClasses}>Proposed Price (NGN)</label>
                      <input 
                        type="number" 
                        value={versionSettings.price} 
                        onChange={e => setVersionSettings({...versionSettings, price: Number(e.target.value)})}
                        className={registryInputClasses + " mt-2"}
                        placeholder="0" 
                      />
                    </div>
                  )}

                  {/* Archive Outcome Tag */}
                  <div className="md:col-span-2">
                    <label className={labelClasses}>Archive Outcome Tag</label>
                    <CustomSelect
                      value={versionSettings.outcomeTag}
                      onChange={val => setVersionSettings({...versionSettings, outcomeTag: String(val)})}
                      options={OUTCOME_TAGS}
                      className="mt-2"
                    />
                  </div>
                </div>
              </section>

              {/* 05 Engagement Settings */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">05</div>
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Engagement Settings</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Check in Reminders */}
                  <div className="md:col-span-2 flex items-center justify-between p-5 bg-gray-50 border border-gray-100 rounded-2xl">
                    <div>
                      <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest block mb-1">Daily Check-in Reminder</label>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Enable to keep pushing reminders after completion</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVersionSettings({...versionSettings, checkInReminder: !versionSettings.checkInReminder})}
                      className={`w-12 h-6 rounded-full transition-all duration-300 relative shrink-0 ${versionSettings.checkInReminder ? "bg-primary shadow-lg shadow-primary/20" : "bg-gray-200"}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${versionSettings.checkInReminder ? "right-1" : "left-1"}`} />
                    </button>
                  </div>

                  {/* Check in Reminders Duration */}
                  {versionSettings.checkInReminder && (
                    <div className="md:col-span-2 space-y-2">
                      <label className={labelClasses}>Reminder Active Duration (Days)</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={versionSettings.checkInReminderDays}
                        onChange={e => setVersionSettings({...versionSettings, checkInReminderDays: Math.max(1, Number(e.target.value))})}
                        className={registryInputClasses + " mt-2"}
                      />
                    </div>
                  )}
                </div>
              </section>

            </div>

            {/* Create Button */}
            <div className="pt-8 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowAddVersionFullBleed(false)} className="px-6 py-3.5 border-gray-200 font-black uppercase text-[10px] tracking-widest rounded-xl">
                Cancel
              </Button>
              <Button 
                onClick={handleCreateNewVersion} 
                isLoading={isCreatingVersion}
                className="px-8 py-3.5 bg-primary text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg hover:shadow-primary/20"
              >
                Create New Version
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Success Dialog for view newly created sprint */}
      {showCreatedPopup && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in shadow-2xl">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-gray-100 flex flex-col items-center text-center animate-scale-up">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4 border border-emerald-100">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-black text-gray-900 uppercase tracking-wider mb-2">New Version Created!</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">The new version of the sprint has been created with all original contents duplicate. Choose view below to start editing settings for this version.</p>
            <div className="flex gap-3 w-full">
              <button 
                type="button"
                onClick={() => {
                  setShowCreatedPopup(false);
                  setNewlyCreatedSprintId('');
                }}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-50 transition-all cursor-pointer"
              >
                Close
              </button>
              <button 
                type="button"
                onClick={() => {
                  setShowCreatedPopup(false);
                  navigate(`/coach/sprint/edit/${newlyCreatedSprintId}`);
                  window.location.reload();
                }}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95 cursor-pointer"
              >
                View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registry Settings Full Bleed Overlay */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] bg-[#FAFAFA] flex flex-col overflow-y-auto animate-fade-in font-sans">
          <div className="w-full max-w-4xl mx-auto py-16 px-6 sm:px-8">
            <div className="flex justify-between items-center pb-8 border-b border-gray-200 mb-12 flex-shrink-0">
              <h3 className="text-3xl font-black text-gray-900 tracking-tight">{(isAdmin && !isFoundational) ? 'Sprint Audit Diff' : 'Sprint Settings'}</h3>
              <button onClick={() => setShowSettings(false)} className="bg-white hover:bg-gray-100 border border-gray-200 shadow-sm text-gray-400 hover:text-gray-600 transition-colors p-3 rounded-2xl flex items-center justify-center cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-16">
                
                {isAdmin && !isFoundational ? (
                    <section className="space-y-8">
                        {/* FULL DIFF FOR ALL REGISTRY FIELDS */}
                        <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 mb-8">
                            <label className={labelClasses + " text-primary mb-4 block"}>Administrative Actions</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Currency</label>
                                    <CustomSelect 
                                        value={editSettings.currency || 'NGN'} 
                                        onChange={val => setEditSettings({...editSettings, currency: String(val)})}
                                        options={SUPPORTED_CURRENCIES}
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Set Sprint Price</label>
                                    <input 
                                        type="number" 
                                        value={editSettings.price || 0} 
                                        onChange={e => setEditSettings({...editSettings, price: Number(e.target.value)})}
                                        className="w-full px-6 py-4 bg-white border border-primary/20 rounded-2xl text-lg font-black text-primary shadow-sm outline-none focus:ring-4 focus:ring-primary/5"
                                        placeholder="0"
                                    />
                                    <p className="text-[8px] font-bold text-gray-400 mt-2 uppercase tracking-widest">Note: Only admins can set the final price.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <DiffHighlight label="Title" original={originalSprint?.title} updated={editSettings.title} />
                            <DiffHighlight label="Subtitle" original={originalSprint?.subtitle} updated={editSettings.subtitle} />
                            <DiffHighlight label="Cover Image URL" original={originalSprint?.coverImageUrl} updated={editSettings.coverImageUrl} />
                            <DiffHighlight label="Sprint Description / Overview" original={originalSprint?.description} updated={editSettings.description} />
                            <DiffHighlight label="Archive Outcome Tag" original={originalSprint?.outcomeTag} updated={editSettings.outcomeTag} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <DiffHighlight label="Category" original={originalSprint?.category} updated={editSettings.category} />
                                <DiffHighlight label="Audience" original={originalSprint?.audience} updated={editSettings.audience} />
                            </div>
                            <DiffHighlight label="Override Orchestrator" original={originalSprint?.overrideOrchestrator ? "Yes" : "No"} updated={editSettings.overrideOrchestrator ? "Yes" : "No"} />
                            <div className="grid grid-cols-2 gap-4">
                                <DiffHighlight label="Duration" original={originalSprint?.duration} updated={editSettings.duration} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <DiffHighlight label="Sprint Type" original={originalSprint?.sprintType} updated={editSettings.sprintType} />
                                <DiffHighlight label="Pricing Type" original={originalSprint?.pricingType} updated={editSettings.pricingType} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <DiffHighlight label="Point Cost" original={originalSprint?.pointCost} updated={editSettings.pointCost} />
                            </div>
                            <div className="mt-8 pt-8 border-t border-gray-100">
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-6">Dynamic Sections Diff</h4>
                                <DiffHighlight label="Dynamic Sections" original={originalSprint?.dynamicSections} updated={editSettings.dynamicSections} />
                            </div>
                            <div className="mt-8 pt-8 border-t border-gray-100">
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-6">Curriculum Diff</h4>
                                <DiffHighlight label="Daily Content" original={originalSprint?.dailyContent} updated={sprint?.dailyContent} />
                            </div>
                        </div>
                    </section>
                ) : (
                    <>
                        {/* Dynamic Sections Loop */}
                        {Array.isArray(editSettings.dynamicSections) && editSettings.dynamicSections.map((section, index) => {
                            if (section.id === 'identity') {
                                return (
                                    <section key={section.id} className="space-y-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-8 h-8 bg-gray-150 rounded-xl flex items-center justify-center text-gray-500 text-xs font-black">01</div>
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Sprint Identity</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <label className={labelClasses}>Sprint Title</label>
                                                <input type="text" value={editSettings.title || ''} onChange={e => setEditSettings({...editSettings, title: e.target.value})} className={registryInputClasses + " mt-2"} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className={labelClasses}>Sprint Subtitle</label>
                                                <input type="text" value={editSettings.subtitle || ''} onChange={e => setEditSettings({...editSettings, subtitle: e.target.value})} className={registryInputClasses + " mt-2"} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className={labelClasses}>Cover Image URL</label>
                                                <input type="url" value={editSettings.coverImageUrl || ''} onChange={e => setEditSettings({...editSettings, coverImageUrl: e.target.value})} className={registryInputClasses + " mt-2"} />
                                            </div>
                                        </div>
                                    </section>
                                );
                            }

                            if (section.id === 'metadata') {
                                return (
                                    <section key={section.id} className="space-y-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-8 h-8 bg-gray-150 rounded-xl flex items-center justify-center text-gray-500 text-xs font-black">03</div>
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Metadata</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div>
                                                <label className={labelClasses}>Duration (Days)</label>
                                                <CustomSelect
                                                    value={editSettings.duration || 7}
                                                    onChange={val => setEditSettings({...editSettings, duration: Number(val)})}
                                                    options={[3, 5, 7, 10, 14, 21, 30].map(d => ({ value: d, label: `${d} Continuous Days` }))}
                                                    className="mt-2"
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Discovery Category</label>
                                                <CustomSelect
                                                    value={editSettings.category || ''}
                                                    onChange={val => setEditSettings({...editSettings, category: String(val)})}
                                                    options={ALL_CATEGORIES}
                                                    className="mt-2"
                                                />
                                            </div>
                                            <div className="relative">
                                                <label className={labelClasses}>Audience</label>
                                                <div 
                                                    onClick={() => setIsAudienceDropdownOpen(!isAudienceDropdownOpen)}
                                                    className={`${registryInputClasses} mt-2 cursor-pointer flex justify-between items-center bg-white border border-gray-100 px-4 py-2.5 rounded-xl`}
                                                >
                                                    <span className="text-gray-700 font-bold text-xs select-none">
                                                        {editSettings.audience && editSettings.audience.length > 0 
                                                            ? editSettings.audience.join(", ") 
                                                            : "Select target audience..."}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">▼</span>
                                                </div>
                                                {isAudienceDropdownOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-30" onClick={() => setIsAudienceDropdownOpen(false)}></div>
                                                        <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl z-40 p-1 flex flex-col gap-0.5" onClick={e => e.stopPropagation()}>
                                                            {(() => {
                                                                const opts = ["Entrepreneur", "Business Owner", "Freelancer/Consultant", "9-5 Professional", "Student/Graduate", "Creative/Hustler"];
                                                                if (user?.role === UserRole.ADMIN) {
                                                                    opts.push("Coach");
                                                                }
                                                                return opts;
                                                            })().map(opt => {
                                                                const isSelected = editSettings.audience?.includes(opt);
                                                                return (
                                                                    <div 
                                                                        key={opt}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const currentAudience = editSettings.audience || [];
                                                                            const updated = isSelected 
                                                                                ? currentAudience.filter(x => x !== opt)
                                                                                : [...currentAudience, opt];
                                                                            setEditSettings(prev => ({ 
                                                                                ...prev, 
                                                                                audience: updated,
                                                                                overrideOrchestrator: updated.length === 0 ? false : (prev.overrideOrchestrator || false)
                                                                            }));
                                                                        }}
                                                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs font-bold transition-all ${
                                                                            isSelected 
                                                                                ? 'bg-primary/5 text-primary' 
                                                                                : 'text-gray-600 hover:bg-gray-50'
                                                                        }`}
                                                                    >
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={isSelected}
                                                                            onChange={() => {}}
                                                                            className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                                                                        />
                                                                        <span>{opt}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Sprint Type</label>
                                                <CustomSelect
                                                    value={editSettings.sprintType || 'Core'}
                                                    onChange={val => setEditSettings({...editSettings, sprintType: val as any})}
                                                    options={["Fundamentals", "Core", "Expert"]}
                                                    className="mt-2"
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Version Number</label>
                                                <input 
                                                    type="number" 
                                                    value={editSettings.versionNumber ?? 1} 
                                                    onChange={e => setEditSettings({...editSettings, versionNumber: Math.max(1, Number(e.target.value))})} 
                                                    className={registryInputClasses + " mt-2"} 
                                                    placeholder="e.g. 1"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className={labelClasses}>Version Tag (Admins/Coaches See This)</label>
                                                <input 
                                                    type="text" 
                                                    value={editSettings.versionTag || ''} 
                                                    onChange={e => setEditSettings({...editSettings, versionTag: e.target.value})} 
                                                    className={registryInputClasses + " mt-2"} 
                                                    placeholder="e.g. Redesign, A/B Test, Marketing, v1-core"
                                                />
                                            </div>
                                            <div className={`md:col-span-2 flex items-center gap-3 border rounded-2xl p-4 mt-2 transition-all ${
                                                (!editSettings.audience || editSettings.audience.length === 0)
                                                ? 'bg-gray-50 border-gray-200 opacity-60'
                                                : 'bg-[#F4F9F6] border-emerald-500/10'
                                            }`}>
                                                <input
                                                    type="checkbox"
                                                    id="overrideOrchestratorEdit"
                                                    name="overrideOrchestrator"
                                                    checked={editSettings.overrideOrchestrator || false}
                                                    disabled={!editSettings.audience || editSettings.audience.length === 0}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setEditSettings(prev => ({ ...prev, overrideOrchestrator: checked }));
                                                    }}
                                                    className="rounded border-emerald-500/30 text-emerald-600 focus:ring-emerald-500 h-4 w-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                                />
                                                <div>
                                                    <label htmlFor="overrideOrchestratorEdit" className={`block text-xs font-black uppercase tracking-wider ${
                                                        (!editSettings.audience || editSettings.audience.length === 0)
                                                        ? 'text-gray-400 cursor-not-allowed'
                                                        : 'text-gray-900 cursor-pointer'
                                                    }`}>
                                                        Override Orchestrator to appear in the Explore page
                                                    </label>
                                                    <p className={`text-[10px] font-medium ${
                                                        (!editSettings.audience || editSettings.audience.length === 0)
                                                        ? 'text-gray-400'
                                                        : 'text-emerald-700/70'
                                                    }`}>
                                                        {(!editSettings.audience || editSettings.audience.length === 0)
                                                            ? '⚠️ Select at least one target audience above to enable override.'
                                                            : 'Force this sprint to bypass orchestrator assignment and appear in the Explore page.'
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                );
                            }

                            if (section.id === 'pricing') {
                                return (
                                    <section key={section.id} className="space-y-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-8 h-8 bg-gray-150 rounded-xl flex items-center justify-center text-gray-500 text-xs font-black">04</div>
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Pricing & Economy</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div>
                                                <label className={labelClasses}>Pricing Type</label>
                                                <CustomSelect
                                                    value={editSettings.pricingType || 'cash'}
                                                    onChange={val => setEditSettings({...editSettings, pricingType: val as 'cash' | 'credits'})}
                                                    options={[
                                                        { value: "cash", label: "Cash (NGN/USD)" },
                                                        { value: "credits", label: "Credits (Points)" }
                                                    ]}
                                                    className="mt-2"
                                                />
                                            </div>
                                            {editSettings.pricingType === 'credits' ? (
                                                <div>
                                                    <label className={labelClasses}>Point Cost</label>
                                                    <input type="number" value={editSettings.pointCost || 0} onChange={e => setEditSettings({...editSettings, pointCost: Number(e.target.value)})} className={registryInputClasses + " mt-2"} placeholder="0" />
                                                </div>
                                            ) : (
                                                <div>
                                                    <label className={labelClasses}>Proposed Price (NGN)</label>
                                                    <input type="number" value={editSettings.price || 0} onChange={e => setEditSettings({...editSettings, price: Number(e.target.value)})} className={registryInputClasses + " mt-2"} placeholder="0" />
                                                    <p className="text-[8px] text-gray-400 font-bold mt-1 uppercase tracking-widest leading-relaxed">Admins will review and set the final price.</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                );
                            }

                            if (section.id === 'completion') {
                                return (
                                    <section key={section.id} className="space-y-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-8 h-8 bg-gray-150 rounded-xl flex items-center justify-center text-gray-500 text-xs font-black">05</div>
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Completion Assets & End reminders</h4>
                                        </div>
                                        <div className="space-y-6">
                                            <div>
                                                <label className={labelClasses}>Archive Outcome Tag</label>
                                                <CustomSelect
                                                    value={editSettings.outcomeTag || ''}
                                                    onChange={val => setEditSettings({...editSettings, outcomeTag: String(val)})}
                                                    options={OUTCOME_TAGS}
                                                    className="mt-2"
                                                />
                                                <p className="text-[8px] text-gray-400 font-bold mt-1 uppercase tracking-widest leading-relaxed">This appears as the badge on completed sprint cards.</p>
                                            </div>

                                            <div className="pt-6 border-t border-gray-100 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest block mb-1">Daily Check-in Reminder</label>
                                                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mb-1">Enable to stay consistent after the sprint on the last day</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditSettings({...editSettings, checkInReminder: !editSettings.checkInReminder})}
                                                        className={`w-12 h-6 rounded-full transition-all duration-300 relative ${editSettings.checkInReminder ? "bg-primary shadow-lg shadow-primary/20 animate-pulse" : "bg-gray-200"}`}
                                                    >
                                                        <div
                                                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${editSettings.checkInReminder ? "right-1" : "left-1"}`}
                                                        />
                                                    </button>
                                                </div>

                                                {editSettings.checkInReminder && (
                                                    <div className="animate-fade-in space-y-2 pt-2">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Active Duration (Days)</label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={30}
                                                            value={editSettings.checkInReminderDays || 7}
                                                            onChange={e => setEditSettings({...editSettings, checkInReminderDays: Math.max(1, Number(e.target.value))})}
                                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary"
                                                            placeholder="7"
                                                        />
                                                        <p className="text-[8px] text-gray-400 font-medium uppercase tracking-widest leading-relaxed">Number of days the check-in stays active after the sprint completes.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                );
                            }

                            if (section.id === 'overview') {
                                return (
                                    <section key={section.id} className="space-y-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-8 h-8 bg-gray-150 rounded-xl flex items-center justify-center text-gray-500 text-xs font-black">02</div>
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Sprint Overview</h4>
                                        </div>
                                        <label className={labelClasses}>
                                            Detailed Overview
                                        </label>

                                        <div className="space-y-2">
                                            <FormattingToolbar 
                                                onFormat={(prefix, suffix) => {
                                                    const textarea = document.getElementById(`section-body-${section.id}`) as HTMLTextAreaElement;
                                                    if (!textarea) return;
                                                    const start = textarea.selectionStart;
                                                    const end = textarea.selectionEnd;
                                                    const text = textarea.value;
                                                    const before = text.substring(0, start);
                                                    const selection = text.substring(start, end);
                                                    const after = text.substring(end);
                                                    const newValue = before + prefix + selection + suffix + after;
                                                    handleDynamicSectionChange(index, 'body', newValue);
                                                    setTimeout(() => {
                                                        textarea.focus();
                                                        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
                                                    }, 0);
                                                }}
                                            />
                                            <textarea 
                                                id={`section-body-${section.id}`}
                                                value={section.body} 
                                                onChange={e => handleDynamicSectionChange(index, 'body', e.target.value)}
                                                rows={12} 
                                                className={registryInputClasses + " resize-none mt-2"} 
                                                placeholder="Enter the comprehensive sprint overview..."
                                            />
                                        </div>
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                            <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Preview:</h5>
                                            <div className="bg-white rounded-xl p-4 border border-gray-100">
                                                <DynamicSectionRenderer section={section} />
                                            </div>
                                        </div>
                                    </section>
                                );
                            }

                            return null;
                        })}
                    </>
                )}

                <div className="flex gap-4 pt-6 border-t border-gray-100 flex-shrink-0">
                    <Button 
                        className="flex-1 py-4 font-black uppercase tracking-widest text-xs rounded-2xl" 
                        onClick={handleApplySettings}
                        disabled={settingsSaveStatus === 'saving'}
                    >
                        {settingsSaveStatus === 'saving' ? 'Saving...' : settingsSaveStatus === 'saved' ? 'Saved!' : isAdmin ? 'Apply Audit' : 'Save Settings'}
                    </Button>
                    <button 
                        className="flex-1 py-4 bg-white text-gray-400 font-black uppercase tracking-widest text-xs rounded-2xl border border-gray-100" 
                        onClick={() => setShowSettings(false)}
                        disabled={settingsSaveStatus === 'saving'}
                    >
                        {isAdmin ? 'Close Audit' : 'Cancel'}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}


      </div>
      
      <CoachMirrorPreviewModal 
        isOpen={showMirrorPreview} 
        onClose={() => setShowMirrorPreview(false)} 
        day={selectedDay} 
        dayContent={currentContent} 
        totalDays={sprint?.duration}
      />

      <CoachDaySuccessPreviewModal
        isOpen={showDaySuccessPreview}
        onClose={() => setShowDaySuccessPreview(false)}
        day={selectedDay}
        dayContent={currentContent}
        sprintName={sprint?.title}
      />

      {scrolledDown && !(isAdmin && !isFoundational) && !showAdvancedActionModal && (
        <button 
          type="button"
          id="fixed-save-draft-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSaveDraft();
          }}
          disabled={saveStatus === 'saving'}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 bg-primary text-white rounded-full shadow-lg hover:bg-primary/95 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer border border-primary/20"
          title="Save Draft"
        >
          {saveStatus === 'saving' ? (
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : saveStatus === 'saved' ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-white" />
          ) : (
            <Save className="h-4.5 w-4.5" />
          )}
        </button>
      )}
    </ErrorBoundary>
  );
};

// Interactive mirror report preview modal showing realistic answers formatted the way a participant sees them
interface CoachMirrorPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: number;
  dayContent: any;
  totalDays?: number;
}

const CoachMirrorPreviewModal: React.FC<CoachMirrorPreviewModalProps> = ({ isOpen, onClose, day, dayContent, totalDays }) => {
  if (!isOpen) return null;

  const prompts = dayContent?.taskPrompts || [dayContent?.taskPrompt || ''];

  const getDummyAnswerForStep = (i: number) => {
    const type = String(dayContent?.taskInputTypes?.[i] || '').trim().toLowerCase();
    if (type === 'tags') {
      let notesMap: Record<string, string> = {};
      if (dayContent?.taskTagNotes?.[i]) {
        try {
          notesMap = JSON.parse(dayContent.taskTagNotes[i]);
        } catch (e) {}
      }
      const activeTags = Object.keys(notesMap).filter(t => notesMap[t] && notesMap[t].trim() !== '');
      if (activeTags.length > 0) {
        return JSON.stringify(activeTags);
      }
      return JSON.stringify(["Mindset Shift", "Process Scale", "Goal Alignment"]);
    } else if (type === 'multiple') {
      const opts = dayContent?.taskSelectionOptions?.[i] || [];
      if (opts.length > 0 && opts[0]) return opts[0];
      return "Increase delegation and establish weekly review sprints";
    } else {
      return "Mainly focusing on automating manual database tasks to optimize our daily engineering workflow and decrease manual intervention.";
    }
  };

  const renderSubmittedAnswer = (answer: string) => {
    if (!answer) return <span className="text-gray-400 italic">No response submitted</span>;
    
    if (answer.startsWith("[") && answer.endsWith("]")) {
      try {
        const tags = JSON.parse(answer);
        if (Array.isArray(tags)) {
          return (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag, i) => (
                <span key={i} className="bg-indigo-50 text-indigo-800 border border-indigo-100 px-4 py-2 rounded-full font-black italic text-[10px] shadow-sm inline-block">
                  {tag}
                </span>
              ))}
            </div>
          );
        }
      } catch(e) {}
    }
    
    return <p className="text-gray-800 text-sm font-semibold leading-relaxed">{answer}</p>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-gray-150 flex flex-col animate-slide-up text-left">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Rise Report</h2>
              <p className="text-[10px] font-semibold text-gray-400 tracking-wide mt-1 normal-case">
                Revise on day {day} of {totalDays || 5} sprint for intentional progress
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 px-2.5 text-gray-400 hover:text-gray-600 transition-colors uppercase font-bold text-[10px] tracking-wider rounded-lg hover:bg-gray-50 flex items-center gap-1 shrink-0 cursor-pointer" 
            title="Close Preview"
          >
            <X size={15} />
            <span>Close</span>
          </button>
        </div>

        {/* Steps and responses */}
        <div className="space-y-6 flex-1 pr-1 overflow-y-auto">
          {prompts.map((prompt: string, index: number) => {
            if (!prompt || !prompt.trim()) return null;
            if (dayContent?.mirrorDisabledSteps?.[index]) return null;
            const framing = dayContent?.mirrorFraming?.[index];
            const answer = getDummyAnswerForStep(index);

            return (
              <div key={index} className="space-y-2 border-l-2 border-gray-150 pl-4 py-2 animate-fade-in">
                {/* Framing is what shows in the preview, representing/linking the question */}
                {framing ? (
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                    {framing}
                  </p>
                ) : (
                  <p className="text-xs font-bold text-gray-300 uppercase tracking-widest leading-relaxed italic">
                    [Framing Statement]
                  </p>
                )}

                {/* Participant's Response */}
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 mt-1">
                  {renderSubmittedAnswer(answer)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3 justify-between items-center bg-white shrink-0">
          <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider italic">✨ Active Coach Design Preview (Interactive)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-colors shadow-lg active:scale-95 cursor-pointer w-full sm:w-auto"
          >
            Got it, Let's Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSprint;

// Interactive Day Success Screen preview modal for coaches
interface CoachDaySuccessPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: number;
  dayContent: any;
  sprintName?: string;
}

const CoachDaySuccessPreviewModal: React.FC<CoachDaySuccessPreviewModalProps> = ({ isOpen, onClose, day, dayContent, sprintName }) => {
  useEffect(() => {
    if (isOpen) {
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3");
        audio.play().catch((e) => console.error("Sound playback deferred/failed:", e));
      } catch (e) {
        console.error("Audio initialization failed:", e);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const bridgeNote = dayContent?.bridgeNote;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-md animate-fade-in">
      <div className="bg-[#FDFDFD] rounded-[2.5rem] shadow-2xl p-6 sm:p-10 max-w-md w-full border border-gray-150 flex flex-col items-center text-center relative animate-scale-up">
        {/* Close button */}
        <button 
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          title="Close Day Success Preview"
        >
          <X size={18} />
        </button>

        {/* Header Logo */}
        <div className="mb-6">
          <LocalLogo type="green" className="h-6 w-auto text-[#0E7850]" />
        </div>

        {/* Left Aligned Celebration Header with Small Icon */}
        <div className="w-full flex items-start gap-3 sm:gap-4 text-left mb-6">
          {/* Small Celebration Icon on Left */}
          <div className="relative shrink-0 mt-0.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#0E7850] rounded-2xl flex items-center justify-center text-white shadow-md relative">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-pulse" />
            </div>
          </div>

          {/* Main Title and Subtext stacked on right */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight uppercase leading-tight">
              Day {day} Complete!
            </h2>
            <p className="text-gray-500 font-semibold text-xs uppercase tracking-wider mt-1">
              You've completed the day's sprint action step
            </p>
          </div>
        </div>

        {/* Bridge Note card */}
        <div className="w-full bg-[#0E7850]/5 border border-[#0E7850]/15 rounded-2xl p-4 mb-6 text-left">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-[#0E7850]" />
            <span className="text-[10px] font-black text-[#0E7850] uppercase tracking-wider">Bridge Note</span>
          </div>
          <p className="text-xs font-semibold text-gray-800 leading-relaxed italic">
            {bridgeNote && bridgeNote.trim() ? bridgeNote : "No bridge note set for this day yet. Add one in the Bridge Note editor section to inspire participants!"}
          </p>
        </div>

        {/* Stats card */}
        <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6 grid grid-cols-2 gap-3 text-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-amber-500 mb-0.5">
              <Flame size={16} fill="currentColor" />
              <span className="text-base font-black">1 Day</span>
            </div>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Current Streak</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-amber-600 mb-0.5">
              <Coins size={16} />
              <span className="text-base font-black">+10</span>
            </div>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Coins Unlocked</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-4 bg-[#0E7850] text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#0E7850]/90 transition-all shadow-lg shadow-[#0E7850]/20 active:scale-95 cursor-pointer"
        >
          Close Preview
        </button>

        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-4">
          ✨ Participant Day Success Screen Preview
        </span>
      </div>
    </div>
  );
};
