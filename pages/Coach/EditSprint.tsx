
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sprint, DailyContent, SprintDifficulty, SprintTargeting } from '../../types';
import { sprintService } from '../../services/sprintService';
import Button from '../../components/Button';
import { isRegistryIncomplete, isSprintIncomplete, getSprintOutcomes } from '../../utils/sprintUtils';
import { useAuth } from '../../contexts/AuthContext';
import FormattedText from '../../components/FormattedText';
import { QUIZ_STRUCTURE, translateToTag } from '../../utils/tagUtils';

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
  
  const [showSettings, setShowSettings] = useState(false);
  const [editSettings, setEditSettings] = useState<Partial<Sprint>>({});

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
              outcomes: effectiveSprint.outcomes ? [...effectiveSprint.outcomes] : []
          };
          
          setSprint(cloned);
          setEditSettings({
            title: cloned.title,
            description: cloned.description,
            category: cloned.category,
            difficulty: cloned.difficulty,
            price: cloned.price,
            pointCost: cloned.pointCost,
            pricingType: cloned.pricingType || 'cash',
            duration: cloned.duration,
            coverImageUrl: cloned.coverImageUrl,
            outcomes: cloned.outcomes || getSprintOutcomes(cloned),
            targeting: cloned.targeting || {
                persona: QUIZ_STRUCTURE.persona[0],
                p1: '', p2: '', p3: '',
                occupation: QUIZ_STRUCTURE.occupation[0]
            }
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

  const personaQuestions = useMemo(() => {
      return (QUIZ_STRUCTURE.questions as any)[editSettings.targeting?.persona || 'Entrepreneur'] || [];
  }, [editSettings.targeting?.persona]);

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
    if (!sprint) return;
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
    
    if (registryIncomplete) {
      alert("Please complete the Sprint Registry info before submitting.");
      return;
    }

    if (curriculumIncomplete) {
      alert(`Daily curriculum is incomplete.`);
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

  const handleApplySettings = () => {
    if (!sprint) return;
    
    let sanitizedTargeting: SprintTargeting | undefined = undefined;

    if (!isFoundational && editSettings.targeting) {
        const t = editSettings.targeting;
        sanitizedTargeting = {
            persona: t.persona,
            p1: t.p1 ? translateToTag(t.persona, t.p1) : '',
            p2: t.p2 ? translateToTag(t.persona, t.p2) : '',
            p3: t.p3 ? translateToTag(t.persona, t.p3) : '',
            occupation: translateToTag('', t.occupation)
        };
    }

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

    setSprint({
      ...sprint,
      ...editSettings as any,
      targeting: sanitizedTargeting,
      duration: newDuration,
      dailyContent: updatedDailyContent
    });
    setShowSettings(false);
    setSaveStatus('idle');
  };

  const handleTargetingFieldChange = (field: string, value: string) => {
      setEditSettings(prev => {
          const newTargeting = { ...(prev.targeting as SprintTargeting), [field]: value };
          if (field === 'persona') {
              newTargeting.p1 = ''; newTargeting.p2 = ''; newTargeting.p3 = '';
          }
          return { ...prev, targeting: newTargeting };
      });
  };

  const handleOutcomeChange = (index: number, value: string) => {
    const outcomes = [...(editSettings.outcomes || [])];
    outcomes[index] = value;
    setEditSettings({ ...editSettings, outcomes });
  };

  const addOutcome = () => {
    setEditSettings({ ...editSettings, outcomes: [...(editSettings.outcomes || []), ''] });
  };

  const removeOutcome = (index: number) => {
    setEditSettings({ ...editSettings, outcomes: (editSettings.outcomes || []).filter((_, i) => i !== index) });
  };

  if (!sprint) return <div className="p-8 text-center text-gray-500">Loading editor...</div>;

  const editorInputClasses = "w-full p-6 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-medium transition-all placeholder-gray-300 resize-none";
  const registryInputClasses = "w-full px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold transition-all";

  const isDayComplete = (day: number) => {
    const content = sprint.dailyContent.find(c => c.day === day);
    return !!(content && content.lessonText?.trim() && content.taskPrompt?.trim());
  };

  const completedDaysCount = Array.from({ length: sprint.duration }, (_, i) => i + 1)
    .filter(day => isDayComplete(day)).length;

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
                <span className="text-[10px] font-black uppercase tracking-widest">Registry</span>
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleSaveDraft} disabled={saveStatus === 'saving'} className="bg-white border-gray-200 text-gray-600 font-black uppercase tracking-widest text-[10px] rounded-xl px-6">
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Draft'}
            </Button>
            <Button onClick={handleSubmitForApproval} disabled={!canSubmit} className={`font-black uppercase tracking-widest text-[10px] rounded-xl px-6 shadow-lg shadow-primary/10 transition-all ${!canSubmit ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}>
              Submit Review
            </Button>
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
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Status:</span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${completedDaysCount === sprint.duration ? 'text-primary' : 'text-orange-500'}`}>
                    {completedDaysCount}/{sprint.duration} Built
                </span>
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
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest px-2">Lesson Material</label>
              <textarea value={currentContent.lessonText || ''} onChange={e => handleContentChange('lessonText', e.target.value)} rows={8} className={editorInputClasses} placeholder="Lesson content..." />
            </div>
            <div className="space-y-4">
              <label className="block text-[11px] font-black text-primary uppercase tracking-widest px-2">Actionable Task</label>
              <textarea value={currentContent.taskPrompt || ''} onChange={e => handleContentChange('taskPrompt', e.target.value)} rows={4} className={editorInputClasses} placeholder="Action task..." />
            </div>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-8 border-b border-gray-50 bg-gray-50/50">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Sprint Registry</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-10 overflow-y-auto space-y-10 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Program Title</label>
                        <input type="text" value={editSettings.title || ''} onChange={e => setEditSettings({...editSettings, title: e.target.value})} className={registryInputClasses} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
                        <textarea value={editSettings.description || ''} onChange={e => setEditSettings({...editSettings, description: e.target.value})} rows={4} className={registryInputClasses + " resize-none"} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cover Image URL</label>
                        <input type="url" value={editSettings.coverImageUrl || ''} onChange={e => setEditSettings({...editSettings, coverImageUrl: e.target.value})} className={registryInputClasses} />
                    </div>
                    
                    {!isFoundational && (
                        <>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Category</label>
                                <select value={editSettings.category || ''} onChange={e => setEditSettings({...editSettings, category: e.target.value})} className={registryInputClasses}>
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Difficulty</label>
                                <select value={editSettings.difficulty || 'Beginner'} onChange={e => setEditSettings({...editSettings, difficulty: e.target.value as SprintDifficulty})} className={registryInputClasses}>
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                </select>
                            </div>
                        </>
                    )}

                    {isFoundational && (
                        <div className="md:col-span-2 bg-primary/5 p-4 rounded-xl border border-primary/10">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Platform Status: {sprint.category}</p>
                        </div>
                    )}

                    {!isFoundational && (
                        <div className="md:col-span-2 space-y-6 bg-gray-50/30 p-6 rounded-3xl border border-gray-100">
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Targeting Profile</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Ideal Persona (Compulsory)</label>
                                    <select value={editSettings.targeting?.persona} onChange={e => handleTargetingFieldChange('persona', e.target.value)} className={registryInputClasses}>
                                        {QUIZ_STRUCTURE.persona.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                {personaQuestions.map((q: string, idx: number) => (
                                    <div key={idx}>
                                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 line-clamp-1">{q}</label>
                                        <select 
                                            value={(editSettings.targeting as any)?.[`p${idx+1}`]} 
                                            onChange={e => handleTargetingFieldChange(`p${idx+1}`, e.target.value)} 
                                            className={registryInputClasses}
                                        >
                                            <option value="">Any (Optional)</option>
                                            {(QUIZ_STRUCTURE.options as any)[q]?.map((opt: string) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Ideal Occupation (Compulsory)</label>
                                    <select value={editSettings.targeting?.occupation} onChange={e => handleTargetingFieldChange('occupation', e.target.value)} className={registryInputClasses}>
                                        {QUIZ_STRUCTURE.occupation.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Duration (Days)</label>
                        <select value={editSettings.duration || 0} onChange={e => setEditSettings({...editSettings, duration: Number(e.target.value)})} className={registryInputClasses}>
                            {(isFoundational ? [3, 5] : [3, 5, 7, 10, 14, 21, 30]).map(d => <option key={d} value={d}>{d} Days</option>)}
                        </select>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Core Outcomes</label>
                            <button type="button" onClick={addOutcome} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">+ Add Outcome</button>
                        </div>
                        {(editSettings.outcomes || []).map((outcome, index) => (
                            <div key={index} className="flex gap-2">
                                <input type="text" value={outcome} onChange={(e) => handleOutcomeChange(index, e.target.value)} className={registryInputClasses} placeholder="Outcome..." />
                                <button type="button" onClick={() => removeOutcome(index)} className="p-3 text-gray-400 hover:text-red-500 bg-white rounded-2xl shadow-sm border border-gray-100 transition-all"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
                            </div>
                        ))}
                    </div>

                    <div className="md:col-span-2 bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100">
                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Investment Setting</h5>
                        {isFoundational ? (
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Platform Point Cost</label>
                                <input type="number" value={editSettings.pointCost || 0} onChange={e => setEditSettings({...editSettings, pointCost: Number(e.target.value)})} className={registryInputClasses} />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Cash Price (₦)</label>
                                <input type="number" value={editSettings.price || 0} onChange={e => setEditSettings({...editSettings, price: Number(e.target.value)})} className={registryInputClasses} />
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-4 pt-6">
                    <Button className="flex-1 py-4 font-black uppercase tracking-widest text-xs rounded-2xl" onClick={handleApplySettings}>Apply Updates</Button>
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
