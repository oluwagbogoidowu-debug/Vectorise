import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Participant, Sprint } from '../../../types';
import Button from '../../../components/Button';
import { sprintService } from '../../../services/sprintService';

const ReferralShare: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [copied, setCopied] = useState(false);
    const [targetSprint, setTargetSprint] = useState<Sprint | null>(null);

    // Check if we are sharing a specific sprint from state or query
    const searchParams = new URLSearchParams(location.search);
    const sprintId = searchParams.get('sprintId');

    useEffect(() => {
        if (sprintId) {
            const fetchSprint = async () => {
                const data = await sprintService.getSprintById(sprintId);
                setTargetSprint(data);
            };
            fetchSprint();
        }
    }, [sprintId]);

    if (!user) return null;
    const participant = user as Participant;
    const referralCode = participant.referralCode || 'GROWTH';
    
    // referral links now strictly follow the pattern: domain.com/?ref=CODE&sprintId=ID#/
    const inviteParams = targetSprint 
        ? `?ref=${referralCode}&sprintId=${targetSprint.id}` 
        : `?ref=${referralCode}`;
    const referralLink = `${window.location.origin}/${inviteParams}#/`;
    
    const defaultMessage = targetSprint 
        ? `I'm currently focused on this '${targetSprint.title}' sprint and thought you'd love it. Let's grow together: ${referralLink}`
        : `I found a platform that helps me stay consistent with my growth. Join me on this path: ${referralLink}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(defaultMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = (platform: string) => {
        const encodedMsg = encodeURIComponent(defaultMessage);
        let url = '';

        switch (platform) {
            case 'whatsapp':
                url = `https://wa.me/?text=${encodedMsg}`;
                break;
            case 'twitter':
                url = `https://twitter.com/intent/tweet?text=${encodedMsg}`;
                break;
            case 'email':
                url = `mailto:?subject=Grow with me on Vectorise&body=${encodedMsg}`;
                break;
        }

        if (url) window.open(url, '_blank');
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 pb-32 animate-fade-in">
            <button 
                onClick={() => navigate(-1)} 
                className="group flex items-center text-gray-500 hover:text-primary transition-colors mb-6 text-xs font-black uppercase tracking-widest"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                </svg>
                Go Back
            </button>

            <div className="text-center mb-12">
                <div className="w-20 h-20 bg-primary/10 text-primary rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-primary/5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
                    {targetSprint ? 'Invite to this Sprint' : 'Invite to Vectorise'}
                </h1>
                <p className="text-gray-500 font-medium text-lg leading-relaxed max-w-sm mx-auto">
                    {targetSprint 
                        ? `Share your progress in '${targetSprint.title}' with someone ready to evolve.` 
                        : 'Your influence is measured by the growth you catalyze in others.'}
                </p>
            </div>

            {targetSprint && (
                <div className="bg-primary/5 rounded-[2rem] p-6 border border-primary/10 mb-8 flex items-center gap-6 group">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm">
                        <img src={targetSprint.coverImageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Contextual Invite</p>
                        <h3 className="font-bold text-gray-900 leading-tight">{targetSprint.title}</h3>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 md:p-10 mb-8 relative overflow-hidden">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4 ml-1">Your Personalized Message</p>
                <div className="bg-gray-50 rounded-3xl p-6 text-gray-700 italic border border-gray-100 mb-8 leading-relaxed font-medium">
                    "{defaultMessage}"
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                        onClick={() => handleShare('whatsapp')}
                        className="flex items-center gap-4 px-6 py-4 bg-green-50 hover:bg-green-100 border border-green-100 rounded-2xl transition-all active:scale-95 group"
                    >
                        <span className="text-2xl">💬</span>
                        <div className="text-left">
                            <p className="font-black text-green-800 text-xs uppercase tracking-widest">WhatsApp</p>
                            <p className="text-[10px] text-green-600 font-bold opacity-70">Direct Share</p>
                        </div>
                    </button>
                    <button 
                        onClick={() => handleShare('email')}
                        className="flex items-center gap-4 px-6 py-4 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-2xl transition-all active:scale-95 group"
                    >
                        <span className="text-2xl">✉️</span>
                        <div className="text-left">
                            <p className="font-black text-blue-800 text-xs uppercase tracking-widest">Email</p>
                            <p className="text-[10px] text-blue-600 font-bold opacity-70">Reach Inbox</p>
                        </div>
                    </button>
                    <button 
                        onClick={handleCopy}
                        className={`sm:col-span-2 flex items-center justify-between px-8 py-5 border-2 rounded-2xl transition-all active:scale-95 group ${
                            copied ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100 hover:border-primary/20'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-2xl">{copied ? '✅' : '🔗'}</span>
                            <div className="text-left">
                                <p className={`font-black text-xs uppercase tracking-widest ${copied ? 'text-green-800' : 'text-gray-900'}`}>
                                    {copied ? 'Copied Link' : 'Invite Link'}
                                </p>
                                <p className="text-[10px] text-gray-400 font-bold tracking-tight truncate max-w-[200px]">
                                    {referralLink}
                                </p>
                            </div>
                        </div>
                        {!copied && (
                            <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 group-hover:text-primary transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                    </button>
                </div>
                
                {/* Subtle detail */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            <div className="text-center">
                <Link to="/impact" className="text-xs font-black text-gray-400 hover:text-primary uppercase tracking-[0.2em] transition-colors">
                    View My Global Impact &rarr;
                </Link>
            </div>
            
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ReferralShare;