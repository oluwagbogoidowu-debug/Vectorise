
import React from 'react';
import { DynamicSection } from '../types';
import FormattedText from './FormattedText';
import { CheckCircle2, Zap, Target, XCircle, Info } from 'lucide-react';

interface DynamicSectionRendererProps {
  section: DynamicSection;
}

const DynamicSectionRenderer: React.FC<DynamicSectionRendererProps> = ({ section }) => {
  const isList = section.type === 'list';
  const items = isList ? section.body.split('\n').filter(item => item.trim() !== '') : [];

  const getIcon = () => {
    const title = section.title.toLowerCase();
    if (title.includes('target') || title.includes('for who')) return <Target className="w-4 h-4 text-primary" />;
    if (title.includes('exclusion') || title.includes('not for')) return <XCircle className="w-4 h-4 text-red-400" />;
    if (title.includes('method') || title.includes('how it works')) return <Zap className="w-4 h-4 text-amber-400" />;
    if (title.includes('evidence') || title.includes('outcome') || title.includes('completion')) return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    return <Info className="w-4 h-4 text-gray-400" />;
  };

  if (!isList) {
    return (
      <div className="text-gray-800 font-medium leading-relaxed max-w-none prose prose-sm">
        <FormattedText text={section.body} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      {items.map((item, idx) => (
        <div 
          key={idx} 
          className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 flex gap-4 items-start group hover:bg-white hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
        >
          <div className="mt-1 flex-shrink-0">
            {getIcon()}
          </div>
          <p className="text-[13px] font-semibold text-gray-700 leading-snug italic">
            {item}
          </p>
        </div>
      ))}
    </div>
  );
};

export default DynamicSectionRenderer;
