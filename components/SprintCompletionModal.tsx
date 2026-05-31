import React, { useState, useEffect } from 'react';
import Button from './Button';
import LocalLogo from './LocalLogo';
import confetti from 'canvas-confetti';
import { Share2, Download, Copy, Check, ChevronLeft, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SprintCompletionModalProps {
    isOpen: boolean;
    onStartNext: (rating: number) => void;
    onClose: () => void;
    sprintTitle?: string;
    streakCount?: number;
}

const THEMES = [
    {
        id: 'vectorise',
        name: 'Vectorise Forest',
        gradient: 'linear-gradient(135deg, #040d0a 0%, #081711 50%, #0e261d 100%)',
        customFont: "'Inter', sans-serif",
        textFont: "'Playfair Display', serif",
        fontLink: '',
        colors: ['#040d0a', '#10b981']
    },
    {
        id: 'lavender',
        name: 'Midnight Lavender',
        gradient: 'linear-gradient(135deg, #0f0c20 0%, #15102a 50%, #22123b 100%)',
        customFont: "'Outfit', sans-serif",
        textFont: "'Lora', serif",
        fontLink: '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&family=Lora:ital,wght@1,500&display=swap" rel="stylesheet">',
        colors: ['#0f0c20', '#a855f7']
    },
    {
        id: 'cyberpunk',
        name: 'Cyberpunk Neon',
        gradient: 'linear-gradient(135deg, #070b19 0%, #0f172a 60%, #1e1b4b 100%)',
        customFont: "'Fira Code', monospace",
        textFont: "'JetBrains Mono', monospace",
        fontLink: '<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&family=JetBrains+Mono:ital,wght@1,500&display=swap" rel="stylesheet">',
        colors: ['#070b19', '#3b82f6']
    },
    {
        id: 'sunset',
        name: 'Sunset Gold',
        gradient: 'linear-gradient(135deg, #1c0f0a 0%, #26160e 50%, #3d1c0b 100%)',
        customFont: "'Plus Jakarta Sans', sans-serif",
        textFont: "'Cinzel', serif",
        fontLink: '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&family=Cinzel:wght@600&display=swap" rel="stylesheet">',
        colors: ['#1c0f0a', '#fbbf24']
    },
    {
        id: 'crimson',
        name: 'Royal Crimson',
        gradient: 'linear-gradient(135deg, #1c0505 0%, #2a0808 50%, #441010 100%)',
        customFont: "'Space Grotesk', sans-serif",
        textFont: "'Playfair Display', serif",
        fontLink: '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">',
        colors: ['#1c0505', '#ef4444']
    }
];

const SprintCompletionModal: React.FC<SprintCompletionModalProps> = ({ 
    isOpen, 
    onStartNext, 
    onClose,
    sprintTitle = "Growth Sprint",
    streakCount = 0
}) => {
    const { user } = useAuth();
    const [rating, setRating] = useState<number>(0);
    const [viewMode, setViewMode] = useState<'main' | 'share'>('main');
    const [shareImage, setShareImage] = useState<string | null>(null);
    const [copied, setCopied] = useState<boolean>(false);
    const [outcome, setOutcome] = useState<string>('');
    const [generatingVisual, setGeneratingVisual] = useState<boolean>(false);
    const [visualImageFile, setVisualImageFile] = useState<string | null>(null);
    const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);

    useEffect(() => {
        if (isOpen) {
            setViewMode('main');
            setCopied(false);
            setOutcome('');
            setVisualImageFile(null);
            setSelectedTheme(THEMES[0]);
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

    const cardJson = JSON.stringify({
        name: user?.name?.split(' ')[0] || "Emmanuel",
        sprint_name: sprintTitle,
        outcome: outcome || "I realized I’ve been forcing a path that doesn’t align with how I naturally think and work.",
        bg_gradient: selectedTheme.gradient,
        custom_font: selectedTheme.customFont,
        text_font: selectedTheme.textFont,
        font_link: selectedTheme.fontLink,
        image: "https://via.placeholder.com/600x300"
    }, null, 2);

    const handleGenerateShareCard = () => {
        setViewMode('share');
        handleGenerateVisual();
    };

    const handleGenerateVisual = async () => {
        setGeneratingVisual(true);
        setVisualImageFile(null);
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: user?.name?.split(' ')[0] || "Emmanuel",
                    sprint_name: sprintTitle,
                    outcome: outcome || "I realized I’ve been forcing a path that doesn’t align with how I naturally think and work.",
                    bg_gradient: selectedTheme.gradient,
                    custom_font: selectedTheme.customFont,
                    text_font: selectedTheme.textFont,
                    font_link: selectedTheme.fontLink
                })
            });
            if (response.ok) {
                const res = await response.json();
                if (res.file) {
                    setVisualImageFile(res.file);
                }
            }
        } catch (e) {
            console.error('Failed to trigger Puppeteer rendering:', e);
        } finally {
            setGeneratingVisual(false);
        }
    };

    const handleCopyCaption = () => {
        navigator.clipboard.writeText(cardJson)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => {
                // Ignore or handle
            });
    };

    const handleDownload = () => {
        const blob = new Blob([cardJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `vectorise_share_card_${sprintTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.json`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const captionText = cardJson;

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

                            <div className="text-left border-t border-gray-100 pt-4">
                                <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1.5 block">
                                    What can you say about this sprint?
                                </label>
                                <textarea
                                    value={outcome}
                                    onChange={(e) => setOutcome(e.target.value)}
                                    placeholder="I realized I’ve been forcing a path that doesn’t align with how I naturally think and work..."
                                    className="w-full px-4 py-3 bg-white border border-gray-200/80 rounded-2xl text-xs font-semibold focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all resize-none h-24 mb-3"
                                />
                            </div>

                            <div className="text-left border-t border-gray-100 pt-3">
                                <label className="text-[9px] font-black text-gray-900 uppercase tracking-widest mb-2 block">
                                    Card Aesthetic Theme
                                </label>
                                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 mb-1">
                                    {THEMES.map((theme) => (
                                        <button
                                            key={theme.id}
                                            type="button"
                                            onClick={() => setSelectedTheme(theme)}
                                            className={`flex-shrink-0 p-0.5 rounded-full border-2 transition-all ${
                                                selectedTheme.id === theme.id ? 'border-primary' : 'border-transparent'
                                            }`}
                                            title={theme.name}
                                        >
                                            <div 
                                                className="w-6 h-6 rounded-full border border-gray-100 shadow-inner" 
                                                style={{ background: theme.gradient }}
                                            />
                                        </button>
                                    ))}
                                </div>
                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">
                                    Style: <span className="text-gray-900 font-black">{selectedTheme.name}</span>
                                </span>
                            </div>

                            <button
                                onClick={handleGenerateShareCard}
                                disabled={!outcome.trim()}
                                className="w-full py-3.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/95 transition-all active:scale-95 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Share2 className="w-3.5 h-3.5" /> Generate Share Card (JSON)
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
                            <Sparkles className="w-5 h-5 text-[#0E7850]" /> Share Card Generated!
                        </h3>
                        <p className="text-[10px] text-gray-400 font-medium mb-4">
                            Rendered live via headless Puppeteer and dynamic HTML templates.
                        </p>

                        {/* Live Puppeteer Image Preview */}
                        <div className="relative rounded-[1.5rem] overflow-hidden border border-gray-100 bg-gray-50/50 p-2 shadow-inner mb-4 flex flex-col items-center justify-center bg-zinc-50 min-h-[140px]">
                            {generatingVisual ? (
                                <div className="h-32 w-full flex flex-col items-center justify-center text-[10px] font-black text-gray-400 uppercase tracking-widest gap-2">
                                    <div className="w-5 h-5 border-2 border-[#0E7850] border-t-transparent rounded-full animate-spin"></div>
                                    <span className="animate-pulse">Rendering visual on server...</span>
                                </div>
                            ) : visualImageFile ? (
                                <div className="w-full flex flex-col items-center p-1">
                                    <img 
                                        src={`/api/output/${visualImageFile}`} 
                                        referrerPolicy="no-referrer"
                                        alt="Puppeteer Share Card" 
                                        className="w-full max-h-44 object-contain rounded-xl shadow-md border border-gray-100"
                                    />
                                    <a
                                        href={`/api/output/${visualImageFile}`}
                                        download={`vectorise_sprint_card_${visualImageFile}`}
                                        className="mt-2 text-[9px] font-black text-[#0E7850] hover:text-[#0b5c3e] transition-colors uppercase tracking-widest flex items-center gap-1.5"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Save Shareable PNG
                                    </a>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGenerateVisual}
                                    className="h-28 w-full flex flex-col items-center justify-center text-[10px] font-black text-[#0E7850] uppercase tracking-widest hover:bg-emerald-50/40 rounded-2xl transition-all"
                                >
                                    <Sparkles className="w-4 h-4 mb-1 text-amber-500 animate-pulse" /> Regenerate Visual Card Base
                                </button>
                            )}
                        </div>

                        {/* JSON Data Preview */}
                        <div className="relative rounded-[1.5rem] overflow-hidden border border-gray-100 bg-gray-50/50 p-4 shadow-inner mb-4 flex flex-col items-stretch text-left">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">json data payload</span>
                            <pre className="text-[9px] font-mono text-gray-600 bg-white/80 p-2.5 rounded-xl border border-gray-100 overflow-x-auto max-h-24 whitespace-pre custom-scrollbar">
                                {cardJson}
                            </pre>
                        </div>

                        <div className="space-y-2.5">
                            <button
                                onClick={handleDownload}
                                className="w-full py-3.5 bg-[#0E7850] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#0b5c3e] transition-all active:scale-95 shadow-md"
                            >
                                <Download className="w-4 h-4" /> Download JSON Card
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
                                        <Check className="w-4 h-4" /> JSON Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" /> Copy JSON String
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
