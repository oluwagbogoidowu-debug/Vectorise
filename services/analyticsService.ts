import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { PlatformPulse, CoachAnalytics, UserAnalytics } from '../types';

export interface UserSprintAnalytics {
  user_id: string; // Identifier / User ID
  active_sprint_id: string;
  sprint_start_date: string; // ISO
  last_activity_date: string; // ISO
  current_streak: number;
  longest_streak: number;
  total_active_days: number;
  status: 'active' | 'inactive' | 'completed';
  last_check_in: string; // ISO
}

export interface UserActivityLog {
  id?: string;
  user_id: string;
  sprint_id: string;
  date: string; // YYYY-MM-DD
  action_completed: boolean;
  action_type: string; // e.g., 'task_submission', 'check_in'
  created_at: string; // ISO
}

export const analyticsService = {
  /**
   * Tracks a user's action and updates streak/active status inside user_sprint_analytics (Core Table).
   */
  logUserActivity: async (userId: string, sprintId: string, actionType: string = 'task_submission') => {
    try {
      const now = new Date();
      // Format current date in local time YYYY-MM-DD
      const dateStr = now.toLocaleDateString('sv');

      const logsRef = collection(db, 'user_activity_logs');
      
      // Prevent duplicates in a single day
      const existingQuery = query(
        logsRef,
        where('user_id', '==', userId),
        where('sprint_id', '==', sprintId),
        where('date', '==', dateStr)
      );
      const existingSnap = await getDocs(existingQuery);

      if (existingSnap.empty) {
        const newLog: UserActivityLog = {
          user_id: userId,
          sprint_id: sprintId,
          date: dateStr,
          action_completed: true,
          action_type: actionType,
          created_at: now.toISOString()
        };
        await addDoc(logsRef, newLog);
      } else {
        console.log(`[Streak Engine] Activity log already exists for date ${dateStr} (user: ${userId}, sprint: ${sprintId})`);
      }

      // Automatically compute and update Core User Sprint record
      await analyticsService.updateUserSprintRecord(userId, sprintId);

    } catch (e) {
      console.error("[Streak Engine] Error logging activity:", e);
    }
  },

  /**
   * Recalculates user's streak, longest streak, activity days, and updates Core User Sprint Table record.
   */
  updateUserSprintRecord: async (userId: string, sprintId: string) => {
    try {
      const now = new Date();
      const todayStr = now.toLocaleDateString('sv');

      // Fetch all logs to calculate streak
      const logsQ = query(
        collection(db, 'user_activity_logs'),
        where('user_id', '==', userId),
        where('sprint_id', '==', sprintId),
        where('action_completed', '==', true)
      );
      const logsSnap = await getDocs(logsQ);
      const logs = logsSnap.docs.map(d => d.data() as UserActivityLog);

      // Unique sorted activity dates
      const uniqueDates = Array.from(new Set(logs.map(l => l.date))).sort();
      const sortedDatesDesc = [...uniqueDates].reverse();

      let currentStreak = 0;
      let calculatedStatus: 'active' | 'inactive' | 'completed' = 'active';

      if (sortedDatesDesc.length > 0) {
        const latestDateStr = sortedDatesDesc[0];
        const latestDate = new Date(latestDateStr);
        const todayDate = new Date(todayStr);

        // Difference in days between today and latest activity
        const diffDays = Math.floor((todayDate.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 1) {
          // Last completed action is either yesterday or today, streak lives
          currentStreak = 1;
          let currentDateObj = latestDate;

          for (let i = 1; i < sortedDatesDesc.length; i++) {
            const prevDateObj = new Date(sortedDatesDesc[i]);
            const diff = Math.floor((currentDateObj.getTime() - prevDateObj.getTime()) / (1000 * 60 * 60 * 24));

            if (diff === 1) {
              currentStreak++;
              currentDateObj = prevDateObj;
            } else if (diff > 1) {
              break; // Gaps break the streak
            }
          }
        } else {
          // Gaps of > 1 days (i.e. missed yesterday and today) resets the streak
          currentStreak = 0;
        }

        // Mark inactive after 3 days of no activity
        if (diffDays >= 3) {
          calculatedStatus = 'inactive';
        }
      }

      // Check enrollment to see if sprint is actually completed
      const enrollQ = query(
        collection(db, 'users', userId, 'enrollments'),
        where('sprint_id', '==', sprintId)
      );
      const enrollSnap = await getDocs(enrollQ);
      if (!enrollSnap.empty) {
        const enrollment = enrollSnap.docs[0].data();
        if (enrollment.status === 'completed') {
          calculatedStatus = 'completed';
        }
      }

      // Find or create in Core table
      const coreDocRef = doc(db, 'user_sprint_analytics', `${userId}_${sprintId}`);
      const coreSnap = await getDoc(coreDocRef);

      let sprint_start_date = now.toISOString();
      let longest_streak = currentStreak;

      if (coreSnap.exists()) {
        const existing = coreSnap.data() as UserSprintAnalytics;
        sprint_start_date = existing.sprint_start_date || now.toISOString();
        longest_streak = Math.max(existing.longest_streak || 0, currentStreak);
      }

      const updatedCore: UserSprintAnalytics = {
        user_id: userId,
        active_sprint_id: sprintId,
        sprint_start_date,
        last_activity_date: now.toISOString(),
        current_streak: currentStreak,
        longest_streak,
        total_active_days: uniqueDates.length,
        status: calculatedStatus,
        last_check_in: now.toISOString()
      };

      await setDoc(coreDocRef, updatedCore);

    } catch (e) {
      console.error("[Streak Engine] Failed to update user sprint record:", e);
    }
  },

  /**
   * Get single core sprint analytics record
   */
  getUserSprintAnalytics: async (userId: string, sprintId: string): Promise<UserSprintAnalytics | null> => {
    try {
      const docRef = doc(db, 'user_sprint_analytics', `${userId}_${sprintId}`);
      const snap = await getDoc(docRef);
      return snap.exists() ? (snap.data() as UserSprintAnalytics) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Get all core sprint statistics records
   */
  getAllSprintAnalytics: async (): Promise<UserSprintAnalytics[]> => {
    try {
      const snap = await getDocs(collection(db, 'user_sprint_analytics'));
      return snap.docs.map(doc => doc.data() as UserSprintAnalytics);
    } catch (e) {
      console.error("[Streak Engine] Error fetching all sprints stats:", e);
      return [];
    }
  },

  /**
   * Get user activity logs
   */
  getUserActivityLogs: async (userId: string, sprintId?: string): Promise<UserActivityLog[]> => {
    try {
      let q = query(collection(db, 'user_activity_logs'), where('user_id', '==', userId));
      if (sprintId) {
        q = query(collection(db, 'user_activity_logs'), where('user_id', '==', userId), where('sprint_id', '==', sprintId));
      }
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data() as UserActivityLog);
    } catch (e) {
      return [];
    }
  },

  /**
   * Get all activity logs for admin stream view
   */
  getAllActivityLogs: async (): Promise<UserActivityLog[]> => {
    try {
      const snap = await getDocs(collection(db, 'user_activity_logs'));
      return snap.docs.map(doc => doc.data() as UserActivityLog);
    } catch (e) {
      return [];
    }
  },

  /**
   * Get platform pulse summary
   */
  getPlatformPulse: async (): Promise<PlatformPulse> => {
    try {
      const allAnalytics = await analyticsService.getAllSprintAnalytics();
      const activeCount = allAnalytics.filter(a => a.status === 'active').length;
      const inactiveCount = allAnalytics.filter(a => a.status === 'inactive').length;
      
      let revenue24h = 0;
      const now = Date.now();
      const last24h = now - 24 * 60 * 60 * 1000;
      
      try {
        const paymentsSnap = await getDocs(collection(db, 'payments'));
        paymentsSnap.forEach(doc => {
          const data = doc.data();
          const pDateStr = data.completedAt || data.initiatedAt || '';
          const pAmount = Number(data.amount) || 0;
          if (pDateStr && new Date(pDateStr).getTime() >= last24h) {
            revenue24h += pAmount;
          }
        });
      } catch (payErr) {
        console.error("[Platform Pulse] Error calculating 24h revenue:", payErr);
      }

      return {
        activeUsers24h: activeCount,
        totalEnrollments24h: allAnalytics.length,
        atRiskCount: inactiveCount,
        revenue24h
      };
    } catch (e) {
      return {
        activeUsers24h: 0,
        totalEnrollments24h: 0,
        atRiskCount: 0,
        revenue24h: 0
      };
    }
  },

  // Facade legacy methods for backward compatibility
  refreshCoachState: async (coachId: string): Promise<CoachAnalytics> => {
    return {
      coachId,
      masteryYield: 1.0,
      supportVelocityHrs: 0,
      slaComplianceRate: 1.0,
      totalStudentsManaged: 0,
      activeRiskSignals: [],
      studentRetentionRate: 1.0,
      recoveryYield: 1.0,
      updatedAt: new Date().toISOString()
    };
  },

  getCoachAnalytics: async (coachId: string): Promise<CoachAnalytics | null> => {
    return null;
  },

  refreshUserState: async (userId: string, events: any[]): Promise<UserAnalytics> => {
    return {
      userId,
      lastActive: new Date().toISOString(),
      riskLevel: 'low',
      engagementScore: 100,
      dropOffProbability: 0,
      currentCycleLabels: [],
      updatedAt: new Date().toISOString()
    };
  },

  getAnalytics: async (userId: string): Promise<UserAnalytics | null> => {
    return {
      userId,
      lastActive: new Date().toISOString(),
      riskLevel: 'low',
      engagementScore: 100,
      dropOffProbability: 0,
      currentCycleLabels: [],
      updatedAt: new Date().toISOString()
    };
  }
};
