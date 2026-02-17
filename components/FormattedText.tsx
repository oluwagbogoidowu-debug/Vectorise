import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

/**
 * Parses text and converts:
 * - *bold* syntax into <strong> tags.
 * - _italic_ syntax into <em> tags.
 * - Lines starting with "- " into bullet points.
 * - Lines starting with "1. " (or any digit) into numbered lists.
 */
const FormattedText: React.FC<FormattedTextProps> = ({ text, className = "" }) => {
  if (!text) return null;

  // Process line by line to handle lists correctly
  const lines = text.split('\n');
  
  return (
    <span className={`${className} whitespace-pre-wrap inline-block w-full`}>
      {lines.map((line, lineIdx) => {
        let content: React.ReactNode = line;
        let isBullet = false;
        let isNumbered = false;
        let listNumber = "";

        // Check for Bullet List
        if (line.trim().startsWith('- ')) {
          isBullet = true;
          content = line.trim().substring(2);
        } 
        // Check for Numbered List (e.g., "1. ")
        else if (/^\d+\.\s/.test(line.trim())) {
          isNumbered = true;
          const match = line.trim().match(/^(\d+\.)\s(.*)/);
          if (match) {
            listNumber = match[1];
            content = match[2];
          }
        }

        // Inline parsing for Bold (*) and Italic (_)
        const parseInline = (str: string) => {
          const parts = str.split(/(\*[^*]+\*)|(_[^_]+_)/g);
          return parts.map((part, i) => {
            if (!part) return null;
            if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
              return <strong key={i} className="font-black text-gray-900">{part.slice(1, -1)}</strong>;
            }
            if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
              return <em key={i} className="italic text-gray-800">{part.slice(1, -1)}</em>;
            }
            return part;
          });
        };

        const parsedContent = typeof content === 'string' ? parseInline(content) : content;

        if (isBullet) {
          return (
            <span key={lineIdx} className="flex gap-3 mb-1.5 last:mb-0 group/line">
              <span className="text-primary font-black mt-1 flex-shrink-0 animate-fade-in">•</span>
              <span className="flex-1">{parsedContent}</span>
            </span>
          );
        }

        if (isNumbered) {
          return (
            <span key={lineIdx} className="flex gap-3 mb-1.5 last:mb-0">
              <span className="text-primary font-black italic text-[10px] mt-1 flex-shrink-0 min-w-[18px]">{listNumber}</span>
              <span className="flex-1">{parsedContent}</span>
            </span>
          );
        }

        return (
          <span key={lineIdx} className="block min-h-[1em]">
            {parsedContent}
          </span>
        );
      })}
    </span>
  );
};

export default FormattedText;