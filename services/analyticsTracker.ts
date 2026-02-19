import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, writeBatch, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { sanitizeData } from './userService';
import { AnalyticsEvent, TrafficRecord, FunnelStats, UserSessionReport, IdentityReport, ParticipantSprint } from '../types';

const ANONYMOUS_KEY = 'vectorise_anonymous_id';
const SESSION_KEY = 'vectorise_session_id';
const TRAFFIC_COLLECTION = 'traffic_sources';
const EVENTS_COLLECTION = 'analytics_events';
const ENROLLMENTS_COLLECTION = 'enrollments';

let lastScrollDepth = 0;
let sessionStartTime = Date.now();

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

const getDeviceType = () => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
    return 'desktop';
};

const setCookie = (name: string, value: string, days: number = 365) => {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
};

const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
};

/**
 * Utility to fetch Firestore documents in chunks of 30 (Firestore limit for 'in' operator)
 */
const fetchChunked = async (collectionName: string, field: string, values: string[]) => {
    const uniqueValues = Array.from(new Set(values.filter(v => !!v)));
    if (uniqueValues.length === 0) return [];
    
    const results: any[] = [];
    const CHUNK_SIZE = 30;
    
    for (let i = 0; i < uniqueValues.length; i += CHUNK_SIZE) {
        const chunk = uniqueValues.slice(i, i + CHUNK_SIZE);
        const q = query(collection(db, collectionName), where(field, 'in', chunk));
        const snap = await getDocs(q);
        snap.forEach(d => results.push({ id: d.id, ...sanitizeData(d.data()) }));
    }
    return results;
};

export const analyticsTracker = {
    init: async (userId?: string, userEmail?: string) => {
        let anonId = localStorage.getItem(ANONYMOUS_KEY) || getCookie(ANONYMOUS_KEY);
        if (!anonId) {
            anonId = `anon_${generateUUID().replace(/-/g, '').substring(0, 12)}`;
        }
        localStorage.setItem(ANONYMOUS_KEY, anonId);
        setCookie(ANONYMOUS_KEY, anonId);

        let sessId = sessionStorage.getItem(SESSION_KEY);
        if (!sessId) {
            sessId = `sess_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            sessionStorage.setItem(SESSION_KEY, sessId);
        }

        const storedAttribution = localStorage.getItem('vectorise_attribution');
        if (!storedAttribution) {
            const params = new URLSearchParams(window.location.search);
            const attribution = {
                source: params.get('utm_source') || 'direct',
                medium: params.get('utm_medium') || 'none',
                campaign: params.get('utm_campaign') || null,
                partner_code: params.get('ref') || null,
                timestamp: new Date().toISOString()
            };

            localStorage.setItem('vectorise_attribution', JSON.stringify(attribution));

            const trafficRecord: Omit<TrafficRecord, 'id'> = {
                anonymous_id: anonId,
                session_id: sessId,
                user_id: userId || null,
                email: userEmail || null,
                source: attribution.source,
                medium: attribution.medium,
                campaign: attribution.campaign,
                partner_code: attribution.partner_code,
                landing_page: window.location.href,
                referrer_url: document.referrer || 'none',
                user_agent: navigator.userAgent,
                device_type: getDeviceType(),
                created_at: new Date().toISOString()
            };

            try {
                await addDoc(collection(db, TRAFFIC_COLLECTION), sanitizeData(trafficRecord));
            } catch (e) {
                console.warn("[Analytics] Traffic log failed");
            }
        }

        window.addEventListener('scroll', analyticsTracker.handleScroll, { passive: true });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                const dwell = Math.floor((Date.now() - sessionStartTime) / 1000);
                if (dwell > 1) {
                    analyticsTracker.trackEvent('dwell_pulse', { seconds: dwell, scroll_depth: lastScrollDepth }, userId, userEmail);
                }
            } else {
                sessionStartTime = Date.now();
            }
        });
    },

    handleScroll: () => {
        const h = document.documentElement, b = document.body, st = 'scrollTop', sh = 'scrollHeight';
        const percent = Math.floor((h[st]||b[st]) / ((h[sh]||b[sh]) - h.clientHeight) * 100);
        if (percent > lastScrollDepth + 5) {
            lastScrollDepth = percent;
        }
    },

    trackEvent: async (eventName: string, properties: any = {}, userId?: string, userEmail?: string) => {
        const anonId = localStorage.getItem(ANONYMOUS_KEY);
        const sessId = sessionStorage.getItem(SESSION_KEY);
        if (!anonId || !sessId) return;

        const eventData: Omit<AnalyticsEvent, 'id'> = {
            anonymous_id: anonId,
            session_id: sessId,
            user_id: userId || null,
            email: userEmail || null,
            event_name: eventName,
            event_properties: sanitizeData(properties),
            page_url: window.location.href,
            scroll_depth: lastScrollDepth,
            dwell_time: Math.floor((Date.now() - sessionStartTime) / 1000),
            created_at: new Date().toISOString()
        };

        try {
            await addDoc(collection(db, EVENTS_COLLECTION), sanitizeData(eventData));
        } catch (e) {
            console.warn(`[Analytics] Event ${eventName} failed`, e);
        }
    },

    identify: async (userId: string, email: string) => {
        const anonId = localStorage.getItem(ANONYMOUS_KEY);
        if (!anonId || !userId) return;

        try {
            const batch = writeBatch(db);
            const qT = query(collection(db, TRAFFIC_COLLECTION), where('anonymous_id', '==', anonId));
            const snapT = await getDocs(qT);
            snapT.forEach(d => {
                if (!d.data().user_id) batch.update(d.ref, { user_id: userId, email: email });
            });

            const qE = query(collection(db, EVENTS_COLLECTION), where('anonymous_id', '==', anonId), limit(50));
            const snapE = await getDocs(qE);
            snapE.forEach(d => {
                if (!d.data().user_id) batch.update(d.ref, { user_id: userId, email: email });
            });

            await batch.commit();
            analyticsTracker.trackEvent('identity_merged', { method: 'auth_link' }, userId, email);
        } catch (err) {
            console.warn("[Analytics] Identity link failed", err);
        }
    },

    getIdentityLedger: async (): Promise<IdentityReport[]> => {
        try {
            const q = query(collection(db, TRAFFIC_COLLECTION), orderBy('created_at', 'desc'), limit(150));
            const trafficSnap = await getDocs(q);
            const trafficRecords = trafficSnap.docs.map(d => ({ id: d.id, ...sanitizeData(d.data()) } as TrafficRecord));

            if (trafficRecords.length === 0) return [];

            const allSessionIds = Array.from(new Set(trafficRecords.map(r => r.session_id))) as string[];
            const allUserIds = Array.from(new Set(trafficRecords.map(r => r.user_id).filter(id => !!id))) as string[];

            const [allEvents, allEnrollments] = await Promise.all([
                fetchChunked(EVENTS_COLLECTION, 'session_id', allSessionIds),
                fetchChunked(ENROLLMENTS_COLLECTION, 'user_id', allUserIds)
            ]);

            const identitiesMap = new Map<string, TrafficRecord[]>();
            trafficRecords.forEach(t => {
                const idKey = t.user_id || t.email || t.anonymous_id;
                const existing = identitiesMap.get(idKey) || [];
                identitiesMap.set(idKey, [...existing, t]);
            });

            const ledger: IdentityReport[] = [];

            for (const [idKey, records] of identitiesMap.entries()) {
                const sortedRecords = [...records].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                const firstTouch = sortedRecords[0];
                const lastActive = sortedRecords[sortedRecords.length - 1];
                
                const uniqueSessionIds = Array.from(new Set(records.map(r => r.session_id)));
                const sessions: UserSessionReport[] = [];
                let hasPaidGlobal = false;
                let totalEventCount = 0;

                for (const sid of uniqueSessionIds) {
                    const sessionEvents = allEvents
                        .filter(e => e.session_id === sid)
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                    if (sessionEvents.length === 0) continue;
                    totalEventCount += sessionEvents.length;

                    const traffic = records.find(r => r.session_id === sid) || firstTouch;
                    const hasPaid = sessionEvents.some(e => e.event_name === 'payment_success');
                    if (hasPaid) hasPaidGlobal = true;

                    sessions.push({
                        anonymous_id: traffic.anonymous_id,
                        session_id: sid,
                        email: traffic.email,
                        user_id: traffic.user_id,
                        traffic,
                        events: sessionEvents,
                        totalDwellTime: sessionEvents.reduce((acc, e) => acc + (e.dwell_time || 0), 0),
                        maxScrollDepth: Math.max(...sessionEvents.map(e => e.scroll_depth || 0), 0),
                        hasPaid,
                        conversionPath: sessionEvents.filter(e => ['selected_path', 'payment_initiated', 'payment_success'].includes(e.event_name)).map(e => e.event_name)
                    });
                }

                const userId = firstTouch.user_id || records.find(r => !!r.user_id)?.user_id;
                const userEnrollments = allEnrollments.filter(e => e.user_id === userId);

                ledger.push({
                    identifier: idKey,
                    anonymous_id: firstTouch.anonymous_id,
                    email: firstTouch.email || records.find(r => !!r.email)?.email,
                    user_id: userId,
                    firstTouch,
                    lastActiveAt: lastActive.created_at,
                    totalSessions: uniqueSessionIds.length,
                    totalEvents: totalEventCount,
                    hasPaid: hasPaidGlobal,
                    sessions: sessions.sort((a, b) => new Date(b.traffic.created_at).getTime() - new Date(a.traffic.created_at).getTime()),
                    enrollments: userEnrollments
                });
            }

            return ledger.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
        } catch (err) {
            console.error("[Analytics] Ledger assembly failed", err);
            return [];
        }
    },

    subscribeToEvents: (callback: (events: AnalyticsEvent[]) => void) => {
        const q = query(collection(db, EVENTS_COLLECTION), orderBy('created_at', 'desc'), limit(50));
        return onSnapshot(q, (snap) => {
            callback(snap.docs.map(d => ({ id: d.id, ...sanitizeData(d.data()) } as AnalyticsEvent)));
        });
    },

    getFunnelMetrics: async (): Promise<FunnelStats> => {
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const q = query(collection(db, EVENTS_COLLECTION), where('created_at', '>=', twentyFourHoursAgo));
            const snap = await getDocs(q);
            const events = snap.docs.map(d => sanitizeData(d.data()) as AnalyticsEvent);
            
            // Build unique active user identities for the Pulse list
            const activeUserMap = new Map<string, { id: string; label: string; lastActive: string }>();
            events.filter(e => !!e.user_id).forEach(e => {
                const existing = activeUserMap.get(e.user_id!);
                if (!existing || new Date(e.created_at) > new Date(existing.lastActive)) {
                    activeUserMap.set(e.user_id!, {
                        id: e.user_id!,
                        label: e.email || e.user_id!,
                        lastActive: e.created_at
                    });
                }
            });

            return {
                visitors: new Set(events.map(e => e.anonymous_id)).size,
                sprintViews: events.filter(e => e.event_name === 'landing_viewed').length,
                paymentIntents: events.filter(e => e.event_name === 'payment_initiated').length,
                successPayments: events.filter(e => e.event_name === 'payment_success').length,
                completions: events.filter(e => e.event_name === 'sprint_completed').length,
                activeUserList: Array.from(activeUserMap.values()).sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime())
            };
        } catch (err) {
            return { visitors: 0, sprintViews: 0, paymentIntents: 0, successPayments: 0, completions: 0, activeUserList: [] };
        }
    },

    getTrafficBreakdown: async (): Promise<Record<string, number>> => {
        try {
            const q = query(collection(db, TRAFFIC_COLLECTION), limit(250));
            const snap = await getDocs(q);
            const map: Record<string, number> = {};
            snap.forEach(d => {
                const src = d.data().source || 'direct';
                map[src] = (map[src] || 0) + 1;
            });
            return map;
        } catch (err) {
            return {};
        }
    }
};