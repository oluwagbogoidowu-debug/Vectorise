
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { Sprint, SprintDifficulty, DailyContent, Coach, SprintTargeting } from '../../types';
import SprintCard from '../../components/SprintCard';
import { QUIZ_STRUCTURE, translateToTag } from '../../utils/tagUtils';

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

const CreateSprint: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: CATEGORIES[0],
        difficulty: 'Beginner' as SprintDifficulty,
        duration: 7,
        price: '5000',
        coverImageUrl: '',
        outcomes: ['', '', ''] 
    });

    const [targeting, setTargeting] = useState<SprintTargeting>({
        persona: QUIZ_STRUCTURE.persona[0],
        p1: '',
        p2: '',
        p3: '',
        occupation: QUIZ_STRUCTURE.occupation[0]
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const durationOptions = {
        'Beginner': [3, 5, 7],
        'Intermediate': [7, 10, 14],
        'Advanced': [21, 30]
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTargetingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setTargeting(prev => {
            const newState = { ...prev, [name]: value };
            // Reset persona-specific tags if persona changes
            if (name === 'persona') {
                newState.p1 = '';
                newState.p2 = '';
                newState.p3 = '';
            }
            return newState;
        });
    };

    const personaQuestions = useMemo(() => {
        return (QUIZ_STRUCTURE.questions as any)[targeting.persona] || [];
    }, [targeting.persona]);

    const handleOutcomeChange = (index: number, value: string) => {
        const outcomes = [...formData.outcomes];
        outcomes[index] = value;
        setFormData({ ...formData, outcomes });
    };

    const addOutcome = () => {
        setFormData({ ...formData, outcomes: [...formData.outcomes, ''] });
    };

    const removeOutcome = (index: number) => {
        const outcomes = formData.outcomes.filter((_, i) => i !== index);
        setFormData({ ...formData, outcomes });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        // Validation for targeting - Only Persona and Occupation are compulsory now
        if (!targeting.persona || !targeting.occupation) {
            alert("Ideal Persona and Ideal Occupation are required for matching.");
            return;
        }

        setIsSubmitting(true);

        const duration = Number(formData.duration);
        const priceValue = Number(formData.price || 0);
        const sprintId = `sprint_${Date.now()}`;

        const dailyContent: DailyContent[] = Array.from({ length: duration }, (_, i) => ({
            day: i + 1,
            lessonText: '',
            taskPrompt: '',
            submissionType: 'text'
        }));

        const newSprint: Sprint = {
            id: sprintId,
            coachId: user.id,
            title: formData.title,
            description: formData.description,
            category: formData.category,
            difficulty: formData.difficulty,
            duration: duration,
            price: priceValue,
            pointCost: 0,
            pricingType: 'cash',
            coverImageUrl: formData.coverImageUrl || `https://picsum.photos/seed/${sprintId}/800/400`,
            published: false,
            approvalStatus: 'draft',
            dailyContent: dailyContent,
            outcomes: formData.outcomes.filter(o => o.trim() !== ''),
            targeting: {
                persona: targeting.persona,
                p1: targeting.p1 ? translateToTag(targeting.persona, targeting.p1) : '',
                p2: targeting.p2 ? translateToTag(targeting.persona, targeting.p2) : '',
                p3: targeting.p3 ? translateToTag(targeting.persona, targeting.p3) : '',
                occupation: translateToTag('', targeting.occupation)
            }
        };

        try {
            await sprintService.createSprint(newSprint);
            navigate(`/coach/sprint/edit/${sprintId}`);
        } catch (error) {
            console.error("Failed to create sprint:", error);
            alert("Could not save sprint.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const previewSprint: Sprint = {
        id: 'preview',
        coachId: user?.id || '',
        title: formData.title || 'Sprint Title',
        description: formData.description || 'Description...',
        category: formData.category,
        difficulty: formData.difficulty,
        duration: Number(formData.duration),
        price: Number(formData.price) || 0,
        pointCost: 0,
        pricingType: 'cash',
        coverImageUrl: formData.coverImageUrl || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80',
        published: false,
        approvalStatus: 'draft',
        dailyContent: [],
        outcomes: formData.outcomes.filter(o => o.trim() !== '')
    };

    const inputClasses = "w-full px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold transition-all placeholder-gray-300";

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 pb-32">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <button onClick={() => navigate('/coach/dashboard')} className="p-1.5 text-gray-400 hover:text-primary hover:bg-white rounded-full transition-all cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create New Paid Sprint</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                            <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-12">
                                <div>
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                                        <span className="w-1 h-3 bg-primary rounded-full"></span>
                                        General Registry
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-[11px] font-black text-gray-400 mb-2 uppercase tracking-widest">Sprint Title</label>
                                            <input type="text" name="title" value={formData.title} onChange={handleChange} className={inputClasses} placeholder="e.g. 7-Day Mindset Reset" required />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[11px] font-black text-gray-400 mb-2 uppercase tracking-widest">Description</label>
                                            <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className={inputClasses + " resize-none"} placeholder="Explain the transformation..." required />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[11px] font-black text-gray-400 mb-2 uppercase tracking-widest">Cover Image URL</label>
                                            <input type="url" name="coverImageUrl" value={formData.coverImageUrl} onChange={handleChange} className={inputClasses} placeholder="https://images.unsplash.com/..." />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black text-gray-400 mb-2 uppercase tracking-widest">Category</label>
                                            <select name="category" value={formData.category} onChange={handleChange} className={inputClasses}>
                                                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black text-gray-400 mb-2 uppercase tracking-widest">Difficulty</label>
                                            <select name="difficulty" value={formData.difficulty} onChange={handleChange} className={inputClasses}>
                                                <option value="Beginner">Beginner</option>
                                                <option value="Intermediate">Intermediate</option>
                                                <option value="Advanced">Advanced</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black text-gray-400 mb-2 uppercase tracking-widest">Duration (Days)</label>
                                            <select name="duration" value={formData.duration} onChange={handleChange} className={inputClasses}>
                                                {durationOptions[formData.difficulty].map(d => <option key={d} value={d}>{d} Days</option>)}
                                            </select>
                                        </div>

                                        <div className="md:col-span-2 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">Key Outcomes</label>
                                                <button type="button" onClick={addOutcome} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">+ Add Outcome</button>
                                            </div>
                                            {formData.outcomes.map((outcome, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <input type="text" value={outcome} onChange={(e) => handleOutcomeChange(index, e.target.value)} className={inputClasses} placeholder={`Outcome ${index + 1}`} />
                                                    {formData.outcomes.length > 1 && (
                                                        <button type="button" onClick={() => removeOutcome(index)} className="p-3 text-gray-400 hover:text-red-500 bg-white rounded-2xl shadow-sm border border-gray-100 transition-all"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                                        <span className="w-1 h-3 bg-primary rounded-full"></span>
                                        Target Participant Profile
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Ideal Persona (Compulsory)</label>
                                            <select name="persona" value={targeting.persona} onChange={handleTargetingChange} className={inputClasses}>
                                                {QUIZ_STRUCTURE.persona.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>

                                        {personaQuestions.map((q: string, idx: number) => (
                                            <div key={idx}>
                                                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest line-clamp-1">{q}</label>
                                                <select 
                                                    name={`p${idx+1}`} 
                                                    value={(targeting as any)[`p${idx+1}`]} 
                                                    onChange={handleTargetingChange} 
                                                    className={inputClasses}
                                                >
                                                    <option value="">Any (Optional)</option>
                                                    {(QUIZ_STRUCTURE.options as any)[q]?.map((opt: string) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}

                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Ideal Occupation (Compulsory)</label>
                                            <select name="occupation" value={targeting.occupation} onChange={handleTargetingChange} className={inputClasses}>
                                                {QUIZ_STRUCTURE.occupation.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100 mt-4">
                                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Investment Setting</h5>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Cash Price (₦)</label>
                                        <input type="number" name="price" value={formData.price} onChange={handleChange} className={inputClasses} placeholder="e.g. 10000" required />
                                        <p className="mt-4 text-[10px] text-gray-400 font-medium italic">Coaches create premium, paid programs. Coin-gated sprints are reserved for foundational platform tracks.</p>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 pt-10 border-t border-gray-100">
                                    <button type="button" onClick={() => navigate('/coach/dashboard')} className="px-8 py-3.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Cancel</button>
                                    <Button type="submit" isLoading={isSubmitting} className="px-10 py-3.5 rounded-2xl shadow-xl shadow-primary/10">Next: Add Content &rarr;</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                    <div className="hidden lg:block">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-1">Coach Profile Preview</h4>
                        <div className="transform scale-[0.98] origin-top">
                            <SprintCard sprint={previewSprint} coach={user as Coach} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateSprint;
