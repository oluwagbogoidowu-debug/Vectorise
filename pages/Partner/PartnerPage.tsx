import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LocalLogo from '../../components/LocalLogo';

const PartnerPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white min-h-screen font-sans text-dark overflow-x-hidden selection:bg-primary/10">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-[100] bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="hover:scale-105 transition-transform duration-500">
            <LocalLogo type="green" className="h-[2.125rem] w-auto" />
          </Link>
          <button 
            onClick={() => navigate('/partner/apply')}
            className="px-8 py-3.5 bg-primary text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all"
          >
            Apply to Partner
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-40 md:pt-56 pb-20 px-6 text-center animate-fade-in">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-6">Partnership Registry</p>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none mb-10 italic">
            Be a Partner.
          </h1>
          <div className="space-y-6 max-w-2xl mx-auto text-xl md:text-2xl text-gray-500 font-medium italic">
            <p>Vectorise partners don’t promote links.</p>
            <p className="text-gray-900 font-black not-italic underline decoration-primary/20 underline-offset-8">They move people forward.</p>
          </div>
          <p className="mt-12 text-lg text-gray-400 font-medium max-w-lg mx-auto leading-relaxed">
            If you believe growth should be structured, intentional, and earned, you’re in the right place.
          </p>
        </div>
      </header>

      {/* Meaning Section */}
      <section className="py-32 bg-gray-50 border-y border-gray-100 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black mb-16 tracking-tight leading-tight italic">
            What partnering with <br/> Vectorise means
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {[
              { t: "Direct Impact", d: "You introduce people to sprints that create real change." },
              { t: "Infrastructure", d: "We handle the structure, tracking, and progression." },
              { t: "Reward", d: "You get visibility, impact, and fair reward." }
            ].map((item, i) => (
              <div key={i} className="p-10 bg-white border border-gray-200 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group">
                <p className="text-primary font-black text-3xl mb-6 italic leading-none">0{i+1}</p>
                <h4 className="text-lg font-black text-gray-900 mb-2 uppercase tracking-tight">{item.t}</h4>
                <p className="text-sm text-gray-500 font-medium leading-relaxed italic">"{item.d}"</p>
              </div>
            ))}
          </div>
          <div className="text-center p-12 bg-white rounded-[3rem] border border-gray-100 shadow-inner">
             <p className="text-2xl font-black text-gray-900 italic mb-2">This isn’t affiliate marketing.</p>
             <p className="text-primary font-black uppercase text-[10px] tracking-[0.3em]">It’s contribution-based partnership.</p>
          </div>
        </div>
      </section>

      {/* Who this is for */}
      <section className="py-32 bg-white px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-24">
            <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-none italic">
                Who this <br/> is for
            </h2>
            <p className="text-gray-400 font-bold text-lg leading-snug max-w-xs italic pb-2">
                We're looking for quality over noise. We value depth over breadth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "Work with people who want clarity, growth, or direction",
              "Already guide, teach, coach, or influence others",
              "Care about outcomes more than clicks",
              "Want your impact to be visible and measurable"
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-6 p-8 border border-gray-50 bg-gray-50/30 rounded-3xl group hover:bg-white hover:border-primary/20 transition-all duration-500">
                <div className="w-1.5 h-1.5 bg-primary rounded-full group-hover:scale-150 transition-transform"></div>
                <p className="text-lg font-bold text-gray-700">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-lg text-gray-400 font-black italic">
                "If you’re only looking to drop links, this won’t fit."
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-32 bg-dark text-white px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-7xl font-black mb-20 italic tracking-tighter">How it works.</h2>
          
          <div className="space-y-4">
            {[
              { s: "Identification", t: "You get a unique partner link" },
              { s: "Attribution", t: "People who join through you are tagged to your impact" },
              { s: "Transparency", t: "You can see: How many people you’ve helped start, how far they progress, and what stages they reach" },
              { s: "Performance", t: "You earn rewards based on real participation, not noise" }
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-10 p-10 bg-white/5 border border-white/10 rounded-[2.5rem] group hover:bg-white/10 transition-all">
                <span className="text-4xl font-black text-white/10 group-hover:text-primary transition-colors italic">0{i+1}</span>
                <div>
                   <p className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mb-1">{step.s}</p>
                   <p className="text-xl font-bold leading-tight">{step.t}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[160px] pointer-events-none"></div>
      </section>

      {/* Rewards */}
      <section className="py-32 bg-white px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-20 italic tracking-tight">Your rewards</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
            {[
              { icon: "🔗", t: "Sprint Referrals" },
              { icon: "✅", t: "Completion Bonuses" },
              { icon: "🏆", t: "Impact Milestones" },
              { icon: "🪙", t: "Redeemable Coins" }
            ].map((r, i) => (
              <div key={i} className="p-8 bg-gray-50 border border-gray-100 rounded-3xl flex flex-col items-center justify-center group hover:border-primary transition-all">
                <span className="text-3xl mb-4 transition-transform group-hover:scale-125">{r.icon}</span>
                <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{r.t}</p>
              </div>
            ))}
          </div>
          
          <p className="text-2xl font-black text-primary italic underline underline-offset-8 decoration-primary/20">
            The more people move forward, the more you earn.
          </p>
        </div>
      </section>

      {/* Growth Path */}
      <section className="py-32 bg-gray-50 border-y border-gray-100 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black mb-16 tracking-tight italic">Growth path for partners</h2>
          <p className="text-xl text-gray-400 font-medium italic mb-12">Partnership is not a dead end.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { l: "Leverage", t: "Unlock higher revenue share" },
              { l: "Creation", t: "Co-create sprints" },
              { l: "Authority", t: "Transition into certified coaches" },
              { l: "Ownership", t: "Build their own track inside Vectorise" }
            ].map((path, i) => (
              <div key={i} className="p-10 bg-white border border-gray-100 rounded-[2.5rem] group hover:border-primary transition-all">
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-4">{path.l}</p>
                <h4 className="text-xl font-bold text-gray-900 leading-tight">{path.t}</h4>
              </div>
            ))}
          </div>

          <p className="mt-16 text-center text-3xl font-black text-gray-900 italic tracking-tighter">
            Influence can evolve into <span className="text-primary underline decoration-primary/20">ownership.</span>
          </p>
        </div>
      </section>

      {/* Expectations */}
      <section className="py-32 bg-white px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 mb-16 uppercase tracking-widest">Expectations</h2>
          <div className="space-y-8 text-xl text-gray-500 font-medium italic mb-20">
            <p>Share only sprints you understand</p>
            <p>Lead with experience, not promises</p>
            <p>Respect the structure of the platform</p>
            <p>Protect the quality of the ecosystem</p>
          </div>
          <div className="inline-block px-10 py-6 bg-dark rounded-[2.5rem] shadow-2xl">
             <p className="text-primary font-black uppercase text-[10px] tracking-[0.5em] mb-1">Currency of Choice</p>
             <p className="text-white text-3xl font-black italic tracking-tighter">Trust is the currency here.</p>
          </div>
        </div>
      </section>

      {/* Ready CTA */}
      <section className="py-40 bg-primary text-white text-center px-6">
        <div className="max-w-3xl mx-auto">
          <LocalLogo type="white" className="h-12 w-auto mx-auto mb-16 opacity-80" />
          <h2 className="text-5xl md:text-8xl font-black mb-12 tracking-tighter italic leading-none">
            Ready to <br/> partner?
          </h2>
          <p className="text-xl md:text-2xl text-white/60 font-medium mb-16 italic max-w-sm mx-auto">
            If you want your influence to mean something, start here.
          </p>
          
          <button 
            onClick={() => navigate('/partner/apply')}
            className="px-16 py-8 bg-white text-primary font-black uppercase tracking-[0.4em] text-sm rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all"
          >
            Become a Partner
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-10 py-20 border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-6">
            <LocalLogo type="green" className="h-[2.125rem] w-auto" />
            <div className="w-px h-6 bg-gray-200"></div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.5em] leading-none pt-0.5">
              Partnership Registry
            </p>
          </div>
          <div className="flex gap-10">
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">© 2026 Vectorise</p>
             <Link to="/" className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] hover:text-primary transition-colors">Growth System</Link>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.16s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default PartnerPage;