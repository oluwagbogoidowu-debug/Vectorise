
import React, { useState } from 'react';
import LocalLogo from './LocalLogo';
import Button from './Button';

interface GuideStep {
  title: string;
  description: string;
  icon: string;
  color: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    title: "Content + Action",
    description: "The core engine: Every day brings a short, high-impact lesson and a specific action. Carrying out the daily exercise is how you see visible progress.",
    icon: "⚡",
    color: "bg-orange-500"
  },
  {
    title: "The Rule of One",
    description: "Focus is your superpower. You can only run ONE sprint at a time. This ensures total commitment to the outcome. All other programs stay in your queue.",
    icon: "☝️",
    color: "bg-blue-500"
  },
  {
    title: "Direct Access",
    description: "Reach out to your coaches directly through private chat. Get the professional guidance you need when you're stuck or need a breakthrough.",
    icon: "💬",
    color: "bg-teal-500"
  },
  {
    title: "Reflect & Earn",
    description: "Reflection is where growth cements. Every shared insight earns you rewards and sharpens your self-awareness for the next sprint.",
    icon: "💎",
    color: "bg-purple-500"
  },
  {
    title: "Accumulate Wealth",
    description: "Earn coins through consistency. These credits are strictly used to unlock entry-level 'Basic' sprints, rewarding your dedication with foundational access.",
    icon: "💰",
    color: "bg-primary"
  },
  {
    title: "Premium Acceleration",
    description: "Accelerate your evolution with elite, premium-designed programs. Precision-engineered to deliver breakthroughs faster and smarter than foundational tracks.",
    icon: "🚀",
    color: "bg-blue-600"
  },
  {
    title: "Catalytic Influence",
    description: "Your growth shouldn't be solitary. By introducing others to the platform, you don't just expand your own impact—you elevate your entire circle.",
    icon: "📣",
    color: "bg-indigo-500"
  }
];

interface FirstTimeGuideProps {
  onClose: () => void;
}

const FirstTimeGuide: React.FC<FirstTimeGuideProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const step = GUIDE_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem('vectorise_guide_seen', 'true');
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('vectorise_guide_seen', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary text-white p-6 md:p-12 animate-fade-in overflow-hidden">
      {/* Cancel Button */}
      <button 
        onClick={handleDismiss}
        className="absolute top-8 right-8 z-[110] p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/10 group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="max-w-md w-full h-full flex flex-col justify-between relative z-10">
        <header className="flex flex-col items-center pt-8">
          <LocalLogo type="white" className="h-12 w-auto mb-6 opacity-80" />
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
              style={{ width: `${((currentStep + 1) / GUIDE_STEPS.length) * 100}%` }}
            ></div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-4 opacity-40">Step {currentStep + 1} of {GUIDE_STEPS.length}</p>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center text-center px-4 animate-slide-up" key={currentStep}>
          <div className={`w-28 h-28 ${step.color} rounded-[2.5rem] flex items-center justify-center text-5xl mb-8 shadow-2xl border-4 border-white/10`}>
            {step.icon}
          </div>
          <h2 className="text-4xl font-black mb-4 tracking-tight leading-tight">{step.title}</h2>
          <p className="text-lg text-white/70 font-medium leading-relaxed italic">"{step.description}"</p>
        </main>

        <footer className="pb-10">
          <div className="flex gap-4 mb-8">
            {currentStep > 0 ? (
              <button 
                onClick={handleBack}
                className="flex-1 py-5 bg-white/10 backdrop-blur-md text-white border border-white/10 font-black rounded-full text-sm uppercase tracking-widest active:scale-95 transition-all"
              >
                Back
              </button>
            ) : (
                <div className="flex-1"></div>
            )}
            <button 
              onClick={handleNext}
              className="flex-[2] py-5 bg-white text-primary font-black rounded-full text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all hover:bg-gray-50"
            >
              {currentStep === GUIDE_STEPS.length - 1 ? "Start My Rise" : "Next Step"}
            </button>
          </div>
          <div className="flex justify-center">
            <div className="w-32 h-1.5 bg-white/20 rounded-full"></div>
          </div>
        </footer>
      </div>

      {/* Decorative Blurs */}
      <div className={`absolute top-0 right-0 w-96 h-96 ${step.color} opacity-20 rounded-full blur-[120px] transition-colors duration-1000 -mr-48 -mt-48`}></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/10 rounded-full blur-[100px] -ml-40 -mb-40"></div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default FirstTimeGuide;
