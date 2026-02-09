import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Participant, Sprint } from '../../../types';
import { sprintService } from '../../../services/sprintService';

const ReferralShare: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [copied, setCopied] = useState(false);
    const [targetSprint, setTargetSprint] = useState<Sprint | null>(null);

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
    
    // UNIFIED LOGIC: One single link format, identical to Partner Main Link
    const referralLink = `${window.location.origin}/?ref=${referralCode}#/`;
    
    const defaultMessage = targetSprint 
        ? `I'm currently focused on this '${targetSprint.title}' sprint and thought you'd love it. Join me: ${referralLink}`
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
            case 'whatsapp': url = `https://wa.me/?text=${encodedMsg}`; break;
            case 'twitter': url = `https://twitter.com/intent/tweet?text=${encodedMsg}`; break;
            case 'email': url = `mailto:?subject=Grow with me on Vectorise&body=${encodedMsg}`; break;
        }

        if (url) window.open(url, '_blank');
    };

    return (
        <div className="bg-[#FDFDFD] h-screen w-full font-sans overflow-hidden flex flex-col animate-fade-in selection:bg-primary/10">
            {/* COMPACT HEADER */}
            <header className="flex-shrink-0 bg-white border-b border-gray-50 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-300 hover:text-primary transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h1 className="text-sm font-black text-gray-900 tracking-tight leading-none italic">Invite</h1>
                </div>
                <div className="text-right">
                    <p className="text-[7px] font-black text-gray-300 uppercase tracking-widest">Protocol</p>
                    <p className="text-[10px] font-bold text-primary italic">Catalyst</p>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
                
                {/* CONTEXT CARD - COMPACT */}
                {targetSprint && (
                    <div className="bg-primary/5 rounded-[2rem] p-4 border border-primary/10 flex items-center gap-4 group">
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border-2 border-white">
                            <img src={targetSprint.coverImageUrl} alt="" className="w-full h-full object-cover grayscale opacity-80" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[7px] font-black text-primary uppercase tracking-widest mb-0.5">Active Target</p>
                            <h3 className="text-xs font-black text-gray-900 leading-tight truncate">{targetSprint.title}</h3>
                        </div>
                    </div>
                )}

                {/* MAIN SHARE INTERFACE */}
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-6 relative overflow-hidden flex flex-col">
                    <p className="text-[7px] font-black text-gray-300 uppercase tracking-[0.2em] mb-3 ml-1">Personal Message</p>
                    <div className="bg-gray-50 rounded-2xl p-4 text-gray-600 italic border border-gray-100 mb-6 leading-relaxed font-medium text-[11px]">
                        "{defaultMessage}"
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <button 
                            onClick={() => handleShare('whatsapp')}
                            className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 border border-green-100 rounded-xl transition-all active:scale-95"
                        >
                            <span className="text-xl">💬</span>
                            <div className="text-left">
                                <p className="font-black text-green-800 text-[9px] uppercase tracking-widest leading-none">WhatsApp</p>
                            </div>
                        </button>
                        <button 
                            onClick={() => handleShare('email')}
                            className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-all active:scale-95"
                        >
                            <span className="text-xl">✉️</span>
                            <div className="text-left">
                                <p className="font-black text-blue-800 text-[9px] uppercase tracking-widest leading-none">Email</p>
                            </div>
                        </button>
                    </div>

                    <button 
                        onClick={handleCopy}
                        className={`flex items-center justify-between p-4 border-2 rounded-2xl transition-all active:scale-95 group ${
                            copied ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100 hover:border-primary/20'
                        }`}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="text-lg">{copied ? '✅' : '🔗'}</span>
                            <div className="text-left min-w-0">
                                <p className={`font-black text-[9px] uppercase tracking-widest leading-none mb-1 ${copied ? 'text-green-800' : 'text-gray-900'}`}>
                                    {copied ? 'Link Copied' : 'Unified Invite Link'}
                                </p>
                                <p className="text-[8px] text-gray-400 font-bold tracking-tight truncate">
                                    {referralLink}
                                </p>
                            </div>
                        </div>
                        {!copied && (
                            <div className="bg-white p-1.5 rounded-lg shadow-sm border border-gray-100 group-hover:text-primary transition-colors flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                    </button>
                    
                    <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
                </div>

                <div className="text-center pt-2">
                    <Link to="/impact" className="text-[7px] font-black text-gray-300 hover:text-primary uppercase tracking-[0.3em] transition-colors">
                        View Global Impact Ledger &rarr;
                    </Link>
                </div>
            </main>

            <footer className="text-center pb-4 flex-shrink-0">
                <p className="text-[7px] font-black text-gray-200 uppercase tracking-[0.4em]">Vectorise • Catalyst Protocol v4.2</p>
            </footer>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.03); border-radius: 10px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default ReferralShare;