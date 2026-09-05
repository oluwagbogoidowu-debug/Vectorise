import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { blogService, BlogPost, getBlogPostUrl, slugify, calculateReadingTimeStats, SEED_BLOG_SPRINTS } from '../../services/blogService';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { assetService } from '../../services/assetService';
import { Sprint, Coach, ParticipantSprint, UserRole } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Clock, Calendar, Heart, Share2, Bookmark, Check, Home, Coins, Sparkles, CheckCircle2, Eye, Award, History, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
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
            <div className="h-8 bg-gray-300 rounded-lg w-11/12" />
            <div className="h-8 bg-gray-300 rounded-lg w-3/4" />
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

      {/* For You Skeleton List */}
      <div className="space-y-4">
        <div className="h-5 w-28 bg-gray-200 rounded-lg" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex gap-4">
            <div className="w-24 h-24 rounded-2xl bg-gray-200 shrink-0" />
            <div className="flex-1 flex flex-col justify-between py-0.5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-14 bg-emerald-100 rounded-full" />
                  <div className="h-2.5 w-10 bg-gray-100 rounded-full" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-4/5" />
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
    </div>
  </div>
);

// Wireframe Skeleton Loader for RiseBlog Article Detail
const BlogDetailSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#FAFAFA] pb-24 animate-pulse">
    {/* Detail Hero Header Skeleton */}
    <div className="relative h-72 md:h-[420px] w-full bg-gray-200">
      <div className="absolute top-6 left-6 w-10 h-10 bg-white/70 rounded-full" />
      <div className="absolute bottom-6 left-6 right-6 max-w-2xl space-y-3">
        <div className="h-5 w-20 bg-gray-300 rounded-full" />
        <div className="h-8 md:h-10 w-5/6 bg-gray-300 rounded-lg" />
        <div className="h-8 md:h-10 w-3/5 bg-gray-300 rounded-lg" />
      </div>
    </div>

    {/* Article Container Skeleton */}
    <div className="max-w-xl mx-auto px-6 py-8">
      {/* Author info row skeleton */}
      <div className="flex items-center justify-between pb-6 border-b border-gray-100 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200" />
          <div className="space-y-1.5">
            <div className="h-4 w-28 bg-gray-200 rounded" />
            <div className="h-3 w-36 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="space-y-1.5 text-right">
          <div className="h-3 w-24 bg-gray-100 rounded" />
          <div className="h-3 w-20 bg-gray-100 rounded" />
        </div>
      </div>

      {/* Paragraph Wireframe Skeleton Lines */}
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="h-5 bg-gray-200 rounded w-full" />
          <div className="h-5 bg-gray-200 rounded w-11/12" />
          <div className="h-5 bg-gray-200 rounded w-5/6" />
        </div>
        <div className="h-7 w-1/3 bg-gray-200 rounded-lg mt-8" />
        <div className="space-y-3">
          <div className="h-5 bg-gray-200 rounded w-full" />
          <div className="h-5 bg-gray-200 rounded w-full" />
          <div className="h-5 bg-gray-200 rounded w-4/5" />
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
  const [sprintBlogLinks, setSprintBlogLinks] = useState<any[]>([]);
  const [userEnrollments, setUserEnrollments] = useState<ParticipantSprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Big Card Slider State (3 posts)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isSliderPaused, setIsSliderPaused] = useState(false);

  // "For You" Section pagination state (initially show 3)
  const [visibleForYouCount, setVisibleForYouCount] = useState(3);

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

  // Subscribe to sprint blog links and user enrollments
  useEffect(() => {
    const unsubscribeLinks = sprintService.subscribeToSprintBlogLinks((links) => {
      setSprintBlogLinks(links);
    });

    let unsubscribeEnrollments = () => {};
    if (user?.id) {
      unsubscribeEnrollments = sprintService.subscribeToUserEnrollments(user.id, (enrollments) => {
        setUserEnrollments(enrollments);
      });
    }

    return () => {
      unsubscribeLinks();
      unsubscribeEnrollments();
    };
  }, [user?.id]);

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

  // Derive visible blog posts based on participant enrolled links
  const visiblePosts = useMemo(() => {
    const isStaff = user?.role === UserRole.ADMIN || user?.role === UserRole.COACH;
    if (isStaff) {
      return posts;
    }

    const enrolledSprintIds = new Set(userEnrollments.map(e => e.sprint_id));
    const linkedBlogIds = new Set(
      sprintBlogLinks
        .filter(link => enrolledSprintIds.has(link.sourceSprintId))
        .map(link => link.targetBlogId)
    );

    return posts.filter(post => {
      // Allow if it's explicitly linked to an enrolled sprint
      return linkedBlogIds.has(post.id);
    });
  }, [posts, user, userEnrollments, sprintBlogLinks]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return visiblePosts.filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            post.content.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [visiblePosts, searchTerm]);

  // 3 Featured posts for the big top slider
  const sliderPosts = useMemo(() => {
    return visiblePosts.slice(0, 3);
  }, [visiblePosts]);

  // Auto-advance slider every 5 seconds if not hovered
  useEffect(() => {
    if (sliderPosts.length <= 1 || isSliderPaused) return;

    const timer = setInterval(() => {
      setActiveSlideIndex(prev => (prev + 1) % sliderPosts.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [sliderPosts.length, isSliderPaused]);

  // "For You" / Latest Releases posts (exclude the 3 in top slider when not searching, or show filtered results)
  const forYouPosts = useMemo(() => {
    if (searchTerm) {
      return filteredPosts;
    }
    const remaining = visiblePosts.slice(3);
    return remaining.length > 0 ? remaining : visiblePosts;
  }, [filteredPosts, visiblePosts, searchTerm]);

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
      sprintService.toggleExperienceLike(id, user, true).catch(() => {});
      toast.success('Added to your inspirations! ❤️');
    } else {
      sprintService.toggleExperienceLike(id, user, false).catch(() => {});
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
    let rawPost = null;
    if (postId) {
      rawPost = posts.find(p => p.id === postId) || blogService.getPostById(postId);
    } else if (blogSlug) {
      const targetAudience = (audienceSlug || 'general').toLowerCase();
      const targetSlug = blogSlug.toLowerCase();
      const match = posts.find(p => {
        const url = getBlogPostUrl(p).toLowerCase();
        const expectedUrl = `/${targetAudience}/${targetSlug}`;
        return url === expectedUrl || slugify(p.title) === targetSlug || p.id === targetSlug;
      });
      if (match) {
        rawPost = match;
      } else {
        rawPost = posts.find(p => p.id === blogSlug) || blogService.getPostById(blogSlug);
      }
    }

    if (!rawPost) return null;

    // Strict linking check for participants
    const isStaff = user?.role === UserRole.ADMIN || user?.role === UserRole.COACH;
    if (!isStaff) {
      const isLinked = visiblePosts.some(p => p.id === rawPost.id);
      if (!isLinked) return null;
    }

    return rawPost;
  }, [postId, audienceSlug, blogSlug, posts, visiblePosts, user]);

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

    if (user?.id) {
      sprintService.recordExperienceView(activePost.id, user).catch(() => {});
    }

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
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activePost?.id, hasReachedEnd]);

  // Check if conditions for deep reading completion are met
  useEffect(() => {
    if (!activePost || !activePostStats) return;
    if (isPostCompleted || isRecordingCompletion) return;

    const timeRequirementMet = activeReadSeconds >= activePostStats.requiredSeconds;
    const endRequirementMet = hasReachedEnd;

    if (timeRequirementMet && endRequirementMet) {
      setIsRecordingCompletion(true);
      if (user?.id) {
        sprintService.recordExperienceRead(activePost.id, user, activeReadSeconds).catch(() => {});
      }
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
                description: '20 coins unlocked! Click "Claim" in the top bar to credit your account.',
                duration: 5000
              });
            } else {
              toast.success(`📖 Read Counted (${res.readStats.currentCycleReads} / 10)`, {
                description: `${res.readStats.readsRemaining} more ${res.readStats.readsRemaining === 1 ? 'read' : 'reads'} to unlock 20 coins.`,
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

  // Handle claiming 20 coins reward
  const handleClaimReward = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) {
      toast.error('Please log in to claim your 20 coins reward! 🔐');
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
      toast.success('🎉 20 Coins Claimed!', {
        description: 'Your reading reward has been added to your balance.'
      });
    } catch (err: any) {
      toast.error(err.message || 'Could not claim reward at this time.');
    } finally {
      setIsClaiming(false);
    }
  };

  // Helper to parse content with large, crisp, easy-to-read typography
  const renderFormattedContent = (content: string) => {
    if (!content.trim()) return null;

    const renderInlineText = (text: string) => {
      const textLines = text.split('\n');
      return textLines.map((textLine, lineIdx) => {
        const parts = textLine.split('**');
        const formattedLine = parts.map((part, pIdx) => {
          if (pIdx % 2 === 1) {
            return (
              <strong key={pIdx} className="text-gray-950 font-black">
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
          <h1 key={idx} className="text-3xl md:text-4xl font-black text-gray-950 tracking-tight mt-10 mb-5 leading-tight">
            {renderInlineText(text)}
          </h1>
        );
      }

      // 2. Heading 2
      if (trimmedBlock.startsWith('## ')) {
        const text = trimmedBlock.replace(/^##\s+/, '');
        return (
          <h2 key={idx} className="text-2xl md:text-3xl font-black text-gray-950 tracking-tight mt-8 mb-4 leading-snug">
            {renderInlineText(text)}
          </h2>
        );
      }

      // 3. Heading 3
      if (trimmedBlock.startsWith('### ')) {
        const text = trimmedBlock.replace(/^###\s+/, '');
        return (
          <h3 key={idx} className="text-xl md:text-2xl font-black text-gray-950 tracking-tight mt-6 mb-3 leading-snug">
            {renderInlineText(text)}
          </h3>
        );
      }

      // 4. Blockquote
      if (trimmedBlock.startsWith('> ')) {
        const quoteLines = trimmedBlock.split('\n').map(l => l.replace(/^>\s*/, ''));
        const text = quoteLines.join('\n');
        return (
          <blockquote key={idx} className="border-l-4 border-primary pl-5 py-3.5 italic my-6 text-base md:text-lg text-gray-800 font-medium bg-emerald-50/40 rounded-r-2xl">
            {renderInlineText(text)}
          </blockquote>
        );
      }

      // 5. List Items within a block
      const lines = trimmedBlock.split('\n');
      const firstLine = lines[0].trim();
      if (firstLine.startsWith('* ') || firstLine.startsWith('- ') || firstLine.match(/^\d+\.\s+/)) {
        return (
          <ul key={idx} className="my-5 space-y-2">
            {lines.map((line, lineIdx) => {
              const tLine = line.trim();
              const isBullet = tLine.startsWith('* ') || tLine.startsWith('- ');
              const isNum = tLine.match(/^\d+\.\s+/);

              if (isBullet) {
                const text = tLine.replace(/^[\*\-]\s+/, '');
                return (
                  <li key={lineIdx} className="ml-6 list-disc text-base md:text-lg text-gray-800 leading-relaxed mb-2.5 font-medium">
                    {renderInlineText(text)}
                  </li>
                );
              } else if (isNum) {
                const text = tLine.replace(/^\d+\.\s+/, '');
                return (
                  <li key={lineIdx} className="ml-6 list-decimal text-base md:text-lg text-gray-800 leading-relaxed mb-2.5 font-medium">
                    {renderInlineText(text)}
                  </li>
                );
              } else {
                return (
                  <div key={lineIdx} className="ml-6 text-base md:text-lg text-gray-800 leading-relaxed mb-2.5 font-medium">
                    {renderInlineText(tLine)}
                  </div>
                );
              }
            })}
          </ul>
        );
      }

      // 6. Standard paragraph block - enhanced font size and readability
      return (
        <p key={idx} className="text-base md:text-lg text-gray-700 leading-relaxed md:leading-loose mb-6 font-medium">
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
    const otherPosts = visiblePosts.filter(p => p.id !== activePost.id);

    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen bg-[#FAFAFA] pb-24"
      >
        {/* Detail Hero Header */}
        <div className="relative h-72 md:h-[420px] w-full">
          <img 
            src={activePost.coverImage} 
            alt={activePost.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />
          
          <button 
            onClick={() => navigate('/blog')}
            className="absolute top-6 left-6 w-10 h-10 bg-white/90 backdrop-blur-md hover:bg-white rounded-full flex items-center justify-center text-gray-800 transition-all shadow-md active:scale-90 z-20"
            title={user ? "Back to Blog" : "Go to RiseBlog Home"}
          >
            {user ? <ArrowLeft className="w-5 h-5" /> : <Home className="w-5 h-5" />}
          </button>
          
          <div className="absolute bottom-6 left-6 right-6 text-white max-w-2xl z-10">
            <span className="px-3.5 py-1.5 bg-primary text-[10px] font-black uppercase tracking-widest rounded-full mb-3 inline-block shadow-sm">
              {activePost.category}
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight drop-shadow-sm text-white">
              {activePost.title}
            </h1>
          </div>
        </div>

        {/* Article Container */}
        <div className="max-w-xl mx-auto px-6 py-8">
          {/* Author info */}
          <div className="flex items-center justify-between pb-6 border-b border-gray-100 mb-8">
            <div className="flex items-center gap-3.5">
              <img 
                src={activePost.author.avatar} 
                alt={activePost.author.name} 
                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-100 shadow-sm"
              />
              <div>
                <p className="text-sm font-black text-gray-950">{activePost.author.name}</p>
                <p className="text-xs text-gray-500 font-semibold">{activePost.author.role}</p>
              </div>
            </div>
            
            <div className="flex flex-col items-end text-right font-semibold text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> {activePost.publishedAt}
              </span>
              <span className="flex items-center gap-1.5 mt-1 text-emerald-700 font-bold">
                <Clock className="w-3.5 h-3.5 text-emerald-600" /> {activePost.readTime}
              </span>
            </div>
          </div>

          {/* Article content with increased typography */}
          <div className="prose max-w-none mb-8">
            {renderFormattedContent(activePost.content)}
          </div>

          {/* End of Insight Sentinel Marker */}
          <div ref={endMarkerRef} id="end-of-insight-marker" className="py-4 mb-8 flex items-center justify-center">
            {isPostCompleted && (
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-100 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Counted towards your 20 coins goal ({readStats.currentCycleReads}/10)</span>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between border-t border-b border-gray-100 py-4 mb-10">
            <div className="flex items-center gap-3 sm:gap-4">
              <button 
                onClick={() => handleLike(activePost.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all active:scale-95 ${
                  isLiked 
                  ? 'bg-rose-50 text-rose-600' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
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
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Bookmark className={`w-4.5 h-4.5 ${isBookmarked ? 'fill-primary text-primary' : ''}`} />
              </button>
            </div>

            <button 
              onClick={(e) => handleShare(activePost, e)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-full text-xs font-black uppercase tracking-wider transition-all active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              Share Link
            </button>
          </div>

          {/* Explore More Insights - Sideways horizontal scrolling */}
          {otherPosts.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-black text-gray-950 tracking-tight">Explore More Insights</h3>
                <span className="text-[11px] font-bold text-gray-400">Swipe sideways &rarr;</span>
              </div>
              
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 pt-1 scroll-smooth snap-x snap-mandatory -mx-6 px-6 sm:mx-0 sm:px-0">
                {otherPosts.map((post) => (
                  <div 
                    key={post.id}
                    onClick={() => {
                      navigate(getBlogPostUrl(post));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-[260px] sm:w-[280px] shrink-0 snap-start bg-white rounded-3xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="w-full h-36 rounded-2xl overflow-hidden mb-3 relative bg-gray-900">
                        <img 
                          src={post.coverImage} 
                          alt={post.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                        />
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-black/60 backdrop-blur-md text-[8px] font-black text-white uppercase tracking-widest rounded-full">
                          {post.category}
                        </span>
                      </div>
                      
                      <h4 className="text-sm sm:text-base font-black text-gray-950 tracking-tight leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
                        {post.title}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-50 text-[11px] text-gray-400 font-semibold mt-2">
                      <span className="truncate max-w-[130px] text-gray-600">{post.author.name}</span>
                      <span className="text-emerald-700 font-bold shrink-0">{post.readTime}</span>
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
                  <p className="font-thin text-xs text-gray-600 leading-tight mb-1.5">20 coins unlocked</p>
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
                  {readStats.readsRemaining} more reads • 20 coins
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
            <h3 className="text-base font-black text-gray-900 uppercase tracking-wider mb-1">No Articles Found</h3>
            <p className="text-xs text-gray-400 font-medium max-w-xs mx-auto">
              We couldn't find anything matching your search. Try searching for "Sprints", "Clarity" or "Leadership".
            </p>
          </div>
        )}

        {/* Featured Card with Slider (3 RiseBlog posts) */}
        {searchTerm === '' && sliderPosts.length > 0 && (
          <div 
            className="relative space-y-3"
            onMouseEnter={() => setIsSliderPaused(true)}
            onMouseLeave={() => setIsSliderPaused(false)}
          >
            {/* Carousel Container */}
            <div className="relative rounded-[2.5rem] overflow-hidden group shadow-xl aspect-[4/5.2] sm:aspect-[4/4.5] flex flex-col justify-end bg-gray-950 select-none">
              <AnimatePresence mode="wait">
                <motion.div
                  key={sliderPosts[activeSlideIndex]?.id || activeSlideIndex}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  onClick={() => navigate(getBlogPostUrl(sliderPosts[activeSlideIndex]))}
                  className="absolute inset-0 cursor-pointer flex flex-col justify-end"
                >
                  <img 
                    src={sliderPosts[activeSlideIndex].coverImage} 
                    alt={sliderPosts[activeSlideIndex].title} 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />

                  <div className="relative p-6 sm:p-8 pb-8 flex flex-col justify-end h-full z-10">
                    <div className="mb-auto flex justify-between items-center">
                      <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur-md text-[11px] font-black uppercase tracking-widest rounded-full text-white shadow-sm">
                        {sliderPosts[activeSlideIndex].category}
                      </span>
                      <div 
                        onClick={(e) => handleBookmark(sliderPosts[activeSlideIndex].id, e)}
                        className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all active:scale-90 ${
                          bookmarkedPosts[sliderPosts[activeSlideIndex].id]
                            ? 'bg-primary text-white'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        <Bookmark className={`w-5 h-5 ${bookmarkedPosts[sliderPosts[activeSlideIndex].id] ? 'fill-white' : ''}`} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug drop-shadow-md">
                        {sliderPosts[activeSlideIndex].title}
                      </h3>
                      
                      <div className="h-px w-full bg-white/20" />
                      
                      <div className="flex items-center gap-3 text-xs font-bold text-white/90 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <img 
                            src={sliderPosts[activeSlideIndex].author.avatar} 
                            alt={sliderPosts[activeSlideIndex].author.name} 
                            className="w-8 h-8 rounded-full object-cover border border-white/30 shadow-sm"
                          />
                          <span className="truncate max-w-[130px] sm:max-w-none text-white font-black">{sliderPosts[activeSlideIndex].author.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-white/90 text-[10px] sm:text-xs">
                          <span>{sliderPosts[activeSlideIndex].readTime}</span>
                          <span className="text-white/60">•</span>
                          <span>{(sliderPosts[activeSlideIndex] as any).upvotes || 54} Upvotes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Pagination Slider Indicator (Auto-transitions every 5 seconds) */}
              {sliderPosts.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 z-20 flex items-center justify-center gap-2">
                  {sliderPosts.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSlideIndex(dotIdx);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        activeSlideIndex === dotIdx 
                          ? 'w-7 bg-white/90' 
                          : 'w-2 bg-white/30 hover:bg-white/50'
                      }`}
                      title={`Go to slide ${dotIdx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Latest Releases / For You Section */}
        {forYouPosts.length > 0 && (
          <div className="space-y-4 pt-1">
            {searchTerm === '' && (
              <div className="px-1 flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">LATEST RELEASES</span>
                {forYouPosts.length > visibleForYouCount && (
                  <button
                    onClick={() => setVisibleForYouCount(prev => prev + 3)}
                    className="text-xs font-bold text-gray-500 hover:text-[#0E7850] transition-colors cursor-pointer"
                  >
                    See more
                  </button>
                )}
              </div>
            )}
            
            <div className="space-y-4">
              {forYouPosts.slice(0, visibleForYouCount).map((post) => {
                const isLiked = likedPosts[post.id];
                const isBookmarked = bookmarkedPosts[post.id];
                return (
                  <div 
                    key={post.id}
                    onClick={() => navigate(getBlogPostUrl(post))}
                    className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300 cursor-pointer flex gap-4 group"
                  >
                    <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 relative bg-gray-900">
                      <img 
                        src={post.coverImage} 
                        alt={post.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[9px] font-black text-primary uppercase tracking-widest">{post.category}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{post.readTime}</span>
                        </div>
                        
                        <h4 className="text-base sm:text-lg font-black text-gray-950 tracking-tight leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {post.title}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                        <span className="text-xs font-semibold text-gray-500 truncate max-w-[120px]">{post.author.name}</span>
                        
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={(e) => handleLike(post.id, e)}
                            className={`p-1.5 rounded-full transition-all active:scale-90 ${isLiked ? 'text-rose-500' : 'text-gray-300 hover:text-gray-500'}`}
                            title="Like article"
                          >
                            <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>
                          <button 
                            onClick={(e) => handleBookmark(post.id, e)}
                            className={`p-1.5 rounded-full transition-all active:scale-90 ${isBookmarked ? 'text-primary' : 'text-gray-300 hover:text-gray-500'}`}
                            title="Save article"
                          >
                            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-primary text-primary' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
