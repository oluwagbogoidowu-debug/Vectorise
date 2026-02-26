
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { Sprint, SprintDifficulty, DailyContent, Coach } from '../../types';
import SprintCard from '../../components/SprintCard';
import LandingPreview from '../../components/LandingPreview';
import { ALL_CATEGORIES } from '../../services/mockData';

const HelpGuidance: React.FC<{ rule: string; isOpen: boolean }> = ({ rule, isOpen }) => {
    if (!isOpen) return null;
    return (
        <div className="mb-4 p-5 bg-primary/5 border border-primary/10 rounded-[1.5rem] animate-slide-up shadow-inner relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-2 relative z-10">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Mandatory Constraint</p>
            </div>
            <p className="text-[11px] text-gray-600 font-medium italic leading-relaxed relative z-10">
                "{rule}"
            </p>
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none group-hover:bg-primary/10 transition-colors"></div>
        </div>
    );
};

const CreateSprint: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [helpOpen, setHelpOpen] = useState<Record<string, boolean>>({});
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

    const toggleHelp = (key: string) => {
        setHelpOpen(prev => ({ ...prev, [key]: !prev[key] }));
    };

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

    const previewSprint: Partial<Sprint> = {
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
        coverImageUrl: formData.coverImageUrl || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80',
        published: false,
        approvalStatus: 'draft',
        dailyContent: [],
        outcomeTag: formData.outcomeTag,
        outcomeStatement: formData.outcomeStatement,
    };

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
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight italic">Design Your Cycle.</h1>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Coach Registry System</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    <div className="lg:col-span-8 bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
                        <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-20">
                            <section>
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">01</div>
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Registry Identity</h4>
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

                            <section>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">02</div>
                                        <label className={labelClasses}>Transformation Statement</label>
                                    </div>
                                    <button type="button" onClick={() => toggleHelp('transformation')} className={`p-2 rounded-xl transition-all ${helpOpen.transformation ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:text-primary'}`} title="View Rules">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </button>
                                </div>
                                <HelpGuidance isOpen={helpOpen.transformation} rule="No benefits list. No how-to. Emotional truth only. Describe the before-and-after state. Mandatory, 3–4 lines max." />
                                <textarea 
                                    name="transformation" 
                                    value={formData.transformation} 
                                    onChange={handleChange} 
                                    rows={4} 
                                    className={inputClasses + " resize-none italic font-medium leading-relaxed p-6 text-lg"} 
                                    placeholder="You know you want to do something meaningful, but you can’t clearly name it yet..." 
                                    required 
                                />
                            </section>

                            {/* 03 Target Signals */}
                            <section>
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">03</div>
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Target Signals (Who it's for)</h4>
                                </div>
                                <div className="space-y-3">
                                    {formData.forWho.map((item, i) => (
                                        <div key={i} className="flex gap-4 items-center">
                                            <span className="text-[10px] font-black text-gray-300 w-4">0{i+1}</span>
                                            <input type="text" value={item} onChange={(e) => handleArrayChange('forWho', i, e.target.value)} className={inputClasses} placeholder="You feel capable but directionless..." />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* 04 Exclusions */}
                            <section>
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">04</div>
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Exclusions (Who it's not for)</h4>
                                </div>
                                <div className="space-y-3">
                                    {formData.notForWho.map((item, i) => (
                                        <div key={i} className="flex gap-4 items-center">
                                            <span className="text-[10px] font-black text-gray-300 w-4">0{i+1}</span>
                                            <input type="text" value={item} onChange={(e) => handleArrayChange('notForWho', i, e.target.value)} className={inputClasses} placeholder="You want results without acting..." />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* 05 Method Snapshot */}
                            <section>
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">05</div>
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Method Snapshot</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {formData.methodSnapshot.map((item, i) => (
                                        <div key={i} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center gap-4 transition-all">
                                            <input type="text" value={item.verb} onChange={(e) => handleMethodChange(i, 'verb', e.target.value)} className={inputClasses + " text-center uppercase tracking-widest text-[10px] py-2"} placeholder="VERB" />
                                            <textarea value={item.description} onChange={(e) => handleMethodChange(i, 'description', e.target.value)} rows={2} className={inputClasses + " text-center text-xs font-medium bg-transparent border-none shadow-none resize-none p-0"} placeholder="One-line explanation of action." />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* 06 Outcomes */}
                            <section>
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">06</div>
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Evidence of Completion</h4>
                                </div>
                                <div className="space-y-3">
                                    {formData.outcomes.map((outcome, i) => (
                                        <div key={i} className="flex gap-4 items-center">
                                            <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px] font-black">✓</div>
                                            <input type="text" value={outcome} onChange={(e) => handleArrayChange('outcomes', i, e.target.value)} className={inputClasses} placeholder="Projected outcome..." />
                                        </div>
                                    ))}
                                </div>
                            </section>

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
                                        <p className="text-[8px] text-gray-400 font-bold mt-1 uppercase tracking-widest italic leading-relaxed">This appears as the badge on completed sprint cards.</p>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>The Outcome (Final Statement)</label>
                                        <input type="text" name="outcomeStatement" value={formData.outcomeStatement} onChange={handleChange} className={inputClasses + " mt-2 italic"} placeholder="Focus creates feedback. *Feedback creates clarity.*" />
                                        <p className="text-[8px] text-gray-400 font-bold mt-1 uppercase tracking-widest italic leading-relaxed">Appears at the bottom of the landing page.</p>
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
                            <h5 className="text-sm font-black text-gray-900 leading-tight mb-4 italic">Clarity over Selling.</h5>
                            
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
