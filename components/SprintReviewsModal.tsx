import React, { useState, useEffect, useMemo } from 'react';
import { X, Star, Sparkles, MessageSquare, Search, ArrowLeft, Filter, CheckCircle2, User, Calendar } from 'lucide-react';
import { Sprint, Review } from '../types';
import { sprintService } from '../services/sprintService';

interface SprintReviewsModalProps {
    isOpen: boolean;
    sprint: Sprint | null;
    onClose: () => void;
}

const SprintReviewsModal: React.FC<SprintReviewsModalProps> = ({
    isOpen,
    sprint,
    onClose
}) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [selectedStarFilter, setSelectedStarFilter] = useState<number | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');

    // Subscribe to reviews in real-time when modal opens
    useEffect(() => {
        if (!isOpen || !sprint) {
            setReviews([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setSelectedStarFilter('all');
        setSearchQuery('');
        setSortBy('newest');

        const unsubscribe = sprintService.subscribeToSprintReviews(sprint.id, (data) => {
            setReviews(data);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen, sprint]);

    // Compute stats
    const stats = useMemo(() => {
        if (!reviews || reviews.length === 0) {
            return {
                avg: 0,
                count: 0,
                distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            };
        }

        const count = reviews.length;
        const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
        const avg = Number((sum / count).toFixed(1));

        const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => {
            const score = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
            dist[score] = (dist[score] || 0) + 1;
        });

        return {
            avg,
            count,
            distribution: dist
        };
    }, [reviews]);

    // Filter and sort reviews
    const filteredReviews = useMemo(() => {
        return reviews
            .filter((r) => {
                if (selectedStarFilter !== 'all') {
                    const roundedRating = Math.round(Number(r.rating) || 5);
                    if (roundedRating !== selectedStarFilter) return false;
                }

                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const nameMatch = r.userName?.toLowerCase().includes(q);
                    const commentMatch = r.comment?.toLowerCase().includes(q);
                    if (!nameMatch && !commentMatch) return false;
                }

                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'newest') {
                    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                    return timeB - timeA;
                }
                if (sortBy === 'highest') {
                    return (b.rating || 5) - (a.rating || 5);
                }
                if (sortBy === 'lowest') {
                    return (a.rating || 5) - (b.rating || 5);
                }
                return 0;
            });
    }, [reviews, selectedStarFilter, searchQuery, sortBy]);

    if (!isOpen || !sprint) return null;

    const coverUrl = sprint.coverImageUrl || sprint.blogImage || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80';

    return (
        <div className="fixed inset-0 z-[500] bg-[#FDFDFD] dark:bg-zinc-950 flex flex-col overflow-y-auto animate-fade-in text-gray-900 dark:text-white select-text">
            {/* TOP BAR / COVER BANNER (FULL BLEED) */}
            <div className="relative w-full bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
                {/* Background image & gradient */}
                <div className="absolute inset-0 overflow-hidden opacity-30">
                    <img 
                        src={coverUrl} 
                        className="w-full h-full object-cover blur-sm scale-105" 
                        alt="" 
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-zinc-950" />
                </div>

                {/* Floating Close / Back Buttons */}
                <div className="relative z-20 max-w-5xl mx-auto px-6 pt-6 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-white/10"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-white/10"
                        title="Close Reviews"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sprint Header Info */}
                <div className="relative z-10 max-w-5xl mx-auto px-6 pt-6 pb-10 text-white">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="px-2.5 py-1 bg-[#0E7850] text-emerald-100 text-[9px] font-black uppercase tracking-widest rounded-lg">
                            Sprint Reviews
                        </span>
                        <span className="px-2.5 py-1 bg-white/10 text-white/80 text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/10">
                            {sprint.duration || 1} {sprint.duration === 1 ? 'Move' : 'Moves'}
                        </span>
                        {sprint.category && (
                            <span className="px-2.5 py-1 bg-white/10 text-white/80 text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/10">
                                {sprint.category}
                            </span>
                        )}
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight mb-3">
                        {sprint.title}
                    </h1>

                    {sprint.subtitle && (
                        <p className="text-sm md:text-base text-white/70 font-medium max-w-2xl leading-relaxed">
                            {sprint.subtitle}
                        </p>
                    )}

                    {/* Overall Rating & Summary Banner */}
                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/15">
                        <div className="flex items-center gap-4 sm:border-r border-white/15 pr-4">
                            <div className="text-4xl md:text-5xl font-black text-amber-400">
                                {stats.count > 0 ? stats.avg.toFixed(1) : '—'}
                            </div>
                            <div>
                                <div className="flex items-center text-amber-400 text-sm mb-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={`w-4 h-4 ${
                                                stats.count > 0 && star <= Math.round(stats.avg)
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : 'text-white/30'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                                    Average Rating
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center sm:border-r border-white/15 px-2">
                            <div className="text-2xl md:text-3xl font-black text-white">
                                {stats.count}
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                                Total Completion Reviews
                            </p>
                        </div>

                        <div className="flex flex-col justify-center space-y-1 text-[10px] font-bold text-white/80">
                            {[5, 4, 3, 2, 1].map((ratingVal) => {
                                const countForStar = stats.distribution[ratingVal] || 0;
                                const percent = stats.count > 0 ? Math.round((countForStar / stats.count) * 100) : 0;
                                return (
                                    <div key={ratingVal} className="flex items-center gap-2">
                                        <span className="w-5 text-right font-black">{ratingVal}★</span>
                                        <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                        <span className="w-8 text-right text-white/60">{countForStar}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 pb-32">
                {/* TOOLBAR: FILTERS, SEARCH, SORT */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
                    {/* Star filter chips */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <button
                            type="button"
                            onClick={() => setSelectedStarFilter('all')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
                                selectedStarFilter === 'all'
                                    ? 'bg-primary text-white border-primary shadow-sm'
                                    : 'bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-zinc-800 hover:border-primary/40'
                            }`}
                        >
                            All ({stats.count})
                        </button>
                        {[5, 4, 3, 2, 1].map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setSelectedStarFilter(s)}
                                className={`flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
                                    selectedStarFilter === s
                                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                        : 'bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-zinc-800 hover:border-amber-400/40'
                                }`}
                            >
                                <span>{s}</span>
                                <Star className={`w-3.5 h-3.5 ${selectedStarFilter === s ? 'fill-white text-white' : 'fill-amber-400 text-amber-400'}`} />
                                <span className="opacity-70">({stats.distribution[s] || 0})</span>
                            </button>
                        ))}
                    </div>

                    {/* Search & Sort Controls */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 md:w-56">
                            <Search className="w-4 h-4 text-gray-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search participant or feedback..."
                                className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            aria-label="Sort reviews"
                            className="px-3.5 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-gray-700 dark:text-zinc-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none cursor-pointer"
                        >
                            <option value="newest">Newest First</option>
                            <option value="highest">Highest Rating</option>
                            <option value="lowest">Lowest Rating</option>
                        </select>
                    </div>
                </div>

                {/* REVIEWS LIST */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">
                            Loading sprint reviews...
                        </p>
                    </div>
                ) : filteredReviews.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {filteredReviews.map((rev) => {
                            const dateString = rev.timestamp
                                ? new Date(rev.timestamp).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                  })
                                : 'Recent completion';

                            const initial = rev.userName?.charAt(0).toUpperCase() || 'P';

                            return (
                                <div
                                    key={rev.id}
                                    className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 md:p-7 border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                                >
                                    <div>
                                        {/* Review Header: User & Rating */}
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {rev.userAvatar ? (
                                                    <img
                                                        src={rev.userAvatar}
                                                        alt={rev.userName}
                                                        className="w-11 h-11 rounded-2xl object-cover border border-gray-100 dark:border-zinc-800 shadow-sm shrink-0"
                                                        referrerPolicy="no-referrer"
                                                        onError={(e) => {
                                                            (e.currentTarget as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-11 h-11 rounded-2xl bg-[#0E7850]/10 text-[#0E7850] dark:bg-[#0E7850]/20 dark:text-emerald-400 font-black text-sm flex items-center justify-center border border-[#0E7850]/20 shrink-0">
                                                        {initial}
                                                    </div>
                                                )}

                                                <div className="min-w-0">
                                                    <h3 className="font-black text-gray-900 dark:text-white text-sm truncate tracking-tight">
                                                        {rev.userName || 'Participant'}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                                                        <Calendar className="w-3 h-3 text-gray-400" />
                                                        <span>{dateString}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stars & Score */}
                                            <div className="flex flex-col items-end shrink-0">
                                                <div className="flex items-center gap-0.5 text-amber-400">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            className={`w-4 h-4 ${
                                                                star <= Number(rev.rating || 5)
                                                                    ? 'fill-amber-400 text-amber-400'
                                                                    : 'text-gray-200 dark:text-zinc-700'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 mt-1 uppercase tracking-widest">
                                                    {Number(rev.rating || 5).toFixed(1)} / 5.0
                                                </span>
                                            </div>
                                        </div>

                                        {/* Feedback / Comment */}
                                        {rev.comment ? (
                                            <div className="p-4 bg-gray-50/70 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800/80 mb-4">
                                                <p className="text-xs md:text-sm text-gray-700 dark:text-zinc-300 font-medium leading-relaxed italic">
                                                    "{rev.comment}"
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-gray-50/40 dark:bg-zinc-800/30 rounded-xl border border-dashed border-gray-200 dark:border-zinc-800 mb-4">
                                                <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-medium italic">
                                                    Participant completed with {rev.rating || 5}★ rating.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer Verification Badge */}
                                    <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                        <div className="flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>Verified Sprint Completion</span>
                                        </div>
                                        <span className="text-gray-400 dark:text-zinc-500 font-bold">
                                            {sprint.title}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white dark:bg-zinc-900 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-zinc-800 p-8">
                        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500">
                            <MessageSquare className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
                            {selectedStarFilter !== 'all' || searchQuery
                                ? 'No matching reviews found'
                                : 'No reviews sent yet for this sprint'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                            {selectedStarFilter !== 'all' || searchQuery
                                ? 'Try adjusting your search query or rating filter to see other student reviews.'
                                : 'When participants complete this sprint, their star ratings and experience feedback submitted at the finish line will appear here in real-time.'}
                        </p>
                        {(selectedStarFilter !== 'all' || searchQuery) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedStarFilter('all');
                                    setSearchQuery('');
                                }}
                                className="mt-6 px-6 py-2.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default SprintReviewsModal;
