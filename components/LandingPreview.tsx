
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
            <h1 className="text-xl font-black tracking-tight leading-none mb-1">
              <FormattedText text={sprint.title || 'Untitled Sprint'} inline />
            </h1>
            {sprint.subtitle && (
                <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] mb-2">{sprint.subtitle}</p>
            )}
            <p className="text-white/60 text-[6px] font-bold uppercase tracking-widest">{sprint.duration || 7} Day Protocol</p>
          </div>
        </div>

        <div className="px-6 py-6 space-y-8">
          {sprint.dynamicSections?.map((section) => (
            <section key={section.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-fade-in">
              <SectionHeading>{section.title}</SectionHeading>
              <div className="space-y-4 text-gray-600 leading-relaxed font-medium">
                <FormattedText text={section.body} />
              </div>
            </section>
          ))}

          {/* Final Outcome Statement */}
          <section className="py-8 text-center border-t border-gray-100">
            <p className="text-[7px] font-black text-primary uppercase tracking-[0.3em] mb-4">The Outcome</p>
            <h3 className="text-lg font-black text-gray-900 leading-tight tracking-tight px-4">
              <FormattedText text={sprint.outcomeStatement || "Focus creates feedback. *Feedback creates clarity.*"} inline />
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
