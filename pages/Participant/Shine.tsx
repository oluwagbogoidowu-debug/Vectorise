
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ShinePost, ShineComment } from '../../types';
import { shineService } from '../../services/shineService';

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

const NudgeCard = () => (
    <div className="bg-gradient-to-r from-primary to-[#0B6040] rounded-[2rem] p-6 shadow-xl text-white my-8 relative overflow-hidden group">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-6">
            <div>
                <p className="font-black text-xl mb-2 tracking-tight leading-none">Stay Grounded</p>
                <p className="text-white/80 text-sm mb-5 max-w-[280px] font-medium leading-relaxed">Scrolling is easy. Progress is intentional. Have you completed your task for today?</p>
                <Link to="/dashboard">
                    <button className="bg-white text-primary px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-lg active:scale-95">
                        Go to Dashboard
                    </button>
                </Link>
            </div>
            <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform duration-500">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            </div>
        </div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/10 rounded-full blur-2xl pointer-events-none"></div>
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

    useEffect(() => {
        if (isOpen && post) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    }, [isOpen, post?.commentData?.length]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || !post) return;
        setIsSubmitting(true);
        onAddComment(post.id, commentText);
        setCommentText('');
        setIsSubmitting(false);
    };

    if (!isOpen || !post) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-md">
            <div className="w-full bg-white rounded-t-[2.5rem] h-[85vh] flex flex-col shadow-2xl max-w-md mx-auto overflow-hidden animate-slide-up">
                <div className="flex items-center justify-between px-8 py-6 border-b border-primary/5 bg-white">
                    <h3 className="text-xl font-bold text-gray-900">Reflections ({post.comments})</h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-full transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
                    {post.commentData && post.commentData.length > 0 ? (
                        post.commentData.map((comment) => (
                            <div key={comment.id} className="flex gap-4">
                                <Link to={`/profile/${comment.userId}`} className="flex-shrink-0">
                                    <img src={comment.userAvatar} alt={comment.userName} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-primary/5" />
                                </Link>
                                <div className="flex-1">
                                    <div className="bg-white px-5 py-3 rounded-2xl rounded-tl-none border border-primary/10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                        <Link to={`/profile/${comment.userId}`} className="text-xs font-black text-gray-900 mb-1 block hover:underline uppercase tracking-tight">{comment.userName}</Link>
                                        <p className="text-sm text-gray-700 leading-relaxed font-medium">{comment.content}</p>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 mt-2 ml-1 uppercase tracking-widest">{formatTimeAgo(comment.timestamp)}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20">
                            <p className="text-gray-300 font-bold text-sm uppercase tracking-widest">No reflections yet.</p>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                <div className="p-6 border-t border-primary/5 bg-white pb-10">
                    <form onSubmit={handleSubmit} className="flex gap-3">
                        <input 
                            type="text" 
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Share an insight..." 
                            className="flex-1 bg-white border border-primary/10 rounded-full px-6 py-4 focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all outline-none font-medium text-sm"
                        />
                        <button 
                            type="submit" 
                            disabled={!commentText.trim() || isSubmitting}
                            className="w-12 h-12 bg-primary text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all flex items-center justify-center active:scale-90"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

interface ShineProps { viewMode?: 'participant' | 'coach'; }

const Shine: React.FC<ShineProps> = ({ viewMode = 'participant' }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ShinePost[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [sortOrder, setSortOrder] = useState<'recent' | 'liked'>('recent');
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
      const unsubscribe = shineService.subscribeToPosts((fetchedPosts) => setPosts(fetchedPosts));
      return () => unsubscribe();
  }, []);

  useEffect(() => {
      if (isComposeOpen && inputRef.current) {
          setTimeout(() => inputRef.current?.focus(), 150); 
      }
  }, [isComposeOpen]);

  const sortedPosts = useMemo(() => {
      return [...posts].sort((a, b) => {
          if (sortOrder === 'recent') return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          return b.likes - a.likes;
      });
  }, [posts, sortOrder]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !user) return;
    setIsPosting(true);
    const postData: Omit<ShinePost, 'id'> = {
        userId: user.id, userName: user.name, userAvatar: user.profileImageUrl,
        content: newPostContent, timestamp: new Date().toISOString(),
        likes: 0, comments: 0, isLiked: false, isSaved: false, commentData: []
    };
    try {
        await shineService.createPost(postData);
        setNewPostContent('');
        setIsComposeOpen(false);
    } catch (error) {
        console.error(error);
    } finally {
        setIsPosting(false);
    }
  };

  const toggleLike = (postId: string) => {
    setPosts(posts.map(post => post.id === postId ? {
          ...post, likes: post.isLiked ? post.likes - 1 : post.likes + 1, isLiked: !post.isLiked
        } : post
    ));
  };

  const handleAddComment = async (postId: string, text: string) => {
      if (!user) return;
      const newComment: ShineComment = {
          id: `c_${Date.now()}`, userId: user.id, userName: user.name,
          userAvatar: user.profileImageUrl, content: text, timestamp: new Date().toISOString()
      };
      setPosts(posts.map(post => post.id === postId ? {
                  ...post, comments: post.comments + 1, commentData: [...(post.commentData || []), newComment]
              } : post
      ));
      await shineService.addComment(postId, newComment);
  };

  const activePost = activeCommentPostId ? posts.find(p => p.id === activeCommentPostId) || null : null;

  // Helper to determine if the nudge should be shown at this index
  const shouldShowNudge = (idx: number) => {
      if (viewMode !== 'participant') return false;
      const position = idx + 1;
      if (position < 20) return false;
      
      // Progression: 20, 40, 80, 160... (20 * 2^n)
      const ratio = position / 20;
      // Check if ratio is a power of 2 (1, 2, 4, 8, etc.)
      return Number.isInteger(ratio) && (ratio > 0) && ((ratio & (ratio - 1)) === 0);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white pb-32 relative animate-fade-in">
      <CommentsModal post={activePost} isOpen={!!activeCommentPostId} onClose={() => setActiveCommentPostId(null)} onAddComment={handleAddComment} />

      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-primary/5 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl border border-yellow-100 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Shine Feed</h1>
        </div>
        
        <div className="bg-white p-1 rounded-xl flex items-center border border-primary/10 shadow-sm">
            {['recent', 'liked'].map((o) => (
                <button key={o} onClick={() => setSortOrder(o as any)} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${sortOrder === o ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                    {o === 'recent' ? 'Recent' : 'Top'}
                </button>
            ))}
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 bg-white">
        {sortedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white">
                <div className="w-12 h-12 border-2 border-primary/10 border-t-primary rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-bold uppercase tracking-widest">Collecting Wins...</p>
            </div>
        ) : sortedPosts.map((post, idx) => (
            <React.Fragment key={post.id}>
              <div className={`bg-white rounded-3xl p-6 shadow-md border border-primary/5 group transition-all hover:shadow-lg ${viewMode === 'coach' ? 'border-l-4 border-l-primary' : ''}`}>
                  <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                          <Link to={`/profile/${post.userId}`} className="flex-shrink-0">
                              <img src={post.userAvatar} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-primary/10" />
                          </Link>
                          <div>
                              <Link to={`/profile/${post.userId}`} className="font-bold text-gray-900 text-sm hover:text-primary transition-colors underline-offset-2">{post.userName}</Link>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatTimeAgo(post.timestamp)}</p>
                          </div>
                      </div>
                      {post.sprintTitle && (
                          <span className="text-[9px] font-black bg-white text-blue-600 px-3 py-1 rounded-full border border-blue-100 shadow-sm uppercase tracking-widest">
                              {post.sprintTitle.split(' (')[0]}
                          </span>
                      )}
                  </div>
                  
                  <div className="pl-0 sm:pl-[60px]">
                      <p className="text-gray-700 text-sm leading-relaxed mb-6 font-medium whitespace-pre-wrap">"{post.content}"</p>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-primary/5">
                          <div className="flex items-center gap-8">
                              <button onClick={() => toggleLike(post.id)} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${post.isLiked ? 'text-red-500 scale-110' : 'text-gray-400 hover:text-gray-600 hover:scale-105'}`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${post.isLiked ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                  </svg>
                                  {post.likes}
                              </button>
                              <button onClick={() => setActiveCommentPostId(post.id)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-all hover:scale-105">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                  {post.comments}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
              {shouldShowNudge(idx) && <NudgeCard />}
            </React.Fragment>
        ))}
      </div>

      <div className="fixed bottom-[76px] left-0 w-full flex justify-center z-30 px-6">
        <div className="w-full max-w-md">
            {isComposeOpen ? (
                <form onSubmit={handlePost} className="bg-white rounded-[2.5rem] shadow-2xl p-2 flex items-end gap-1 border border-primary/10 animate-slide-up origin-bottom">
                    <textarea
                        ref={inputRef} value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)}
                        placeholder="What's your visible progress?"
                        className="flex-1 max-h-32 py-4 px-6 bg-white border-none focus:ring-0 resize-none text-sm font-medium leading-relaxed placeholder-gray-300"
                        rows={1} style={{ minHeight: '52px' }} 
                    />
                    <div className="p-1">
                        {newPostContent.trim() ? (
                            <button type="submit" disabled={isPosting} className="w-12 h-12 bg-primary text-white rounded-full shadow-lg hover:bg-primary-hover transition-all flex items-center justify-center">
                                {isPosting ? <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                            </button>
                        ) : (
                            <button type="button" onClick={() => setIsComposeOpen(false)} className="w-12 h-12 text-gray-300 hover:text-red-400 transition-colors flex items-center justify-center rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>
                </form>
            ) : (
                <button onClick={() => setIsComposeOpen(true)} className="ml-auto w-14 h-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center hover:bg-primary-hover hover:scale-105 transition-all duration-300 active:scale-95 border-4 border-white">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
            )}
        </div>
      </div>
      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default Shine;
