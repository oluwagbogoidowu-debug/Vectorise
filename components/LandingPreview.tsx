import React, { useState } from 'react';
import { Sprint, Coach } from '../types';
import FormattedText from './FormattedText';
import DynamicSectionRenderer from './DynamicSectionRenderer';
import { CheckCircle2, Clock } from 'lucide-react';
import { PricingTierId, resolveSprintPricingTiers } from '../utils/pricingTiers';

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
  const [selectedTier, setSelectedTier] = useState<PricingTierId | null>(null);
  const tiers = resolveSprintPricingTiers(sprint);

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

          {/* Pricing Tier Preview */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-900 uppercase tracking-wider">Select your tier to start</span>
              <span className="text-[7px] font-black text-[#0E7850] bg-[#0E7850]/10 px-2 py-0.5 rounded-full uppercase">Get a free trial</span>
            </div>

            {[tiers.standard, tiers.complete].map((tier) => {
              const isSelected = selectedTier === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedTier(tier.id)}
                  className={`w-full text-left rounded-xl p-3 border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#0E7850] bg-[#0E7850]/[0.04]'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[9px] font-black text-gray-900 block">
                        {tier.number} {tier.name}
                      </span>
                      <span className="text-[7px] font-bold uppercase tracking-wider text-[#0E7850]">
                        {tier.badge}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-gray-900">{tier.formattedPrice}</span>
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#0E7850] bg-[#0E7850]' : 'border-gray-300'}`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {tier.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[8px] text-gray-600">
                        <CheckCircle2 className="w-2.5 h-2.5 text-[#0E7850] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </section>
        </div>
      </div>

      {/* Fixed Bottom CTA Preview */}
      <div className="border-t border-gray-100 bg-white px-5 py-2.5 flex items-center justify-between gap-2 shrink-0">
        <span className="text-[8px] font-bold text-gray-500 truncate">
          {selectedTier ? `${tiers[selectedTier].name} • ${tiers[selectedTier].formattedPrice}` : 'Select your tier to start'}
        </span>
        <span
          className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider ${
            selectedTier ? 'bg-[#0E7850] text-white' : 'bg-gray-200 text-gray-400'
          }`}
        >
          Start for free
        </span>
      </div>
    </div>
  );
};

export default LandingPreview;
