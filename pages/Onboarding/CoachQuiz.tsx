
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';

type QuizQuestion = {
  title: string;
  options?: string[];
  type: 'select' | 'text' | 'number';
  placeholder?: string;
  helper?: string;
};

const COACH_QUIZ: QuizQuestion[] = [
    {
      title: "Coaching domain?",
      options: ["Business & Leadership", "Career & Professional", "Life & Mindset", "Health & Wellness", "Finance & Wealth", "Skill Specific"],
      type: 'select'
    },
    {
      title: "Registry experience",
      options: ["Starting out", "1-3 Years", "3-7 Years", "7-10 Years", "Established Authority"],
      type: 'select'
    },
    {
      title: "Core transformation",
      helper: "What is the shift your clients experience?",
      type: 'text',
      placeholder: "e.g. My transformation is..."
    },
    {
      title: "Client success story",
      helper: "The challenge and the visible result.",
      type: 'text',
      placeholder: "One client faced..."
    },
    {
      title: "Client outcomes",
      options: ["0-5 Clients", "5-20 Clients", "20-50 Clients", "100+ Clients"],
      type: 'select'
    },
    {
      title: "Unique approach",
      helper: "Your signature framework.",
      type: 'text',
      placeholder: "My methodology involves..."
    },
    {
      title: "Unique philosophy",
      helper: "The core belief behind your work.",
      type: 'text',
      placeholder: "My core thought is..."
    },
    {
      title: "Embodied traits",
      helper: "Values you live and teach.",
      type: 'text',
      placeholder: "I embody traits like..."
    },
    {
      title: "Personal practice",
      helper: "Habit that aids your growth.",
      type: 'text',
      placeholder: "My daily habit is..."
    },
    {
      title: "Practice results",
      helper: "Impact on your own life.",
      type: 'text',
      placeholder: "It results in..."
    },
    {
      title: "Current pricing",
      helper: "Standard investment fee.",
      type: 'text',
      placeholder: "e.g. ₦150k/mo"
    },
    {
        title: "Current audience",
        options: ["Under 1k", "1k - 5k", "20k - 100k", "Niche/Exclusive"],
        type: 'select'
    }
];

const CoachQuiz: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<{[key: number]: string}>({});
  const [showSummary, setShowSummary] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const currentQuestion = COACH_QUIZ[step];
  const totalSteps = COACH_QUIZ.length;

  const progressPercentage = useMemo(() => {
    return Math.min(100, Math.round(((step + 1) / totalSteps) * 100));
  }, [step, totalSteps]);

  useEffect(() => {
    if (currentQuestion.type === 'text' && textRef.current) {
        textRef.current.focus();
    }
  }, [step, currentQuestion.type]);

  const handleOptionSelect = (option: string) => {
    setAnswers(prev => ({ ...prev, [step]: option }));
    if (currentQuestion.type === 'select') {
        setTimeout(() => handleNext(), 300);
    }
  };

  const handleTextChange = (val: string) => {
    setAnswers(prev => ({ ...prev, [step]: val }));
  };

  const handleNext = () => {
     if (!answers[step]) return;
     if (step >= totalSteps - 1) setShowSummary(true);
     else setStep(step + 1);
  };

  const handlePrevious = () => {
    if (showSummary) { setShowSummary(false); return; }
    if (step === 0) navigate('/onboarding/coach/intro');
    else setStep(step - 1);
  };

  const handleFinish = () => {
    const applicationData = {
        transformationDesc: answers[2],
        successStory: answers[3],
        predictableOutcomesCount: answers[4],
        uniqueApproach: answers[5],
        uniquePhilosophy: answers[6],
        embodiedTraits: answers[7],
        personalPractice: answers[8],
        personalPracticeResults: answers[9],
        currentPricing: answers[10]
    };
    navigate('/coach/onboarding/complete', { 
        state: { 
            answers, 
            niche: answers[0], 
            experience: answers[1],
            applicationDetails: applicationData
        } 
    });
  };

  if (showSummary) {
    return (
      <div className="flex flex-col h-[100dvh] w-screen px-6 py-4 max-w-md mx-auto w-full font-sans text-white animate-fade-in relative overflow-hidden bg-primary">
        <div className="pt-6 pb-4 text-center relative z-10 flex-shrink-0">
          <LocalLogo type="white" className="h-6 w-auto mx-auto mb-4 opacity-70" />
          <h2 className="text-2xl font-black mb-1 tracking-tight">Review application</h2>
          <p className="opacity-60 text-[9px] font-black uppercase tracking-widest">Registry Data</p>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-white/10 rounded-[2rem] p-6 mb-6 backdrop-blur-xl border border-white/20 shadow-2xl relative z-10 space-y-6">
            {COACH_QUIZ.map((question, index) => (
              <div key={index}>
                <p className="text-[9px] font-black text-white/40 mb-1.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: question.title }} />
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <p className="text-xs font-bold text-white leading-tight">{answers[index]}</p>
                </div>
              </div>
            ))}
        </div>

        <div className="space-y-2.5 pb-6 relative z-10 flex-shrink-0">
             <button onClick={handleFinish} className="w-full bg-white text-primary font-black py-4 rounded-full shadow-2xl active:scale-95 transition-all text-base uppercase tracking-widest">
               Secure Registry &rarr;
             </button>
             <button onClick={() => setShowSummary(false)} className="w-full text-white/40 font-black py-2 text-[9px] hover:text-white transition-colors uppercase tracking-widest">
                Edit Registry
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-screen px-6 py-4 max-w-md mx-auto w-full font-sans bg-primary text-white overflow-hidden">
      <div className="pt-4 pb-6 flex flex-col items-center flex-shrink-0">
        <LocalLogo type="white" className="h-5 w-auto mb-6 opacity-60" />
        <div className="w-full h-1 bg-white/10 rounded-full relative overflow-hidden">
          <div className="absolute left-0 top-0 h-full bg-white rounded-full transition-all duration-700 shadow-[0_0_10px_white]" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </div>

      <div className="flex-shrink-0 mb-6 text-center">
        <h1 className="text-2xl font-black text-white leading-tight tracking-tight mb-1.5" dangerouslySetInnerHTML={{ __html: currentQuestion?.title || "" }} />
        {currentQuestion.helper && (
            <p className="text-[11px] font-bold text-white/50 leading-relaxed px-2 italic">{currentQuestion.helper}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 mb-6 px-1">
          {currentQuestion.type === 'select' ? (
              <div className="space-y-2.5">
                  {currentQuestion?.options?.map((option) => {
                    const isSelected = answers[step] === option;
                    return (
                      <button
                        key={option}
                        onClick={() => handleOptionSelect(option)}
                        className={`w-full py-4 px-6 rounded-2xl border-2 flex items-center justify-between transition-all duration-300 group text-left text-base font-bold ${
                          isSelected ? 'bg-white border-white text-primary shadow-xl scale-[1.01]' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                        }`}
                      >
                        <span className="leading-tight">{option}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'border-primary bg-primary' : 'border-white/20 group-hover:border-white/40'}`}>
                          {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7"></path></svg>}
                        </div>
                      </button>
                    );
                  })}
              </div>
          ) : (
              <div className="animate-fade-in h-full flex flex-col">
                  <textarea 
                    ref={textRef}
                    value={answers[step] || ''}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder={currentQuestion.placeholder}
                    className="w-full flex-1 bg-white/5 border-2 border-white/10 rounded-[2rem] p-6 text-white text-base font-bold placeholder-white/20 outline-none focus:border-white/40 focus:bg-white/10 transition-all resize-none shadow-inner"
                  />
                  <div className="mt-3 text-center">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Input Registry Data</p>
                  </div>
              </div>
          )}
      </div>

      <div className="flex-shrink-0 pt-1 pb-6">
        <div className="flex justify-between gap-3 mb-6">
          <button onClick={handlePrevious} className="flex-1 bg-white/10 text-white border border-white/10 font-black py-3 rounded-full active:scale-95 transition-all text-xs uppercase tracking-widest">Back</button>
          <button onClick={handleNext} disabled={!answers[step]} className={`flex-1 font-black py-3 rounded-full shadow-xl transition-all text-xs uppercase tracking-widest ${answers[step] ? 'bg-white text-primary active:scale-95' : 'bg-white/30 text-white/50 cursor-not-allowed'}`}>
            Next
          </button>
        </div>
        <div className="flex justify-center"><div className="w-20 h-1 bg-white/20 rounded-full"></div></div>
      </div>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default CoachQuiz;
