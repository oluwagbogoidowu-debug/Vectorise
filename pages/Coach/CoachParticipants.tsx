
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_PARTICIPANT_SPRINTS, MOCK_USERS, MOCK_SPRINTS, MOCK_COACHING_COMMENTS } from '../../services/mockData';
import { Participant, Sprint, CoachingComment } from '../../types';
import Button from '../../components/Button';

interface Thread {
    participant: Participant;
    sprint: Sprint;
    lastMessage?: CoachingComment;
    unreadCount: number;
}

const CoachParticipants: React.FC = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  
  // Inbox State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Polling key to trigger re-renders based on Mock Data changes
  const [refreshKey, setRefreshKey] = useState(0);

  // Real-time Polling Effect (Simulated)
  useEffect(() => {
      const interval = setInterval(() => {
          setRefreshKey(prev => prev + 1);
      }, 2000);
      return () => clearInterval(interval);
  }, []);

  // Build Thread List
  useEffect(() => {
      if (user) {
          const mySprints = MOCK_SPRINTS.filter(s => s.coachId === user.id);
          const mySprintIds = mySprints.map(s => s.id);
          
          // Get all unique student enrollments for my sprints
          const enrollments = MOCK_PARTICIPANT_SPRINTS.filter(ps => mySprintIds.includes(ps.sprintId));
          
          const threadList: Thread[] = enrollments.map(enrollment => {
              const student = MOCK_USERS.find(u => u.id === enrollment.participantId) as Participant;
              const sprint = mySprints.find(s => s.id === enrollment.sprintId) as Sprint;
              
              // Get conversation history for this specific pair
              const history = MOCK_COACHING_COMMENTS.filter(c => 
                  c.participantId === student.id && c.sprintId === sprint.id
              ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

              const lastMsg = history[0];
              
              // Count unread messages from the student
              const unread = history.filter(c => c.authorId === student.id && !c.read).length;

              return {
                  participant: student,
                  sprint,
                  lastMessage: lastMsg,
                  unreadCount: unread
              };
          })
          .filter(item => item.participant) // Ensure user exists
          .sort((a, b) => {
              // Sort by last message time, otherwise by name
              const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
              const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
              return timeB - timeA;
          });

          setThreads(threadList);
      }
  }, [user, refreshKey]);

  // Scroll to bottom of chat
  useEffect(() => {
      if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
  }, [selectedStudentId, refreshKey]);

  // Filter threads
  const filteredThreads = threads.filter(t => 
      t.participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.sprint.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get Active Conversation
  const activeConversation = useMemo(() => {
      if (!selectedStudentId || !selectedSprintId) return [];
      return MOCK_COACHING_COMMENTS
        .filter(c => c.participantId === selectedStudentId && c.sprintId === selectedSprintId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [selectedStudentId, selectedSprintId, refreshKey]);

  const handleReply = (e: React.FormEvent) => {
      e.preventDefault();
      if (!replyText.trim() || !user || !selectedStudentId || !selectedSprintId) return;

      // Determine which Day context to reply to (use latest message or default to 1)
      const lastMsg = activeConversation[activeConversation.length - 1];
      const dayContext = lastMsg ? lastMsg.day : 1;

      const newComment: CoachingComment = {
          id: `cc_${Date.now()}`,
          sprintId: selectedSprintId,
          day: dayContext,
          participantId: selectedStudentId,
          authorId: user.id, // Coach is the author
          content: replyText,
          timestamp: new Date().toISOString(),
          read: false
      };

      MOCK_COACHING_COMMENTS.push(newComment);
      
      // Mark student messages as read
      MOCK_COACHING_COMMENTS.forEach(c => {
          if (c.participantId === selectedStudentId && c.sprintId === selectedSprintId && c.authorId === selectedStudentId) {
              c.read = true;
          }
      });

      setReplyText('');
      setRefreshKey(prev => prev + 1);
  };

  const selectedThread = threads.find(t => t.participant.id === selectedStudentId && t.sprint.id === selectedSprintId);

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Coaching Inbox</h1>
            <p className="text-gray-500 text-sm">Manage student questions and progress.</p>
          </div>
      </div>
      
      <div className="flex flex-1 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* LEFT SIDEBAR: Threads List */}
          <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col ${selectedStudentId ? 'hidden md:flex' : 'flex'}`}>
              {/* Search */}
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                  <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Search students..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                  </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                  {filteredThreads.length > 0 ? (
                      <div className="divide-y divide-gray-50">
                          {filteredThreads.map((thread, idx) => {
                              const isSelected = selectedStudentId === thread.participant.id && selectedSprintId === thread.sprint.id;
                              return (
                                  <div 
                                    key={`${thread.participant.id}_${thread.sprint.id}`} 
                                    onClick={() => {
                                        setSelectedStudentId(thread.participant.id);
                                        setSelectedSprintId(thread.sprint.id);
                                    }}
                                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors relative ${isSelected ? 'bg-blue-50/50 hover:bg-blue-50' : ''}`}
                                  >
                                      <div className="flex gap-3">
                                          <img src={thread.participant.profileImageUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                              <div className="flex justify-between items-baseline mb-1">
                                                  <h3 className={`text-sm font-bold truncate ${thread.unreadCount > 0 ? 'text-black' : 'text-gray-700'}`}>
                                                      {thread.participant.name}
                                                  </h3>
                                                  {thread.lastMessage && (
                                                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                                                          {new Date(thread.lastMessage.timestamp).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                                      </span>
                                                  )}
                                              </div>
                                              <p className="text-xs text-primary font-medium mb-1 truncate">{thread.sprint.title}</p>
                                              <p className={`text-xs truncate ${thread.unreadCount > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                                                  {thread.lastMessage 
                                                    ? (thread.lastMessage.authorId === user.id ? 'You: ' : '') + thread.lastMessage.content 
                                                    : <span className="italic text-gray-400">No messages yet</span>}
                                              </p>
                                          </div>
                                      </div>
                                      {thread.unreadCount > 0 && (
                                          <div className="absolute right-4 top-1/2 mt-2 w-2 h-2 bg-primary rounded-full ring-4 ring-white"></div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  ) : (
                      <div className="p-8 text-center text-gray-400 text-sm">
                          No conversations found.
                      </div>
                  )}
              </div>
          </div>

          {/* RIGHT SIDE: Chat Area */}
          <div className={`flex-1 flex flex-col bg-white ${selectedStudentId ? 'flex' : 'hidden md:flex'}`}>
              {selectedThread ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSelectedStudentId(null)} className="md:hidden text-gray-500 hover:text-primary p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <img src={selectedThread.participant.profileImageUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">{selectedThread.participant.name}</h3>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                    {selectedThread.sprint.title}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             {/* Action buttons like View Progress could go here */}
                             <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Student</span>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f0f2f5]" ref={chatContainerRef}>
                        {activeConversation.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm">
                                    <span className="text-2xl">👋</span>
                                </div>
                                <p className="text-sm">Start the conversation with {selectedThread.participant.name}.</p>
                            </div>
                        ) : (
                            activeConversation.map((msg, i) => {
                                const isMe = msg.authorId === user.id; // I am the Coach
                                const showDayHeader = i === 0 || activeConversation[i-1].day !== msg.day;

                                return (
                                    <React.Fragment key={msg.id}>
                                        {showDayHeader && (
                                            <div className="flex justify-center my-4">
                                                <span className="bg-white/60 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase shadow-sm border border-gray-100">
                                                    Sprint Day {msg.day}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm relative ${
                                                isMe 
                                                ? 'bg-[#0E7850] text-white rounded-br-none' // Green for Coach
                                                : 'bg-white text-gray-800 rounded-bl-none border border-gray-100' // White/Gray for Student
                                            }`}>
                                                <p className="leading-relaxed">{msg.content}</p>
                                                <span className={`text-[9px] block mt-1 text-right ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                                                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-gray-100">
                        <form onSubmit={handleReply} className="flex gap-2 items-end">
                            <textarea 
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Type your advice..."
                                className="flex-1 bg-gray-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none resize-none text-sm"
                                rows={1}
                                style={{ minHeight: '44px', maxHeight: '120px' }}
                            />
                            <button 
                                type="submit" 
                                disabled={!replyText.trim()}
                                className="w-11 h-11 flex items-center justify-center bg-primary text-white rounded-full hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex-shrink-0"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            </button>
                        </form>
                    </div>
                  </>
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/30">
                      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                      </div>
                      <h3 className="text-lg font-bold text-gray-600 mb-1">Coaching Inbox</h3>
                      <p className="text-sm">Select a participant to view their messages.</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default CoachParticipants;
