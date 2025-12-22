
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '../../services/mockChatData';
import { Conversation, Message, User } from '../../types';

interface EnrichedConversation extends Conversation {
    participant: {
        userId: string;
        name: string;
        avatar: string;
    };
}

const CoachParticipants: React.FC = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<EnrichedConversation[]>([]);
    const [messages, setMessages] = useState<Record<string, Message[]>>({});
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!user) return;

        const myConversations = MOCK_CONVERSATIONS.filter(c =>
            c.participants.some(p => p.userId === user.id)
        );

        const enriched: EnrichedConversation[] = myConversations.map(conv => {
            const otherParticipant = conv.participants.find(p => p.userId !== user.id)!;
            return {
                ...conv,
                participant: otherParticipant,
            };
        });

        enriched.sort((a, b) => {
            const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
            const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
            return timeB - timeA;
        });

        setConversations(enriched);
        setMessages(MOCK_MESSAGES);
    }, [user, refreshKey]);

    useEffect(() => {
        const interval = setInterval(() => setRefreshKey(prev => prev + 1), 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [selectedConversationId, messages]);

    const filteredConversations = conversations.filter(c =>
        c.participant.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeConversation = useMemo(() => {
        return conversations.find(c => c.id === selectedConversationId) || null;
    }, [selectedConversationId, conversations]);

    const activeMessages = useMemo(() => {
        return (selectedConversationId ? messages[selectedConversationId] : []) || [];
    }, [selectedConversationId, messages]);
    
    const handleSelectConversation = (conversationId: string) => {
        setSelectedConversationId(conversationId);
        const conv = MOCK_CONVERSATIONS.find(c => c.id === conversationId);
        if (conv) {
            conv.unreadCount = 0;
        }
    };

    const handleReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !user || !selectedConversationId || !activeConversation) return;

        const newMessage: Message = {
            id: `msg-${Date.now()}`,
            conversationId: selectedConversationId,
            senderId: user.id,
            senderName: user.name,
            senderAvatar: user.profileImageUrl || '',
            content: replyText,
            timestamp: new Date().toISOString(),
        };

        if (!MOCK_MESSAGES[selectedConversationId]) {
            MOCK_MESSAGES[selectedConversationId] = [];
        }
        MOCK_MESSAGES[selectedConversationId].push(newMessage);

        const convIndex = MOCK_CONVERSATIONS.findIndex(c => c.id === selectedConversationId);
        if (convIndex !== -1) {
            MOCK_CONVERSATIONS[convIndex].lastMessage = newMessage;
        }

        setReplyText('');
        setRefreshKey(prev => prev + 1);
    };
    
    const renderMessageContent = (content: string) => {
        const contextMatch = content.match(/\[CONTEXT:(.*?)\]\n(.*)/s);

        if (contextMatch) {
            const contextText = contextMatch[1];
            const messageText = contextMatch[2];
            return (
                <>
                    <span className="block text-xs font-bold opacity-80 mb-1">
                        {contextText}
                    </span>
                    <p className="leading-relaxed whitespace-pre-wrap">{messageText}</p>
                </>
            );
        }
        return <p className="leading-relaxed whitespace-pre-wrap">{content}</p>;
    };

    const cleanContentForPreview = (content: string) => {
        return content.replace(/\[CONTEXT:.*?\]\n?/s, '');
    };

    if (!user) return null;

    return (
        <div className="max-w-6xl mx-auto px-4 py-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Coaching Inbox</h1>
                    <p className="text-gray-500 text-sm">Manage student conversations.</p>
                </div>
            </div>

            <div className="flex flex-1 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredConversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => handleSelectConversation(conv.id)}
                                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors relative ${selectedConversationId === conv.id ? 'bg-blue-50/50' : ''}`}
                            >
                                <div className="flex gap-3">
                                    <img src={conv.participant.avatar} alt={conv.participant.name} className="w-10 h-10 rounded-full object-cover border" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className={`text-sm font-bold truncate ${conv.unreadCount > 0 ? 'text-black' : 'text-gray-700'}`}>{conv.participant.name}</h3>
                                            {conv.lastMessage && <span className="text-[10px] text-gray-400 flex-shrink-0">{new Date(conv.lastMessage.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
                                        </div>
                                        <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                                            {conv.lastMessage ? (conv.lastMessage.senderId === user.id ? 'You: ' : '') + cleanContentForPreview(conv.lastMessage.content) : <span className="italic">No messages yet</span>}
                                        </p>
                                    </div>
                                </div>
                                {conv.unreadCount > 0 && <div className="absolute right-4 top-1/2 mt-2 w-2 h-2 bg-primary rounded-full ring-4 ring-white"></div>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className={`flex-1 flex flex-col bg-white ${activeConversation ? 'flex' : 'hidden md:flex'}`}>
                    {activeConversation ? (
                        <>
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setSelectedConversationId(null)} className="md:hidden text-gray-500 p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                                    <img src={activeConversation.participant.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm">{activeConversation.participant.name}</h3>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f0f2f5]" ref={chatContainerRef}>
                                {activeMessages.map(msg => {
                                    const isMe = msg.senderId === user.id;
                                    const author = isMe ? user : activeConversation.participant;
                                    return (
                                        <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            {!isMe && <img src={author.avatar} alt={author.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />}
                                            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm relative ${isMe ? 'bg-[#0E7850] text-white rounded-br-lg' : 'bg-white text-gray-800 rounded-bl-lg border border-gray-100'}`}>
                                                {renderMessageContent(msg.content)}
                                                <span className={`text-[9px] block mt-1 text-right ${isMe ? 'text-white/70' : 'text-gray-400'}`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            {isMe && <img src={(author as User).profileImageUrl} alt={author.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />}
                                        </div>
                                    );
                                })}
                            </div>

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
                                    <button type="submit" disabled={!replyText.trim()} className="w-11 h-11 flex items-center justify-center bg-primary text-white rounded-full hover:bg-primary-hover disabled:opacity-50 transition-all shadow-sm flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90 ml-0.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/30">
                             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
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
