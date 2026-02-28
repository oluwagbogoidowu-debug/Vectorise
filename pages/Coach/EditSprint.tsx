
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sprint, DailyContent, SprintDifficulty, UserRole, Coach, DynamicSection } from '../../types';
import { sprintService } from '../../services/sprintService';
import Button from '../../components/Button';
import { isRegistryIncomplete, isSprintIncomplete } from '../../utils/sprintUtils';
import { useAuth } from '../../contexts/AuthContext';
import { ALL_CATEGORIES } from '../../services/mockData';
import { List, Plus, Trash2, Type as TypeIcon } from 'lucide-react';
import SprintCard from '../../components/SprintCard';
import LandingPreview from '../../components/LandingPreview';
import FormattedText from '../../components/FormattedText';

const SUPPORTED_CURRENCIES = ["NGN", "USD", "GHS", "KES"];

/**
 * Visual Diff Tool
 * Highlights new/modified words in bright red.
 */
const DiffHighlight: React.FC<{ original: any; updated: any; label: string }> = ({ original, updated, label }) => {
    const origStr = Array.isArray(original) 
        ? original.map(item => typeof item === 'object' ? `${item.verb}: ${item.description}` : item).join('\n')
        : String(original || '').trim();
        
    const upStr = Array.isArray(updated)
        ? updated.map(item => typeof item === 'object' ? `${item.verb}: ${item.description}` : item).join('\n')
        : String(updated || '').trim();

    const hasChanged = origStr !== upStr;

    if (!hasChanged) return (
        <div className="space-y-1">
            <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">{label}</p>
            <p className="text-xs text-gray-500 font-medium whitespace-pre-wrap">{origStr || '—'}</p>
        </div>
    );

    const origWords = origStr.split(/\s+/);
    const upWords = upStr.split(/\s+/);

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
                            const isNew = !origWords.includes(word);
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

const FormattingToolbar: React.FC<{
    textareaRef: React.RefObject<HTMLTextAreaElement | null>; 
    onUpdate: (value: string) => void;
}> = ({ textareaRef, onUpdate }) => {
    const handleFormat = (type: 'bold' | 'italic' | 'bullet' | 'number') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const selected = text.substring(start, end);
        const after = text.substring(end);

        let newContent = '';
        let newCursorPos = start;

        switch (type) {
            case 'bold':
                newContent = `${before}*${selected || 'bold text'}*${after}`;
                newCursorPos = selected ? end + 2 : start + 1;
                break;
            case 'italic':
                newContent = `${before}_${selected || 'italic text'}_${after}`;
                newCursorPos = selected ? end + 2 : start + 1;
                break;
            case 'bullet':
                newContent = `${before}${before.endsWith('\n') || before === '' ? '' : '\n'}- ${selected || 'list item'}${after}`;
                newCursorPos = newContent.length - after.length;
                break;
            case 'number':
                newContent = `${before}${before.endsWith('\n') || before === '' ? '' : '\n'}1. ${selected || 'list item'}${after}`;
                newCursorPos = newContent.length - after.length;
                break;
        }

        onUpdate(newContent);
        
        // Refocus and set cursor
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const Btn = ({ onClick, children, title }: { onClick: () => void, children?: React.ReactNode, title: string }) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-primary hover:border-primary/20 hover:shadow-sm transition-all active:scale-90"
        >
            {children}
        </button>
    );

    return (
        <div className="flex gap-1 mb-2">
            <Btn onClick={() => handleFormat('bold')} title="Bold">
                <span className="font-black text-xs">B</span>
            </Btn>
            <Btn onClick={() => handleFormat('italic')} title="Italic">
                <span className="italic font-serif text-sm">I</span>
            </Btn>
            <Btn onClick={() => handleFormat('bullet')} title="Bullet List">
                <span className="text-base leading-none">•</span>
            </Btn>
            <Btn onClick={() => handleFormat('number')} title="Numbered List">
                <span className="text-[10px] font-black leading-none">1.</span>
            </Btn>
        </div>
    );
};




const getPendingChanges = (original: Sprint, updated: Sprint): Partial<Sprint> => {
    const changes: Partial<Sprint> = {};

    // Compare top-level fields
    if (original.title !== updated.title) changes.title = updated.title;
    if (original.subtitle !== updated.subtitle) changes.subtitle = updated.subtitle;
    if (original.coverImageUrl !== updated.coverImageUrl) changes.coverImageUrl = updated.coverImageUrl;
    if (original.transformation !== updated.transformation) changes.transformation = updated.transformation;
    if (original.description !== updated.description) changes.description = updated.description;
    if (original.category !== updated.category) changes.category = updated.category;
    if (original.difficulty !== updated.difficulty) changes.difficulty = updated.difficulty;
    if (original.price !== updated.price) changes.price = updated.price;
    if (original.currency !== updated.currency) changes.currency = updated.currency;
    if (original.pointCost !== updated.pointCost) changes.pointCost = updated.pointCost;
    if (original.pricingType !== updated.pricingType) changes.pricingType = updated.pricingType;
    if (original.duration !== updated.duration) changes.duration = updated.duration;
    if (original.protocol !== updated.protocol) changes.protocol = updated.protocol;
    if (original.outcomeTag !== updated.outcomeTag) changes.outcomeTag = updated.outcomeTag;
    if (original.outcomeStatement !== updated.outcomeStatement) changes.outcomeStatement = updated.outcomeStatement;

    // Compare array fields (simple string arrays)
    if (JSON.stringify(original.forWho) !== JSON.stringify(updated.forWho)) changes.forWho = updated.forWho;
    if (JSON.stringify(original.notForWho) !== JSON.stringify(updated.notForWho)) changes.notForWho = updated.notForWho;
    if (JSON.stringify(original.outcomes) !== JSON.stringify(updated.outcomes)) changes.outcomes = updated.outcomes;

    // Compare methodSnapshot (array of objects)
    if (JSON.stringify(original.methodSnapshot) !== JSON.stringify(updated.methodSnapshot)) changes.methodSnapshot = updated.methodSnapshot;

    // Compare dailyContent
    const changedDailyContent: DailyContent[] = [];
    updated.dailyContent.forEach(updatedDay => {
        const originalDay = original.dailyContent.find(d => d.day === updatedDay.day);
        if (!originalDay || 
            originalDay.lessonText !== updatedDay.lessonText ||
            originalDay.taskPrompt !== updatedDay.taskPrompt ||
            originalDay.coachInsight !== updatedDay.coachInsight ||
            originalDay.proofType !== updatedDay.proofType ||
            JSON.stringify(originalDay.proofOptions) !== JSON.stringify(updatedDay.proofOptions) ||
            originalDay.reflectionQuestion !== updatedDay.reflectionQuestion
        ) {
            changedDailyContent.push(updatedDay);
        }
    });
    if (changedDailyContent.length > 0) {
        changes.dailyContent = changedDailyContent;
    }

    // Compare dynamicSections
    const changedDynamicSections = updated.dynamicSections?.filter(updatedSection => {
        const originalSection = original.dynamicSections?.find(s => s.id === updatedSection.id);
        return !originalSection || 
               originalSection.title !== updatedSection.title || 
               originalSection.body !== updatedSection.body;
    });
    if (changedDynamicSections && changedDynamicSections.length > 0) {
        changes.dynamicSections = changedDynamicSections;
    }

    return changes;
};


const EditSprint: React.FC = () => {
  const { sprintId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [originalSprint, setOriginalSprint] = useState<Sprint | null>(null);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [approvalStatus, setApprovalStatus] = useState<'idle' | 'processing'>('idle');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [previewType, setPreviewType] = useState<'card' | 'landing' | 'daily'>('daily');
  const [editSettings, setEditSettings] = useState<Partial<Sprint>>({});
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>({});

  // Input Refs for toolbars
  const lessonTextRef = useRef<HTMLTextAreaElement>(null);
  const taskPromptRef = useRef<HTMLTextAreaElement>(null);
  const coachInsightRef = useRef<HTMLTextAreaElement>(null);

  const isAdmin = user?.role === UserRole.ADMIN;
  
  const isFoundational = useMemo(() => {
    const cat = editSettings.category || sprint?.category;
    return cat === 'Core Platform Sprint' || cat === 'Growth Fundamentals';
  }, [editSettings.category, sprint?.category]);

  const canEditDirectly = !isAdmin || (isAdmin && isFoundational);

  const registryIncomplete = useMemo(() => sprint ? isRegistryIncomplete(sprint) : true, [sprint]);
  const curriculumIncomplete = useMemo(() => sprint ? isSprintIncomplete(sprint) : true, [sprint]);

  useEffect(() => {
    const fetchData = async () => {
      if (!sprintId || !user) return;
      try {
        const found = await sprintService.getSprintById(sprintId);
        if (found) {
          setOriginalSprint(found);
          const merged: Sprint = {
              ...found,
              ...(found.pendingChanges || {}),
              dailyContent: found.pendingChanges?.dailyContent || found.dailyContent,
              outcomes: found.pendingChanges?.outcomes || found.outcomes,
              forWho: found.pendingChanges?.forWho || found.forWho,
              notForWho: found.pendingChanges?.notForWho || found.notForWho,
              methodSnapshot: found.pendingChanges?.methodSnapshot || found.methodSnapshot
          };
          
          setSprint(merged);
          setReviewFeedback(found.reviewFeedback || {});
          setEditSettings({
            title: merged.title,
            subtitle: merged.subtitle,
            coverImageUrl: merged.coverImageUrl,
            // Initialize dynamic sections from existing sprint data
            dynamicSections: merged.dynamicSections || [
              { id: 'transformation', title: 'Transformation Statement', body: merged.transformation || merged.description, type: 'text' as const },
              { id: 'forWho', title: 'Target Signals (Who it\'s for)', body: (merged.forWho || ['', '', '', '']).join('\n'), type: 'list' as const },
              { id: 'notForWho', title: 'Exclusions (Who it\'s not for)', body: (merged.notForWho || ['', '', '']).join('\n'), type: 'list' as const },
              { id: 'methodSnapshot', title: 'Method Snapshot', body: (merged.methodSnapshot || [{ verb: '', description: '' }, { verb: '', description: '' }, { verb: '', description: '' }]).map(m => `${m.verb}: ${m.description}`).join('\n'), type: 'list' as const },
              { id: 'outcomes', title: 'Evidence of Completion', body: (merged.outcomes && merged.outcomes.length > 0 ? merged.outcomes : ['', '', '']).join('\n'), type: 'list' as const },
              { id: 'metadata', title: 'Metadata', body: `Category: ${merged.category}\nDifficulty: ${merged.difficulty}\nDuration: ${merged.duration} Days\nProtocol: ${merged.protocol}`, type: 'text' as const },
              { id: 'completionAssets', title: 'Completion Assets', body: `Archive Outcome Tag: ${merged.outcomeTag || ''}\nOutcome Statement: ${merged.outcomeStatement || 'Focus creates feedback. *Feedback creates clarity.*'}`, type: 'text' as const }
            ],
            // Keep other settings for now, will integrate into dynamic sections or fixed identity later
            category: merged.category,
            difficulty: merged.difficulty,
            price: merged.price,
            currency: merged.currency || 'NGN',
            pointCost: merged.pointCost,
            pricingType: merged.pricingType || 'cash',
            duration: merged.duration,
            protocol: merged.protocol || 'One action per day',
            outcomeTag: merged.outcomeTag || '',
            outcomeStatement: merged.outcomeStatement || 'Focus creates feedback. *Feedback creates clarity.*'
          });
        } else { navigate('/dashboard'); }
      } catch (err) { navigate('/dashboard'); }
    };
    fetchData();
  }, [sprintId, navigate, user]);

  const currentContent = useMemo(() => {
    if (!sprint) return {
      day: selectedDay, lessonText: '', taskPrompt: '', coachInsight: '', proofType: 'confirmation' as const, proofOptions: [], reflectionQuestion: ''
    };
    return (sprint.dailyContent.find(c => c.day === selectedDay)) || {
      day: selectedDay, lessonText: '', taskPrompt: '', coachInsight: '', proofType: 'confirmation' as const, proofOptions: [], reflectionQuestion: ''
    };
  }, [sprint, selectedDay]);

  const handleContentChange = (field: keyof DailyContent, value: any) => {
    if (!sprint || !canEditDirectly) return;
    setSprint(prev => {
      if (!prev) return null;
      const existingContentIndex = prev.dailyContent.findIndex(c => c.day === selectedDay);
      let updatedDailyContent = [...prev.dailyContent];
      if (existingContentIndex >= 0) {
        updatedDailyContent[existingContentIndex] = { ...updatedDailyContent[existingContentIndex], [field]: value };
      } else {
        updatedDailyContent.push({ 
          day: selectedDay, 
          lessonText: '', 
          taskPrompt: '', 
          coachInsight: '', 
          proofType: 'confirmation', 
          proofOptions: [], 
          reflectionQuestion: '', 
          [field]: value 
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
      const changes = getPendingChanges(originalSprint, sprint);
      const updatedSprintData: Partial<Sprint> = {
          pendingChanges: changes,
      };

      if (isAdmin && isFoundational) {
          updatedSprintData.published = true;
          updatedSprintData.approvalStatus = 'approved';
      } else if (!isAdmin && sprint.approvalStatus === 'rejected') {
          updatedSprintData.approvalStatus = 'draft';
      }

      await sprintService.updateSprint(sprint.id, updatedSprintData, isAdmin);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) { setSaveStatus('idle'); alert("Save failed."); }
  };

  const handleSubmitForReview = async () => {
      if (!sprint || !originalSprint || isSubmittingReview) return;
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
          await sprintService.approveSprint(sprintId, editSettings);
          alert("Updates approved and pushed live.");
          navigate('/admin/dashboard');
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
          navigate('/admin/dashboard');
      } catch (err) { setApprovalStatus('idle'); }
  };

  const handleApplySettings = async () => {
    if (!sprint) return;

    let updatedSprintData: Partial<Sprint> = {
      title: editSettings.title,
      subtitle: editSettings.subtitle,
      coverImageUrl: editSettings.coverImageUrl,
      dynamicSections: editSettings.dynamicSections,
      // Keep other metadata fields for now, as they are still directly editable in the modal
      category: editSettings.category,
      difficulty: editSettings.difficulty,
      price: editSettings.price,
      currency: editSettings.currency,
      pointCost: editSettings.pointCost,
      pricingType: editSettings.pricingType,
      duration: editSettings.duration,
      protocol: editSettings.protocol,
      outcomeTag: editSettings.outcomeTag,
      outcomeStatement: editSettings.outcomeStatement,
    };

    // Parse dynamic sections back into sprint properties
    editSettings.dynamicSections?.forEach(section => {
      switch (section.id) {
        case 'transformation':
          updatedSprintData.transformation = section.body;
          updatedSprintData.description = section.body; // Transformation is also the main description
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
        case 'metadata':
          // Metadata is handled by direct editSettings fields for now
          // Will need to parse if we move these into the dynamic section body for editing
          break;
        case 'completionAssets':
          // Completion Assets are handled by direct editSettings fields for now
          break;
      }
    });

    const updatedLocalSprint = { ...sprint, ...updatedSprintData as any };
    setSprint(updatedLocalSprint);
    setShowSettings(false);
  };

  const handleDynamicSectionChange = (index: number, field: 'title' | 'body' | 'type', value: any) => {
    const newSections = [...(editSettings.dynamicSections || [])];
    newSections[index] = { ...newSections[index], [field]: value };
    setEditSettings({ ...editSettings, dynamicSections: newSections });
  };

  const handleListChange = (sectionIndex: number, itemIndex: number, value: string) => {
    const section = editSettings.dynamicSections![sectionIndex];
    const items = section.body.split('\n');
    items[itemIndex] = value;
    handleDynamicSectionChange(sectionIndex, 'body', items.join('\n'));
  };

  const addListItem = (sectionIndex: number) => {
    const section = editSettings.dynamicSections![sectionIndex];
    const items = section.body ? section.body.split('\n') : [];
    handleDynamicSectionChange(sectionIndex, 'body', [...items, ''].join('\n'));
  };

  const removeListItem = (sectionIndex: number, itemIndex: number) => {
    const section = editSettings.dynamicSections![sectionIndex];
    const items = section.body.split('\n');
    const newItems = items.filter((_, i) => i !== itemIndex);
    handleDynamicSectionChange(sectionIndex, 'body', newItems.join('\n'));
  };

  if (!sprint) return <div className="p-8 text-center text-gray-500">Loading Registry...</div>;

  const editorInputClasses = "w-full p-6 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-medium transition-all placeholder-gray-300 resize-none disabled:bg-gray-50 disabled:text-gray-500 disabled:italic";
  const registryInputClasses = "w-full px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:italic";
  const labelClasses = "text-[11px] font-black text-gray-400 uppercase tracking-widest";

  const isDayComplete = (day: number) => {
    if (!sprint) return false;
    const content = sprint.dailyContent.find(c => c.day === day);
    return !!(content && content.lessonText?.trim() && content.taskPrompt?.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 pb-32">

      
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <button onClick={() => navigate(-1)} className="group flex items-center text-gray-400 hover:text-primary transition-colors mb-4 text-[10px] font-black uppercase tracking-widest cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              Go Back
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">{sprint.title}</h1>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowSettings(true)} className="p-2 bg-white text-primary rounded-xl border border-primary/10 hover:bg-primary hover:text-white transition-all shadow-sm flex items-center gap-2 group cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">{(isAdmin && !isFoundational) ? 'Audit Registry' : 'Registry'}</span>
                </button>
                <button onClick={() => navigate(`/coach/sprint/preview/${sprintId}`)} className="p-2 bg-white text-gray-400 rounded-xl border border-gray-100 hover:text-primary transition-all shadow-sm flex items-center gap-2 group cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">Preview</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {isAdmin && !isFoundational ? (
                <>
                    <button onClick={handleAdminApprove} disabled={approvalStatus === 'processing'} className="bg-green-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl px-6 py-3 shadow-lg hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50">Approve & Push Updates</button>
                    <button onClick={handleAdminAmend} disabled={approvalStatus === 'processing'} className="bg-orange-50 text-white font-black uppercase tracking-widest text-[10px] rounded-xl px-6 py-3 shadow-lg hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50">Request Fixes</button>
                </>
            ) : (
                <>
                    <Button variant="secondary" onClick={handleSaveDraft} disabled={saveStatus === 'saving'} className="bg-white border-gray-200 text-gray-600 font-black uppercase tracking-widest text-[10px] rounded-xl px-6">
                      {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Draft'}
                    </Button>
                    {!isAdmin && (
                        <Button 
                            onClick={handleSubmitForReview} 
                            isLoading={isSubmittingReview}
                            disabled={registryIncomplete || curriculumIncomplete || isSubmittingReview} 
                            className="font-black uppercase tracking-widest text-[10px] rounded-xl px-6"
                        >
                        {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                        </Button>
                    )}
                </>
            )}
          </div>
        </header>

        <div className="flex flex-col gap-8">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden p-6">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 px-1">Curriculum Timeline</h2>
            <div className="flex overflow-x-auto gap-3 hide-scrollbar">
              {Array.from({ length: sprint.duration }, (_, i) => i + 1).map((day) => (
                <button key={day} onClick={() => setSelectedDay(day)} className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl border transition-all duration-300 relative ${selectedDay === day ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-105' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-primary/30 hover:text-primary hover:bg-white'}`}>
                  {isDayComplete(day) && <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${selectedDay === day ? 'bg-white' : 'bg-primary'}`}></div>}
                  <span className="text-[10px] font-black uppercase tracking-tight">Day</span>
                  <span className="font-black text-2xl leading-none">{day}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 animate-fade-in" key={selectedDay}>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className={labelClasses}>Today's Insight</label>
                {canEditDirectly && (
                    <FormattingToolbar 
                        textareaRef={lessonTextRef} 
                        onUpdate={(v) => handleContentChange('lessonText', v)} 
                    />
                )}
              </div>
              {isAdmin && !isFoundational ? (
                  <DiffHighlight 
                    label="Today's Insight" 
                    original={originalSprint?.dailyContent.find(c => c.day === selectedDay)?.lessonText} 
                    updated={currentContent.lessonText} 
                  />
              ) : (
                  <textarea 
                    ref={lessonTextRef}
                    value={currentContent.lessonText || ''} 
                    onChange={e => handleContentChange('lessonText', e.target.value)} 
                    rows={8} 
                    className={editorInputClasses} 
                    placeholder="Coach curriculum goes here..." 
                  />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className={labelClasses}>Today's Action Step</label>
                {canEditDirectly && (
                    <FormattingToolbar 
                        textareaRef={taskPromptRef} 
                        onUpdate={(v) => handleContentChange('taskPrompt', v)} 
                    />
                )}
              </div>
              {isAdmin && !isFoundational ? (
                  <DiffHighlight 
                    label="Today's Action Step" 
                    original={originalSprint?.dailyContent.find(c => c.day === selectedDay)?.taskPrompt} 
                    updated={currentContent.taskPrompt} 
                  />
              ) : (
                  <textarea 
                    ref={taskPromptRef}
                    value={currentContent.taskPrompt || ''} 
                    onChange={e => handleContentChange('taskPrompt', e.target.value)} 
                    rows={4} 
                    className={editorInputClasses} 
                    placeholder="Daily task prompt..." 
                  />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className={labelClasses}>Coach Insight</label>
                {canEditDirectly && (
                    <FormattingToolbar 
                        textareaRef={coachInsightRef} 
                        onUpdate={(v) => handleContentChange('coachInsight', v)} 
                    />
                )}
              </div>
              {isAdmin && !isFoundational ? (
                  <DiffHighlight 
                    label="Coach Insight" 
                    original={originalSprint?.dailyContent.find(c => c.day === selectedDay)?.coachInsight} 
                    updated={currentContent.coachInsight} 
                  />
              ) : (
                  <textarea 
                    ref={coachInsightRef}
                    value={currentContent.coachInsight || ''} 
                    onChange={e => handleContentChange('coachInsight', e.target.value)} 
                    rows={3} 
                    className={editorInputClasses} 
                    placeholder="A nugget of wisdom to ground the user..." 
                  />
              )}
            </div>

            {/* COMPLETION PROTOCOL CURATION */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8">
               <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] border-b border-gray-50 pb-4">Day {selectedDay} Completion Protocol</h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                       <label className={labelClasses}>Proof Method</label>
                       <div className="flex flex-col gap-2">
                           {[{
                                id: 'confirmation', label: 'Simple Button', d: '"Today\'s task completed"' 
                           },{
                                id: 'picker', label: 'Micro Picker', d: 'Choose from options curated by you' 
                           },{
                                id: 'note', label: 'Send Submission', d: 'User must write a response' 
                           }].map(p => (
                               <button 
                                   key={p.id}
                                   type="button"
                                   onClick={() => handleContentChange('proofType', p.id)}
                                   className={`text-left p-4 rounded-2xl border transition-all ${currentContent.proofType === p.id ? 'bg-primary/5 border-primary shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200'}`}
                               >
                                   <p className={`text-xs font-black uppercase tracking-tight ${currentContent.proofType === p.id ? 'text-primary' : 'text-gray-500'}`}>{p.label}</p>
                                   <p className="text-[10px] font-medium opacity-60 mt-1">{p.d}</p>
                               </button>
                           ))}
                       </div>
                   </div>

                   <div className="space-y-6">
                       {currentContent.proofType === 'picker' && (
                           <div className="space-y-3 animate-fade-in">
                               <label className={labelClasses}>Picker Options (comma separated)</label>
                               <textarea 
                                   value={currentContent.proofOptions?.join(', ') || ''}
                                   onChange={e => handleContentChange('proofOptions', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                                   className={editorInputClasses + " h-24"}
                                   placeholder="Completed first draft, Sent outreach emails, Updated LinkedIn profile..."
                               />
                               <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">User must select one to mark day complete.</p>
                           </div>
                       )}

                       <div className="space-y-3">
                           <label className={labelClasses}>Reflection Question</label>
                           <textarea 
                               value={currentContent.reflectionQuestion || ''}
                               onChange={e => handleContentChange('reflectionQuestion', e.target.value)}
                               className={editorInputClasses + " h-24"}
                               placeholder="e.g. One idea that shifted my thinking was..."
                           />
                           <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Curate the prompt for the end-of-day reflection modal.</p>
                       </div>
                   </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registry Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-8 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">{(isAdmin && !isFoundational) ? 'Sprint Audit Diff' : 'Sprint Settings'}</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-10 overflow-y-auto space-y-12 custom-scrollbar">
                
                {isAdmin && !isFoundational ? (
                    <section className="space-y-8">
                        {/* FULL DIFF FOR ALL REGISTRY FIELDS */}
                        <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 mb-8">
                            <label className={labelClasses + " text-primary mb-4 block"}>Administrative Actions</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Currency</label>
                                    <select 
                                        value={editSettings.currency || 'NGN'} 
                                        onChange={e => setEditSettings({...editSettings, currency: e.target.value})}
                                        className="w-full px-6 py-4 bg-white border border-primary/20 rounded-2xl text-lg font-black text-primary shadow-sm outline-none"
                                    >
                                        {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
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
                            <DiffHighlight label="Transformation Statement" original={originalSprint?.transformation || originalSprint?.description} updated={editSettings.transformation} />
                            <DiffHighlight label="Target Signals (forWho)" original={originalSprint?.forWho} updated={editSettings.forWho} />
                            <DiffHighlight label="Exclusions (notForWho)" original={originalSprint?.notForWho} updated={editSettings.notForWho} />
                            <DiffHighlight label="Method Snapshot" original={originalSprint?.methodSnapshot} updated={editSettings.methodSnapshot} />
                            <DiffHighlight label="Evidence of Completion (outcomes)" original={originalSprint?.outcomes} updated={editSettings.outcomes} />
                            <DiffHighlight label="Archive Outcome Tag" original={originalSprint?.outcomeTag} updated={editSettings.outcomeTag} />
                            <DiffHighlight label="The Outcome Statement" original={originalSprint?.outcomeStatement} updated={editSettings.outcomeStatement} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <DiffHighlight label="Category" original={originalSprint?.category} updated={editSettings.category} />
                                <DiffHighlight label="Difficulty" original={originalSprint?.difficulty} updated={editSettings.difficulty} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <DiffHighlight label="Duration" original={originalSprint?.duration} updated={editSettings.duration} />
                                <DiffHighlight label="Protocol" original={originalSprint?.protocol} updated={editSettings.protocol} />
                            </div>
                        </div>
                    </section>
                ) : (
                    <>
                        {/* 01 Sprint Identity (Fixed Part) */}
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] border-b border-gray-50 pb-2">01 Sprint Identity</h4>
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

                        {/* Dynamic Sections */}
                        {editSettings.dynamicSections?.map((section, index) => (
                            <section key={section.id} className="space-y-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-4">
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{section.title}</h4>
                                    <button 
                                        onClick={() => {
                                            const newSections = editSettings.dynamicSections?.filter(s => s.id !== section.id);
                                            setEditSettings({ ...editSettings, dynamicSections: newSections });
                                        }}
                                        className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full"
                                        title="Remove section"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                <label className={labelClasses}>Section Title</label>
                                <input 
                                    type="text" 
                                    value={section.title} 
                                    onChange={e => {
                                        const newSections = [...(editSettings.dynamicSections || [])];
                                        newSections[index] = { ...newSections[index], title: e.target.value };
                                        setEditSettings({ ...editSettings, dynamicSections: newSections });
                                    }}
                                    className={registryInputClasses + " mt-2"} 
                                />
                                <label className={labelClasses + " mt-4 flex items-center justify-between"}>
                                    Section Body
                                    <button 
                                        type="button"
                                        onClick={() => handleDynamicSectionChange(index, 'type', section.type === 'list' ? 'text' : 'list')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-primary hover:bg-primary/5 transition-all border border-gray-100"
                                        title={section.type === 'list' ? "Switch to Text" : "Switch to List"}
                                    >
                                        {section.type === 'list' ? <TypeIcon className="w-3 h-3" /> : <List className="w-3 h-3" />}
                                        {section.type === 'list' ? "Text Mode" : "List Mode"}
                                    </button>
                                </label>

                                {section.type === 'list' ? (
                                    <div className="space-y-3 mt-2">
                                        {(section.body ? section.body.split('\n') : ['']).map((item, itemIdx) => (
                                            <div key={itemIdx} className="flex gap-2 group/item">
                                                <div className="flex-1 relative">
                                                    <input 
                                                        type="text"
                                                        value={item}
                                                        onChange={(e) => handleListChange(index, itemIdx, e.target.value)}
                                                        className={registryInputClasses}
                                                        placeholder={`Item ${itemIdx + 1}...`}
                                                    />
                                                    <div className="absolute left-[-1.5rem] top-1/2 -translate-y-1/2 w-1 h-1 bg-primary/30 rounded-full group-hover/item:bg-primary transition-colors"></div>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => removeListItem(index, itemIdx)}
                                                    className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button 
                                            type="button"
                                            onClick={() => addListItem(index)}
                                            className="w-full py-3 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Add Item
                                        </button>
                                    </div>
                                ) : (
                                    <textarea 
                                        value={section.body} 
                                        onChange={e => handleDynamicSectionChange(index, 'body', e.target.value)}
                                        rows={6} 
                                        className={registryInputClasses + " resize-none mt-2"} 
                                        placeholder="Enter section content..."
                                    />
                                )}
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Preview:</h5>
                                    <div className="prose prose-sm max-w-none text-gray-800 font-medium leading-relaxed">
                                        <FormattedText text={section.body} />
                                    </div>
                                </div>
                            </section>
                        ))}

                        <Button 
                            onClick={() => {
                                const newSection: DynamicSection = {
                                    id: `custom-${Date.now()}`,
                                    title: 'New Custom Section',
                                    body: 'Content for your new section.'
                                };
                                setEditSettings({ ...editSettings, dynamicSections: [...(editSettings.dynamicSections || []), newSection] });
                            }}
                            variant="secondary"
                            className="w-full py-4 text-primary border-primary/20 hover:bg-primary/5"
                        >
                            + Add New Section
                        </Button>

                        {/* Metadata and Completion Assets (still fixed for now, will integrate into dynamic sections if needed) */}
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] border-b border-gray-50 pb-2">Metadata</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className={labelClasses}>Duration (Days)</label>
                                    <select value={editSettings.duration || 7} onChange={e => setEditSettings({...editSettings, duration: Number(e.target.value)})} className={registryInputClasses + " mt-2"}>
                                        {[3, 5, 7, 10, 14, 21, 30].map(d => <option key={d} value={d}>{d} Continuous Days</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClasses}>Discovery Category</label>
                                    <select value={editSettings.category || ''} onChange={e => setEditSettings({...editSettings, category: e.target.value})} className={registryInputClasses + " mt-2"}>
                                        {ALL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClasses}>Difficulty</label>
                                    <select value={editSettings.difficulty || 'Beginner'} onChange={e => setEditSettings({...editSettings, difficulty: e.target.value as SprintDifficulty})} className={registryInputClasses + " mt-2"}>
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClasses}>Protocol</label>
                                    <select value={editSettings.protocol || 'One action per day'} onChange={e => setEditSettings({...editSettings, protocol: e.target.value as 'One action per day' | 'Guided task' | 'Challenge-based'})} className={registryInputClasses + " mt-2"}>
                                        <option value="One action per day">One action per day</option>
                                        <option value="Guided task">Guided task</option>
                                        <option value="Challenge-based">Challenge-based</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] border-b border-gray-50 pb-2">Completion Assets</h4>
                            <div className="space-y-6">
                                <div>
                                    <label className={labelClasses}>Archive Outcome Tag</label>
                                    <input type="text" value={editSettings.outcomeTag || ''} onChange={e => setEditSettings({...editSettings, outcomeTag: e.target.value})} className={registryInputClasses + " mt-2"} placeholder="e.g. Clarity gained" />
                                    <p className="text-[8px] text-gray-400 font-bold mt-1 uppercase tracking-widest leading-relaxed">This appears as the badge on completed sprint cards.</p>
                                </div>
                            </div>
                        </section>
                    </>
                )}

                <div className="flex gap-4 pt-6 border-t border-gray-100 flex-shrink-0">
                    {(!isAdmin || isFoundational) && (
                        <Button className="flex-1 py-4 font-black uppercase tracking-widest text-xs rounded-2xl" onClick={handleApplySettings}>
                            Apply Settings
                        </Button>
                    )}
                    <button className="flex-1 py-4 bg-white text-gray-400 font-black uppercase tracking-widest text-xs rounded-2xl border border-gray-100" onClick={() => setShowSettings(false)}>{isAdmin ? 'Close Audit' : 'Cancel'}</button>
                </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default EditSprint;
