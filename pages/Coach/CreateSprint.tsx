
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { Sprint, SprintDifficulty, DailyContent, Coach, DynamicSection } from '../../types';
import SprintCard from '../../components/SprintCard';
import LandingPreview from '../../components/LandingPreview';
import FormattedText from '../../components/FormattedText';
import DynamicSectionRenderer from '../../components/DynamicSectionRenderer';
import FormattingToolbar from '../../components/FormattingToolbar';
import { ALL_CATEGORIES } from '../../services/mockData';
import { OUTCOME_TAGS } from '../../constants/sprintConstants';
import { List, Plus, Trash2, Type as TypeIcon, Clock } from 'lucide-react';

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
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 md:p-10 bg-black/70 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden relative my-8 animate-slide-up flex flex-col">
        {/* Header toolbar */}
        <div className="bg-white border-b border-gray-100 px-8 py-5 flex justify-between items-center sticky top-0 z-10 shadow-sm">
          <span className="text-sm font-black text-primary uppercase tracking-[0.25em]">Rise Blog</span>
          <button 
            onClick={onClose} 
            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Close Preview
          </button>
        </div>

        {/* Blog Post Layout */}
        <div className="p-6 md:p-12 overflow-y-auto max-h-[80vh] custom-scrollbar">
          {/* Cover Image banner */}
          <div className="w-full h-64 md:h-[350px] rounded-[2rem] overflow-hidden shadow-lg bg-gray-100 mb-10">
            <img 
              src={coverImage || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80'} 
              className="w-full h-full object-cover" 
              alt="Course Post Cover" 
            />
          </div>

          <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight tracking-tight italic">
              {title || 'Untitled Rising Post'}
            </h1>

            {/* Meta details */}
            <div className="flex items-center gap-3 pt-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-6">
              <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-lg">Author</span>
              <span className="text-gray-950 font-black">{coachName}</span>
              <div className="w-1.5 h-1.5 bg-gray-200 rounded-full"></div>
              <span>{currentDate}</span>
            </div>

            {/* Body */}
            <div className="text-gray-700 text-base md:text-lg leading-relaxed whitespace-pre-wrap font-medium">
              {body || 'Write something inspiring to rise...'}
            </div>
          </div>
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
        onClick={onClose} 
        className="absolute top-10 right-6 z-[420] bg-black/40 hover:bg-black/60 p-2.5 rounded-full transition-all text-white/90 font-bold active:scale-90"
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


const CreateSprint: React.FC = () => {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    const [sprintId] = useState(() => `sprint_${Date.now()}`);

    if (loading) {
        return null;
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-red-400 font-bold uppercase tracking-widest text-sm">Access Denied: Please log in.</p>
            </div>
        );
    }

    const [previewType, setPreviewType] = useState<'card' | 'landing'>('card');

    const [activeTab, setActiveTab] = useState<'sprint' | 'blog' | 'ignite'>('sprint');

    // RiseBlog State
    const [blogTitle, setBlogTitle] = useState('');
    const [blogImage, setBlogImage] = useState('');
    const [blogBody, setBlogBody] = useState('');
    const [isPreviewingBlog, setIsPreviewingBlog] = useState(false);
    const [isSubmittingBlog, setIsSubmittingBlog] = useState(false);

    // Ignite State
    const [igniteBody, setIgniteBody] = useState('');
    const [igniteBgColor, setIgniteBgColor] = useState('#6D28D9');
    const [isPreviewingIgnite, setIsPreviewingIgnite] = useState(false);
    const [isSubmittingIgnite, setIsSubmittingIgnite] = useState(false);

    const handleSaveBlog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!blogTitle.trim()) {
            alert('Please enter a blog title');
            return;
        }
        setIsSubmittingBlog(true);
        const newBlog: Sprint = {
            id: `blog_${Date.now()}`,
            coachId: user.id,
            title: blogTitle,
            subtitle: 'Learning that keeps you rising.',
            description: blogBody || '',
            contentType: 'blog',
            blogBody: blogBody,
            blogImage: blogImage || `https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80`,
            coverImageUrl: blogImage || `https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80`,
            duration: 1,
            price: 0,
            currency: 'NGN',
            category: 'Blog',
            difficulty: 'Beginner',
            published: true,
            approvalStatus: 'approved',
            dailyContent: [],
        };

        try {
            await sprintService.createSprint(newBlog);
            navigate(`/coach/sprints`);
        } catch (error) {
            console.error(error);
            alert("Save blog failed.");
        } finally {
            setIsSubmittingBlog(false);
        }
    };

    const handleSaveIgnite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!igniteBody.trim()) {
            alert('Please enter some text to inspire someone!');
            return;
        }
        setIsSubmittingIgnite(true);
        const cleanSnippet = igniteBody.substring(0, 30) + (igniteBody.length > 30 ? '...' : '');
        const newIgnite: Sprint = {
            id: `ignite_${Date.now()}`,
            coachId: user.id,
            title: cleanSnippet,
            subtitle: 'Inspire someone today',
            description: igniteBody,
            contentType: 'ignite',
            igniteBody: igniteBody,
            igniteBgColor: igniteBgColor,
            coverImageUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80',
            duration: 1,
            price: 0,
            currency: 'NGN',
            category: 'Ignite',
            difficulty: 'Beginner',
            published: true,
            approvalStatus: 'approved',
            dailyContent: [],
        };

        try {
            await sprintService.createSprint(newIgnite);
            navigate(`/coach/sprints`);
        } catch (error) {
            console.error(error);
            alert("Save ignite failed.");
        } finally {
            setIsSubmittingIgnite(false);
        }
    };

    const [isAudienceDropdownOpen, setIsAudienceDropdownOpen] = useState(false);

    const [formData, setFormData] = useState<{
        title: string;
        subtitle: string;
        coverImageUrl: string;
        dynamicSections: DynamicSection[];
        category: string;
        difficulty: SprintDifficulty;
        audience: string[];
        overrideOrchestrator: boolean;
        duration: number;
        price: string;
        outcomeTag: string;
        sprintType: 'Fundamentals' | 'Core' | 'Expert';
        pricingType: 'cash' | 'credits';
        pointCost: number;
    }>({
        title: '',
        subtitle: '',
        coverImageUrl: '',
        dynamicSections: [
            { id: 'overview', title: 'Sprint Overview', body: '', type: 'text' }
        ],
        category: ALL_CATEGORIES[0],
        difficulty: 'Beginner' as SprintDifficulty,
        audience: [],
        overrideOrchestrator: false,
        duration: 7,
        price: '0',
        outcomeTag: OUTCOME_TAGS[0],
        sprintType: 'Fundamentals' as 'Fundamentals' | 'Core' | 'Expert',
        pricingType: 'cash',
        pointCost: 0,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);



    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDynamicSectionChange = (index: number, field: 'title' | 'body', value: any) => {
        const newSections = [...(formData.dynamicSections || [])];
        newSections[index] = { ...newSections[index], [field]: value };
        setFormData({ ...formData, dynamicSections: newSections });
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSubmitting(true);
        const duration = Number(formData.duration);

        const dailyContent: DailyContent[] = Array.from({ length: duration }, (_, i) => ({
            day: i + 1,
            lessonText: '',
            taskPrompt: '',
            taskPrompts: ['', '', ''],
        }));

        // Added missing 'currency' property
        let newSprint: Sprint = {
            id: sprintId,
            coachId: user.id,
            title: formData.title,
            subtitle: formData.subtitle,
            coverImageUrl: formData.coverImageUrl || `https://picsum.photos/seed/${sprintId}/800/400`,
            published: false,
            approvalStatus: 'draft',
            dailyContent: dailyContent,
            category: formData.category,
            difficulty: formData.difficulty,
            audience: formData.audience,
            overrideOrchestrator: formData.overrideOrchestrator,
            duration: duration,
            price: Number(formData.price) || 0,
            description: formData.subtitle || formData.title,
            currency: 'NGN',
            pointCost: formData.pointCost || 0,
            pricingType: formData.pricingType,
            outcomeTag: formData.outcomeTag || OUTCOME_TAGS[0],
            sprintType: formData.sprintType,
            dynamicSections: formData.dynamicSections,
        };

        formData.dynamicSections?.forEach(section => {
            if (section.id === 'overview') {
                newSprint.description = section.body;
                newSprint.transformation = section.body;
            }
        });

        try {
            await sprintService.createSprint(newSprint);
            navigate(`/coach/sprint/edit/${sprintId}`);
        } catch (error) {
            console.error(error);
            alert("Save failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const previewSprint: Partial<Sprint> = useMemo(() => {
        const sprint: Partial<Sprint> = {
            id: 'preview',
            coachId: user?.id || '',
            title: formData.title || 'Untitled Sprint',
            subtitle: formData.subtitle,
            coverImageUrl: formData.coverImageUrl || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80',
            dynamicSections: formData.dynamicSections,
            category: formData.category,
            difficulty: formData.difficulty,
            audience: formData.audience,
            overrideOrchestrator: formData.overrideOrchestrator,
            duration: Number(formData.duration),
            price: 0,
            published: false,
            approvalStatus: 'draft',
            dailyContent: [],
            outcomeTag: formData.outcomeTag,
        };

        formData.dynamicSections?.forEach(section => {
            if (section.id === 'overview') {
                sprint.description = section.body;
                sprint.transformation = section.body;
            }
        });

        return sprint;
    }, [formData, user]);

    const inputClasses = "w-full px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold transition-all placeholder-gray-300";
    const labelClasses = "text-[11px] font-black text-gray-400 uppercase tracking-widest";

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pb-32">
            {isPreviewingBlog && (
                <BlogPreviewModal 
                    title={blogTitle}
                    body={blogBody}
                    coverImage={blogImage}
                    coachName={(user as Coach)?.displayName || 'Coach'}
                    onClose={() => setIsPreviewingBlog(false)}
                />
            )}

            {isPreviewingIgnite && (
                <IgnitePlayer 
                    text={igniteBody}
                    bgColor={igniteBgColor}
                    onClose={() => setIsPreviewingIgnite(false)}
                />
            )}

            <div className="max-w-7xl mx-auto">
                <header className="flex items-center gap-3 mb-10">
                    <button onClick={() => navigate('/coach/dashboard')} className="p-2 text-gray-400 hover:text-primary hover:bg-white rounded-xl transition-all cursor-pointer shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Design Your Cycle.</h1>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Coach Registry System</p>
                    </div>
                </header>

                {/* Tabbed Interface Switcher */}
                <div className="flex justify-start mb-8">
                    <div className="inline-flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setActiveTab('sprint')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                                activeTab === 'sprint'
                                    ? 'bg-primary text-white shadow-md'
                                    : 'text-gray-400 hover:text-primary hover:bg-gray-50'
                            }`}
                        >
                            Sprint
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('blog')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                                activeTab === 'blog'
                                    ? 'bg-primary text-white shadow-md'
                                    : 'text-gray-400 hover:text-primary hover:bg-gray-50'
                            }`}
                        >
                            RiseBlog
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('ignite')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                                activeTab === 'ignite'
                                    ? 'bg-primary text-white shadow-md'
                                    : 'text-gray-400 hover:text-primary hover:bg-gray-50'
                            }`}
                        >
                            Ignite
                        </button>
                    </div>
                </div>

                {activeTab === 'sprint' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                        <div className="lg:col-span-8 bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
                            <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-20">
                                <section>
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">01</div>
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Sprint Identity</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className={labelClasses}>Sprint Title</label>
                                            <input type="text" name="title" value={formData.title} onChange={handleChange} className={inputClasses} placeholder="e.g. 7-Day High Velocity Content" required />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className={labelClasses}>Sprint Subtitle</label>
                                            <input type="text" name="subtitle" value={formData.subtitle} onChange={handleChange} className={inputClasses} placeholder="e.g. For emerging creators" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className={labelClasses}>Cover Image URL</label>
                                            <input type="url" name="coverImageUrl" value={formData.coverImageUrl} onChange={handleChange} className={inputClasses} placeholder="https://..." />
                                        </div>
                                    </div>
                                </section>

                                {/* Sprint Overview Section */}
                                {Array.isArray(formData.dynamicSections) && formData.dynamicSections.filter(s => s.id === 'overview').map((section, index) => (
                                    <section key={section.id} className="space-y-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-4">
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Sprint Overview</h4>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <FormattingToolbar 
                                                onFormat={(prefix, suffix) => {
                                                    const textarea = document.getElementById(`section-body-${section.id}`) as HTMLTextAreaElement;
                                                    if (!textarea) return;
                                                    const start = textarea.selectionStart;
                                                    const end = textarea.selectionEnd;
                                                    const text = textarea.value;
                                                    const before = text.substring(0, start);
                                                    const selection = text.substring(start, end);
                                                    const after = text.substring(end);
                                                    const newValue = before + prefix + selection + suffix + after;
                                                    handleDynamicSectionChange(formData.dynamicSections.findIndex(s => s.id === 'overview'), 'body', newValue);
                                                    setTimeout(() => {
                                                        textarea.focus();
                                                        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
                                                    }, 0);
                                                }}
                                            />
                                            <textarea 
                                                id={`section-body-${section.id}`}
                                                value={section.body} 
                                                onChange={e => handleDynamicSectionChange(formData.dynamicSections.findIndex(s => s.id === 'overview'), 'body', e.target.value)}
                                                rows={12} 
                                                className={inputClasses + " resize-none mt-2"} 
                                                placeholder="Enter sprint overview content..."
                                            />
                                        </div>
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                            <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Preview:</h5>
                                            <div className="bg-white rounded-xl p-4 border border-gray-100">
                                                <DynamicSectionRenderer section={section} />
                                            </div>
                                        </div>
                                    </section>
                                ))}

                                {/* 07 Metadata */}
                                <section>
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">07</div>
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Metadata</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <label className={labelClasses}>Duration (Days)</label>
                                            <select name="duration" value={formData.duration} onChange={handleChange} className={inputClasses + " mt-2"}>
                                                {[3, 5, 7, 10, 14, 21, 30].map(d => <option key={d} value={d}>{d} Continuous Days</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Discovery Category</label>
                                            <select name="category" value={formData.category} onChange={handleChange} className={inputClasses + " mt-2"}>
                                                {ALL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                        </div>
                                        <div className="relative">
                                            <label className={labelClasses}>Audience</label>
                                            <div 
                                                onClick={() => setIsAudienceDropdownOpen(!isAudienceDropdownOpen)}
                                                className={`${inputClasses} mt-2 cursor-pointer flex justify-between items-center bg-white border border-gray-100 px-4 py-2.5 rounded-xl`}
                                            >
                                                <span className="text-gray-700 font-bold text-xs select-none">
                                                    {formData.audience && formData.audience.length > 0 
                                                        ? formData.audience.join(", ") 
                                                        : "Select target audience..."}
                                                </span>
                                                <span className="text-[10px] text-gray-400">▼</span>
                                            </div>
                                            {isAudienceDropdownOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-30" onClick={() => setIsAudienceDropdownOpen(false)}></div>
                                                    <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl z-40 p-1 flex flex-col gap-0.5" onClick={e => e.stopPropagation()}>
                                                        {["Entrepreneur", "Business Owner", "Freelancer/Consultant", "9-5 Professional", "Student/Graduate", "Creative/Hustler"].map(opt => {
                                                            const isSelected = formData.audience?.includes(opt);
                                                            return (
                                                                <div 
                                                                    key={opt}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const currentAudience = formData.audience || [];
                                                                        const updated = isSelected 
                                                                            ? currentAudience.filter(x => x !== opt)
                                                                            : [...currentAudience, opt];
                                                                        setFormData(prev => ({ ...prev, audience: updated }));
                                                                    }}
                                                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs font-bold transition-all ${
                                                                        isSelected 
                                                                            ? 'bg-primary/5 text-primary' 
                                                                            : 'text-gray-600 hover:bg-gray-50'
                                                                    }`}
                                                                >
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={isSelected}
                                                                        onChange={() => {}}
                                                                        className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                                                                    />
                                                                    <span>{opt}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Sprint Type</label>
                                            <select name="sprintType" value={formData.sprintType} onChange={handleChange} className={inputClasses + " mt-2"}>
                                                <option value="Fundamentals">Fundamentals</option>
                                                <option value="Core">Core</option>
                                                <option value="Expert">Expert</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2 flex items-center gap-3 bg-[#F4F9F6] border border-emerald-500/10 rounded-2xl p-4 mt-2">
                                            <input
                                                type="checkbox"
                                                id="overrideOrchestrator"
                                                name="overrideOrchestrator"
                                                checked={formData.overrideOrchestrator}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setFormData(prev => ({ ...prev, overrideOrchestrator: checked }));
                                                }}
                                                className="rounded border-emerald-500/30 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                            />
                                            <div>
                                                <label htmlFor="overrideOrchestrator" className="block text-xs font-black text-gray-900 uppercase tracking-wider cursor-pointer">
                                                    Override Orchestrator to appear in the Explore page
                                                </label>
                                                <p className="text-[10px] text-emerald-700/70 font-medium">
                                                    Force this sprint to bypass orchestrator assignment and appear in the Explore page.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Pricing & Economy */}
                                <section>
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">08</div>
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Pricing & Economy</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <label className={labelClasses}>Pricing Type</label>
                                            <select name="pricingType" value={formData.pricingType} onChange={handleChange} className={inputClasses + " mt-2"}>
                                                <option value="cash">Cash (NGN/USD)</option>
                                                <option value="credits">Credits (Points)</option>
                                            </select>
                                        </div>
                                        {formData.pricingType === 'credits' ? (
                                            <div>
                                                <label className={labelClasses}>Point Cost</label>
                                                <input type="number" name="pointCost" value={formData.pointCost || 0} onChange={handleChange} className={inputClasses + " mt-2"} placeholder="0" />
                                            </div>
                                        ) : (
                                            <div>
                                                <label className={labelClasses}>Proposed Price (NGN)</label>
                                                <input type="number" name="price" value={formData.price} onChange={handleChange} className={inputClasses + " mt-2"} placeholder="0" />
                                                <p className="text-[8px] text-gray-400 font-bold mt-1 uppercase tracking-widest leading-relaxed">Admins will review and set the final price.</p>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* 09 Completion Assets */}
                                <section>
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">09</div>
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Completion Assets</h4>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <label className={labelClasses}>Archive Outcome Tag</label>
                                            <select 
                                                name="outcomeTag" 
                                                value={formData.outcomeTag} 
                                                onChange={handleChange} 
                                                className={inputClasses + " mt-2"}
                                            >
                                                {OUTCOME_TAGS.map((tag: string) => (
                                                    <option key={tag} value={tag}>{tag}</option>
                                                ))}
                                            </select>
                                            <p className="text-[8px] text-gray-400 font-bold mt-1 uppercase tracking-widest leading-relaxed">This appears as the badge on completed sprint cards.</p>
                                        </div>
                                    </div>
                                </section>

                                <div className="flex justify-end gap-4 pt-10 border-t border-gray-50">
                                    <button type="button" onClick={() => navigate('/coach/dashboard')} className="px-8 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-400 transition-colors">Cancel</button>
                                    <Button type="submit" isLoading={isSubmitting} className="px-12 py-4 rounded-[1.5rem] shadow-xl shadow-primary/20 group">
                                        Next: Build Curriculum &rarr;
                                    </Button>
                                </div>
                            </form>
                        </div>

                        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-12">
                             <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
                                <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em] mb-4">Registry Guidance</p>
                                <h5 className="text-sm font-black text-gray-900 leading-tight mb-4">Clarity over Selling.</h5>
                                
                                <div className="bg-gray-100 p-1 rounded-xl flex gap-1 mb-8">
                                    <button 
                                        onClick={() => setPreviewType('card')}
                                        className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${previewType === 'card' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Deck View
                                    </button>
                                    <button 
                                        onClick={() => setPreviewType('landing')}
                                        className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${previewType === 'landing' ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}
                                    >
                                        Landing View
                                    </button>
                                </div>

                                {previewType === 'card' ? (
                                    <div className="animate-fade-in flex flex-col items-center text-left">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-4 text-center w-full">Registry Card Preview</h4>
                                        <div className="w-full max-w-[320px] text-left">
                                            <SprintCard 
                                                sprint={previewSprint as Sprint} 
                                                coach={user as Coach} 
                                                forceShowOutcomeTag={true} 
                                                isStatic={true}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-fade-in text-left">
                                        <LandingPreview sprint={previewSprint} coach={user as Coach} />
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'blog' && (
                    <div className="grid grid-cols-1 gap-10 max-w-4xl mx-auto">
                        <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden p-8 md:p-12 animate-slide-up">
                            <form onSubmit={handleSaveBlog} className="space-y-8">
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tight italic">Rise Blog</h2>
                                    <p className="text-[10px] text-primary font-black mt-1 uppercase tracking-[0.25em]">RiseBlog... Learning that keeps you rising.</p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className={labelClasses}>Blog Post Title</label>
                                        <input 
                                            type="text" 
                                            value={blogTitle} 
                                            onChange={e => setBlogTitle(e.target.value)} 
                                            className={inputClasses + " mt-2"} 
                                            placeholder="e.g. 10 Mental Models for Decisive Leaders" 
                                            required 
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClasses}>Cover Image URL</label>
                                        <input 
                                            type="url" 
                                            value={blogImage} 
                                            onChange={e => setBlogImage(e.target.value)} 
                                            className={inputClasses + " mt-2"} 
                                            placeholder="https://images.unsplash.com/photo-..." 
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClasses}>Blog Post Body</label>
                                        <textarea 
                                            value={blogBody} 
                                            onChange={e => setBlogBody(e.target.value)} 
                                            rows={14} 
                                            className={inputClasses + " mt-2 font-medium font-sans resize-none leading-relaxed text-sm h-96"} 
                                            placeholder="Write the full blog post content here... Spacing and paragraph structure are preserved."
                                            required 
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-gray-50">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsPreviewingBlog(true)}
                                        className="px-8 py-3.5 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-[10px] font-black text-gray-700 uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                                    >
                                        🔍 Preview Blog Post
                                    </button>
                                    <Button type="submit" isLoading={isSubmittingBlog} className="px-10 py-3.5 rounded-[1.25rem] shadow-xl shadow-primary/20">
                                        Publish RiseBlog &rarr;
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'ignite' && (
                    <div className="grid grid-cols-1 gap-10 max-w-4xl mx-auto">
                        <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden p-8 md:p-12 animate-slide-up">
                            <form onSubmit={handleSaveIgnite} className="space-y-8">
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tight italic">Ignite</h2>
                                    <p className="text-[10px] text-primary font-black mt-1 uppercase tracking-[0.25em]">share something to inspire someone today</p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className={labelClasses}>Inspiration Content</label>
                                        <textarea 
                                            value={igniteBody} 
                                            onChange={e => setIgniteBody(e.target.value)} 
                                            rows={10} 
                                            className={inputClasses + " mt-2 font-medium resize-none text-center text-lg leading-relaxed h-[250px] italic pt-16"} 
                                            placeholder="Type your inspiring thought here... Rendered line-by-line or paragraph-by-paragraph"
                                            required 
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClasses}>Set Color Theme</label>
                                        <div className="flex flex-wrap gap-3 mt-3">
                                            {IGNITE_COLORS.map(color => (
                                                <button
                                                    key={color.hex}
                                                    type="button"
                                                    onClick={() => setIgniteBgColor(color.hex)}
                                                    className={`w-12 h-12 rounded-full border-2 transition-all relative flex items-center justify-center hover:scale-105 active:scale-95`}
                                                    style={{ 
                                                        backgroundColor: color.hex,
                                                        borderColor: igniteBgColor === color.hex ? '#3B82F6' : 'transparent' 
                                                    }}
                                                    title={color.name}
                                                >
                                                    {igniteBgColor === color.hex && (
                                                        <span className="text-white text-xs font-black">✓</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-gray-50">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsPreviewingIgnite(true)}
                                        className="px-8 py-3.5 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-[10px] font-black text-gray-700 uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                                    >
                                        🔥 Full Bleed Preview
                                    </button>
                                    <Button type="submit" isLoading={isSubmittingIgnite} className="px-10 py-3.5 rounded-[1.25rem] shadow-xl shadow-primary/20">
                                        Publish Ignite &rarr;
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};

export default CreateSprint;
