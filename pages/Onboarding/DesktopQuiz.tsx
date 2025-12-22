
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DesktopOnboardingLayout from '../../components/DesktopOnboardingLayout';
import Button from '../../components/Button';

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

const OCCUPATION_QUESTION = {
  title: "What is your current employment status?",
  options: ["University Student", "Employed / Earning Salary", "Self-Employed / Business", "Unemployed / Looking"]
};

const INCOME_QUESTION = {
  title: "What is your estimated monthly income range?",
  options: ["Under ₦50,000", "₦50,000 - ₦150,000", "₦150,000 - ₦250,000", "Above ₦250,000"]
};

const DesktopQuiz: React.FC = () => {
  const navigate = useNavigate();
  
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<{[key: number]: string}>({});
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  
  const [occupation, setOccupation] = useState<string | null>(null);
  const [incomeRange, setIncomeRange] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const currentQuestion = useMemo(() => {
    if (step === 0) {
      return {
        title: "Which best describes you today?",
        options: INITIAL_OPTIONS
      };
    }
    
    const personaQuestions = selectedPersona ? PERSONA_QUIZZES[selectedPersona] : [];
    const personaQCount = personaQuestions.length;

    if (step > 0 && step <= personaQCount) {
      return personaQuestions[step - 1];
    }

    if (step === personaQCount + 1) {
      return OCCUPATION_QUESTION;
    }

    if (step === personaQCount + 2) {
       return INCOME_QUESTION;
    }

    return null;
  }, [step, selectedPersona]);

  const totalSteps = useMemo(() => {
     if (!selectedPersona) return 1;
     let count = 1 + PERSONA_QUIZZES[selectedPersona].length + 1; 
     if (occupation !== 'University Student' && occupation !== 'Unemployed / Looking') {
         count += 1;
     }
     return count;
  }, [selectedPersona, occupation]);

  const progressPercentage = useMemo(() => {
    if (step === 0) return 15; 
    return Math.min(100, Math.round(((step + 1) / totalSteps) * 100));
  }, [step, totalSteps]);

  const handleOptionSelect = (option: string) => {
    setAnswers(prev => ({ ...prev, [step]: option }));
    
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

     if (step === personaQuestions.length + 1) {
         if (occupation === 'University Student' || occupation === 'Unemployed / Looking') {
             setShowSummary(true);
             return;
         }
     }

     if (step >= totalSteps - 1) { 
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
      navigate('/onboarding/desktop-intro');
    } else {
      setStep(step - 1);
    }
  };

  const handleFinish = () => {
    let recommendedPlan = 'free';
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
        <DesktopOnboardingLayout>
            <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">Your Profile</h2>
                <p className="text-gray-600 text-lg">Here's your growth blueprint.</p>
            </div>

            <div className="my-6 bg-gray-100 rounded-lg p-4">
                <div className="mb-4 border-b pb-2">
                    <p className="text-xs font-bold uppercase text-gray-500">Persona</p>
                    <p className="text-xl font-bold">{selectedPersona}</p>
                </div>
                
                <div className="mb-4 border-b pb-2">
                    <p className="text-xs font-bold uppercase text-gray-500">Status</p>
                    <p className="text-lg font-bold">{occupation}</p>
                    {incomeRange && <p className="text-sm text-gray-600">{incomeRange}</p>}
                </div>

                <div className="space-y-4">
                    <p className="text-xs font-bold uppercase text-gray-500">Key Insights</p>
                    {PERSONA_QUIZZES[selectedPersona].map((question, index) => (
                    <div key={index}>
                        <p className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: question.title }} />
                        <p className="font-semibold text-dark">{answers[index + 1]}</p>
                    </div>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <Button onClick={handleFinish} variant="primary" size="lg" className="w-full">See My Plan & Sprints</Button>
                <Button onClick={() => setShowSummary(false)} variant="ghost" size="lg" className="w-full">Edit Answers</Button>
            </div>
      </DesktopOnboardingLayout>
    );
  }

  if (!currentQuestion) return <div>Loading...</div>;

  const currentSelection = answers[step] || null;

  return (
    <DesktopOnboardingLayout>
        <div className="w-full h-1.5 bg-gray-200 rounded-full relative mb-8">
          <div 
            className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-500" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        <h1 className="text-3xl font-bold text-dark text-center mb-8" dangerouslySetInnerHTML={{ __html: currentQuestion.title }}/>

        <div className="space-y-3">
          {currentQuestion.options.map((option) => {
            const isSelected = currentSelection === option;
            return (
              <button
                key={option}
                onClick={() => handleOptionSelect(option)}
                className={`w-full py-3 px-4 rounded-lg border-2 flex items-center justify-between transition-all duration-200 text-left text-lg font-semibold ${
                  isSelected
                    ? 'bg-primary border-primary text-white'
                    : 'bg-transparent border-gray-300 text-dark hover:bg-gray-100'
                }`}
              >
                <span>{option}</span>
                <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  isSelected ? 'border-white bg-white' : 'border-gray-400'
                }`}>
                  {isSelected && (
                     <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M12.736 4.264a.75.75 0 0 1 1.06 1.06L6.53 12.59a.75.75 0 0 1-1.06 0L2.206 9.327a.75.75 0 1 1 1.06-1.06L6 10.939l6.736-6.675Z"/>
                     </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between gap-4 mt-8">
          <Button onClick={handlePrevious} variant="secondary" size="lg" className="flex-1">Previous</Button>
          <Button onClick={handleNext} disabled={!currentSelection} variant="primary" size="lg" className="flex-1">Next</Button>
        </div>
    </DesktopOnboardingLayout>
  );
};

export default DesktopQuiz;
