import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, SlidersHorizontal, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { sprintService } from '../services/sprintService';
import { ParticipantSprint, Sprint, UserRole } from '../types';
import { SwitchModeModal, hasMultipleModes } from './SwitchModeModal';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

export const FloatingSprintBar: React.FC = () => {
  const { user, activeRole, switchRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeSprintEnrollment, setActiveSprintEnrollment] = useState<ParticipantSprint | null>(null);
  const [activeChallengeEnrollment, setActiveChallengeEnrollment] = useState<{ enrollment: ParticipantSprint; sprint: Sprint } | null>(null);
  const [hasLoadedEnrollments, setHasLoadedEnrollments] = useState(false);
  const [isSwitchModeOpen, setIsSwitchModeOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setActiveSprintEnrollment(null);
      setActiveChallengeEnrollment(null);
      setHasLoadedEnrollments(false);
      return;
    }

    const unsubscribe = sprintService.subscribeToUserEnrollments(user.id, async (enrollments) => {
      // Find active ongoing enrollments
      const activeList = enrollments.filter((e) => {
        if (e.status !== 'active') return false;
        if (e.completed_at) return false;
        const allDaysCompleted = Array.isArray(e.progress) && e.progress.length > 0 && e.progress.every((p) => p.completed);
        return !allDaysCompleted;
      });

      let foundSprint: ParticipantSprint | null = null;
      let foundChallenge: { enrollment: ParticipantSprint; sprint: Sprint } | null = null;

      for (const enrol of activeList) {
        try {
          const sprintData = await sprintService.getSprintById(enrol.sprint_id);
          if (sprintData) {
            const isChall = sprintData.contentType === 'challenge' || Boolean(sprintData.challengeData) || Boolean(sprintData.challengeCategory) || Boolean((sprintData as any).challengeType);
            if (isChall && !foundChallenge) {
              foundChallenge = { enrollment: enrol, sprint: sprintData };
            } else if (!isChall && !foundSprint) {
              foundSprint = enrol;
            }
          } else if (!foundSprint) {
            foundSprint = enrol;
          }
        } catch (e) {
          if (!foundSprint) foundSprint = enrol;
        }
      }

      // Fallback: if only one active and not challenge identified, treat as sprint
      if (!foundSprint && activeList.length > 0 && !foundChallenge) {
        foundSprint = activeList[0];
      }

      setActiveSprintEnrollment(foundSprint);
      setActiveChallengeEnrollment(foundChallenge);
      setHasLoadedEnrollments(true);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Page exclusion logic
  const isExcluded = () => {
    if (!user) return true;

    // Only show for participant / partner roles or on participant-facing routes
    if (activeRole === UserRole.COACH && location.pathname.startsWith('/coach')) return true;
    if (activeRole === UserRole.ADMIN && location.pathname.startsWith('/admin')) return true;

    const path = location.pathname;

    // 1. Sprint view & previews (user is already working in sprint)
    if (
      path.startsWith('/participant/sprint') ||
      path.startsWith('/sprint') ||
      path.startsWith('/coach/sprint')
    ) {
      return true;
    }

    // 2. Next sprint page: hide only if there is NO active sprint/challenge to continue
    if (
      (path.startsWith('/participant/next-sprint') || path.startsWith('/participant/recommendation') || path === '/dashboard') &&
      !activeSprintEnrollment && !activeChallengeEnrollment
    ) {
      return true;
    }

    // 3. Move success page
    if (path.startsWith('/participant/day-success')) {
      return true;
    }

    // 4. Sprint completion / payment success pages
    if (
      path.startsWith('/impact/success') ||
      path.startsWith('/participant/sprint-success') ||
      path.startsWith('/payment-success')
    ) {
      return true;
    }

    // 5. Auth & Onboarding routes
    if (
      path === '/login' ||
      path === '/signup' ||
      path === '/verify-email' ||
      path === '/welcome' ||
      path.startsWith('/onboarding') ||
      path.startsWith('/join/') ||
      path === '/partner/apply'
    ) {
      return true;
    }

    return false;
  };

  if (isExcluded() || !hasLoadedEnrollments) {
    return null;
  }

  const isCurrentSprintActive = Boolean(activeSprintEnrollment);
  const isCurrentlyOnSprintView = activeSprintEnrollment && location.pathname === `/participant/sprint/${activeSprintEnrollment.id}`;

  const challengeDay = activeChallengeEnrollment ? (
    activeChallengeEnrollment.enrollment.progress?.find(p => !p.completed)?.day || 
    (activeChallengeEnrollment.enrollment.progress?.filter(p => p.completed).length + 1) || 1
  ) : 1;

  const handleSprintClick = () => {
    triggerHaptic(hapticPatterns.light);
    if (isCurrentSprintActive && activeSprintEnrollment) {
      if (isCurrentlyOnSprintView) {
        // Already on the sprint view, smoothly scroll up to the current action step
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        navigate(`/participant/sprint/${activeSprintEnrollment.id}`);
      }
    } else {
      navigate('/participant/next-sprint');
    }
  };

  const handleChallengeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(hapticPatterns.medium);
    if (activeChallengeEnrollment) {
      navigate(`/challenge/${activeChallengeEnrollment.sprint.id}`, {
        state: {
          sprint: activeChallengeEnrollment.sprint,
          enrollment: activeChallengeEnrollment.enrollment,
          viewMode: 'active',
          continueChallenge: true
        }
      });
    } else {
      navigate('/challenge');
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.94 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)] select-none pointer-events-auto flex items-center gap-2"
        >
          {/* Active Challenge Cup Button */}
          {activeChallengeEnrollment && (
            <button
              type="button"
              onClick={handleChallengeClick}
              className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gray-950/95 hover:bg-black text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] border border-purple-500/40 backdrop-blur-md transition-all duration-200 active:scale-95 cursor-pointer shrink-0 group"
              title={`Active Challenge: ${activeChallengeEnrollment.sprint.title} • Challenge View`}
              aria-label="Active Challenge in Challenge View"
            >
              <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Trophy className="w-4 h-4 text-purple-300 drop-shadow-sm" />
              </div>
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-purple-600 text-white text-[9px] font-black flex items-center justify-center shadow-md border border-white/20">
                {challengeDay}
              </span>
            </button>
          )}

          {/* Continue Your Rise / Keep Building Main Button */}
          <button
            type="button"
            onClick={handleSprintClick}
            className="group flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 bg-gray-950/95 hover:bg-black text-white rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.25)] border border-white/15 backdrop-blur-md transition-all duration-200 active:scale-95 cursor-pointer shrink-0"
            title="Continue Your Rise | Keep Building"
          >
            <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0 animate-pulse shadow-[0_0_8px_#10b981]" />

            <div className="flex items-center text-xs sm:text-sm tracking-tight whitespace-nowrap overflow-hidden">
              <span className="font-bold text-white group-hover:text-emerald-300 transition-colors">
                Continue Your Rise
              </span>
              <span className="text-gray-500 font-light mx-2 text-xs sm:text-sm">
                |
              </span>
              <span className="font-light text-gray-300">
                Keep Building
              </span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-0.5" />
          </button>

          {hasMultipleModes(user) && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(hapticPatterns.light);
                setIsSwitchModeOpen(true);
              }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0E7850] hover:bg-[#0b5d3e] text-white flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.25)] border border-white/15 backdrop-blur-md transition-all duration-200 active:scale-95 shrink-0"
              aria-label="Switch Mode"
              title="Switch Mode"
            >
              <SlidersHorizontal className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
        </motion.div>
      </AnimatePresence>

      {user && hasMultipleModes(user) && (
        <SwitchModeModal
          isOpen={isSwitchModeOpen}
          onClose={() => setIsSwitchModeOpen(false)}
          user={user}
          activeRole={activeRole}
          onSelectMode={(role, route) => {
            switchRole(role);
            navigate(route);
          }}
        />
      )}
    </>
  );
};

export default FloatingSprintBar;

