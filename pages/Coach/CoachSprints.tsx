import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sprint, Coach } from '../../types';
import { sprintService } from '../../services/sprintService';
import { assetService } from '../../services/assetService';
import Button from '../../components/Button';
import { Eye, Flame, BookOpen, Sparkles, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import SprintShareModal from '../../components/SprintShareModal';
import CustomSelect from '../../components/CustomSelect';

const IGNITE_COLORS = [
  { hex: '#111827', name: 'Charcoal' },
  { hex: '#6D28D9', name: 'Magic Purple' },
  { hex: '#0F766E', name: 'Deep Teal' },
  { hex: '#047857', name: 'Emerald' },
  { hex: '#B45309', name: 'Warm Amber' },
  { hex: '#BE123C', name: 'Crimson' },
];

const BlogPreviewModal: React.FC<{
  title: string;
  body: string;
  coverImage: string;
  coachName: string;
  onClose: () => void;
}> = ({ title, body, coverImage, coachName, onClose }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-[400] bg-white flex flex-col overflow-y-auto animate-fade-in text-gray-900">
      {/* Cover Image Banner (Full Bleed) */}
      <div className="relative w-full h-80 md:h-[480px] bg-gray-100 flex-shrink-0">
        <img 
          src={coverImage || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80'} 
          className="w-full h-full object-cover" 
          alt="Cover Image" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/50 to-black/20" />
        
        {/* Float Close Button */}
        <button 
          type="button"
          onClick={onClose} 
          className="absolute top-6 right-6 md:top-8 md:right-8 z-[420] bg-black/40 hover:bg-black/60 p-3 rounded-full transition-all text-white font-bold active:scale-90 cursor-pointer shadow-lg backdrop-blur-sm"
          title="Close Preview"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Overlaid Title and Info for immersive reading look */}
        <div className="absolute bottom-0 inset-x-0 p-6 md:p-12 max-w-4xl mx-auto text-white flex flex-col justify-end h-full w-full">
          <span className="text-[10px] md:text-[11px] font-black text-amber-400 uppercase tracking-[0.25em] mb-3">RiseBlog Preview</span>
          <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight italic drop-shadow-sm mb-4">
            {title || 'Untitled Rising Post'}
          </h1>
          
          {/* Meta details over gradient */}
          <div className="flex items-center gap-3 pt-2 text-[10px] font-black text-white/80 uppercase tracking-widest border-t border-white/20">
            <span className="px-2.5 py-1 bg-white/15 rounded-lg text-white">Author</span>
            <span className="text-white font-black">{coachName}</span>
            <div className="w-1.5 h-1.5 bg-white/30 rounded-full"></div>
            <span className="text-white/70">{currentDate}</span>
          </div>
        </div>
      </div>

      {/* Article content below */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 md:py-16 space-y-8 animate-slide-up">
        <div className="bg-white rounded-[2rem] p-6 md:p-12 border border-gray-100 shadow-sm leading-relaxed text-gray-800 text-base md:text-lg whitespace-pre-wrap font-medium font-sans">
          {body || 'Write something inspiring to rise...'}
        </div>
      </div>
    </div>
  );
};

const IgnitePlayer: React.FC<{
  text: string;
  bgColor: string;
  onClose: () => void;
}> = ({ text, bgColor, onClose }) => {
  const slides = React.useMemo(() => {
    return text.split(/\r?\n\s*\r?\n/).map(s => s.trim()).filter(Boolean);
  }, [text]);

  const activeSlides = slides.length > 0 ? slides : ["Type some inspiration to preview!"];
  
  const [activeSlide, setActiveSlide] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
  }, [activeSlide]);

  useEffect(() => {
    const slideDuration = 4500; // 4.5 seconds per slide
    const intervalTime = 50; // tick every 50ms
    const step = (intervalTime / slideDuration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setActiveSlide(curr => (curr + 1) % activeSlides.length);
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeSlides.length, activeSlide]);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSlide(curr => (curr + 1) % activeSlides.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSlide(curr => (curr - 1 + activeSlides.length) % activeSlides.length);
  };

  return (
    <div 
      className="fixed inset-0 z-[400] flex flex-col justify-between p-6 select-none animate-fade-in text-white font-sans"
      style={{ backgroundColor: bgColor }}
    >
      {/* Bars at the top */}
      <div className="absolute top-6 left-6 right-6 flex gap-1 z-[410]">
        {activeSlides.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full"
              style={{
                width: idx < activeSlide ? '100%' : idx === activeSlide ? `${progress}%` : '0%',
                transition: idx === activeSlide ? 'none' : 'width 0.05s linear'
              }}
            />
          </div>
        ))}
      </div>

      {/* Close button */}
      <button 
        type="button"
        onClick={onClose} 
        className="absolute top-10 right-6 z-[420] bg-black/40 hover:bg-black/60 p-2.5 rounded-full transition-all text-white/90 font-bold active:scale-90 cursor-pointer"
        title="Exit Fullscreen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Main slide display - split clickable regions for left/right nav */}
      <div className="relative flex-1 flex items-center justify-center px-4 md:px-12 my-12">
        {/* Left click catcher */}
        <div className="absolute left-0 top-0 bottom-0 w-1/3 cursor-w-resize" onClick={handlePrev} />
        
        {/* Main large text content */}
        <p className="text-3xl md:text-5xl font-extrabold text-center leading-relaxed tracking-wide text-white drop-shadow-md whitespace-pre-wrap max-w-3xl pointer-events-none px-4 select-none animate-slide-up">
          {activeSlides[activeSlide]}
        </p>

        {/* Right click catcher */}
        <div className="absolute right-0 top-0 bottom-0 w-2/3 cursor-e-resize" onClick={handleNext} />
      </div>

      {/* Bottom info */}
      <div className="flex justify-between items-center z-[410] px-4 font-black tracking-widest text-[10px] text-white/60 uppercase">
        <span>Ignite Post</span>
        <span>Slide {activeSlide + 1} of {activeSlides.length}</span>
      </div>
    </div>
  );
};

const DeleteConfirmationModal: React.FC<{
    sprint: Sprint;
    onClose: () => void;
    onConfirm: (sprintId: string) => void;
    isDeleting: boolean;
}> = ({ sprint, onClose, onConfirm, isDeleting }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden animate-slide-up flex flex-col p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" />
                    </svg>
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Delete Course?</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8 italic">
                    "This content will be permanently removed. Enrolled participants may no longer be able to view it."
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-gray-50 text-gray-500 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => onConfirm(sprint.id)}
                        disabled={isDeleting}
                        className="flex-1 py-3.5 bg-red-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-red-100 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const EditBlogModal: React.FC<{
  blog: Sprint;
  onClose: () => void;
  onSave: (updated: Partial<Sprint>) => Promise<void>;
  isSaving: boolean;
}> = ({ blog, onClose, onSave, isSaving }) => {
  const [title, setTitle] = useState(blog.title || '');
  const [image, setImage] = useState(blog.blogImage || blog.coverImageUrl || '');
  const [body, setBody] = useState(blog.blogBody || blog.description || '');
  
  const initialCategory = blog.category || 'Mindset';
  const isPresetCategory = ['Mindset', 'Execution', 'Micro-Habits'].includes(initialCategory);
  const [category, setCategory] = useState(isPresetCategory ? initialCategory : 'Others');
  const [customCategory, setCustomCategory] = useState(isPresetCategory ? '' : initialCategory);

  const finalCategory = category === 'Others' ? (customCategory.trim() || 'Other') : category;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
        alert('Please enter a title');
        return;
    }
    onSave({
      title,
      blogBody: body,
      description: body,
      blogImage: image || `https://picsum.photos/seed/${blog.id}/800/400`,
      coverImageUrl: image || `https://picsum.photos/seed/${blog.id}/800/400`,
      category: finalCategory,
    });
  };

  const insertFormat = (prefix: string, suffix: string = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);

    let replacement = '';
    if (prefix === '# ' || prefix === '## ' || prefix === '> ' || prefix === '* ' || prefix === '1. ') {
      // Line-based block formatting
      const beforeCursor = text.substring(0, start);
      const lineStartIdx = beforeCursor.lastIndexOf('\n') + 1;
      const beforeLine = text.substring(0, lineStartIdx);
      const lineContent = text.substring(lineStartIdx, end);

      if (lineContent.startsWith(prefix)) {
        // Toggle off
        replacement = beforeLine + lineContent.substring(prefix.length) + text.substring(end);
      } else {
        // Toggle on
        replacement = beforeLine + prefix + lineContent + text.substring(end);
      }
    } else {
      // Inline formatting like wrapping text in bold asterisks
      replacement = text.substring(0, start) + prefix + (selected || 'bold text') + suffix + text.substring(end);
    }

    setBody(replacement);

    // Maintain focus and reset selection
    setTimeout(() => {
      el.focus();
      const offset = prefix.length + (selected ? selected.length : (prefix === '**' ? 9 : 0)) + suffix.length;
      el.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : (prefix === '**' ? 9 : 0)));
    }, 50);
  };

  // Live rendered content formatter aligned with RiseBlog.tsx
  const renderFormattedPreview = (content: string) => {
    if (!content.trim()) {
      return <p className="text-gray-300 italic text-sm">Preview content will appear here in real-time...</p>;
    }
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-4" />;
      
      if (trimmed.startsWith('# ')) {
        return <h1 key={idx} className="text-2xl font-black text-gray-900 tracking-tight mt-6 mb-3 border-b pb-2 border-gray-100">{trimmed.replace('# ', '')}</h1>;
      }
      if (trimmed.startsWith('## ')) {
        return <h2 key={idx} className="text-lg font-black text-gray-900 tracking-tight mt-4 mb-2">{trimmed.replace('## ', '')}</h2>;
      }
      if (trimmed.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-4 border-[#0E7850] pl-4 py-1 italic my-3 text-gray-600 bg-gray-50/50 pr-2 rounded-r-lg font-medium">
            {trimmed.replace('> ', '')}
          </blockquote>
        );
      }
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const text = trimmed.replace(/^[\*\-]\s+/, '');
        if (text.includes('**')) {
          const parts = text.split('**');
          return (
            <li key={idx} className="ml-6 list-disc text-xs text-gray-650 leading-relaxed mb-1.5 font-medium">
              {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-gray-900 font-black">{part}</strong> : part)}
            </li>
          );
        }
        return <li key={idx} className="ml-6 list-disc text-xs text-gray-650 leading-relaxed mb-1.5 font-medium">{text}</li>;
      }
      if (trimmed.match(/^\d+\.\s+/)) {
        const text = trimmed.replace(/^\d+\.\s+/, '');
        return (
          <li key={idx} className="ml-6 list-decimal text-xs text-gray-650 leading-relaxed mb-1.5 font-medium">
            {text.includes('**') ? (
              text.split('**').map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-gray-900 font-black">{part}</strong> : part)
            ) : text}
          </li>
        );
      }
      
      if (trimmed.includes('**')) {
        const parts = trimmed.split('**');
        return (
          <p key={idx} className="text-xs text-gray-650 leading-relaxed mb-3 font-medium">
            {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-gray-900 font-black">{part}</strong> : part)}
          </p>
        );
      }
      return <p key={idx} className="text-xs text-gray-650 leading-relaxed mb-3 font-medium">{trimmed}</p>;
    });
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#FAFAFA] flex flex-col overflow-hidden animate-fade-in font-sans">
      {/* Top action header */}
      <div className="bg-white border-b border-gray-150 px-8 py-4 flex justify-between items-center z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-primary uppercase tracking-[0.25em]">RiseBlog Studio</span>
          <span className="text-[10px] text-gray-400 font-black px-2.5 py-1 bg-gray-50 rounded-full border border-gray-100 uppercase tracking-wider">Live Rich Editor</span>
        </div>
        <div className="flex gap-3">
          <button 
            type="button"
            disabled={isSaving}
            onClick={onClose} 
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button"
            disabled={isSaving}
            onClick={handleSubmit} 
            className="px-5 py-2 bg-[#0E7850] text-white hover:bg-[#0E7850]/90 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer"
          >
            {isSaving ? 'Saving Changes...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* Main split work space */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        
        {/* Left Side: Text input editor pane */}
        <div className="w-full lg:w-1/2 border-r border-gray-100 bg-white p-6 md:p-8 overflow-y-auto flex flex-col space-y-6">
          {/* Progress Hint Banner */}
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-base">🌱</div>
              <div>
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block">88% Complete</span>
                <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider block mt-0.5">0 more steps to go</span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-[#0E7850] text-white rounded-full text-[8px] font-black uppercase tracking-widest">Ready to go</span>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Blog Post Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. 5 Micro-Habits That Redefine Executive Leadership"
              className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-black mt-1.5 transition-all" 
              required 
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Cover Image URL</label>
            <input 
              type="url" 
              value={image} 
              onChange={e => setImage(e.target.value)} 
              placeholder="e.g. https://images.unsplash.com/... or leave blank for auto seed"
              className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-xs font-bold mt-1.5 transition-all" 
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Blog Category</label>
            <CustomSelect
              options={['Mindset', 'Execution', 'Micro-Habits', 'Others']}
              value={category}
              onChange={(val) => setCategory(String(val))}
              className="mt-1.5"
            />
          </div>

          {category === 'Others' && (
            <div className="animate-fade-in">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Custom Category Name</label>
              <input 
                type="text" 
                value={customCategory} 
                onChange={e => setCustomCategory(e.target.value)} 
                placeholder="e.g. Influence, Wellness, Innovation"
                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-xs font-bold mt-1.5 transition-all" 
                required 
              />
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-[350px]">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Blog Post Body</label>
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Single formatted input</span>
            </div>

            {/* Quick format utility toolbar */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-2 mb-2 flex flex-wrap gap-1 items-center shadow-inner">
              <button
                type="button"
                onClick={() => insertFormat('# ')}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-150 rounded-lg text-[10px] font-black text-gray-700 tracking-wider transition-all active:scale-95"
                title="Add Heading 1"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => insertFormat('## ')}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-150 rounded-lg text-[10px] font-black text-gray-700 tracking-wider transition-all active:scale-95"
                title="Add Subheading H2"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => insertFormat('**', '**')}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-150 rounded-lg text-[10px] font-black text-gray-700 tracking-wider transition-all active:scale-95"
                title="Format Selection Bold"
              >
                Bold
              </button>
              <button
                type="button"
                onClick={() => insertFormat('> ')}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-150 rounded-lg text-[10px] font-black text-gray-700 tracking-wider transition-all active:scale-95"
                title="Add Quote Block"
              >
                Quote
              </button>
              <button
                type="button"
                onClick={() => insertFormat('* ')}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-150 rounded-lg text-[10px] font-black text-gray-700 tracking-wider transition-all active:scale-95"
                title="Add Bullet point"
              >
                Bullet
              </button>
              <button
                type="button"
                onClick={() => insertFormat('1. ')}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-150 rounded-lg text-[10px] font-black text-gray-700 tracking-wider transition-all active:scale-95"
                title="Add Numbered List"
              >
                List
              </button>
            </div>

            <textarea 
              ref={textareaRef}
              value={body} 
              onChange={e => setBody(e.target.value)} 
              placeholder={`Write your post using the toolbar formatters, e.g.:

# My Major Heading
This is an inspiring introduction. You can add **bold keywords** easily to emphasize main steps.

## Dynamic Subheading
* Use bullet lists to break down steps
* Keep the content extremely concise and engaging`}
              className="w-full flex-1 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-xs font-medium font-mono resize-none leading-relaxed min-h-[250px]" 
              required 
            />
          </div>
        </div>

        {/* Right Side: Formatted Live Preview pane */}
        <div className="w-full lg:w-1/2 bg-[#F9FAF9] p-6 md:p-8 overflow-y-auto flex flex-col">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Real-time Public Preview</span>
            <span className="text-[8px] bg-[#0E7850]/10 text-[#0E7850] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Synchronized</span>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100/80 p-6 md:p-8 shadow-sm flex-1 min-h-[400px]">
            {image && (
              <img 
                src={image} 
                alt="Post Preview" 
                className="w-full h-40 md:h-48 object-cover rounded-2xl mb-6 border border-gray-100" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/placeholder/800/400';
                }}
              />
            )}
            <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight leading-tight mb-4 uppercase">
              {title || 'Untitled Blog Post'}
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-6 pb-4 border-b border-gray-50">
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[9px] font-black uppercase mr-1">{finalCategory}</span>
              <span>BY COACH</span>
              <span>•</span>
              <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>

            <div className="space-y-1 font-sans">
              {renderFormattedPreview(body)}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const EditIgniteModal: React.FC<{
  ignite: Sprint;
  onClose: () => void;
  onSave: (updated: Partial<Sprint>) => Promise<void>;
  isSaving: boolean;
}> = ({ ignite, onClose, onSave, isSaving }) => {
  const [body, setBody] = useState(ignite.igniteBody || ignite.description || '');
  const [bgColor, setBgColor] = useState(ignite.igniteBgColor || '#6D28D9');
  const [igniteDate, setIgniteDate] = useState(ignite.igniteDate || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
        alert('Please enter an inspiring thought');
        return;
    }
    const cleanSnippet = body.substring(0, 30) + (body.length > 30 ? '...' : '');
    onSave({
      title: cleanSnippet,
      igniteBody: body,
      description: body,
      igniteBgColor: bgColor,
      igniteDate: igniteDate || "",
    });
  };

  return (
    <div className="fixed inset-0 z-[300] bg-gray-50 flex flex-col overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white border-b border-gray-150 px-8 py-5 sticky top-0 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-primary uppercase tracking-[0.25em]">Ignite Studio</span>
          <span className="text-xs text-gray-400 font-extrabold px-3 py-1 bg-gray-50 rounded-lg">Full Bleed Studio</span>
        </div>
        <div className="flex gap-3">
          <button 
            type="button"
            disabled={isSaving}
            onClick={onClose} 
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button"
            disabled={isSaving}
            onClick={handleSubmit} 
            className="px-6 py-2.5 bg-primary text-white hover:bg-primary/95 disabled:opacity-50 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
          >
            {isSaving ? 'Saving Changes...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 space-y-8 animate-slide-up">
        <div className="bg-white rounded-[3.5rem] p-8 md:p-12 border border-gray-100 shadow-sm space-y-6">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Inspire someone today (Double break splits slides)</label>
            <textarea 
              value={body} 
              onChange={e => setBody(e.target.value)} 
              rows={10} 
              className="w-full px-5 py-4 border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none mt-2 font-medium resize-none text-center text-lg leading-relaxed h-[250px] italic pt-16" 
              required 
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Set Background Color theme</label>
            <div className="flex flex-wrap gap-3 mt-3">
              {IGNITE_COLORS.map(color => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setBgColor(color.hex)}
                  className={`w-12 h-12 rounded-full border-2 transition-all relative flex items-center justify-center hover:scale-105 active:scale-95 cursor-pointer`}
                  style={{ 
                    backgroundColor: color.hex,
                    borderColor: bgColor === color.hex ? '#3B82F6' : 'transparent' 
                  }}
                  title={color.name}
                >
                  {bgColor === color.hex && (
                    <span className="text-white text-xs font-black">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Live Date (Optional)</label>
            <input 
              type="date" 
              value={igniteDate} 
              onChange={e => setIgniteDate(e.target.value)} 
              className="w-full px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold transition-all mt-2" 
            />
            <p className="text-[10px] text-gray-400 font-extrabold mt-1.5 uppercase tracking-widest leading-none">Schedule this Ignite to go live on a specific day. If left blank, it comes live immediately.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const CoachSprints: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [orchestratedIds, setOrchestratedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'published' | 'pending' | 'rejected' | 'draft'>('all');
  const [activeTab, setActiveTab] = useState<'sprint' | 'blog' | 'ignite'>('sprint');
  const [isLoading, setIsLoading] = useState(true);
  
  const [sprintToDelete, setSprintToDelete] = useState<Sprint | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit states for blog and ignite
  const [editingBlog, setEditingBlog] = useState<Sprint | null>(null);
  const [editingIgnite, setEditingIgnite] = useState<Sprint | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Preview states
  const [previewingBlog, setPreviewingBlog] = useState<Sprint | null>(null);
  const [previewingIgnite, setPreviewingIgnite] = useState<Sprint | null>(null);
  const [selectedShareSprint, setSelectedShareSprint] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    setIsLoading(true);
    
    // 1. Subscribe to coach's sprints in real-time
    const unsubSprints = sprintService.subscribeToCoachSprints(user.id, (data) => {
        setSprints(data);
        setIsLoading(false);
    });

    // 2. Load orchestration mapping
    const loadOrchestration = async () => {
        try {
            const orchestration = await sprintService.getOrchestration();
            const liveIds = new Set(
                Object.values(orchestration)
                    .map(m => m.sprintId)
                    .filter(id => !!id)
            );
            setOrchestratedIds(liveIds);
        } catch (err) {
            console.error(err);
        }
    };
    
    loadOrchestration();
    return () => unsubSprints();
  }, [user, location.key]);

  const handleTogglePublish = async (sprint: Sprint) => {
    const newPublished = !sprint.published;
    try {
      await sprintService.updateSprint(sprint.id, { published: newPublished });
      toast.success(`${sprint.title} is now ${newPublished ? 'ON (Published)' : 'OFF (Hidden)'}`);
    } catch (error) {
      console.error("Error toggling publish state:", error);
      toast.error("Failed to update status");
    }
  };

  const filteredSprints = useMemo(() => {
    // Standard tab isolation
    let tFiltered = sprints.filter(s => {
      if (activeTab === 'sprint') {
        return !s.contentType || s.contentType === 'sprint';
      }
      return s.contentType === activeTab;
    });

    let filtered = tFiltered;
    if (filter === 'published') filtered = tFiltered.filter(s => s.published);
    else if (filter === 'pending') filtered = tFiltered.filter(s => s.approvalStatus === 'pending_approval');
    else if (filter === 'rejected') filtered = tFiltered.filter(s => s.approvalStatus === 'rejected');
    else if (filter === 'draft') filtered = tFiltered.filter(s => s.approvalStatus === 'draft');
    
    return [...filtered].sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
  }, [sprints, activeTab, filter]);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
        await sprintService.deleteSprint(id);
        setSprintToDelete(null);
    } catch (err) {
        alert("Failed to delete sprint.");
    } finally {
        setIsDeleting(false);
    }
  };

  const handleSaveBlogEdit = async (updated: Partial<Sprint>) => {
    if (!editingBlog) return;
    setSavingEdit(true);
    try {
      await sprintService.updateSprint(editingBlog.id, updated);
      setEditingBlog(null);
    } catch (err) {
      console.error(err);
      alert('Save blog edit failed.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveIgniteEdit = async (updated: Partial<Sprint>) => {
    if (!editingIgnite) return;
    setSavingEdit(true);
    try {
      await sprintService.updateSprint(editingIgnite.id, updated);
      setEditingIgnite(null);
    } catch (err) {
      console.error(err);
      alert('Save ignite edit failed.');
    } finally {
      setSavingEdit(false);
    }
  };

  if (!user) return null;

  const fallbackUrl = assetService.URLS.DEFAULT_SPRINT_COVER;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {sprintToDelete && (
          <DeleteConfirmationModal 
            sprint={sprintToDelete} 
            onClose={() => setSprintToDelete(null)} 
            onConfirm={handleDelete}
            isDeleting={isDeleting}
          />
      )}

      {editingBlog && (
          <EditBlogModal 
            blog={editingBlog}
            onClose={() => setEditingBlog(null)}
            onSave={handleSaveBlogEdit}
            isSaving={savingEdit}
          />
      )}

      {editingIgnite && (
          <EditIgniteModal 
            ignite={editingIgnite}
            onClose={() => setEditingIgnite(null)}
            onSave={handleSaveIgniteEdit}
            isSaving={savingEdit}
          />
      )}

      {previewingBlog && (
          <BlogPreviewModal 
            title={previewingBlog.title || ''}
            body={previewingBlog.blogBody || previewingBlog.description || ''}
            coverImage={previewingBlog.blogImage || previewingBlog.coverImageUrl || ''}
            coachName={user.name || user.email || 'Coach'}
            onClose={() => setPreviewingBlog(null)}
          />
      )}

      {previewingIgnite && (
          <IgnitePlayer 
            text={previewingIgnite.igniteBody || previewingIgnite.description || ''}
            bgColor={previewingIgnite.igniteBgColor || '#6D28D9'}
            onClose={() => setPreviewingIgnite(null)}
          />
      )}

      <SprintShareModal
        isOpen={!!selectedShareSprint}
        onClose={() => setSelectedShareSprint(null)}
        sprintTitle={selectedShareSprint || ""}
      />

      <div className="flex items-center justify-between gap-3 mb-8 w-full">
        <div className="inline-flex bg-gray-100 p-0.5 rounded-xl">
            <button
                type="button"
                onClick={() => {
                    setActiveTab('sprint');
                    setFilter('all');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeTab === 'sprint' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-650'
                }`}
            >
                <Flame className="w-3 h-3" />
                Sprint
            </button>
            <button
                type="button"
                onClick={() => {
                    setActiveTab('blog');
                    setFilter('all');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeTab === 'blog' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-650'
                }`}
            >
                <BookOpen className="w-3 h-3" />
                RiseBlog
            </button>
            <button
                type="button"
                onClick={() => {
                    setActiveTab('ignite');
                    setFilter('all');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeTab === 'ignite' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-650'
                }`}
            >
                <Sparkles className="w-3 h-3" />
                Ignite
            </button>
        </div>
        {hasPermission('sprint:create') && (
            <Link 
                to={`/coach/sprint/new?tab=${activeTab}`} 
                className="bg-[#0E7850] hover:bg-[#0b5d3e] text-white rounded-xl w-9 h-9 flex items-center justify-center font-black text-sm shadow-md hover:scale-[1.05] active:scale-95 transition-all flex-shrink-0"
                title="Create New"
            >
                +
            </Link>
        )}
      </div>

      {/* filter menu */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {['all', 'published', 'pending', 'rejected', 'draft'].map(f => (
            <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap border cursor-pointer ${
                    filter === f 
                    ? 'bg-primary text-white border-primary shadow-md' 
                    : 'bg-white text-gray-400 border-gray-100 hover:border-primary/20 hover:text-primary'
                }`}
            >
                {f === 'rejected' ? 'Amend Required' : f}
            </button>
        ))}
      </div>

      {isLoading ? (
          <div className="grid grid-cols-1 gap-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-20 h-20 rounded-2xl bg-gray-200 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0 text-center sm:text-left space-y-3">
                          <div className="flex items-center gap-2 justify-center sm:justify-start">
                              <div className="h-5 w-48 bg-gray-200 rounded-lg"></div>
                          </div>
                          <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mt-2">
                              <div className="h-4 w-12 bg-gray-100 rounded-lg"></div>
                              <div className="h-4 w-16 bg-gray-100 rounded-lg"></div>
                              <div className="h-4 w-10 bg-gray-100 rounded-lg"></div>
                          </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                          <div className="h-8 w-16 bg-gray-200 rounded-xl"></div>
                          <div className="h-8 w-16 bg-gray-200 rounded-xl"></div>
                      </div>
                  </div>
              ))}
          </div>
      ) : filteredSprints.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
              {filteredSprints.map(sprint => {
                  const isOrchestrated = orchestratedIds.has(sprint.id);
                  const isApproved = sprint.approvalStatus === 'approved';
                  const showNotLiveBadge = isApproved && !isOrchestrated && (!sprint.contentType || sprint.contentType === 'sprint');

                  return (
                      <div key={sprint.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 group hover:shadow-md transition-all">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-inner bg-gray-100">
                              <img 
                                src={sprint.coverImageUrl || fallbackUrl} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                alt="" 
                                onError={(e) => { e.currentTarget.src = fallbackUrl }}
                              />
                          </div>
                          <div className="flex-1 min-w-0 text-center sm:text-left">
                              <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start flex-wrap">
                                <h3 className="font-black text-gray-900 text-lg group-hover:text-primary transition-colors truncate tracking-tight">{sprint.title}</h3>
                                <span className="hidden" title={`Version ${sprint.versionNumber || 1}`}>
                                    V{sprint.versionNumber || 1}
                                </span>
                                {sprint.versionTag && (
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0" title={`Version Tag: ${sprint.versionTag}`}>
                                        {sprint.versionTag}
                                    </span>
                                )}
                                {showNotLiveBadge && (
                                    <span className="px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-md text-[7px] font-black uppercase tracking-widest shrink-0">
                                        Not Live (Pending Orchestration)
                                    </span>
                                )}
                              </div>
                              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 text-[9px] font-black text-gray-400 mt-2 uppercase tracking-widest">
                                  <span className="px-2 py-1 bg-gray-50 rounded-lg">{sprint.contentType || 'Sprint'}</span>
                                  <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                                  <span className="px-2 py-1 bg-gray-50 rounded-lg">{sprint.category || 'General'}</span>
                                  <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                                  <span className={`px-2 py-1 rounded-lg ${
                                      sprint.approvalStatus === 'approved' ? 'bg-green-50 text-green-600 border border-green-100' : 
                                      sprint.approvalStatus === 'rejected' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                      'bg-blue-50 text-blue-500 border border-blue-100'
                                  }`}>
                                      {sprint.approvalStatus === 'rejected' ? 'Amend Required' : sprint.approvalStatus?.replace('_', ' ') || 'draft'}
                                  </span>
                              </div>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                            {sprint.contentType === 'blog' ? (
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <button 
                                        onClick={() => setEditingBlog(sprint)}
                                        className="px-6 py-3 bg-white border border-gray-100 hover:bg-gray-50 hover:text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex-1 sm:flex-none cursor-pointer"
                                    >
                                        Edit RiseBlog
                                    </button>
                                    <button 
                                        onClick={() => setPreviewingBlog(sprint)}
                                        className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-xl transition-all active:scale-90 cursor-pointer"
                                        title="Preview RiseBlog"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : sprint.contentType === 'ignite' ? (
                                <div className="flex items-center gap-4 w-full sm:w-auto p-1">
                                    {/* Toggle Switch */}
                                    <div className="flex items-center gap-2 border-r border-gray-150 pr-4 mr-1">
                                        <span className={`text-[9px] font-black uppercase tracking-wider ${sprint.published ? 'text-emerald-600' : 'text-gray-405'}`}>
                                            {sprint.published ? 'ON' : 'OFF'}
                                        </span>
                                        <button
                                            onClick={() => handleTogglePublish(sprint)}
                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                sprint.published ? 'bg-emerald-500' : 'bg-gray-200'
                                            }`}
                                            title={sprint.published ? "Turn Off" : "Turn On"}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                    sprint.published ? 'translate-x-4' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => setEditingIgnite(sprint)}
                                        className="px-6 py-3 bg-white border border-gray-100 hover:bg-gray-50 hover:text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex-1 sm:flex-none cursor-pointer"
                                    >
                                        Edit Ignite
                                    </button>
                                    <button 
                                        onClick={() => setPreviewingIgnite(sprint)}
                                        className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-xl transition-all active:scale-90 cursor-pointer"
                                        title="Preview Ignite"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 flex-1 sm:flex-none">
                                    <Link to={`/coach/sprint/edit/${sprint.id}`} className="flex-1 sm:flex-none">
                                        <button className={`w-full sm:w-auto px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer ${
                                            sprint.approvalStatus === 'rejected' 
                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-100 hover:bg-orange-600' 
                                            : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-primary'
                                        }`}>
                                            {sprint.approvalStatus === 'rejected' ? 'Fix Errors' : 'Edit Sprint'}
                                        </button>
                                    </Link>
                                    <button 
                                        onClick={() => setSelectedShareSprint(sprint.title)}
                                        className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-xl transition-all active:scale-90 cursor-pointer"
                                        title="Share Sprint"
                                    >
                                        <Share2 className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                            <button 
                                onClick={() => setSprintToDelete(sprint)}
                                className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90 cursor-pointer"
                                title="Delete Course"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" />
                                </svg>
                            </button>
                          </div>
                      </div>
                  );
              })}
          </div>
      ) : (
          <div className="text-center py-20 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm grayscale opacity-30">🏝️</div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No cycles found in this registry view.</p>
          </div>
      )}
    </div>
  );
};

export default CoachSprints;
