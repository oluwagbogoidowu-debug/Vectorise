
import React from 'react';
import { DynamicSection } from '../types';
import FormattedText from './FormattedText';
import { CheckCircle2, Zap, Target, XCircle, Info } from 'lucide-react';

interface DynamicSectionRendererProps {
  section: DynamicSection;
}

const DynamicSectionRenderer: React.FC<DynamicSectionRendererProps> = ({ section }) => {
  const isList = section.type === 'list';
  // If type is missing, we can try to infer it from the ID for legacy data
  const effectiveIsList = isList || (['forWho', 'notForWho', 'methodSnapshot', 'outcomes'].includes(section.id) && !section.type);
  
  const items = effectiveIsList ? section.body.split('\n').filter(item => item.trim() !== '') : [];

  const getIcon = () => {
    const title = section.title.toLowerCase();
    if (title.includes('target') || title.includes('for who')) return <Target className="w-4 h-4 text-primary" />;
    if (title.includes('exclusion') || title.includes('not for')) return <XCircle className="w-4 h-4 text-red-400" />;
    if (title.includes('method') || title.includes('how it works')) return <Zap className="w-4 h-4 text-amber-400" />;
    if (title.includes('evidence') || title.includes('outcome') || title.includes('completion')) return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    return <Info className="w-4 h-4 text-gray-400" />;
  };

  if (!effectiveIsList) {
    return (
      <div className="text-gray-700 font-medium text-base leading-[1.6] max-w-[60ch] prose prose-primary">
        <FormattedText text={section.body} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
      {items.map((item, idx) => (
        <div 
          key={idx} 
          className="bg-white border border-gray-100 rounded-3xl p-6 flex gap-5 items-start group hover:border-primary/20 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] transition-all duration-500 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/10 group-hover:bg-primary transition-colors duration-500"></div>
          <div className="mt-0.5 p-2 bg-gray-50 rounded-xl group-hover:bg-primary/5 transition-colors duration-500 flex-shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-bold text-gray-800 leading-relaxed group-hover:text-gray-900 transition-colors">
              {item}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DynamicSectionRenderer;
