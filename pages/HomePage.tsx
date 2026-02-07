import React from 'react';
import { Link } from 'react-router-dom';
import LocalLogo from '../components/LocalLogo';

const HomePage: React.FC = () => {
  return (
    <div className="bg-white min-h-screen font-sans selection:bg-primary/10 selection:text-primary overflow-x-hidden">
      
      {/* NAVIGATION */}
      <nav className="fixed top-0 left-0 w-full z-[100] bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="hover:scale-105 transition-transform duration-500">
            <LocalLogo type="green" className="h-[2.125rem] w-auto" />
          </Link>
          <div className="flex gap-3">
            <Link to="/onboarding/focus-selector" className="px-8 py-3.5 bg-primary text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95">
              Start Sprint
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO: GROW INTO WHO YOU'RE BECOMING */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-40 md:pt-48 text-center animate-fade-in">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-6xl md:text-[110px] font-black text-gray-900 tracking-tighter leading-[0.85] mb-12 italic">
            Grow into who <br className="hidden md:block" />
            you’re <span className="text-primary">becoming.</span>
          </h1>
          
          <div className="max-w-2xl mx-auto space-y-6 mb-16">
            <p className="text-xl md:text-3xl text-gray-900 font-bold leading-tight tracking-tight">
              You don’t lack ambition. <br/>
              <span className="text-gray-400 font-medium italic">You lack clarity on what move actually matters now.</span>
            </p>
            <p className="text-lg md:text-xl text-gray-500 font-medium leading-relaxed">
              Vectorise helps you gain clarity at critical transition points and turn it into focused action through short, guided sprints.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link to="/onboarding/focus-selector">
              <button className="px-14 py-7 bg-primary text-white font-black uppercase tracking-[0.3em] text-xs rounded-full shadow-2xl shadow-primary/30 hover:scale-[1.03] transition-all active:scale-95">
                Start your clarity sprint
              </button>
            </Link>
            <button 
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3 text-[10px] font-black text-gray-400 hover:text-primary uppercase tracking-widest transition-all"
            >
              See how it works &darr;
            </button>
          </div>

          <p className="mt-8 text-[10px] font-black text-gray-300 uppercase tracking-widest">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Continue your rise</Link>
          </p>
        </div>
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-primary/5 rounded-full blur-[160px] pointer-events-none -z-10"></div>
      </section>

      {/* SCROLL 1: THE REAL PROBLEM */}
      <section className="py-32 md:py-48 bg-gray-50 border-y border-gray-100 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-none mb-16">
            The <span className="text-primary italic">Real</span> Problem.
          </h2>
          <div className="space-y-12">
            <div className="space-y-8 text-xl text-gray-600 font-medium leading-relaxed">
              <p>Most people don’t fail because they’re lazy. They fail because effort is scattered.</p>
              <div className="flex flex-wrap justify-center gap-3 pt-4">
                {[
                  { text: "Big goals.", color: "bg-emerald-50 text-emerald-800 border-emerald-100" },
                  { text: "Too many options.", color: "bg-indigo-50 text-indigo-800 border-indigo-100" },
                  { text: "Endless content.", color: "bg-amber-50 text-amber-800 border-amber-100" },
                  { text: "No real traction.", color: "bg-rose-50 text-rose-800 border-rose-100" }
                ].map((item, i) => (
                  <div key={i} className={`${item.color} px-6 py-4 rounded-[2rem] border font-black italic text-base md:text-lg shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300`}>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-center max-w-2xl mx-auto">
              <p className="text-2xl md:text-3xl text-gray-900 font-bold italic leading-snug">
                "You want to move forward, but you’re unsure which direction is worth committing to. <br className="hidden md:block"/>
                <span className="text-primary not-italic font-black">That uncertainty quietly wastes years."</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SCROLL 2: THE INSIGHT */}
      <section className="py-32 md:py-48 bg-white px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-20 text-center md:text-left">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">The Insight</p>
            <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-none">
                Clarity doesn’t come from <br className="hidden md:block"/> more planning.
            </h2>
            <p className="text-3xl md:text-5xl font-black text-gray-400 italic tracking-tighter mt-4">
                It comes from intentional action.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start mb-20">
            <div className="md:col-span-7 space-y-10 text-lg md:text-xl text-gray-500 font-medium leading-relaxed">
              <p>I learned this the hard way.</p>
              <p>I had vision. I had ambition. But no clear starting point. I kept moving, yet nothing compounded.</p>
              <p className="text-gray-900 font-bold">
                Once clarity entered the picture, everything changed. My actions became intentional. My progress stopped being random.
              </p>
            </div>
            <div className="md:col-span-5 relative group">
                <div className="aspect-[3/4] bg-gray-100 rounded-[3rem] overflow-hidden rotate-2 shadow-2xl relative z-10">
                    <img 
                      src="https://lh3.googleusercontent.com/d/1adBe3Z_E3_9mAPPG86f67dYENzT1jR7O" 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000" 
                      alt="Personal Growth Insight" 
                    />
                </div>
                <p className="mt-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] text-center rotate-2 opacity-60 group-hover:opacity-100 transition-opacity duration-500 px-4 leading-relaxed">
                  Built by someone who’s walked the path from confusion to clarity.
                </p>
                <div className="absolute inset-0 bg-primary/10 rounded-[3rem] -rotate-3 scale-105 blur-2xl -z-10"></div>
            </div>
          </div>

          {/* CENTERED INSIGHT CALLOUT */}
          <div className="bg-gray-50 p-10 md:p-16 rounded-[3rem] text-center border border-gray-100 shadow-sm relative overflow-hidden animate-fade-in group">
             <p className="text-2xl md:text-3xl font-black text-gray-900 italic relative z-10 leading-tight">
                "Vectorise exists so others don’t have to <br className="hidden md:block"/> <span className="text-primary underline decoration-primary/20 underline-offset-8">learn this late.</span>"
             </p>
             <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-1000"></div>
          </div>
        </div>
      </section>

      {/* SCROLL 3: THE SYSTEM */}
      <section id="how-it-works" className="py-32 md:py-48 bg-dark text-white relative overflow-hidden px-6">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-32">
            <h2 className="text-4xl md:text-7xl font-black mb-8 italic tracking-tighter">The System.</h2>
            <p className="text-xl text-white/50 max-w-2xl mx-auto font-medium leading-relaxed">
                Vectorise is not a marketplace of programs. <br className="hidden md:block"/>It’s a guided growth system designed to force focus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "Sprints", label: "Protocol", desc: "Short, outcome-driven growth cycles." },
              { title: "One Focus", label: "Strategy", desc: "Every sprint solves one clear problem." },
              { title: "Daily Action", label: "Execution", desc: "You act, not just consume content." },
              { title: "Coach Guidance", label: "Support", desc: "Access when friction shows up." }
            ].map((item, i) => (
              <div key={i} className="p-10 bg-white/5 border border-white/10 rounded-[3rem] group hover:bg-white/10 hover:border-primary/40 transition-all duration-500">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-10">{item.label}</p>
                <h4 className="text-2xl font-black mb-4 tracking-tight">{item.title}</h4>
                <p className="text-sm text-white/40 font-medium leading-relaxed group-hover:text-white/60 transition-colors">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-32 text-center">
            <p className="text-2xl md:text-3xl font-black italic max-w-2xl mx-auto leading-tight">
                "Finish one sprint. Then decide your next move. That’s how real growth compounds."
            </p>
          </div>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-primary/10 to-transparent"></div>
      </section>

      {/* SCROLL 4: WHAT HAPPENS WHEN YOU CLICK START */}
      <section className="py-32 md:py-48 bg-white px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-24">
            <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-[0.9]">
                When you click <br/>
                <span className="text-primary italic">Start.</span>
            </h2>
            <p className="text-gray-400 font-bold text-lg leading-snug max-w-xs italic pb-2">
                No theory overload. No pressure to have life figured out. Just clarity you can build on.
            </p>
          </div>

          <div className="space-y-6">
            {[
              "You enter a structured 5-day experience",
              "Each day gives you one prompt and one action",
              "You learn by doing, not overthinking",
              "You reflect on real signals, not guesses",
              "You leave with direction and momentum"
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-8 p-8 border border-gray-50 bg-gray-50/30 rounded-[2.5rem] group hover:bg-white hover:border-primary/20 hover:shadow-xl hover:scale-[1.01] transition-all duration-500">
                <span className="text-4xl font-black text-gray-200 group-hover:text-primary transition-colors italic leading-none">0{i+1}</span>
                <p className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCROLL 5: WHO THIS IS FOR */}
      <section className="py-32 md:py-48 bg-gray-50 border-y border-gray-100 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight mb-6">Who this is for</h2>
            <p className="text-xl text-gray-500 font-medium italic">Vectorise is for people at a transition point.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Students", tag: "Final Year", desc: "Unsure of what comes next after graduation." },
              { title: "Professionals", tag: "Early Career", desc: "Questioning direction and seeking alignment." },
              { title: "Creators", tag: "Builders", desc: "Recalibrating focus to scale what actually works." }
            ].map((card, i) => (
              <div key={i} className="p-12 bg-white border border-gray-200 rounded-[3rem] hover:shadow-2xl hover:border-primary/30 transition-all group">
                <h4 className="text-3xl font-black text-gray-900 mb-2 tracking-tighter italic">{card.title}</h4>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-10">{card.tag}</p>
                <p className="text-gray-500 font-medium leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-20 text-center">
            <p className="text-2xl font-black text-gray-900 italic">
                "If you’re tired of moving without certainty, <span className="text-primary underline decoration-primary/30 underline-offset-8">you belong here.</span>"
            </p>
          </div>
        </div>
      </section>

      {/* SCROLL 6: THE PROMISE */}
      <section className="py-32 md:py-48 bg-white px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-7xl font-black text-gray-900 tracking-tighter mb-16 italic">The Promise.</h2>
          <p className="text-2xl text-gray-400 font-medium mb-20 max-w-xl mx-auto italic leading-tight">
            You don’t leave Vectorise with motivation. <br className="hidden md:block"/>
            <span className="text-gray-900 font-black not-italic">You leave with:</span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-32">
            {[
              { label: "Clarity", desc: "On what matters now" },
              { label: "Momentum", desc: "From real action" },
              { label: "Proof", desc: "You can build on" }
            ].map((p, i) => (
              <div key={i} className="space-y-4">
                <h3 className="text-4xl font-black text-primary italic leading-none">{p.label}</h3>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-40 md:py-56 bg-primary text-white text-center px-6 relative overflow-hidden">
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-5xl md:text-8xl font-black mb-12 tracking-tighter leading-[0.85] italic">
            Clarity on your <br className="hidden md:block"/> next move.
          </h2>
          <p className="text-xl md:text-2xl text-white/60 font-medium max-w-xl mx-auto mb-20 italic">
            You don’t need to figure out your whole future. <br className="hidden md:block"/>
            You just need to act today.
          </p>
          
          <Link to="/onboarding/focus-selector">
            <button className="px-16 py-8 bg-white text-primary font-black uppercase tracking-[0.4em] text-sm rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all">
                Start your clarity sprint
            </button>
          </Link>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] border-[1px] border-white rounded-full animate-ping-slow"></div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-10 py-20 border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-6">
            <LocalLogo type="green" className="h-[2.125rem] w-auto" />
            <div className="w-px h-6 bg-gray-200"></div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.5em] leading-none pt-0.5">
              Visible Progress System
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
        
        @keyframes pingSlow {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          50% { opacity: 0.5; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        .animate-ping-slow { animation: pingSlow 8s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}</style>
    </div>
  );
};

export default HomePage;