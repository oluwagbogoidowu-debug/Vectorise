import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, 
    Star, 
    Sparkles, 
    MessageSquare, 
    Search, 
    ArrowLeft, 
    CheckCircle2, 
    User, 
    Calendar, 
    BookOpen, 
    Eye, 
    Heart, 
    Clock, 
    TrendingUp, 
    Users, 
    Award,
    Flame
} from 'lucide-react';
import { Sprint, Review, InteractionUser } from '../types';
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
    const isRiseBlog = sprint?.contentType === 'blog' || sprint?.subcategory === 'riseblog';

    // State for standard sprint reviews
    const [reviews, setReviews] = useState<Review[]>([]);
    const [selectedStarFilter, setSelectedStarFilter] = useState<number | 'all'>('all');

    // State for RiseBlog interactions (reads, views, likes)
    const [interactions, setInteractions] = useState<{
        views: InteractionUser[];
        likes: InteractionUser[];
        reads: InteractionUser[];
        viewCount: number;
        likeCount: number;
        readCount: number;
    }>({
        views: [],
        likes: [],
        reads: [],
        viewCount: 0,
        likeCount: 0,
        readCount: 0
    });

    const [selectedTab, setSelectedTab] = useState<'all' | 'reads' | 'views' | 'likes'>('all');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');

    // Subscribe to reviews or interactions in real-time when modal opens
    useEffect(() => {
        if (!isOpen || !sprint) {
            setReviews([]);
            setInteractions({ views: [], likes: [], reads: [], viewCount: 0, likeCount: 0, readCount: 0 });
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setSelectedStarFilter('all');
        setSelectedTab('all');
        setSearchQuery('');
        setSortBy('newest');

        // If it's a RiseBlog, mark as read/seen in localStorage to clear notification red dots
        if (isRiseBlog) {
            try {
                localStorage.setItem(`vectorise_seen_blog_${sprint.id}`, JSON.stringify({
                    timestamp: Date.now(),
                    seenAt: new Date().toISOString()
                }));
            } catch (e) {
                // ignore local storage errors
            }

            const unsubInteractions = sprintService.subscribeToExperienceInteractions(sprint.id, (data) => {
                setInteractions(data);
                setIsLoading(false);
                // Also update stored counts so the red dot remains cleared
                try {
                    localStorage.setItem(`vectorise_seen_blog_${sprint.id}`, JSON.stringify({
                        timestamp: Date.now(),
                        readCount: data.readCount,
                        viewCount: data.viewCount,
                        likeCount: data.likeCount,
                        seenAt: new Date().toISOString()
                    }));
                } catch (e) {}
            });

            return () => {
                unsubInteractions();
            };
        } else {
            const unsubReviews = sprintService.subscribeToSprintReviews(sprint.id, (data) => {
                setReviews(data);
                setIsLoading(false);
            });

            return () => {
                unsubReviews();
            };
        }
    }, [isOpen, sprint?.id, isRiseBlog]);

    // Compute standard review stats
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

    // Filter and sort standard reviews
    const filteredReviews = useMemo(() => {
        return reviews
            .filter((r) => {
                if (selectedStarFilter !== 'all') {
                    const score = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
                    if (score !== selectedStarFilter) return false;
                }
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const nameMatch = r.userName?.toLowerCase().includes(q);
                    const commentMatch = r.comment?.toLowerCase().includes(q);
                    return nameMatch || commentMatch;
                }
                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'highest') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
                if (sortBy === 'lowest') return (Number(a.rating) || 0) - (Number(b.rating) || 0);
                // default newest
                return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
            });
    }, [reviews, selectedStarFilter, searchQuery, sortBy]);

    // RiseBlog combined & filtered interactions list
    const filteredInteractions = useMemo(() => {
        if (!isRiseBlog) return [];

        let list: (InteractionUser & { interactionType: 'read' | 'view' | 'like' })[] = [];

        if (selectedTab === 'all' || selectedTab === 'reads') {
            interactions.reads.forEach(r => list.push({ ...r, interactionType: 'read' }));
        }
        if (selectedTab === 'all' || selectedTab === 'views') {
            interactions.views.forEach(v => list.push({ ...v, interactionType: 'view' }));
        }
        if (selectedTab === 'all' || selectedTab === 'likes') {
            interactions.likes.forEach(l => list.push({ ...l, interactionType: 'like' }));
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(item => 
                (item.userName && item.userName.toLowerCase().includes(q)) ||
                (item.userEmail && item.userEmail.toLowerCase().includes(q)) ||
                (item.role && item.role.toLowerCase().includes(q))
            );
        }

        return list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    }, [isRiseBlog, interactions, selectedTab, searchQuery]);

    // Read completion rate calculation
    const completionRate = useMemo(() => {
        if (!interactions.viewCount) return interactions.readCount > 0 ? 100 : 0;
        const rate = Math.round((interactions.readCount / interactions.viewCount) * 100);
        return Math.min(100, Math.max(0, rate));
    }, [interactions.readCount, interactions.viewCount]);

    // Estimated word count and reading time for RiseBlog
    const blogReadingTime = useMemo(() => {
        if (!isRiseBlog || !sprint) return '3 min read';
        const rawContent = (sprint.description || '') + ' ' + ((sprint as any).content || '');
        const words = rawContent.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length;
        const mins = Math.max(1, Math.ceil(words / 180));
        return `${mins} min read (${words} words)`;
    }, [isRiseBlog, sprint]);

    if (!isOpen || !sprint) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur-md flex flex-col overflow-y-auto animate-in fade-in duration-200">
            {/* STICKY TOP APP BAR */}
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                        aria-label="Back to dashboard"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                    aria-label="Close modal"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* HERO HEADER */}
            <div className={`text-white px-6 pt-10 pb-12 shadow-sm ${
                isRiseBlog 
                    ? 'bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e]' 
                    : 'bg-gradient-to-br from-[#0A4D34] via-[#0E7850] to-[#12A06B]'
            }`}>
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="px-2.5 py-1 bg-white/20 text-white text-[9px] font-black uppercase tracking-widest rounded-lg backdrop-blur-sm border border-white/20 flex items-center gap-1.5">
                            {isRiseBlog ? (
                                <>
                                    <BookOpen className="w-3 h-3 text-emerald-200" />
                                    RiseBlog Insights
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3 h-3 text-amber-300" />
                                    Sprint Reviews
                                </>
                            )}
                        </span>
                        {!isRiseBlog && (
                            <span className="px-2.5 py-1 bg-white/10 text-white/80 text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/10">
                                {sprint.duration || 1} {sprint.duration === 1 ? 'Move' : 'Moves'}
                            </span>
                        )}
                        {sprint.category && (
                            <span className="px-2.5 py-1 bg-white/10 text-white/80 text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/10">
                                {sprint.category}
                            </span>
                        )}
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight mb-3">
                        {sprint.title}
                    </h1>

                    {/* OVERALL METRICS BANNER */}
                    {isRiseBlog ? (
                        /* RISEBLOG KPI CARDS: READS, VIEWS, LIKES, COMPLETION RATE */
                        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/15">
                            {/* Reads */}
                            <div className="flex flex-col justify-center p-3 rounded-2xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-2 text-emerald-300 mb-1">
                                    <BookOpen className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/75">
                                        Total Reads
                                    </span>
                                </div>
                                <div className="text-3xl md:text-4xl font-black text-white">
                                    {interactions.readCount}
                                </div>
                            </div>

                            {/* Views */}
                            <div className="flex flex-col justify-center p-3 rounded-2xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-2 text-blue-300 mb-1">
                                    <Eye className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/75">
                                        Total Views
                                    </span>
                                </div>
                                <div className="text-3xl md:text-4xl font-black text-white">
                                    {interactions.viewCount}
                                </div>
                            </div>

                            {/* Likes */}
                            <div className="flex flex-col justify-center p-3 rounded-2xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-2 text-rose-300 mb-1">
                                    <Heart className="w-4 h-4 fill-rose-300" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/75">
                                        Total Likes
                                    </span>
                                </div>
                                <div className="text-3xl md:text-4xl font-black text-white">
                                    {interactions.likeCount}
                                </div>
                            </div>

                            {/* Completion Rate */}
                            <div className="flex flex-col justify-center p-3 rounded-2xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-2 text-amber-300 mb-1">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/75">
                                        Read Rate
                                    </span>
                                </div>
                                <div className="text-3xl md:text-4xl font-black text-amber-300">
                                    {completionRate}%
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* SPRINT STAR RATING BANNER */
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
                    )}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 pb-32">
                {/* TOOLBAR: TABS & SEARCH */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
                    {/* Category tabs / filters */}
                    {isRiseBlog ? (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            <button
                                type="button"
                                onClick={() => setSelectedTab('all')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
                                    selectedTab === 'all'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                        : 'bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-zinc-800 hover:border-emerald-600/40'
                                }`}
                            >
                                All Activity ({interactions.readCount + interactions.viewCount + interactions.likeCount})
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedTab('reads')}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
                                    selectedTab === 'reads'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                        : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-800 hover:border-emerald-500/40'
                                }`}
                            >
                                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Reads ({interactions.readCount})</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedTab('views')}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
                                    selectedTab === 'views'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-800 hover:border-blue-500/40'
                                }`}
                            >
                                <Eye className="w-3.5 h-3.5 text-blue-500" />
                                <span>Views ({interactions.viewCount})</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedTab('likes')}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
                                    selectedTab === 'likes'
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                        : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-800 hover:border-rose-500/40'
                                }`}
                            >
                                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                                <span>Likes ({interactions.likeCount})</span>
                            </button>
                        </div>
                    ) : (
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
                    )}

                    {/* Search & Sort Controls */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 md:w-64">
                            <Search className="w-4 h-4 text-gray-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={isRiseBlog ? "Search member by name or email..." : "Search participant or feedback..."}
                                className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {!isRiseBlog && (
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
                        )}
                    </div>
                </div>

                {/* LOADING STATE */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-sm">
                        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">
                            {isRiseBlog ? 'Loading RiseBlog reader interactions...' : 'Loading sprint reviews...'}
                        </p>
                    </div>
                ) : isRiseBlog ? (
                    /* RISEBLOG INTERACTION LIST (READS, VIEWS, LIKES) */
                    filteredInteractions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredInteractions.map((item, idx) => {
                                const dateString = item.timestamp
                                    ? new Date(item.timestamp).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                          hour: 'numeric',
                                          minute: '2-digit'
                                      })
                                    : 'Recent';

                                const initial = (item.userName || item.userEmail || 'M').charAt(0).toUpperCase();

                                return (
                                    <div
                                        key={`${item.userId}-${item.interactionType}-${idx}`}
                                        className="bg-white dark:bg-zinc-900 rounded-[1.75rem] p-5 md:p-6 border border-gray-100 dark:border-zinc-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {item.userPhoto ? (
                                                    <img
                                                        src={item.userPhoto}
                                                        alt={item.userName}
                                                        className="w-11 h-11 rounded-2xl object-cover border border-gray-100 dark:border-zinc-800 shrink-0"
                                                        referrerPolicy="no-referrer"
                                                        onError={(e) => {
                                                            (e.currentTarget as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className={`w-11 h-11 rounded-2xl font-black text-sm flex items-center justify-center border shrink-0 ${
                                                        item.interactionType === 'read'
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200'
                                                            : item.interactionType === 'like'
                                                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200'
                                                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200'
                                                    }`}>
                                                        {initial}
                                                    </div>
                                                )}

                                                <div className="min-w-0">
                                                    <h3 className="font-black text-gray-900 dark:text-white text-sm truncate tracking-tight">
                                                        {item.userName || 'Member'}
                                                    </h3>
                                                    <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate font-medium">
                                                        {item.userEmail || 'Seeker'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Action Badge */}
                                            {item.interactionType === 'read' && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0">
                                                    <BookOpen className="w-3 h-3 text-emerald-600" />
                                                    Completed Read
                                                </span>
                                            )}
                                            {item.interactionType === 'view' && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0">
                                                    <Eye className="w-3 h-3 text-blue-600" />
                                                    Viewed Post
                                                </span>
                                            )}
                                            {item.interactionType === 'like' && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0">
                                                    <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                                                    Liked Article
                                                </span>
                                            )}
                                        </div>

                                        {/* Timestamp & details footer */}
                                        <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-[10px] font-bold text-gray-400 dark:text-zinc-500">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                <span>{dateString}</span>
                                            </div>
                                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded-md text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-zinc-300">
                                                {item.role || 'Participant'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-24 bg-white dark:bg-zinc-900 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-zinc-800 p-8">
                            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                                <BookOpen className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
                                {searchQuery || selectedTab !== 'all'
                                    ? 'No matching interactions found'
                                    : 'No readers or views recorded yet'}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                                {searchQuery || selectedTab !== 'all'
                                    ? 'Try clearing the search query or switching to another interaction filter.'
                                    : 'When participants open, read, and like this RiseBlog article, their real-time engagement and completed reads will appear here.'}
                            </p>
                            {(searchQuery || selectedTab !== 'all') && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedTab('all');
                                        setSearchQuery('');
                                    }}
                                    className="mt-6 px-6 py-2.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    )
                ) : (
                    /* SPRINT REVIEWS LIST (STAR RATINGS, FEEDBACK) */
                    filteredReviews.length > 0 ? (
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
                    )
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
