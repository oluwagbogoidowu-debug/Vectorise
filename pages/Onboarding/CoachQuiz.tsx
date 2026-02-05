
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
      title: "What is your primary<br />coaching domain?",
      options: ["Business & Leadership", "Career & Professional", "Life & Mindset", "Health & Wellness", "Finance & Wealth", "Skill Specific (Tech/Art)"],
      type: 'select'
    },
    {
      title: "How many years of professional<br />experience do you have?",
      options: ["Just starting out", "1-3 Years", "3-7 Years", "7-10 Years", "10+ Years", "Established Authority"],
      type: 'select'
    },
    {
      title: "Describe the specific<br />transformation you provide.",
      helper: "What is the core shift or result your clients experience through your guidance?",
      type: 'text',
      placeholder: "My current transformation for clients looks like..."
    },
    {
      title: "Share a brief client<br />success story.",
      helper: "The challenge they faced, how you navigated it together, and the visible result.",
      type: 'text',
      placeholder: "One of my clients faced a challenge where..."
    },
    {
      title: "How many clients have achieved<br />predictable outcomes for?",
      options: ["0-5 Clients", "5-20 Clients", "20-50 Clients", "50-100 Clients", "100+ Clients"],
      type: 'select'
    },
    {
      title: "What is your unique approach<br />to achieving this outcome?",
      helper: "What's the signature methodology or framework that makes your coaching distinct?",
      type: 'text',
      placeholder: "My unique approach to achieving this outcome involves..."
    },
    {
      title: "What is your unique philosophy<br />behind what you do?",
      helper: "The 'why' and the core beliefs that drive your specific coaching style.",
      type: 'text',
      placeholder: "My unique thought to how I do what I do is..."
    },
    {
      title: "Which personal traits from your<br />framework do you embody?",
      helper: "Share insight into how you live out the values you teach to your clients.",
      type: 'text',
      placeholder: "Personal traits from my framework that I embody include..."
    },
    {
      title: "Do you have a personal practice<br />that aids your growth?",
      helper: "A lived experience or habit you'd be willing to teach others to achieve as well.",
      type: 'text',
      placeholder: "Apart from my coaching, a practice that's part of me is..."
    },
    {
      title: "What tangible results has<br />this personal practice given you?",
      helper: "The measurable impact this habit has had on your own life.",
      type: 'text',
      placeholder: "The tangible results it has given me include..."
    },
    {
      title: "What do you currently charge<br />for your coaching program?",
      helper: "The standard investment for your signature transformation.",
      type: 'text',
      placeholder: "e.g. ₦150,000 / month or $2,000 per package"
    },
    {
        title: "What is your current<br />audience size?",
        options: ["Under 1k", "1k - 5k", "5k - 20k", "20k - 100k", "100k+", "Niche/Exclusive"],
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
    // Auto-advance for select types if it's a simple choice
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
      <div className="flex flex-col h-screen px-6 py-4 max-w-md mx-auto w-full font-sans text-white animate-fade-in relative overflow-hidden bg-primary">
        <div className="pt-10 pb-6 text-center relative z-10">
          <LocalLogo type="white" className="h-8 w-auto mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl font-black mb-2 tracking-tight leading-none">Coach profile</h2>
          <p className="opacity-60 text-[10px] font-black">Registry application data</p>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-white/10 rounded-[2.5rem] p-8 mb-8 backdrop-blur-xl border border-white/20 shadow-2xl relative z-10 space-y-8">
            {COACH_QUIZ.map((question, index) => (
              <div key={index}>
                <p className="text-[10px] font-black text-white/40 mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: question.title }} />
                <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                    <p className="text-sm font-bold text-white leading-tight">{answers[index]}</p>
                </div>
              </div>
            ))}
        </div>

        <div className="space-y-3 pb-8 relative z-10">
             <button onClick={handleFinish} className="w-full bg-white text-primary font-black py-5 rounded-full shadow-2xl active:scale-95 transition-all text-lg hover:bg-gray-50 uppercase tracking-widest">
               Secure My Registry &rarr;
             </button>
             <button onClick={() => setShowSummary(false)} className="w-full text-white/40 font-black py-3 text-[10px] hover:text-white transition-colors">
                Edit application
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen px-6 py-4 max-w-md mx-auto w-full font-sans bg-primary text-white overflow-hidden">
      <div className="pt-8 pb-10 flex flex-col items-center flex-shrink-0">
        <LocalLogo type="white" className="h-6 w-auto mb-8 opacity-60" />
        <div className="w-full h-1 bg-white/10 rounded-full relative overflow-hidden">
          <div className="absolute left-0 top-0 h-full bg-white rounded-full transition-all duration-700 shadow-[0_0_10px_white]" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </div>

      <div className="flex-shrink-0 mb-6">
        <h1 className="text-3xl font-black text-white text-center leading-tight tracking-tight mb-2" dangerouslySetInnerHTML={{ __html: currentQuestion?.title || "" }} />
        {currentQuestion.helper && (
            <p className="text-center text-xs font-bold text-white/60 leading-relaxed px-4">{currentQuestion.helper}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 mb-6 px-1">
          {currentQuestion.type === 'select' ? (
              <div className="space-y-3">
                  {currentQuestion?.options?.map((option) => {
                    const isSelected = answers[step] === option;
                    return (
                      <button
                        key={option}
                        onClick={() => handleOptionSelect(option)}
                        className={`w-full py-5 px-8 rounded-[2rem] border-2 flex items-center justify-between transition-all duration-300 group text-left text-lg font-bold ${
                          isSelected ? 'bg-white border-white text-primary shadow-xl scale-[1.02]' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                        }`}
                      >
                        <span className="leading-tight">{option}</span>
                        <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'border-primary bg-primary' : 'border-white/20 group-hover:border-white/40'}`}>
                          {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7"></path></svg>}
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
                    className="w-full flex-1 bg-white/5 border-2 border-white/10 rounded-[2.5rem] p-8 text-white text-lg font-bold placeholder-white/20 outline-none focus:border-white/40 focus:bg-white/10 transition-all resize-none shadow-inner"
                  />
                  <div className="mt-4 text-center">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Capture your honest thoughts</p>
                  </div>
              </div>
          )}
      </div>

      <div className="flex-shrink-0 pt-2 pb-6">
        <div className="flex justify-between gap-4 mb-8">
          <button onClick={handlePrevious} className="flex-1 bg-white/10 text-white border border-white/10 font-black py-4 rounded-full active:scale-95 transition-all text-sm">Previous</button>
          <button onClick={handleNext} disabled={!answers[step]} className={`flex-1 font-black py-4 rounded-full shadow-xl transition-all text-sm ${answers[step] ? 'bg-white text-primary active:scale-95' : 'bg-white/30 text-white/50 cursor-not-allowed'}`}>
            {currentQuestion.type === 'text' ? 'Save & Next' : 'Next'}
          </button>
        </div>
        <div className="flex justify-center"><div className="w-36 h-1 bg-white/20 rounded-full"></div></div>
      </div>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default CoachQuiz;
