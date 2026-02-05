
import React from 'react';
import { Link } from 'react-router-dom';
import LocalLogo from '../components/LocalLogo';

const HomePage: React.FC = () => {
  return (
    <div className="bg-white min-h-screen font-sans selection:bg-primary/10 selection:text-primary overflow-x-hidden pb-20">
      
      {/* 1. HERO SECTION */}
      <section className="px-6 pt-12 pb-16 md:pt-20 md:pb-24 max-w-screen-lg mx-auto text-center animate-fade-in">
        <div className="inline-block px-3 py-1 rounded-full bg-primary/5 border border-primary/10 mb-6">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Vectorise Visible Progress System</p>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter leading-[0.95] mb-8 max-w-3xl mx-auto italic">
          Grow into who you’re becoming.
        </h1>
        
        <div className="max-w-2xl mx-auto text-left space-y-6">
          <p className="text-lg md:text-xl text-gray-900 font-bold leading-tight italic opacity-90">
            I’ve struggled with this before.
          </p>
          <p className="text-base text-gray-500 font-medium leading-relaxed">
            Having big visions. Clear dreams. Strong ambition. And still feeling stuck. 
            Not because I lacked ideas. But because I didn’t know which move actually mattered.
          </p>
          <p className="text-base text-gray-500 font-medium leading-relaxed">
            After school, I thought clarity would come automatically. It didn’t. What showed up instead was pressure. Noise. Too many options.
          </p>
          <p className="text-base text-gray-500 font-medium leading-relaxed">
            I wanted to act. But every direction felt equally important. So I hesitated. And hesitation quietly stole time.
          </p>
          <p className="text-base text-gray-900 font-bold leading-relaxed border-l-4 border-primary pl-6 py-2">
            That’s the problem Vectorise exists to solve. Not motivation. Not more information. But clarity that turns intention into action.
          </p>
        </div>

        <div className="mt-12">
          <Link to="/onboarding/welcome">
            <button className="px-10 py-5 bg-primary text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-full shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95">
              Start your clarity sprint
            </button>
          </Link>
        </div>
      </section>

      {/* 2. THE PHILOSOPHY */}
      <section className="bg-gray-900 py-20 relative overflow-hidden">
        <div className="max-w-screen-lg mx-auto px-6">
            <div className="max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight mb-8">
                    Clarity is not a feeling. <br/>
                    <span className="text-primary italic">It’s a structure.</span>
                </h2>
                <div className="space-y-6 text-gray-400 text-lg font-medium leading-relaxed">
                    <p>
                        Most people don’t fail because they’re lazy or incapable. They fail because they’re trying to improve everything at once.
                    </p>
                    <p>
                        Career. Skills. Identity. Confidence. Direction. All pulling at the same time.
                    </p>
                    <p className="text-white font-black">
                        Vectorise removes that tension by forcing focus. One outcome. One sprint. One meaningful move at a time.
                    </p>
                    <p className="italic">
                        You don’t collect ideas here. You finish what you start.
                    </p>
                </div>
            </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      </section>

      {/* 3. THE PROCESS */}
      <section className="py-20 bg-white">
        <div className="max-w-screen-lg mx-auto px-6">
            <div className="mb-16">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight mb-4">
                    What actually happens when you start
                </h2>
                <p className="text-lg text-gray-500 font-medium max-w-xl">
                    You don’t arrive to explore. You arrive to decide. From day one, you’re anchored to a single question: What matters most right now?
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { label: "One clear task", desc: "No endless dashboards. Just the next move.", icon: "🎯" },
                    { label: "One reflection", desc: "Sharpen your judgment daily.", icon: "🧠" },
                    { label: "One action", desc: "Tied to a visible, tangible outcome.", icon: "⚡" }
                ].map((item, i) => (
                    <div key={i} className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 group hover:border-primary/20 transition-all">
                        <div className="text-3xl mb-6">{item.icon}</div>
                        <h4 className="text-base font-black text-gray-900 mb-2 uppercase tracking-tight">{item.label}</h4>
                        <p className="text-sm text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>

            <div className="mt-16 p-10 bg-primary/5 rounded-[2.5rem] border border-primary/10 text-center">
                <p className="text-xl font-black text-gray-900 italic leading-relaxed max-w-2xl mx-auto">
                    By the end of a sprint, you don’t feel inspired. You feel grounded. Because you’ve created proof.
                </p>
            </div>
        </div>
      </section>

      {/* 4. WHY SPRINTS */}
      <section className="py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-screen-lg mx-auto px-6 text-center lg:text-left grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight mb-6">
                    Why sprints work when planning doesn’t
                </h2>
                <div className="space-y-6 text-base text-gray-600 font-medium leading-relaxed">
                    <p>Planning feels safe. Sprints create evidence.</p>
                    <p>Short cycles force honesty. They expose what fits. And what doesn’t.</p>
                    <p className="text-gray-900 font-bold italic">Clarity doesn’t come from thinking longer. It comes from acting within constraints. That’s how real progress compounds.</p>
                </div>
            </div>
            <div className="relative">
                <img 
                    src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop" 
                    alt="Strategic focus" 
                    className="rounded-[2.5rem] shadow-2xl grayscale hover:grayscale-0 transition-all duration-700"
                />
            </div>
        </div>
      </section>

      {/* 5. WHO IS THIS FOR */}
      <section className="py-20 bg-white">
        <div className="max-w-screen-lg mx-auto px-6">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-12 text-center">Who this is for</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { title: "Students", desc: "Preparing for life after school." },
                    { title: "Early Professionals", desc: "Questioning their direction." },
                    { title: "Builders & Founders", desc: "Refining their next move." }
                ].map((card, i) => (
                    <div key={i} className="p-8 border border-gray-100 rounded-3xl hover:bg-white hover:shadow-xl transition-all">
                        <h4 className="text-lg font-black text-gray-900 mb-3">{card.title}</h4>
                        <p className="text-gray-500 font-medium">{card.desc}</p>
                    </div>
                ))}
            </div>
            <div className="mt-12 text-center">
                <p className="text-lg font-black text-primary italic">If scattered effort has slowed you down, you belong here.</p>
            </div>
        </div>
      </section>

      {/* 6. ORIGIN */}
      <section className="py-20 bg-dark text-white relative overflow-hidden">
        <div className="max-w-screen-lg mx-auto px-6 relative z-10">
            <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-3xl font-black mb-8 italic">Built by lived experience</h2>
                <div className="space-y-6 text-gray-400 text-base leading-relaxed font-medium">
                    <p>
                        Vectorise wasn’t designed from theory. It came from years of trial, error, and course correction.
                    </p>
                    <p>
                        I learned the hard way that ambition without clarity creates delay. Structure changed everything.
                    </p>
                    <p className="text-white font-black italic">
                        This system is the version I wish I had earlier.
                    </p>
                </div>
            </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-primary/5 to-transparent"></div>
      </section>

      {/* 7. MOMENTUM & FINAL CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-screen-lg mx-auto px-6 text-center">
            <h2 className="text-4xl font-black text-gray-900 mb-6 tracking-tight">One sprint changes how you decide</h2>
            <p className="text-lg text-gray-500 font-medium max-w-xl mx-auto mb-12">
                You don’t need to map your entire future. You need one clear step. Completed. That single win sharpens judgment. Momentum forms.
            </p>
            
            <div className="bg-gray-50 p-12 rounded-[3rem] border border-gray-100 max-w-xl mx-auto">
                <h3 className="text-2xl font-black text-gray-900 mb-2">Start with one sprint</h3>
                <p className="text-gray-400 font-medium mb-10 italic">Not to figure out everything. But to stop standing still.</p>
                
                <Link to="/onboarding/welcome">
                    <button className="w-full py-6 bg-primary text-white font-black uppercase tracking-[0.2em] text-xs rounded-full shadow-2xl shadow-primary/20 hover:scale-[1.03] transition-all active:scale-95">
                        Start your clarity sprint
                    </button>
                </Link>
                <p className="mt-6 text-[10px] font-black text-gray-300 uppercase tracking-widest">Finish one. Then decide what comes next.</p>
            </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-10 border-t border-gray-100 bg-white">
        <div className="max-w-screen-lg mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <LocalLogo type="green" className="h-6" />
            <div className="w-px h-4 bg-gray-200"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none pt-0.5">
                Visible Progress System
            </p>
          </div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
            © 2026 Vectorise
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default HomePage;
