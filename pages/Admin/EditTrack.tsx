
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { trackService } from '../../services/trackService';
import { Sprint, Track } from '../../types';
import Button from '../../components/Button';
import { List, Plus, Trash2, Search, Package, Save } from 'lucide-react';
import FormattingToolbar from '../../components/FormattingToolbar';

const EditTrack: React.FC = () => {
    const { trackId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        description: '',
        discountPercentage: 0,
        coverImageUrl: '',
        sprintIds: [] as string[],
        published: true
    });

    useEffect(() => {
        if (!trackId) return;

        const loadData = async () => {
            setIsLoading(true);
            try {
                const track = await trackService.getTrackById(trackId);
                if (track) {
                    setFormData({
                        title: track.title,
                        subtitle: track.subtitle,
                        description: track.description,
                        discountPercentage: track.discountPercentage,
                        coverImageUrl: track.coverImageUrl,
                        sprintIds: track.sprintIds,
                        published: track.published
                    });
                }

                const allSprints = await sprintService.getAdminSprints();
                setSprints(allSprints.filter(s => s.published && s.approvalStatus === 'approved'));
            } catch (error) {
                console.error("Failed to load track data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [trackId]);

    const filteredSprints = useMemo(() => {
        return sprints.filter(s => 
            s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sprints, searchTerm]);

    const selectedSprints = useMemo(() => {
        return sprints.filter(s => formData.sprintIds.includes(s.id));
    }, [sprints, formData.sprintIds]);

    const totalPrice = useMemo(() => {
        return selectedSprints.reduce((sum, s) => sum + (s.price || 0), 0);
    }, [selectedSprints]);

    const discountedPrice = useMemo(() => {
        return totalPrice * (1 - formData.discountPercentage / 100);
    }, [totalPrice, formData.discountPercentage]);

    const handleToggleSprint = (id: string) => {
        setFormData(prev => {
            const newIds = prev.sprintIds.includes(id)
                ? prev.sprintIds.filter(sid => sid !== id)
                : [...prev.sprintIds, id];
            return { ...prev, sprintIds: newIds };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !trackId || formData.sprintIds.length === 0) return;
        setIsSubmitting(true);

        const updatedTrack: Partial<Track> = {
            title: formData.title,
            subtitle: formData.subtitle,
            description: formData.description,
            sprintIds: formData.sprintIds,
            discountPercentage: Number(formData.discountPercentage),
            coverImageUrl: formData.coverImageUrl,
            published: formData.published,
            updatedAt: new Date().toISOString(),
            currency: selectedSprints[0]?.currency || 'NGN'
        };

        try {
            await trackService.updateTrack(trackId, updatedTrack);
            alert("Track updated successfully!");
            navigate('/admin/dashboard');
        } catch (error) {
            console.error(error);
            alert("Failed to update track.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClasses = "w-full px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none text-sm font-bold transition-all placeholder-gray-300";
    const labelClasses = "text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block";

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pb-32">
            <div className="max-w-7xl mx-auto">
                <header className="flex items-center gap-3 mb-10">
                    <button onClick={() => navigate('/admin/dashboard')} className="p-2 text-gray-400 hover:text-primary hover:bg-white rounded-xl transition-all cursor-pointer shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight italic">Edit Track.</h1>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Update Platform Bundle</p>
                    </div>
                </header>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    <div className="lg:col-span-7 space-y-8">
                        <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 p-10 space-y-8">
                            <section>
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-6">Track Identity</h4>
                                <div className="space-y-6">
                                    <div>
                                        <label className={labelClasses}>Track Name</label>
                                        <input 
                                            type="text" 
                                            value={formData.title} 
                                            onChange={e => setFormData({...formData, title: e.target.value})} 
                                            className={inputClasses} 
                                            placeholder="e.g. The Mastermind Bundle" 
                                            required 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Track Subtitle</label>
                                        <input 
                                            type="text" 
                                            value={formData.subtitle} 
                                            onChange={e => setFormData({...formData, subtitle: e.target.value})} 
                                            className={inputClasses} 
                                            placeholder="e.g. 3 Sprints to dominate your niche" 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Track Overview</label>
                                        <div className="space-y-2">
                                            <FormattingToolbar 
                                                onFormat={(prefix, suffix) => {
                                                    const textarea = document.getElementById('track-description') as HTMLTextAreaElement;
                                                    if (!textarea) return;
                                                    const start = textarea.selectionStart;
                                                    const end = textarea.selectionEnd;
                                                    const text = textarea.value;
                                                    const before = text.substring(0, start);
                                                    const selection = text.substring(start, end);
                                                    const after = text.substring(end);
                                                    const newValue = before + prefix + selection + suffix + after;
                                                    setFormData({ ...formData, description: newValue });
                                                    setTimeout(() => {
                                                        textarea.focus();
                                                        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
                                                    }, 0);
                                                }}
                                            />
                                            <textarea 
                                                id="track-description"
                                                value={formData.description} 
                                                onChange={e => setFormData({...formData, description: e.target.value})} 
                                                className={inputClasses + " resize-none min-h-[300px]"} 
                                                placeholder="Explain the value of this bundle..." 
                                                required 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Cover Image URL</label>
                                        <input 
                                            type="url" 
                                            value={formData.coverImageUrl} 
                                            onChange={e => setFormData({...formData, coverImageUrl: e.target.value})} 
                                            className={inputClasses} 
                                            placeholder="https://..." 
                                        />
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-6">Pricing & Discount</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className={labelClasses}>Discount Percentage (%)</label>
                                        <input 
                                            type="number" 
                                            value={formData.discountPercentage} 
                                            onChange={e => setFormData({...formData, discountPercentage: Number(e.target.value)})} 
                                            className={inputClasses} 
                                            min="0" 
                                            max="100" 
                                        />
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col justify-center">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Calculated Value</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-black text-gray-900">{discountedPrice.toLocaleString()}</span>
                                            <span className="text-xs font-bold text-gray-400 line-through ml-1">{totalPrice.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-6">Status</h4>
                                <div className="flex items-center gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, published: !formData.published})}
                                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.published ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-gray-100 text-gray-400'}`}
                                    >
                                        {formData.published ? 'Published' : 'Draft'}
                                    </button>
                                </div>
                            </section>
                        </div>

                        <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 p-10">
                            <div className="flex justify-between items-center mb-8">
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Sprint Selection</h4>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input 
                                        type="text" 
                                        value={searchTerm} 
                                        onChange={e => setSearchTerm(e.target.value)} 
                                        className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold outline-none focus:border-primary/30 transition-all" 
                                        placeholder="Search Registry..." 
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                                {filteredSprints.map(s => (
                                    <button 
                                        key={s.id}
                                        type="button"
                                        onClick={() => handleToggleSprint(s.id)}
                                        className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group ${formData.sprintIds.includes(s.id) ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-white border-gray-100 hover:border-primary/10'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-gray-50">
                                                <img src={s.coverImageUrl} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-black text-gray-900 tracking-tight leading-none mb-1">{s.title}</p>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{s.duration} Days • {s.price.toLocaleString()} {s.currency}</p>
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${formData.sprintIds.includes(s.id) ? 'bg-primary border-primary text-white' : 'border-gray-100 text-transparent group-hover:border-primary/30'}`}>
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-12">
                        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-8 text-center">Track Preview</h4>
                            
                            <div className="space-y-8">
                                {/* Track Card Preview */}
                                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-500">
                                    <div className="aspect-[16/9] relative overflow-hidden">
                                        <img 
                                            src={formData.coverImageUrl || `https://picsum.photos/seed/${formData.title || 'track'}/800/450`} 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                            alt="" 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                        <div className="absolute bottom-6 left-6 right-6">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-1 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded-md">Track Bundle</span>
                                                <span className="px-2 py-1 bg-white/20 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest rounded-md">{formData.sprintIds.length} SPRINTS</span>
                                            </div>
                                            <h3 className="text-xl font-black text-white tracking-tight italic">{formData.title || 'Untitled Track'}</h3>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-xs text-gray-500 font-medium line-clamp-2 mb-6">{formData.subtitle || 'Track subtitle will appear here.'}</p>
                                        <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total Value</span>
                                                <span className="text-lg font-black text-gray-900 italic">{discountedPrice.toLocaleString()} <span className="text-[10px] text-gray-400 line-through ml-1">{totalPrice.toLocaleString()}</span></span>
                                            </div>
                                            <div className="px-4 py-2 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest rounded-xl">Save {formData.discountPercentage}%</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">Included Sprints</h5>
                                    <div className="flex -space-x-4 overflow-hidden px-2">
                                        {selectedSprints.map(s => (
                                            <div key={s.id} className="inline-block h-12 w-12 rounded-2xl ring-4 ring-white overflow-hidden border border-gray-100 shadow-sm">
                                                <img src={s.coverImageUrl} className="h-full w-full object-cover" alt="" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Button 
                                    type="submit" 
                                    disabled={formData.sprintIds.length === 0 || !formData.title} 
                                    isLoading={isSubmitting}
                                    className="w-full py-5 rounded-[2rem] shadow-2xl shadow-primary/20 scale-105 active:scale-100"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Update Track Bundle
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};

export default EditTrack;
