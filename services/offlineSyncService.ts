import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { toast } from 'sonner';
import { analyticsService } from './analyticsService';
import { analyticsTracker } from './analyticsTracker';
import { pushNotificationService } from './pushNotificationService';

export interface PendingCompletion {
  userId: string;
  enrollmentId: string;
  sprint_id: string; // added to match properties
  viewingDay: number;
  taskInputs: string[];
  timestamp: string;
  isLastDay: boolean;
}

const OFFLINE_KEY = 'vtr_pending_sprint_completions_v1';

export const offlineSyncService = {
  /**
   * Get all pending items stored in localStorage
   */
  getPendingCompletions(): PendingCompletion[] {
    try {
      const stored = localStorage.getItem(OFFLINE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('[OfflineSync] Failed to read pending completions:', e);
      return [];
    }
  },

  /**
   * Save completions array into localStorage
   */
  savePendingCompletions(items: PendingCompletion[]): void {
    try {
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('[OfflineSync] Failed to save pending completions:', e);
    }
  },

  /**
   * Add a new completion record when offline
   */
  addPendingCompletion(item: PendingCompletion): void {
    const list = this.getPendingCompletions();
    // Prevent duplicate entries for the exact same enrollment day
    const exists = list.some(
      existing => 
        existing.enrollmentId === item.enrollmentId && 
        existing.viewingDay === item.viewingDay
    );
    
    if (!exists) {
      list.push(item);
      this.savePendingCompletions(list);
    }
  },

  /**
   * Synchronize all pending offline completions back to Firestore once online.
   * This is designed to be triggered upon detecting that the device has transitioned back online.
   * 
   * @param onSyncSuccess - callback to notify UI or trigger local data re-subscription
   */
  async syncPendingCompletions(onSyncSuccess?: () => void): Promise<void> {
    const pendingList = this.getPendingCompletions();
    if (pendingList.length === 0) return;

    const toastId = toast.loading(`🛜 Offline changes detected! Syncing ${pendingList.length} task${pendingList.length === 1 ? '' : 's'} to cloud...`);
    
    const failedOnes: PendingCompletion[] = [];
    let syncedCount = 0;

    for (const item of pendingList) {
      try {
        const enrollmentRef = doc(db, 'users', item.userId, 'enrollments', item.enrollmentId);
        
        // Wait, to safely construct the updated progress list, we need to read the current server state,
        // or apply on top of what is online. Or we can update the progress subarray fields.
        // But since standard handleFinishDay works by getting all progress, doing Map and sending,
        // we can fetch the latest enrollment data if we want to be highly precise and bulletproof!
        // Let's implement lazy merging so that we don't accidentally overwrite progress made on other days.
        const path = `users/${item.userId}/enrollments/${item.enrollmentId}`;
        
        // To be safe and clean, let's construct the updatePayload:
        // We need to mark the progress of this viewingDay as completed: true.
        // Let's fetch the server document first to keep integrity!
        const docRef = doc(db, 'users', item.userId, 'enrollments', item.enrollmentId);
        const docSnap = await (async () => {
          try {
            // we import getDoc from firebase/firestore
            const { getDoc } = await import('firebase/firestore');
            return await getDoc(docRef);
          } catch (e) {
            return null;
          }
        })();

        if (docSnap && docSnap.exists()) {
          const currentData = docSnap.data();
          const serverProgress = currentData?.progress || [];
          
          const updatedProgress = serverProgress.map((p: any) =>
            p.day === item.viewingDay
              ? {
                  ...p,
                  completed: true,
                  completedAt: item.timestamp,
                  submission: item.taskInputs.filter((ti) => ti.trim()).join(" | "),
                  answers: item.taskInputs,
                }
              : p,
          );

          const updatePayload: any = {
            progress: updatedProgress,
            last_activity_at: item.timestamp,
          };

          const isLastDay = item.isLastDay;
          if (isLastDay && updatedProgress.every((p: any) => p.completed)) {
            updatePayload.completed_at = item.timestamp;
            updatePayload.status = 'completed';
          }

          await updateDoc(enrollmentRef, updatePayload);
        } else {
          // Fallback if document wasn't found or something, perform a direct field modification
          // (though in typical cases the doc absolutely exists)
          throw new Error('Enrollment document not found on server');
        }

        // Track user participation in activity once synced successfully
        analyticsService
          .logUserActivity(item.userId, item.sprint_id, 'task_submission')
          .catch((e) => console.error('[OfflineSync] Streak tracking failed:', e));

        analyticsTracker.trackEvent('sprint_submission', {
          sprint_id: item.sprint_id,
          day: item.viewingDay,
          offlineSynced: true
        }, item.userId);

        pushNotificationService
          .triggerCompletedTask(item.userId)
          .catch((e) => console.error('[OfflineSync] Push trigger failed:', e));

        syncedCount++;
      } catch (err) {
        console.error(`[OfflineSync] Sync failed for enrollment ${item.enrollmentId}:`, err);
        failedOnes.push(item);
      }
    }

    // Update local storage configuration with whatever couldn't sync
    this.savePendingCompletions(failedOnes);

    if (syncedCount > 0) {
      toast.success(`🛜 Synchronization success! ${syncedCount} of your offline tasks are perfectly synced.`, { id: toastId });
      if (onSyncSuccess) {
        onSyncSuccess();
      }
    } else {
      toast.error('🛜 Synchronization failed. Storing changes locally, retrying later.', { id: toastId });
    }
  }
};
