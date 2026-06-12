import { db } from './firebase';
import { collection, collectionGroup, query, getDocs, onSnapshot, doc } from 'firebase/firestore';
import { 
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
        // No-op
    },

    handleScroll: () => {
        // No-op
    },

    trackEvent: async (eventName: string, properties: any = {}, userId?: string, userEmail?: string) => {
        if (typeof window === 'undefined') return;
        // Local console log in development context. No Firestore writes for event telemetry.
        console.log(`[Analytics Event Logged] : ${eventName}`, properties);
    },

    identify: async (userId: string, email: string) => {
        // No-op
    },

    getIdentityLedger: async (): Promise<IdentityReport[]> => {
        try {
            // Get all participants
            const usersRef = collection(db, 'users');
            const usersSnap = await getDocs(usersRef);
            const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);

            // Get enrollments through collectionGroup
            const enrollmentsCollection = collectionGroup(db, 'enrollments');
            const enrollmentsSnap = await getDocs(enrollmentsCollection);
            const enrollmentsDocs = enrollmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ParticipantSprint);

            // Get payments
            const paymentsCollection = collection(db, 'payments');
            const paymentsSnap = await getDocs(paymentsCollection);
            const paymentsDocs = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as PaymentRecord);

            // Get all activity logs via collectionGroup
            const logsSnap = await getDocs(collectionGroup(db, 'user_activity_logs'));
            const logsDocs = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);

            const identityReports: IdentityReport[] = [];

            for (const u of users) {
                // Focus only on active participants or administrative accounts for drilling down
                const key = (u.email || u.id || 'unknown').toLowerCase().trim();
                const userEnrollments = enrollmentsDocs.filter(en => en.user_id === u.id);
                const userPayments = paymentsDocs.filter(p => p.userId === u.id);
                const userLogs = logsDocs.filter(l => l.user_id === u.id);

                const hasPaidAny = userPayments.length > 0 || userEnrollments.length > 0;
                const lastActiveAt = u.lastActivityAt || u.createdAt || new Date().toISOString();

                const firstTouch = {
                    id: 'traffic_' + u.id,
                    anonymous_id: 'anon',
                    session_id: 'session',
                    user_id: u.email || u.id,
                    source: u.referralFirstTouch || 'direct',
                    medium: 'organic',
                    landing_page: u.risePathway || 'Home Dashboard',
                    referrer_url: '',
                    user_agent: 'browser',
                    device_type: 'desktop' as const,
                    created_at: u.createdAt || new Date().toISOString()
                };

                const mappedEvents = userLogs.map(log => ({
                    id: log.id || 'log_' + Math.random(),
                    anonymous_id: u.id,
                    session_id: 'session_' + u.id,
                    user_id: u.id,
                    event_name: log.action_type || 'task_submission',
                    page_url: `Sprint: ${log.sprint_id?.substring(0, 15) || 'n/a'}`,
                    created_at: log.created_at || new Date().toISOString(),
                    scroll_depth: 100,
                    dwell_time: 0,
                    event_properties: {
                        date: log.date,
                        sprint_id: log.sprint_id,
                        completed: log.action_completed ? 'Yes' : 'No'
                    }
                }));

                const sessionsList: UserSessionReport[] = [{
                    anonymous_id: u.id,
                    session_id: 'session_' + u.id,
                    email: u.email,
                    user_id: u.id,
                    traffic: firstTouch,
                    events: mappedEvents,
                    totalDwellTime: u.impactStats?.streak || 0,
                    maxScrollDepth: 100,
                    hasPaid: hasPaidAny,
                    conversionPath: userEnrollments.map(en => `enrolled_${en.sprint_id}`)
                }];

                identityReports.push({
                    identifier: key,
                    anonymous_id: u.id,
                    email: u.email,
                    user_id: u.id,
                    firstTouch,
                    lastActiveAt,
                    totalSessions: 1,
                    totalEvents: mappedEvents.length,
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

    subscribeToEvents: (callback: (events: any[]) => void) => {
        // Since event stream is deprecated, we listen to all user activity logs instead so that
        // the realtime logs screen keeps updating!
        const q = query(collectionGroup(db, 'user_activity_logs'));
        return onSnapshot(q, (snapshot) => {
            const rawLogs = snapshot.docs.map(doc => {
                const log = doc.data() as any;
                return {
                    id: doc.id,
                    anonymous_id: log.user_id,
                    session_id: 'session_' + log.user_id,
                    user_id: log.user_id,
                    email: log.user_id,
                    event_name: log.action_type || 'task_submission',
                    page_url: `Sprint: ${log.sprint_id?.substring(0, 15) || 'n/a'}`,
                    scroll_depth: 100,
                    dwell_time: 0,
                    created_at: log.created_at || new Date().toISOString(),
                    event_properties: {
                        date: log.date,
                        sprint_id: log.sprint_id,
                        completed: log.action_completed ? 'Yes' : 'No'
                    }
                };
            });
            const sorted = rawLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            callback(sorted);
        }, (err) => {
            console.error("[Analytics Tracker] Error listening to activity logs:", err);
        });
    },

    getFunnelMetrics: async (): Promise<FunnelStats> => {
        try {
            const ledger = await analyticsTracker.getIdentityLedger();
            const enrollmentsSnap = await getDocs(collectionGroup(db, 'enrollments'));
            
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
