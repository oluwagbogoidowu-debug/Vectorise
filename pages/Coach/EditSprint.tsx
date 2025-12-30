
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sprint, DailyContent } from '../../types';
import { MOCK_SPRINTS, MOCK_NOTIFICATIONS } from '../../services/mockData';
import Button from '../../components/Button';
import { generateSprintContent } from '../../services/geminiService';

const EditSprint: React.FC = () => {
  const { sprintId } = useParams();
  const navigate = useNavigate();
  
  // State holds the entire sprint object being edited
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  // Preview State
  const [showPreview, setShowPreview] = useState(false);
  const [previewDay, setPreviewDay] = useState(1);

  // Initial Load
  useEffect(() => {
    const foundSprint = MOCK_SPRINTS.find(s => s.id === sprintId);
    if (foundSprint) {
      // Create a deep copy to avoid mutating mock data directly until "Save" is clicked
      setSprint(JSON.parse(JSON.stringify(foundSprint)));
    } else {
      navigate('/coach/dashboard');
    }
  }, [sprintId, navigate]);

  // Derived content for the currently selected day
  const currentContent = sprint?.dailyContent.find(c => c.day === selectedDay) || {
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
            updatedDailyContent[existingContentIndex] = {
                ...updatedDailyContent[existingContentIndex],
                [field]: value
            };
        } else {
            const newContent: DailyContent = {
                day: selectedDay,
                lessonText: '',
                taskPrompt: '',
                [field]: value
            };
            updatedDailyContent.push(newContent);
        }

        return {
            ...prev,
            dailyContent: updatedDailyContent
        };
    });
    setSaveStatus('idle');
  };

  const handleGenerateContent = async (field: 'lessonText' | 'taskPrompt', topic: string) => {
      if (!sprint) return;
      setIsGenerating(true);
      const generated = await generateSprintContent(topic || `a personal growth lesson for day ${selectedDay} of ${sprint.title}`);
      handleContentChange(field, generated);
      setIsGenerating(false);
  };

  const handleSaveDraft = () => {
      if (!sprint) return;
      setSaveStatus('saving');

      // Find index in mock DB
      const idx = MOCK_SPRINTS.findIndex(s => s.id === sprint.id);
      if (idx !== -1) {
          // Ensure status is draft unless already approved/pending (which shouldn't happen in edit typically, but safe check)
          if (sprint.approvalStatus === 'rejected') {
              sprint.approvalStatus = 'draft'; // Reset to draft if editing after rejection
          }
          MOCK_SPRINTS[idx] = sprint;
          
          setTimeout(() => {
              setSaveStatus('saved');
              setTimeout(() => setSaveStatus('idle'), 2000);
          }, 500);
      } else {
          console.error("Sprint not found in database");
      }
  };

  // Validate if all days have content
  const isSprintComplete = () => {
      if (!sprint) return false;
      for (let day = 1; day <= sprint.duration; day++) {
          const content = sprint.dailyContent.find(c => c.day === day);
          if (!content || !content.lessonText?.trim() || !content.taskPrompt?.trim()) {
              return false;
          }
      }
      return true;
  };

  const handleSubmitForApproval = () => {
      if (!sprint) return;
      if (!isSprintComplete()) {
          alert("Please complete content for all days before submitting.");
          return;
      }

      const idx = MOCK_SPRINTS.findIndex(s => s.id === sprint.id);
      if (idx !== -1) {
          sprint.approvalStatus = 'pending_approval';
          sprint.published = false; // Ensure not published yet
          MOCK_SPRINTS[idx] = sprint;

          // Notify Admin (Mock)
          MOCK_NOTIFICATIONS.unshift({
              id: `notif_sub_${Date.now()}`,
              type: 'sprint_update', // reusing type
              text: `New Sprint Submitted: "${sprint.title}" by Coach.`,
              timestamp: new Date().toISOString(),
              read: false
          });

          alert("Sprint submitted successfully! An admin will review it shortly.");
          navigate('/coach/sprints');
      }
  };

  if (!sprint) return <div className="p-8 text-center">Loading sprint editor...</div>;

  const canSubmit = isSprintComplete();
  const previewContent = sprint.dailyContent.find(c => c.day === previewDay);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-24">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 relative z-10">
            <div>
                 <button 
                    type="button"
                    onClick={() => navigate('/coach/sprints')} 
                    className="group flex items-center text-gray-500 hover:text-primary transition-colors mb-2 text-sm font-medium cursor-pointer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Sprints
                </button>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-gray-900">Edit: {sprint.title}</h1>
                    <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                        sprint.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                        sprint.approvalStatus === 'pending_approval' ? 'bg-blue-100 text-blue-800' :
                        sprint.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-600'
                    }`}>
                        {sprint.approvalStatus.replace('_', ' ')}
                    </span>
                </div>
            </div>
            
            <div className="flex gap-3">
                <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => {
                        setPreviewDay(selectedDay);
                        setShowPreview(true);
                    }} 
                    className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                </Button>

                <Button variant="secondary" onClick={handleSaveDraft} disabled={saveStatus === 'saving'} className="bg-white border border-gray-200 text-gray-700">
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Draft'}
                </Button>

            </div>
        </div>
        
        {!canSubmit && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                You must add Lesson Text and Action Task for all {sprint.duration} days before you can submit this sprint for approval.
            </div>
        )}
        
        <div className="flex flex-col gap-6">
            {/* Horizontal Timeline Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex overflow-x-auto p-4 gap-3 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {Array.from({ length: sprint.duration }, (_, i) => i + 1).map(day => {
                        const content = sprint.dailyContent.find(c => c.day === day);
                        const isComplete = content && content.lessonText?.trim() && content.taskPrompt?.trim();
                        const isSelected = selectedDay === day;
                        
                        return (
                            <button 
                                key={day} 
                                onClick={() => handleDayChange(day)} 
                                className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-16 rounded-xl border transition-all duration-200 relative ${
                                    isSelected 
                                    ? 'bg-primary border-primary text-white shadow-md scale-105 z-10' 
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-primary/50 hover:bg-gray-50'
                                }`}
                            >
                                <span className="font-bold text-sm">Day {day}</span>
                                <span className={`mt-1.5 w-2 h-2 rounded-full ${isComplete ? (isSelected ? 'bg-white' : 'bg-green-500') : (isSelected ? 'bg-white/50' : 'bg-gray-300')}`}></span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Editor Main Area */}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100 min-h-[500px]">
                 <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                     <h2 className="text-2xl font-bold text-gray-900">Day {selectedDay} Content</h2>
                     <span className="text-sm text-gray-400">Auto-saving locally...</span>
                 </div>

                 <div className="space-y-8">
                     {/* Lesson Text Section */}
                     <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-gray-700">Lesson Content <span className="text-red-500">*</span></label>
                            <button 
                                onClick={() => handleGenerateContent('lessonText', `Day ${selectedDay} of ${sprint.title}`)}
                                disabled={isGenerating}
                                className="text-xs flex items-center gap-1 text-primary hover:text-primary-hover font-medium disabled:opacity-50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 5a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0v-1H3a1 1 0 010-2h1V8a1 1 0 011-1zm5-5a1 1 0 011 1v1h1a1 1 0 010 2h-1v1a1 1 0 01-2 0v-1h-1a1 1 0 010-2h1V3a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Generate with AI
                            </button>
                        </div>
                        <textarea 
                            value={currentContent.lessonText || ''} 
                            onChange={e => handleContentChange('lessonText', e.target.value)} 
                            rows={8} 
                            className="block w-full p-4 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y text-gray-700 bg-white"
                            placeholder="Write the main lesson for today..."
                        ></textarea>
                     </div>

                      {/* Task Prompt Section */}
                      <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-gray-700">Action Task <span className="text-red-500">*</span></label>
                            <button 
                                onClick={() => handleGenerateContent('taskPrompt', currentContent.lessonText || `Day ${selectedDay} task`)}
                                disabled={isGenerating}
                                className="text-xs flex items-center gap-1 text-primary hover:text-primary-hover font-medium disabled:opacity-50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 5a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0v-1H3a1 1 0 010-2h1V8a1 1 0 011-1zm5-5a1 1 0 011 1v1h1a1 1 0 010 2h-1v1a1 1 0 01-2 0v-1h-1a1 1 0 010-2h1V3a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Generate Task
                            </button>
                        </div>
                        <textarea 
                            value={currentContent.taskPrompt || ''} 
                            onChange={e => handleContentChange('taskPrompt', e.target.value)} 
                            rows={3} 
                            className="block w-full p-4 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y text-gray-700 bg-white mb-4"
                            placeholder="What should the participant do today?"
                        ></textarea>

                        {/* Submission Type Selector */}
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Submission Type:</span>
                            <div className="flex gap-4 flex-wrap">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="submissionType" 
                                        value="none" 
                                        checked={currentContent.submissionType === 'none'} 
                                        onChange={() => handleContentChange('submissionType', 'none')}
                                        className="text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-gray-700">None</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="submissionType" 
                                        value="text" 
                                        checked={!currentContent.submissionType || currentContent.submissionType === 'text'} 
                                        onChange={() => handleContentChange('submissionType', 'text')}
                                        className="text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-gray-700">Text Only</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="submissionType" 
                                        value="file" 
                                        checked={currentContent.submissionType === 'file'} 
                                        onChange={() => handleContentChange('submissionType', 'file')}
                                        className="text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-gray-700">File Upload</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="submissionType" 
                                        value="both" 
                                        checked={currentContent.submissionType === 'both'} 
                                        onChange={() => handleContentChange('submissionType', 'both')}
                                        className="text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-gray-700">Both</span>
                                </label>
                            </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Audio Lesson (Optional)</label>
                            <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload audio</span></p>
                                        <p className="text-xs text-gray-500">MP3, WAV (Max 10MB)</p>
                                    </div>
                                    <input type="file" className="hidden" accept="audio/*" />
                                </label>
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm font-bold text-gray-700 mb-2">Resource Link (Optional)</label>
                             <input 
                                type="url" 
                                value={currentContent.resourceUrl || ''} 
                                onChange={e => handleContentChange('resourceUrl', e.target.value)} 
                                className="block w-full p-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white" 
                                placeholder="https://example.com/worksheet.pdf" 
                             />
                             <p className="mt-2 text-xs text-gray-500">Add a link to a worksheet, video, or external article.</p>
                        </div>
                     </div>
                 </div>
            </div>
        </div>

        {/* PREVIEW MODAL */}
        {showPreview && (
            <div className="fixed inset-0 z-50 bg-white overflow-y-auto animate-fade-in">
                <div className="bg-primary text-white px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-md">
                    <div className="flex items-center gap-3">
                        <span className="bg-white/20 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider backdrop-blur-sm">Preview Mode</span>
                        <h2 className="font-bold text-lg truncate max-w-[200px] sm:max-w-md">{sprint.title}</h2>
                    </div>
                    <button onClick={() => setShowPreview(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="max-w-4xl mx-auto px-4 py-8">
                    {/* Preview Day Selector */}
                    <div className="flex overflow-x-auto gap-4 pb-6 hide-scrollbar snap-x mb-8">
                        {Array.from({ length: sprint.duration }, (_, i) => i + 1).map(day => {
                             const isSelected = previewDay === day;
                             const content = sprint.dailyContent.find(c => c.day === day);
                             const hasContent = content && content.lessonText && content.taskPrompt;
                             
                             return (
                                <div 
                                    key={day}
                                    onClick={() => setPreviewDay(day)}
                                    className={`flex-shrink-0 w-28 p-4 rounded-xl cursor-pointer border transition-all ${
                                        isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className={`text-xs font-bold uppercase block mb-1 ${isSelected ? 'text-primary' : 'text-gray-500'}`}>Day {day}</span>
                                    <div className={`w-2 h-2 rounded-full ${hasContent ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                </div>
                             )
                        })}
                    </div>

                    {/* Preview Content View */}
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 md:p-8 min-h-[400px]">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6">Day {previewDay}</h3>
                        
                        {previewContent?.lessonText ? (
                            <div className="prose max-w-none">
                                 <div className="mb-8">
                                    <h4 className="font-bold text-gray-900 mb-2 text-sm uppercase tracking-wide">Lesson Content</h4>
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-6 rounded-xl border border-gray-100">{previewContent.lessonText}</p>
                                 </div>
                                 
                                 <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-8">
                                    <h4 className="font-bold text-blue-900 mb-2 text-sm uppercase tracking-wide">Your Task</h4>
                                    <p className="text-blue-800 font-medium text-lg italic">"{previewContent.taskPrompt}"</p>
                                    
                                    {/* File Upload Preview */}
                                    {previewContent.submissionType && (previewContent.submissionType === 'file' || previewContent.submissionType === 'both') && (
                                        <div className="mt-4 border-2 border-dashed border-blue-300 bg-white/50 rounded-lg p-4 text-center text-blue-600 text-sm">
                                            [File Upload Input Would Appear Here]
                                        </div>
                                    )}
                                    
                                    {/* Text Input Preview */}
                                    {(!previewContent.submissionType || previewContent.submissionType === 'text' || previewContent.submissionType === 'both') && (
                                         <div className="mt-4 border border-blue-200 bg-white/50 rounded-lg p-4 text-blue-600 text-sm italic">
                                            [Text Answer Input Would Appear Here]
                                        </div>
                                    )}
                                    
                                    {/* None Preview */}
                                    {previewContent.submissionType === 'none' && (
                                        <div className="mt-4 text-sm text-blue-600 italic">
                                            No submission required.
                                        </div>
                                    )}
                                 </div>

                                 {previewContent.resourceUrl && (
                                    <div className="flex items-center gap-2 text-primary font-medium bg-white border border-gray-200 p-4 rounded-lg shadow-sm inline-flex hover:bg-gray-50 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                                        </svg>
                                        <a href={previewContent.resourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">View Resource</a>
                                    </div>
                                 )}
                            </div>
                        ) : (
                            <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                                <p className="mb-2">No content added for Day {previewDay}.</p>
                                <Button variant="secondary" onClick={() => {setShowPreview(false); setSelectedDay(previewDay);}}>
                                    Add Content
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        <style>{`
            .hide-scrollbar::-webkit-scrollbar {
                display: none;
            }
            .hide-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
              animation: fadeIn 0.2s ease-out forwards;
            }
        `}</style>
    </div>
  );
};

export default EditSprint;
