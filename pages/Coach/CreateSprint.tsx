
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { Sprint, SprintDifficulty, DailyContent, Coach, UserRole, ActionTask } from '../../types';
import SprintCard from '../../components/SprintCard';

const CreateSprint: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        difficulty: 'Beginner' as SprintDifficulty,
        duration: 7,
        price: '',
    });
    
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchSprints = async () => {
            if (user) {
                const sprintsData = await sprintService.getSprints();
                setSprints(sprintsData);
            }
        };
        fetchSprints();
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // --- Data Validation ---
        if (!formData.title || !formData.description || !formData.category || formData.price === '') {
            alert("Please ensure all fields are filled, including the price.");
            return;
        }

        const price = Number(formData.price);
        if (isNaN(price) || price < 0) {
            alert("Please enter a valid, non-negative price.");
            return;
        }

        const existingSprint = sprints.find(sprint => sprint.title.toLowerCase() === formData.title.toLowerCase());
        if (existingSprint) {
            alert("A sprint with this title already exists. Please choose a different title.");
            return;
        }

        setIsSubmitting(true);

        try {
            const duration = Number(formData.duration);

            const dailyContent: DailyContent[] = Array.from({ length: duration }, (_, i) => ({
                day: i + 1,
                lessonText: '',
                audioUrl: '',
                action: {
                    id: 'placeholder',
                    title: 'Daily Action',
                    description: 'Complete this task to move forward.',
                    sprintId: 'placeholder',
                    completed: false
                } as ActionTask,
            }));

            const newSprintData: Omit<Sprint, 'id' | 'createdAt'> = {
                coachId: user.id,
                title: formData.title,
                description: formData.description,
                category: formData.category,
                difficulty: formData.difficulty,
                duration: duration,
                price: price, // Use the validated and converted price
                pointCost: Math.ceil(price / 500),
                coverImageUrl: `https://picsum.photos/seed/${Date.now()}/800/400`,
                published: false,
                approvalStatus: 'pending_approval',
                dailyContent: dailyContent,
            };

            const newSprintId = await sprintService.createSprint(newSprintData);
            
            navigate(`/coach/sprint/edit/${newSprintId}`);

        } catch (error) {
            console.error("Error creating sprint:", error);
            alert("Failed to create sprint. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const previewSprint: Sprint = {
        id: 'preview-sprint',
        coachId: user?.id || 'temp',
        title: formData.title || 'Untitled Sprint',
        description: formData.description || 'Your sprint description will appear here...',
        category: formData.category || 'Category',
        difficulty: formData.difficulty,
        duration: Number(formData.duration),
        price: Number(formData.price) || 0,
        pointCost: Math.ceil((Number(formData.price) || 0) / 500),
        coverImageUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        published: false,
        approvalStatus: 'pending_approval',
        dailyContent: [],
        createdAt: new Date().toISOString(),
    };

    const previewCoach: Coach = (user && user.role === UserRole.COACH) ? (user as Coach) : {
        id: 'temp',
        name: user?.name || 'Coach Name',
        email: '',
        role: UserRole.COACH,
        profileImageUrl: user?.profileImageUrl || 'https://ui-avatars.com/api/?name=Coach',
        bio: '',
        niche: 'Expert',
        approved: true
    } as Coach;

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 pb-32">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <button 
                        onClick={() => navigate('/coach/dashboard')} 
                        className="group flex items-center text-gray-500 hover:text-primary transition-colors text-sm font-medium"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Create New Sprint</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 sm:p-8">
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">Basic Info</h3>
                                        <p className="text-sm text-gray-500 mb-6">What is this sprint about?</p>
                                        
                                        <div className="space-y-5">
                                            <div>
                                                <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-1.5">Sprint Title</label>
                                                <input 
                                                    type="text" 
                                                    name="title"
                                                    id="title" 
                                                    value={formData.title}
                                                    onChange={handleChange}
                                                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-900 placeholder-gray-400 bg-white" 
                                                    placeholder="e.g., 7-Day Clarity Challenge" 
                                                    required 
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                                                <textarea 
                                                    name="description"
                                                    id="description" 
                                                    rows={4} 
                                                    value={formData.description}
                                                    onChange={handleChange}
                                                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-900 placeholder-gray-400 resize-none bg-white" 
                                                    placeholder="Describe the outcome. What will participants achieve?" 
                                                    required
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>

                                    <hr className="border-gray-100" />

                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">Sprint Details</h3>
                                        <p className="text-sm text-gray-500 mb-6">Categorize and price your program.</p>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                                                <input 
                                                    type="text" 
                                                    name="category"
                                                    id="category" 
                                                    value={formData.category}
                                                    onChange={handleChange}
                                                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-900 bg-white" 
                                                    placeholder="e.g., Productivity" 
                                                    required 
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="difficulty" className="block text-sm font-semibold text-gray-700 mb-1.5">Difficulty Level</label>
                                                <select 
                                                    name="difficulty"
                                                    id="difficulty" 
                                                    value={formData.difficulty}
                                                    onChange={handleChange}
                                                    className="block w-full px-4 py-3 border border-gray-200 bg-white rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-900 appearance-none" 
                                                    required
                                                >
                                                    <option value="Beginner">Beginner</option>
                                                    <option value="Intermediate">Intermediate</option>
                                                    <option value="Advanced">Advanced</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                            <div>
                                                <label htmlFor="duration" className="block text-sm font-semibold text-gray-700 mb-1.5">Duration (Days)</label>
                                                <select 
                                                    name="duration"
                                                    id="duration" 
                                                    value={formData.duration}
                                                    onChange={handleChange}
                                                    className="block w-full px-4 py-3 border border-gray-200 bg-white rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-900" 
                                                    required
                                                >
                                                    <option value={5}>5 Days</option>
                                                    <option value={7}>7 Days</option>
                                                    <option value={10}>10 Days</option>
                                                    <option value={14}>14 Days</option>
                                                    <option value={21}>21 Days</option>
                                                    <option value={30}>30 Days</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-1.5">Price (₦)</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 font-bold">₦</span>
                                                    </div>
                                                    <input 
                                                        type="number" 
                                                        name="price"
                                                        id="price" 
                                                        min="0" 
                                                        step="500"
                                                        value={formData.price}
                                                        onChange={handleChange}
                                                        className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-900 bg-white" 
                                                        placeholder="5,000" 
                                                        required 
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1.5">
                                                    {formData.price ? `${Math.ceil(Number(formData.price) / 500)} Growth Credits` : '0 Growth Credits'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-4 pt-4">
                                        <Button type="button" variant="secondary" onClick={() => navigate('/coach/dashboard')} className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50">
                                            Cancel
                                        </Button>
                                        <Button type="submit" isLoading={isSubmitting} className="px-8 py-3 rounded-xl text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                                            Next: Add Content &rarr;
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <div className="hidden lg:block lg:col-span-1 sticky top-6">
                        <div className="mb-4 flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Live Preview</span>
                            <span className="text-xs text-gray-400">This is how it will appear in Discover</span>
                        </div>
                        <div className="pointer-events-none select-none transform scale-95 origin-top">
                            <SprintCard sprint={previewSprint} coach={previewCoach} />
                        </div>
                        
                        <div className="mt-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-sm text-gray-500 text-center">
                            <p>You must add content for all {formData.duration} days before you can submit for approval.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateSprint;
