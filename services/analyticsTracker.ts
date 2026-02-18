import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, limit, orderBy, onSnapshot, writeBatch } from 'firebase/firestore';
import { sanitizeData } from './userService';
import { AnalyticsEvent, TrafficRecord, FunnelStats, UserSessionReport, IdentityReport, ParticipantSprint } from '../types';

const ATTRIBUTION_KEY = 'vectorise_attribution';
const SESSION_KEY = 'vectorise_session_id';
const ANONYMOUS_KEY = 'vectorise_anonymous_id';
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

export const analyticsTracker = {
    /**
     * Initialization: Step 1 & 2. Runs on first load.
     */
    init: async (userId?: string, userEmail?: string) => {
        // 1. Manage Identifiers
        let anonymousId = localStorage.getItem(ANONYMOUS_KEY);
        if (!anonymousId) {
            anonymousId = generateUUID();
            localStorage.setItem(ANONYMOUS_KEY, anonymousId);
        }

        let sessionId = localStorage.getItem(SESSION_KEY);
        if (!sessionId) {
            sessionId = generateUUID();
            localStorage.setItem(SESSION_KEY, sessionId);
        }

        // 2. Capture First-Touch Source (Immutable)
        const storedAttribution = localStorage.getItem(ATTRIBUTION_KEY);
        if (!storedAttribution) {
            const params = new URLSearchParams(window.location.search);
            const attribution = {
                source: params.get('utm_source') || 'direct',
                medium: params.get('utm_medium') || 'none',
                campaign: params.get('utm_campaign') || null,
                partner_code: params.get('ref') || null,
                timestamp: new Date().toISOString()
            };

            localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));

            const trafficRecord: Omit<TrafficRecord, 'id'> = {
                anonymous_id: anonymousId,
                session_id: sessionId,
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

        // 3. Track Initial Landing
        analyticsTracker.trackEvent('viewed_homepage', { is_first_visit: !storedAttribution }, userId, userEmail);

        // 4. Setup Global Behavioral Listeners
        window.addEventListener('scroll', analyticsTracker.handleScroll, { passive: true });
        
        // Track dwell time on page exit or visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                const dwell = Math.floor((Date.now() - sessionStartTime) / 1000);
                analyticsTracker.trackEvent('heartbeat_dwell', { seconds: dwell, scroll_depth: lastScrollDepth }, userId, userEmail);
            } else {
                sessionStartTime = Date.now(); // Reset on return
            }
        });
    },

    handleScroll: () => {
        const h = document.documentElement, 
              b = document.body,
              st = 'scrollTop',
              sh = 'scrollHeight';
        const percent = Math.floor((h[st]||b[st]) / ((h[sh]||b[sh]) - h.clientHeight) * 100);
        if (percent > lastScrollDepth + 10) { // Log significant scrolls
            lastScrollDepth = percent;
        }
    },

    /**
     * Step 2: Track events with identifiers
     */
    trackEvent: async (eventName: string, properties: any = {}, userId?: string, userEmail?: string) => {
        const anonymousId = localStorage.getItem(ANONYMOUS_KEY);
        const sessionId = localStorage.getItem(SESSION_KEY);
        if (!anonymousId || !sessionId) return;

        const eventData: Omit<AnalyticsEvent, 'id'> = {
            anonymous_id: anonymousId,
            session_id: sessionId,
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

    /**
     * Step 3: Link Identity
     */
    identify: async (userId: string, email: string) => {
        const anonymousId = localStorage.getItem(ANONYMOUS_KEY);
        if (!anonymousId) return;

        try {
            const qT = query(collection(db, TRAFFIC_COLLECTION), where('anonymous_id', '==', anonymousId));
            const snapT = await getDocs(qT);
            const batch = writeBatch(db);
            
            snapT.forEach(d => {
                batch.update(d.ref, { user_id: userId, email: email });
            });

            const qE = query(collection(db, EVENTS_COLLECTION), where('anonymous_id', '==', anonymousId), limit(100));
            const snapE = await getDocs(qE);
            snapE.forEach(d => {
                batch.update(d.ref, { user_id: userId, email: email });
            });

            await batch.commit();
            analyticsTracker.trackEvent('user_identified', { method: 'login_signup' }, userId, email);
        } catch (err) {
            console.warn("[Analytics] Identity link failed", err);
        }
    },

    /**
     * Admin: Identity-Centric Ledger
     * Groups all sessions and activity by Identifier (Email or Anonymous ID)
     */
    getIdentityLedger: async (): Promise<IdentityReport[]> => {
        try {
            // 1. Fetch all unique traffic records to establish identities
            const q = query(collection(db, TRAFFIC_COLLECTION), orderBy('created_at', 'desc'), limit(500));
            const trafficSnap = await getDocs(q);
            
            const trafficRecords = trafficSnap.docs.map(d => ({ id: d.id, ...sanitizeData(d.data()) } as TrafficRecord));
            const identitiesMap = new Map<string, TrafficRecord[]>();

            trafficRecords.forEach(t => {
                const idKey = t.email || t.anonymous_id;
                const existing = identitiesMap.get(idKey) || [];
                identitiesMap.set(idKey, [...existing, t]);
            });

            const ledger: IdentityReport[] = [];

            for (const [idKey, records] of identitiesMap.entries()) {
                const firstTouch = [...records].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
                const lastActive = [...records].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
                
                const uniqueSessionIds = Array.from(new Set(records.map(r => r.session_id)));
                const sessions: UserSessionReport[] = [];
                let totalEventsCount = 0;
                let hasPaidGlobal = false;

                // For each session ID of this identity, fetch events
                for (const sid of uniqueSessionIds) {
                    const eq = query(collection(db, EVENTS_COLLECTION), where('session_id', '==', sid));
                    const eSnap = await getDocs(eq);
                    const events = eSnap.docs
                        .map(d => ({ id: d.id, ...sanitizeData(d.data()) } as AnalyticsEvent))
                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                    if (events.length === 0) continue;

                    const traffic = records.find(r => r.session_id === sid) || firstTouch;
                    const totalDwell = events.reduce((acc, e) => acc + (e.dwell_time || 0), 0);
                    const maxScroll = Math.max(...events.map(e => e.scroll_depth || 0), 0);
                    const hasPaid = events.some(e => e.event_name === 'payment_success');
                    if (hasPaid) hasPaidGlobal = true;

                    const coreEvents = ['viewed_homepage', 'opened_micro_picker', 'selected_path', 'payment_initiated', 'payment_success', 'sprint_enrolled'];
                    const conversionPath = events
                        .filter(e => coreEvents.includes(e.event_name))
                        .map(e => e.event_name);

                    sessions.push({
                        anonymous_id: traffic.anonymous_id,
                        session_id: sid,
                        email: traffic.email,
                        user_id: traffic.user_id,
                        traffic,
                        events,
                        totalDwellTime: totalDwell,
                        maxScrollDepth: maxScroll,
                        hasPaid,
                        conversionPath
                    });
                    totalEventsCount += events.length;
                }

                // Fetch real-time progress if user is identified
                let enrollments: ParticipantSprint[] = [];
                const userId = firstTouch.user_id || records.find(r => !!r.user_id)?.user_id;
                if (userId) {
                    const uq = query(collection(db, ENROLLMENTS_COLLECTION), where('user_id', '==', userId));
                    const uSnap = await getDocs(uq);
                    enrollments = uSnap.docs.map(d => ({ id: d.id, ...sanitizeData(d.data()) } as ParticipantSprint));
                }

                ledger.push({
                    identifier: idKey,
                    anonymous_id: firstTouch.anonymous_id,
                    email: firstTouch.email || records.find(r => !!r.email)?.email,
                    user_id: userId,
                    firstTouch,
                    lastActiveAt: lastActive.created_at,
                    totalSessions: uniqueSessionIds.length,
                    totalEvents: totalEventsCount,
                    hasPaid: hasPaidGlobal,
                    sessions: sessions.sort((a, b) => new Date(b.traffic.created_at).getTime() - new Date(a.traffic.created_at).getTime()),
                    enrollments
                });
            }

            return ledger.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
        } catch (err) {
            console.error("[Analytics] Identity ledger fetch failed", err);
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
            const q = query(collection(db, EVENTS_COLLECTION), limit(1000));
            const snap = await getDocs(q);
            const events = snap.docs.map(d => sanitizeData(d.data()) as AnalyticsEvent);

            return {
                visitors: new Set(events.map(e => e.session_id)).size,
                sprintViews: events.filter(e => e.event_name === 'landing_viewed').length,
                paymentIntents: events.filter(e => e.event_name === 'payment_initiated').length,
                successPayments: events.filter(e => e.event_name === 'payment_success').length,
                completions: events.filter(e => e.event_name === 'sprint_completed').length,
            };
        } catch (err) {
            return { visitors: 0, sprintViews: 0, paymentIntents: 0, successPayments: 0, completions: 0 };
        }
    },

    getTrafficBreakdown: async (): Promise<Record<string, number>> => {
        try {
            const q = query(collection(db, TRAFFIC_COLLECTION), limit(500));
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