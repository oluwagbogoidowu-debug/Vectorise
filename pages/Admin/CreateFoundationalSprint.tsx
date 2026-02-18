import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { Sprint, DailyContent } from '../../types';
import SprintCard from '../../components/SprintCard';

const PLATFORM_CATEGORIES = ["Core Platform Sprint", "Growth Fundamentals"];
const SUPPORTED_CURRENCIES = ["NGN", "USD", "GHS", "KES"];

const CreateFoundationalSprint: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: PLATFORM_CATEGORIES[0],
        duration: 5,
        pointCost: '30',
        price: '0',
        currency: 'NGN',
        coverImageUrl: '',
        outcomes: ['', '', ''] 
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

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
        
        setIsSubmitting(true);

        const duration = Number(formData.duration);
        const pointValue = Number(formData.pointCost || 0);
        const cashValue = Number(formData.price || 0);
        const sprintId = `foundational_${Date.now()}`;

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
            difficulty: 'Beginner', 
            duration: duration,
            price: cashValue,
            currency: formData.currency,
            pointCost: pointValue,
            pricingType: cashValue > 0 ? 'cash' : 'credits',
            coverImageUrl: formData.coverImageUrl || `https://picsum.photos/seed/${sprintId}/800/400`,
            published: false,
            approvalStatus: 'draft',
            dailyContent: dailyContent,
            outcomes: formData.outcomes.filter(o => o.trim() !== ''),
        };

        try {
            await sprintService.createSprint(newSprint);
            navigate(`/coach/sprint/edit/${sprintId}`);
        } catch (error) {
            console.error("Failed to create foundational sprint:", error);
            alert("Could not save foundational sprint.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const previewSprint: Sprint = {
        id: 'preview',
        coachId: user?.id || '',
        title: formData.title || 'Platform Program',
        description: formData.description || 'Description...',
        category: formData.category,
        difficulty: 'Beginner',
        duration: Number(formData.duration),
        price: Number(formData.price),
        currency: formData.currency,
        pointCost: Number(formData.pointCost),
        pricingType: Number(formData.price) > 0 ? 'cash' : 'credits',
        coverImageUrl: formData.coverImageUrl || 'https://images.unsplash.com/photo-1454165833767-027ff3902142?auto=format&fit=crop&w=1350&q=80',
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
                    <button onClick={() => navigate('/admin/dashboard')} className="p-1.5 text-gray-400 hover:text-primary hover:bg-white rounded-full transition-all cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create Foundational Sprint</h1>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Platform Core Program</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                            <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-12">
                                <div>
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                                        <span className="w-1 h-3 bg-primary rounded-full"></span>
                                        Foundational Registry
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-[11px] font-black text-gray-400 mb-2 uppercase tracking-widest">Program Title</label>
                                            <input type="text" name="title" value={formData.title} onChange={handleChange} className={inputClasses} placeholder="e.g. The Focus Framework" required />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[11px] font-black text-gray-400 mb-2 uppercase tracking-widest">Description</label>
                                            <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className={inputClasses + " resize-none"} placeholder="Explain the core platform transformation..." required />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[11px] font-black text-gray-400 mb-2 uppercase tracking-widest">Cover Image URL</label>
                                            <input type="url" name="coverImageUrl" value={formData.coverImageUrl} onChange={handleChange} className={inputClasses} placeholder="https://images.unsplash.com/..." />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black text-gray-400 mb-2 uppercase tracking-widest">Platform Tag / Type</label>
                                            <select name="category" value={formData.category} onChange={handleChange} className={inputClasses}>
                                                {PLATFORM_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black text-gray-400 mb-2 uppercase tracking-widest">Duration (Days)</label>
                                            <select name="duration" value={formData.duration} onChange={handleChange} className={inputClasses}>
                                                {[3, 5, 7, 14].map(d => <option key={d} value={d}>{d} Days</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">Core Outcomes</label>
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

                                <div className="md:col-span-2 bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100 mt-4">
                                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Access Control</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Platform Point Cost</label>
                                            <input type="number" name="pointCost" value={formData.pointCost} onChange={handleChange} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">Registry Cash Price</label>
                                            <div className="flex gap-2">
                                                <select name="currency" value={formData.currency} onChange={handleChange} className={inputClasses + " w-24"}>
                                                    {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <input type="number" name="price" value={formData.price} onChange={handleChange} className={inputClasses} placeholder="0" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 pt-10 border-t border-gray-100">
                                    <button type="button" onClick={() => navigate('/admin/dashboard')} className="px-8 py-3.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Cancel</button>
                                    <Button type="submit" isLoading={isSubmitting} className="px-10 py-3.5 rounded-2xl shadow-xl shadow-primary/10">Configure Daily Path &rarr;</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                    <div className="hidden lg:block">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-1">Foundational Preview</h4>
                        <div className="transform scale-[0.98] origin-top">
                            <SprintCard sprint={previewSprint} coach={{ name: 'Vectorise Platform', profileImageUrl: 'https://lh3.googleusercontent.com/d/1vYOe4SzIrE7kb6DSFkOp9UYz3tHWPnHw', id: 'admin_core' } as any} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateFoundationalSprint;
