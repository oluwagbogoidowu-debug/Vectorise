import React from 'react';
import FormattedText from './FormattedText';

interface PagedSprintDescriptionProps {
  text: string;
  className?: string;
  textSizeClass?: string;
}

export const PagedSprintDescription: React.FC<PagedSprintDescriptionProps> = ({
  text,
  className = "",
  textSizeClass = "text-base sm:text-lg text-gray-800 dark:text-gray-200 font-medium leading-relaxed"
}) => {
  const content = (text && text.trim()) ? text.trim() : "Unlock consistency and start your rise.";

  return (
    <div className={`w-full flex flex-col ${className}`}>
      {/* Continuous Scroll Area */}
      <div className="relative max-h-[42vh] overflow-y-auto custom-scrollbar p-1">
        <div className={textSizeClass}>
          <FormattedText text={content} />
        </div>
      </div>
    </div>
  );
};

export default PagedSprintDescription;

