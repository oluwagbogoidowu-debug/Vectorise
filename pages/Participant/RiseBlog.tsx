import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { blogService, BlogPost, getBlogPostUrl, slugify, calculateReadingTimeStats, SEED_BLOG_SPRINTS } from '../../services/blogService';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { assetService } from '../../services/assetService';
import { Sprint, Coach } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Clock, Calendar, Heart, Share2, Bookmark, Check, Home, Coins, Sparkles, CheckCircle2, Eye, Award, History } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

// Wireframe Skeleton Loader for RiseBlog Homepage
const BlogHomeSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#FAFAFA] px-4 pt-6 pb-24 animate-pulse">
    {/* Header Skeleton */}
    <div className="max-w-md mx-auto mb-6 flex items-center justify-between gap-3">
      <div className="h-12 sm:h-14 w-32 bg-gray-200 rounded-2xl" />
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-4 w-20 bg-gray-200 rounded-md" />
        <div className="h-2.5 w-28 bg-gray-100 rounded-md" />
        <div className="h-1.5 w-24 bg-gray-200 rounded-full" />
      </div>
    </div>

    <div className="max-w-md mx-auto space-y-8">
      {/* Featured Card Skeleton */}
      <div className="space-y-3">
        <div className="relative rounded-[2rem] overflow-hidden bg-gray-200/90 aspect-[4/5] sm:aspect-[4/4] flex flex-col justify-end p-6 sm:p-8 shadow-sm border border-gray-100">
          <div className="mb-auto flex justify-between items-center w-full">
            <div className="h-6 w-24 bg-gray-300 rounded-full" />
            <div className="w-8 h-8 rounded-full bg-gray-300" />
          </div>
          <div className="space-y-3 w-full">
            <div className="h-6 bg-gray-300 rounded-lg w-11/12" />
            <div className="h-6 bg-gray-300 rounded-lg w-3/4" />
            <div className="flex items-center justify-between pt-4 border-t border-gray-300/50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-300" />
                <div className="h-3 w-20 bg-gray-300 rounded" />
              </div>
              <div className="h-3 w-20 bg-gray-300 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Latest Releases Skeleton List */}
      <div className="space-y-4">
        <div className="h-3 w-28 bg-gray-200 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex gap-4">
            <div className="w-24 h-24 rounded-2xl bg-gray-200 shrink-0" />
            <div className="flex-1 flex flex-col justify-between py-0.5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-14 bg-emerald-100 rounded-full" />
                  <div className="h-2.5 w-10 bg-gray-100 rounded-full" />
                </div>
                <div className="h-3.5 bg-gray-200 rounded w-full" />
                <div className="h-3.5 bg-gray-200 rounded w-4/5" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                <div className="h-2.5 w-16 bg-gray-200 rounded" />
                <div className="flex gap-2">
                  <div className="w-4 h-4 bg-gray-100 rounded-full" />
                  <div className="w-4 h-4 bg-gray-100 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tags Skeleton */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
        <div className="h-8 w-28 bg-gray-200 rounded-full" />
        <div className="h-8 w-24 bg-gray-200 rounded-full" />
        <div className="h-8 w-28 bg-gray-200 rounded-full" />
      </div>
    </div>
  </div>
);

// Wireframe Skeleton Loader for RiseBlog Article Detail
const BlogDetailSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#FAFAFA] pb-24 animate-pulse">
    {/* Detail Hero Header Skeleton */}
    <div className="relative h-64 md:h-96 w-full bg-gray-200">
      <div className="absolute top-6 left-6 w-10 h-10 bg-white/70 rounded-full" />
      <div className="absolute bottom-6 left-6 right-6 max-w-2xl space-y-3">
        <div className="h-5 w-20 bg-gray-300 rounded-full" />
        <div className="h-7 w-5/6 bg-gray-300 rounded-lg" />
        <div className="h-7 w-3/5 bg-gray-300 rounded-lg" />
      </div>
    </div>

    {/* Article Container Skeleton */}
    <div className="max-w-xl mx-auto px-6 py-8">
      {/* Author info row skeleton */}
      <div className="flex items-center justify-between pb-6 border-b border-gray-100 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 bg-gray-200 rounded" />
            <div className="h-2.5 w-32 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="space-y-1.5 text-right">
          <div className="h-2.5 w-20 bg-gray-100 rounded" />
          <div className="h-2.5 w-16 bg-gray-100 rounded" />
        </div>
      </div>

      {/* Paragraph Wireframe Skeleton Lines */}
      <div className="space-y-6">
        <div className="space-y-2.5">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-11/12" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
        </div>
        <div className="h-6 w-1/3 bg-gray-200 rounded-lg mt-6" />
        <div className="space-y-2.5">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-4/5" />
        </div>
        <div className="h-6 w-2/5 bg-gray-200 rounded-lg mt-6" />
        <div className="space-y-2.5">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    </div>
  </div>
);

export const RiseBlog: React.FC = () => {
  const { user } = useAuth();
  const { postId, audienceSlug, blogSlug } = useParams<{ postId?: string; audienceSlug?: string; blogSlug?: string }>();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Record<string, boolean>>({});

  const [dbSprints, setDbSprints] = useState<Sprint[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reading progress and reward state
  const [readStats, setReadStats] = useState({
    totalReads: 0,
    claimedCycles: 0,
    currentCycleReads: 0,
    readsRemaining: 10,
    hasRewardToClaim: false
  });
  const [isClaiming, setIsClaiming] = useState(false);

  const fetchReadStats = async () => {
    try {
      const stats = await blogService.getBlogReadStats(user?.id);
      setReadStats(stats);
    } catch (err) {
      console.error('Error loading blog read stats:', err);
    }
  };

  // Fetch read stats on mount and when user changes
  useEffect(() => {
    fetchReadStats();
  }, [user?.id]);

  // Fetch coaches on mount
  useEffect(() => {
    userService.getCoaches().then(allCoaches => {
      setCoaches(allCoaches);
    }).catch(err => {
      console.error('Error fetching coaches:', err);
    });
  }, []);

  // Subscribe to published sprints (blogs)
  useEffect(() => {
    blogService.ensureSeedBlogsInFirestore().catch(() => {});
    const unsubscribe = sprintService.subscribeToPublishedSprints((sprints) => {
      const approvedBlogs = sprints.filter(
        s => s.contentType === 'blog' && s.approvalStatus === 'approved'
      );
      setDbSprints(approvedBlogs);
      setIsLoading(false);
    }, (err) => {
      console.error('Error subscribing to blog posts:', err);
      setIsLoading(false);
    });

    // Fallback timer to ensure wireframe loader completes smoothly even on slow networks
    const fallbackTimer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => {
      unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Derive blog posts from database sprints, blending with seed fallback blogs so RiseBlog is ALWAYS loaded with rich content
  const posts = useMemo(() => {
    const allSprints: Sprint[] = [...dbSprints];
    const existingIds = new Set(dbSprints.map(s => s.id));
    for (const seed of SEED_BLOG_SPRINTS) {
      if (!existingIds.has(seed.id)) {
        allSprints.push(seed);
      }
    }

    const mappedDbPosts = allSprints.map((sprint): BlogPost & { createdAt: string } => {
      const coach = coaches.find(c => c.id === sprint.coachId);
      const readStats = calculateReadingTimeStats({
        title: sprint.title,
        excerpt: sprint.subtitle,
        content: sprint.blogBody || sprint.description || ''
      });
      
      // Format published date
      let publishedAt = 'Recently';
      if (sprint.createdAt) {
        try {
          const date = new Date(sprint.createdAt);
          if (!isNaN(date.getTime())) {
            publishedAt = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          }
        } catch (e) {
          console.error(e);
        }
      }

      const authorName = coach?.name || (sprint.coachId === 'admin1' ? 'Platform Admin' : 'Rise Coach');
      const authorRole = coach?.niche || coach?.coachNiche || (sprint.coachId === 'admin1' ? 'Vectorise Lead' : 'Performance Coach');
      const authorAvatar = coach?.profileImageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80';

      return {
        id: sprint.id,
        title: sprint.title,
        excerpt: sprint.subtitle || (sprint.description && sprint.description.slice(0, 150) + '...') || 'No description provided.',
        content: sprint.blogBody || sprint.description || '',
        category: (sprint.category as any) || 'Execution',
        readTime: readStats.formattedReadTime,
        publishedAt,
        author: {
          name: authorName,
          role: authorRole,
          avatar: authorAvatar
        },
        coverImage: sprint.blogImage || sprint.coverImageUrl || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
        likes: (sprint as any).likes || 0,
        createdAt: sprint.createdAt || new Date().toISOString(),
        audience: sprint.audience || []
      };
    });

    // Sort descending by creation/publish date
    return mappedDbPosts.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [dbSprints, coaches]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            post.content.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [posts, searchTerm]);

  // Featured post (latest / first in list)
  const featuredPost = useMemo(() => posts[0], [posts]);
  
  // Other posts (exclude featured when list is unfiltered)
  const regularPosts = useMemo(() => {
    if (searchTerm) {
      return filteredPosts;
    }
    return filteredPosts.filter(p => p.id !== featuredPost.id);
  }, [filteredPosts, featuredPost, searchTerm]);

  const handleLike = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) {
      toast.error('Please log in to like articles! 🔐');
      navigate('/login');
      return;
    }
    const isLiked = likedPosts[id];
    setLikedPosts(prev => ({ ...prev, [id]: !isLiked }));
    if (!isLiked) {
      const isDynamic = dbSprints.some(s => s.id === id);
      if (isDynamic) {
        const currentLikes = posts.find(p => p.id === id)?.likes || 0;
        sprintService.updateSprint(id, { likes: currentLikes + 1 } as any).catch(err => {
          console.error('Error liking dynamic post:', err);
        });
      } else {
        blogService.likePost(id);
      }
      toast.success('Added to your inspirations! ❤️');
    }
  };

  const handleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please log in to save articles! 🔐');
      navigate('/login');
      return;
    }
    const isBookmarked = bookmarkedPosts[id];
    setBookmarkedPosts(prev => ({ ...prev, [id]: !isBookmarked }));
    toast.success(isBookmarked ? 'Removed bookmark' : 'Saved for later study! 🔖');
  };

  const handleShare = (post: BlogPost, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${getBlogPostUrl(post)}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!', {
      description: 'Share this spark of growth with your tribe.'
    });
  };

  // Find active post for details view
  const activePost = useMemo(() => {
    if (postId) {
      return posts.find(p => p.id === postId) || blogService.getPostById(postId);
    }
    if (blogSlug) {
      const targetAudience = (audienceSlug || 'general').toLowerCase();
      const targetSlug = blogSlug.toLowerCase();
      const match = posts.find(p => {
        const url = getBlogPostUrl(p).toLowerCase();
        const expectedUrl = `/${targetAudience}/${targetSlug}`;
        return url === expectedUrl || slugify(p.title) === targetSlug || p.id === targetSlug;
      });
      if (match) return match;
      return posts.find(p => p.id === blogSlug) || blogService.getPostById(blogSlug);
    }
    return null;
  }, [postId, audienceSlug, blogSlug, posts]);

  // Active reading and milestone progress state for current article
  const endMarkerRef = useRef<HTMLDivElement | null>(null);
  const [activeReadSeconds, setActiveReadSeconds] = useState(0);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [isPostCompleted, setIsPostCompleted] = useState(false);
  const [isTabActive, setIsTabActive] = useState(typeof document !== 'undefined' ? (!document.hidden && document.hasFocus()) : true);
  const [isRecordingCompletion, setIsRecordingCompletion] = useState(false);

  // Calculate dynamic reading time based on blog post content
  const activePostStats = useMemo(() => {
    if (!activePost) return null;
    return calculateReadingTimeStats({
      title: activePost.title,
      excerpt: activePost.excerpt,
      content: activePost.content
    });
  }, [activePost]);

  // Reset states and check if current article was previously counted
  useEffect(() => {
    if (!activePost) return;
    setActiveReadSeconds(0);
    setHasReachedEnd(false);
    setIsRecordingCompletion(false);

    let isMounted = true;
    blogService.isInsightCompleted(user?.id, activePost.id).then((isComp) => {
      if (isMounted) {
        setIsPostCompleted(isComp);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activePost?.id, user?.id]);

  // Track active & visible reading time
  useEffect(() => {
    if (!activePost) return;

    const handleVisibilityAndFocus = () => {
      const isVisible = !document.hidden && document.hasFocus();
      setIsTabActive(isVisible);
    };

    window.addEventListener('visibilitychange', handleVisibilityAndFocus);
    window.addEventListener('focus', handleVisibilityAndFocus);
    window.addEventListener('blur', handleVisibilityAndFocus);

    const interval = setInterval(() => {
      if (!document.hidden && document.hasFocus()) {
        setIsTabActive(true);
        setActiveReadSeconds(prev => prev + 1);
      } else {
        setIsTabActive(false);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityAndFocus);
      window.removeEventListener('focus', handleVisibilityAndFocus);
      window.removeEventListener('blur', handleVisibilityAndFocus);
    };
  }, [activePost?.id]);

  // Track reaching the end of the insight (IntersectionObserver + Scroll check)
  useEffect(() => {
    if (!activePost || hasReachedEnd) return;

    const marker = endMarkerRef.current;
    if (!marker) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting) {
          setHasReachedEnd(true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(marker);

    const handleScroll = () => {
      if (!marker) return;
      const rect = marker.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 80) {
        setHasReachedEnd(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial position in case already near bottom
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activePost?.id, hasReachedEnd]);

  // Check if conditions for deep reading completion are met:
  // 1. User reaches the end of the insight
  // 2. User has spent at least 50% of estimated reading time
  // 3. The page was actually active/visible during that time
  useEffect(() => {
    if (!activePost || !activePostStats) return;
    if (isPostCompleted || isRecordingCompletion) return;

    const timeRequirementMet = activeReadSeconds >= activePostStats.requiredSeconds;
    const endRequirementMet = hasReachedEnd;

    if (timeRequirementMet && endRequirementMet) {
      setIsRecordingCompletion(true);
      blogService.recordCompletedInsightRead(user?.id, activePost.id, activePost.title).then((res) => {
        setIsPostCompleted(true);
        if (res.readStats) {
          setReadStats(prev => ({
            ...prev,
            totalReads: res.readStats.totalReads,
            claimedCycles: res.readStats.claimedCycles,
            currentCycleReads: res.readStats.currentCycleReads,
            readsRemaining: res.readStats.readsRemaining,
            hasRewardToClaim: res.readStats.hasRewardToClaim
          }));

          if (res.isFirstCompletion) {
            if (res.readStats.hasRewardToClaim) {
              toast.success('🎉 10 / 10 Reads Completed!', {
                description: '10 coins unlocked! Click "Claim" in the top bar to credit your account.',
                duration: 5000
              });
            } else {
              toast.success(`📖 Read Counted (${res.readStats.currentCycleReads} / 10)`, {
                description: `${res.readStats.readsRemaining} more ${res.readStats.readsRemaining === 1 ? 'read' : 'reads'} to unlock 10 coins.`,
                duration: 4000
              });
            }
          }
        }
      }).catch(err => {
        console.error('Error recording completed insight read:', err);
      }).finally(() => {
        setIsRecordingCompletion(false);
      });
    }
  }, [activePost, activePostStats, activeReadSeconds, hasReachedEnd, isPostCompleted, isRecordingCompletion, user?.id]);

  // Handle claiming 10 coins reward
  const handleClaimReward = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) {
      toast.error('Please log in to claim your 10 coins reward! 🔐');
      navigate('/login');
      return;
    }

    setIsClaiming(true);
    try {
      const res = await blogService.claimBlogReward(user.id);
      setReadStats({
        totalReads: res.totalReads,
        claimedCycles: res.claimedCycles,
        currentCycleReads: res.currentCycleReads,
        readsRemaining: res.readsRemaining,
        hasRewardToClaim: res.hasRewardToClaim
      });
      toast.success('🎉 10 Coins Claimed!', {
        description: 'Your reading reward has been added to your balance.'
      });
    } catch (err: any) {
      toast.error(err.message || 'Could not claim reward at this time.');
    } finally {
      setIsClaiming(false);
    }
  };

  // Helper to parse content with titles/bold lists nicely (Markdown compliant)
  const renderFormattedContent = (content: string) => {
    if (!content.trim()) return null;

    const renderInlineText = (text: string) => {
      const textLines = text.split('\n');
      return textLines.map((textLine, lineIdx) => {
        const parts = textLine.split('**');
        const formattedLine = parts.map((part, pIdx) => {
          if (pIdx % 2 === 1) {
            return (
              <strong key={pIdx} className="text-gray-900 font-bold">
                {part}
              </strong>
            );
          }
          return part;
        });
        
        return (
          <React.Fragment key={lineIdx}>
            {formattedLine}
            {lineIdx < textLines.length - 1 && <br />}
          </React.Fragment>
        );
      });
    };

    // Split content by double line breaks (empty lines) to identify paragraphs/blocks
    const blocks = content.split(/\n\s*\n+/);

    return blocks.map((block, idx) => {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) return null;

      // 1. Heading 1
      if (trimmedBlock.startsWith('# ')) {
        const text = trimmedBlock.replace(/^#\s+/, '');
        return (
          <h1 key={idx} className="text-3xl font-black text-gray-900 tracking-tight mt-8 mb-4">
            {renderInlineText(text)}
          </h1>
        );
      }

      // 2. Heading 2
      if (trimmedBlock.startsWith('## ')) {
        const text = trimmedBlock.replace(/^##\s+/, '');
        return (
          <h2 key={idx} className="text-xl font-black text-gray-900 tracking-tight mt-6 mb-3">
            {renderInlineText(text)}
          </h2>
        );
      }

      // 3. Blockquote
      if (trimmedBlock.startsWith('> ')) {
        const quoteLines = trimmedBlock.split('\n').map(l => l.replace(/^>\s*/, ''));
        const text = quoteLines.join('\n');
        return (
          <blockquote key={idx} className="border-l-4 border-primary pl-4 py-1 italic my-4 text-gray-600 font-medium">
            {renderInlineText(text)}
          </blockquote>
        );
      }

      // 4. List Items within a block (split by single newline)
      const lines = trimmedBlock.split('\n');
      const firstLine = lines[0].trim();
      if (firstLine.startsWith('* ') || firstLine.startsWith('- ') || firstLine.match(/^\d+\.\s+/)) {
        return (
          <ul key={idx} className="my-4 space-y-1">
            {lines.map((line, lineIdx) => {
              const tLine = line.trim();
              const isBullet = tLine.startsWith('* ') || tLine.startsWith('- ');
              const isNum = tLine.match(/^\d+\.\s+/);

              if (isBullet) {
                const text = tLine.replace(/^[\*\-]\s+/, '');
                return (
                  <li key={lineIdx} className="ml-6 list-disc text-sm text-gray-600 leading-relaxed mb-2 font-medium">
                    {renderInlineText(text)}
                  </li>
                );
              } else if (isNum) {
                const text = tLine.replace(/^\d+\.\s+/, '');
                return (
                  <li key={lineIdx} className="ml-6 list-decimal text-sm text-gray-600 leading-relaxed mb-2 font-medium">
                    {renderInlineText(text)}
                  </li>
                );
              } else {
                return (
                  <div key={lineIdx} className="ml-6 text-sm text-gray-600 leading-relaxed mb-2 font-medium">
                    {renderInlineText(tLine)}
                  </div>
                );
              }
            })}
          </ul>
        );
      }

      // 5. Standard paragraph block
      return (
        <p key={idx} className="text-sm md:text-base text-gray-600 leading-relaxed mb-4 font-medium">
          {renderInlineText(trimmedBlock)}
        </p>
      );
    });
  };

  if (isLoading) {
    if (postId || blogSlug) {
      return <BlogDetailSkeleton />;
    }
    return <BlogHomeSkeleton />;
  }

  if (activePost) {
    const isLiked = likedPosts[activePost.id];
    const isBookmarked = bookmarkedPosts[activePost.id];
    const otherPosts = posts.filter(p => p.id !== activePost.id).slice(0, 3);

    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen bg-[#FAFAFA] pb-24"
      >
        {/* Detail Hero Header */}
        <div className="relative h-64 md:h-96 w-full">
          <img 
            src={activePost.coverImage} 
            alt={activePost.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
          
          <button 
            onClick={() => navigate(user ? '/blog' : '/discover')}
            className="absolute top-6 left-6 w-10 h-10 bg-white/90 backdrop-blur-md hover:bg-white rounded-full flex items-center justify-center text-gray-800 transition-all shadow-md active:scale-90"
            title={user ? "Back to Blog" : "Go to Home"}
          >
            {user ? <ArrowLeft className="w-5 h-5" /> : <Home className="w-5 h-5" />}
          </button>
          
          <div className="absolute bottom-6 left-6 right-6 text-white max-w-2xl">
            <span className="px-3 py-1 bg-primary text-[9px] font-black uppercase tracking-widest rounded-full mb-3 inline-block">
              {activePost.category}
            </span>
            <h1 className="text-xl md:text-3xl font-black tracking-tight leading-snug drop-shadow-sm">
              {activePost.title}
            </h1>
          </div>
        </div>

        {/* Article Container */}
        <div className="max-w-xl mx-auto px-6 py-8">
          {/* Author info */}
          <div className="flex items-center justify-between pb-6 border-b border-gray-100 mb-6">
            <div className="flex items-center gap-3">
              <img 
                src={activePost.author.avatar} 
                alt={activePost.author.name} 
                className="w-10 h-10 rounded-full object-cover border border-gray-200"
              />
              <div>
                <p className="text-xs font-black text-gray-900">{activePost.author.name}</p>
                <p className="text-[10px] text-gray-400 font-semibold">{activePost.author.role}</p>
              </div>
            </div>
            
            <div className="flex flex-col items-end text-right font-semibold text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-300" /> {activePost.publishedAt}
              </span>
              <span className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-gray-300" /> {activePost.readTime}
              </span>
            </div>
          </div>

          {/* Article content */}
          <div className="prose prose-lg prose-emerald max-w-none mb-6">
            {renderFormattedContent(activePost.content)}
          </div>

          {/* End of Insight Sentinel Marker */}
          <div ref={endMarkerRef} id="end-of-insight-marker" className="py-4 mb-6 flex items-center justify-center">
            {isPostCompleted && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Counted towards your 10 coins goal ({readStats.currentCycleReads}/10)</span>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between border-t border-b border-gray-100 py-4 mb-12">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => handleLike(activePost.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                  isLiked 
                  ? 'bg-rose-50 text-rose-600' 
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                {activePost.likes + (isLiked ? 1 : 0)} Likes
              </button>
              
              <button 
                onClick={(e) => handleBookmark(activePost.id, e)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  isBookmarked 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Bookmark className={`w-4.5 h-4.5 ${isBookmarked ? 'fill-primary text-primary' : ''}`} />
              </button>
            </div>

            <button 
              onClick={(e) => handleShare(activePost, e)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full text-[11px] font-black uppercase tracking-wider transition-all active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              Share Link
            </button>
          </div>

          {/* Prompt to start a sprint related to the content */}
          <div className="bg-emerald-50/40 border border-emerald-100/70 rounded-3xl p-6 text-center">
            <span className="text-lg mb-2 block">🎯</span>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-1">
              Put This Lesson Into Practice
            </h3>
            <p className="text-xs text-gray-500 font-medium mb-5 leading-relaxed">
              {user 
                ? "Don't let this be another piece of information that sits idle. Convert knowledge into execution steps."
                : "Start your journey with Vectorise and convert insights into real momentum."
              }
            </p>
            <Link 
              to={user ? "/explore" : "/"} 
              className="inline-block px-6 py-3 bg-[#0E7850] hover:bg-[#0b5d3e] text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              {user ? "Start Sprint Now" : "Start Your Journey"}
            </Link>
          </div>

          {/* Explore other blog posts section */}
          {otherPosts.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-100">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-6">Explore More Insights</h3>
              <div className="space-y-4">
                {otherPosts.map((post) => (
                  <div 
                    key={post.id}
                    onClick={() => {
                      navigate(getBlogPostUrl(post));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="bg-white rounded-3xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 cursor-pointer flex gap-4 group"
                  >
                    <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 relative">
                      <img 
                        src={post.coverImage} 
                        alt={post.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <span className="text-[8px] font-black text-primary uppercase tracking-widest mb-1">{post.category}</span>
                      <h4 className="text-xs font-black text-gray-950 tracking-tight leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Blog home / listing view
  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 pt-6 pb-24">
      {/* Blog header */}
      <div className="max-w-md mx-auto mb-6 text-left">
        <div className="flex items-center justify-between gap-3">
          <img 
            src={assetService.URLS.RISEBLOG_LOGO} 
            alt="RiseBlog" 
            className="h-14 sm:h-16 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="text-right flex items-center justify-end gap-2.5">
            {readStats.hasRewardToClaim ? (
              <>
                <div className="text-right flex flex-col items-end">
                  <p className="font-bold text-sm text-gray-900 leading-tight">10 / 10 reads</p>
                  <p className="font-thin text-xs text-gray-600 leading-tight mb-1.5">10 coins unlocked</p>
                  <div className="w-full h-1 bg-emerald-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-full" />
                  </div>
                </div>
                <button
                  onClick={handleClaimReward}
                  disabled={isClaiming}
                  className="px-3.5 py-1.5 bg-[#0E7850] hover:bg-[#0b5d3e] text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm shadow-[#0E7850]/25 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isClaiming ? '...' : 'Claim'}
                </button>
              </>
            ) : (
              <div className="text-right flex flex-col items-end">
                <p className="font-bold text-sm text-gray-900 leading-tight">
                  {readStats.currentCycleReads} / 10 reads
                </p>
                <p className="font-thin text-xs text-gray-600 leading-tight mb-1.5">
                  {readStats.readsRemaining} more reads • 10 coins
                </p>
                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#0E7850] transition-all duration-500 rounded-full"
                    style={{ width: `${(readStats.currentCycleReads / 10) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Blog list content */}
      <div className="max-w-md mx-auto space-y-8">
        {/* Empty state if nothing matches filter */}
        {filteredPosts.length === 0 && (
          <div className="py-16 text-center">
            <span className="text-3xl mb-3 block">🔍</span>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-1">No Articles Found</h3>
            <p className="text-xs text-gray-400 font-medium max-w-xs mx-auto">
              We couldn't find anything matching your search. Try searching for "Sprints", "Clarity" or "Leadership".
            </p>
          </div>
        )}

        {/* Featured Card - only show if unfiltered and category is All */}
        {searchTerm === '' && featuredPost && (
          <div className="space-y-3">
            <div className="px-1">
              <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.3em]"></p>
            </div>
            <div 
              onClick={() => navigate(getBlogPostUrl(featuredPost))}
              className="relative rounded-[2rem] overflow-hidden group cursor-pointer shadow-lg aspect-[4/5] sm:aspect-[4/4] flex flex-col justify-end bg-gray-950"
            >
              <div className="absolute inset-0">
                <img 
                  src={featuredPost.coverImage} 
                  alt={featuredPost.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
              </div>

              <div className="relative p-6 sm:p-8 flex flex-col justify-end h-full z-10">
                <div className="mb-auto flex justify-between items-center">
                  <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md text-[9px] font-black uppercase tracking-widest rounded-full text-white border border-white/20">
                    {featuredPost.category}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                    <Bookmark className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug group-hover:text-primary transition-colors">
                    {featuredPost.title}
                  </h3>
                  
                  <div className="flex items-center justify-between text-[10px] font-bold text-white/70 uppercase tracking-wider pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <img 
                        src={featuredPost.author.avatar} 
                        alt={featuredPost.author.name} 
                        className="w-6 h-6 rounded-full object-cover border border-white/20"
                      />
                      <span>{featuredPost.author.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span>{featuredPost.readTime}</span>
                      <span>•</span>
                      <span>{(featuredPost as any).upvotes || 54} Upvotes</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regular cards list */}
        {regularPosts.length > 0 && (
          <div className="space-y-4">
            {searchTerm === '' && (
              <div className="px-1">
                <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.3em]">Latest Releases</p>
              </div>
            )}
            
            {regularPosts.map((post) => {
              const isLiked = likedPosts[post.id];
              return (
                <div 
                  key={post.id}
                  onClick={() => navigate(getBlogPostUrl(post))}
                  className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 cursor-pointer flex gap-4 group"
                >
                  <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 relative">
                    <img 
                      src={post.coverImage} 
                      alt={post.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-black text-primary uppercase tracking-widest">{post.category}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{post.readTime}</span>
                      </div>
                      
                      <h4 className="text-sm font-black text-gray-950 tracking-tight leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                      <span className="text-[9px] font-bold text-gray-400">{post.author.name}</span>
                      
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={(e) => handleLike(post.id, e)}
                          className={`p-1.5 rounded-full transition-all active:scale-90 ${isLiked ? 'text-rose-500' : 'text-gray-300 hover:text-gray-500'}`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>
                        <button 
                          onClick={(e) => handleBookmark(post.id, e)}
                          className={`p-1.5 rounded-full transition-all active:scale-90 ${bookmarkedPosts[post.id] ? 'text-primary' : 'text-gray-300 hover:text-gray-500'}`}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${bookmarkedPosts[post.id] ? 'fill-primary text-primary' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RiseBlog Homepage Tags (Read history, Saved post, Earning record) */}
      {!activePost && (
        <div className="max-w-md mx-auto mt-10 mb-8 px-2 flex flex-wrap items-center justify-center gap-3">
          <button 
            onClick={() => toast.info('Read history coming soon!')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-full text-[10px] font-bold text-gray-600 shadow-sm hover:shadow-md hover:border-emerald-200 hover:text-emerald-700 transition-all active:scale-95"
          >
            <History className="w-3.5 h-3.5" />
            Read history
          </button>
          <button 
            onClick={() => toast.info('Saved post coming soon!')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-full text-[10px] font-bold text-gray-600 shadow-sm hover:shadow-md hover:border-emerald-200 hover:text-emerald-700 transition-all active:scale-95"
          >
            <Bookmark className="w-3.5 h-3.5" />
            Saved post
          </button>
          <button 
            onClick={() => toast.info('Earning record coming soon!')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-full text-[10px] font-bold text-gray-600 shadow-sm hover:shadow-md hover:border-emerald-200 hover:text-emerald-700 transition-all active:scale-95"
          >
            <Coins className="w-3.5 h-3.5" />
            Earning record
          </button>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default RiseBlog;
