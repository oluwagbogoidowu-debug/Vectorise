import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { sanitizeData } from './userService';
import { AnalyticsEvent, TrafficRecord, FunnelStats } from '../types';

const ATTRIBUTION_KEY = 'vectorise_attribution';
const SESSION_KEY = 'vectorise_session_id';
const TRAFFIC_COLLECTION = 'traffic_sources';
const EVENTS_COLLECTION = 'analytics_events';

/**
 * UUID Generator for anonymous sessions
 */
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export const analyticsTracker = {
    /**
     * Initialization: Run on app load to capture attribution and start session.
     */
    init: async (userId?: string) => {
        // 1. Get or Generate Session ID
        let sessionId = localStorage.getItem(SESSION_KEY);
        if (!sessionId) {
            sessionId = generateUUID();
            localStorage.setItem(SESSION_KEY, sessionId);
        }

        // 2. Capture First-Visit Attribution (Do not overwrite)
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

            // 3. Log Initial Traffic
            const trafficRecord: Omit<TrafficRecord, 'id'> = {
                session_id: sessionId,
                user_id: userId || null,
                source: attribution.source,
                medium: attribution.medium,
                campaign: attribution.campaign,
                partner_code: attribution.partner_code,
                landing_page: window.location.href,
                referrer_url: document.referrer || 'none',
                user_agent: navigator.userAgent,
                created_at: new Date().toISOString()
            };

            try {
                await addDoc(collection(db, TRAFFIC_COLLECTION), sanitizeData(trafficRecord));
            } catch (e) {
                console.warn("[Analytics] Traffic log failed:", e);
            }
        }
    },

    /**
     * trackEvent: Log user behavior.
     */
    trackEvent: async (eventName: string, properties: any = {}, userId?: string) => {
        const sessionId = localStorage.getItem(SESSION_KEY);
        if (!sessionId) return;

        const eventData: Omit<AnalyticsEvent, 'id'> = {
            session_id: sessionId,
            user_id: userId || null,
            event_name: eventName,
            event_properties: properties,
            page_url: window.location.href,
            created_at: new Date().toISOString()
        };

        try {
            await addDoc(collection(db, EVENTS_COLLECTION), sanitizeData(eventData));
        } catch (e) {
            console.warn(`[Analytics] Event ${eventName} log failed`);
        }
    },

    /**
     * bindUserToSession: Link anonymous session to signed-up user.
     */
    bindUserToSession: async (userId: string) => {
        const sessionId = localStorage.getItem(SESSION_KEY);
        if (!sessionId) return;

        // Update traffic record
        const q = query(collection(db, TRAFFIC_COLLECTION), where('session_id', '==', sessionId), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
            await updateDoc(doc(db, TRAFFIC_COLLECTION, snap.docs[0].id), { user_id: userId });
        }
    },

    /**
     * Admin: Get funnel metrics (Aggregation logic)
     */
    getFunnelMetrics: async (): Promise<FunnelStats> => {
        const eventsRef = collection(db, EVENTS_COLLECTION);
        
        // In a real app, use indexedDB aggregation or serverless count.
        // For demo, we fetch recent events and aggregate.
        const q = query(eventsRef, limit(1000));
        const snap = await getDocs(q);
        const events = snap.docs.map(d => d.data() as AnalyticsEvent);

        return {
            visitors: new Set(events.map(e => e.session_id)).size,
            sprintViews: events.filter(e => e.event_name === 'sprint_viewed').length,
            paymentIntents: events.filter(e => e.event_name === 'payment_initiated').length,
            successPayments: events.filter(e => e.event_name === 'payment_success').length,
            completions: events.filter(e => e.event_name === 'sprint_completed').length,
        };
    },

    /**
     * Admin: Live Event Subscription
     */
    subscribeToEvents: (callback: (events: AnalyticsEvent[]) => void) => {
        const q = query(collection(db, EVENTS_COLLECTION), orderBy('created_at', 'desc'), limit(50));
        return onSnapshot(q, (snap) => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AnalyticsEvent)));
        });
    },

    /**
     * Admin: Traffic Source Breakdown
     */
    getTrafficBreakdown: async (): Promise<Record<string, number>> => {
        const q = query(collection(db, TRAFFIC_COLLECTION), limit(500));
        const snap = await getDocs(q);
        const map: Record<string, number> = {};
        snap.forEach(d => {
            const src = d.data().source || 'direct';
            map[src] = (map[src] || 0) + 1;
        });
        return map;
    }
};