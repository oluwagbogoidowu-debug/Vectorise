import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { sprintService } from '../services/sprintService';
import { shineService } from '../services/shineService';
import { sanitizeData, userService } from '../services/userService';
import {
  MILESTONES,
  MilestoneDefinition,
  calculateMilestoneStatValue,
  computeMilestoneStats,
} from '../services/milestoneConstants';
import { Participant, ParticipantSprint, ShinePost } from '../types';

export interface UnlockedUnclaimedMilestone extends MilestoneDefinition {
  currentValue: number;
}

export function useUnclaimedMilestones(enabled: boolean = true) {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<ParticipantSprint[]>([]);
  const [reflections, setReflections] = useState<ShinePost[]>([]);
  const [referralsCount, setReferralsCount] = useState<number>(0);
  const [claimRecordIds, setClaimRecordIds] = useState<string[]>([]);
  const [optimisticClaimedIds, setOptimisticClaimedIds] = useState<string[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!enabled || !user?.id) {
      setEnrollments([]);
      setReflections([]);
      setReferralsCount(0);
      setClaimRecordIds([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let enrDone = false;
    let refDone = false;
    const markDone = () => {
      if (enrDone && refDone) setIsLoading(false);
    };

    const unsubEnrollments = sprintService.subscribeToUserEnrollments(user.id, (list) => {
      setEnrollments(list.map((e) => sanitizeData(e)));
      enrDone = true;
      markDone();
    });

    const unsubPosts = shineService.subscribeToPosts((posts: ShinePost[]) => {
      setReflections(
        posts.filter((p) => p.userId === user.id).map((p) => sanitizeData(p))
      );
      refDone = true;
      markDone();
    });

    const unsubReferrals = onSnapshot(
      query(collection(db, 'users', user.id, 'referrals')),
      (snap) => {
        setReferralsCount(snap.size);
      },
      () => {}
    );

    const unsubClaims = onSnapshot(
      query(collection(db, 'users', user.id, 'claims')),
      (snap) => {
        const ids = snap.docs
          .map((d) => (d.data()?.milestoneId ? String(d.data().milestoneId) : ''))
          .filter(Boolean);
        setClaimRecordIds(ids);
      },
      () => {}
    );

    return () => {
      unsubEnrollments();
      unsubPosts();
      unsubReferrals();
      unsubClaims();
    };
  }, [enabled, user?.id]);

  const unclaimedMilestones = useMemo<UnlockedUnclaimedMilestone[]>(() => {
    if (!enabled || !user) return [];
    const p = user as Participant;
    const claimedSet = new Set<string>([
      ...(p.claimedMilestoneIds || []),
      ...(p.claimedBadges || []).map((b: any) => b?.milestoneId).filter(Boolean),
      ...claimRecordIds,
      ...optimisticClaimedIds,
    ]);

    const stats = computeMilestoneStats(enrollments, reflections, referralsCount);
    return MILESTONES.filter((m) => {
      if (claimedSet.has(m.id)) return false;
      const val = calculateMilestoneStatValue(m.id, stats);
      return val >= m.targetValue;
    }).map((m) => ({
      ...m,
      currentValue: calculateMilestoneStatValue(m.id, stats),
    }));
  }, [enabled, user, enrollments, reflections, referralsCount, claimRecordIds, optimisticClaimedIds]);

  const claimOne = useCallback(
    async (milestone: MilestoneDefinition): Promise<boolean> => {
      if (!user?.id || claimingId) return false;
      setClaimingId(milestone.id);
      setOptimisticClaimedIds((prev) =>
        prev.includes(milestone.id) ? prev : [...prev, milestone.id]
      );
      try {
        const res = await userService.claimMilestone(
          user.id,
          milestone.id,
          milestone.points
        );
        if (res?.claimed) {
          userService.queueNotification(
            'success',
            `Claimed! +${milestone.points} Coins added to your wallet.`,
            { duration: 2500 }
          );
          return true;
        }
        return Boolean(res?.alreadyClaimed);
      } catch (err) {
        setOptimisticClaimedIds((prev) =>
          prev.filter((id) => id !== milestone.id)
        );
        userService.queueNotification('error', 'Failed to claim coins.', {
          duration: 3000,
        });
        return false;
      } finally {
        setClaimingId(null);
      }
    },
    [user?.id, claimingId]
  );

  return {
    unclaimedMilestones,
    claimingId,
    claimOne,
    isLoading,
  };
}
