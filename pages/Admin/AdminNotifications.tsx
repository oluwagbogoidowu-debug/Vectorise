import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { 
    collection, 
    addDoc, 
    getDocs, 
    onSnapshot, 
    query, 
    orderBy, 
    limit, 
    deleteDoc, 
    doc,
    setDoc
} from 'firebase/firestore';
import { 
    Send, 
    Bell, 
    Trash2, 
    Plus, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    Clock, 
    Search, 
    Users, 
    BookOpen,
    ExternalLink
} from 'lucide-react';
import { pushNotificationService } from '../../services/pushNotificationService';
import { userService } from '../../services/userService';

interface Writeup {
    id?: string;
    title: string;
    body: string;
    category: string;
    url: string;
    createdAt?: any;
}

interface DeliveryLog {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    title: string;
    body: string;
    url: string;
    tag: string;
    sentAt: string;
    status: 'sent' | 'delivered' | 'failed' | 'unsubscribed' | 'disabled';
    errorMessage?: string;
}

interface UserDropdownItem {
    id: string;
    name: string;
    email: string;
    fcmToken?: string;
    notificationsDisabled?: boolean;
}

const DEFAULT_WRITEUPS = [
    {
        title: "Keep up the momentum!",
        body: "You are doing great. Keep up your daily momentum by finishing today's step.",
        category: "Reminder",
        url: "/participant/sprint"
    },
    {
        title: "New Sprint Unlocked! 🚀",
        body: "A brand new customized sprint has been generated for you. Let's step up your rise!",
        category: "Announcement",
        url: "/participant/sprint"
    },
    {
        title: "Consistency is Key 💎",
        body: "One small step forward today leads to giant leaps tomorrow. Open your dashboard now.",
        category: "Nudge",
        url: "/dashboard"
    },
    {
        title: "Milestone Reached! 🌟",
        body: "Incredible work! You've successfully completed a key milestone in your program.",
        category: "Milestone",
        url: "/participant/rewards"
    }
];

export default function AdminNotifications() {
    // Writeups / Library states
    const [writeups, setWriteups] = useState<Writeup[]>([]);
    const [newTitle, setNewTitle] = useState('');
    const [newBody, setNewBody] = useState('');
    const [newCategory, setNewCategory] = useState('Nudge');
    const [newUrl, setNewUrl] = useState('/participant/sprint');
    const [isSavingWriteup, setIsSavingWriteup] = useState(false);

    // Users and Sending states
    const [users, setUsers] = useState<UserDropdownItem[]>([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [sendingStates, setSendingStates] = useState<Record<string, { status: 'idle' | 'sending' | 'success' | 'error', message?: string }>>({});

    // Delivery Logs states
    const [logs, setLogs] = useState<DeliveryLog[]>([]);
    const [logsLimit, setLogsLimit] = useState(50);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'delivered' | 'failed' | 'unsubscribed' | 'disabled'>('all');
    const [isClearingLogs, setIsClearingLogs] = useState(false);

    // 1. Fetch saved writeups (push notification library) & Seed defaults if empty
    useEffect(() => {
        const q = query(collection(db, 'push_templates'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (snapshot.empty) {
                // Seed default writeups
                console.log('[AdminNotifications] Seeding default writeups...');
                for (const writeup of DEFAULT_WRITEUPS) {
                    await addDoc(collection(db, 'push_templates'), {
                        ...writeup,
                        createdAt: new Date().toISOString()
                    });
                }
            } else {
                const list: Writeup[] = [];
                snapshot.forEach((d) => {
                    list.push({ id: d.id, ...d.data() } as Writeup);
                });
                setWriteups(list);
            }
        }, (error) => {
            console.error('[AdminNotifications] Error fetching templates:', error);
        });

        return () => unsubscribe();
    }, []);

    // 2. Fetch users for the sending dropdown
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const allUsers = await userService.getAllUsers();
                const formatted = allUsers.map((u: any) => ({
                    id: u.id,
                    name: u.name || 'Unknown',
                    email: u.email || 'No Email',
                    fcmToken: u.fcmToken,
                    notificationsDisabled: u.notificationsDisabled
                }));
                setUsers(formatted);
            } catch (err) {
                console.error('[AdminNotifications] Error fetching user dropdown list:', err);
            }
        };
        fetchUsers();
    }, []);

    // 3. Real-time subscription to Delivery Logs
    useEffect(() => {
        const q = query(collection(db, 'push_delivery_logs'), orderBy('sentAt', 'desc'), limit(logsLimit));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: DeliveryLog[] = [];
            snapshot.forEach((d) => {
                list.push({ id: d.id, ...d.data() } as DeliveryLog);
            });
            setLogs(list);
        }, (error) => {
            console.error('[AdminNotifications] Error subscribing to delivery logs:', error);
        });

        return () => unsubscribe();
    }, [logsLimit]);

    // Handle adding a new writeup
    const handleAddWriteup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newBody.trim()) return;

        setIsSavingWriteup(true);
        try {
            await addDoc(collection(db, 'push_templates'), {
                title: newTitle.trim(),
                body: newBody.trim(),
                category: newCategory,
                url: newUrl.trim() || '/',
                createdAt: new Date().toISOString()
            });

            // Reset Form
            setNewTitle('');
            setNewBody('');
            setNewCategory('Nudge');
            setNewUrl('/participant/sprint');
        } catch (error) {
            console.error('[AdminNotifications] Failed to add writeup:', error);
        } finally {
            setIsSavingWriteup(false);
        }
    };

    // Delete writeup/template
    const handleDeleteWriteup = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this notification writeup?')) return;
        try {
            await deleteDoc(doc(db, 'push_templates', id));
        } catch (error) {
            console.error('[AdminNotifications] Error deleting template:', error);
        }
    };

    // Instant send a writeup/template to a selected user
    const handleSendToUser = async (writeup: Writeup, userId: string) => {
        if (!userId) {
            alert('Please select a target user first!');
            return;
        }

        const targetUser = users.find(u => u.id === userId);
        if (!targetUser) return;

        const actionKey = `${writeup.id || 'custom'}-${userId}`;
        setSendingStates(prev => ({ ...prev, [actionKey]: { status: 'sending' } }));

        try {
            // Trigger actual sending via our backend route
            await pushNotificationService.sendPush(
                userId,
                writeup.title,
                writeup.body,
                writeup.url,
                writeup.category,
                true // Bypass active check since it's an explicit manual admin dispatch
            );

            setSendingStates(prev => ({
                ...prev,
                [actionKey]: { status: 'success', message: 'Dispatched successfully!' }
            }));

            // Clear success indicator after 3 seconds
            setTimeout(() => {
                setSendingStates(prev => {
                    const next = { ...prev };
                    delete next[actionKey];
                    return next;
                });
            }, 3000);

        } catch (error: any) {
            console.error('[AdminNotifications] Error dispatching push:', error);
            setSendingStates(prev => ({
                ...prev,
                [actionKey]: { status: 'error', message: error.message || 'Dispatch failed' }
            }));
        }
    };

    // Instant send a writeup to ALL users who are subscribed
    const handleSendToAllSubscribers = async (writeup: Writeup) => {
        const subscribedUsers = users.filter(u => u.fcmToken && !u.notificationsDisabled);
        if (subscribedUsers.length === 0) {
            alert('No active users are currently subscribed with an FCM push token!');
            return;
        }

        if (!window.confirm(`Are you sure you want to instantly broadcast this push notification to all ${subscribedUsers.length} subscribed users?`)) {
            return;
        }

        const actionKey = `${writeup.id || 'custom'}-all`;
        setSendingStates(prev => ({ ...prev, [actionKey]: { status: 'sending' } }));

        let successCount = 0;
        let failCount = 0;

        try {
            // Send in parallel
            await Promise.all(subscribedUsers.map(async (u) => {
                try {
                    await pushNotificationService.sendPush(
                        u.id,
                        writeup.title,
                        writeup.body,
                        writeup.url,
                        writeup.category,
                        true // Bypass active check for admin manual broadcast
                    );
                    successCount++;
                } catch (e) {
                    console.error(`Failed to send to user ${u.name}:`, e);
                    failCount++;
                }
            }));

            setSendingStates(prev => ({
                ...prev,
                [actionKey]: { 
                    status: 'success', 
                    message: `Broadcast complete! Sent: ${successCount}, Failed: ${failCount}` 
                }
            }));

            setTimeout(() => {
                setSendingStates(prev => {
                    const next = { ...prev };
                    delete next[actionKey];
                    return next;
                });
            }, 5000);

        } catch (error: any) {
            setSendingStates(prev => ({
                ...prev,
                [actionKey]: { status: 'error', message: 'Broadcast failed.' }
            }));
        }
    };

    // Clear delivery logs
    const handleClearLogs = async () => {
        if (!window.confirm('Are you sure you want to clear the delivery logs? This cannot be undone.')) return;
        setIsClearingLogs(true);
        try {
            const snap = await getDocs(collection(db, 'push_delivery_logs'));
            for (const d of snap.docs) {
                await deleteDoc(doc(db, 'push_delivery_logs', d.id));
            }
        } catch (error) {
            console.error('[AdminNotifications] Failed to clear logs:', error);
        } finally {
            setIsClearingLogs(false);
        }
    };

    // Filtered logs calculated client-side
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            // Filter by search query
            const matchesSearch = 
                (log.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.userEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.body || '').toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            // Filter by status tab
            if (statusFilter === 'all') return true;
            return log.status === statusFilter;
        });
    }, [logs, searchQuery, statusFilter]);

    return (
        <div className="space-y-12 animate-fade-in text-left">
            
            {/* Header section with Stats summary */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50 border border-gray-100 rounded-[2rem] p-8">
                <div>
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-primary" />
                        <span>Push Notification Control Center</span>
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        Track delivery, manage push writeups, and dispatch instant notifications.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm text-center min-w-[100px]">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Writeups</p>
                        <p className="text-lg font-black text-primary">{writeups.length}</p>
                    </div>
                    <div className="bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm text-center min-w-[100px]">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Subscribed</p>
                        <p className="text-lg font-black text-blue-600">
                            {users.filter(u => u.fcmToken && !u.notificationsDisabled).length}
                        </p>
                    </div>
                    <div className="bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm text-center min-w-[100px]">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Logs Today</p>
                        <p className="text-lg font-black text-gray-600">{logs.length}</p>
                    </div>
                </div>
            </div>

            {/* Split layout: Form (left) + Writeups Library (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* 1. Add New Writeup form */}
                <div className="lg:col-span-5 bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-primary" />
                        <span>Create New Push Writeup</span>
                    </h3>
                    
                    <form onSubmit={handleAddWriteup} className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                Writeup Title
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Rise Momentum! 🔥"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 text-gray-900 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-gray-400"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                Message Body (Push content)
                            </label>
                            <textarea
                                placeholder="What should the push notification say to the user?"
                                value={newBody}
                                onChange={(e) => setNewBody(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 bg-white border border-gray-200 text-gray-900 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none placeholder-gray-400"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Category
                                </label>
                                <select
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 text-gray-900 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                                >
                                    <option value="Nudge">Nudge</option>
                                    <option value="Reminder">Reminder</option>
                                    <option value="Announcement">Announcement</option>
                                    <option value="Milestone">Milestone</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Target URL Redirect
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., /participant/sprint"
                                    value={newUrl}
                                    onChange={(e) => setNewUrl(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 text-gray-900 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-gray-400"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSavingWriteup}
                            className="w-full py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary-dark active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-sm flex items-center justify-center gap-2"
                        >
                            {isSavingWriteup ? 'Saving writeup...' : 'Save Writeup to Library'}
                        </button>
                    </form>
                </div>

                {/* 2. Notification Templates Library / Writeups list */}
                <div className="lg:col-span-7 bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary" />
                            <span>Push Notification Library ({writeups.length})</span>
                        </h3>
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-900 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
                            >
                                <option value="">🎯 Choose Target User...</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} ({u.fcmToken ? 'Subscribed' : 'No Token'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 no-scrollbar">
                        {writeups.map((w) => {
                            const sendUserKey = `${w.id}-${selectedUserId}`;
                            const sendAllKey = `${w.id}-all`;
                            
                            const userState = sendingStates[sendUserKey];
                            const allState = sendingStates[sendAllKey];

                            return (
                                <div 
                                    key={w.id} 
                                    className="p-5 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all"
                                >
                                    <div className="space-y-1.5 flex-1 text-left min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                                w.category === 'Milestone' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                w.category === 'Announcement' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                                w.category === 'Reminder' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                'bg-teal-50 text-teal-600 border border-teal-100'
                                            }`}>
                                                {w.category}
                                            </span>
                                            <span className="text-[8px] font-bold text-gray-400 flex items-center gap-1">
                                                <ExternalLink className="w-2.5 h-2.5" /> {w.url}
                                            </span>
                                        </div>
                                        <p className="text-xs font-black text-gray-900 truncate">{w.title}</p>
                                        <p className="text-[10px] text-gray-500 font-semibold leading-relaxed line-clamp-2">
                                            {w.body}
                                        </p>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex sm:flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto flex-shrink-0">
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <button
                                                onClick={() => handleSendToUser(w, selectedUserId)}
                                                disabled={!selectedUserId || userState?.status === 'sending'}
                                                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                                    selectedUserId 
                                                        ? 'bg-primary text-white hover:bg-primary-dark' 
                                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                            >
                                                <Send className="w-3 h-3" />
                                                <span>
                                                    {userState?.status === 'sending' ? 'Sending...' : 'Send Target'}
                                                </span>
                                            </button>

                                            <button
                                                onClick={() => handleSendToAllSubscribers(w)}
                                                disabled={allState?.status === 'sending'}
                                                className="flex-1 sm:flex-none px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                                title="Broadcast to all active users with push tokens"
                                            >
                                                <Users className="w-3 h-3" />
                                                <span>
                                                    {allState?.status === 'sending' ? 'Broadcasting...' : 'Broadcast'}
                                                </span>
                                            </button>

                                            <button
                                                onClick={() => w.id && handleDeleteWriteup(w.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-100 hover:border-red-100 rounded-xl transition-all cursor-pointer"
                                                title="Delete writeup"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Inline Status Feedback */}
                                        {userState?.status === 'success' && (
                                            <p className="text-[8px] font-black text-green-600 uppercase tracking-wider animate-pulse">
                                                ✓ {userState.message}
                                            </p>
                                        )}
                                        {userState?.status === 'error' && (
                                            <p className="text-[8px] font-black text-red-500 uppercase tracking-wider">
                                                ⚠ {userState.message}
                                            </p>
                                        )}
                                        {allState?.status === 'success' && (
                                            <p className="text-[8px] font-black text-blue-600 uppercase tracking-wider animate-pulse">
                                                ✓ {allState.message}
                                            </p>
                                        )}
                                        {allState?.status === 'error' && (
                                            <p className="text-[8px] font-black text-red-500 uppercase tracking-wider">
                                                ⚠ {allState.message}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Section 3: Delivery Tracking Logs */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm text-left">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-50 pb-6 mb-6">
                    <div>
                        <h3 className="text-base font-black text-gray-900 tracking-tight italic">
                            Live Push Delivery Tracker
                        </h3>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                            Verify deliverability and debug registration errors in real-time.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search Input */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search logs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 text-gray-900 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all w-48 placeholder-gray-400"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        </div>

                        {/* Limit Control */}
                        <select
                            value={logsLimit}
                            onChange={(e) => setLogsLimit(Number(e.target.value))}
                            className="px-3 py-2.5 bg-white border border-gray-200 text-gray-900 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none cursor-pointer"
                        >
                            <option value={20}>Show 20</option>
                            <option value={50}>Show 50</option>
                            <option value={100}>Show 100</option>
                        </select>

                        {/* Clear Logs Button */}
                        <button
                            onClick={handleClearLogs}
                            disabled={logs.length === 0 || isClearingLogs}
                            className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 disabled:opacity-40 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isClearingLogs ? 'Clearing...' : 'Clear logs'}</span>
                        </button>
                    </div>
                </div>

                {/* Status tabs filter */}
                <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'all', label: 'All logs' },
                        { id: 'sent', label: 'Sent' },
                        { id: 'delivered', label: 'Delivered' },
                        { id: 'failed', label: 'Failed' },
                        { id: 'unsubscribed', label: 'Unsubscribed' },
                        { id: 'disabled', label: 'Disabled' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id as any)}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                                statusFilter === tab.id 
                                    ? 'bg-dark text-white shadow-sm' 
                                    : 'bg-gray-50 text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Logs Table / List */}
                <div className="overflow-hidden border border-gray-50 rounded-2xl shadow-sm">
                    {filteredLogs.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">User Details</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Message Content</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Delivery Status</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Sent Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredLogs.map(log => {
                                        return (
                                            <tr key={log.id} className="hover:bg-gray-50/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="space-y-0.5">
                                                        <p className="text-[11px] font-black text-gray-900 leading-none">{log.userName}</p>
                                                        <p className="text-[9px] font-bold text-gray-400">{log.userEmail}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs md:max-w-md">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="text-[11px] font-black text-gray-800">{log.title}</span>
                                                            {log.tag && (
                                                                <span className="px-1 py-0.5 bg-gray-100 text-gray-500 rounded text-[7px] font-black uppercase tracking-widest">
                                                                    {log.tag}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 font-semibold leading-relaxed line-clamp-2">
                                                            {log.body}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {log.status === 'sent' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-blue-100 animate-pulse">
                                                                <Clock className="w-2.5 h-2.5 animate-spin" />
                                                                <span>Sent</span>
                                                            </span>
                                                        )}
                                                        {log.status === 'delivered' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-green-100">
                                                                <CheckCircle2 className="w-2.5 h-2.5" />
                                                                <span>Delivered</span>
                                                            </span>
                                                        )}
                                                        {log.status === 'failed' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-red-100" title={log.errorMessage}>
                                                                <XCircle className="w-2.5 h-2.5" />
                                                                <span>Failed</span>
                                                            </span>
                                                        )}
                                                        {log.status === 'unsubscribed' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-gray-100" title="User has not granted permission or has no FCM token saved">
                                                                <AlertCircle className="w-2.5 h-2.5" />
                                                                <span>Not Subscribed</span>
                                                            </span>
                                                        )}
                                                        {log.status === 'disabled' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-500 rounded-full text-[8px] font-black uppercase tracking-widest border border-orange-100" title="User explicitly disabled push notifications in app">
                                                                <Clock className="w-2.5 h-2.5" />
                                                                <span>Disabled</span>
                                                            </span>
                                                        )}
                                                        {log.errorMessage && (
                                                            <span className="text-[8px] font-medium text-gray-400 truncate max-w-[120px]" title={log.errorMessage}>
                                                                ({log.errorMessage})
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                        {new Date(log.sentAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                                                        {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-16 text-center bg-gray-50/50">
                            <Bell className="w-8 h-8 text-gray-350 mx-auto mb-3" />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                No delivery tracking logs recorded matching current criteria.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>

        </div>
    );
}
