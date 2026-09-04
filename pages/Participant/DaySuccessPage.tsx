import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { sprintService } from '../../services/sprintService';
import { shineService } from '../../services/shineService';
import { userService } from '../../services/userService';
import { MILESTONES, computeMilestoneStats, calculateMilestoneStatValue } from '../../services/milestoneConstants';
import { toast } from 'sonner';
import { Participant } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Clock, ArrowRight, Sparkles, Bell, Check, X } from 'lucide-react';
import { triggerHaptic, hapticPatterns } from '../../utils/haptics';
import { pushNotificationService } from '../../services/pushNotificationService';
import { formatInterpolatedText } from '../../src/utils/stepPlaceholderUtils';

const DaySuccessPage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/EmXW0yjwdVf9RGgdvyMXdJ?s=cl&p=a&mlu=4';

  // Popup modal state for returning from WhatsApp link
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Retrieve parameters from state or use sensible fallbacks
  const completedDay = location.state?.day || 1;
  const passedCoins = location.state?.coinsUnlocked;
  const unlockedMilestone = location.state?.unlockedMilestone || location.state?.milestoneUnlocked;

  // Only show unlocked bonus / reward icon card if a milestone or coins are explicitly unlocked (> 0)
  // Day 1 unlocks the "First Step" milestone (+10 coins) by default if not set to 0. Day 2+ defaults to 0.
  const coinsUnlocked = passedCoins !== undefined 
    ? Number(passedCoins) 
    : (completedDay === 1 ? 10 : 0);

  const isMilestoneUnlocked = Boolean(unlockedMilestone) || (coinsUnlocked > 0 && (completedDay === 1 || Boolean(passedCoins && passedCoins > 0)));
  const initialBridgeNote = location.state?.bridgeNote;

  // Listen for window focus / visibility returning after clicking WhatsApp link
  useEffect(() => {
    const checkReturnFromWhatsApp = () => {
      const clicked = sessionStorage.getItem('vectorise_wa_clicked') === 'true';
      if (clicked) {
        setShowWhatsAppModal(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkReturnFromWhatsApp();
      }
    };

    const handleWindowFocus = () => {
      checkReturnFromWhatsApp();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (user && updateProfile) {
      updateProfile({
        whatsappLinkClicked: true,
        whatsappLinkClickedAt: new Date().toISOString()
      }).catch(err => console.error("Failed to record whatsapp link click:", err));
    }

    sessionStorage.setItem('vectorise_wa_clicked', 'true');
    window.open(WHATSAPP_GROUP_URL, '_blank', 'noopener,noreferrer');
  };

  const [resolvedEnrollmentId, setResolvedEnrollmentId] = useState<string | null>(location.state?.enrollmentId || null);

  useEffect(() => {
    if (!resolvedEnrollmentId && user) {
      const targetSprintId = location.state?.sprintId || location.state?.sprint?.id;
      sprintService.getUserEnrollments(user.id).then(enrollments => {
        const found = targetSprintId 
          ? enrollments.find(e => e.sprint_id === targetSprintId)
          : enrollments[0];
        if (found) {
          setResolvedEnrollmentId(found.id);
        }
      }).catch(err => console.error("Error resolving enrollment in DaySuccessPage:", err));
    }
  }, [resolvedEnrollmentId, user, location.state]);

  const handleExit = () => {
    const isPreview = location.state?.isPreview || Boolean(location.state?.returnToPreviewUrl);
    const sprintId = location.state?.sprintId || location.state?.sprint?.id;
    const returnToPreviewUrl = location.state?.returnToPreviewUrl;
    const enrollmentId = location.state?.enrollmentId || resolvedEnrollmentId;
    const nextDay = completedDay + 1;

    if (isPreview) {
      if (sprintId) {
        try {
          sessionStorage.removeItem(`vectorise_preview_enrollment_${sprintId}`);
        } catch (e) {}
      }
      if (returnToPreviewUrl) {
        navigate(returnToPreviewUrl, { replace: true, state: { resetPreview: true } });
      } else if (sprintId) {
        navigate(`/coach/sprint/preview/${sprintId}`, { replace: true, state: { resetPreview: true } });
      } else {
        navigate(-1);
      }
    } else if (enrollmentId) {
      navigate(`/participant/sprint/${enrollmentId}?day=${nextDay}`, { 
        replace: true,
        state: { targetDay: nextDay }
      });
    } else if (user) {
      navigate('/participant-dashboard', { replace: true });
    } else {
      navigate('/');
    }
  };

  const handleCloseModal = () => {
    setShowWhatsAppModal(false);
    sessionStorage.removeItem('vectorise_wa_clicked');
    handleExit();
  };

  const handleConfirmJoined = async () => {
    if (user && updateProfile) {
      try {
        await updateProfile({
          whatsappJoinedConfirmed: true,
          whatsappJoinedConfirmedAt: new Date().toISOString(),
          whatsappLinkClicked: true,
          whatsappLinkClickedAt: (user as any)?.whatsappLinkClickedAt || new Date().toISOString()
        });
      } catch (err) {
        console.error("Failed to record whatsapp joined confirmation:", err);
      }
    }
    sessionStorage.removeItem('vectorise_wa_clicked');
    setShowWhatsAppModal(false);
    triggerHaptic(hapticPatterns.success);
    handleExit();
  };

  const handleTryAgain = () => {
    window.open(WHATSAPP_GROUP_URL, '_blank', 'noopener,noreferrer');
    setShowWhatsAppModal(false);
  };

  const [liveBridgeNote, setLiveBridgeNote] = useState<string | null>(initialBridgeNote || null);

  // Subscribe to real-time updates for the sprint's bridge note for the completed day
  useEffect(() => {
    const targetSprintId = location.state?.sprintId || (user as any)?.enrolledSprintIds?.[0] || localStorage.getItem('vectorise_last_sprint');
    if (!targetSprintId) return;

    const unsubscribe = sprintService.subscribeToSprint(targetSprintId, (sprint) => {
      if (sprint && Array.isArray(sprint.dailyContent)) {
        const dContent = sprint.dailyContent.find((dc: any) => dc.day === completedDay);
        if (dContent && typeof dContent.bridgeNote === 'string' && dContent.bridgeNote.trim()) {
          setLiveBridgeNote(dContent.bridgeNote);
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [location.state?.sprintId, completedDay, user]);

  const [unclaimedMilestones, setUnclaimedMilestones] = useState<any[]>([]);
  const [isClaimingIndex, setIsClaimingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const loadMilestones = async () => {
      try {
        const enrollments = await sprintService.getUserEnrollments(user.id);
        const reflections = await shineService.getPostsByUserId(user.id).catch(() => []);
        const referralsCount = (user as any)?.referralsCount || 0;

        const stats = computeMilestoneStats(enrollments, reflections, referralsCount);
        const claimed = (user as Participant).claimedMilestoneIds || [];

        const unclaimed = MILESTONES.filter(m => {
          const val = calculateMilestoneStatValue(m.id, stats);
          return val >= m.targetValue && !claimed.includes(m.id);
        });

        if (unclaimed.length === 0 && coinsUnlocked > 0) {
          const isFirstLeapFallback = completedDay === 1;
          const fallbackId = unlockedMilestone ? String(unlockedMilestone) : (isFirstLeapFallback ? 'first_leap' : 's2');
          
          if (!claimed.includes(fallbackId)) {
            unclaimed.push({
              id: fallbackId,
              title: unlockedMilestone || (isFirstLeapFallback ? 'First Leap' : 'First Sprint'),
              description: unlockedMilestone || (isFirstLeapFallback ? 'Completed the first move of your first sprint.' : 'Completed your first sprint on Vectorise.'),
              points: coinsUnlocked,
              icon: isFirstLeapFallback ? '🚀' : '🏁',
              targetValue: 1,
              category: 'coreProgress'
            });
          }
        }

        setUnclaimedMilestones(unclaimed);
      } catch (err) {
        console.error("Error loading milestones:", err);
        if (coinsUnlocked > 0) {
          const isFirstLeapFallback = completedDay === 1;
          const claimed = (user as Participant).claimedMilestoneIds || [];
          const fallbackId = isFirstLeapFallback ? 'first_leap' : 's2';
          
          if (!claimed.includes(fallbackId)) {
            setUnclaimedMilestones([{
              id: fallbackId,
              title: isFirstLeapFallback ? 'First Leap' : 'First Sprint',
              description: isFirstLeapFallback ? 'Completed the first move of your first sprint.' : 'Completed your first sprint on Vectorise.',
              points: coinsUnlocked,
              icon: isFirstLeapFallback ? '🚀' : '🏁',
              targetValue: 1,
              category: 'coreProgress'
            }]);
          }
        }
      }
    };
    loadMilestones();
  }, [user, coinsUnlocked, unlockedMilestone]);

  const handleClaimMilestone = async (milestone: any, index: number) => {
    if (!user || isClaimingIndex !== null) return;
    setIsClaimingIndex(index);
    triggerHaptic(hapticPatterns.medium);
    try {
      await userService.claimMilestone(user.id, milestone.id, milestone.points);
      toast.success(`Claimed! +${milestone.points} Growth Coins added to your wallet.`);
      setUnclaimedMilestones(prev => prev.filter((_, idx) => idx !== index));
    } catch (err) {
      console.error("Failed to claim milestone:", err);
      toast.error("Failed to claim milestone. Please try again.");
    } finally {
      setIsClaimingIndex(null);
    }
  };

  const unclaimedText = unclaimedMilestones.length > 0 
    ? ` Unlocked Reward: ${unclaimedMilestones[0].description || unclaimedMilestones[0].title} (+${unclaimedMilestones[0].points} Growth Coins).` 
    : '';

  const sprintDuration = location.state?.sprint?.duration || 7;
  const isSprintLastDay = completedDay >= sprintDuration;

  const rawBridgeNote = isSprintLastDay ? '' : (liveBridgeNote || initialBridgeNote || '');
  const dayContent = location.state?.sprint?.dailyContent?.find((d: any) => Number(d?.day) === completedDay) || location.state?.dayContent;

  const formattedBridgeNote = rawBridgeNote
    ? formatInterpolatedText(
        rawBridgeNote,
        dayContent,
        location.state?.taskInputs,
        location.state?.sprint?.dailyContent || location.state?.allDaysContent,
        location.state?.enrollment?.progress || location.state?.allDaysInputs
      )
    : '';

  const displayBridgeNote = formattedBridgeNote
    ? formattedBridgeNote
    : (isSprintLastDay ? '' : '');

  // Real-time local midnight countdown timer
  const [countdown, setCountdown] = useState('00:00:00');

  // Push notification subscription states
  const [isSubscribed, setIsSubscribed] = useState<boolean>(true); // default true to prevent flicker
  const [isSubscribedChecked, setIsSubscribedChecked] = useState(false);
  const [isSetForTomorrow, setIsSetForTomorrow] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    // Check if user is already subscribed to push notifications
    const checkPushSubscription = async () => {
      try {
        const status = await pushNotificationService.getPushStatus();
        const hasFcmToken = !!((user as any)?.fcmToken || (user as any)?.pushSubscription);
        const subscribed = status.subscribed && hasFcmToken;
        setIsSubscribed(subscribed);
      } catch (err) {
        console.error('[DaySuccessPage] Error checking push status:', err);
      } finally {
        setIsSubscribedChecked(true);
      }
    };

    checkPushSubscription();
  }, [user]);

  useEffect(() => {
    // Play satisfying success haptic feedback on entry
    triggerHaptic(hapticPatterns.success);

    // Play completion sound on entry
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3");
      audio.play().catch((e) => console.error("Sound playback deferred/failed:", e));
    } catch (e) {
      console.error("Audio initialization failed:", e);
    }
  }, []);

  const handleStepUp = () => {
    triggerHaptic(hapticPatterns.light);
    const isPreview = location.state?.isPreview || Boolean(location.state?.returnToPreviewUrl);
    const sprintId = location.state?.sprintId || location.state?.sprint?.id;
    const returnToPreviewUrl = location.state?.returnToPreviewUrl;
    const enrollmentId = location.state?.enrollmentId || resolvedEnrollmentId;
    const nextDay = completedDay + 1;

    if (isPreview) {
      const targetUrl = returnToPreviewUrl || `/coach/sprint/preview/${sprintId}`;
      navigate(targetUrl, {
        replace: true,
        state: {
          sprint: location.state?.sprint,
          enrollment: location.state?.enrollment,
          targetDay: nextDay,
          isPreview: true
        }
      });
    } else if (enrollmentId) {
      navigate(`/participant/sprint/${enrollmentId}?day=${nextDay}`, { 
        replace: true,
        state: {
          targetDay: nextDay
        }
      });
    } else if (user) {
      sprintService.getUserEnrollments(user.id).then(enrollments => {
        const found = sprintId ? enrollments.find(e => e.sprint_id === sprintId) : enrollments[0];
        if (found) {
          navigate(`/participant/sprint/${found.id}?day=${nextDay}`, { 
            replace: true,
            state: {
              targetDay: nextDay
            }
          });
        } else {
          navigate('/participant-dashboard', { replace: true });
        }
      }).catch(() => {
        navigate('/participant-dashboard', { replace: true });
      });
    } else {
      handleExit();
    }
  };

  const handleRemindMeTomorrow = async () => {
    triggerHaptic(hapticPatterns.medium);
    setIsSubscribing(true);

    try {
      if (user?.id) {
        await pushNotificationService.subscribeUser(user.id);
      }
    } catch (err) {
      console.log('[DaySuccessPage] User permission or push subscription attempt result:', err);
    } finally {
      setIsSubscribing(false);
      setIsSetForTomorrow(true);
      triggerHaptic(hapticPatterns.success);
    }
  };

  return (
    <div className="min-h-[100dvh] w-screen bg-[#FDFDFD] flex flex-col justify-between p-6 md:p-12 overflow-x-hidden relative">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[50%] bg-[#0E7850]/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-[#0E7850]/5 rounded-full blur-[120px]" />
      </div>

      {/* Top Header Bar with Day complete badge */}
      <div className="relative z-10 w-full max-w-md mx-auto flex justify-between items-center pt-2 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0E7850]/10 border border-[#0E7850]/20 rounded-full text-[#0E7850]">
          <Sparkles className="w-3.5 h-3.5 text-[#0E7850] animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider">
            Move {completedDay} is complete!
          </span>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="relative z-10 max-w-md w-full mx-auto flex-1 flex flex-col justify-center items-start py-4">
        
        {/* Bridge note headline */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="w-full text-left my-auto py-4"
        >
          {displayBridgeNote ? (
            <p className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
              {displayBridgeNote}
            </p>
          ) : (
            <p className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
              Great momentum today. Keep building your daily habit!
            </p>
          )}

          {/* Remind me tomorrow button for unsubscribed users (Day 2 onwards) */}
          {completedDay >= 2 && !isSubscribed && isSubscribedChecked && (
            <div className="mt-6">
              <AnimatePresence mode="wait">
                {!isSetForTomorrow ? (
                  <motion.button
                    key="remind-btn"
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRemindMeTomorrow}
                    disabled={isSubscribing}
                    className="inline-flex items-center gap-2.5 px-5 py-3 bg-[#0E7850]/10 hover:bg-[#0E7850]/15 border border-[#0E7850]/20 text-[#0E7850] rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <Bell className="w-4 h-4 text-[#0E7850]" />
                    <span>{isSubscribing ? 'Setting reminder...' : 'Remind me for next move'}</span>
                  </motion.button>
                ) : (
                  <motion.div
                    key="success-badge"
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200/80 text-emerald-800 rounded-2xl text-xs sm:text-sm font-black tracking-wide shadow-xs"
                  >
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                    <span>You’re set for next move</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Simple WhatsApp Support Group CTA on Day 1 */}
          {completedDay === 1 && !user?.whatsappJoinedConfirmed && (
            <div className="mt-5 pt-4 border-t border-gray-200/80 w-full text-left flex items-center justify-between gap-3 sm:gap-4">
              <p className="text-sm sm:text-base text-gray-800 font-semibold leading-snug flex-1">
                Join the WhatsApp support group to get reminders and stay on track.
              </p>
              <a
                href="https://chat.whatsapp.com/EmXW0yjwdVf9RGgdvyMXdJ?s=cl&p=a&mlu=4"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppClick}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0E7850] hover:bg-[#0b6342] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
              >
                <span>Join Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </motion.div>

        {/* Unlocked Reward Card (Full Width) */}
        <div className="w-full mb-6">
          <AnimatePresence mode="popLayout">
            {unclaimedMilestones.length > 0 && (
              <motion.div
                key={unclaimedMilestones[0].id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, x: 50 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="w-full bg-[#FFFBEB] border border-amber-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 relative overflow-hidden"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 text-lg">
                    {unclaimedMilestones[0].icon || '🏆'}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-[10px] sm:text-xs font-black text-amber-800 uppercase tracking-widest leading-none">
                      Milestone Unlocked
                    </p>
                    <p className="text-xs sm:text-sm font-black text-amber-950 tracking-tight mt-1 truncate">
                      {unclaimedMilestones[0].description || unclaimedMilestones[0].title}
                    </p>
                    <p className="text-[10px] sm:text-xs font-bold text-amber-700 tracking-tight mt-0.5">
                      Reward: +{unclaimedMilestones[0].points} Growth Coins
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleClaimMilestone(unclaimedMilestones[0], 0)}
                  disabled={isClaimingIndex === 0}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isClaimingIndex === 0 ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Claim</span>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>

      {/* CTA Button Footer */}
      <footer className="relative z-10 w-full max-w-md mx-auto py-2">
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          onClick={handleStepUp}
          className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-3xl font-black uppercase tracking-[0.15em] text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Continue to Next Move</span>
          <ArrowRight className="w-4 h-4 text-white" />
        </motion.button>
      </footer>

      {/* WhatsApp Joined Confirmation Modal */}
      <AnimatePresence>
        {showWhatsAppModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="relative z-[101] w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 text-center overflow-hidden"
            >
              {/* Close Button top right */}
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 w-8 h-8 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon */}
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl mx-auto mb-4 flex items-center justify-center text-[#0E7850] shadow-xs">
                <Sparkles className="w-6 h-6" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-black text-gray-900 tracking-tight leading-snug mb-2">
                Joined the WhatsApp group?
              </h3>

              <p className="text-xs text-gray-500 font-medium mb-6">
                Confirming helps us make sure you receive daily reminders and stay on track.
              </p>

              {/* Actions */}
              <div className="space-y-2.5">
                <button
                  onClick={handleConfirmJoined}
                  className="w-full py-3.5 bg-[#0E7850] hover:bg-[#0b6342] text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Yes, I’ve joined
                </button>

                <button
                  onClick={handleTryAgain}
                  className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DaySuccessPage;
