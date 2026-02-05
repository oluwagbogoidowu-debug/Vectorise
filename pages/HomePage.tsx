
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
      
      {/* 1. HERO SECTION - DRAMATIC ENTRY */}
      <section className="px-6 pt-32 pb-24 md:pt-48 md:pb-40 max-w-7xl mx-auto text-center animate-fade-in">
        <div className="inline-block px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-8">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Redefining Personal Evolution</p>
        </div>
        
        <h1 className="text-5xl md:text-8xl font-black text-gray-900 tracking-tighter leading-[0.95] mb-12 max-w-5xl mx-auto">
          Grow into who you’re becoming.
        </h1>
        
        <div className="max-w-3xl mx-auto space-y-12 mb-16">
          <p className="text-xl md:text-3xl text-gray-400 font-medium leading-relaxed tracking-tight">
            Vectorise is a sprint-based growth system designed to help you <span className="text-gray-900 font-bold">find clarity, take action,</span> and move forward without the weight of overwhelm.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="h-12 w-px bg-gray-100"></div>
            <div className="space-y-1 text-sm md:text-base text-gray-900 font-black uppercase tracking-[0.4em]">
                <p className="opacity-40">Start with one.</p>
                <p className="opacity-70">Finish it.</p>
                <p>Then Decide.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-10">
          <Link to="/onboarding/welcome">
            <button className="px-14 py-7 bg-primary text-white font-black uppercase tracking-[0.25em] text-xs rounded-full shadow-[0_25px_50px_-12px_rgba(14,120,80,0.4)] hover:bg-primary-hover hover:scale-[1.03] transition-all active:scale-95">
              Start your first sprint
            </button>
          </Link>
          <button 
            onClick={scrollToHowItWorks}
            className="group text-xs font-black uppercase tracking-[0.25em] text-gray-400 hover:text-primary transition-all flex items-center gap-3 cursor-pointer"
          >
            See how it works
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
      </section>

      {/* 2. THE PROBLEM - HIGH CONTRAST DARK MODE */}
      <section className="bg-gray-900 py-32 md:py-56 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10">
                <h2 className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tighter">
                    Information isn't the hurdle.<br/>
                    <span className="text-primary italic">Scattered effort is.</span>
                </h2>
                <div className="space-y-6">
                    <p className="text-xl text-gray-400 font-medium leading-relaxed">
                        Most people fail to grow because they attempt to improve everything at once. 
                        Career, skills, health, and mindset become a blur of "should-dos" with no clear momentum.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        {['Career', 'Identity', 'Focus', 'Impact', 'Habits'].map(tag => (
                            <span key={tag} className="px-4 py-2 rounded-full border border-white/10 text-white/30 text-[10px] font-black uppercase tracking-widest">{tag}</span>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="relative">
                <div className="aspect-square bg-gradient-to-br from-primary/20 to-transparent rounded-[3rem] border border-white/5 p-8 flex flex-col justify-center gap-8 relative z-10">
                    <div className="space-y-2">
                        <p className="text-white text-4xl font-black italic opacity-20">Noise.</p>
                        <p className="text-white text-5xl font-black italic opacity-40">Distraction.</p>
                        <p className="text-white text-6xl font-black italic opacity-60">Overload.</p>
                        <div className="h-1 w-24 bg-primary rounded-full mt-8"></div>
                        <p className="text-white text-2xl font-black uppercase tracking-[0.2em] pt-4">Vectorise Focus</p>
                    </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
            </div>
        </div>
      </section>

      {/* 3. THE SOLUTION - CLARITY & ANCHOR IMAGE */}
      <section className="py-32 md:py-56 bg-white">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-24 max-w-4xl mx-auto">
                <h2 className="text-4xl md:text-7xl font-black text-gray-900 tracking-tighter leading-tight mb-10">
                    Sprints create the bridge between intent and reality.
                </h2>
                <p className="text-xl text-gray-500 font-medium leading-relaxed">
                    By distilling growth into short, high-impact cycles, we remove the friction of choice. 
                    You don't just learn — you execute.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-32">
                {[
                    { label: "Short", desc: "7 to 21 day cycles designed for high-retention and immediate application.", icon: "⏱️" },
                    { label: "Intentional", desc: "Every task is a strategic move toward a specific, visible outcome.", icon: "🎯" },
                    { label: "Guided", desc: "Direct correspondence with coaches who have walked the path before you.", icon: "💬" }
                ].map((item, i) => (
                    <div key={i} className="p-10 bg-gray-50 rounded-[2.5rem] border border-gray-100 hover:border-primary/20 transition-all hover:bg-white hover:shadow-xl group">
                        <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">{item.icon}</div>
                        <h4 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tighter">{item.label}</h4>
                        <p className="text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>

            {/* VISUAL TRANSITION */}
            <div className="relative rounded-[4rem] overflow-hidden shadow-2xl border-8 border-white group">
                <img 
                    src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?q=80&w=2044&auto=format&fit=crop" 
                    alt="Focused progress" 
                    className="w-full h-[500px] object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-16 left-16 text-white max-w-xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-4">The Promise</p>
                    <h3 className="text-4xl md:text-5xl font-black leading-tight tracking-tighter italic">
                        Move forward without looking back.
                    </h3>
                </div>
            </div>
        </div>
      </section>

      {/* 4. THE COMPOUND BLOCK - MASSIVE IMPACT */}
      <section className="bg-white py-32 md:py-56 border-t border-gray-50">
        <div className="max-w-5xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-4 mb-12">
                <div className="h-px w-12 bg-primary/30"></div>
                <span className="text-[11px] font-black text-primary uppercase tracking-[0.5em]">The Philosophy</span>
                <div className="h-px w-12 bg-primary/30"></div>
            </div>
            
            <h2 className="text-6xl md:text-9xl font-black text-gray-900 tracking-tighter leading-[0.85] mb-12">
                This is how real <br/>
                <span className="text-primary italic">growth compounds.</span>
            </h2>
            
            <div className="max-w-2xl mx-auto">
                <p className="text-2xl text-gray-400 font-medium leading-relaxed italic">
                    One focused outcome stacked upon another, until your new reality is unrecognizable.
                </p>
            </div>
        </div>
      </section>

      {/* 5. AUDIENCE FIT - REDESIGNED TO CARDS */}
      <section className="px-6 py-32 md:py-56 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h3 className="text-xs font-black uppercase tracking-[0.5em] text-gray-400 mb-8">Audience Fit</h3>
            <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter">Who belongs here?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
                { 
                    title: "The Emergent", 
                    profile: "Students & Early Career", 
                    icon: "🎓", 
                    desc: "Those seeking to find their direction and build foundational habits before the world demands them." 
                },
                { 
                    title: "The Strategist", 
                    profile: "Corporate Professionals", 
                    icon: "💼", 
                    desc: "People seeking clarity in high-pressure roles, navigating transitions, or increasing their professional visibility." 
                },
                { 
                    title: "The Architect", 
                    profile: "Builders & Founders", 
                    icon: "🏗️", 
                    desc: "Entrepreneurs and creators preparing their next big move, requiring extreme focus and rapid execution." 
                }
            ].map((card, i) => (
                <div key={i} className="bg-white p-10 rounded-[3rem] border border-gray-100 hover:border-primary transition-all duration-500 hover:shadow-2xl group">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-4xl mb-8 group-hover:scale-110 transition-transform">
                        {card.icon}
                    </div>
                    <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-2">{card.title}</p>
                    <h4 className="text-2xl font-black text-gray-900 mb-6 leading-tight">{card.profile}</h4>
                    <p className="text-gray-500 font-medium leading-relaxed">{card.desc}</p>
                </div>
            ))}
          </div>
          
          <div className="text-center mt-20">
            <p className="text-xl md:text-2xl text-primary font-black italic">
                If you’re tired of scattered effort, you’re in the right place.
            </p>
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS - REDESIGNED TO PREMIUM CARDS */}
      <section id="how-it-works" className="px-6 py-32 md:py-56 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-32">
            <h2 className="text-4xl md:text-7xl font-black text-gray-900 tracking-tighter mb-8 leading-none">
              How it works
            </h2>
            <p className="text-xl text-gray-500 font-medium">Simple cycles. Compounding results.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
                { 
                    step: "01", 
                    title: "Initiate", 
                    action: "Start with a free sprint.", 
                    desc: "Test the system without commitment. Experience visible progress in days, not months." 
                },
                { 
                    step: "02", 
                    title: "Navigate", 
                    action: "Choose your next move.", 
                    desc: "Decide what specific growth you need when you're ready. Navigate your own path at your own pace." 
                },
                { 
                    step: "03", 
                    title: "Evolve", 
                    action: "Grow one step at a time.", 
                    desc: "Consistency over intensity. Every day is a brick in the wall of who you are becoming." 
                }
            ].map((card, i) => (
                <div key={i} className="relative p-12 bg-white rounded-[3rem] border border-gray-100 hover:border-primary/20 transition-all duration-500 hover:shadow-2xl group overflow-hidden">
                    <span className="absolute -top-4 -right-4 text-9xl font-black text-gray-50 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                        {card.step}
                    </span>
                    <div className="relative z-10">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mb-8 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                            Step {card.step} • {card.title}
                        </span>
                        <h4 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-tighter leading-tight">
                            {card.action}
                        </h4>
                        <p className="text-gray-500 text-lg font-medium leading-relaxed">
                            {card.desc}
                        </p>
                    </div>
                </div>
            ))}
          </div>

          <div className="mt-24 p-12 bg-gray-900 rounded-[3rem] text-center max-w-4xl mx-auto shadow-2xl relative overflow-hidden group">
            <p className="text-white text-lg md:text-xl font-medium leading-relaxed italic relative z-10">
                Some sprints are paid. Some are earned through the impact you create here. <br className="hidden sm:block" />
                <span className="text-primary font-black not-italic uppercase tracking-widest text-sm mt-4 block">Different paths. Same standard.</span>
            </p>
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-primary/20 transition-all duration-1000"></div>
          </div>
        </div>
      </section>

      {/* 7. OUTCOME / PROMISE */}
      <section className="px-6 py-40 md:py-64 bg-gray-900 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-tight mb-12">
            You leave Vectorise with clarity, momentum, and proof of progress.
          </h2>
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-px bg-primary"></div>
            <p className="text-xl md:text-2xl font-black uppercase tracking-[0.4em] text-primary">
                Not motivation. Direction.
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -ml-48 -mb-48"></div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="px-6 py-48 md:py-64 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-5xl md:text-8xl font-black text-gray-900 tracking-tighter mb-12 leading-[0.9]">
            Start your<br />first sprint.
          </h2>
          <p className="text-2xl text-gray-400 font-medium mb-16 italic tracking-wide">It’s free.</p>
          <Link to="/onboarding/welcome">
            <button className="px-20 py-8 bg-primary text-white font-black uppercase tracking-[0.3em] text-sm rounded-full shadow-[0_20px_50px_rgba(14,120,80,0.3)] transition-all hover:scale-[1.05] active:scale-95 hover:shadow-[0_25px_60px_rgba(14,120,80,0.4)]">
              Unlock my path
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-16 border-t border-gray-50 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-6 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
            <LocalLogo type="green" className="h-10" />
            <div className="w-px h-6 bg-gray-300"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Visible Progress System
            </p>
          </div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
            © {new Date().getFullYear()} Vectorise • Designed for Focus
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default HomePage;
