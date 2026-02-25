import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { Sprint, SprintDifficulty, DailyContent, Coach } from '../../types';
import SprintCard from '../../components/SprintCard';
import LandingPreview from '../../components/LandingPreview';
import { ALL_CATEGORIES } from '../../services/mockData';

const EditSprint: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { sprintId } = useParams<{ sprintId: string }>();
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewType, setPreviewType] = useState<'card' | 'landing'>('card');

    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        category: ALL_CATEGORIES[0],
        difficulty: 'Beginner' as SprintDifficulty,
        duration: 7,
        price: '0',
        coverImageUrl: '',
        transformation: '',
        outcomeTag: '',
        outcomeStatement: 'Focus creates feedback. *Feedback creates clarity.*',
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

    useEffect(() => {
        if (!sprintId) return;
        const fetchSprint = async () => {
            try {
                const sprintData = await sprintService.getSprintById(sprintId);
                if (sprintData) {
                    setSprint(sprintData);
                    setFormData({
                        title: sprintData.title,
                        subtitle: sprintData.subtitle,
                        category: sprintData.category,
                        difficulty: sprintData.difficulty,
                        duration: sprintData.duration,
                        price: String(sprintData.price),
                        coverImageUrl: sprintData.coverImageUrl || '',
                        transformation: sprintData.transformation || '',
                        outcomeTag: sprintData.outcomeTag || '',
                        outcomeStatement: sprintData.outcomeStatement || '',
                        forWho: sprintData.forWho || ['', '', '', ''],
                        notForWho: sprintData.notForWho || ['', '', ''],
                        methodSnapshot: sprintData.methodSnapshot || [{ verb: '', description: '' }, { verb: '', description: '' }, { verb: '', description: '' }],
                        outcomes: sprintData.outcomes || ['', '', ''],
                        sprintType: sprintData.sprintType || 'Execution',
                        protocol: sprintData.protocol || 'One action per day'
                    });
                }
            } catch (error) {
                console.error("Failed to fetch sprint:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSprint();
    }, [sprintId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !sprintId) return;
        setIsSubmitting(true);

        const updatedSprintData: Partial<Sprint> = {
            title: formData.title,
            subtitle: formData.subtitle,
            category: formData.category,
            difficulty: formData.difficulty,
            duration: Number(formData.duration),
            price: Number(formData.price),
            coverImageUrl: formData.coverImageUrl,
            transformation: formData.transformation,
            outcomeTag: formData.outcomeTag,
            outcomeStatement: formData.outcomeStatement,
            forWho: formData.forWho.filter(s => s.trim()),
            notForWho: formData.notForWho.filter(s => s.trim()),
            methodSnapshot: formData.methodSnapshot,
            outcomes: formData.outcomes.filter(s => s.trim()),
            sprintType: formData.sprintType,
            protocol: formData.protocol
        };

        try {
            await sprintService.updateSprint(sprintId, updatedSprintData);
            navigate(`/coach/sprints`);
        } catch (error) {
            console.error(error);
            alert("Update failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const previewSprint: Partial<Sprint> = {
        id: 'preview',
        coachId: user?.id || '',
        title: formData.title || 'Untitled Sprint',
        subtitle: formData.subtitle,
        description: formData.transformation || 'A transformation focused journey...',
        category: formData.category,
        difficulty: formData.difficulty,
        duration: Number(formData.duration),
        price: Number(formData.price),
        coverImageUrl: formData.coverImageUrl || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80',
        published: false,
        approvalStatus: 'draft',
        dailyContent: [],
        outcomes: formData.outcomes.filter(o => o.trim() !== ''),
        outcomeTag: formData.outcomeTag,
        outcomeStatement: formData.outcomeStatement,
        transformation: formData.transformation,
        forWho: formData.forWho,
        methodSnapshot: formData.methodSnapshot
    };
    
    const inputClasses = "w-full px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold transition-all placeholder-gray-300";
    const labelClasses = "text-[11px] font-black text-gray-400 uppercase tracking-widest";

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pb-32">
            <div className="max-w-7xl mx-auto">
                <header className="flex items-center gap-3 mb-10">
                     <button onClick={() => navigate('/coach/sprints')} className="p-2 text-gray-400 hover:text-primary hover:bg-white rounded-xl transition-all cursor-pointer shadow-sm">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                     </button>
                     <div>
                         <h1 className="text-3xl font-black text-gray-900 tracking-tight italic">Edit Your Cycle.</h1>
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
                                        <input type="text" name="title" value={formData.title} onChange={handleChange} className={inputClasses} required />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={labelClasses}>Sprint Subtitle</label>
                                        <input type="text" name="subtitle" value={formData.subtitle} onChange={handleChange} className={inputClasses} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={labelClasses}>Cover Image URL</label>
                                        <input type="url" name="coverImageUrl" value={formData.coverImageUrl} onChange={handleChange} className={inputClasses} />
                                    </div>
                                </div>
                            </section>

                             <section>
                                 <div className="flex items-center justify-between mb-2">
                                     <div className="flex items-center gap-3">
                                         <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">02</div>
                                         <label className={labelClasses}>Transformation Statement</label>
                                     </div>
                                 </div>
                                 <textarea 
                                     name="transformation" 
                                     value={formData.transformation} 
                                     onChange={handleChange} 
                                     rows={4} 
                                     className={inputClasses + " resize-none italic font-medium leading-relaxed p-6 text-lg"} 
                                     required 
                                 />
                             </section>

                            <div className="flex justify-end gap-4 pt-10 border-t border-gray-50">
                                <Button type="submit" isLoading={isSubmitting} className="px-12 py-4 rounded-[1.5rem] shadow-xl shadow-primary/20 group">
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </div>

                    <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-12">
                         <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
                            <div className="bg-gray-100 p-1 rounded-xl flex gap-1 mb-8">
                                <button onClick={() => setPreviewType('card')} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${previewType === 'card' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                    Deck View
                                </button>
                                <button onClick={() => setPreviewType('landing')} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${previewType === 'landing' ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}>
                                    Landing View
                                </button>
                            </div>

                            {previewType === 'card' ? (
                                <div className="animate-fade-in flex flex-col items-center">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-4">Registry Card Preview</h4>
                                    <div className="w-full max-w-[320px]">
                                        <SprintCard sprint={previewSprint as Sprint} coach={user as Coach} forceShowOutcomeTag={true} isStatic={true} />
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
        </div>
    );
};

export default EditSprint;
