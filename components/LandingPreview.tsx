import React from 'react';
import { Sprint, Coach } from '../types';
import FormattedText from './FormattedText';

interface LandingPreviewProps {
  sprint: Partial<Sprint>;
  coach: Partial<Coach>;
}

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-[7px] font-black text-primary uppercase tracking-[0.25em] mb-3">
    {children}
  </h2>
);

const LandingPreview: React.FC<LandingPreviewProps> = ({ sprint, coach }) => {
  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden flex flex-col w-full h-[600px] text-[11px] font-sans selection:bg-primary/10">
      {/* Header Info */}
      <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex justify-between items-center flex-shrink-0">
        <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Landing Page Preview</span>
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 opacity-20"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 opacity-20"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 opacity-20"></div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-12">
        {/* Hero Section */}
        <div className="relative h-48 overflow-hidden flex-shrink-0 bg-dark">
          <img 
            src={sprint.coverImageUrl || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80"} 
            className="w-full h-full object-cover opacity-60" 
            alt="" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/20 to-transparent"></div>
          <div className="absolute bottom-5 left-6 right-6 text-white">
            <div className="flex gap-2 mb-2">
              <span className="px-2 py-0.5 bg-primary rounded text-[6px] font-black uppercase tracking-widest border border-white/10">{sprint.category || 'Category'}</span>
            </div>
            <h1 className="text-xl font-black tracking-tight leading-none mb-1 italic">
              <FormattedText text={sprint.title || 'Untitled Sprint'} />
            </h1>
            <p className="text-white/60 text-[6px] font-bold uppercase tracking-widest">{sprint.duration || 7} Day Protocol</p>
          </div>
        </div>

        <div className="px-6 py-6 space-y-8">
          {/* Transformation */}
          <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-fade-in">
            <div className="flex justify-between items-start mb-4">
              <SectionHeading>The Transformation</SectionHeading>
              {sprint.outcomeTag && (
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest italic">{sprint.outcomeTag}</span>
              )}
            </div>
            <div className="space-y-4 text-gray-600 leading-relaxed font-medium">
              <p className="text-gray-900 font-bold text-sm leading-tight italic">
                <FormattedText text={sprint.transformation || sprint.description || 'Enter transformation statement...'} />
              </p>
              
              <div className="h-px bg-gray-50 my-4"></div>

              <div className="grid grid-cols-1 gap-4">
                {sprint.forWho && sprint.forWho.filter(s => s.trim()).length > 0 && (
                  <div>
                    <h4 className="text-[8px] font-black text-gray-900 uppercase tracking-widest mb-2">Ideal for you if:</h4>
                    <ul className="space-y-1.5">
                      {sprint.forWho.filter(s => s.trim()).map((item, i) => (
                        <li key={i} className="flex gap-2 items-start">
                          <span className="text-primary text-[8px] mt-0.5">●</span>
                          <p className="text-[9px] italic font-medium leading-snug">{item}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Method Snapshot */}
          {sprint.methodSnapshot && sprint.methodSnapshot.some(m => m.verb.trim()) && (
            <section className="bg-dark text-white rounded-2xl p-6 relative overflow-hidden">
              <SectionHeading>How It Works</SectionHeading>
              <div className="relative z-10 space-y-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="grid grid-cols-1 gap-4">
                    {sprint.methodSnapshot.filter(m => m.verb.trim()).map((item, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-primary font-black uppercase text-[7px] tracking-widest">{item.verb}</p>
                        <p className="text-[8px] text-white/40 leading-tight">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Outcomes */}
          {sprint.outcomes && sprint.outcomes.filter(o => o.trim()).length > 0 && (
            <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <SectionHeading>Evidence of Completion</SectionHeading>
              <div className="space-y-4 mt-2">
                {sprint.outcomes.filter(o => o.trim()).map((outcome, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-4 h-4 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0 text-[7px] mt-0.5 shadow-sm">✓</div>
                    <p className="font-bold text-gray-700 leading-snug text-[10px]">{outcome}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Final Outcome Statement */}
          <section className="py-8 text-center border-t border-gray-100">
            <p className="text-[7px] font-black text-primary uppercase tracking-[0.3em] mb-4">The Outcome</p>
            <h3 className="text-lg font-black text-gray-900 leading-tight tracking-tight px-4 italic">
              <FormattedText text={sprint.outcomeStatement || "Focus creates feedback. *Feedback creates clarity.*"} />
            </h3>
          </section>
        </div>
      </div>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default LandingPreview;