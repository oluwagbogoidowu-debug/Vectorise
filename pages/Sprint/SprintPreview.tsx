import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sprint } from '../../types';
import { sprintService } from '../../services/sprintService';
import SprintCard from '../../components/SprintCard';
import LandingPreview from '../../components/LandingPreview';

const SprintPreview: React.FC = () => {
  const { sprintId } = useParams<{ sprintId: string }>();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewType, setPreviewType] = useState<'card' | 'landing'>('card');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSprint = async () => {
      if (!sprintId) return;
      setIsLoading(true);
      try {
        const fetchedSprint = await sprintService.getSprintById(sprintId);
        setSprint(fetchedSprint);
      } catch (err) {
        console.error("Failed to fetch sprint:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSprint();
  }, [sprintId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!sprint) {
    return <div className="p-8 text-center text-gray-500">Sprint not found</div>;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight italic">Live Registry Preview</h3>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Reviewing platform contexts</p>
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
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </header>
      <main className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2">
          {previewType === 'card' ? (
            <div className="max-w-sm mx-auto">
              <SprintCard sprint={sprint} />
            </div>
          ) : (
            <LandingPreview sprint={sprint} />
          )}
        </div>
        <div className="lg:col-span-1 space-y-4">
          <h4 className="text-lg font-bold mb-4">Daily Content</h4>
          <div className="space-y-4">
            {sprint.dailyContent.map(day => (
              <div key={day.day} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h5 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Day {day.day}</h5>
                <div className="space-y-4">
                  <div>
                    <h6 className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-2">Lesson</h6>
                    <p className="text-sm font-medium text-gray-700 leading-relaxed">{day.lessonText}</p>
                  </div>
                  <div>
                    <h6 className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-2">Task</h6>
                    <p className="text-sm font-medium text-gray-700 leading-relaxed">{day.taskPrompt}</p>
                  </div>
                  <div>
                    <h6 className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-2">Insight</h6>
                    <p className="text-sm font-medium text-gray-700 leading-relaxed">{day.coachInsight}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SprintPreview;
