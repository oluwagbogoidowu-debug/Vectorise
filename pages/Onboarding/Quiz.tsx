
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

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
          title: "Business Type",
          options: ["Product-based", "Service-based", "Hybrid (product + service)", "Franchise", "E-commerce / Online store", "Local / Brick-and-mortar"]
      },
      {
          title: "Core Challenge",
          options: ["Attracting new clients/customers", "Retaining existing clients/customers", "Scaling & increasing revenue", "Managing operations/team", "Standing out from competitors", "Accessing funding/capital"]
      },
      {
          title: "Business Goal (Next 12 Months)",
          options: ["Build recognizable brand", "Expand into new markets/locations", "Improve loyalty & retention", "Streamline operations", "Launch new products/services", "Increase profitability/margins"]
      }
  ],
  "Freelancer/Consultant": [
      {
          title: "Service Focus",
          options: ["Coaching/mentoring", "Design/creative", "Marketing/sales", "Tech/IT", "Business/management consulting", "Other expertise"]
      },
      {
          title: "Challenge",
          options: ["Getting consistent clients", "Charging my worth", "Standing out", "Building credibility", "Structuring offers/packages", "Managing clients & time"]
      },
      {
          title: "Growth Goal (Next 12 Months)",
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
          title: "2–3 Year Vision",
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

// Additional classification questions
const OCCUPATION_QUESTION = {
  title: "What is your current<br />employment status?",
  options: ["University Student", "Employed / Earning Salary", "Self-Employed / Business", "Unemployed / Looking"]
};

const INCOME_QUESTION = {
  title: "What is your estimated<br />monthly income range?",
  options: ["Under ₦50,000", "₦50,000 - ₦150,000", "₦150,000 - ₦250,000", "Above ₦250,000"]
};

const Quiz: React.FC = () => {
  const navigate = useNavigate();
  
  // step 0: Persona
  // step 1 to N: Persona specific questions
  // step N+1: Occupation
  // step N+2: Income (if not student/unemployed)
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<{[key: number]: string}>({});
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  
  // New state for classification
  const [occupation, setOccupation] = useState<string | null>(null);
  const [incomeRange, setIncomeRange] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const currentQuestion = useMemo(() => {
    // Step 0: Persona
    if (step === 0) {
      return {
        title: "Which best describes<br />you today?",
        options: INITIAL_OPTIONS
      };
    }
    
    // Dynamic Persona Questions
    const personaQuestions = selectedPersona ? PERSONA_QUIZZES[selectedPersona] : [];
    const personaQCount = personaQuestions.length;

    // Step 1 to N
    if (step > 0 && step <= personaQCount) {
      return personaQuestions[step - 1];
    }

    // Step N+1: Occupation
    if (step === personaQCount + 1) {
      return OCCUPATION_QUESTION;
    }

    // Step N+2: Income (Only if applicable)
    if (step === personaQCount + 2) {
       // Skip income for students or unemployed if you want, but the prompt asks for bracket.
       // Let's ask everyone except maybe Students where implied.
       return INCOME_QUESTION;
    }

    return null;
  }, [step, selectedPersona]);

  // Determine total steps dynamically
  const totalSteps = useMemo(() => {
     if (!selectedPersona) return 1;
     let count = 1 + PERSONA_QUIZZES[selectedPersona].length + 1; // +1 for Occupation
     if (occupation !== 'University Student' && occupation !== 'Unemployed / Looking') {
         count += 1; // +1 for Income
     }
     return count;
  }, [selectedPersona, occupation]);

  const progressPercentage = useMemo(() => {
    if (step === 0) return 15; 
    return Math.min(100, Math.round(((step + 1) / totalSteps) * 100));
  }, [step, totalSteps]);

  const handleOptionSelect = (option: string) => {
    setAnswers(prev => ({ ...prev, [step]: option }));
    
    // Logic to store specific data
    const personaQuestions = selectedPersona ? PERSONA_QUIZZES[selectedPersona] : [];
    
    if (step === 0) {
      setSelectedPersona(option);
    } else if (step === personaQuestions.length + 1) {
        setOccupation(option);
    } else if (step === personaQuestions.length + 2) {
        setIncomeRange(option);
    }
  };

  const handleNext = () => {
     const personaQuestions = selectedPersona ? PERSONA_QUIZZES[selectedPersona] : [];
     const nextStep = step + 1;

     // Logic to skip income question if student/unemployed
     if (step === personaQuestions.length + 1) {
         if (occupation === 'University Student' || occupation === 'Unemployed / Looking') {
             // Finish here
             setShowSummary(true);
             return;
         }
     }

     if (step >= totalSteps - 1) { // 0-indexed adjustment
         setShowSummary(true);
     } else {
         setStep(nextStep);
     }
  };

  const handlePrevious = () => {
    if (showSummary) {
        setShowSummary(false);
        return;
    }
    if (step === 0) {
      navigate('/onboarding/intro');
    } else {
      setStep(step - 1);
    }
  };

  const handleFinish = () => {
    // Determine Recommended Plan
    let recommendedPlan = 'free'; // default
    if (occupation === 'University Student') {
        recommendedPlan = 'student';
    } else {
        if (incomeRange === 'Under ₦50,000') recommendedPlan = 'basic';
        else if (incomeRange === '₦50,000 - ₦150,000') recommendedPlan = 'pro';
        else if (incomeRange === '₦150,000 - ₦250,000' || incomeRange === 'Above ₦250,000') recommendedPlan = 'premium';
        else recommendedPlan = 'basic';
    }

    navigate('/recommended', { 
        state: { 
            persona: selectedPersona, 
            answers: answers,
            occupation,
            incomeRange,
            recommendedPlan
        } 
    });
  };

  if (showSummary && selectedPersona) {
    return (
      <div className="flex flex-col h-screen px-6 py-4 max-w-md mx-auto w-full font-sans text-white animate-fade-in relative overflow-hidden">
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fadeIn 0.5s ease-out forwards;
          }
        `}</style>
        
        <div className="pt-8 pb-4 text-center relative z-10">
          <h2 className="text-3xl font-bold mb-2">Your Profile</h2>
          <p className="opacity-80 text-lg">Here's your growth blueprint.</p>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-white/10 rounded-3xl p-6 mb-6 backdrop-blur-md border border-white/10 shadow-xl relative z-10">
          <div className="mb-6 border-b border-white/20 pb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Persona</p>
            <p className="text-2xl font-bold text-white tracking-wide">{selectedPersona}</p>
          </div>
          
           <div className="mb-6 border-b border-white/20 pb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Status</p>
            <p className="text-lg font-bold text-white tracking-wide">{occupation}</p>
            {incomeRange && <p className="text-sm text-white/80">{incomeRange}</p>}
          </div>

          <div className="space-y-6">
            <p className="text-sm font-bold uppercase tracking-widest text-white/60">Key Insights</p>
            {PERSONA_QUIZZES[selectedPersona].map((question, index) => (
              <div key={index}>
                <p 
                  className="text-xs text-white/80 mb-1 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: question.title }}
                />
                <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                    <p className="text-md font-medium text-white">
                    {answers[index + 1]}
                    </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 pb-6 relative z-10">
             <button
            onClick={handleFinish}
            className="w-full bg-white text-primary font-bold py-4 rounded-full shadow-[0_4px_14px_0_rgba(0,0,0,0.2)] active:scale-95 transition-all text-lg hover:bg-gray-50"
            >
            See My Plan & Sprints
            </button>
            <button
                onClick={() => setShowSummary(false)}
                className="w-full text-white/80 font-semibold py-3 text-sm hover:text-white transition-colors"
            >
                Edit Answers
            </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return <div>Loading...</div>;

  const currentSelection = answers[step] || null;

  const renderTitle = () => {
      return { __html: currentQuestion.title };
  };

  return (
    <div className="flex flex-col h-screen px-6 py-4 max-w-md mx-auto w-full font-sans">
      <div className="pt-8 pb-8 flex justify-center flex-shrink-0">
        <div className="w-full h-1.5 bg-white/20 rounded-full relative overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full bg-white rounded-full transition-all duration-500" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <h1 
        className="text-3xl font-bold text-white text-center mb-8 leading-tight flex-shrink-0"
        dangerouslySetInnerHTML={renderTitle()}
      />

      <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 mb-4 px-1">
        <div className="space-y-3 pb-4">
          {currentQuestion.options.map((option) => {
            const isSelected = currentSelection === option;
            return (
              <button
                key={option}
                onClick={() => handleOptionSelect(option)}
                className={`w-full py-4 px-6 rounded-full border-2 flex items-center justify-between transition-all duration-200 group text-left text-lg font-semibold ${
                  isSelected
                    ? 'bg-white border-white text-primary'
                    : 'bg-transparent border-white/40 text-white hover:bg-white/10'
                }`}
              >
                <span>{option}</span>
                <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  isSelected ? 'border-primary bg-primary' : 'border-white/60 group-hover:border-white'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-shrink-0 pt-2 pb-4">
        <div className="flex justify-between gap-4 mb-6">
          <button
            onClick={handlePrevious}
            className="flex-1 bg-white text-primary font-bold py-3.5 rounded-full shadow-lg active:scale-95 transition-transform text-lg"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={!currentSelection}
            className={`flex-1 font-bold py-3.5 rounded-full shadow-lg transition-all text-lg ${
              currentSelection
                ? 'bg-white text-primary active:scale-95'
                : 'bg-white/50 text-primary/50 cursor-not-allowed'
            }`}
          >
            Next
          </button>
        </div>
        
        <div className="flex justify-center">
            <div className="w-36 h-1.5 bg-white/30 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
