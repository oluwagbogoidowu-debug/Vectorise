import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sprintService } from '../services/sprintService';
import { userService } from '../services/userService';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { RotateCcw, Play, ArrowRight, Layers, Loader2 } from 'lucide-react';
import { ParticipantSprint, Sprint } from '../types';

export const SprintConflictManager: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [pendingAction, setPendingAction] = useState<any>(null);
  const [pendingSprint, setPendingSprint] = useState<Sprint | null>(null);
  const [activeOngoingSprint, setActiveOngoingSprint] = useState<Sprint | null>(null);
  const [activeOngoingEnrollment, setActiveOngoingEnrollment] = useState<ParticipantSprint | null>(null);
  const [showSameSprintModal, setShowSameSprintModal] = useState(false);
  const [showDiffSprintModal, setShowDiffSprintModal] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const checkConflicts = useCallback(async () => {
    if (loading || !user) return;

    // Do not trigger while on public login/signup pages before auth finishes
    if (location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/verify-email') {
      return;
    }

    const pendingRaw = localStorage.getItem('pending_first_action');
    if (!pendingRaw) return;

    try {
      const pending = JSON.parse(pendingRaw);
      if (!pending || !pending.sprintId) return;

      const targetSprintId = pending.sprintId;
      const sprint = await sprintService.getSprintById(targetSprintId);
      if (!sprint) {
        localStorage.removeItem('pending_first_action');
        return;
      }

      setPendingAction(pending);
      setPendingSprint(sprint);

      const enrollments = await sprintService.getUserEnrollments(user.id);
      const existingEnrollmentForTarget = enrollments.find(e => e.sprint_id === targetSprintId);
      const currentActiveEnrollment = enrollments.find(e => e.status === 'active' && !e.completed_at);

      // Case 1: Same sprint is actively in progress in their account
      if (currentActiveEnrollment && currentActiveEnrollment.sprint_id === targetSprintId) {
        setActiveOngoingEnrollment(currentActiveEnrollment);
        setActiveOngoingSprint(sprint);
        setShowSameSprintModal(true);
        return;
      }

      // Case 2: A different sprint is currently active in their account
      if (currentActiveEnrollment && currentActiveEnrollment.sprint_id !== targetSprintId) {
        const activeSprintObj = await sprintService.getSprintById(currentActiveEnrollment.sprint_id).catch(() => null);
        setActiveOngoingEnrollment(currentActiveEnrollment);
        setActiveOngoingSprint(activeSprintObj || ({ id: currentActiveEnrollment.sprint_id, title: 'Current Sprint' } as any));
        setShowDiffSprintModal(true);
        return;
      }

      // Case 3: Previously completed sprint (no other active sprint conflict) -> Start Rerun immediately (Run 2+)
      if (existingEnrollmentForTarget && existingEnrollmentForTarget.status === 'completed') {
        await executeStartRerun(sprint, pending, existingEnrollmentForTarget);
        return;
      }

      // Case 4: Brand new sprint (no active conflicts) -> Auto enroll & navigate to Day Success
      await executeNewEnrollment(sprint, pending);
    } catch (err) {
      console.error("[SprintConflictManager] Error evaluating pending preview action:", err);
    }
  }, [user, loading, location.pathname]);

  useEffect(() => {
    checkConflicts();
  }, [checkConflicts]);

  // Execute Rerun for completed sprints
  const executeStartRerun = async (sprint: Sprint, pending: any, existingEnrollment: ParticipantSprint) => {
    if (!user) return;
    setIsProcessingAction(true);
    try {
      const rawInputs = pending.taskInputs || (pending.firstActionInput ? [pending.firstActionInput] : []);
      const cleanInputs: string[] = Array.isArray(rawInputs) ? rawInputs : [];
      const primarySubmission = cleanInputs.find(t => t && t.trim().length > 0) || cleanInputs[0] || pending.firstActionInput || "";

      const previousRuns = existingEnrollment.pastRuns || [];
      const completedRun = {
        runNumber: existingEnrollment.currentRun || existingEnrollment.runNumber || (previousRuns.length + 1) || 1,
        started_at: existingEnrollment.started_at || new Date().toISOString(),
        completed_at: existingEnrollment.completed_at || new Date().toISOString(),
        status: 'completed' as const,
        progress: existingEnrollment.progress || []
      };
      const newPastRuns = [...previousRuns, completedRun];
      const newRunNumber = newPastRuns.length + 1;
      const effectiveDuration = sprint.duration || existingEnrollment.progress?.length || 7;
      const now = new Date().toISOString();

      const freshProgress = Array.from({ length: effectiveDuration }, (_, i) => ({
        day: i + 1,
        completed: i === 0,
        completedAt: i === 0 ? now : undefined,
        answers: i === 0 ? cleanInputs : [],
        submission: i === 0 ? primarySubmission : ""
      }));

      const enrollmentRef = doc(db, 'users', user.id, 'enrollments', existingEnrollment.id);
      const updatedData = {
        status: 'active' as const,
        currentRun: newRunNumber,
        runNumber: newRunNumber,
        pastRuns: newPastRuns,
        started_at: now,
        completed_at: null,
        progress: freshProgress,
        last_activity_at: now
      };

      // Ensure all other enrollments for this user are placed in queued status
      const userEnrollments = await sprintService.getUserEnrollments(user.id);
      for (const e of userEnrollments) {
        if (e.id !== existingEnrollment.id && e.status === 'active') {
          const otherRef = doc(db, 'users', user.id, 'enrollments', e.id);
          await updateDoc(otherRef, { status: 'queued', last_activity_at: now });
        }
      }

      await updateDoc(enrollmentRef, updatedData);
      await userService.addUserEnrollment(user.id, sprint.id);

      localStorage.removeItem('pending_first_action');
      localStorage.removeItem('vectorise_last_sprint');
      toast.success(`Started Run ${newRunNumber} for ${sprint.title}! Day 1 completed.`);

      const d1Content = Array.isArray(sprint?.dailyContent) ? sprint.dailyContent.find((dc: any) => dc.day === 1) : undefined;
      navigate('/participant/day-success', {
        replace: true,
        state: {
          day: 1,
          coinsUnlocked: 10,
          bridgeNote: d1Content?.bridgeNote,
          sprintId: sprint.id,
          sprint: sprint,
          enrollmentId: existingEnrollment.id,
          taskInputs: cleanInputs,
          redirectToDaySuccess: true
        }
      });
    } catch (e) {
      console.error("[SprintConflictManager] Failed to execute rerun:", e);
      toast.error("Failed to start rerun. Please try again.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Execute Brand New Enrollment
  const executeNewEnrollment = async (sprint: Sprint, pending: any) => {
    if (!user) return;
    setIsProcessingAction(true);
    try {
      const rawInputs = pending.taskInputs || (pending.firstActionInput ? [pending.firstActionInput] : []);
      const cleanInputs: string[] = Array.isArray(rawInputs) ? rawInputs : [];
      const primarySubmission = cleanInputs.find(t => t && t.trim().length > 0) || cleanInputs[0] || pending.firstActionInput || "";

      const enrollment = await sprintService.enrollUser(user.id, sprint.id, sprint.duration || 7, {
        firstActionInput: primarySubmission,
        taskInputs: cleanInputs
      });

      // Explicitly set target enrollment to active, and queue any other active sprints
      const userEnrollments = await sprintService.getUserEnrollments(user.id);
      for (const e of userEnrollments) {
        if (e.id !== enrollment?.id && e.status === 'active') {
          const otherRef = doc(db, "users", user.id, "enrollments", e.id);
          await updateDoc(otherRef, { status: 'queued', last_activity_at: new Date().toISOString() });
        }
      }

      if (enrollment && enrollment.progress && enrollment.progress[0]) {
        const updatedProgress = [...enrollment.progress];
        updatedProgress[0] = {
          ...updatedProgress[0],
          completed: true,
          completedAt: new Date().toISOString(),
          answers: cleanInputs,
          submission: primarySubmission
        };
        const enrollmentRef = doc(db, "users", user.id, "enrollments", enrollment.id);
        await updateDoc(enrollmentRef, {
          status: 'active',
          progress: updatedProgress,
          last_activity_at: new Date().toISOString()
        });
      }

      await userService.addUserEnrollment(user.id, sprint.id);
      localStorage.removeItem('pending_first_action');
      localStorage.removeItem('vectorise_last_sprint');

      const d1Content = Array.isArray(sprint?.dailyContent) ? sprint.dailyContent.find((dc: any) => dc.day === 1) : undefined;
      navigate('/participant/day-success', {
        replace: true,
        state: {
          day: 1,
          coinsUnlocked: 10,
          bridgeNote: d1Content?.bridgeNote,
          sprintId: sprint.id,
          sprint: sprint,
          enrollmentId: enrollment?.id,
          taskInputs: cleanInputs,
          redirectToDaySuccess: true
        }
      });
    } catch (e) {
      console.error("[SprintConflictManager] Failed to enroll new sprint:", e);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handler: Modal 1 - Keep Previous Progress (Same Sprint)
  const handleContinuePreviousSameSprint = () => {
    localStorage.removeItem('pending_first_action');
    localStorage.removeItem('vectorise_last_sprint');
    setShowSameSprintModal(false);
    toast.success(`Resumed previous progress for ${pendingSprint?.title || 'your sprint'}.`);
    if (activeOngoingEnrollment?.id) {
      navigate(`/participant/sprint/${activeOngoingEnrollment.id}`);
    }
  };

  // Handler: Modal 1 - Restart With New Action (Same Sprint)
  const handleRestartWithNewActionSameSprint = async () => {
    if (!user || !pendingSprint || !activeOngoingEnrollment) return;
    setIsProcessingAction(true);
    try {
      const rawInputs = pendingAction?.taskInputs || (pendingAction?.firstActionInput ? [pendingAction.firstActionInput] : []);
      const cleanInputs: string[] = Array.isArray(rawInputs) ? rawInputs : [];
      const primarySubmission = cleanInputs.find(t => t && t.trim().length > 0) || cleanInputs[0] || pendingAction?.firstActionInput || "";
      const now = new Date().toISOString();
      const effectiveDuration = pendingSprint.duration || activeOngoingEnrollment.progress?.length || 7;

      const freshProgress = Array.from({ length: effectiveDuration }, (_, i) => ({
        day: i + 1,
        completed: i === 0,
        completedAt: i === 0 ? now : undefined,
        answers: i === 0 ? cleanInputs : [],
        submission: i === 0 ? primarySubmission : ""
      }));

      const enrollmentRef = doc(db, 'users', user.id, 'enrollments', activeOngoingEnrollment.id);
      await updateDoc(enrollmentRef, {
        progress: freshProgress,
        started_at: now,
        last_activity_at: now,
        status: 'active'
      });

      localStorage.removeItem('pending_first_action');
      localStorage.removeItem('vectorise_last_sprint');
      setShowSameSprintModal(false);
      toast.success(`Sprint restarted with your new Day 1 action!`);

      const d1Content = Array.isArray(pendingSprint?.dailyContent) ? pendingSprint.dailyContent.find((dc: any) => dc.day === 1) : undefined;
      navigate('/participant/day-success', {
        replace: true,
        state: {
          day: 1,
          coinsUnlocked: 10,
          bridgeNote: d1Content?.bridgeNote,
          sprintId: pendingSprint.id,
          sprint: pendingSprint,
          enrollmentId: activeOngoingEnrollment.id,
          taskInputs: cleanInputs,
          redirectToDaySuccess: true
        }
      });
    } catch (err) {
      console.error("[SprintConflictManager] Error restarting sprint with new action:", err);
      toast.error("Failed to restart sprint. Please try again.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handler: Modal 2 - Option A: Keep Previous Active Sprint (Different Sprints)
  const handleKeepPreviousDifferentSprint = () => {
    localStorage.removeItem('pending_first_action');
    localStorage.removeItem('vectorise_last_sprint');
    setShowDiffSprintModal(false);
    toast.success(`Continuing with active sprint: ${activeOngoingSprint?.title || 'your sprint'}.`);
    if (activeOngoingEnrollment?.id) {
      navigate(`/participant/sprint/${activeOngoingEnrollment.id}`);
    } else {
      navigate('/dashboard');
    }
  };

  // Handler: Modal 2 - Option B: Switch to New Sprint (Different Sprints)
  const handleSwitchToNewDifferentSprint = async () => {
    if (!user || !pendingSprint) return;
    setIsProcessingAction(true);
    try {
      // 1. Pause/Queue current active sprint
      if (activeOngoingEnrollment) {
        const prevRef = doc(db, 'users', user.id, 'enrollments', activeOngoingEnrollment.id);
        await updateDoc(prevRef, { status: 'queued', last_activity_at: new Date().toISOString() });
      }

      // 2. Check if the new pending sprint was completed before
      const enrollments = await sprintService.getUserEnrollments(user.id);
      const existingEnrollmentForTarget = enrollments.find(e => e.sprint_id === pendingSprint.id);

      setShowDiffSprintModal(false);
      if (existingEnrollmentForTarget && existingEnrollmentForTarget.status === 'completed') {
        await executeStartRerun(pendingSprint, pendingAction, existingEnrollmentForTarget);
      } else {
        await executeNewEnrollment(pendingSprint, pendingAction);
      }
    } catch (err) {
      console.error("[SprintConflictManager] Error switching active sprint:", err);
      toast.error("Failed to switch sprint. Please try again.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <>
      {/* MODAL 1: Same Sprint In-Progress Conflict Modal */}
      {showSameSprintModal && pendingSprint && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl p-8 sm:p-10 max-w-md w-full text-center relative overflow-hidden animate-slide-up border border-gray-100 dark:border-zinc-800">
            <div className="w-16 h-16 bg-[#0E7850]/10 rounded-full flex items-center justify-center mx-auto mb-5 text-[#0E7850]">
              <RotateCcw className="w-8 h-8" />
            </div>

            <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 text-[9px] font-black uppercase tracking-widest rounded-full">
              Sprint In Progress
            </span>

            <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight mt-3 mb-2">
              Sprint Already Active
            </h3>
            
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed mb-6">
              You already have an active session for <strong className="text-gray-900 dark:text-white font-black">{pendingSprint.title}</strong> in your account. You just completed Day 1 in preview.
            </p>

            <div className="space-y-3">
              {/* Option A: Continue from previous progress */}
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleContinuePreviousSameSprint}
                className="w-full py-4 px-5 bg-white dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 hover:border-[#0E7850] text-gray-800 dark:text-gray-200 rounded-2xl font-black text-xs transition-all active:scale-95 flex items-center justify-between group cursor-pointer shadow-xs"
              >
                <div className="text-left">
                  <p className="leading-snug">Continue Previous Progress</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">Keep your account progress; discard preview</p>
                </div>
                <Play className="w-4 h-4 text-gray-400 group-hover:text-[#0E7850] shrink-0" />
              </button>

              {/* Option B: Start fresh / Restart with new action */}
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleRestartWithNewActionSameSprint}
                className="w-full py-4 px-5 bg-[#0E7850] hover:bg-[#0b5d3e] text-white rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 flex items-center justify-between group cursor-pointer"
              >
                <div className="text-left">
                  <p className="leading-snug">Restart With New Day 1 Action</p>
                  <p className="text-[10px] text-emerald-100/80 font-medium mt-0.5">Start fresh with your preview answer</p>
                </div>
                {isProcessingAction ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin shrink-0" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-white shrink-0 group-hover:translate-x-0.5 transition-transform" />
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: Different Sprints Active Conflict Modal (Multi-Sprint Conflict Pop-Up) */}
      {showDiffSprintModal && pendingSprint && activeOngoingSprint && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl p-8 sm:p-10 max-w-md w-full text-center relative overflow-hidden animate-slide-up border border-gray-100 dark:border-zinc-800">
            <div className="w-16 h-16 bg-[#0E7850]/10 rounded-full flex items-center justify-center mx-auto mb-5 text-[#0E7850]">
              <Layers className="w-8 h-8" />
            </div>

            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 text-[9px] font-black uppercase tracking-widest rounded-full">
              Active Sprint Conflict
            </span>

            <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight mt-3 mb-2">
              Choose Your Active Sprint
            </h3>
            
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed mb-6">
              You currently have <strong className="text-gray-900 dark:text-white font-black">{activeOngoingSprint.title}</strong> active. You also completed Day 1 preview for <strong className="text-[#0E7850] font-black">{pendingSprint.title}</strong>. Which would you like to continue?
            </p>

            <div className="space-y-3">
              {/* Option A: Keep Previous Active Sprint */}
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleKeepPreviousDifferentSprint}
                className="w-full py-4 px-5 bg-white dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 hover:border-[#0E7850] text-gray-800 dark:text-gray-200 rounded-2xl font-black text-xs transition-all active:scale-95 flex items-center justify-between group cursor-pointer shadow-xs"
              >
                <div className="text-left min-w-0 pr-2">
                  <p className="leading-snug truncate">Continue: {activeOngoingSprint.title}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">Resume your existing active sprint</p>
                </div>
                <Play className="w-4 h-4 text-gray-400 group-hover:text-[#0E7850] shrink-0" />
              </button>

              {/* Option B: Switch to New Preview Sprint */}
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleSwitchToNewDifferentSprint}
                className="w-full py-4 px-5 bg-[#0E7850] hover:bg-[#0b5d3e] text-white rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 flex items-center justify-between group cursor-pointer"
              >
                <div className="text-left min-w-0 pr-2">
                  <p className="leading-snug truncate">Switch To: {pendingSprint.title}</p>
                  <p className="text-[10px] text-emerald-100/80 font-medium mt-0.5">Activate new sprint with Day 1 action</p>
                </div>
                {isProcessingAction ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin shrink-0" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-white shrink-0 group-hover:translate-x-0.5 transition-transform" />
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default SprintConflictManager;
