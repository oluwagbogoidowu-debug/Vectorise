
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_SHINE_POSTS } from '../../services/mockData';
import { ShinePost, ShineComment } from '../../types';

// Simple helper to format relative time
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

// Nudge Card Component
const NudgeCard = () => (
    <div className="bg-gradient-to-r from-primary to-[#0B6040] rounded-2xl p-5 shadow-md text-white my-6 animate-fade-in relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-center">
            <div>
                <p className="font-bold text-lg mb-1">Focus on Your Growth</p>
                <p className="text-white/90 text-sm mb-3 max-w-[240px]">Don't get lost scrolling. Have you completed your sprint task for today?</p>
                <Link to="/dashboard">
                    <button className="bg-white text-primary px-4 py-2 rounded-full text-xs font-bold hover:bg-gray-100 transition-colors shadow-sm">
                        Go to Dashboard
                    </button>
                </Link>
            </div>
            <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            </div>
        </div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl"></div>
    </div>
);

const CommentsModal = ({ 
    post, 
    isOpen, 
    onClose, 
    onAddComment 
}: { 
    post: ShinePost | null, 
    isOpen: boolean, 
    onClose: () => void, 
    onAddComment: (postId: string, text: string) => void 
}) => {
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when opened or new comment added
    useEffect(() => {
        if (isOpen && post) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    }, [isOpen, post?.commentData?.length]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || !post) return;
        
        setIsSubmitting(true);
        // Simulate delay
        setTimeout(() => {
            onAddComment(post.id, commentText);
            setCommentText('');
            setIsSubmitting(false);
        }, 300);
    };

    if (!isOpen || !post) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="w-full bg-white rounded-t-3xl h-[80vh] flex flex-col shadow-2xl animate-slide-up max-w-md mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Comments ({post.comments})</h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {post.commentData && post.commentData.length > 0 ? (
                        post.commentData.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                                <img src={comment.userAvatar} alt={comment.userName} className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1" />
                                <div>
                                    <div className="bg-gray-50 px-4 py-2 rounded-2xl rounded-tl-none">
                                        <p className="text-xs font-bold text-gray-900 mb-0.5">{comment.userName}</p>
                                        <p className="text-sm text-gray-800 leading-relaxed">{comment.content}</p>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1 ml-2">{formatTimeAgo(comment.timestamp)}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            <p>No comments yet.</p>
                            <p className="text-sm">Be the first to share your thoughts!</p>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input Footer */}
                <div className="p-4 border-t border-gray-100 bg-white pb-8">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input 
                            type="text" 
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a comment..." 
                            className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                            autoFocus
                        />
                        <button 
                            type="submit" 
                            disabled={!commentText.trim() || isSubmitting}
                            className="p-3 bg-primary text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
             <style>{`
                @keyframes slideUp {
                  from { transform: translateY(100%); }
                  to { transform: translateY(0); }
                }
                .animate-slide-up {
                  animation: slideUp 0.3s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fadeIn 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
}

interface ShineProps {
    viewMode?: 'participant' | 'coach';
}

const Shine: React.FC<ShineProps> = ({ viewMode = 'participant' }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ShinePost[]>(MOCK_SHINE_POSTS);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [sortOrder, setSortOrder] = useState<'recent' | 'liked'>('recent');
  
  // Comment State
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when opened
  useEffect(() => {
      if (isComposeOpen && inputRef.current) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100); // Slight delay to allow animation to start smoothly
      }
  }, [isComposeOpen]);

  const sortedPosts = useMemo(() => {
      // In coach mode, we might filter for only participants (for now, showing all as example)
      let visiblePosts = posts;
      if (viewMode === 'coach') {
          // Optional: filter posts logic for coaches
      }

      return [...visiblePosts].sort((a, b) => {
          if (sortOrder === 'recent') {
              return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          } else {
              return b.likes - a.likes;
          }
      });
  }, [posts, sortOrder, viewMode]);

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !user) return;

    setIsPosting(true);

    // Simulate API call
    setTimeout(() => {
      const newPost: ShinePost = {
        id: `post_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userAvatar: user.profileImageUrl,
        content: newPostContent,
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: 0,
        isLiked: false,
        isSaved: false,
        commentData: []
      };

      setPosts([newPost, ...posts]);
      setNewPostContent('');
      setIsComposeOpen(false);
      setIsPosting(false);
    }, 600);
  };

  const toggleLike = (postId: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1,
          isLiked: !post.isLiked
        };
      }
      return post;
    }));
  };

  const toggleSave = (postId: string) => {
      setPosts(posts.map(post => {
          if (post.id === postId) {
              return {
                  ...post,
                  isSaved: !post.isSaved
              };
          }
          return post;
      }));
  }

  const handleAddComment = (postId: string, text: string) => {
      if (!user) return;

      const newComment: ShineComment = {
          id: `c_${Date.now()}`,
          userId: user.id,
          userName: user.name,
          userAvatar: user.profileImageUrl,
          content: text,
          timestamp: new Date().toISOString()
      };

      setPosts(posts.map(post => {
          if (post.id === postId) {
              return {
                  ...post,
                  comments: post.comments + 1,
                  commentData: [...(post.commentData || []), newComment]
              };
          }
          return post;
      }));
  };

  const activePost = activeCommentPostId ? posts.find(p => p.id === activeCommentPostId) || null : null;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-32 relative">
      {/* Comment Modal */}
      <CommentsModal 
        post={activePost} 
        isOpen={!!activeCommentPostId} 
        onClose={() => setActiveCommentPostId(null)}
        onAddComment={handleAddComment}
      />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Shine {viewMode === 'coach' && '(Participants)'}</h1>
        </div>
        
        {/* Sort Control */}
        <div className="bg-gray-100 p-1 rounded-lg flex items-center">
            <button 
                onClick={() => setSortOrder('recent')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${sortOrder === 'recent' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Recent
            </button>
             <button 
                onClick={() => setSortOrder('liked')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${sortOrder === 'liked' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Top
            </button>
        </div>
      </div>

      {/* Feed */}
      <div className="px-4 py-4 space-y-4">
        {sortedPosts.map((post, index) => (
          <React.Fragment key={post.id}>
            <div className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 ${viewMode === 'coach' ? 'border-l-4 border-l-primary' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <img src={post.userAvatar} alt={post.userName} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                        <div>
                            <p className="font-bold text-gray-900 text-sm">{post.userName}</p>
                            <p className="text-xs text-gray-500">{formatTimeAgo(post.timestamp)}</p>
                        </div>
                    </div>
                    {post.sprintTitle && (
                        <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded-full max-w-[100px] truncate">
                            {post.sprintTitle}
                        </span>
                    )}
                </div>
                
                <div className="pl-[52px]">
                    <p className="text-gray-800 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>
                    
                    <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                        <div className="flex items-center gap-6">
                            <button 
                                onClick={() => toggleLike(post.id)}
                                className={`flex items-center gap-1.5 text-xs font-medium transition-all duration-200 hover:scale-110 active:scale-90 ${post.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${post.isLiked ? 'fill-current animate-bounce-short' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                {post.likes}
                            </button>
                            <button 
                                onClick={() => setActiveCommentPostId(post.id)}
                                className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                {post.comments}
                            </button>
                        </div>
                        
                        {/* Save Button */}
                        <button 
                            onClick={() => toggleSave(post.id)}
                            className={`text-gray-400 hover:text-primary transition-colors ${post.isSaved ? 'text-primary' : ''}`}
                            title={post.isSaved ? "Unsave" : "Save"}
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${post.isSaved ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            {/* Nudge Card inserted after the 2nd post (index 1) */}
            {index === 1 && viewMode === 'participant' && <NudgeCard />}
          </React.Fragment>
        ))}
      </div>

      {/* Floating Compose Action */}
      <div className="fixed bottom-[76px] left-0 w-full flex justify-center z-30 pointer-events-none">
         <div className="w-full max-w-md px-4 pointer-events-auto flex justify-center items-end h-[60px]">
            {isComposeOpen ? (
                /* WhatsApp Style Input Bar */
                <form onSubmit={handlePost} className="w-full bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-1 flex items-end gap-1 animate-expand origin-bottom overflow-hidden border border-gray-100">
                    <button type="button" className="p-2.5 text-gray-400 hover:text-primary transition-colors rounded-full hover:bg-gray-50 flex-shrink-0 animate-appear" title="Add Picture">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                    
                    <textarea
                        ref={inputRef}
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        placeholder="Share your progress..."
                        className="flex-1 max-h-32 py-2.5 px-2 bg-transparent border-none focus:ring-0 resize-none text-base leading-relaxed placeholder-gray-400 animate-appear"
                        rows={1}
                        style={{ minHeight: '44px', animationDelay: '0.05s' }} 
                    />

                    <div className="animate-appear" style={{ animationDelay: '0.1s' }}>
                        {newPostContent.trim() ? (
                            <button type="submit" disabled={isPosting} className="p-2.5 bg-primary text-white rounded-full shadow-sm hover:bg-primary-hover transition-all mb-0.5 flex-shrink-0">
                                {isPosting ? (
                                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                )}
                            </button>
                        ) : (
                            <button type="button" onClick={() => setIsComposeOpen(false)} className="p-2.5 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 mb-0.5 flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </form>
            ) : (
                /* FAB Button (Hide in Coach Mode to simplify for now or keep if coach wants to post) */
                <button
                    onClick={() => setIsComposeOpen(true)}
                    className="w-14 h-14 bg-primary text-white rounded-full shadow-[0_4px_20px_rgba(14,120,80,0.3)] flex items-center justify-center hover:bg-primary-hover hover:scale-105 transition-all duration-300 active:scale-95 animate-pop-in"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
            )}
         </div>
      </div>
        
        <style>{`
            @keyframes expand {
              0% { width: 56px; border-radius: 28px; }
              100% { width: 100%; border-radius: 24px; }
            }
            .animate-expand {
              animation: expand 0.3s cubic-bezier(0.2, 0, 0.2, 1) forwards;
              overflow: hidden;
            }
            
            @keyframes appear {
                0% { opacity: 0; transform: translateY(5px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            .animate-appear {
                animation: appear 0.2s ease-out backwards;
            }
            
            @keyframes popIn {
                0% { transform: scale(0.5); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }
            .animate-pop-in {
                animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }

            @keyframes bounceShort {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.3); }
            }
            .animate-bounce-short {
                animation: bounceShort 0.3s ease-in-out;
            }
        `}</style>
    </div>
  );
};

export default Shine;
