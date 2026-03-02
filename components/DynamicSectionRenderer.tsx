
import React from 'react';
import { DynamicSection } from '../types';
import FormattedText from './FormattedText';

interface DynamicSectionRendererProps {
  section: DynamicSection;
}

const DynamicSectionRenderer: React.FC<DynamicSectionRendererProps> = ({ section }) => {
  return (
    <div className="text-gray-700 font-medium text-base leading-[1.6] max-w-[60ch] prose prose-primary">
      <FormattedText text={section.body} />
    </div>
  );
};

export default DynamicSectionRenderer;
