
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sprint, DailyContent, SprintDifficulty, UserRole } from '../../types';
import { sprintService } from '../../services/sprintService';
import Button from '../../components/Button';
import { isRegistryIncomplete, isSprintIncomplete } from '../../utils/sprintUtils';
import { useAuth } from '../../contexts/AuthContext';
import { ALL_CATEGORIES } from '../../services/mockData';

const SubmissionSuccessModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-dark/95 backdrop-blur-md animate-fade-in">
        <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden animate-slide-up flex flex-col p-10 text-center">
            <div className="w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-primary/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-4 italic">Registry Updated.</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-10 italic">
                "Your sprint has been submitted for audit. Our curators will review the curriculum for clarity and impact before it goes live."
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
  
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [approvalStatus, setApprovalStatus] = useState<'idle' | 'processing'>('idle');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [editSettings, setEditSettings] = useState<Partial<Sprint>>({});
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>({});

  const isAdmin = user?.role === UserRole.ADMIN;
  
  const isFoundational = useMemo(() => {
    const cat = editSettings.category || sprint?.category;
    return cat === 'Core Platform Sprint' || cat === 'Growth Fundamentals';
  }, [editSettings.category, sprint?.category]);

  // Logic: Admins can ONLY edit daily content if it's a foundational (platform) sprint
  const canEditDirectly = !isAdmin || (isAdmin && isFoundational);

  const isPendingReview = sprint?.approvalStatus === 'pending_approval';
  const isRejected = sprint?.approvalStatus === 'rejected';

  const registryIncomplete = useMemo(() => sprint ? isRegistryIncomplete(sprint) : true, [sprint]);
  const curriculumIncomplete = useMemo(() => sprint ? isSprintIncomplete(sprint) : true, [sprint]);

  useEffect(() => {
    const fetchData = async () => {
      if (!sprintId || !user) return;
      try {
        const found = await sprintService.getSprintById(sprintId);
        if (found) {
          const effectiveSprint: Sprint = found.pendingChanges ? {
              ...found,
              ...found.pendingChanges,
              dailyContent: found.pendingChanges.dailyContent || found.dailyContent,
              outcomes: found.pendingChanges.outcomes || found.outcomes
          } : found;

          const cloned: Sprint = {
              ...effectiveSprint,
              dailyContent: (effectiveSprint.dailyContent || []).map(day => ({ 
                ...day,
                proofType: day.proofType || 'confirmation',
                proofOptions: day.proofOptions || []
              })),
              outcomes: effectiveSprint.outcomes ? [...effectiveSprint.outcomes] : [],
              forWho: effectiveSprint.forWho ? [...effectiveSprint.forWho] : ['', '', '', ''],
              notForWho: effectiveSprint.notForWho ? [...effectiveSprint.notForWho] : ['', '', ''],
              methodSnapshot: effectiveSprint.methodSnapshot ? [...effectiveSprint.methodSnapshot] : [
                { verb: '', description: '' },
                { verb: '', description: '' },
                { verb: '', description: '' }
              ]
          };
          
          setSprint(cloned);
          setReviewFeedback(cloned.reviewFeedback || {});
          setEditSettings({
            title: cloned.title,
            description: cloned.description,
            transformation: cloned.transformation || cloned.description,
            category: cloned.category,
            difficulty: cloned.difficulty,
            price: cloned.price,
            pointCost: cloned.pointCost,
            pricingType: cloned.pricingType || 'cash',
            duration: cloned.duration,
            protocol: cloned.protocol || 'One action per day',
            coverImageUrl: cloned.coverImageUrl,
            outcomes: cloned.outcomes && cloned.outcomes.length > 0 ? cloned.outcomes : ['', '', ''],
            forWho: cloned.forWho || ['', '', '', ''],
            notForWho: cloned.notForWho || ['', '', ''],
            methodSnapshot: cloned.methodSnapshot || [
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
      
      // If admin saving foundational, ensure it is published and approved automatically
      if (isAdmin && isFoundational) {
          updatedSprint.published = true;
          updatedSprint.approvalStatus = 'approved';
      } else if (!isAdmin && updatedSprint.approvalStatus === 'rejected') {
          updatedSprint.approvalStatus = 'draft';
      }
      
      // If admin saving foundational, ensure it stays approved if it was, or draft if it was
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
      const price = Number(editSettings.price ?? sprint.price ?? 0);
      const points = Number(editSettings.pointCost ?? sprint.pointCost ?? 0);
      if ((isFoundational && points <= 0) || (!isFoundational && price <= 0)) {
          alert("Admin Constraint: You must set a non-zero price before approval.");
          return;
      }
      setApprovalStatus('processing');
      try {
          const finalData: Partial<Sprint> = {
              ...sprint,
              ...editSettings,
              pricingType: isFoundational ? 'credits' : 'cash',
              price: price,
              pointCost: points,
              outcomes: editSettings.outcomes?.filter(o => o.trim() !== '') || sprint.outcomes,
              forWho: editSettings.forWho?.filter(s => s.trim() !== '') || sprint.forWho,
              notForWho: editSettings.notForWho?.filter(s => s.trim() !== '') || sprint.notForWho
          };
          await sprintService.approveSprint(sprintId, finalData);
          alert("Sprint approved and published.");
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
          const finalFeedback: Record<string, string> = {};
          ['identity', 'transformation', 'forWho', 'notForWho', 'methodSnapshot', 'outcomes', 'metadata'].forEach(key => {
              finalFeedback[key] = reviewFeedback[key]?.trim() || 'no input';
          });
          sprint.dailyContent.forEach(day => {
              const dayKey = `daily_day_${day.day}`;
              finalFeedback[dayKey] = reviewFeedback[dayKey]?.trim() || 'no input';
          });
          const updated = { ...sprint, approvalStatus: 'rejected' as const, reviewFeedback: finalFeedback };
          await sprintService.updateSprint(sprintId, updated);
          alert("Amendments sent to coach.");
          navigate('/admin/dashboard');
      } catch (err) { setApprovalStatus('idle'); }
  };

  const handleApplySettings = async () => {
    if (!sprint) return;
    let updatedDailyContent = [...sprint.dailyContent];
    const newDuration = Number(editSettings.duration || sprint.duration);
    
    // Duration change logic (only if we can edit directly)
    if (canEditDirectly && newDuration !== sprint.duration) {
        if (newDuration > sprint.duration) {
          for (let i = sprint.duration + 1; i <= newDuration; i++) {
            updatedDailyContent.push({ day: i, lessonText: '', taskPrompt: '', submissionType: 'text', proofType: 'confirmation', proofOptions: [] });
          }
        } else {
          updatedDailyContent = updatedDailyContent.filter(c => c.day <= newDuration);
          if (selectedDay > newDuration) setSelectedDay(newDuration);
        }
    }

    const price = Number(editSettings.price ?? sprint.price ?? 0);
    const points = Number(editSettings.pointCost ?? sprint.pointCost ?? 0);
    
    if (isAdmin && sprint.approvalStatus === 'approved') {
        if ((isFoundational && points <= 0) || (!isFoundational && price <= 0)) {
            alert("Admin Error: Price cannot be 0 for live sprints.");
            return;
        }
    }

    const finalSettings = {
        ...editSettings,
        description: editSettings.transformation || editSettings.description,
        pricingType: isFoundational ? 'credits' : 'cash',
        price, 
        pointCost: points,
        // Auto-publish foundational when admin applies registry changes
        ...(isAdmin && isFoundational ? { published: true, approvalStatus: 'approved' as const } : {})
    };

    const updatedLocalSprint = { ...sprint, ...finalSettings as any, duration: newDuration, dailyContent: updatedDailyContent };
    
    if (isAdmin && sprint.approvalStatus === 'approved') {
        try {
            setApprovalStatus('processing');
            await sprintService.updateSprint(sprint.id, finalSettings, true);
            setSprint(updatedLocalSprint);
            setShowSettings(false);
            alert("Registry updated successfully.");
        } catch (err) { alert("Save failed."); } finally { setApprovalStatus('idle'); }
    } else {
        setSprint(updatedLocalSprint);
        setShowSettings(false);
    }
  };

  if (!sprint) return <div className="p-8 text-center text-gray-500">Loading Registry...</div>;

  const editorInputClasses = "w-full p-6 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-medium transition-all placeholder-gray-300 resize-none disabled:bg-gray-50 disabled:text-gray-500 disabled:italic";
  const registryInputClasses = "w-full px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:italic";
  const labelClasses = "text-[11px] font-black text-gray-400 uppercase tracking-widest";
  const feedbackInputClasses = "w-full mt-3 p-4 bg-primary/[0.03] border border-primary/20 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-xs font-bold text-primary placeholder-primary/30 italic transition-all";

  const isDayComplete = (day: number) => {
    const content = sprint.dailyContent.find(c => c.day === day);
    return !!(content && content.lessonText?.trim() && content.taskPrompt?.trim());
  };

  const AdminFeedbackBox = ({ sectionKey }: { sectionKey: string }) => (
    (isAdmin && !isFoundational) ? (
        <textarea 
          placeholder="Drop a critique or guidance for this section..." 
          value={reviewFeedback[sectionKey] || ''} 
          onChange={(e) => setReviewFeedback(prev => ({ ...prev, [sectionKey]: e.target.value }))} 
          className={feedbackInputClasses}
          rows={2}
        />
    ) : null
  );

  const CoachFeedbackDisplay = ({ sectionKey }: { sectionKey: string }) => {
    if (isAdmin || !isRejected || !sprint.reviewFeedback?.[sectionKey] || sprint.reviewFeedback[sectionKey] === 'no input') return null;
    return (
        <div className="mt-3 p-4 bg-gray-900 rounded-2xl border-l-4 border-primary shadow-lg animate-slide-up">
            <p className="text-[8px] font-black text-primary uppercase tracking-[0.3em] mb-1">Admin Audit Feedback</p>
            <p className="text-xs text-white/90 font-medium leading-relaxed italic">"{sprint.reviewFeedback[sectionKey]}"</p>
        </div>
    );
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
              <button onClick={() => setShowSettings(true)} className="p-2 bg-white text-primary rounded-xl border border-primary/10 hover:bg-primary hover:text-white transition-all shadow-sm flex items-center gap-2 group cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-[10px] font-black uppercase tracking-widest">{(isAdmin && !isFoundational) ? 'Audit Registry' : 'Registry'}</span>
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            {isAdmin && !isFoundational ? (
                <>
                    <button onClick={handleAdminApprove} disabled={approvalStatus === 'processing'} className="bg-green-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl px-6 py-3 shadow-lg hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50">Approve & Publish</button>
                    <button onClick={handleAdminAmend} disabled={approvalStatus === 'processing'} className="bg-orange-50 text-white font-black uppercase tracking-widest text-[10px] rounded-xl px-6 py-3 shadow-lg hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50">Amend</button>
                </>
            ) : (
                <>
                    <Button variant="secondary" onClick={handleSaveDraft} disabled={saveStatus === 'saving'} className="bg-white border-gray-200 text-gray-600 font-black uppercase tracking-widest text-[10px] rounded-xl px-6">
                      {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : (isAdmin && isFoundational) ? 'Save & Publish' : 'Save Draft'}
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
              <textarea 
                value={currentContent.lessonText || ''} 
                onChange={e => handleContentChange('lessonText', e.target.value)} 
                rows={8} 
                className={editorInputClasses} 
                readOnly={!canEditDirectly}
                placeholder="Coach curriculum goes here..." 
              />
            </div>
            <div className="space-y-4">
              <label className={labelClasses}>Actionable Task</label>
              <textarea 
                value={currentContent.taskPrompt || ''} 
                onChange={e => handleContentChange('taskPrompt', e.target.value)} 
                rows={4} 
                className={editorInputClasses} 
                readOnly={!canEditDirectly}
                placeholder="Daily task prompt..." 
              />
            </div>

            {/* Proof of Action Configuration */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                    <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Proof of Action</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { id: 'confirmation', label: 'Confirmation', icon: '✅' },
                        { id: 'picker', label: 'Picker', icon: '🔘' },
                        { id: 'note', label: 'Note Feedback', icon: '📝' }
                    ].map(type => (
                        <button
                            key={type.id}
                            disabled={!canEditDirectly}
                            onClick={() => handleContentChange('proofType', type.id)}
                            className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-300 group ${
                                currentContent.proofType === type.id 
                                ? 'bg-primary border-primary text-white shadow-lg' 
                                : 'bg-white border-gray-100 text-gray-400 hover:border-primary/20 hover:text-primary'
                            }`}
                        >
                            <span className="text-2xl mb-2">{type.icon}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">{type.label}</span>
                        </button>
                    ))}
                </div>

                {currentContent.proofType === 'picker' && (
                    <div className="animate-slide-up space-y-3">
                        <label className={labelClasses}>Define Picker Options</label>
                        <div className="flex gap-2">
                             <input 
                                type="text"
                                placeholder="Add option..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                        const newOptions = [...(currentContent.proofOptions || []), e.currentTarget.value.trim()];
                                        handleContentChange('proofOptions', newOptions);
                                        e.currentTarget.value = '';
                                    }
                                }}
                                className={registryInputClasses}
                                disabled={!canEditDirectly}
                             />
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {(currentContent.proofOptions || []).map((opt, i) => (
                                <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2">
                                    {opt}
                                    {canEditDirectly && (
                                        <button onClick={() => {
                                            const next = (currentContent.proofOptions || []).filter((_, idx) => idx !== i);
                                            handleContentChange('proofOptions', next);
                                        }} className="text-gray-400 hover:text-red-500">✕</button>
                                    )}
                                </span>
                            ))}
                            {canEditDirectly && (currentContent.proofOptions || []).length === 0 && (
                                <p className="text-[10px] text-gray-300 italic font-medium">Type and press Enter to add options.</p>
                            )}
                        </div>
                    </div>
                )}

                <AdminFeedbackBox sectionKey={`daily_day_${selectedDay}`} />
                <CoachFeedbackDisplay sectionKey={`daily_day_${selectedDay}`} />
            </div>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-8 border-b border-gray-50 bg-gray-50/50">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">{(isAdmin && !isFoundational) ? 'Registry Audit & Pricing' : 'Registry Preview'}</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-10 overflow-y-auto space-y-16 custom-scrollbar">
                <section>
                    <SectionLabel step="01" label="Identity" />
                    <input type="text" value={editSettings.title || ''} onChange={e => setEditSettings({...editSettings, title: e.target.value})} className={registryInputClasses + " mt-2"} disabled={isAdmin && !isFoundational} />
                    <AdminFeedbackBox sectionKey="identity" />
                    <CoachFeedbackDisplay sectionKey="identity" />
                </section>
                <section>
                    <SectionLabel step="02" label="Transformation" />
                    <textarea value={editSettings.transformation || ''} onChange={e => setEditSettings({...editSettings, transformation: e.target.value})} rows={3} className={registryInputClasses + " resize-none italic mt-2"} disabled={isAdmin && !isFoundational} />
                    <AdminFeedbackBox sectionKey="transformation" />
                    <CoachFeedbackDisplay sectionKey="transformation" />
                </section>
                <section>
                    <SectionLabel step="07" label="Metadata" />
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <select value={editSettings.duration || 0} onChange={e => setEditSettings({...editSettings, duration: Number(e.target.value)})} className={registryInputClasses} disabled={isAdmin && !isFoundational}>
                            {[3, 5, 7, 10, 14, 21, 30].map(d => <option key={d} value={d}>{d} Days</option>)}
                        </select>
                        <select value={editSettings.category || ''} onChange={e => setEditSettings({...editSettings, category: e.target.value})} className={registryInputClasses} disabled={isAdmin && !isFoundational}>
                            {ALL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </section>

                {isAdmin && (
                    <section className="bg-gray-900 p-8 rounded-[3rem] border border-primary/20 shadow-2xl animate-slide-up">
                        <h5 className="text-[10px] font-black text-primary uppercase tracking-widest mb-6">Investment Control</h5>
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-white uppercase tracking-widest">{isFoundational ? 'Coin Cost' : 'Cash Price (₦)'}</label>
                            <input 
                              type="number" 
                              value={isFoundational ? editSettings.pointCost ?? 0 : editSettings.price ?? 0} 
                              onChange={e => setEditSettings({...editSettings, [isFoundational ? 'pointCost' : 'price']: Number(e.target.value)})} 
                              className={registryInputClasses + " bg-white/10 text-white border-white/20"} 
                              placeholder="Set investment..."
                            />
                        </div>
                    </section>
                )}

                <div className="flex gap-4 pt-6">
                    {(isAdmin || isRejected || sprint.approvalStatus === 'draft') && (
                        <Button className="flex-1 py-4 font-black uppercase tracking-widest text-xs rounded-2xl" onClick={handleApplySettings}>
                            {(isAdmin && !isFoundational) ? 'Apply Audit & Price' : 'Apply Changes'}
                        </Button>
                    )}
                    <button className="flex-1 py-4 bg-white text-gray-400 font-black uppercase tracking-widest text-xs rounded-2xl border border-gray-100" onClick={() => setShowSettings(false)}>Cancel</button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SectionLabel = ({ step, label }: { step: string, label: string }) => (
    <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">{step}</div>
        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
    </div>
);

export default EditSprint;
