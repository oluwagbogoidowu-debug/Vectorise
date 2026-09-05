import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  onSnapshot,
  increment,
  addDoc
} from 'firebase/firestore';
import { Sprint, ParticipantSprint } from '../types';
import { sprintService } from './sprintService';

export interface SprintFunnelMetrics {
  sprintId: string;
  sprintTitle?: string;
  sprintCategory?: string;
  coachId?: string;
  coachName?: string;
  descriptionViews: number;
  previewStarts: number;
  move1Success: number;
  sprintCompletions: number;
  lastActivityAt?: string;
  updatedAt?: string;
}

export interface SprintAnalyticsEvent {
  id?: string;
  sprintId: string;
  eventType: 'description_view' | 'preview_start' | 'move_1_success' | 'sprint_completion';
  userId?: string;
  userEmail?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

const COLLECTION_NAME = 'sprint_analytics';
const EVENTS_COLLECTION = 'sprint_analytics_events';

export const sprintAnalyticsService = {
  /**
   * Track Sprint Description View (when user opens /sprint/:sprintId)
   */
  trackDescriptionView: async (sprintId: string, userId?: string, metadata?: Record<string, any>) => {
    if (!sprintId) return;
    try {
      const now = new Date().toISOString();
      const docRef = doc(db, COLLECTION_NAME, sprintId);
      
      // Atomic increment or initialization
      await setDoc(docRef, {
        sprintId,
        descriptionViews: increment(1),
        lastActivityAt: now,
        updatedAt: now,
        ...(metadata?.title ? { sprintTitle: metadata.title } : {}),
        ...(metadata?.category ? { sprintCategory: metadata.category } : {})
      }, { merge: true });

      // Log event
      try {
        await addDoc(collection(db, EVENTS_COLLECTION), {
          sprintId,
          eventType: 'description_view',
          userId: userId || 'anonymous',
          timestamp: now,
          metadata: metadata || {}
        });
      } catch (logErr) {
        // Non-blocking log write
      }
    } catch (e) {
      console.warn('[SprintAnalytics] Failed to track description view:', e);
    }
  },

  /**
   * Track Sprint Preview Start (when user starts Move 1 in /sprint/preview/:sprintId)
   */
  trackPreviewStart: async (sprintId: string, userId?: string, metadata?: Record<string, any>) => {
    if (!sprintId) return;
    try {
      const now = new Date().toISOString();
      const docRef = doc(db, COLLECTION_NAME, sprintId);

      await setDoc(docRef, {
        sprintId,
        previewStarts: increment(1),
        lastActivityAt: now,
        updatedAt: now,
        ...(metadata?.title ? { sprintTitle: metadata.title } : {})
      }, { merge: true });

      try {
        await addDoc(collection(db, EVENTS_COLLECTION), {
          sprintId,
          eventType: 'preview_start',
          userId: userId || 'anonymous',
          timestamp: now,
          metadata: metadata || {}
        });
      } catch (logErr) {}
    } catch (e) {
      console.warn('[SprintAnalytics] Failed to track preview start:', e);
    }
  },

  /**
   * Track Move 1 Success Page (when user completes Move 1 / lands on DaySuccess for day 1)
   */
  trackMove1Success: async (sprintId: string, userId?: string, metadata?: Record<string, any>) => {
    if (!sprintId) return;
    try {
      const now = new Date().toISOString();
      const docRef = doc(db, COLLECTION_NAME, sprintId);

      await setDoc(docRef, {
        sprintId,
        move1Success: increment(1),
        lastActivityAt: now,
        updatedAt: now
      }, { merge: true });

      try {
        await addDoc(collection(db, EVENTS_COLLECTION), {
          sprintId,
          eventType: 'move_1_success',
          userId: userId || 'anonymous',
          timestamp: now,
          metadata: metadata || {}
        });
      } catch (logErr) {}
    } catch (e) {
      console.warn('[SprintAnalytics] Failed to track Move 1 success:', e);
    }
  },

  /**
   * Track Sprint Completion (when user finishes all moves / reaches completion modal)
   */
  trackSprintCompletion: async (sprintId: string, userId?: string, metadata?: Record<string, any>) => {
    if (!sprintId) return;
    try {
      const now = new Date().toISOString();
      const docRef = doc(db, COLLECTION_NAME, sprintId);

      await setDoc(docRef, {
        sprintId,
        sprintCompletions: increment(1),
        lastActivityAt: now,
        updatedAt: now
      }, { merge: true });

      try {
        await addDoc(collection(db, EVENTS_COLLECTION), {
          sprintId,
          eventType: 'sprint_completion',
          userId: userId || 'anonymous',
          timestamp: now,
          metadata: metadata || {}
        });
      } catch (logErr) {}
    } catch (e) {
      console.warn('[SprintAnalytics] Failed to track sprint completion:', e);
    }
  },

  /**
   * Aggregate complete sprint funnel analytics strictly for real sprints (no riseblog or ignite)
   */
  getAllSprintFunnelMetrics: async (): Promise<{
    sprints: Sprint[];
    metricsBySprint: Record<string, SprintFunnelMetrics>;
    totalViews: number;
    totalStarts: number;
    totalMove1: number;
    totalCompletions: number;
  }> => {
    try {
      // 1. Fetch all sprints and all enrollments concurrently
      const [allSprintsData, enrollmentsData, analyticsDocsSnap] = await Promise.all([
        sprintService.getAdminSprints().catch(() => []),
        sprintService.getAllEnrollments().catch(() => []),
        getDocs(collection(db, COLLECTION_NAME)).catch(() => null)
      ]);

      // 2. Filter strictly for sprints (exclude blogs, riseblogs, and ignite posts)
      const validSprints = (allSprintsData as Sprint[]).filter(s => {
        if (!s || !s.id) return false;
        const ct = String(s.contentType || 'sprint').toLowerCase().trim();
        const sub = String((s as any).subcategory || (s as any).category || '').toLowerCase().trim();
        
        if (ct === 'blog' || ct === 'ignite') return false;
        if (sub === 'riseblog' || sub === 'insight' || sub === 'ignite') return false;
        return true;
      });

      // 3. Map tracked metrics from sprint_analytics collection
      const trackedMap: Record<string, SprintFunnelMetrics> = {};
      if (analyticsDocsSnap && !analyticsDocsSnap.empty) {
        analyticsDocsSnap.docs.forEach(d => {
          const data = d.data() as any;
          trackedMap[d.id] = {
            sprintId: d.id,
            sprintTitle: data.sprintTitle,
            sprintCategory: data.sprintCategory,
            descriptionViews: Number(data.descriptionViews) || 0,
            previewStarts: Number(data.previewStarts) || 0,
            move1Success: Number(data.move1Success) || 0,
            sprintCompletions: Number(data.sprintCompletions) || 0,
            lastActivityAt: data.lastActivityAt || data.updatedAt
          };
        });
      }

      // 4. Compute metrics from enrollments database ground truth
      const enrollmentsBySprint: Record<string, {
        totalEnrolled: number;
        move1CompletedCount: number;
        fullyCompletedCount: number;
      }> = {};

      (enrollmentsData as ParticipantSprint[]).forEach(en => {
        if (!en || !en.sprint_id) return;
        const sId = en.sprint_id;
        if (!enrollmentsBySprint[sId]) {
          enrollmentsBySprint[sId] = {
            totalEnrolled: 0,
            move1CompletedCount: 0,
            fullyCompletedCount: 0
          };
        }

        enrollmentsBySprint[sId].totalEnrolled += 1;

        // Check Move 1 / Day 1 completion
        const hasMove1 = en.progress?.some(p => {
          const isDay1 = p.day === 1 || (p as any).dayNumber === 1 || (p as any).moveNumber === 1;
          return isDay1 && p.completed;
        }) || (en.progress && en.progress.length > 0 && en.progress[0]?.completed);

        if (hasMove1) {
          enrollmentsBySprint[sId].move1CompletedCount += 1;
        }

        // Check full completion
        const isCompleted = en.status === 'completed' || (en.progress && en.progress.length > 0 && en.progress.every(p => p.completed));
        if (isCompleted) {
          enrollmentsBySprint[sId].fullyCompletedCount += 1;
        }
      });

      // 5. Synthesize composite accurate counts per sprint
      const metricsBySprint: Record<string, SprintFunnelMetrics> = {};
      let totalViews = 0;
      let totalStarts = 0;
      let totalMove1 = 0;
      let totalCompletions = 0;

      validSprints.forEach(sprint => {
        const sId = sprint.id;
        const tracked = trackedMap[sId] || {
          sprintId: sId,
          descriptionViews: 0,
          previewStarts: 0,
          move1Success: 0,
          sprintCompletions: 0
        };

        const dbStats = enrollmentsBySprint[sId] || {
          totalEnrolled: 0,
          move1CompletedCount: 0,
          fullyCompletedCount: 0
        };

        const rawViews = typeof (sprint as any).viewsCount === 'number' 
          ? (sprint as any).viewsCount 
          : typeof (sprint as any).totalViews === 'number'
          ? (sprint as any).totalViews
          : typeof (sprint as any).viewCount === 'number'
          ? (sprint as any).viewCount
          : 0;

        // Ensure natural funnel monotonicity: Views >= Starts >= Move1 >= Completions
        const completionsCount = Math.max(tracked.sprintCompletions, dbStats.fullyCompletedCount);
        const move1Count = Math.max(tracked.move1Success, dbStats.move1CompletedCount, completionsCount);
        const startsCount = Math.max(tracked.previewStarts, dbStats.totalEnrolled, move1Count);
        const viewsCount = Math.max(tracked.descriptionViews, rawViews, startsCount);

        const metric: SprintFunnelMetrics = {
          sprintId: sId,
          sprintTitle: sprint.title || tracked.sprintTitle || 'Untitled Sprint',
          sprintCategory: sprint.category || tracked.sprintCategory || 'General',
          coachId: sprint.coachId,
          descriptionViews: viewsCount,
          previewStarts: startsCount,
          move1Success: move1Count,
          sprintCompletions: completionsCount,
          lastActivityAt: tracked.lastActivityAt || sprint.updatedAt || sprint.createdAt
        };

        metricsBySprint[sId] = metric;

        totalViews += viewsCount;
        totalStarts += startsCount;
        totalMove1 += move1Count;
        totalCompletions += completionsCount;
      });

      return {
        sprints: validSprints,
        metricsBySprint,
        totalViews,
        totalStarts,
        totalMove1,
        totalCompletions
      };
    } catch (e) {
      console.error('[SprintAnalytics] Error fetching all sprint funnel metrics:', e);
      return {
        sprints: [],
        metricsBySprint: {},
        totalViews: 0,
        totalStarts: 0,
        totalMove1: 0,
        totalCompletions: 0
      };
    }
  }
};
