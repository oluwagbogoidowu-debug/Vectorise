
import { db } from './firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { UserAnalytics, UserEvent, RiskLevel, PlatformPulse, CoachAnalytics, ParticipantSprint } from '../types';
import { sanitizeData } from './userService';

const ANALYTICS_COLLECTION = 'user_analytics';
const COACH_ANALYTICS_COLLECTION = 'coach_analytics';
const FIRESTORE_IN_LIMIT = 30;

export const analyticsService = {
  /**
   * Derives a coach's performance based on outcome and responsiveness rules.
   * This logic handles scaling by chunking Firestore 'in' queries to 30 items per batch.
   */
  refreshCoachState: async (coachId: string): Promise<CoachAnalytics> => {
      const now = new Date();
      
      // 1. Get all sprint IDs for this coach
      const sprintQ = query(collection(db, 'sprints'), where('coachId', '==', coachId));
      const sprintSnap = await getDocs(sprintQ);
      const sprintIds = sprintSnap.docs.map(d => d.id);
      
      let allEnrollments: ParticipantSprint[] = [];
      let allEvents: UserEvent[] = [];

      if (sprintIds.length > 0) {
          // 2. Fetch enrollments in chunks of 30 to satisfy Firestore limits
          for (let i = 0; i < sprintIds.length; i += FIRESTORE_IN_LIMIT) {
              const chunk = sprintIds.slice(i, i + FIRESTORE_IN_LIMIT);
              const enrollmentQ = query(collection(db, 'enrollments'), where('sprintId', 'in', chunk));
              const enrollSnap = await getDocs(enrollmentQ);
              const chunkEnrollments = enrollSnap.docs.map(d => d.data() as ParticipantSprint);
              allEnrollments = [...allEnrollments, ...chunkEnrollments];
          }

          // 3. Fetch all events related to these sprints in chunks of 30
          for (let i = 0; i < sprintIds.length; i += FIRESTORE_IN_LIMIT) {
              const chunk = sprintIds.slice(i, i + FIRESTORE_IN_LIMIT);
              const eventQ = query(collection(db, 'user_events'), where('sprintId', 'in', chunk));
              const eventSnap = await getDocs(eventQ);
              const chunkEvents = eventSnap.docs.map(d => d.data() as UserEvent);
              allEvents = [...allEvents, ...chunkEvents];
          }
      }

      // 4. RESPONSIVENESS CALCULATION
      const triggers = allEvents.filter(e => e.metadata?.isResponseTrigger);
      const responses = allEvents.filter(e => e.eventType === 'feedback_sent');

      let slaMetCount = 0;
      let totalTimeDiffMs = 0;
      let responsesEvaluated = 0;

      triggers.forEach(trigger => {
          // Find coach response to this specific trigger
          const response = responses.find(r => r.metadata?.triggerId === trigger.id);
          
          if (response) {
              const diffMs = new Date(response.timestamp).getTime() - new Date(trigger.timestamp).getTime();
              const diffHrs = diffMs / (1000 * 3600);
              const slaAllowed = trigger.metadata?.slaHrs || 24;

              if (diffHrs <= slaAllowed) slaMetCount++;
              totalTimeDiffMs += diffMs;
              responsesEvaluated++;
          }
      });

      // 5. Calculate Mastery Yield
      const totalEnrollmentsCount = allEnrollments.length;
      const completed = allEnrollments.filter(e => e.progress.every(p => p.completed)).length;
      const yieldRate = totalEnrollmentsCount > 0 ? completed / totalEnrollmentsCount : 1.0;

      // 6. Risk Signals
      const riskSignals = [];
      const slaRate = responsesEvaluated > 0 ? slaMetCount / responsesEvaluated : 1.0;
      if (slaRate < 0.8) riskSignals.push("SLA Breach Alert");
      if (yieldRate < 0.3 && totalEnrollmentsCount > 5) riskSignals.push("High Drop-off Rate");
      
      const derived: CoachAnalytics = {
          coachId,
          masteryYield: yieldRate,
          supportVelocityHrs: responsesEvaluated > 0 ? (totalTimeDiffMs / responsesEvaluated) / (1000 * 3600) : 0,
          slaComplianceRate: slaRate,
          totalStudentsManaged: totalEnrollmentsCount,
          activeRiskSignals: riskSignals,
          studentRetentionRate: 0.2, // Simulated base
          recoveryYield: 0.65, // Simulated: % of at-risk users who recovered after a response
          updatedAt: now.toISOString()
      };

      await setDoc(doc(db, COACH_ANALYTICS_COLLECTION, coachId), sanitizeData(derived));
      return derived;
  },

  getCoachAnalytics: async (coachId: string): Promise<CoachAnalytics | null> => {
    const snap = await getDoc(doc(db, COACH_ANALYTICS_COLLECTION, coachId));
    return snap.exists() ? sanitizeData(snap.data()) as CoachAnalytics : null;
  },

  refreshUserState: async (userId: string, events: UserEvent[]): Promise<UserAnalytics> => {
    const now = new Date();
    const lastEvent = events[0]; 
    
    const lastSubmission = events.find(e => e.eventType === 'task_submitted');
    let risk: RiskLevel = 'low';
    
    if (lastSubmission) {
      const daysSince = (now.getTime() - new Date(lastSubmission.timestamp).getTime()) / (1000 * 3600 * 24);
      if (daysSince > 7) risk = 'churned';
      else if (daysSince > 4) risk = 'high';
      else if (daysSince > 2) risk = 'medium';
    }

    const derivedState: UserAnalytics = {
      userId,
      lastActive: lastEvent?.timestamp || now.toISOString(),
      riskLevel: risk,
      engagementScore: calculateEngagement(events),
      dropOffProbability: risk === 'low' ? 0.1 : risk === 'medium' ? 0.4 : 0.8,
      currentCycleLabels: deriveLabels(events),
      updatedAt: now.toISOString()
    };

    await setDoc(doc(db, ANALYTICS_COLLECTION, userId), sanitizeData(derivedState));
    return derivedState;
  },

  getAnalytics: async (userId: string): Promise<UserAnalytics | null> => {
    const snap = await getDoc(doc(db, ANALYTICS_COLLECTION, userId));
    return snap.exists() ? sanitizeData(snap.data()) as UserAnalytics : null;
  },

  getPlatformPulse: async (): Promise<PlatformPulse> => {
      try {
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const eventQ = query(collection(db, 'user_events'), where('timestamp', '>=', dayAgo));
          const eventSnap = await getDocs(eventQ);
          const events = eventSnap.docs.map(d => d.data() as UserEvent);
          
          // Small array, safe from the 30 limit
          const analyticsQ = query(collection(db, ANALYTICS_COLLECTION), where('riskLevel', 'in', ['high', 'churned']));
          const analyticsSnap = await getDocs(analyticsQ);

          return {
              activeUsers24h: new Set(events.map(e => e.userId)).size,
              totalEnrollments24h: events.filter(e => e.eventType === 'sprint_enrolled').length,
              atRiskCount: analyticsSnap.size,
              revenue24h: 0 
          };
      } catch (error) {
          console.error("Platform Pulse Error:", error);
          return { activeUsers24h: 0, totalEnrollments24h: 0, atRiskCount: 0, revenue24h: 0 };
      }
  }
};

const calculateEngagement = (events: UserEvent[]) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const count = events.filter(e => new Date(e.timestamp) > weekAgo).length;
  return Math.min(100, count * 5);
};

const deriveLabels = (events: UserEvent[]) => {
  const labels = [];
  const submissions = events.filter(e => e.eventType === 'task_submitted');
  if (submissions.length > 5) labels.push("Power User");
  const nightEvents = events.filter(e => {
    const hour = new Date(e.timestamp).getHours();
    return hour > 22 || hour < 5;
  });
  if (nightEvents.length > events.length / 2 && events.length > 3) labels.push("Night Owl");
  return labels;
};
