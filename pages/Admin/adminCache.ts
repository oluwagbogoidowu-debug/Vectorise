/**
 * In-memory local cache store for Admin Dashboard tabs.
 * Persists data across tab navigation to avoid redundant database reads.
 * Cleansed automatically on full browser page reload.
 */
export interface AdminCache {
  pulse: { platformPulse: any; behavioralStats: any } | null;
  users: { participants: any[]; enrollments: any[]; sprints: any[] } | null;
  analytics: { coreAnalytics: any[]; activityLogs: any[]; userMap?: { [id: string]: { name: string; email?: string } } } | null;
  sprints: any[] | null;
  tracks: { tracks: any[]; sprints: any[] } | null;
  coaches: any[] | null;
  partners: { partnerApps: any[]; partners: any[]; allSprints: any[]; partnerMetrics: any } | null;
  quotes: any[] | null;
  earnings: any[] | null;
}

export const adminCache: AdminCache = {
  pulse: null,
  users: null,
  analytics: null,
  sprints: null,
  tracks: null,
  coaches: null,
  partners: null,
  quotes: null,
  earnings: null,
};

/**
 * Resets the entire cache (useful contextually or if needed)
 */
export const resetAdminCache = () => {
  adminCache.pulse = null;
  adminCache.users = null;
  adminCache.analytics = null;
  adminCache.sprints = null;
  adminCache.tracks = null;
  adminCache.coaches = null;
  adminCache.partners = null;
  adminCache.quotes = null;
  adminCache.earnings = null;
};
