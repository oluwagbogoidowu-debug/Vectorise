import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FormattedTextProps {
  text: string;
  className?: string;
  inline?: boolean;
}

const FormattedText: React.FC<FormattedTextProps> = ({ text, className = "", inline = false }) => {
  if (!text) return null;

  // Pre-process text to ensure single newlines are treated as paragraph breaks
  // by converting them to double newlines, while avoiding excessive spacing.
  const processedText = inline ? text : text.split('\n').map(line => line.trim()).join('\n\n').replace(/\n\n\n+/g, '\n\n');

  if (inline) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ node, ...props }) => <span {...props} />,
          em: ({ node, ...props }) => <em className="not-italic" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-black" {...props} />,
        }}
      >
        {processedText}
      </ReactMarkdown>
    );
  }

  return (
    <div className={`markdown-content leading-[1.6] text-gray-800 max-w-[60ch] ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          em: ({ node, ...props }) => <em className="not-italic text-primary font-bold" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-black text-gray-900" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-none p-0 space-y-3 my-4" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-6 space-y-3 my-4" {...props} />,
          li: ({ node, ...props }) => (
            <li className="flex items-start gap-3" {...props}>
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/30 flex-shrink-0" />
              <span className="flex-1">{props.children}</span>
            </li>
          ),
          p: ({ node, ...props }) => <p className="mb-4 last:mb-0 leading-[1.6]" {...props} />,
          h1: ({ node, ...props }) => <h1 className="text-3xl font-black text-gray-900 mb-6 mt-8 tracking-tight" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-2xl font-black text-gray-900 mb-4 mt-6 tracking-tight" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-xl font-black text-gray-900 mb-3 mt-5 tracking-tight" {...props} />,
          a: ({ node, ...props }) => <a className="text-primary font-bold hover:underline decoration-2 underline-offset-4" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-primary/20 pl-6 py-2 my-6 italic text-gray-600 bg-gray-50/50 rounded-r-xl" {...props} />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

export default FormattedText;
