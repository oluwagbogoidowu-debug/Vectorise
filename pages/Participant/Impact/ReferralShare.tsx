import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Participant } from '../../../types';
import Button from '../../../components/Button';

const ReferralShare: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);

    if (!user) return null;
    const participant = user as Participant;
    const referralCode = participant.referralCode || 'GROWTH';
    const referralLink = `https://vectorise.com/join/${referralCode}`;
    const defaultMessage = `I found a platform that helps me stay consistent with my growth. Join me on this sprint — let’s grow together. ${referralLink}`;

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
                url = `mailto:?subject=Join me on Vectorise&body=${encodedMsg}`;
                break;
        }

        if (url) window.open(url, '_blank');
    };

    return (
        <div className="max-w-xl mx-auto px-4 py-8">
            <button 
                onClick={() => navigate('/impact')} 
                className="group flex items-center text-gray-500 hover:text-primary transition-colors mb-6 text-sm font-medium"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
            </button>

            <div className="text-center mb-10">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Invite Someone to Grow</h1>
                <p className="text-gray-600 text-lg">Share your link with a friend who’s ready to start their own journey.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                <p className="text-xs font-bold text-gray-400 uppercase mb-3">Your Message</p>
                <div className="bg-gray-50 rounded-xl p-4 text-gray-700 italic border border-gray-200 mb-6">
                    "{defaultMessage}"
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => handleShare('whatsapp')}
                        className="flex flex-col items-center justify-center p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors gap-2"
                    >
                        <span className="text-2xl">💬</span>
                        <span className="font-bold text-green-800 text-sm">WhatsApp</span>
                    </button>
                     <button 
                        onClick={() => handleShare('email')}
                        className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors gap-2"
                    >
                        <span className="text-2xl">✉️</span>
                        <span className="font-bold text-blue-800 text-sm">Email</span>
                    </button>
                    <button 
                        onClick={handleCopy}
                        className="col-span-2 flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors gap-2"
                    >
                        {copied ? (
                             <>
                                <span className="text-2xl">✅</span>
                                <span className="font-bold text-green-600 text-sm">Copied to Clipboard</span>
                             </>
                        ) : (
                             <>
                                <span className="text-2xl">🔗</span>
                                <span className="font-bold text-gray-700 text-sm">Copy Link</span>
                             </>
                        )}
                    </button>
                </div>
            </div>

            {/* Simulation for Demo Purposes */}
            <div className="text-center pt-8 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-4 uppercase">Demo Options</p>
                <Link to="/impact/success">
                    <button className="text-sm text-gray-500 hover:text-primary underline">
                        Simulate Friend Joining (View Success Screen)
                    </button>
                </Link>
            </div>
        </div>
    );
};

export default ReferralShare;