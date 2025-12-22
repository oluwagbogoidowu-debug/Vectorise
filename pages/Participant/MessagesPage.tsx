
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Conversation, Message, Participant, Sprint } from '../../types';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '../../services/mockChatData';
import { MOCK_SPRINTS, MOCK_USERS } from '../../services/mockData';

// Combines conversation with its context (e.g., a Sprint)
interface Thread {
    conv: Conversation;
    sourceName: string; // "Sprint: Growth Mindset" or "Tribe: UI/UX Designers"
    sourceType: 'SPRINT' | 'TRIBE' | 'DIRECT';
}

const MessagesPage: React.FC = () => {
    const { user, login } = useAuth();
    const [threads, setThreads] = useState<Thread[]>([]);
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [replyText, setReplyText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Automatically log in the mock user if no one is logged in
    useEffect(() => {
        if (!user) {
            login('participant1');
        }
    }, [user, login]);

    // Build and enrich conversation threads
    useEffect(() => {
        if (!user || !user.enrolledSprintIds) return;

        const allConversations = MOCK_CONVERSATIONS; // In a real app, this would be fetched

        const enrichedThreads = allConversations
            .filter(c => c.participants.some(p => p.userId === user.id)) // Filter conversations user is in
            .map((conv): Thread | null => {
                if (conv.type === 'group') {
                    return { conv, sourceName: `Tribe: ${conv.groupName}`, sourceType: 'TRIBE' };
                }

                // For direct messages, find the corresponding sprint
                const otherParticipant = conv.participants.find(p => p.userId !== user.id);
                if (!otherParticipant) return null;

                const coachId = otherParticipant.userId;
                const relevantSprint = MOCK_SPRINTS.find(sprint =>
                    sprint.coachId === coachId && user.enrolledSprintIds!.includes(sprint.id)
                );

                if (relevantSprint) {
                    return { conv, sourceName: `Sprint: ${relevantSprint.title}`, sourceType: 'SPRINT' };
                }

                return { conv, sourceName: "Direct Message", sourceType: 'DIRECT' };
            })
            .filter((t): t is Thread => t !== null) // Remove any nulls
            .sort((a, b) => new Date(b.conv.lastMessage.timestamp).getTime() - new Date(a.conv.lastMessage.timestamp).getTime());

        setThreads(enrichedThreads);

    }, [user]);

    // Effect to update messages when conversation changes
    useEffect(() => {
        if (selectedConvId) {
            const currentMessages = MOCK_MESSAGES[selectedConvId] || [];
            setMessages([...currentMessages]);
        }
    }, [selectedConvId]);

    // Scroll to bottom of chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !selectedConvId || !user) return;

        const newMessage: Message = {
            id: `msg-${Date.now()}`,
            senderId: user.id,
            senderName: user.name,
            senderAvatar: user.profileImageUrl || '',
            content: replyText,
            timestamp: new Date().toISOString(),
            conversationId: selectedConvId,
        };

        setMessages(prev => [...prev, newMessage]);
        setReplyText('');
    };

    const selectedThread = threads.find(t => t.conv.id === selectedConvId);
    const getConversationTitle = (thread: Thread) => {
        if (thread.conv.type === 'group') return thread.conv.groupName;
        const otherUser = thread.conv.participants.find(p => p.userId !== user?.id);
        return otherUser?.name || 'Conversation';
    };

    const getConversationAvatar = (thread: Thread) => {
        if (thread.conv.type === 'group') return thread.conv.groupAvatar;
        const otherUser = thread.conv.participants.find(p => p.userId !== user?.id);
        return otherUser?.avatar;
    };

    const filteredThreads = threads.filter(t =>
        getConversationTitle(t).toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.sourceName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto px-4 py-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
                    <p className="text-gray-500 text-sm">Your conversations with coaches and tribes.</p>
                </div>
            </div>

            <div className="flex flex-1 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                {/* Sidebar */}
                <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col ${selectedConvId ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="divide-y divide-gray-50">
                            {filteredThreads.map(thread => {
                                const isSelected = selectedConvId === thread.conv.id;
                                return (
                                    <div key={thread.conv.id} onClick={() => setSelectedConvId(thread.conv.id)} className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                                        <div className="flex gap-3">
                                            <img src={getConversationAvatar(thread)} alt="" className="w-10 h-10 rounded-full object-cover border flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <h3 className={`text-sm font-bold truncate ${thread.conv.unreadCount > 0 ? 'text-black' : 'text-gray-700'}`}>{getConversationTitle(thread)}</h3>
                                                    <span className="text-[10px] text-gray-400 flex-shrink-0">{new Date(thread.conv.lastMessage.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                </div>
                                                <p className="text-xs text-primary font-medium mb-1 truncate">{thread.sourceName}</p>
                                                <p className={`text-xs truncate ${thread.conv.unreadCount > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>{thread.conv.lastMessage.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`flex-1 flex flex-col bg-white ${selectedConvId ? 'flex' : 'hidden md:flex'}`}>
                    {selectedThread ? (
                        <>
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setSelectedConvId(null)} className="md:hidden text-gray-500 hover:text-primary p-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <img src={getConversationAvatar(selectedThread)} alt="" className="w-8 h-8 rounded-full object-cover" />
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm">{getConversationTitle(selectedThread)}</h3>
                                        {selectedThread.conv.type === 'group' && (
                                            <p className="text-xs text-gray-500">{selectedThread.conv.participants.length} members</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f0f2f5]" ref={chatContainerRef}>
                                {messages.map((msg) => {
                                    const isMe = msg.senderId === user?.id;
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'}`}>
                                                {!isMe && selectedThread.conv.type === 'group' && (
                                                    <p className="text-xs font-bold text-primary mb-1">{msg.senderName}</p>
                                                )}
                                                <p className="leading-relaxed">{msg.content}</p>
                                                <span className={`text-[9px] block mt-1 text-right ${isMe ? 'text-white/70' : 'text-gray-400'}`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="p-3 bg-white border-t border-gray-100">
                                <form onSubmit={handleReply} className="flex gap-2 items-end">
                                    <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type a message..." className="flex-1 bg-gray-50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none resize-none text-sm" rows={1} />
                                    <button type="submit" disabled={!replyText.trim()} className="w-11 h-11 flex items-center justify-center bg-primary text-white rounded-full hover:bg-primary-hover disabled:opacity-50 transition-all shadow-sm flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90 ml-0.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50/30">
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-gray-600 mb-1">Your Inbox</h3>
                                <p className="text-sm">Select a conversation to start messaging.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessagesPage;
