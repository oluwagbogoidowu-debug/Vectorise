import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FormattedTextProps {
  text: string;
  className?: string;
  inline?: boolean;
}

const processListText = (inputText: string): string => {
  if (!inputText) return "";

  const lines = inputText.split("\n");
  const processedLines: string[] = [];
  
  const bulletRegex = /^([↠•→\-\*\+]|->|=>)\s*(.*)$/;
  const numRegex = /^(\d+[\.\)])\s*(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      processedLines.push("");
      continue;
    }

    // Check if the line is a thematic break (horizontal rule/divider) like --- or *** or ___
    if (/^(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      processedLines.push(line);
      continue;
    }

    const bulletMatch = line.match(bulletRegex);
    const numMatch = line.match(numRegex);

    if (bulletMatch) {
      const marker = bulletMatch[1];
      const remaining = bulletMatch[2];
      let displayMarker = marker;
      if (marker === "->") displayMarker = "→";
      if (marker === "=>") displayMarker = "↠";
      
      processedLines.push(`- [bullet:${displayMarker}] ${remaining}`);
    } else if (numMatch) {
      const marker = numMatch[1];
      const remaining = numMatch[2];
      processedLines.push(`- [bullet:${marker}] ${remaining}`);
    } else {
      processedLines.push(line);
    }
  }

  let output = "";
  for (let i = 0; i < processedLines.length; i++) {
    const current = processedLines[i];
    if (i === 0) {
      output = current;
      continue;
    }

    const prev = processedLines[i - 1];

    if (current === "" || prev === "") {
      output += "\n" + current;
    } else {
      const isCurrentListItem = current.startsWith("- [bullet:");
      const isPrevListItem = prev.startsWith("- [bullet:");

      if (isCurrentListItem && isPrevListItem) {
        output += "\n" + current;
      } else if (isCurrentListItem !== isPrevListItem) {
        output += "\n\n" + current;
      } else {
        output += "\n" + current;
      }
    }
  }

  return output.replace(/\n\n\n+/g, '\n\n');
};

const extractBulletPrefix = (children: any): { bulletChar: string | null; cleaned: any } => {
  if (!children) return { bulletChar: null, cleaned: children };
  
  if (typeof children === 'string') {
    const match = children.match(/^\[bullet:([^\]]+)\]\s*/);
    if (match) {
      return { bulletChar: match[1], cleaned: children.substring(match[0].length) };
    }
    return { bulletChar: null, cleaned: children };
  }

  if (Array.isArray(children)) {
    if (children.length > 0) {
      const first = children[0];
      const res = extractBulletPrefix(first);
      if (res.bulletChar) {
        return { bulletChar: res.bulletChar, cleaned: [res.cleaned, ...children.slice(1)] };
      }
    }
    return { bulletChar: null, cleaned: children };
  }

  if (typeof children === 'object' && children !== null) {
    if (children.props && children.props.children) {
      const res = extractBulletPrefix(children.props.children);
      if (res.bulletChar) {
        const cloned = React.cloneElement(children, {
          ...children.props,
          children: res.cleaned
        });
        return { bulletChar: res.bulletChar, cleaned: cloned };
      }
    }
  }

  return { bulletChar: null, cleaned: children };
};

const FormattedText: React.FC<FormattedTextProps> = ({ text, className = "", inline = false }) => {
  if (!text) return null;

  const processedText = inline ? text : processListText(text);

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
          ul: ({ node, ...props }) => <ul className="list-none p-0 space-y-2 my-4" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-none p-0 space-y-2 my-4" {...props} />,
          li: ({ node, ...props }) => {
            const { bulletChar, cleaned: modifiedChildren } = extractBulletPrefix(props.children);

            let bulletElement: React.ReactNode = null;
            if (bulletChar) {
              if (bulletChar === '↠' || bulletChar === '→' || bulletChar === '=>' || bulletChar === '->') {
                bulletElement = (
                  <span className="text-[#0E7850] font-black text-sm select-none flex-shrink-0 mt-0.5 animate-pulse">
                    {bulletChar}
                  </span>
                );
              } else if (bulletChar === '•' || bulletChar === '*' || bulletChar === '-') {
                bulletElement = (
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0E7850] flex-shrink-0" />
                );
              } else {
                bulletElement = (
                  <span className="text-[#0E7850] font-black text-xs select-none flex-shrink-0 mt-0.5">
                    {bulletChar}
                  </span>
                );
              }
            } else {
              bulletElement = (
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0E7850] flex-shrink-0" />
              );
            }

            return (
              <li className="flex items-start gap-2.5 my-2.5 text-gray-700 leading-relaxed font-normal" {...props}>
                {bulletElement}
                <span className="flex-1">{modifiedChildren}</span>
              </li>
            );
          },
          p: ({ node, ...props }) => <p className="mb-4 last:mb-0 leading-[1.6] whitespace-pre-line" {...props} />,
          hr: ({ node, ...props }) => (
            <hr className="my-8 border-t border-gray-200 w-full" {...props} />
          ),
          h1: ({ node, ...props }) => <h1 className="text-3xl font-black text-gray-900 mb-6 mt-8 tracking-tight" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-2xl font-black text-gray-900 mb-4 mt-6 tracking-tight" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-xl font-black text-gray-900 mb-3 mt-5 tracking-tight" {...props} />,
          a: ({ node, ...props }) => <a className="text-primary font-bold hover:underline decoration-2 underline-offset-4" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-primary/20 pl-6 py-2 my-6 italic text-gray-600 bg-gray-50/50 rounded-r-xl" {...props} />
          ),
        }}
      >
        {processedText}
      </ReactMarkdown>
    </div>
  );
};

export default FormattedText;
