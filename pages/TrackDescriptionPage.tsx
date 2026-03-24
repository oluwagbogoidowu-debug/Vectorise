
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { trackService } from '../services/trackService';
import { sprintService } from '../services/sprintService';
import { userService } from '../services/userService';
import { analyticsTracker } from '../services/analyticsTracker';
import { Track, Sprint } from '../types';
import Button from '../components/Button';
import FormattedText from '../components/FormattedText';
import DynamicSectionRenderer from '../components/DynamicSectionRenderer';
import { ChevronDown, ChevronUp, Clock, ArrowRight, ShieldCheck, Package, Zap, Calendar, Plus, Minus } from 'lucide-react';

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-[11px] font-black text-primary uppercase tracking-[0.5em] mb-6">
      {children}
  </h2>
);

const SprintViewCard: React.FC<{ sprint: Sprint }> = ({ sprint }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    const isFoundational = sprint.sprintType === 'Foundational' || 
                           sprint.category === 'Core Platform Sprint' || 
                           sprint.category === 'Growth Fundamentals';

    const displayDescription = sprint.description || sprint.subtitle || "This sprint is designed to help you build a solid foundation for your growth journey.";
    const hasDynamicContent = sprint.dynamicSections?.some(s => s.body && s.body.trim().length > 0);

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div 
                className="p-4 flex items-center justify-between cursor-pointer group"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-gray-50 shadow-sm">
                        <img src={sprint.coverImageUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[8px] font-black uppercase tracking-widest rounded-md">{sprint.category}</span>
                            <span className="text-[8px] font-black text-primary uppercase tracking-widest">{sprint.duration} Days</span>
                        </div>
                        <h4 className="text-lg font-black text-gray-900 tracking-tight italic group-hover:text-primary transition-colors leading-tight">{sprint.title}</h4>
                    </div>
                </div>
                <div className="p-2 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
            </div>
            
            {isExpanded && (
                <div className="px-8 pb-8 pt-2 border-t border-gray-50 animate-fade-in">
                    <div className="space-y-6 mb-6">
                        <div className={`relative transition-all duration-500 ${!isDescriptionExpanded ? 'max-h-[160px] overflow-hidden' : 'max-h-[2000px]'}`}>
                            <div className="space-y-8">
                                {displayDescription && !hasDynamicContent && (
                                    <p className="text-base text-gray-600 font-medium leading-relaxed italic">
                                        "{displayDescription}"
                                    </p>
                                )}

                                {sprint.dynamicSections && sprint.dynamicSections
                                    .filter(section => section.body && section.body.trim().length > 0)
                                    .map((section, index) => (
                                        <div key={index} className="animate-fade-in">
                                            {section.id !== 'overview' && <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">{section.title}</h3>}
                                            <DynamicSectionRenderer section={section} />
                                        </div>
                                    ))
                                }
                            </div>
                            
                            {!isDescriptionExpanded && (
                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
                            )}
                        </div>

                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsDescriptionExpanded(!isDescriptionExpanded);
                            }}
                            className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:opacity-70 transition-opacity"
                        >
                            {isDescriptionExpanded ? (
                                <><Minus className="w-3 h-3" /> See Less</>
                            ) : (
                                <><Plus className="w-3 h-3" /> See More</>
                            )}
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-6 pt-6 border-t border-gray-50">
                        <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            <Zap className="w-3.5 h-3.5 text-primary/40" />
                            Daily Execution
                        </div>
                        <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            <Calendar className="w-3.5 h-3.5 text-primary/40" />
                            {sprint.duration} Days
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TrackDescriptionPage: React.FC = () => {
    const { trackId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [track, setTrack] = useState<Track | null>(null);
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [guestEmail, setGuestEmail] = useState('');
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [emailError, setEmailError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!trackId) return;
            setIsLoading(true);
            try {
                const trackData = await trackService.getTrackById(trackId);
                if (trackData) {
                    setTrack(trackData);
                    const sprintPromises = trackData.sprintIds.map(id => sprintService.getSprintById(id));
                    const sprintData = await Promise.all(sprintPromises);
                    setSprints(sprintData.filter((s): s is Sprint => !!s));
                }
            } catch (err) {
                console.error("Error fetching track data:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [trackId]);

    const totalPrice = useMemo(() => {
        return sprints.reduce((sum, s) => sum + (s.price || 0), 0);
    }, [sprints]);

    const discountedPrice = useMemo(() => {
        if (!track) return totalPrice;
        return totalPrice * (1 - track.discountPercentage / 100);
    }, [totalPrice, track]);

    const handleJoinClick = async () => {
        if (!track) return;
        
        if (!user) {
            if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
                setEmailError("Please enter a valid email to continue.");
                return;
            }

            setIsCheckingEmail(true);
            setEmailError('');
            try {
                const emailExists = await userService.checkEmailExists(guestEmail);
                if (emailExists) {
                    // User exists, must login
                    analyticsTracker.trackEvent('track_intent_captured', { track_id: trackId, existing_user: true }, undefined, guestEmail);
                    navigate('/login', { state: { prefilledEmail: guestEmail, targetTrackId: track.id } });
                } else {
                    // New user, proceed to commitment
                    analyticsTracker.trackEvent('track_intent_captured', { track_id: trackId, existing_user: false }, undefined, guestEmail);
                    navigate('/onboarding/commitment', { state: { trackId: track.id, track: track, prefilledEmail: guestEmail } });
                }
            } catch (err) {
                console.error("Error checking email:", err);
                setEmailError("Something went wrong. Please try again.");
            } finally {
                setIsCheckingEmail(false);
            }
            return;
        }

        analyticsTracker.trackEvent('track_intent_captured', { track_id: trackId }, user?.id);
        navigate('/onboarding/commitment', { state: { trackId: track.id, track: track } });
    };

    if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-light text-[8px] font-black uppercase tracking-[0.2em] text-gray-300">Assembling Track Bundle...</div>;
    if (!track) return <div className="min-h-screen flex flex-col items-center justify-center bg-light text-center px-4"><h2 className="text-base font-black mb-2">Track not found.</h2><Button onClick={() => navigate('/discover')}>Discover Paths</Button></div>;

    return (
        <div className="bg-[#F8F9FA] min-h-screen font-sans text-[13px] pb-24 selection:bg-primary/10 relative">
            <div className="max-w-screen-lg mx-auto px-4 pt-4">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <button 
                        onClick={() => navigate('/discover')} 
                        className="group flex items-center text-gray-400 hover:text-primary transition-all text-[11px] font-black uppercase tracking-widest"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Registry
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="px-4 py-1.5 rounded-xl border border-primary/20 bg-white text-primary text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                            <Package className="w-3 h-3" />
                            TRACK BUNDLE
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        {/* HERO SECTION */}
                        <div className="relative h-[280px] sm:h-[340px] lg:h-[440px] rounded-[3rem] overflow-hidden shadow-2xl group border-4 border-white bg-dark">
                            <img 
                                src={track.coverImageUrl} 
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                                alt={track.title} 
                                referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-dark/95 via-dark/10 to-transparent"></div>
                            <div className="absolute bottom-10 left-10 right-10 text-white">
                                <div className="mb-4 flex items-center gap-2">
                                    <span className="px-3 py-1.5 bg-primary text-white rounded-lg text-[11px] font-black uppercase tracking-widest shadow-lg">
                                        SAVE {track.discountPercentage}%
                                    </span>
                                    <span className="px-3 py-1.5 bg-white/10 backdrop-blur-md text-white rounded-lg text-[11px] font-black uppercase tracking-widest">
                                        {sprints.length} SPRINTS
                                    </span>
                                </div>
                                <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight mb-4 italic">
                                    <FormattedText text={track.title} inline />
                                </h1>
                                {track.subtitle && (
                                    <p className="text-white/70 text-sm md:text-base font-medium italic tracking-tight mb-6 leading-snug max-w-xl">
                                        {track.subtitle}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* MAIN CONTENT */}
                        <div className="space-y-8">
                            <section className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-gray-100 shadow-sm animate-fade-in">
                                <SectionHeading>Track Overview</SectionHeading>
                                <div className="text-base md:text-lg text-gray-600 font-medium leading-relaxed italic">
                                    <FormattedText text={track.description} />
                                </div>
                            </section>

                            <section className="space-y-6">
                                <SectionHeading>Included Programs</SectionHeading>
                                <div className="space-y-4">
                                    {sprints.map(sprint => (
                                        <SprintViewCard key={sprint.id} sprint={sprint} />
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>

                    <aside className="lg:col-span-4 space-y-6">
                        <div className="bg-white rounded-[3rem] p-10 md:p-12 border border-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] lg:sticky lg:top-8 overflow-hidden relative group/card">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary/40 via-primary to-primary/40"></div>
                            
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover/card:bg-primary/10 transition-colors duration-700"></div>

                            <div className="text-center mb-10 relative z-10">
                                <SectionHeading>Bundle Value</SectionHeading>
                                <div className="flex flex-col items-center">
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <h3 className="text-4xl font-black text-gray-900 tracking-tighter leading-none italic">
                                            ₦{discountedPrice.toLocaleString()}
                                        </h3>
                                        <span className="text-sm font-bold text-gray-300 line-through">₦{totalPrice.toLocaleString()}</span>
                                    </div>
                                    <p className="text-[12px] font-black text-primary uppercase tracking-widest">Save ₦{(totalPrice - discountedPrice).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-10 relative z-10">
                                <div className="flex items-center gap-5 p-5 bg-gray-50/50 rounded-[2rem] border border-gray-100 group/item transition-all hover:bg-white hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm border border-gray-100 transition-all group-hover/item:scale-110 group-hover/item:bg-primary group-hover/item:text-white">
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Bundle Size</p>
                                        <p className="text-sm font-black text-gray-900 leading-none">{sprints.length} Full Programs</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-5 p-5 bg-gray-50/50 rounded-[2rem] border border-gray-100 group/item transition-all hover:bg-white hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm border border-gray-100 transition-all group-hover/item:scale-110 group-hover/item:bg-primary group-hover/item:text-white">
                                        <Zap className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Access</p>
                                        <p className="text-sm font-black text-gray-900 leading-none">Lifetime Unlock</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4 relative z-10">
                                {!user && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Enter email to start</label>
                                        <input 
                                            type="email" 
                                            value={guestEmail}
                                            onChange={(e) => {
                                                setGuestEmail(e.target.value);
                                                if (emailError) setEmailError('');
                                            }}
                                            placeholder="your@email.com"
                                            className={`w-full px-6 py-4 bg-gray-50 border rounded-2xl focus:ring-8 focus:ring-primary/5 focus:border-primary outline-none text-sm font-black text-black transition-all ${emailError ? 'border-red-500' : 'border-gray-100'}`}
                                        />
                                        {emailError && <p className="text-[9px] text-red-500 font-black uppercase mt-1 ml-1">{emailError}</p>}
                                    </div>
                                )}
                                <Button 
                                    onClick={handleJoinClick} 
                                    isLoading={isCheckingEmail}
                                    className="w-full py-6 rounded-[2rem] shadow-2xl shadow-primary/30 text-[11px] uppercase tracking-[0.25em] font-black group/btn"
                                >
                                    Unlock Track Bundle 
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                </Button>
                                
                                <div className="flex items-center justify-center gap-2 pt-2 opacity-40 group-hover/card:opacity-60 transition-opacity">
                                    <ShieldCheck className="w-3 h-3 text-gray-400" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Secure Checkout</span>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default TrackDescriptionPage;
