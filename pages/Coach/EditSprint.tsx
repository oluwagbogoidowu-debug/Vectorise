import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sprint, DailyContent, SprintDifficulty, UserRole, Coach } from '../../types';
import { sprintService } from '../../services/sprintService';
import Button from '../../components/Button';
import { isRegistryIncomplete, isSprintIncomplete } from '../../utils/sprintUtils';
import { useAuth } from '../../contexts/AuthContext';
import { ALL_CATEGORIES } from '../../services/mockData';
import SprintCard from '../../components/SprintCard';
import LandingPreview from '../../components/LandingPreview';

/**
 * Visual Diff Tool
 * Highlights new/modified words in bright red.
 */
const DiffHighlight: React.FC<{ original: any; updated: any; label: string }> = ({ original, updated, label }) => {
    const origStr = String(original || '').trim();
    const upStr = String(updated || '').trim();
    const hasChanged = origStr !== upStr;

    if (!hasChanged) return (
        <div className="space-y-1">
            <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">{label}</p>
            <p className="text-xs text-gray-500 font-medium">{origStr || '—'}</p>
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
                    <p className="text-xs text-gray-400 line-through decoration-gray-300">{origStr}</p>
                </div>
                <div>
                    <p className="text-[7px] font-black text-red-400 uppercase mb-1">Proposed Update:</p>
                    <div className="text-sm font-bold text-gray-900 leading-relaxed">
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

const SubmissionSuccessModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-dark/95 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden animate-slide-up flex flex-col p-10 text-center">
            <div className="w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-primary/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-4 italic">Registry Updated.</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-10 italic">
                "Your sprint changes have been submitted for audit. Admin will verify the updates before they go live."
            </p>
            <button 
                onClick={onClose}
                className="w-full py-4 bg-primary text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
                Return to Registry
            </button>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        </div>
    </div>
);

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewType, setPreviewType] = useState<'card' | 'landing'>('card');
  const [editSettings, setEditSettings] = useState<Partial<Sprint>>({});
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>({});

  const isAdmin = user?.role === UserRole.ADMIN;
  
  const isFoundational = useMemo(() => {
    const cat = editSettings.category || sprint?.category;
    return cat === 'Core Platform Sprint' || cat === 'Growth Fundamentals';
  }, [editSettings.category, sprint?.category]);

  const canEditDirectly = !isAdmin || (isAdmin && isFoundational);

  // Added logic to track if registry or curriculum is incomplete for submission validation
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
            description: merged.description,
            transformation: merged.transformation || merged.description,
            outcomeTag: merged.outcomeTag || '',
            outcomeStatement: merged.outcomeStatement || 'Focus creates feedback. *Feedback creates clarity.*',
            category: merged.category,
            difficulty: merged.difficulty,
            price: merged.price,
            pointCost: merged.pointCost,
            pricingType: merged.pricingType || 'cash',
            duration: merged.duration,
            protocol: merged.protocol || 'One action per day',
            coverImageUrl: merged.coverImageUrl,
            outcomes: merged.outcomes && merged.outcomes.length > 0 ? merged.outcomes : ['', '', ''],
            forWho: merged.forWho || ['', '', '', ''],
            notForWho: merged.notForWho || ['', '', ''],
            methodSnapshot: merged.methodSnapshot || [
                { verb: '', description: '' },
                { verb: '', description: '' },
                { verb: '', description: '' }
            ]
          });
        } else { navigate('/dashboard'); }
      } catch (err) { navigate('/dashboard'); }
    };
    fetchData();
  }, [sprintId, navigate, user]);

  const currentContent = (sprint?.dailyContent.find(c => c.day === selectedDay)) || {
    day: selectedDay, lessonText: '', taskPrompt: '', proofType: 'confirmation', proofOptions: []
  };

  const handleContentChange = (field: keyof DailyContent, value: any) => {
    if (!sprint || !canEditDirectly) return;
    setSprint(prev => {
      if (!prev) return null;
      const existingContentIndex = prev.dailyContent.findIndex(c => c.day === selectedDay);
      let updatedDailyContent = [...prev.dailyContent];
      if (existingContentIndex >= 0) {
        updatedDailyContent[existingContentIndex] = { ...updatedDailyContent[existingContentIndex], [field]: value };
      } else {
        updatedDailyContent.push({ day: selectedDay, lessonText: '', taskPrompt: '', [field]: value });
      }
      return { ...prev, dailyContent: updatedDailyContent };
    });
    setSaveStatus('idle');
  };

  const handleSaveDraft = async () => {
    if (!sprint) return;
    setSaveStatus('saving');
    try {
      const updatedSprint = { ...sprint };
      if (isAdmin && isFoundational) {
          updatedSprint.published = true;
          updatedSprint.approvalStatus = 'approved';
      } else if (!isAdmin && updatedSprint.approvalStatus === 'rejected') {
          updatedSprint.approvalStatus = 'draft';
      }
      await sprintService.updateSprint(sprint.id, updatedSprint, isAdmin);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) { setSaveStatus('idle'); alert("Save failed."); }
  };

  const handleSubmitForReview = async () => {
      if (!sprint || isSubmittingReview) return;
      setIsSubmittingReview(true);
      try {
          await sprintService.updateSprint(sprint.id, { 
              ...sprint, 
              approvalStatus: 'pending_approval' 
          });
          setShowSuccessModal(true);
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
    const finalSettings = {
        ...editSettings,
        description: editSettings.transformation || editSettings.description,
    };
    const updatedLocalSprint = { ...sprint, ...finalSettings as any };
    setSprint(updatedLocalSprint);
    setShowSettings(false);
  };

  const handleArrayChange = (field: 'forWho' | 'notForWho' | 'outcomes', index: number, value: string) => {
    const newArr = [...(editSettings[field] || [])];
    newArr[index] = value;
    setEditSettings({ ...editSettings, [field]: newArr });
  };

  const handleMethodChange = (index: number, key: 'verb' | 'description', value: string) => {
    const newMethod = [...(editSettings.methodSnapshot || [])];
    newMethod[index] = { ...newMethod[index], [key]: value };
    setEditSettings({ ...editSettings, methodSnapshot: newMethod });
  };

  if (!sprint) return <div className="p-8 text-center text-gray-500">Loading Registry...</div>;

  const editorInputClasses = "w-full p-6 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-medium transition-all placeholder-gray-300 resize-none disabled:bg-gray-50 disabled:text-gray-500 disabled:italic";
  const registryInputClasses = "w-full px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:italic";
  const labelClasses = "text-[11px] font-black text-gray-400 uppercase tracking-widest";

  const isDayComplete = (day: number) => {
    const content = sprint.dailyContent.find(c => c.day === day);
    return !!(content && content.lessonText?.trim() && content.taskPrompt?.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 pb-32">
      {showSuccessModal && <SubmissionSuccessModal onClose={() => navigate('/coach/sprints')} />}
      
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">{(isAdmin && !isFoundational) ? 'Audit Registry' : 'Registry'}</span>
                </button>
                <button onClick={() => setShowPreviewModal(true)} className="p-2 bg-white text-gray-400 rounded-xl border border-gray-100 hover:text-primary transition-all shadow-sm flex items-center gap-2 group cursor-pointer">
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
                    <button onClick={handleAdminAmend} disabled={approvalStatus === 'processing'} className="bg-orange-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl px-6 py-3 shadow-lg hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50">Request Fixes</button>
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
            <div className="space-y-4">
              <label className={labelClasses}>Lesson Material</label>
              {isAdmin && !isFoundational ? (
                  <DiffHighlight 
                    label="Lesson Text" 
                    original={originalSprint?.dailyContent.find(c => c.day === selectedDay)?.lessonText} 
                    updated={currentContent.lessonText} 
                  />
              ) : (
                  <textarea 
                    value={currentContent.lessonText || ''} 
                    onChange={e => handleContentChange('lessonText', e.target.value)} 
                    rows={8} 
                    className={editorInputClasses} 
                    placeholder="Coach curriculum goes here..." 
                  />
              )}
            </div>
            <div className="space-y-4">
              <label className={labelClasses}>Actionable Task</label>
              {isAdmin && !isFoundational ? (
                  <DiffHighlight 
                    label="Task Prompt" 
                    original={originalSprint?.dailyContent.find(c => c.day === selectedDay)?.taskPrompt} 
                    updated={currentContent.taskPrompt} 
                  />
              ) : (
                  <textarea 
                    value={currentContent.taskPrompt || ''} 
                    onChange={e => handleContentChange('taskPrompt', e.target.value)} 
                    rows={4} 
                    className={editorInputClasses} 
                    placeholder="Daily task prompt..." 
                  />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Registry Settings Modal - Now expanded with all description fields */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-8 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight italic">{(isAdmin && !isFoundational) ? 'Registry Audit Diff' : 'Registry Settings'}</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-10 overflow-y-auto space-y-12 custom-scrollbar">
                
                {isAdmin && !isFoundational ? (
                    <section className="space-y-8">
                        <DiffHighlight label="Title" original={originalSprint?.title} updated={editSettings.title} />
                        <DiffHighlight label="Transformation" original={originalSprint?.transformation || originalSprint?.description} updated={editSettings.transformation} />
                        <DiffHighlight label="Archive Outcome Tag" original={originalSprint?.outcomeTag} updated={editSettings.outcomeTag} />
                        <DiffHighlight label="The Outcome Statement" original={originalSprint?.outcomeStatement} updated={editSettings.outcomeStatement} />
                        <DiffHighlight label="Category" original={originalSprint?.category} updated={editSettings.category} />
                    </section>
                ) : (
                    <>
                        {/* 01 Identity */}
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] border-b border-gray-50 pb-2">01 Registry Identity</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className={labelClasses}>Sprint Title</label>
                                    <input type="text" value={editSettings.title || ''} onChange={e => setEditSettings({...editSettings, title: e.target.value})} className={registryInputClasses + " mt-2"} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelClasses}>Cover Image URL</label>
                                    <input type="url" value={editSettings.coverImageUrl || ''} onChange={e => setEditSettings({...editSettings, coverImageUrl: e.target.value})} className={registryInputClasses + " mt-2"} />
                                </div>
                            </div>
                        </section>

                        {/* 02 Transformation */}
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] border-b border-gray-50 pb-2">02 Transformation Statement</h4>
                            <textarea value={editSettings.transformation || ''} onChange={e => setEditSettings({...editSettings, transformation: e.target.value})} rows={3} className={registryInputClasses + " resize-none italic mt-2"} />
                        </section>

                        {/* 03 Target Signals */}
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] border-b border-gray-50 pb-2">03 Target Signals (Who it's for)</h4>
                            <div className="space-y-3">
                                {(editSettings.forWho || ['', '', '', '']).map((item, i) => (
                                    <div key={i} className="flex gap-4 items-center">
                                        <span className="text-[10px] font-black text-gray-300 w-4">0{i+1}</span>
                                        <input type="text" value={item} onChange={(e) => handleArrayChange('forWho', i, e.target.value)} className={registryInputClasses} placeholder="You feel capable but directionless..." />
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 04 Exclusions */}
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] border-b border-gray-50 pb-2">04 Exclusions (Who it's not for)</h4>
                            <div className="space-y-3">
                                {(editSettings.notForWho || ['', '', '']).map((item, i) => (
                                    <div key={i} className="flex gap-4 items-center">
                                        <span className="text-[10px] font-black text-gray-300 w-4">0{i+1}</span>
                                        <input type="text" value={item} onChange={(e) => handleArrayChange('notForWho', i, e.target.value)} className={registryInputClasses + " border-red-50 focus:border-red-200"} placeholder="You want results without acting..." />
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 05 Method Snapshot */}
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] border-b border-gray-50 pb-2">05 Method Snapshot</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {(editSettings.methodSnapshot || [{verb:'', description:''}, {verb:'', description:''}, {verb:'', description:''}]).map((item, i) => (
                                    <div key={i} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center gap-4 transition-all">
                                        <input type="text" value={item.verb} onChange={(e) => handleMethodChange(i, 'verb', e.target.value)} className={registryInputClasses + " text-center uppercase tracking-widest text-[10px] py-2"} placeholder="VERB" />
                                        <textarea value={item.description} onChange={(e) => handleMethodChange(i, 'description', e.target.value)} rows={2} className={registryInputClasses + " text-center text-xs font-medium bg-transparent border-none shadow-none resize-none p-0"} placeholder="One-line explanation of action." />
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 06 Outcomes */}
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] border-b border-gray-50 pb-2">06 Evidence of Completion</h4>
                            <div className="space-y-3">
                                {(editSettings.outcomes || ['', '', '']).map((item, i) => (
                                    <div key={i} className="flex gap-4 items-center">
                                        <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px] font-black">✓</div>
                                        <input type="text" value={item} onChange={(e) => handleArrayChange('outcomes', i, e.target.value)} className={registryInputClasses} placeholder="Projected outcome..." />
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 07 Metadata */}
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] border-b border-gray-50 pb-2">07 Metadata</h4>
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
                            </div>
                        </section>

                        {/* 08 Completion Assets */}
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] border-b border-gray-50 pb-2">08 Completion Assets</h4>
                            <div className="space-y-6">
                                <div>
                                    <label className={labelClasses}>Archive Outcome Tag</label>
                                    <input type="text" value={editSettings.outcomeTag || ''} onChange={e => setEditSettings({...editSettings, outcomeTag: e.target.value})} className={registryInputClasses + " mt-2"} placeholder="e.g. Clarity gained" />
                                    <p className="text-[8px] text-gray-400 font-bold mt-1 uppercase tracking-widest italic leading-relaxed">This appears as the badge on completed sprint cards in the student profile.</p>
                                </div>
                                <div>
                                    <label className={labelClasses}>The Outcome (Final Statement)</label>
                                    <input type="text" value={editSettings.outcomeStatement || ''} onChange={e => setEditSettings({...editSettings, outcomeStatement: e.target.value})} className={registryInputClasses + " mt-2 italic"} placeholder="Focus creates feedback. *Feedback creates clarity.*" />
                                    <p className="text-[8px] text-gray-400 font-bold mt-1 uppercase tracking-widest italic leading-relaxed">Appears at the bottom of the landing page. Use *text* for emphasis.</p>
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

      {/* Live Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#FAFAFA] rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            <header className="p-8 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
                <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight italic">Live Registry Preview</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Reviewing both platform contexts</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                        <button 
                            onClick={() => setPreviewType('card')}
                            className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${previewType === 'card' ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}
                        >
                            Deck Card
                        </button>
                        <button 
                            onClick={() => setPreviewType('landing')}
                            className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${previewType === 'landing' ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}
                        >
                            Landing Page
                        </button>
                    </div>
                    <button onClick={() => setShowPreviewModal(false)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar flex justify-center bg-gray-50">
                <div className="w-full max-w-4xl">
                    {previewType === 'card' ? (
                        <div className="max-w-md mx-auto animate-fade-in">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8 text-center">Discovery Deck Appearance</h4>
                            <div className="w-full max-w-[380px] mx-auto scale-100 md:scale-110">
                                <SprintCard 
                                    sprint={sprint as Sprint} 
                                    coach={user as Coach} 
                                    forceShowOutcomeTag={true} 
                                    isStatic={true}
                                />
                            </div>
                            <div className="mt-20 p-8 bg-white border border-gray-100 rounded-3xl text-center shadow-sm">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Registry Logic</p>
                                <p className="text-sm text-gray-500 font-medium italic leading-relaxed">
                                    "The Archive Outcome Tag (<strong>{sprint.outcomeTag || 'Pending'}</strong>) will appear on this card once a participant successfully completes all {sprint.duration} days of the cycle."
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <LandingPreview sprint={sprint as Sprint} coach={user as Coach} />
                        </div>
                    )}
                </div>
            </div>
            
            <footer className="p-8 border-t border-gray-100 bg-white text-center flex-shrink-0">
                <button onClick={() => setShowPreviewModal(false)} className="px-12 py-4 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all">
                    Return to Editor
                </button>
            </footer>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default EditSprint;