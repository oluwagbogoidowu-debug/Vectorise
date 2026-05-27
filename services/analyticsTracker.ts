import { db } from './firebase';
import { collection, query, getDocs, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { 
  AnalyticsEvent, 
  TrafficRecord, 
  FunnelStats, 
  IdentityReport, 
  ParticipantSprint,
  PaymentRecord,
  UserSessionReport
} from '../types';

function getOrGenerateAnonymousId(): string {
  if (typeof window === 'undefined') return 'anon_server';
  let id = localStorage.getItem('tracker_anonymous_id');
  if (!id) {
    id = 'anon_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('tracker_anonymous_id', id);
  }
  return id;
}

function getOrGenerateSessionId(): string {
  if (typeof window === 'undefined') return 'sess_server';
  let id = sessionStorage.getItem('tracker_session_id');
  if (!id) {
    id = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    sessionStorage.setItem('tracker_session_id', id);
  }
  return id;
}

const getDeviceType = (): 'mobile' | 'desktop' | 'tablet' => {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

export const analyticsTracker = {
    toggleAnalytics: async (disabled: boolean) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('analytics_disabled', disabled ? 'true' : 'false');
        }
    },

    onDisabledStateChange: (callback: (disabled: boolean) => void) => {
        if (typeof window !== 'undefined') {
            const current = localStorage.getItem('analytics_disabled') === 'true';
            callback(current);
        } else {
            callback(false);
        }
    },

    isCurrentlyDisabled: () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('analytics_disabled') === 'true';
        }
        return false;
    },

    init: async (userId?: string, userEmail?: string) => {
        if (typeof window === 'undefined') return;
        if (analyticsTracker.isCurrentlyDisabled()) return;

        const anonId = getOrGenerateAnonymousId();
        const sessId = getOrGenerateSessionId();

        let pathName = window.location.pathname;
        let queryStr = window.location.search;
        let hashStr = window.location.hash;

        const sessionLogged = sessionStorage.getItem('tracker_session_logged') === 'true';

        if (!sessionLogged) {
            const searchParams = new URLSearchParams(queryStr);
            const utmSource = searchParams.get('utm_source') || '';
            const utmMedium = searchParams.get('utm_medium') || '';
            const utmCampaign = searchParams.get('utm_campaign') || '';
            const partnerCode = searchParams.get('ref') || searchParams.get('partner') || '';

            let referrer = document.referrer || '';
            let source = utmSource || (referrer ? new URL(referrer).hostname : 'direct');
            let medium = utmMedium || (referrer ? 'referral' : 'direct');

            const newTraffic: TrafficRecord = {
                id: sessId,
                anonymous_id: anonId,
                session_id: sessId,
                user_id: userEmail || userId || null,
                uid: userId || null,
                email: userEmail || null,
                source,
                medium,
                campaign: utmCampaign || null,
                partner_code: partnerCode || null,
                landing_page: pathName + queryStr + hashStr,
                referrer_url: referrer,
                user_agent: navigator.userAgent,
                device_type: getDeviceType(),
                geography: 'Local Browser',
                created_at: new Date().toISOString()
            };

            try {
                await setDoc(doc(db, 'traffic_records', sessId), newTraffic);
                sessionStorage.setItem('tracker_session_logged', 'true');
                if (!sessionStorage.getItem('tracker_session_start_time')) {
                    sessionStorage.setItem('tracker_session_start_time', new Date().toISOString());
                }
            } catch (err) {
                console.error("[Analytics Tracker] Error saving traffic record:", err);
            }
        } else if (userId || userEmail) {
            try {
                const docRef = doc(db, 'traffic_records', sessId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    await setDoc(docRef, {
                        ...snap.data(),
                        user_id: userEmail || userId || null,
                        uid: userId || null,
                        email: userEmail || null
                    }, { merge: true });
                }
            } catch (err) {
                console.error("[Analytics Tracker] Error updating traffic identification:", err);
            }
        }
    },

    handleScroll: () => {
        // Optional placeholder scroll tracking
    },

    trackEvent: async (eventName: string, properties: any = {}, userId?: string, userEmail?: string) => {
        if (typeof window === 'undefined') return;
        if (analyticsTracker.isCurrentlyDisabled()) return;

        const anonId = getOrGenerateAnonymousId();
        const sessId = getOrGenerateSessionId();

        await analyticsTracker.init(userId, userEmail);

        let startTimeStr = sessionStorage.getItem('tracker_session_start_time');
        if (!startTimeStr) {
            startTimeStr = new Date().toISOString();
            sessionStorage.setItem('tracker_session_start_time', startTimeStr);
        }
        const startTime = new Date(startTimeStr).getTime();
        const now = new Date();
        const dwellTime = Math.max(0, Math.round((now.getTime() - startTime) / 1000));

        const getScrollDepth = (): number => {
            const docElem = document.documentElement;
            const body = document.body;
            const scrollTop = docElem.scrollTop || body.scrollTop;
            const scrollHeight = docElem.scrollHeight || body.scrollHeight;
            const clientHeight = docElem.clientHeight;
            
            const maxScroll = scrollHeight - clientHeight;
            if (maxScroll <= 0) return 100;
            return Math.round((scrollTop / maxScroll) * 100);
        };

        const eventDocRef = doc(collection(db, 'analytics_events'));
        const newEvent: AnalyticsEvent = {
            id: eventDocRef.id,
            anonymous_id: anonId,
            session_id: sessId,
            user_id: userEmail || userId || null,
            uid: userId || null,
            email: userEmail || null,
            event_name: eventName,
            event_properties: properties || {},
            page_url: window.location.pathname + window.location.search + window.location.hash,
            scroll_depth: getScrollDepth(),
            dwell_time: dwellTime,
            created_at: now.toISOString()
        };

        try {
            await setDoc(eventDocRef, newEvent);
            console.log(`[Analytics Tracker] Event Tracked: ${eventName}`, newEvent);
        } catch (err) {
            console.error("[Analytics Tracker] Failed to save analytics event:", err);
        }
    },

    identify: async (userId: string, email: string) => {
        if (analyticsTracker.isCurrentlyDisabled()) return;
        await analyticsTracker.init(userId, email);
    },

    getIdentityLedger: async (): Promise<IdentityReport[]> => {
        try {
            const trafficCollection = collection(db, 'traffic_records');
            const trafficSnap = await getDocs(trafficCollection);
            const trafficDocs = trafficSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as TrafficRecord);

            const eventsCollection = collection(db, 'analytics_events');
            const eventsSnap = await getDocs(eventsCollection);
            const eventsDocs = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as AnalyticsEvent);

            const enrollmentsCollection = collection(db, 'enrollments');
            const enrollmentsSnap = await getDocs(enrollmentsCollection);
            const enrollmentsDocs = enrollmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ParticipantSprint);

            const paymentsCollection = collection(db, 'payments');
            const paymentsSnap = await getDocs(paymentsCollection);
            const paymentsDocs = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as PaymentRecord);

            const anonToEmail = new Map<string, string>();
            const anonToUid = new Map<string, string>();

            trafficDocs.forEach(t => {
                const anonId = t.anonymous_id;
                const email = t.email || (t.user_id && t.user_id.includes('@') ? t.user_id : null);
                const uid = t.uid || (t.user_id && !t.user_id.includes('@') ? t.user_id : null);
                
                if (anonId) {
                    if (email) anonToEmail.set(anonId, email);
                    if (uid) anonToUid.set(anonId, uid);
                }
            });

            eventsDocs.forEach(e => {
                const anonId = e.anonymous_id;
                const email = e.email || (e.user_id && e.user_id.includes('@') ? e.user_id : null);
                const uid = e.uid || (e.user_id && !e.user_id.includes('@') ? e.user_id : null);
                
                if (anonId) {
                    if (email) anonToEmail.set(anonId, email);
                    if (uid) anonToUid.set(anonId, uid);
                }
            });

            const getStitchedIdentityKey = (rec: { email?: string | null; user_id?: string | null; anonymous_id: string | null }) => {
                const email = rec.email || (rec.user_id && rec.user_id.includes('@') ? rec.user_id : null);
                if (email) return email.toLowerCase().trim();
                const anonId = rec.anonymous_id;
                if (anonId) {
                    if (anonToEmail.has(anonId)) {
                        return anonToEmail.get(anonId)!.toLowerCase().trim();
                    }
                    return anonId;
                }
                return rec.user_id || 'unknown';
            };

            const groups = new Map<string, {
                anonymous_id: string | null;
                email: string | null;
                user_id: string | null;
                trafficRecords: TrafficRecord[];
                events: AnalyticsEvent[];
            }>();

            trafficDocs.forEach(t => {
                const key = getStitchedIdentityKey(t);
                if (!groups.has(key)) {
                    groups.set(key, {
                        anonymous_id: t.anonymous_id,
                        email: t.email || (t.user_id && t.user_id.includes('@') ? t.user_id : null),
                        user_id: t.uid || (t.user_id && !t.user_id.includes('@') ? t.user_id : null),
                        trafficRecords: [],
                        events: []
                    });
                }
                const g = groups.get(key)!;
                g.trafficRecords.push(t);
                if (t.anonymous_id && !g.anonymous_id) g.anonymous_id = t.anonymous_id;
                if (t.email && !g.email) g.email = t.email;
                if (t.uid && !g.user_id) g.user_id = t.uid;
            });

            eventsDocs.forEach(e => {
                const key = getStitchedIdentityKey(e);
                if (!groups.has(key)) {
                    groups.set(key, {
                        anonymous_id: e.anonymous_id,
                        email: e.email || (e.user_id && e.user_id.includes('@') ? e.user_id : null),
                        user_id: e.uid || (e.user_id && !e.user_id.includes('@') ? e.user_id : null),
                        trafficRecords: [],
                        events: []
                    });
                }
                const g = groups.get(key)!;
                g.events.push(e);
                if (e.anonymous_id && !g.anonymous_id) g.anonymous_id = e.anonymous_id;
                if (e.email && !g.email) g.email = e.email;
                if (e.uid && !g.user_id) g.user_id = e.uid;
            });

            const identityReports: IdentityReport[] = [];

            for (const [key, g] of groups.entries()) {
                const sessionIds = new Set<string>();
                g.trafficRecords.forEach(t => sessionIds.add(t.session_id));
                g.events.forEach(e => sessionIds.add(e.session_id));

                const sessionsList: UserSessionReport[] = [];

                sessionIds.forEach(sessId => {
                    let traffic = g.trafficRecords.find(t => t.session_id === sessId);
                    const sessEvents = g.events.filter(e => e.session_id === sessId).sort(
                        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    );

                    if (!traffic) {
                        const firstEvent = sessEvents[0];
                        traffic = {
                            id: sessId,
                            anonymous_id: g.anonymous_id,
                            session_id: sessId,
                            user_id: g.email || g.user_id,
                            uid: g.user_id,
                            email: g.email,
                            source: 'direct',
                            medium: 'direct',
                            landing_page: firstEvent?.page_url || '/',
                            referrer_url: '',
                            user_agent: 'untracked',
                            device_type: 'desktop',
                            created_at: firstEvent?.created_at || new Date().toISOString()
                        };
                    }

                    const totalDwellTime = sessEvents.length > 0 
                        ? Math.max(...sessEvents.map(e => e.dwell_time || 0)) 
                        : 0;
                    
                    const maxScrollDepth = sessEvents.length > 0
                        ? Math.max(...sessEvents.map(e => e.scroll_depth || 0))
                        : 0;

                    const conversionPath = sessEvents
                        .map(e => e.event_name)
                        .filter((val, index, self) => self.indexOf(val) === index);

                    sessionsList.push({
                        anonymous_id: g.anonymous_id,
                        session_id: sessId,
                        email: g.email,
                        user_id: g.user_id,
                        traffic,
                        events: sessEvents,
                        totalDwellTime,
                        maxScrollDepth,
                        hasPaid: false,
                        conversionPath
                    });
                });

                sessionsList.sort((a, b) => new Date(b.traffic.created_at).getTime() - new Date(a.traffic.created_at).getTime());

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

                sessionsList.forEach(s => {
                    s.hasPaid = hasPaidAny;
                });

                const firstTouch = g.trafficRecords.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0] || (sessionsList[sessionsList.length - 1]?.traffic);

                let lastActiveAt = new Date().toISOString();
                if (g.events.length > 0) {
                    lastActiveAt = g.events.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at;
                } else if (g.trafficRecords.length > 0) {
                    lastActiveAt = g.trafficRecords.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at;
                }

                identityReports.push({
                    identifier: key,
                    anonymous_id: g.anonymous_id,
                    email: g.email,
                    user_id: g.user_id,
                    firstTouch,
                    lastActiveAt,
                    totalSessions: sessionsList.length,
                    totalEvents: g.events.length,
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
            const eventsSnap = await getDocs(collection(db, 'analytics_events'));
            const events = eventsSnap.docs.map(doc => doc.data() as AnalyticsEvent);
            const enrollmentsSnap = await getDocs(collection(db, 'enrollments'));
            
            const visitors = ledger.length;
            const sprintViews = events.filter(e => e.event_name === 'landing_viewed').length;
            const paymentIntents = events.filter(e => e.event_name === 'sprint_intent_captured').length;
            
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
                    label: id.email || id.anonymous_id || id.identifier,
                    lastActive: id.lastActiveAt
                }));

            return {
                visitors,
                sprintViews,
                paymentIntents,
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
        try {
            const snap = await getDocs(collection(db, 'traffic_records'));
            const counts: Record<string, number> = {};
            snap.forEach(doc => {
                const source = doc.data().source || 'direct';
                counts[source] = (counts[source] || 0) + 1;
            });
            return counts;
        } catch (e) {
            return {};
        }
    }
};
