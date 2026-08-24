import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { sprintService } from '../services/sprintService';
import { ParticipantSprint, UserRole } from '../types';

export const FloatingSprintBar: React.FC = () => {
  const { user, activeRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeEnrollment, setActiveEnrollment] = useState<ParticipantSprint | null>(null);
  const [hasLoadedEnrollments, setHasLoadedEnrollments] = useState(false);

  useEffect(() => {
    if (!user) {
      setActiveEnrollment(null);
      setHasLoadedEnrollments(false);
      return;
    }

    const unsubscribe = sprintService.subscribeToUserEnrollments(user.id, (enrollments) => {
      // Find active ongoing enrollment
      const active = enrollments.find((e) => {
        if (e.status !== 'active') return false;
        if (e.completed_at) return false;
        const allDaysCompleted = Array.isArray(e.progress) && e.progress.length > 0 && e.progress.every((p) => p.completed);
        return !allDaysCompleted;
      });

      setActiveEnrollment(active || null);
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

    // 1. Next sprint recommendation pages
    if (
      path.startsWith('/participant/next-sprint') ||
      path.startsWith('/participant/recommendation') ||
      path === '/dashboard'
    ) {
      return true;
    }

    // 2. Move success page
    if (path.startsWith('/participant/day-success')) {
      return true;
    }

    // 3. Sprint completion / payment success pages
    if (
      path.startsWith('/impact/success') ||
      path.startsWith('/participant/sprint-success') ||
      path.startsWith('/payment-success')
    ) {
      return true;
    }

    // 4. Auth & Onboarding routes
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

  const isCurrentSprintActive = Boolean(activeEnrollment);
  const isCurrentlyOnSprintView = activeEnrollment && location.pathname === `/participant/sprint/${activeEnrollment.id}`;

  const primaryText = isCurrentSprintActive
    ? 'Continue your current sprint'
    : 'Start your next sprint';

  const handleClick = () => {
    if (isCurrentSprintActive && activeEnrollment) {
      if (isCurrentlyOnSprintView) {
        // Already on the sprint view, smoothly scroll up to the current action step
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        navigate(`/participant/sprint/${activeEnrollment.id}`);
      }
    } else {
      navigate('/participant/next-sprint');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.94 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)] select-none pointer-events-auto"
      >
        <button
          type="button"
          onClick={handleClick}
          className="group flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 bg-gray-950/95 hover:bg-black text-white rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.25)] border border-white/15 backdrop-blur-md transition-all duration-200 active:scale-95 cursor-pointer"
          title={primaryText}
        >
          <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0 animate-pulse shadow-[0_0_8px_#10b981]" />

          <div className="flex items-center text-xs sm:text-sm tracking-tight whitespace-nowrap overflow-hidden">
            <span className="font-bold text-white group-hover:text-emerald-300 transition-colors">
              {primaryText}
            </span>
            <span className="text-gray-500 font-light mx-2 text-xs sm:text-sm">
              |
            </span>
            <span className="font-light text-gray-300">
              Keep Rising
            </span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-0.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingSprintBar;
