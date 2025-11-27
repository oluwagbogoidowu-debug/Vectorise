
import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/Button';

const ReferralSuccess: React.FC = () => {
    return (
        <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 text-center relative overflow-hidden">
                {/* Confetti / Decor */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-blue-500"></div>
                
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                    <span className="text-4xl">🌱</span>
                </div>
                
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">You Helped Someone Start</h1>
                <p className="text-gray-600 text-lg mb-8">
                    <span className="font-bold text-gray-900">Musa</span> just joined through your invite. Your influence matters more than you think.
                </p>

                <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-6 mb-8 text-left">
                    <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider mb-2">Reward Unlocked</p>
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">🎁</span>
                        <div>
                            <h3 className="font-bold text-gray-900">1 Extra Reflection Prompt</h3>
                            <p className="text-sm text-gray-600">Added to your library to help deepen your own growth.</p>
                        </div>
                    </div>
                </div>

                <Link to="/impact">
                    <Button className="w-full py-4 text-lg shadow-lg">View Impact Dashboard &rarr;</Button>
                </Link>
            </div>
        </div>
    );
};

export default ReferralSuccess;