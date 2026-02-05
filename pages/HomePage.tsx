import React from 'react';
import { Link } from 'react-router-dom';
import LocalLogo from '../components/LocalLogo';

const HomePage: React.FC = () => {
  return (
    <div className="bg-white min-h-screen font-sans selection:bg-primary/10 selection:text-primary overflow-x-hidden">
      
      {/* NAVIGATION OVERLAY */}
      <nav className="fixed top-0 left-0 w-full z-[100] px-6 py-6 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
          <LocalLogo type="green" className="h-6 w-auto" />
        </div>
        <div className="pointer-events-auto flex gap-3">
          <Link to="/login" className="px-6 py-2.5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-all">
            Login
          </Link>
          <Link to="/onboarding/welcome" className="px-6 py-2.5 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
            Start Sprint
          </Link>
        </div>
      </nav>

      {/* 1. HERO: THE CORE PROPOSITION */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 text-center animate-fade-in">
        <div className="max-w-6xl mx-auto">
          <div className="inline-block px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-10">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Visible Progress System 2.0</p>
          </div>
          
          <h1 className="text-6xl md:text-[120px] font-black text-gray-900 tracking-tighter leading-[0.8] mb-12 italic">
            Clarity <br className="hidden md:block" />
            <span className="text-primary">through</span> action.
          </h1>
          
          <p className="text-xl md:text-3xl text-gray-400 font-medium max-w-3xl mx-auto leading-tight italic mb-16">
            Ambition without structure is just noise. <br className="hidden md:block" />
            Vectorise turns your vision into a 7-day execution cycle.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link to="/onboarding/welcome">
              <button className="px-14 py-7 bg-primary text-white font-black uppercase tracking-[0.3em] text-xs rounded-full shadow-2xl shadow-primary/30 hover:scale-[1.03] transition-all active:scale-95">
                Start your first sprint
              </button>
            </Link>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Takes 2 minutes to set up</p>
          </div>
        </div>
        
        {/* Subtle Background Accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-primary/5 rounded-full blur-[160px] pointer-events-none -z-10"></div>
      </section>

      {/* 2. THE FRICTION: PROBLEM / SOLUTION GRID */}
      <section className="py-32 bg-gray-50 border-y border-gray-100 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div className="space-y-10">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
              The Hesitation <br className="hidden md:block" />
              <span className="text-primary italic">Gap.</span>
            </h2>
            <div className="space-y-8">
              {[
                { title: "The Overload", desc: "Too many directions feel equally important. So you stand still." },
                { title: "The Planning Trap", desc: "Thinking longer doesn't create proof. Only execution does." },
                { title: "The Silo", desc: "Growth is faster when you have a professional guide in your pocket." }
              ].map((item, i) => (
                <div key={i} className="flex gap-6 items-start group">
                  <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-primary font-black shadow-sm group-hover:bg-primary group-hover:text-white transition-all">0{i+1}</div>
                  <div>
                    <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">{item.title}</h4>
                    <p className="text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square bg-white rounded-[4rem] border border-gray-200 shadow-2xl p-4 rotate-2 relative z-10">
               <img 
                 src="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=2067&auto=format&fit=crop" 
                 className="w-full h-full object-cover rounded-[3rem] grayscale" 
                 alt="Focus" 
               />
            </div>
            <div className="absolute inset-0 bg-primary/10 rounded-[4rem] -rotate-3 scale-105 blur-2xl -z-10"></div>
          </div>
        </div>
      </section>

      {/* 3. THE PROTOCOL: 3 STEP EXECUTION */}
      <section className="py-40 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter mb-6 italic">The Protocol.</h2>
            <p className="text-gray-400 font-medium text-lg uppercase tracking-widest">Architected for daily completion</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { label: "01. Receive", title: "The Directive", desc: "A short, sharp lesson delivered by a professional coach every morning.", icon: "⚡" },
              { label: "02. Commit", title: "The Move", desc: "Carry out one specific task designed to generate evidence of growth.", icon: "🎯" },
              { label: "03. Cement", title: "The Reflection", desc: "Share your breakthrough to solidify the learning and earn rewards.", icon: "💎" }
            ].map((step, i) => (
              <div key={i} className="group relative">
                <div className="mb-8 p-10 bg-gray-50 rounded-[3rem] border border-gray-100 group-hover:bg-white group-hover:border-primary/20 group-hover:shadow-2xl transition-all duration-500 h-full flex flex-col">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-10">{step.label}</p>
                  <div className="text-4xl mb-6">{step.icon}</div>
                  <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">{step.title}</h3>
                  <p className="text-gray-500 font-medium leading-relaxed flex-grow">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. THE OUTCOME: PULL QUOTE */}
      <section className="py-40 bg-dark text-white text-center relative overflow-hidden px-6">
        <div className="max-w-4xl mx-auto relative z-10">
          <h3 className="text-3xl md:text-5xl font-black italic leading-[1.1] mb-10">
            "By the end of a sprint, you don't feel inspired. You feel <span className="text-primary">grounded</span>. Because you've created proof."
          </h3>
          <p className="text-xs font-black text-white/40 uppercase tracking-[0.4em]">Visible Progress System Manifesto</p>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary to-transparent"></div>
        </div>
      </section>

      {/* 5. TARGET: WHO IS THIS FOR (HORIZONTAL SCROLL STYLE ON DESKTOP) */}
      <section className="py-40 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-none italic">For the <br className="hidden md:block"/>Becoming.</h2>
            <p className="text-gray-400 font-bold text-lg leading-snug max-w-sm italic">
              Vectorise is for those who are finished with theory and ready for architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { role: "Students", tag: "Post-School Clarity", desc: "Building the real-world bridge between education and career impact." },
              { role: "Professionals", tag: "Career Leverage", desc: "Questioning direction and building visible authority in a new niche." },
              { role: "Founders", tag: "Execution Velocity", desc: "Refining the next move and stripping away the noise of scale." }
            ].map((card, i) => (
              <div key={i} className="p-12 border border-gray-100 rounded-[3rem] hover:border-primary/40 transition-all group hover:bg-gray-50">
                <h4 className="text-3xl font-black text-gray-900 mb-2 tracking-tighter italic">{card.role}</h4>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-10">{card.tag}</p>
                <p className="text-gray-500 font-medium leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION: THE FINAL RISE */}
      <section className="py-40 bg-gray-900 text-center px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-5xl md:text-8xl font-black text-white mb-10 tracking-tighter leading-[0.9] italic">One cycle <br/>changes everything.</h2>
          <p className="text-xl text-white/50 mb-20 font-medium max-w-xl mx-auto italic">
            Stop standing still. Join a sprint, complete the protocol, and build your growth registry.
          </p>
          
          <div className="bg-white rounded-[4rem] p-16 md:p-24 shadow-2xl relative group overflow-hidden">
             <div className="relative z-10">
                <h4 className="text-3xl font-black text-gray-900 mb-4">Launch your sprint</h4>
                <p className="text-gray-400 mb-14 font-medium italic">Ready to stop planning and start acting?</p>
                <Link to="/onboarding/welcome">
                  <button className="w-full py-8 bg-primary text-white font-black uppercase tracking-[0.4em] text-sm rounded-full shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all">
                    Initialize Registry &rarr;
                  </button>
                </Link>
             </div>
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-10 py-20 border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-6">
            <LocalLogo type="green" className="h-8 md:h-9" />
            <div className="w-px h-6 bg-gray-200"></div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.5em] leading-none pt-0.5">
              Architected for Evolution
            </p>
          </div>
          <div className="flex gap-10">
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">© 2026 Vectorise</p>
             <Link to="/login" className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] hover:text-primary transition-colors">Join Registry</Link>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default HomePage;