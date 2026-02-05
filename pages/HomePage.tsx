
import React from 'react';
import { Link } from 'react-router-dom';
import LocalLogo from '../components/LocalLogo';

const HomePage: React.FC = () => {
  const scrollToHowItWorks = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-white min-h-screen font-sans selection:bg-primary/10 selection:text-primary overflow-x-hidden">
      
      {/* 1. HERO SECTION - Ultra tight top padding */}
      <section className="px-6 pt-2 pb-6 md:pt-4 md:pb-12 max-w-screen-lg mx-auto text-center animate-fade-in">
        <div className="inline-block px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10 mb-3">
            <p className="text-[7px] sm:text-[9px] font-black text-primary uppercase tracking-widest">Redefining Personal Evolution</p>
        </div>
        
        <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tighter leading-tight mb-3 max-w-2xl mx-auto">
          Grow into who you’re becoming.
        </h1>
        
        <div className="max-w-md mx-auto mb-5">
          <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
            Vectorise is a sprint-based growth system designed to help you <span className="text-gray-900 font-bold">find clarity</span> and move forward without overwhelm.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <Link to="/onboarding/welcome" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-5 py-2.5 bg-primary text-white font-black uppercase tracking-widest text-[8px] rounded-full shadow-md hover:bg-primary-hover transition-all active:scale-95">
              Start your first sprint
            </button>
          </Link>
          <button 
            onClick={scrollToHowItWorks}
            className="group text-[8px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-all flex items-center gap-1 px-3 py-1.5 cursor-pointer"
          >
            How it works
            <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2 group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
      </section>

      {/* 2. THE PROBLEM - Scaled down */}
      <section className="bg-gray-900 py-8 md:py-12 relative overflow-hidden">
        <div className="max-w-screen-lg mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div className="space-y-2 text-center lg:text-left">
                <h2 className="text-xl md:text-2xl font-black text-white leading-tight tracking-tight">
                    Information isn't the hurdle.<br/>
                    <span className="text-primary italic">Scattered effort is.</span>
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-400 font-medium leading-relaxed max-w-xs mx-auto lg:mx-0">
                    Most people fail to grow because they attempt to improve everything at once. 
                    Growth becomes a blur with no clear momentum.
                </p>
            </div>
            
            <div className="relative mx-auto lg:mx-0 w-full max-w-[200px] lg:max-w-none">
                <div className="aspect-square bg-gradient-to-br from-primary/10 to-transparent rounded-lg border border-white/5 p-3 flex flex-col justify-center gap-2 relative z-10">
                    <div className="space-y-0">
                        <p className="text-white text-base sm:text-lg font-black italic opacity-20">Noise.</p>
                        <p className="text-white text-lg sm:text-xl font-black italic opacity-40">Distraction.</p>
                        <p className="text-white text-xl sm:text-2xl font-black italic opacity-60">Overload.</p>
                        <div className="h-0.5 w-6 bg-primary rounded-full mt-2"></div>
                        <p className="text-white text-[10px] font-black uppercase tracking-widest pt-1.5">Vectorise Focus</p>
                    </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/10 rounded-full blur-[50px] pointer-events-none"></div>
            </div>
        </div>
      </section>

      {/* 3. THE SOLUTION - Tight spacing */}
      <section id="how-it-works" className="py-8 md:py-12 bg-white">
        <div className="max-w-screen-lg mx-auto px-6">
            <div className="text-center mb-6 md:mb-10 max-w-lg mx-auto">
                <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight leading-tight mb-2">
                    Sprints bridge intent and reality.
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
                    By distilling growth into short cycles, we remove the friction of choice. 
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-8">
                {[
                    { label: "Short", desc: "7-21 day high retention cycles.", icon: "⏱️" },
                    { label: "Intentional", desc: "Every task is a strategic move.", icon: "🎯" },
                    { label: "Guided", desc: "Access to professional coaching.", icon: "💬" }
                ].map((item, i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-primary/20 transition-all hover:bg-white group">
                        <div className="text-lg mb-1.5 group-hover:scale-110 transition-transform">{item.icon}</div>
                        <h4 className="text-[13px] font-black text-gray-900 mb-0.5 uppercase tracking-tight">{item.label}</h4>
                        <p className="text-[10px] text-gray-500 font-medium leading-tight">{item.desc}</p>
                    </div>
                ))}
            </div>

            <div className="relative rounded-lg overflow-hidden shadow-sm group">
                <img 
                    src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?q=80&w=2044&auto=format&fit=crop" 
                    alt="Focused progress" 
                    className="w-full h-[140px] md:h-[240px] object-cover transition-all duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-3 left-3 text-white pr-3">
                    <p className="text-[5px] font-black uppercase tracking-widest mb-0.5 opacity-60">The Promise</p>
                    <h3 className="text-[13px] md:text-lg font-black leading-tight tracking-tight italic">
                        Move forward without looking back.
                    </h3>
                </div>
            </div>
        </div>
      </section>

      {/* FINAL CTA - Highly compact */}
      <section className="px-6 py-8 md:py-12 bg-white border-t border-gray-50">
        <div className="max-w-xs mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight mb-2 leading-tight">
            Start your<br />first sprint.
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-400 font-medium mb-5 italic">Free for new users.</p>
          <Link to="/onboarding/welcome" className="w-full">
            <button className="w-full px-5 py-3 bg-primary text-white font-black uppercase tracking-widest text-[8px] rounded-full shadow-md transition-all hover:scale-[1.03] active:scale-95">
              Unlock my path
            </button>
          </Link>
        </div>
      </section>

      {/* Footer - Compact */}
      <footer className="px-6 py-4 border-t border-gray-50 bg-white">
        <div className="max-w-screen-lg mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 opacity-30">
            <LocalLogo type="green" className="h-3.5" />
            <p className="text-[6px] font-black text-gray-400 uppercase tracking-widest">
                Visible Progress System
            </p>
          </div>
          <p className="text-[6px] font-black text-gray-300 uppercase tracking-widest">
            © {new Date().getFullYear()} Vectorise
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default HomePage;
