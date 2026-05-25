import React, { useState, useEffect } from 'react';
import Button from './Button';
import LocalLogo from './LocalLogo';
import confetti from 'canvas-confetti';
import { Share2, Download, Copy, Check, ChevronLeft, Sparkles } from 'lucide-react';

interface SprintCompletionModalProps {
    isOpen: boolean;
    onStartNext: (rating: number) => void;
    onClose: () => void;
    sprintTitle?: string;
    streakCount?: number;
}

const SprintCompletionModal: React.FC<SprintCompletionModalProps> = ({ 
    isOpen, 
    onStartNext, 
    onClose,
    sprintTitle = "Growth Sprint",
    streakCount = 0
}) => {
    const [rating, setRating] = useState<number>(0);
    const [viewMode, setViewMode] = useState<'main' | 'share'>('main');
    const [shareImage, setShareImage] = useState<string | null>(null);
    const [copied, setCopied] = useState<boolean>(false);

    useEffect(() => {
        if (isOpen) {
            // High intensity, beautiful premium celebration effect with waves of confetti
            const duration = 4 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 35, spread: 360, ticks: 70, zIndex: 1000, scalar: 1.2 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(() => {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 60 * (timeLeft / duration);
                
                // Explode colored circles from both left and right sides of the screen
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                    colors: ['#0E7850', '#159E6A', '#34D399', '#FCD34D', '#10B981']
                });
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                    colors: ['#0E7850', '#159E6A', '#34D399', '#3B82F6', '#6366F1']
                });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [isOpen]);

    // Reset view when modal is closed or opened
    useEffect(() => {
        if (!isOpen) {
            setViewMode('main');
            setShareImage(null);
            setCopied(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

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
    };

    const handleGenerateShareCard = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setViewMode('share');
        setShareImage(null);

        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        bgImg.src = '/achievement-bg.png';

        const drawContent = () => {
            // 1. Gorgeous Dark Background Gradient Fallback
            const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
            grad.addColorStop(0, '#040d0a');
            grad.addColorStop(0.5, '#081711');
            grad.addColorStop(1, '#0e261d');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1080, 1080);

            // Draw background image if successfully loaded
            try {
                if (bgImg.complete && bgImg.naturalWidth > 0) {
                    ctx.drawImage(bgImg, 0, 0, 1080, 1080);
                }
            } catch(e) {
                console.warn("CORS/Image loading error, falling back to gradient", e);
            }

            // Glassmorphic dark layout overlay for premium contrast
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fillRect(0, 0, 1080, 1080);

            // 2. Linear texture / Grid lines (Vibe of systematic daily tracking)
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.04)';
            ctx.lineWidth = 1;
            for (let i = 80; i < 1080; i += 80) {
                ctx.beginPath();
                ctx.moveTo(i, 0); ctx.lineTo(i, 1080);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, i); ctx.lineTo(1080, i);
                ctx.stroke();
            }

            // Translucent background circles
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
            ctx.lineWidth = 1.5;
            const circleRadii = [160, 300, 440, 580, 740];
            circleRadii.forEach(r => {
                ctx.beginPath();
                ctx.arc(540, 540, r, 0, Math.PI * 2);
                ctx.stroke();
            });

            // 3. Perfect borders with custom alignment corners
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
            ctx.lineWidth = 2;
            ctx.strokeRect(40, 40, 1000, 1000);

            // Corner accents
            ctx.strokeStyle = '#FCD34D'; // Amber gold corner tabs
            ctx.lineWidth = 4;
            const markerLength = 30;
            // Top Left
            ctx.beginPath(); ctx.moveTo(40, 40 + markerLength); ctx.lineTo(40, 40); ctx.lineTo(40 + markerLength, 40); ctx.stroke();
            // Top Right
            ctx.beginPath(); ctx.moveTo(1040, 40 + markerLength); ctx.lineTo(1040, 40); ctx.lineTo(1040 - markerLength, 40); ctx.stroke();
            // Bottom Left
            ctx.beginPath(); ctx.moveTo(40, 1040 - markerLength); ctx.lineTo(40, 1040); ctx.lineTo(40 + markerLength, 1040); ctx.stroke();
            // Bottom Right
            ctx.beginPath(); ctx.moveTo(1040, 1040 - markerLength); ctx.lineTo(1040, 1040); ctx.lineTo(1040 - markerLength, 1040); ctx.stroke();

            // 4. Header branding
            ctx.fillStyle = '#10B981';
            ctx.font = 'bold 22px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText('⚡ V E C T O R I S E   A C H I E V E M E N T ⚡', 540, 115);

            // 5. Glowing Streak Ring
            const centerX = 540;
            const centerY = 370;
            const radius = 120;

            const ringGrad = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
            ringGrad.addColorStop(0, '#FCD34D');
            ringGrad.addColorStop(0.5, '#34D399');
            ringGrad.addColorStop(1, '#60A5FA');

            ctx.shadowColor = '#10B981';
            ctx.shadowBlur = 40;
            ctx.strokeStyle = ringGrad;
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            ctx.strokeStyle = 'rgba(252, 211, 77, 0.2)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius - 15, 0, Math.PI * 2);
            ctx.stroke();

            // Streak count number
            const formattedStreak = streakCount < 10 && streakCount > 0 ? `0${streakCount}` : `${streakCount}`;
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 85px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(formattedStreak, centerX, centerY - 10);

            // Label
            ctx.fillStyle = '#34D399';
            ctx.font = 'bold 18px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
            ctx.fillText('D A Y   S T R E A K', centerX, centerY + 45);

            // 6. Sprint Info Card Container
            const boxX = 140;
            const boxY = 570;
            const boxW = 800;
            const boxH = 340;
            const rBox = 30;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(boxX, boxY, boxW, boxH, rBox);
            } else {
                ctx.rect(boxX, boxY, boxW, boxH);
            }
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#FCD34D';
            ctx.font = '900 16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
            ctx.fillText('S P R I N T   C O M P L E T E D', 540, 635);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillRect(490, 655, 100, 2);

            // Sprint Title wrapping with very bold and creative styling
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 italic 38px Jost, sans-serif';
            wrapText(ctx, sprintTitle, 540, 715, 700, 52);

            // 7. Footer details
            ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
            ctx.font = 'bold 18px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
            ctx.fillText('vectorise.app', 540, 990);

            ctx.fillStyle = '#9CA3AF';
            ctx.font = 'italic 14px system-ui, -apple-system, sans-serif';
            ctx.fillText('Dynamic cognitive transformation via daily structured execution sprints.', 540, 1022);

            try {
                const imgData = canvas.toDataURL('image/png');
                setShareImage(imgData);
            } catch (e) {
                console.error("Canvas export failed", e);
            }
        };

        bgImg.onload = () => {
            drawContent();
        };
        bgImg.onerror = () => {
            drawContent();
        };

        if (bgImg.complete) {
            drawContent();
        } else {
            setTimeout(() => {
                if (!shareImage) {
                    drawContent();
                }
            }, 1500);
        }
    };

    const handleCopyCaption = () => {
        const caption = `⚡ Just completed the sprint: "${sprintTitle}" on Vectorise! Running on a ${streakCount}-day streak of focused daily iteration. \n\nHabits build systems. Systems build results. 💫\n\n#Vectorise #DailySprints #HabitDesign`;
        
        navigator.clipboard.writeText(caption)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => {
                // Ignore or handle
            });
    };

    const handleDownload = () => {
        if (!shareImage) return;
        const link = document.createElement('a');
        link.download = `vectorise_achievement_${sprintTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.png`;
        link.href = shareImage;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const captionText = `⚡ Just completed the sprint: "${sprintTitle}" on Vectorise! Running on a ${streakCount}-day streak of focused daily iteration. \n\nHabits build systems. Systems build results. 💫\n\n#Vectorise #DailySprints #HabitDesign`;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden animate-slide-up flex flex-col transition-all duration-300">
                
                {viewMode === 'main' ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <LocalLogo type="favicon" className="w-10 h-10" />
                        </div>
                        
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight italic mb-2">
                            Sprint Completed
                        </h2>
                        <p className="text-xs text-gray-400 font-medium leading-relaxed mb-6">
                            You showed up and finished strong. That matters.
                        </p>

                        {/* Interactive Area: Ratings and Share */}
                        <div className="mb-6 space-y-5 bg-gray-50/50 p-5 rounded-[2rem] border border-gray-100">
                            <div>
                                <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-3">
                                    How effective was this sprint for your growth?
                                </p>
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setRating(star)}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                                rating >= star 
                                                    ? 'bg-primary text-white shadow-lg scale-110' 
                                                    : 'bg-white text-gray-300 hover:bg-gray-100 border border-gray-100'
                                            }`}
                                        >
                                            <span className="text-sm font-black">{star}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleGenerateShareCard}
                                className="w-full py-3 bg-emerald-50 text-[#0E7850] rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-100/50 transition-all active:scale-95 shadow-sm"
                            >
                                <Share2 className="w-3.5 h-3.5" /> Share Achievement
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="text-center">
                                <p className="text-[10px] text-gray-400 font-medium italic">
                                    What you do next is what compounds it.
                                </p>
                            </div>
                            <Button 
                                onClick={() => onStartNext(rating)}
                                disabled={rating === 0}
                                className={`w-full py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all ${rating === 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                            >
                                Start your next sprint &rarr;
                            </Button>
                            <button 
                                onClick={onClose}
                                className="text-[9px] font-black text-gray-300 hover:text-gray-500 uppercase tracking-widest transition-colors block mx-auto pt-1"
                            >
                                I'll decide later
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center flex flex-col h-full animate-fade-in">
                        {/* Header of Share */}
                        <div className="flex items-center gap-2 mb-4">
                            <button 
                                onClick={() => setViewMode('main')}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                                title="Back to completion"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Social Share Ready
                            </span>
                        </div>

                        <h3 className="text-xl font-black text-gray-900 tracking-tight italic mb-1 flex items-center justify-center gap-1.5">
                            <Sparkles className="w-5 h-5 text-[#0E7850]" /> Share Achievement!
                        </h3>
                        <p className="text-[10px] text-gray-400 font-medium mb-4">
                            Your personalized image card has been generated.
                        </p>

                        {/* Image Preview */}
                        <div className="relative rounded-[1.5rem] overflow-hidden border border-gray-100 bg-gray-50/50 p-2 shadow-inner mb-4 flex items-center justify-center">
                            {shareImage ? (
                                <img 
                                    src={shareImage} 
                                    referrerPolicy="no-referrer"
                                    alt="Achievement Preview" 
                                    className="w-full aspect-square rounded-[1.2rem] object-contain shadow-md"
                                />
                            ) : (
                                <div className="h-44 w-full flex items-center justify-center text-xs font-bold text-gray-300 animate-pulse uppercase tracking-widest">
                                    Compiling canvas...
                                </div>
                            )}
                        </div>

                        {/* Caption Box with manual select selection box fallback */}
                        <div className="mb-5 text-left">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">
                                Caption text copy helper
                            </p>
                            <div className="relative bg-gray-50 rounded-xl p-3 border border-gray-100 text-[11px] font-medium text-gray-500 leading-normal h-24 overflow-y-auto select-all">
                                {captionText}
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <button
                                onClick={handleDownload}
                                className="w-full py-3.5 bg-[#0E7850] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#0b5c3e] transition-all active:scale-95 shadow-md"
                            >
                                <Download className="w-4 h-4" /> Download Card Image
                            </button>
                            <button
                                onClick={handleCopyCaption}
                                className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                    copied 
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                        : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'
                                }`}
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4" /> Caption Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" /> Copy Caption Message
                                    </>
                                )}
                            </button>
                            
                            <button
                                onClick={() => setViewMode('main')}
                                className="text-[9px] font-black text-gray-300 hover:text-gray-500 uppercase tracking-widest transition-colors pt-2 block mx-auto"
                            >
                                Back to Completion Rating
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

export default SprintCompletionModal;
