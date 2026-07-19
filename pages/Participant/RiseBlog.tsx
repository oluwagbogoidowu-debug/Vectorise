import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { blogService, BlogPost } from '../../services/blogService';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { Sprint, Coach } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Clock, Calendar, Heart, Search, Share2, Bookmark, Check, Home } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

export const RiseBlog: React.FC = () => {
  const { user } = useAuth();
  const { postId } = useParams<{ postId?: string }>();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Record<string, boolean>>({});

  const [dbSprints, setDbSprints] = useState<Sprint[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);

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
    const unsubscribe = sprintService.subscribeToPublishedSprints((sprints) => {
      const approvedBlogs = sprints.filter(
        s => s.contentType === 'blog' && s.approvalStatus === 'approved'
      );
      setDbSprints(approvedBlogs);
    }, (err) => {
      console.error('Error subscribing to blog posts:', err);
    });

    return () => unsubscribe();
  }, []);

  // Merge static and dynamic posts, sorted descending by creation/publish date
  const posts = useMemo(() => {
    const staticPosts = blogService.getPosts();
    const mappedDbPosts = dbSprints.map((sprint): BlogPost & { createdAt: string } => {
      const coach = coaches.find(c => c.id === sprint.coachId);
      const words = (sprint.blogBody || sprint.description || '').split(/\s+/).length;
      const readTimeMin = Math.max(1, Math.round(words / 200));
      
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

      return {
        id: sprint.id,
        title: sprint.title,
        excerpt: sprint.subtitle || (sprint.description && sprint.description.slice(0, 150) + '...') || 'No description provided.',
        content: sprint.blogBody || sprint.description || '',
        category: (sprint.category as any) || 'Execution',
        readTime: `${readTimeMin} min read`,
        publishedAt,
        author: {
          name: coach?.name || 'Rise Coach',
          role: coach?.niche || coach?.coachNiche || 'Performance Coach',
          avatar: coach?.profileImageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80'
        },
        coverImage: sprint.blogImage || sprint.coverImageUrl || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
        likes: (sprint as any).likes || 0,
        createdAt: sprint.createdAt || new Date().toISOString()
      };
    });

    // Merge lists
    const allPosts = [
      ...mappedDbPosts,
      ...staticPosts.map(p => ({
        ...p,
        createdAt: new Date(p.publishedAt).toISOString()
      }))
    ];

    // Sort descending by creation/publish date
    return allPosts.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [dbSprints, coaches]);

  // Category list
  const categories = ['All', 'Mindset', 'Execution', 'Micro-Habits', 'Influence'];

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            post.content.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [posts, searchTerm, selectedCategory]);

  // Featured post (latest / first in list)
  const featuredPost = useMemo(() => posts[0], [posts]);
  
  // Other posts (exclude featured when list is unfiltered)
  const regularPosts = useMemo(() => {
    if (searchTerm || selectedCategory !== 'All') {
      return filteredPosts;
    }
    return filteredPosts.filter(p => p.id !== featuredPost.id);
  }, [filteredPosts, featuredPost, searchTerm, selectedCategory]);

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
    const url = `${window.location.origin}/blog/${post.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!', {
      description: 'Share this spark of growth with your tribe.'
    });
  };

  // Find active post for details view
  const activePost = useMemo(() => {
    if (!postId) {
      if (!user && posts.length > 0) {
        return posts[0];
      }
      return null;
    }
    return posts.find(p => p.id === postId) || blogService.getPostById(postId);
  }, [postId, posts, user]);

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
          <div className="flex items-center justify-between pb-6 border-b border-gray-100 mb-8">
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
          <div className="prose prose-sm prose-emerald max-w-none mb-12">
            {renderFormattedContent(activePost.content)}
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
              {user ? "Put This Lesson Into Practice" : "Join Rise to Level Up"}
            </h3>
            <p className="text-xs text-gray-500 font-medium mb-5 leading-relaxed">
              {user 
                ? "Don't let this be another piece of information that sits idle. Convert knowledge into execution steps."
                : "Create an account to join sprints, track your habits, and accelerate your execution."
              }
            </p>
            <Link 
              to={user ? "/explore" : "/login"} 
              className="inline-block px-6 py-3 bg-[#0E7850] hover:bg-[#0b5d3e] text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              {user ? "Start Sprint Now" : "Join Rise Now"}
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
                      navigate(`/blog/${post.id}`);
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
        <p className="text-[9px] font-black text-primary uppercase tracking-[0.25em] mb-1">Rise Insights</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">RiseBlog</h1>
        <p className="text-xs text-gray-400 font-medium leading-relaxed mt-1">
          Bite-sized, science-backed articles to refine your mindset, master daily micro-habits, and elevate your team’s execution.
        </p>
      </div>

      {/* Search and Categories */}
      <div className="max-w-md mx-auto space-y-4 mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4.5 h-4.5" />
          <input 
            type="text" 
            placeholder="Search articles, tactics, systems..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-100 text-sm pl-11 pr-4 py-3.5 rounded-2xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium text-gray-900 placeholder:text-gray-300 transition-all shadow-sm"
          />
        </div>

        {/* Categories filters sideways scrolling */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                selectedCategory === cat 
                ? 'bg-primary border-primary text-white shadow-sm shadow-primary/25' 
                : 'bg-white border-gray-100 text-gray-400 hover:text-gray-600 hover:border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
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
        {searchTerm === '' && selectedCategory === 'All' && featuredPost && (
          <div className="space-y-3">
            <div className="px-1">
              <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.3em]">Featured Spark</p>
            </div>
            <div 
              onClick={() => navigate(`/blog/${featuredPost.id}`)}
              className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer group"
            >
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={featuredPost.coverImage} 
                  alt={featuredPost.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-4 left-4 px-3 py-1 bg-primary text-[9px] font-black uppercase tracking-widest rounded-full text-white">
                  {featuredPost.category}
                </span>
              </div>
              
              <div className="p-6">
                <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-300" /> {featuredPost.publishedAt}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-300" /> {featuredPost.readTime}
                  </span>
                </div>
                
                <h3 className="text-lg font-black text-gray-950 tracking-tight leading-snug mb-2 group-hover:text-primary transition-colors">
                  {featuredPost.title}
                </h3>
                
                <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-3 mb-6">
                  {featuredPost.excerpt}
                </p>

                <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                  <div className="flex items-center gap-2">
                    <img 
                      src={featuredPost.author.avatar} 
                      alt={featuredPost.author.name} 
                      className="w-7 h-7 rounded-full object-cover border border-gray-200"
                    />
                    <span className="text-[10px] font-black text-gray-800 uppercase tracking-wider">{featuredPost.author.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleLike(featuredPost.id, e); }}
                      className={`p-2 rounded-full transition-all active:scale-90 ${likedPosts[featuredPost.id] ? 'text-rose-500 bg-rose-50' : 'text-gray-300 hover:text-gray-500'}`}
                    >
                      <Heart className={`w-4 h-4 ${likedPosts[featuredPost.id] ? 'fill-rose-500' : ''}`} />
                    </button>
                    <button 
                      onClick={(e) => handleShare(featuredPost, e)}
                      className="p-2 text-gray-300 hover:text-gray-500 rounded-full transition-all active:scale-90"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regular cards list */}
        {regularPosts.length > 0 && (
          <div className="space-y-4">
            {searchTerm === '' && selectedCategory === 'All' && (
              <div className="px-1">
                <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.3em]">Latest Releases</p>
              </div>
            )}
            
            {regularPosts.map((post) => {
              const isLiked = likedPosts[post.id];
              return (
                <div 
                  key={post.id}
                  onClick={() => navigate(`/blog/${post.id}`)}
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
