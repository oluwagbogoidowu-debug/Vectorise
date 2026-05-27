import { db } from './firebase';
import { collection, query, getDocs, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { 
  AnalyticsEvent, 
  TrafficRecord, 
  FunnelStats, 
  IdentityReport, 
  ParticipantSprint,
  PaymentRecord,
  UserSessionReport
} from '../types';

export const analyticsTracker = {
    toggleAnalytics: async (disabled: boolean) => {
        // No-op
    },

    onDisabledStateChange: (callback: (disabled: boolean) => void) => {
        callback(false);
    },

    isCurrentlyDisabled: () => {
        return false;
    },

    init: async (userId?: string, userEmail?: string) => {
        // No-op - complex session traffic tracking removed
    },

    handleScroll: () => {
        // No-op - scroll telemetry tracking removed
    },

    trackEvent: async (eventName: string, properties: any = {}, userId?: string, userEmail?: string) => {
        if (typeof window === 'undefined') return;
        
        // Strictly only track 'login' and 'sprint_submission' events
        if (eventName !== 'login' && eventName !== 'sprint_submission') {
            return;
        }

        const now = new Date();
        const eventDocRef = doc(collection(db, 'analytics_events'));
        
        const newEvent: AnalyticsEvent = {
            id: eventDocRef.id,
            anonymous_id: 'anon',
            session_id: 'session',
            user_id: userEmail || userId || null,
            uid: userId || null,
            email: userEmail || null,
            event_name: eventName,
            event_properties: properties || {},
            page_url: '',
            scroll_depth: 100,
            dwell_time: 0,
            created_at: now.toISOString()
        };

        try {
            await setDoc(eventDocRef, newEvent);
            console.log(`[Analytics Tracker] Simple Event Tracked: ${eventName}`, newEvent);
        } catch (err) {
            console.error("[Analytics Tracker] Failed to save simple analytics event:", err);
        }
    },

    identify: async (userId: string, email: string) => {
        // No-op - manual device mapping removed
    },

    getIdentityLedger: async (): Promise<IdentityReport[]> => {
        try {
            const eventsCollection = collection(db, 'analytics_events');
            const eventsSnap = await getDocs(eventsCollection);
            const eventsDocs = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as AnalyticsEvent);

            const enrollmentsCollection = collection(db, 'enrollments');
            const enrollmentsSnap = await getDocs(enrollmentsCollection);
            const enrollmentsDocs = enrollmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ParticipantSprint);

            const paymentsCollection = collection(db, 'payments');
            const paymentsSnap = await getDocs(paymentsCollection);
            const paymentsDocs = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as PaymentRecord);

            // Group events by user email or uid
            const groups = new Map<string, {
                email: string | null;
                user_id: string | null;
                events: AnalyticsEvent[];
            }>();

            eventsDocs.forEach(e => {
                const email = e.email || (e.user_id && e.user_id.includes('@') ? e.user_id : null);
                const uid = e.uid || (e.user_id && !e.user_id.includes('@') ? e.user_id : null);
                const key = (email || uid || 'unknown').toLowerCase().trim();

                if (!groups.has(key)) {
                    groups.set(key, {
                        email: email || null,
                        user_id: uid || null,
                        events: []
                    });
                }
                groups.get(key)!.events.push(e);
            });

            const identityReports: IdentityReport[] = [];

            for (const [key, g] of groups.entries()) {
                const sortedEvents = g.events.sort(
                    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );

                const firstEventTime = sortedEvents[0]?.created_at || new Date().toISOString();
                const lastActiveAt = sortedEvents[sortedEvents.length - 1]?.created_at || firstEventTime;

                const firstTouch: TrafficRecord = {
                    id: 'traffic_' + key,
                    anonymous_id: 'anon',
                    session_id: 'session',
                    user_id: g.email || g.user_id,
                    uid: g.user_id,
                    email: g.email,
                    source: 'direct',
                    medium: 'direct',
                    landing_page: 'Active',
                    referrer_url: '',
                    user_agent: 'direct',
                    device_type: 'desktop',
                    created_at: firstEventTime
                };

                const userEnrollments = enrollmentsDocs.filter(en => {
                    const enUser = (en.user_id || '').toLowerCase().trim();
                    const emailMatch = g.email && enUser === g.email.toLowerCase().trim();
                    const uidMatch = g.user_id && enUser === g.user_id.toLowerCase().trim();
                    return emailMatch || uidMatch;
                });

                const userPayments = paymentsDocs.filter(p => {
                    const pEmail = (p.userEmail || '').toLowerCase().trim();
                    const pUid = (p.userId || '').toLowerCase().trim();
                    const emailMatch = g.email && pEmail === g.email.toLowerCase().trim();
                    const uidMatch = g.user_id && pUid === g.user_id.toLowerCase().trim();
                    return emailMatch || uidMatch;
                });

                const hasPaidAny = userPayments.length > 0 || userEnrollments.length > 0;

                const sessionsList: UserSessionReport[] = [{
                    anonymous_id: 'anon',
                    session_id: 'session',
                    email: g.email,
                    user_id: g.user_id,
                    traffic: firstTouch,
                    events: sortedEvents,
                    totalDwellTime: 0,
                    maxScrollDepth: 100,
                    hasPaid: hasPaidAny,
                    conversionPath: sortedEvents.map(e => e.event_name)
                }];

                identityReports.push({
                    identifier: key,
                    anonymous_id: 'anon',
                    email: g.email,
                    user_id: g.user_id,
                    firstTouch,
                    lastActiveAt,
                    totalSessions: 1,
                    totalEvents: sortedEvents.length,
                    hasPaid: hasPaidAny,
                    sessions: sessionsList,
                    enrollments: userEnrollments
                });
            }

            return identityReports.sort((a,b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
        } catch (err) {
            console.error("[Analytics Tracker] Error fetching identity ledger:", err);
            return [];
        }
    },

    subscribeToEvents: (callback: (events: AnalyticsEvent[]) => void) => {
        const q = query(collection(db, 'analytics_events'));
        return onSnapshot(q, (snapshot) => {
            const rawEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as AnalyticsEvent);
            const sorted = rawEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            callback(sorted);
        }, (err) => {
            console.error("[Analytics Tracker] Error listening to events:", err);
        });
    },

    getFunnelMetrics: async (): Promise<FunnelStats> => {
        try {
            const ledger = await analyticsTracker.getIdentityLedger();
            const enrollmentsSnap = await getDocs(collection(db, 'enrollments'));
            
            const visitors = ledger.length;
            const successPayments = ledger.filter(id => id.hasPaid).length;

            let completions = 0;
            enrollmentsSnap.forEach(doc => {
                const enrollment = doc.data();
                if (enrollment.progress && Array.isArray(enrollment.progress)) {
                    const completedDays = enrollment.progress.filter((p: any) => p.completed).length;
                    if (completedDays > 0 && completedDays === enrollment.progress.length) {
                        completions++;
                    }
                }
            });

            const now = Date.now();
            const last24h = now - 24 * 60 * 60 * 1000;
            
            const activeUserList = ledger
                .filter(id => id.lastActiveAt && new Date(id.lastActiveAt).getTime() >= last24h)
                .map(id => ({
                    id: id.identifier,
                    label: id.email || id.identifier,
                    lastActive: id.lastActiveAt
                }));

            return {
                visitors,
                sprintViews: 0,
                paymentIntents: 0,
                successPayments,
                completions,
                activeUserList
            };
        } catch (err) {
            console.error("[Analytics Tracker] Failed to calculate funnel metrics:", err);
            return { visitors: 0, sprintViews: 0, paymentIntents: 0, successPayments: 0, completions: 0, activeUserList: [] };
        }
    },

    getTrafficBreakdown: async (): Promise<Record<string, number>> => {
        return {};
    }
};
