import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

/**
 * Parses text and converts *bold* syntax into <strong> tags.
 * Uses whitespace-pre-wrap to ensure newlines from textareas are preserved.
 */
const FormattedText: React.FC<FormattedTextProps> = ({ text, className = "" }) => {
  if (!text) return null;

  // Regex to match text between single asterisks: *example*
  // We use [^*] to ensure we don't match across other asterisks incorrectly
  const parts = text.split(/(\*[^*]+\*)/g);

  return (
    <span className={`${className} whitespace-pre-wrap inline-block w-full`}>
      {parts.map((part, index) => {
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          // Remove the asterisks and render bold with extra weight
          return (
            <strong key={index} className="font-black text-gray-900">
              {part.slice(1, -1)}
            </strong>
          );
        }
        // Return normal text
        return part;
      })}
    </span>
  );
};

export default FormattedText;