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
      <section className="px-4 sm:px-8 pt-16 pb-12 md:pt-32 md:pb-24 max-w-screen-xl mx-auto text-center animate-fade-in">
        <div className="inline-block px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-6">
            <p className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[0.2em]">Redefining Personal Evolution</p>
        </div>
        
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-gray-900 tracking-tighter leading-tight mb-6 max-w-5xl mx-auto">
          Grow into who you’re becoming.
        </h1>
        
        <div className="max-w-2xl mx-auto mb-10">
          <p className="text-base sm:text-lg md:text-xl text-gray-500 font-medium leading-relaxed">
            Vectorise is a sprint-based growth system designed to help you <span className="text-gray-900 font-bold">find clarity, take action,</span> and move forward without the weight of overwhelm.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/onboarding/welcome" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-8 py-4 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-full shadow-lg hover:bg-primary-hover hover:scale-[1.03] transition-all active:scale-95">
              Start your first sprint
            </button>
          </Link>
          <button 
            onClick={scrollToHowItWorks}
            className="group text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-all flex items-center gap-2 px-4 py-2 cursor-pointer"
          >
            See how it works
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
      </section>

      {/* 2. THE PROBLEM */}
      <section className="bg-gray-900 py-16 md:py-32 relative overflow-hidden">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-center lg:text-left">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
                    Information isn't the hurdle.<br/>
                    <span className="text-primary italic">Scattered effort is.</span>
                </h2>
                <div className="space-y-4">
                    <p className="text-base sm:text-lg text-gray-400 font-medium leading-relaxed">
                        Most people fail to grow because they attempt to improve everything at once. 
                        Career, skills, health, and mindset become a blur of "should-dos" with no clear momentum.
                    </p>
                </div>
            </div>
            
            <div className="relative mx-auto lg:mx-0 w-full max-w-sm lg:max-w-none">
                <div className="aspect-square bg-gradient-to-br from-primary/20 to-transparent rounded-[2rem] border border-white/5 p-6 flex flex-col justify-center gap-6 relative z-10">
                    <div className="space-y-1">
                        <p className="text-white text-2xl sm:text-3xl font-black italic opacity-20">Noise.</p>
                        <p className="text-white text-3xl sm:text-4xl font-black italic opacity-40">Distraction.</p>
                        <p className="text-white text-4xl sm:text-5xl font-black italic opacity-60">Overload.</p>
                        <div className="h-1 w-12 bg-primary rounded-full mt-6"></div>
                        <p className="text-white text-lg sm:text-xl font-black uppercase tracking-widest pt-4">Vectorise Focus</p>
                    </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/10 rounded-full blur-[80px] pointer-events-none"></div>
            </div>
        </div>
      </section>

      {/* 3. THE SOLUTION */}
      <section className="py-16 md:py-32 bg-white">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8">
            <div className="text-center mb-12 md:mb-20 max-w-3xl mx-auto">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-6">
                    Sprints bridge the gap between intent and reality.
                </h2>
                <p className="text-base sm:text-lg text-gray-500 font-medium leading-relaxed">
                    By distilling growth into short, high-impact cycles, we remove the friction of choice. 
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 md:mb-24">
                {[
                    { label: "Short", desc: "7 to 21 day cycles designed for high-retention.", icon: "⏱️" },
                    { label: "Intentional", desc: "Strategic moves toward a specific outcome.", icon: "🎯" },
                    { label: "Guided", desc: "Direct correspondence with experienced coaches.", icon: "💬" }
                ].map((item, i) => (
                    <div key={i} className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 hover:border-primary/20 transition-all hover:bg-white group">
                        <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{item.icon}</div>
                        <h4 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">{item.label}</h4>
                        <p className="text-sm text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>

            <div className="relative rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-xl group">
                <img 
                    src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?q=80&w=2044&auto=format&fit=crop" 
                    alt="Focused progress" 
                    className="w-full h-[250px] md:h-[400px] object-cover transition-all duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6 text-white pr-6">
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2 opacity-60">The Promise</p>
                    <h3 className="text-xl md:text-3xl font-black leading-tight tracking-tight italic">
                        Move forward without looking back.
                    </h3>
                </div>
            </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-4 sm:px-8 py-16 md:py-32 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight mb-6 leading-tight">
            Start your<br />first sprint.
          </h2>
          <p className="text-lg md:text-xl text-gray-400 font-medium mb-10 italic">It’s free to start.</p>
          <Link to="/onboarding/welcome" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-10 py-5 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-full shadow-lg transition-all hover:scale-[1.05] active:scale-95">
              Unlock my path
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-12 border-t border-gray-50 bg-white">
        <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 opacity-30">
            <LocalLogo type="green" className="h-6" />
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                Visible Progress System
            </p>
          </div>
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
            © {new Date().getFullYear()} Vectorise
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default HomePage;