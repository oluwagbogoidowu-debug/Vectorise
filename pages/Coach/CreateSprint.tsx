import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { Sprint, SprintDifficulty, DailyContent, Coach } from '../../types';
import SprintCard from '../../components/SprintCard';

const CATEGORIES = [
    "Accountability", "Boundaries", "Burnout Recovery", "Business", "Career", "Change", "Clarity", 
    "Communication", "Confidence", "Conflict Resolution", "Connection", "Consciousness", 
    "Consistency", "Content Creation", "Creativity", "Discipline", "Emotional Intelligence", 
    "Emotional Resilience", "Energy Management", "Entrepreneurship", "Executive Development", 
    "Expression", "Faith-Based", "Financial Empowerment", "Focus", "Founder", "Growth", "Habits", 
    "Health", "High Performance", "Identity", "Inner Peace", "Inner Work", "Interpersonal Skills", 
    "Leadership", "Life", "Life Transitions", "Lifestyle", "Limiting Beliefs", "Meaning", 
    "Mental Fitness", "Mindset", "Money Mindset", "Performance", "Personal Branding", 
    "Personal Development", "Professional Development", "Productivity", "Purpose", 
    "Purpose Alignment", "Relationships", "Reset", "Reinvention", "Self-Belief", 
    "Self-Discovery", "Self-Trust", "Solopreneur", "Spirituality", "Startup", 
    "Stress Management", "Thought Leadership", "Time Management", "Transformation", "Transition", 
    "Visibility", "Vision", "Wealth Mindset", "Wellness", "Work-Life Balance"
].sort();

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

    const [formData, setFormData] = useState({
        title: '',
        category: CATEGORIES[0],
        difficulty: 'Beginner' as SprintDifficulty,
        duration: 7,
        price: '0',
        coverImageUrl: '',
        transformation: '',
        forWho: ['', '', '', ''],
        notForWho: ['', '', ''],
        methodSnapshot: [
            { verb: '', description: '' },
            { verb: '', description: '' },
            { verb: '', description: '' }
        ],
        outcomes: ['', '', ''],
        sprintType: 'Execution' as 'Foundational' | 'Execution' | 'Skill',
        protocol: 'One action per day' as 'One action per day' | 'Guided task' | 'Challenge-based'
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleHelp = (key: string) => {
        setHelpOpen(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleArrayChange = (field: 'forWho' | 'notForWho' | 'outcomes', index: number, value: string) => {
        const newArr = [...formData[field]];
        newArr[index] = value;
        setFormData({ ...formData, [field]: newArr });
    };

    const handleMethodChange = (index: number, key: 'verb' | 'description', value: string) => {
        const newMethod = [...formData.methodSnapshot];
        newMethod[index] = { ...newMethod[index], [key]: value };
        setFormData({ ...formData, methodSnapshot: newMethod });
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
            submissionType: 'text',
            proofType: 'confirmation',
            proofOptions: []
        }));

        const newSprint: Sprint = {
            id: sprintId,
            coachId: user.id,
            title: formData.title,
            description: formData.transformation,
            category: formData.category,
            difficulty: formData.difficulty,
            duration: duration,
            price: 0,
            pointCost: 0,
            pricingType: 'cash',
            coverImageUrl: formData.coverImageUrl || `https://picsum.photos/seed/${sprintId}/800/400`,
            published: false,
            approvalStatus: 'draft',
            dailyContent: dailyContent,
            transformation: formData.transformation,
            forWho: formData.forWho.filter(s => s.trim()),
            notForWho: formData.notForWho.filter(s => s.trim()),
            methodSnapshot: formData.methodSnapshot,
            outcomes: formData.outcomes.filter(s => s.trim()),
            sprintType: formData.sprintType,
            protocol: formData.protocol
        };

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

    const previewSprint: Sprint = {
        id: 'preview',
        coachId: user?.id || '',
        title: formData.title || 'Untitled Sprint',
        description: formData.transformation || 'A transformation focused journey...',
        category: formData.category,
        difficulty: formData.difficulty,
        duration: Number(formData.duration),
        price: 0,
        coverImageUrl: formData.coverImageUrl || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80',
        published: false,
        approvalStatus: 'draft',
        dailyContent: [],
        outcomes: formData.outcomes.filter(o => o.trim() !== '')
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
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Registry Identity</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className={labelClasses}>Sprint Title</label>
                                        <input type="text" name="title" value={formData.title} onChange={handleChange} className={inputClasses + " mt-2"} placeholder="e.g. 7-Day High Velocity Content" required />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={labelClasses}>Cover Image URL</label>
                                        <input type="url" name="coverImageUrl" value={formData.coverImageUrl} onChange={handleChange} className={inputClasses + " mt-2"} placeholder="https://..." />
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

                            <section>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">03</div>
                                        <label className={labelClasses}>Target Signals (Who it's for)</label>
                                    </div>
                                    <button type="button" onClick={() => toggleHelp('forWho')} className={`p-2 rounded-xl transition-all ${helpOpen.forWho ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:text-primary'}`} title="View Rules">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </button>
                                </div>
                                <HelpGuidance isOpen={helpOpen.forWho} rule="Must be emotional or behavioral. Each bullet starts with 'You...' Max 4." />
                                <div className="space-y-3">
                                    {formData.forWho.map((item, i) => (
                                        <div key={i} className="flex gap-4 items-center">
                                            <span className="text-[10px] font-black text-gray-300 w-4">0{i+1}</span>
                                            <input 
                                                type="text" 
                                                value={item} 
                                                onChange={(e) => handleArrayChange('forWho', i, e.target.value)} 
                                                className={inputClasses} 
                                                placeholder="You feel capable but directionless..." 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">04</div>
                                        <label className={labelClasses}>Exclusions (Who it's not for)</label>
                                    </div>
                                    <button type="button" onClick={() => toggleHelp('notForWho')} className={`p-2 rounded-xl transition-all ${helpOpen.notForWho ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:text-primary'}`} title="View Rules">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </button>
                                </div>
                                <HelpGuidance isOpen={helpOpen.notForWho} rule="Who will be frustrated by this sprint? Minimum 2, maximum 4." />
                                <div className="space-y-3">
                                    {formData.notForWho.map((item, i) => (
                                        <div key={i} className="flex gap-4 items-center">
                                            <span className="text-[10px] font-black text-gray-300 w-4">0{i+1}</span>
                                            <input 
                                                type="text" 
                                                value={item} 
                                                onChange={(e) => handleArrayChange('notForWho', i, e.target.value)} 
                                                className={inputClasses + " border-red-50 focus:border-red-200 focus:ring-red-500/5"} 
                                                placeholder="You want results without acting on the daily prompts..." 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">05</div>
                                        <label className={labelClasses}>Method Snapshot (How it works)</label>
                                    </div>
                                    <button type="button" onClick={() => toggleHelp('method')} className={`p-2 rounded-xl transition-all ${helpOpen.method ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:text-primary'}`} title="View Rules">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </button>
                                </div>
                                <HelpGuidance isOpen={helpOpen.method} rule="Break your method into 3 verbs. Structure: Verb (1 word) + One-line explanation." />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {formData.methodSnapshot.map((item, i) => (
                                        <div key={i} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4 shadow-inner transition-all hover:bg-white hover:shadow-md">
                                            <input 
                                                type="text" 
                                                value={item.verb} 
                                                onChange={(e) => handleMethodChange(i, 'verb', e.target.value)} 
                                                className={inputClasses + " text-center uppercase tracking-widest text-[10px] py-2 border-primary/10"} 
                                                placeholder="VERB" 
                                            />
                                            <textarea 
                                                value={item.description} 
                                                onChange={(e) => handleMethodChange(i, 'description', e.target.value)} 
                                                rows={2}
                                                className={inputClasses + " text-center text-xs font-medium bg-transparent border-none shadow-none resize-none p-0"} 
                                                placeholder="One-line explanation of action." 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">06</div>
                                        <label className={labelClasses}>Evidence of Completion</label>
                                    </div>
                                    <button type="button" onClick={() => toggleHelp('outcomes')} className={`p-2 rounded-xl transition-all ${helpOpen.outcomes ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:text-primary'}`} title="View Rules">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </button>
                                </div>
                                <HelpGuidance isOpen={helpOpen.outcomes} rule="What observable evidence will the user have? No 'feel more confident' without proof." />
                                <div className="space-y-3">
                                    {formData.outcomes.map((item, i) => (
                                        <div key={i} className="flex gap-4 items-center">
                                            <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px] font-black">✓</div>
                                            <input 
                                                type="text" 
                                                value={item} 
                                                onChange={(e) => handleArrayChange('outcomes', i, e.target.value)} 
                                                className={inputClasses} 
                                                placeholder="A mapped decision filter for future opportunities..." 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="bg-gray-50 p-8 md:p-12 rounded-[3rem] border border-gray-100">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400 text-xs font-black">07</div>
                                        <label className={labelClasses}>Sprint Metadata</label>
                                    </div>
                                    <button type="button" onClick={() => toggleHelp('metadata')} className={`p-2 rounded-xl transition-all ${helpOpen.metadata ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:text-primary'}`} title="View Rules">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className={labelClasses}>Duration (Days)</label>
                                        <select name="duration" value={formData.duration} onChange={handleChange} className={inputClasses + " mt-2"}>
                                            {[3, 5, 7, 10, 14, 21, 30].map(d => <option key={d} value={d}>{d} Continuous Days</option>)}
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
                                    <div className="md:col-span-2">
                                        <label className={labelClasses}>Discovery Category</label>
                                        <select name="category" value={formData.category} onChange={handleChange} className={inputClasses + " mt-2"}>
                                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
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
                            <p className="text-[11px] text-gray-400 font-medium leading-relaxed italic mb-6">"A sprint is only as effective as the clarity it provides."</p>
                            <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-1000" style={{ width: formData.title ? '100%' : '20%' }}></div>
                            </div>
                         </div>
                         <div className="transform scale-[0.9] origin-top">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-4">Live Deck Preview</h4>
                            <SprintCard sprint={previewSprint} coach={user as Coach} />
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateSprint;
