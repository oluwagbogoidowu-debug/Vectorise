import { db } from './firebase';
import { collection, query, getDocs, limit, onSnapshot } from 'firebase/firestore';
import { AnalyticsEvent, TrafficRecord, FunnelStats, IdentityReport } from '../types';

export const analyticsTracker = {
    toggleAnalytics: async (disabled: boolean) => {
        // No-op
    },

    onDisabledStateChange: (callback: (disabled: boolean) => void) => {
        callback(true); // Always report disabled (no old analytics recorded)
    },

    isCurrentlyDisabled: () => true,

    init: async (userId?: string, userEmail?: string) => {
        // No-op
        console.log("[Analytics Tracker] Deprecated. Analytics disabled.");
    },

    handleScroll: () => {
        // No-op
    },

    trackEvent: async (eventName: string, properties: any = {}, userId?: string, userEmail?: string) => {
        // No-op
        console.log(`[Analytics Tracker] trackEvent: ${eventName}`, properties);
    },

    identify: async (userId: string, email: string) => {
        // No-op
    },

    getIdentityLedger: async (): Promise<IdentityReport[]> => {
        return [];
    },

    subscribeToEvents: (callback: (events: AnalyticsEvent[]) => void) => {
        callback([]);
        return () => {};
    },

    getFunnelMetrics: async (): Promise<FunnelStats> => {
        return { visitors: 0, sprintViews: 0, paymentIntents: 0, successPayments: 0, completions: 0, activeUserList: [] };
    },

    getTrafficBreakdown: async (): Promise<Record<string, number>> => {
        return {};
    }
};
