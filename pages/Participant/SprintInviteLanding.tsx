
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { Sprint, Participant } from '../../types';
import Button from '../../components/Button';
import LocalLogo from '../../components/LocalLogo';
import { getSprintOutcomes } from '../../utils/sprintUtils';

const SprintInviteLanding: React.FC = () => {
    const { referralCode, sprintId } = useParams();
    const navigate = useNavigate();
    
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [referrer, setReferrer] = useState<Participant | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadInviteData = async () => {
            if (!sprintId || !referralCode) return;
            setIsLoading(true);
            try {
                // Fetch sprint details
                const sprintData = await sprintService.getSprintById(sprintId);
                setSprint(sprintData);

                // Fetch referrer (we use a query to find user by referral code)
                // For this demo/mock we'll assume a lookup or just search common mock users
                const participants = await userService.getParticipants();
                const found = participants.find(p => p.referralCode === referralCode);
                setReferrer(found || null);
            } catch (err) {
                console.error("Invite Load Error:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadInviteData();
    }, [sprintId, referralCode]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-primary flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!sprint) {
        return (
            <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-2xl font-black mb-4">Sprint Expired or Not Found</h1>
                <Link to="/">
                    <Button className="bg-white text-primary rounded-full px-10 py-4 font-black">Go to Home</Button>
                </Link>
            </div>
        );
    }

    const outcomes = getSprintOutcomes(sprint);

    return (
        <div className="min-h-screen bg-primary text-white flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
            {/* Background Decorative Blurs */}
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-black/20 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-xl w-full z-10 space-y-10">
                <div className="text-center">
                    <LocalLogo type="white" className="h-10 w-auto mx-auto mb-10 opacity-80" />
                    
                    {referrer && (
                        <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full pl-2 pr-6 py-2 mb-8 animate-fade-in">
                            <img src={referrer.profileImageUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-primary/20 shadow-lg" />
                            <p className="text-sm font-bold tracking-tight">
                                <span className="opacity-60 font-medium">Invitation from</span> {referrer.name}
                            </p>
                        </div>
                    )}
                    
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none mb-4 italic">
                        Grow together.
                    </h1>
                    <p className="text-lg text-white/70 font-medium leading-relaxed max-w-sm mx-auto">
                        Your friend invited you to join them on this specific growth cycle.
                    </p>
                </div>

                <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-2xl text-dark relative overflow-hidden animate-slide-up">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                Targeted Sprint
                            </span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                {sprint.duration} Days
                            </span>
                        </div>
                        
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight mb-4">
                            {sprint.title}
                        </h2>
                        
                        <p className="text-gray-500 font-medium text-sm leading-relaxed mb-8 line-clamp-3">
                            {sprint.description}
                        </p>

                        <div className="space-y-3 mb-10">
                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em]">Projected Outcomes</p>
                            {outcomes.slice(0, 3).map((o, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-sm font-bold text-gray-700">
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                    {o}
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={() => navigate('/onboarding/intro', { state: { targetSprintId: sprint.id, referrerId: referrer?.id } })}
                            className="w-full py-6 bg-primary text-white font-black uppercase tracking-[0.2em] rounded-full text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            Accept Invite & Start
                        </button>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Vectorise • Growth Registry</p>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default SprintInviteLanding;
