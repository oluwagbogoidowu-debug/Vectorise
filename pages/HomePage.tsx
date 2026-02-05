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
      
      {/* 1. HERO SECTION */}
      <section className="px-6 pt-24 pb-16 md:pt-48 md:pb-40 max-w-screen-xl mx-auto text-center animate-fade-in">
        <div className="inline-block px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-6 md:mb-8">
            <p className="text-[10px] md:text-xs font-black text-primary uppercase tracking-[0.3em]">Redefining Personal Evolution</p>
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-gray-900 tracking-tighter leading-[1.0] mb-8 md:mb-12 max-w-5xl mx-auto">
          Grow into who you’re becoming.
        </h1>
        
        <div className="max-w-3xl mx-auto space-y-8 md:space-y-12 mb-12 md:mb-16">
          <p className="text-lg md:text-2xl lg:text-3xl text-gray-400 font-medium leading-relaxed tracking-tight">
            Vectorise is a sprint-based growth system designed to help you <span className="text-gray-900 font-bold">find clarity, take action,</span> and move forward without the weight of overwhelm.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="h-8 md:h-12 w-px bg-gray-100"></div>
            <div className="space-y-1 text-xs md:text-sm lg:text-base text-gray-900 font-black uppercase tracking-[0.4em]">
                <p className="opacity-40">Start with one.</p>
                <p className="opacity-70">Finish it.</p>
                <p>Then Decide.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-10">
          <Link to="/onboarding/welcome" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-10 md:px-14 py-5 md:py-7 bg-primary text-white font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-full shadow-2xl hover:bg-primary-hover hover:scale-[1.03] transition-all active:scale-95">
              Start your first sprint
            </button>
          </Link>
          <button 
            onClick={scrollToHowItWorks}
            className="group text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-primary transition-all flex items-center gap-3 cursor-pointer"
          >
            See how it works
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
      </section>

      {/* 2. THE PROBLEM */}
      <section className="bg-gray-900 py-24 md:py-48 lg:py-56 relative overflow-hidden">
        <div className="max-w-screen-xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-20 items-center">
            <div className="space-y-8 md:space-y-10 text-center lg:text-left">
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tighter">
                    Information isn't the hurdle.<br/>
                    <span className="text-primary italic">Scattered effort is.</span>
                </h2>
                <div className="space-y-6">
                    <p className="text-lg md:text-xl text-gray-400 font-medium leading-relaxed">
                        Most people fail to grow because they attempt to improve everything at once. 
                        Career, skills, health, and mindset become a blur of "should-dos" with no clear momentum.
                    </p>
                    <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                        {['Career', 'Identity', 'Focus', 'Impact', 'Habits'].map(tag => (
                            <span key={tag} className="px-4 py-2 rounded-full border border-white/10 text-white/30 text-[10px] font-black uppercase tracking-widest">{tag}</span>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="relative mx-auto lg:mx-0 w-full max-w-md lg:max-w-none">
                <div className="aspect-square bg-gradient-to-br from-primary/20 to-transparent rounded-[2.5rem] md:rounded-[3rem] border border-white/5 p-8 flex flex-col justify-center gap-8 relative z-10">
                    <div className="space-y-2">
                        <p className="text-white text-3xl md:text-4xl font-black italic opacity-20">Noise.</p>
                        <p className="text-white text-4xl md:text-5xl font-black italic opacity-40">Distraction.</p>
                        <p className="text-white text-5xl md:text-6xl font-black italic opacity-60">Overload.</p>
                        <div className="h-1 w-16 md:w-24 bg-primary rounded-full mt-8"></div>
                        <p className="text-white text-lg md:text-2xl font-black uppercase tracking-[0.2em] pt-4">Vectorise Focus</p>
                    </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/5 rounded-full blur-[80px] md:blur-[120px] pointer-events-none"></div>
            </div>
        </div>
      </section>

      {/* 3. THE SOLUTION */}
      <section className="py-24 md:py-48 lg:py-56 bg-white">
        <div className="max-w-screen-xl mx-auto px-6">
            <div className="text-center mb-16 md:mb-24 max-w-4xl mx-auto">
                <h2 className="text-3xl md:text-6xl lg:text-7xl font-black text-gray-900 tracking-tighter leading-tight mb-6 md:mb-10">
                    Sprints bridge the gap between intent and reality.
                </h2>
                <p className="text-lg md:text-xl text-gray-500 font-medium leading-relaxed">
                    By distilling growth into short, high-impact cycles, we remove the friction of choice. 
                    You don't just learn — you execute.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 mb-20 md:mb-32">
                {[
                    { label: "Short", desc: "7 to 21 day cycles designed for high-retention and immediate application.", icon: "⏱️" },
                    { label: "Intentional", desc: "Every task is a strategic move toward a specific, visible outcome.", icon: "🎯" },
                    { label: "Guided", desc: "Direct correspondence with coaches who have walked the path before you.", icon: "💬" }
                ].map((item, i) => (
                    <div key={i} className="p-8 md:p-10 bg-gray-50 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 hover:border-primary/20 transition-all hover:bg-white hover:shadow-xl group">
                        <div className="text-3xl md:text-4xl mb-6 group-hover:scale-110 transition-transform">{item.icon}</div>
                        <h4 className="text-xl md:text-2xl font-black text-gray-900 mb-4 uppercase tracking-tighter">{item.label}</h4>
                        <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>

            <div className="relative rounded-[2.5rem] md:rounded-[4rem] overflow-hidden shadow-2xl border-4 md:border-8 border-white group">
                <img 
                    src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?q=80&w=2044&auto=format&fit=crop" 
                    alt="Focused progress" 
                    className="w-full h-[300px] md:h-[500px] object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-8 left-8 md:bottom-16 md:left-16 text-white max-w-xl pr-8">
                    <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] mb-2 md:mb-4">The Promise</p>
                    <h3 className="text-2xl md:text-4xl lg:text-5xl font-black leading-tight tracking-tighter italic">
                        Move forward without looking back.
                    </h3>
                </div>
            </div>
        </div>
      </section>

      {/* 4. COMPOUND BLOCK */}
      <section className="bg-white py-24 md:py-48 lg:py-56 border-t border-gray-50">
        <div className="max-w-5xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-4 mb-8 md:mb-12">
                <div className="h-px w-8 md:w-12 bg-primary/30"></div>
                <span className="text-[9px] md:text-[11px] font-black text-primary uppercase tracking-[0.5em]">The Philosophy</span>
                <div className="h-px w-8 md:w-12 bg-primary/30"></div>
            </div>
            
            <h2 className="text-4xl md:text-7xl lg:text-9xl font-black text-gray-900 tracking-tighter leading-[0.9] mb-8 md:mb-12">
                This is how real <br className="hidden md:block" />
                <span className="text-primary italic">growth compounds.</span>
            </h2>
            
            <div className="max-w-2xl mx-auto">
                <p className="text-lg md:text-2xl text-gray-400 font-medium leading-relaxed italic">
                    One focused outcome stacked upon another, until your new reality is unrecognizable.
                </p>
            </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-24 md:py-48 lg:py-64 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl md:text-7xl lg:text-8xl font-black text-gray-900 tracking-tighter mb-8 md:mb-12 leading-[0.95]">
            Start your<br />first sprint.
          </h2>
          <p className="text-xl md:text-2xl text-gray-400 font-medium mb-12 md:mb-16 italic tracking-wide">It’s free.</p>
          <Link to="/onboarding/welcome" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-12 md:px-20 py-6 md:py-8 bg-primary text-white font-black uppercase tracking-[0.3em] text-[10px] md:text-sm rounded-full shadow-2xl transition-all hover:scale-[1.05] active:scale-95">
              Unlock my path
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 md:py-16 border-t border-gray-50 bg-white">
        <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 md:gap-10">
          <div className="flex items-center gap-6 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
            <LocalLogo type="green" className="h-8 md:h-10" />
            <div className="w-px h-6 bg-gray-300"></div>
            <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Visible Progress System
            </p>
          </div>
          <p className="text-[9px] md:text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] text-center">
            © {new Date().getFullYear()} Vectorise • Designed for Focus
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default HomePage;