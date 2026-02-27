import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FormattedTextProps {
  text: string;
  className?: string;
}

const FormattedText: React.FC<FormattedTextProps> = ({ text, className = "" }) => {
  if (!text) return null;

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          em: ({ node, ...props }) => <em className="not-italic" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-black text-gray-900" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-none p-0 space-y-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-2" {...props} />,
          li: ({ node, ...props }) => <li className="flex items-start gap-2" {...props} />,
          p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
          h1: ({ node, ...props }) => <h1 className="text-2xl font-black text-gray-900 mb-4" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-black text-gray-900 mb-3" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-black text-gray-900 mb-2" {...props} />,
          a: ({ node, ...props }) => <a className="text-primary hover:underline" {...props} />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

export default FormattedText;
