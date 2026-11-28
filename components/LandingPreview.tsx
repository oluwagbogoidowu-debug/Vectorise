import React from 'react';
import { Sprint, Coach } from '../types';
import FormattedText from './FormattedText';
import DynamicSectionRenderer from './DynamicSectionRenderer';
import { Clock, CheckCircle2 } from 'lucide-react';
import { getSprintPaymentMode } from '../utils/sprintUtils';
import { resolveSprintPricingTiers } from '../utils/pricingTiers';

interface LandingPreviewProps {
  sprint: Partial<Sprint>;
  coach: Partial<Coach>;
}

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-[7px] font-black text-primary uppercase tracking-[0.25em] mb-3">
    {children}
  </h2>
);

const LandingPreview: React.FC<LandingPreviewProps> = ({ sprint }) => {
  const { isCashSprint, isFreeSprint } = getSprintPaymentMode(sprint as Sprint);
  const showCashTiers = isCashSprint && !isFreeSprint;
  const pricingTiers = resolveSprintPricingTiers(sprint);

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
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
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
            <h1 className="text-xl font-black tracking-tight leading-none mb-2">
              <FormattedText text={sprint.title || 'Untitled Sprint'} inline />
            </h1>
            {sprint.subtitle && (
                <p className="text-white/60 text-[8px] font-medium tracking-tight mb-3 leading-snug max-w-[200px]">{sprint.subtitle}</p>
            )}
            <div className="flex items-center gap-1.5 text-white/40 text-[6px] font-black uppercase tracking-widest">
              <Clock className="w-2 h-2" />
              {sprint.duration || 5} Move Journey
            </div>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5">
          {(sprint.description || (Array.isArray(sprint.dynamicSections) && sprint.dynamicSections.filter(s => s.body && s.body.trim()).length > 0)) && (
            <section className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-fade-in">
              <SectionHeading>Sprint Overview</SectionHeading>
              
              <div className="space-y-4">
                {sprint.description && (!Array.isArray(sprint.dynamicSections) || sprint.dynamicSections.filter(s => s.body && s.body.trim()).length === 0) && (
                  <p className="text-[9px] text-gray-600 font-medium leading-relaxed">
                    {sprint.description}
                  </p>
                )}

                {Array.isArray(sprint.dynamicSections) && sprint.dynamicSections.filter(s => s.body && s.body.trim()).map((section) => (
                  <div key={`${section.id}-${section.type}`} className="animate-fade-in">
                    {section.id !== 'overview' && <h3 className="text-[8px] font-black text-gray-900 uppercase tracking-widest mb-2">{section.title}</h3>}
                    <DynamicSectionRenderer section={section} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {showCashTiers && (
            <section className="space-y-2.5 animate-fade-in">
              <SectionHeading>Select Your Tier</SectionHeading>
              <div className="grid grid-cols-1 gap-2.5">
                {[pricingTiers.standard, pricingTiers.complete].map((tier) => (
                  <div
                    key={tier.id}
                    className={`rounded-2xl p-3.5 border ${
                      tier.id === 'complete'
                        ? 'border-[#0E7850]/30 bg-emerald-50/30'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <div className="text-[8px] font-black uppercase tracking-wider text-[#0E7850]">
                          {tier.number} {tier.name}
                        </div>
                        <div className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">
                          {tier.badge}
                        </div>
                      </div>
                      <span className="text-[11px] font-black text-gray-900 tabular-nums">
                        {tier.formattedPrice}
                      </span>
                    </div>
                    <div className="space-y-1 pt-1.5 border-t border-gray-100">
                      {tier.features.slice(0, 3).map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[8px] text-gray-600">
                          <CheckCircle2 className="w-2.5 h-2.5 text-[#0E7850] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Fixed Bottom CTA Preview */}
      <div className="border-t border-gray-100 bg-white px-4 py-2.5 shrink-0">
        <span className="w-full block text-center py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest bg-[#0E7850] text-white shadow-sm">
          {showCashTiers ? 'Select a tier to continue' : 'Start for free'}
        </span>
      </div>
    </div>
  );
};

export default LandingPreview;
