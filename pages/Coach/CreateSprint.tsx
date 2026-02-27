
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { Sprint, SprintDifficulty, DailyContent, Coach, DynamicSection } from '../../types';
import SprintCard from '../../components/SprintCard';
import LandingPreview from '../../components/LandingPreview';
import FormattedText from '../../components/FormattedText';
import { ALL_CATEGORIES } from '../../services/mockData';



const CreateSprint: React.FC = () => {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Loading Registry...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-red-400 font-bold uppercase tracking-widest text-sm">Access Denied: Please log in.</p>
            </div>
        );
    }

    const [previewType, setPreviewType] = useState<'card' | 'landing'>('card');

    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        coverImageUrl: '',
        dynamicSections: [
            { id: 'transformation', title: 'Transformation Statement', body: '' },
            { id: 'forWho', title: 'Target Signals (Who it\'s for)', body: '' },
            { id: 'notForWho', title: 'Exclusions (Who it\'s not for)', body: '' },
            { id: 'methodSnapshot', title: 'Method Snapshot', body: '' },
            { id: 'outcomes', title: 'Evidence of Completion', body: '' },
            { id: 'metadata', title: 'Metadata', body: '' },
            { id: 'completionAssets', title: 'Completion Assets', body: '' }
        ],
        category: ALL_CATEGORIES[0],
        difficulty: 'Beginner' as SprintDifficulty,
        duration: 7,
        price: '0',
        outcomeTag: '',
        outcomeStatement: 'Focus creates feedback. *Feedback creates clarity.*',
        sprintType: 'Execution' as 'Foundational' | 'Execution' | 'Skill',
        protocol: 'One action per day' as 'One action per day' | 'Guided task' | 'Challenge-based',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);



    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDynamicSectionChange = (index: number, field: 'title' | 'body', value: string) => {
        const newSections = [...(formData.dynamicSections || [])];
        newSections[index] = { ...newSections[index], [field]: value };
        setFormData({ ...formData, dynamicSections: newSections });
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSubmitting(true);
        const sprintId = `sprint_${Date.now()}`;
        const duration = Number(formData.duration);

        const dailyContent: DailyContent[] = Array.from({ length: duration }, (_, i) => ({
            day: i + 1,
            lessonText: '',
            taskPrompt: '',
            coachInsight: '',
            reflectionQuestion: 'One idea that shifted my thinking was...',
            submissionType: 'text',
            proofType: 'confirmation',
            proofOptions: []
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
            duration: duration,
            price: 0,
            description: formData.subtitle || formData.title,
            currency: 'NGN',
            pointCost: 0,
            pricingType: 'cash',
            outcomeTag: formData.outcomeTag || 'Clarity gained',
            outcomeStatement: formData.outcomeStatement,
            sprintType: formData.sprintType,
            protocol: formData.protocol,
            dynamicSections: formData.dynamicSections,
        };

        formData.dynamicSections?.forEach(section => {
            switch (section.id) {
                case 'transformation':
                    newSprint.transformation = section.body;
                    newSprint.description = section.body;
                    break;
                case 'forWho':
                    newSprint.forWho = section.body.split('\n').map(s => s.trim()).filter(s => s);
                    break;
                case 'notForWho':
                    newSprint.notForWho = section.body.split('\n').map(s => s.trim()).filter(s => s);
                    break;
                case 'methodSnapshot':
                    newSprint.methodSnapshot = section.body.split('\n').map(line => {
                        const [verb, description] = line.split(':').map(s => s.trim());
                        return { verb: verb || '', description: description || '' };
                    }).filter(m => m.verb || m.description);
                    break;
                case 'outcomes':
                    newSprint.outcomes = section.body.split('\n').map(s => s.trim()).filter(s => s);
                    break;
                case 'metadata':
                    break;
                case 'completionAssets':
                    break;
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
            duration: Number(formData.duration),
            price: 0,
            published: false,
            approvalStatus: 'draft',
            dailyContent: [],
            outcomeTag: formData.outcomeTag,
            outcomeStatement: formData.outcomeStatement,
        };

        formData.dynamicSections?.forEach(section => {
            switch (section.id) {
                case 'transformation':
                    sprint.transformation = section.body;
                    sprint.description = section.body;
                    break;
                case 'forWho':
                    sprint.forWho = section.body.split('\n').map(s => s.trim()).filter(s => s);
                    break;
                case 'notForWho':
                    sprint.notForWho = section.body.split('\n').map(s => s.trim()).filter(s => s);
                    break;
                case 'methodSnapshot':
                    sprint.methodSnapshot = section.body.split('\n').map(line => {
                        const [verb, description] = line.split(':').map(s => s.trim());
                        return { verb: verb || '', description: description || '' };
                    }).filter(m => m.verb || m.description);
                    break;
                case 'outcomes':
                    sprint.outcomes = section.body.split('\n').map(s => s.trim()).filter(s => s);
                    break;
            }
        });

        return sprint;
    }, [formData, user]);

    const inputClasses = "w-full px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold transition-all placeholder-gray-300";
    const labelClasses = "text-[11px] font-black text-gray-400 uppercase tracking-widest";

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pb-32">
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

                            {/* Dynamic Sections */}
                            {formData.dynamicSections?.map((section, index) => (
                                <section key={section.id} className="space-y-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-4">
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{section.title}</h4>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const newSections = formData.dynamicSections?.filter(s => s.id !== section.id);
                                                setFormData({ ...formData, dynamicSections: newSections });
                                            }}
                                            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full"
                                            title="Remove section"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    <label className={labelClasses}>Section Title</label>
                                    <input 
                                        type="text" 
                                        value={section.title} 
                                        onChange={e => handleDynamicSectionChange(index, 'title', e.target.value)}
                                        className={inputClasses + " mt-2"} 
                                    />
                                    <label className={labelClasses + " mt-4 block"}>Section Body</label>
                                    <textarea 
                                        value={section.body} 
                                        onChange={e => handleDynamicSectionChange(index, 'body', e.target.value)}
                                        rows={6} 
                                        className={inputClasses + " resize-none mt-2"} 
                                    />
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                        <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Preview:</h5>
                                        <div className="prose prose-sm max-w-none text-gray-800 font-medium leading-relaxed">
                                            <FormattedText text={section.body} />
                                        </div>
                                    </div>
                                </section>
                            ))}

                            <Button 
                                type="button"
                                onClick={() => {
                                    const newSection: DynamicSection = {
                                        id: `custom-${Date.now()}`,
                                        title: 'New Custom Section',
                                        body: 'Content for your new section.'
                                    };
                                    setFormData({ ...formData, dynamicSections: [...(formData.dynamicSections || []), newSection] });
                                }}
                                className="w-full py-4 text-primary border-primary/20 hover:bg-primary/5 border rounded-[1.5rem]"
                            >
                                + Add New Section
                            </Button>

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
                                    <div>
                                        <label className={labelClasses}>Difficulty</label>
                                        <select name="difficulty" value={formData.difficulty} onChange={handleChange} className={inputClasses + " mt-2"}>
                                            <option value="Beginner">Beginner</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Advanced">Advanced</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Protocol</label>
                                        <select name="protocol" value={formData.protocol} onChange={handleChange} className={inputClasses + " mt-2"}>
                                            <option value="One action per day">One action per day</option>
                                            <option value="Guided task">Guided task</option>
                                            <option value="Challenge-based">Challenge-based</option>
                                        </select>
                                    </div>
                                </div>
                            </section>

                            {/* 08 Completion Assets */}
                            <section>
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">08</div>
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Completion Assets</h4>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className={labelClasses}>Archive Outcome Tag</label>
                                        <input type="text" name="outcomeTag" value={formData.outcomeTag} onChange={handleChange} className={inputClasses + " mt-2"} placeholder="e.g. Clarity gained" />
                                        <p className="text-[8px] text-gray-400 font-bold mt-1 uppercase tracking-widest leading-relaxed">This appears as the badge on completed sprint cards.</p>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>The Outcome (Final Statement)</label>
                                        <input type="text" name="outcomeStatement" value={formData.outcomeStatement} onChange={handleChange} className={inputClasses + " mt-2"} placeholder="Focus creates feedback. *Feedback creates clarity.*" />
                                        <p className="text-[8px] text-gray-400 font-bold mt-1 uppercase tracking-widest leading-relaxed">Appears at the bottom of the landing page.</p>
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
                                <div className="animate-fade-in flex flex-col items-center">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-4">Registry Card Preview</h4>
                                    <div className="w-full max-w-[320px]">
                                        <SprintCard 
                                            sprint={previewSprint as Sprint} 
                                            coach={user as Coach} 
                                            forceShowOutcomeTag={true} 
                                            isStatic={true}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="animate-fade-in">
                                    <LandingPreview sprint={previewSprint} coach={user as Coach} />
                                </div>
                            )}
                         </div>
                    </div>
                </div>
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
