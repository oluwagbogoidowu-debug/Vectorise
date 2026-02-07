
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sprint, DailyContent, SprintDifficulty, UserRole } from '../../types';
import { sprintService } from '../../services/sprintService';
import Button from '../../components/Button';
import { isRegistryIncomplete, isSprintIncomplete } from '../../utils/sprintUtils';
import { useAuth } from '../../contexts/AuthContext';

const CATEGORIES = [
    "Accountability", "Boundaries", "Burnout Recovery", "Business", "Career", "Change", "Clarity", 
    "Communication", "Confidence", "Conflict Resolution", "Connection", "Consciousness", 
    "Consistency", "Content Creation", "Creativity", "Discipline", "Emotional Intelligence", 
    "Emotional Resilience", "Energy Management", "Entrepreneurship", "Executive Development", 
    "Expression", "Faith-Based", "Financial Empowerment", "Focus", "Founder", "Growth", "Habits", 
    "Health", "High Performance", "Identity", "Inner Peace", "Inner Work", "Interpersonal Skills", 
    "Leadership", "Life", "Life Transitions", "Lifestyle", "Limiting Beliefs", "Meaning", 
    "Mental Fitness", "Mindset", "Money Mindset", "Performance", "Personal Branding", 
    "Personal Development", "Professional Development", "Productivity", "Purpose", 
    "Purpose Alignment", "Relationships", "Reset", "Reinvention", "Self-Belief", 
    "Self-Discovery", "Self-Trust", "Solopreneur", "Spirituality", "Startup", 
    "Stress Management", "Thought Leadership", "Time Management", "Transformation", "Transition", 
    "Visibility", "Vision", "Wealth Mindset", "Wellness", "Work-Life Balance"
].sort();

const EditSprint: React.FC = () => {
  const { sprintId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [approvalStatus, setApprovalStatus] = useState<'idle' | 'processing'>('idle');
  
  const [showSettings, setShowSettings] = useState(false);
  const [editSettings, setEditSettings] = useState<Partial<Sprint>>({});
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>({});

  const isAdmin = user?.role === UserRole.ADMIN;
  const isPendingReview = sprint?.approvalStatus === 'pending_approval';
  const isRejected = sprint?.approvalStatus === 'rejected';

  const isFoundational = useMemo(() => 
    sprint?.category === 'Core Platform Sprint' || sprint?.category === 'Growth Fundamentals', 
  [sprint]);

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
              dailyContent: effectiveSprint.dailyContent.map(day => ({ ...day })),
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
        } else {
          navigate('/dashboard');
        }
      } catch (err) {
        console.error("Error in EditSprint fetch:", err);
        navigate('/dashboard');
      }
    };
    fetchData();
  }, [sprintId, navigate, user]);

  const currentContent = (sprint?.dailyContent.find(c => c.day === selectedDay)) || {
    day: selectedDay,
    lessonText: '',
    taskPrompt: '',
    audioUrl: '',
    resourceUrl: '',
    submissionType: 'text'
  };

  const handleDayChange = (day: number) => {
    setSelectedDay(day);
  };
  
  const handleContentChange = (field: keyof DailyContent, value: any) => {
    if (!sprint || (isAdmin && isPendingReview)) return;
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
      if (updatedSprint.approvalStatus === 'rejected') {
        updatedSprint.approvalStatus = 'draft';
      }
      await sprintService.updateSprint(sprint.id, updatedSprint);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error(err);
      setSaveStatus('idle');
      alert("Failed to save draft.");
    }
  };

  const registryIncomplete = sprint ? isRegistryIncomplete(sprint) : true;
  const curriculumIncomplete = sprint ? isSprintIncomplete(sprint) : true;
  const canSubmit = !registryIncomplete && !curriculumIncomplete;

  const handleSubmitForApproval = async () => {
    if (!sprint) return;
    if (registryIncomplete || curriculumIncomplete) {
      alert("Please complete the Registry and Curriculum before submitting.");
      return;
    }
    try {
      const updated = { ...sprint, approvalStatus: 'pending_approval' as const, published: false };
      await sprintService.updateSprint(sprint.id, updated);
      alert("Sprint submitted for approval!");
      navigate(user?.role === 'ADMIN' ? '/admin/dashboard' : '/coach/sprints');
    } catch (err) {
      console.error(err);
      alert("Failed to submit.");
    }
  };

  const handleAdminApprove = async () => {
      if (!sprintId || !sprint || approvalStatus === 'processing') return;
      setApprovalStatus('processing');
      try {
          // Pass the local sprint object to ensure any admin-made adjustments (like price) are persisted
          await sprintService.approveSprint(sprintId, sprint);
          alert("Sprint approved and published to registry.");
          navigate('/admin/dashboard');
      } catch (err) {
          alert("Approval failed.");
          setApprovalStatus('idle');
      }
  };

  const handleAdminAmend = async () => {
      if (!sprintId || !sprint || approvalStatus === 'processing') return;
      setApprovalStatus('processing');
      
      try {
          const finalFeedback: Record<string, string> = {};
          const sections = ['identity', 'transformation', 'forWho', 'notForWho', 'methodSnapshot', 'outcomes', 'metadata'];
          sections.forEach(key => { finalFeedback[key] = reviewFeedback[key]?.trim() || 'no input'; });
          sprint.dailyContent.forEach(day => {
              const dayKey = `daily_day_${day.day}`;
              finalFeedback[dayKey] = reviewFeedback[dayKey]?.trim() || 'no input';
          });

          const updated = { 
              ...sprint, 
              approvalStatus: 'rejected' as const, 
              reviewFeedback: finalFeedback 
          };
          await sprintService.updateSprint(sprintId, updated);
          alert("Amendment notes sent to coach.");
          navigate('/admin/dashboard');
      } catch (err) {
          alert("Failed to send amendments.");
          setApprovalStatus('idle');
      }
  };

  const handleApplySettings = () => {
    if (!sprint || (isAdmin && isPendingReview)) return;

    let updatedDailyContent = [...sprint.dailyContent];
    const newDuration = Number(editSettings.duration || sprint.duration);
    
    if (newDuration > sprint.duration) {
      for (let i = sprint.duration + 1; i <= newDuration; i++) {
        updatedDailyContent.push({ day: i, lessonText: '', taskPrompt: '', submissionType: 'text' });
      }
    } else if (newDuration < sprint.duration) {
      updatedDailyContent = updatedDailyContent.filter(c => c.day <= newDuration);
      if (selectedDay > newDuration) setSelectedDay(newDuration);
    }

    const finalSettings = {
        ...editSettings,
        description: editSettings.transformation || editSettings.description,
        outcomes: editSettings.outcomes?.filter(o => o.trim() !== '') || [],
        forWho: editSettings.forWho?.filter(s => s.trim() !== '') || [],
        notForWho: editSettings.notForWho?.filter(s => s.trim() !== '') || []
    };

    setSprint({ ...sprint, ...finalSettings as any, duration: newDuration, dailyContent: updatedDailyContent });
    setShowSettings(false);
    setSaveStatus('idle');
  };

  const handleReviewFeedbackChange = (key: string, value: string) => {
      setReviewFeedback(prev => ({ ...prev, [key]: value }));
  };

  const handleEditArrayChange = (field: 'forWho' | 'notForWho' | 'outcomes', index: number, value: string) => {
    if (isAdmin && isPendingReview) return;
    const newArr = [...(editSettings[field] as string[] || [])];
    newArr[index] = value;
    setEditSettings({ ...editSettings, [field]: newArr });
  };

  const handleEditMethodChange = (index: number, key: 'verb' | 'description', value: string) => {
    if (isAdmin && isPendingReview) return;
    const newMethod = [...(editSettings.methodSnapshot || [])];
    newMethod[index] = { ...newMethod[index], [key]: value };
    setEditSettings({ ...editSettings, methodSnapshot: newMethod });
  };

  const addOutcome = () => {
    if (isAdmin && isPendingReview) return;
    setEditSettings({ ...editSettings, outcomes: [...(editSettings.outcomes || []), ''] });
  };

  const removeOutcome = (index: number) => {
    if (isAdmin && isPendingReview) return;
    setEditSettings({ ...editSettings, outcomes: (editSettings.outcomes || []).filter((_, i) => i !== index) });
  };

  if (!sprint) return <div className="p-8 text-center text-gray-500">Loading editor...</div>;

  const editorInputClasses = "w-full p-6 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-medium transition-all placeholder-gray-300 resize-none disabled:bg-gray-50 disabled:text-gray-500 disabled:italic";
  const registryInputClasses = "w-full px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:italic";
  const labelClasses = "text-[11px] font-black text-gray-400 uppercase tracking-widest";
  const feedbackInputClasses = "w-full mt-3 p-4 bg-primary/[0.03] border border-primary/20 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary text-xs font-bold text-primary placeholder-primary/30 italic transition-all";

  const isDayComplete = (day: number) => {
    const content = sprint.dailyContent.find(c => c.day === day);
    return !!(content && content.lessonText?.trim() && content.taskPrompt?.trim());
  };

  const completedDaysCount = Array.from({ length: sprint.duration }, (_, i) => i + 1)
    .filter(day => isDayComplete(day)).length;

  const AdminFeedbackBox = ({ sectionKey }: { sectionKey: string }) => (
    isAdmin && isPendingReview ? (
        <textarea 
          placeholder="Drop a comment for this section..." 
          value={reviewFeedback[sectionKey] || ''} 
          onChange={(e) => handleReviewFeedbackChange(sectionKey, e.target.value)} 
          className={feedbackInputClasses}
          rows={2}
        />
    ) : null
  );

  const CoachFeedbackDisplay = ({ sectionKey }: { sectionKey: string }) => {
    if (!isRejected || !sprint.reviewFeedback?.[sectionKey] || sprint.reviewFeedback[sectionKey] === 'no input') return null;
    return (
        <div className="mt-3 p-4 bg-gray-900 rounded-2xl border-l-4 border-primary shadow-lg animate-slide-up">
            <p className="text-[8px] font-black text-primary uppercase tracking-[0.3em] mb-1">Reviewer Feedback</p>
            <p className="text-xs text-white/90 font-medium leading-relaxed italic">"{sprint.reviewFeedback[sectionKey]}"</p>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 pb-32">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <button onClick={() => navigate(-1)} className="group flex items-center text-gray-400 hover:text-primary transition-colors mb-4 text-[10px] font-black uppercase tracking-widest cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              Go Back
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">{sprint.title}</h1>
              <button onClick={() => setShowSettings(true)} className="p-2 bg-white text-primary rounded-xl border border-primary/10 hover:bg-primary hover:text-white transition-all shadow-sm flex items-center gap-2 group cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-[10px] font-black uppercase tracking-widest">{isAdmin && isPendingReview ? 'Audit Registry' : 'Registry'}</span>
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            {isAdmin && isPendingReview && (
                <>
                    <button onClick={handleAdminApprove} disabled={approvalStatus === 'processing'} className="bg-green-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl px-6 py-3 shadow-lg shadow-green-200 hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50">Approve & Publish</button>
                    <button onClick={handleAdminAmend} disabled={approvalStatus === 'processing'} className="bg-orange-50 text-white font-black uppercase tracking-widest text-[10px] rounded-xl px-6 py-3 shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50">Amend</button>
                </>
            )}
            
            {!isAdmin && (
                <>
                    <Button variant="secondary" onClick={handleSaveDraft} disabled={saveStatus === 'saving'} className="bg-white border-gray-200 text-gray-600 font-black uppercase tracking-widest text-[10px] rounded-xl px-6">
                      {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Draft'}
                    </Button>
                    <Button onClick={handleSubmitForApproval} disabled={!canSubmit} className={`font-black uppercase tracking-widest text-[10px] rounded-xl px-6 shadow-lg shadow-primary/10 transition-all ${!canSubmit ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}>
                      Submit Review
                    </Button>
                </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden p-6">
            <div className="flex justify-between items-center mb-6 px-1">
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-4 bg-primary rounded-full"></span>
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Curriculum Timeline</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest ${completedDaysCount === sprint.duration ? 'text-primary' : 'text-orange-500'}`}>{completedDaysCount}/{sprint.duration} Built</span>
              </div>
            </div>
            <div className="flex overflow-x-auto gap-3 hide-scrollbar">
              {Array.from({ length: sprint.duration }, (_, i) => i + 1).map((day) => (
                <button key={day} onClick={() => handleDayChange(day)} className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl border transition-all duration-300 relative ${selectedDay === day ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-105' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-primary/30 hover:text-primary hover:bg-white'}`}>
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
                placeholder="Lesson content..." 
                disabled={isAdmin && isPendingReview}
              />
            </div>
            <div className="space-y-4">
              <label className={labelClasses}>Actionable Task</label>
              <textarea 
                value={currentContent.taskPrompt || ''} 
                onChange={e => handleContentChange('taskPrompt', e.target.value)} 
                rows={4} 
                className={editorInputClasses} 
                placeholder="Action task..." 
                disabled={isAdmin && isPendingReview}
              />
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
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">{isAdmin && isPendingReview ? 'Registry Audit' : 'Registry Review'}</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-10 overflow-y-auto space-y-20 custom-scrollbar">
                <section>
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">01</div>
                        <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Registry Identity</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className={labelClasses}>Sprint Title</label>
                            <input type="text" value={editSettings.title || ''} onChange={e => setEditSettings({...editSettings, title: e.target.value})} className={registryInputClasses + " mt-2"} disabled={isAdmin && isPendingReview} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelClasses}>Cover Image URL</label>
                            <input type="url" value={editSettings.coverImageUrl || ''} onChange={e => setEditSettings({...editSettings, coverImageUrl: e.target.value})} className={registryInputClasses + " mt-2"} disabled={isAdmin && isPendingReview} />
                        </div>
                    </div>
                    <AdminFeedbackBox sectionKey="identity" />
                    <CoachFeedbackDisplay sectionKey="identity" />
                </section>
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">02</div>
                        <label className={labelClasses}>Transformation Statement</label>
                    </div>
                    <textarea value={editSettings.transformation || editSettings.description || ''} onChange={e => setEditSettings({...editSettings, transformation: e.target.value})} rows={4} className={registryInputClasses + " resize-none italic font-medium leading-relaxed p-6 text-lg"} placeholder="Describe the before-and-after state..." disabled={isAdmin && isPendingReview} />
                    <AdminFeedbackBox sectionKey="transformation" />
                    <CoachFeedbackDisplay sectionKey="transformation" />
                </section>
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">03</div>
                        <label className={labelClasses}>Target Signals (Who it's for)</label>
                    </div>
                    <div className="space-y-3">
                        {(editSettings.forWho || ['', '', '', '']).map((item, i) => (
                            <div key={i} className="flex gap-4 items-center">
                                <span className="text-[10px] font-black text-gray-300 w-4">0{i+1}</span>
                                <input type="text" value={item} onChange={(e) => handleEditArrayChange('forWho', i, e.target.value)} className={registryInputClasses} placeholder="You feel..." disabled={isAdmin && isPendingReview} />
                            </div>
                        ))}
                    </div>
                    <AdminFeedbackBox sectionKey="forWho" />
                    <CoachFeedbackDisplay sectionKey="forWho" />
                </section>
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">04</div>
                        <label className={labelClasses}>Exclusions (Who it's not for)</label>
                    </div>
                    <div className="space-y-3">
                        {(editSettings.notForWho || ['', '', '']).map((item, i) => (
                            <div key={i} className="flex gap-4 items-center">
                                <span className="text-[10px] font-black text-gray-300 w-4">0{i+1}</span>
                                <input type="text" value={item} onChange={(e) => handleEditArrayChange('notForWho', i, e.target.value)} className={registryInputClasses + " border-red-50 focus:border-red-200"} placeholder="You want..." disabled={isAdmin && isPendingReview} />
                            </div>
                        ))}
                    </div>
                    <AdminFeedbackBox sectionKey="notForWho" />
                    <CoachFeedbackDisplay sectionKey="notForWho" />
                </section>
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">05</div>
                        <label className={labelClasses}>Method Snapshot (How it works)</label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {(editSettings.methodSnapshot || [{ verb: '', description: '' }, { verb: '', description: '' }, { verb: '', description: '' }]).map((item, i) => (
                            <div key={i} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4 shadow-inner">
                                <input type="text" value={item.verb} onChange={(e) => handleEditMethodChange(i, 'verb', e.target.value)} className={registryInputClasses + " text-center uppercase tracking-widest text-[10px] py-2 border-primary/10"} placeholder="VERB" disabled={isAdmin && isPendingReview} />
                                <textarea value={item.description} onChange={(e) => handleEditMethodChange(i, 'description', e.target.value)} rows={2} className={registryInputClasses + " text-center text-xs font-medium bg-transparent border-none shadow-none resize-none p-0"} placeholder="Explanation..." disabled={isAdmin && isPendingReview} />
                            </div>
                        ))}
                    </div>
                    <AdminFeedbackBox sectionKey="methodSnapshot" />
                    <CoachFeedbackDisplay sectionKey="methodSnapshot" />
                </section>
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">06</div>
                            <label className={labelClasses}>Evidence of Completion</label>
                        </div>
                        {!(isAdmin && isPendingReview) && <button type="button" onClick={addOutcome} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">+ Add Outcome</button>}
                    </div>
                    <div className="space-y-3">
                        {(editSettings.outcomes || []).map((outcome, index) => (
                            <div key={index} className="flex gap-2">
                                <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-2">✓</div>
                                <input type="text" value={outcome} onChange={(e) => handleEditArrayChange('outcomes', index, e.target.value)} className={registryInputClasses} placeholder="Outcome..." disabled={isAdmin && isPendingReview} />
                                {!(isAdmin && isPendingReview) && <button type="button" onClick={() => removeOutcome(index)} className="p-3 text-gray-400 hover:text-red-500 bg-white rounded-2xl shadow-sm border border-gray-100 transition-all"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>}
                            </div>
                        ))}
                    </div>
                    <AdminFeedbackBox sectionKey="outcomes" />
                    <CoachFeedbackDisplay sectionKey="outcomes" />
                </section>
                <section className="bg-gray-50 p-8 md:p-12 rounded-[3rem] border border-gray-100">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400 text-xs font-black">07</div>
                        <label className={labelClasses}>Sprint Metadata</label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className={labelClasses}>Duration (Days)</label>
                            <select value={editSettings.duration || 0} onChange={e => setEditSettings({...editSettings, duration: Number(e.target.value)})} className={registryInputClasses + " mt-2"} disabled={isAdmin && isPendingReview}>
                                {(isFoundational ? [3, 5] : [3, 5, 7, 10, 14, 21, 30]).map(d => <option key={d} value={d}>{d} Days</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClasses}>Discovery Category</label>
                            <select value={editSettings.category || ''} onChange={e => setEditSettings({...editSettings, category: e.target.value})} className={registryInputClasses + " mt-2"} disabled={isAdmin && isPendingReview}>
                                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    </div>
                    <AdminFeedbackBox sectionKey="metadata" />
                    <CoachFeedbackDisplay sectionKey="metadata" />
                </section>
                {isAdmin && (
                    <section className="bg-gray-900 p-8 rounded-[3rem] border border-primary/20 shadow-2xl">
                        <h5 className="text-[10px] font-black text-primary uppercase tracking-widest mb-8">Investment Setting</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-white mb-2 uppercase tracking-widest">{isFoundational ? 'Platform Point Cost' : 'Cash Price (₦)'}</label>
                                <input type="number" value={isFoundational ? editSettings.pointCost || 0 : editSettings.price || 0} onChange={e => setEditSettings({...editSettings, [isFoundational ? 'pointCost' : 'price']: Number(e.target.value)})} className={registryInputClasses + " bg-white/10 text-white border-white/20"} />
                            </div>
                        </div>
                    </section>
                )}
                <div className="flex gap-4 pt-6">
                    {!(isAdmin && isPendingReview) && <Button className="flex-1 py-4 font-black uppercase tracking-widest text-xs rounded-2xl" onClick={handleApplySettings}>Update Registry</Button>}
                    <button className="flex-1 py-4 bg-white text-gray-400 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-gray-50 border border-gray-100 transition-all" onClick={() => setShowSettings(false)}>Cancel</button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditSprint;
