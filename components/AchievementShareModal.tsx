import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Share2, Download, Copy, Check, ChevronLeft, Sparkles, X, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AchievementShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    milestoneId: string;
    milestoneTitle: string;
    points: number;
}

const AchievementShareModal: React.FC<AchievementShareModalProps> = ({
    isOpen,
    onClose,
    milestoneId,
    milestoneTitle,
    points
}) => {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<'main' | 'share'>('main');
    const [shareImage, setShareImage] = useState<string | null>(null);
    const [copied, setCopied] = useState<boolean>(false);
    const [canvasLoading, setCanvasLoading] = useState<boolean>(true);

    const userName = user?.name || 'Emmanuel';

    // Customize the bold creative achievement text based on the badge ID or name
    const achievementText = milestoneId === 's2' 
        ? "I completed my first sprint on Vectorise"
        : `I unlocked "${milestoneTitle}" & earned +${points} Coins on Vectorise`;

    useEffect(() => {
        if (isOpen) {
            setViewMode('main');
            setShareImage(null);
            setCopied(false);
            setCanvasLoading(true);

            // Confetti launch celebration
            const duration = 3 * 1000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 4,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#0E7850', '#10B981', '#34D399', '#FCD34D']
                });
                confetti({
                    particleCount: 4,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#0E7850', '#10B981', '#34D399', '#3B82F6']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };
            frame();
        }
    }, [isOpen]);

    const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const words = text.split(' ');
        let line = '';
        const lines = [];

        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            let testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i].trim(), x, y + (i * lineHeight));
        }
        return lines.length;
    };

    const handleGenerateShareCard = () => {
        setViewMode('share');
        setCanvasLoading(true);

        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bgImg = new Image();
        bgImg.src = '/achievement_bg.png';
        
        // Handle image loading
        bgImg.onload = () => {
            // 1. Draw downloaded background image
            ctx.drawImage(bgImg, 0, 0, 1080, 1080);

            // Add subtle premium overlay mask to ensure typography pop
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fillRect(0, 0, 1080, 1080);

            // 2. Vectorise Watermark Logo Design at top/center
            // Draw double interlocking circle watermark path
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(540, 130, 32, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(252, 211, 77, 0.3)';
            ctx.beginPath();
            ctx.arc(540, 142, 32, 0, Math.PI * 2);
            ctx.stroke();

            // Watermark Logo Text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'black 900 24px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.letterSpacing = '12px';
            ctx.fillText('VECTORISE', 546, 210);

            // Subtle sub-watermark line
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = 'bold 11px ui-monospace, SFMono-Regular, monospace';
            ctx.letterSpacing = '6px';
            ctx.fillText('HABIT ARCHITECTURE PLATFORM', 543, 235);

            // 3. User Portrait Circle/Initials Accent
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(540, 420, 68, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
            ctx.beginPath();
            ctx.arc(540, 420, 64, 0, Math.PI * 2);
            ctx.fill();

            // Inner Crown / Star indicator representing achievement
            ctx.fillStyle = '#FCD34D';
            ctx.font = 'bold 45px system-ui, -apple-system, sans-serif';
            ctx.fillText('★', 540, 435);

            // 4. Participant Name
            ctx.fillStyle = '#FCD34D'; // Elegant Golden Amber tone
            ctx.font = 'italic bold 32px system-ui, -apple-system, sans-serif';
            ctx.letterSpacing = '1px';
            ctx.fillText(userName, 540, 550);

            // Subtle "unlocked the milestone" text
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = 'bold 14px ui-monospace, SFMono-Regular, monospace';
            ctx.letterSpacing = '4px';
            ctx.fillText('OFFICIAL ACHIEVEMENT RECORD', 540, 595);

            // 5. Creative and Bold Achievement Text
            // Main glowing glassmorphic background box in the lower half
            const boxX = 120;
            const boxY = 640;
            const boxW = 840;
            const boxH = 290;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
            ctx.lineWidth = 2;
            
            // Draw a rounded rectangle for the text showcase box
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(boxX, boxY, boxW, boxH, 24);
            } else {
                ctx.rect(boxX, boxY, boxW, boxH);
            }
            ctx.fill();
            ctx.stroke();

            // Accent Corner Tabs for Box
            ctx.strokeStyle = '#FCD34D';
            ctx.lineWidth = 4;
            const tabLen = 20;
            // Top Left corner of text box
            ctx.beginPath(); ctx.moveTo(boxX, boxY + tabLen); ctx.lineTo(boxX, boxY); ctx.lineTo(boxX + tabLen, boxY); ctx.stroke();
            // Bottom Right corner of text box
            ctx.beginPath(); ctx.moveTo(boxX + boxW, boxY + boxH - tabLen); ctx.lineTo(boxX + boxW, boxY + boxH); ctx.lineTo(boxX + boxW - tabLen, boxY + boxH); ctx.stroke();

            // Drawing Creative Achievement message in Bold & Stylish Display Font
            ctx.shadowColor = '#10B981';
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#FFFFFF';
            // Creative, very bold and stylish display fonts pairing
            ctx.font = 'black uppercase 900 42px system-ui, -apple-system, sans-serif';
            ctx.letterSpacing = '1px';
            ctx.textBaseline = 'middle';
            wrapText(ctx, achievementText, 540, 785, 740, 55);

            // Stop glow for lower footer elements
            ctx.shadowBlur = 0;

            // 6. Verification Details / Footer
            ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
            ctx.font = 'black 900 16px ui-monospace, SFMono-Regular, monospace';
            ctx.letterSpacing = '3px';
            ctx.fillText('VERIFIED VIA VECTORISE LEDGER', 540, 1010);

            const imgData = canvas.toDataURL('image/png');
            setShareImage(imgData);
            setCanvasLoading(false);
        };

        bgImg.onerror = () => {
            console.error('Error loading background image, generating backup card format...');
            // Fallback layout using standard gradients in case the image fails
            ctx.fillStyle = '#0F172A';
            ctx.fillRect(0, 0, 1080, 1080);
            
            // Draw simple watermark and logo
            ctx.fillStyle = '#10B981';
            ctx.font = 'bold 28px sans-serif';
            ctx.fillText('VECTORISE', 540, 200);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'black 900 45px sans-serif';
            wrapText(ctx, achievementText, 540, 540, 800, 60);

            const imgData = canvas.toDataURL('image/png');
            setShareImage(imgData);
            setCanvasLoading(false);
        };
    };

    const handleCopyCaption = () => {
        const caption = `🎯 Milestone Reached! I just unlocked the "${milestoneTitle}" achievement on Vectorise. \n\nBuilding daily cognitive habit structures and earning Credits! 🚀\n\n#Vectorise #CognitiveArchitecture #RiseEveryDay #HabitLedger`;
        navigator.clipboard.writeText(caption)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
    };

    const handleDownload = () => {
        if (!shareImage) return;
        const link = document.createElement('a');
        link.download = `vectorise_badge_${milestoneId.toLowerCase()}.png`;
        link.href = shareImage;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    const captionText = `🎯 Milestone Reached! I just unlocked the "${milestoneTitle}" achievement on Vectorise. \n\nBuilding daily cognitive habit structures and earning Credits! 🚀\n\n#Vectorise #CognitiveArchitecture #RiseEveryDay #HabitLedger`;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden animate-slide-up flex flex-col transition-all duration-300">
                
                {/* Close Button Top Right */}
                <button 
                    onClick={onClose}
                    className="absolute right-5 top-5 p-2 bg-gray-50 dark:bg-zinc-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full z-10 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                {viewMode === 'main' ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-[#0E7850]/10 rounded-2.5xl flex items-center justify-center mx-auto mb-6">
                            <Award className="w-9 h-9 text-[#0E7850]" />
                        </div>
                        
                        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-tight uppercase mb-2">
                            Milestone Claimed!
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-6">
                            You claimed <span className="text-[#0E7850] dark:text-emerald-400 font-bold">+{points} Coins</span> for unlocking the <strong className="text-gray-900 dark:text-gray-100 font-bold">"{milestoneTitle}"</strong> achievement.
                        </p>

                        <div className="space-y-4 mb-2">
                            <button
                                onClick={handleGenerateShareCard}
                                className="w-full py-4 bg-[#0E7850] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#0b5c3e] transition-all active:scale-95 shadow-lg shadow-[#0E7850]/10"
                            >
                                <Share2 className="w-3.5 h-3.5" /> Share Achievement Card
                            </button>
                            
                            <button 
                                onClick={onClose}
                                className="w-full py-3.5 bg-gray-50 dark:bg-zinc-900 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors"
                            >
                                Keep Building
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center flex flex-col h-full animate-fade-in">
                        {/* Header back navigation */}
                        <div className="flex items-center gap-2 mb-4">
                            <button 
                                onClick={() => setViewMode('main')}
                                className="p-1.5 bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                Social Share Engine
                            </span>
                        </div>

                        <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 tracking-tight uppercase mb-1 flex items-center justify-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-[#0E7850] animate-pulse" /> Double Interlocking Card
                        </h3>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mb-4">
                            Your official high-fashion background card is generated below.
                        </p>

                        {/* Card Image Canvas Preview */}
                        <div className="relative rounded-[1.5rem] overflow-hidden border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 p-2 shadow-inner mb-4 flex items-center justify-center min-h-[220px]">
                            {shareImage ? (
                                <img 
                                    src={shareImage} 
                                    referrerPolicy="no-referrer"
                                    alt="Personalized Achievement Banner" 
                                    className="w-full aspect-square rounded-[1.2rem] object-contain shadow-md"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 text-center text-gray-300 dark:text-zinc-600">
                                    <div className="w-8 h-8 border-2 border-[#0E7850] border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-[8px] font-black uppercase tracking-widest animate-pulse">
                                        Synthesizing Canvas Artwork...
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Copycaption text component */}
                        <div className="mb-5 text-left">
                            <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 px-1">
                                Share Caption Text
                            </p>
                            <div className="bg-gray-50 dark:bg-zinc-900 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-zinc-800 rounded-xl p-3 text-[10px] font-medium leading-normal h-16 overflow-y-auto select-all">
                                {captionText}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <button
                                onClick={handleDownload}
                                disabled={canvasLoading}
                                className="w-full py-3.5 bg-[#0E7850] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#0b5c3e] transition-all active:scale-95 shadow-md disabled:opacity-50"
                            >
                                <Download className="w-4 h-4" /> Download Card
                            </button>
                            <button
                                onClick={handleCopyCaption}
                                className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                    copied 
                                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/10' 
                                        : 'bg-white dark:bg-zinc-950 text-gray-600 dark:text-gray-300 border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900'
                                }`}
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4" /> Caption Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" /> Copy Caption
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default AchievementShareModal;
