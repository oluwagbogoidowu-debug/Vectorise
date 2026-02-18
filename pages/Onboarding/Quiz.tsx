import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';
import { sanitizeData } from '../../services/userService';

type QuizQuestion = {
  title: string;
  options: string[];
};

type PersonaQuizData = {
  [key: string]: QuizQuestion[];
};

const PERSONA_QUIZZES: PersonaQuizData = {
  "Entrepreneur": [
    {
      title: "Where’s your startup?",
      options: ["Idea", "Pre-launch (MVP)", "Early (first users)", "Growth (scaling)", "Pivoting", "Funded & expanding"]
    },
    {
      title: "Your biggest roadblock?",
      options: ["Validating fit", "Building MVP", "Getting users", "Raising funds", "Scaling team/ops", "Beating competition"]
    },
    {
        title: "Top priority (Next 12 Months)?",
        options: ["Product-market fit", "Grow users", "Secure funding", "Build brand", "Optimize team/ops", "Enter new markets"]
    }
  ],
  "Business Owner": [
      {
          title: "Business type",
          options: ["Product-based", "Service-based", "Hybrid (product + service)", "Franchise", "E-commerce / Online store", "Local / Brick-and-mortar"]
      },
      {
          title: "Core challenge",
          options: ["Attracting new clients/customers", "Retaining existing clients/customers", "Scaling & increasing revenue", "Managing operations/team", "Standing out from competitors", "Accessing funding/capital"]
      },
      {
          title: "Business goal (Next 12 Months)",
          options: ["Build recognizable brand", "Expand into new markets/locations", "Improve loyalty & retention", "Streamline operations", "Launch new products/services", "Increase profitability/margins"]
      }
  ],
  "Freelancer/Consultant": [
      {
          title: "Service focus",
          options: ["Coaching/mentoring", "Design/creative", "Marketing/sales", "Tech/IT", "Business/management consulting", "Other expertise"]
      },
      {
          title: "Challenge",
          options: ["Getting consistent clients", "Charging my worth", "Standing out", "Building credibility", "Structuring offers/packages", "Managing clients & time"]
      },
      {
          title: "Growth goal (Next 12 Months)",
          options: ["Attract high-paying clients", "Package/structure services", "Build personal brand", "Shift to retainers", "Diversify into products/courses", "Scale client delivery"]
      }
  ],
  "Creative/Hustler": [
      {
          title: "Focus",
          options: ["Turn talent into profit", "Grow audience", "Land high-paying clients", "Balance art + money", "Build collabs/partnerships", "Break free from undervaluation"]
      },
      {
          title: "Struggle",
          options: ["Packaging & positioning", "Inconsistent/low income", "Not being seen", "Passion vs. survival conflict", "No structure/strategy", "Charging true worth"]
      },
      {
          title: "2–3 Year vision",
          options: ["Thriving creative biz", "Known authority in craft", "Partnering with big brands", "From hustle to entrepreneurship", "Multiple income streams", "Inspiring others through passion"]
      }
  ],
  "9-5 Professional": [
       {
          title: "Role",
          options: ["Mid-level manager", "Senior executive", "Specialist/expert", "Team lead", "Early career, aiming higher", "Other track"]
      },
      {
          title: "Challenge",
          options: ["Not recognized for expertise", "Plateaued/no growth", "Struggling to move into leadership", "Hard to stand out", "Preparing to pivot to entrepreneurship", "Balancing career + personal goals"]
      },
      {
          title: "Goal (Next 12 Months)",
          options: ["Gain recognition as leader/expert", "Build influence inside & outside", "Prep for entrepreneurship", "Secure promotion/upgrade", "Strengthen personal brand", "Grow network & opportunities"]
      }
  ],
   "Student/Graduate": [
       {
          title: "What’s your biggest focus right now?",
          options: ["Build personal brand before job market", "Get clarity on career direction", "Land internships/entry roles", "Move from school to real projects", "Grow skills & confidence to stand out", "Explore entrepreneurship as a path"]
      },
      {
          title: "What’s your biggest hurdle?",
          options: ["Lack of real-world experience", "Unsure how to present myself", "Limited network/connections", "Balancing studies with prep", "Overwhelmed by career options", "Fear of failure/rejection"]
      },
      {
          title: "Where do you see yourself soon (2–3 Years)?",
          options: ["Working in a top company", "Running a small biz/startup", "Advancing studies (Masters/pro courses)", "Known in my field/industry", "Trying out different paths", "Still figuring it out, but progressing"]
      }
  ]
};

const INITIAL_OPTIONS = [
  "Entrepreneur",
  "Business Owner",
  "Freelancer/Consultant",
  "9-5 Professional",
  "Student/Graduate",
  "Creative/Hustler"
];

const OCCUPATION_QUESTION = {
  title: "What is your current<br />employment status?",
  options: ["University Student", "Employed / Earning Salary", "Self-Employed / Business", "Unemployed / Looking"]
};

const STORAGE_KEY = 'vectorise_quiz_prefill';

const Quiz: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { targetSprintId, referrerId } = location.state || {};

  // Initialize state from localStorage if available
  const getInitialState = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            return { step: 0, answers: {}, selectedPersona: null, occupation: null };
        }
    }
    return { step: 0, answers: {}, selectedPersona: null, occupation: null };
  };

  const initialState = getInitialState();
  const [step, setStep] = useState(initialState.step || 0);
  const [answers, setAnswers] = useState<{[key: number]: string}>(initialState.answers || {});
  const [selectedPersona, setSelectedPersona] = useState<string | null>(initialState.selectedPersona || null);
  const [occupation, setOccupation] = useState<string | null>(initialState.occupation || null);
  const [showSummary, setShowSummary] = useState(false);

  // Auto-persist state to localStorage on every change
  useEffect(() => {
    // FIXED: Using sanitizeData to strictly ensure no circular structures reach JSON.stringify
    const cleanAnswers = sanitizeData(answers);

    const stateToSave = sanitizeData({
        step, 
        answers: cleanAnswers, 
        selectedPersona, 
        occupation
    });
    
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (err) {
        console.warn("LocalStorage save failed", err);
    }
  }, [step, answers, selectedPersona, occupation]);

  const currentQuestion = useMemo(() => {
    if (step === 0) {
      return {
        title: "Which best describes<br />you today?",
        options: INITIAL_OPTIONS
      };
    }
    const personaQuestions = selectedPersona ? PERSONA_QUIZZES[selectedPersona] : [];
    const personaQCount = personaQuestions.length;
    if (step > 0 && step <= personaQCount) return personaQuestions[step - 1];
    if (step === personaQCount + 1) return OCCUPATION_QUESTION;
    return null;
  }, [step, selectedPersona]);

  const totalSteps = useMemo(() => {
     if (!selectedPersona) return 1;
     return 1 + PERSONA_QUIZZES[selectedPersona].length + 1; 
  }, [selectedPersona]);

  const progressPercentage = useMemo(() => {
    if (step === 0) return 15; 
    return Math.min(100, Math.round(((step + 1) / totalSteps) * 100));
  }, [step, totalSteps]);

  const handleOptionSelect = (option: string) => {
    setAnswers(prev => ({ ...prev, [step]: option }));
    const personaQuestions = selectedPersona ? PERSONA_QUIZZES[selectedPersona] : [];
    if (step === 0) {
        if (selectedPersona && selectedPersona !== option) {
            setAnswers({ 0: option });
            setOccupation(null);
        }
        setSelectedPersona(option);
    }
    else if (step === personaQuestions.length + 1) setOccupation(option);
  };

  const handleNext = () => {
     const personaQuestions = selectedPersona ? PERSONA_QUIZZES[selectedPersona] : [];
     if (step >= totalSteps - 1) setShowSummary(true);
     else setStep(step + 1);
  };

  const handlePrevious = () => {
    if (showSummary) { setShowSummary(false); return; }
    if (step === 0) navigate('/onboarding/intro');
    else setStep(step - 1);
  };

  const handleFinish = () => {
    let recommendedPlan = 'free'; 
    if (occupation === 'University Student') recommendedPlan = 'student';
    else recommendedPlan = 'basic';
    
    // Pass data through state to recommendations page
    navigate('/recommended', { 
      state: sanitizeData({ 
        persona: selectedPersona, 
        answers, 
        occupation, 
        recommendedPlan,
        targetSprintId,
        referrerId 
      }) 
    });
  };

  if (showSummary && selectedPersona) {
    return (
      <div className="flex flex-col h-screen px-6 py-4 max-w-md mx-auto w-full font-sans text-white animate-fade-in relative overflow-hidden bg-primary">
        <div className="pt-6 pb-4 text-center relative z-10">
          <LocalLogo type="white" className="h-8 w-auto mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl font-black mb-1 tracking-tight">Your blueprint</h2>
          <p className="opacity-60 text-xs font-bold">Optimized for your path</p>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-white/10 rounded-[2rem] p-6 mb-6 backdrop-blur-xl border border-white/20 shadow-2xl relative z-10">
          <div className="mb-6 border-b border-white/10 pb-4">
            <p className="text-[9px] font-black text-white/40 mb-1.5">Selected profile</p>
            <p className="text-xl font-black text-white tracking-tight">{selectedPersona}</p>
          </div>
          
           <div className="mb-6 border-b border-white/10 pb-4">
            <p className="text-[9px] font-black text-white/40 mb-1.5">Context</p>
            <p className="text-base font-black text-white">{occupation}</p>
          </div>

          <div className="space-y-6">
            <p className="text-[9px] font-black text-white/40">Core insights</p>
            {PERSONA_QUIZZES[selectedPersona].map((question, index) => (
              <div key={index}>
                <p className="text-[9px] font-bold text-white/60 mb-1.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: question.title }} />
                <div className="bg-black/20 rounded-xl p-3.5 border border-white/5">
                    <p className="text-xs font-bold text-white">{answers[index + 1]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 pb-6 relative z-10">
            <button onClick={handleFinish} className="w-full bg-white text-primary font-black py-4 rounded-full shadow-2xl active:scale-95 transition-all text-base hover:bg-gray-50 uppercase tracking-widest">
                See My Plan
            </button>
            <button onClick={() => setShowSummary(false)} className="w-full text-white/50 font-black py-2 text-[9px] hover:text-white transition-colors">
                Refine answers
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen px-6 py-3 max-w-md mx-auto w-full font-sans bg-primary text-white overflow-hidden">
      <div className="pt-4 pb-6 flex flex-col items-center flex-shrink-0">
        <LocalLogo type="white" className="h-5 w-auto mb-6 opacity-60" />
        <div className="w-full h-1 bg-white/10 rounded-full relative overflow-hidden">
          <div className="absolute left-0 top-0 h-full bg-white rounded-full transition-all duration-700 shadow-[0_0_10px_white]" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </div>

      <h1 className="text-2xl font-black text-white text-center mb-6 leading-tight flex-shrink-0 tracking-tight" dangerouslySetInnerHTML={{ __html: currentQuestion?.title || "" }} />

      <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 mb-4 px-1 space-y-2.5">
          {currentQuestion?.options.map((option) => {
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

      <div className="flex-shrink-0 pt-1 pb-4">
        <div className="flex justify-between gap-3 mb-6">
          <button onClick={handlePrevious} className="flex-1 bg-white/10 text-white border border-white/10 font-black py-3 rounded-full active:scale-95 transition-all text-xs">Previous</button>
          <button onClick={handleNext} disabled={!answers[step]} className={`flex-1 font-black py-3 rounded-full shadow-xl transition-all text-xs ${answers[step] ? 'bg-white text-primary active:scale-95' : 'bg-white/30 text-white/50 cursor-not-allowed'}`}>Next</button>
        </div>
        <div className="flex justify-center"><div className="w-24 h-1 bg-white/20 rounded-full"></div></div>
      </div>
    </div>
  );
};

export default Quiz;
