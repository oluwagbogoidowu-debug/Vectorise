import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { sprintAnalyticsService } from '../../services/sprintAnalyticsService';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Sparkles, Bell, Check, Award, Tag, Mail } from 'lucide-react';
import { triggerHaptic, hapticPatterns } from '../../utils/haptics';
import { pushNotificationService } from '../../services/pushNotificationService';
import { formatInterpolatedText } from '../../src/utils/stepPlaceholderUtils';

const DaySuccessPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve parameters from state or use sensible fallbacks
  const completedDay = location.state?.day || 1;
  const initialBridgeNote = location.state?.bridgeNote;
  const initialCompletionNote = location.state?.completionNote || location.state?.dayContent?.completionNote;

  const [resolvedEnrollmentId, setResolvedEnrollmentId] = useState<string | null>(location.state?.enrollmentId || null);

  useEffect(() => {
    const sId = location.state?.sprintId || location.state?.sprint?.id;
    if (completedDay === 1 && sId) {
      sprintAnalyticsService.trackMove1Success(sId, user?.id);
    }
  }, [completedDay, location.state?.sprintId, location.state?.sprint?.id, user?.id]);

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

  const [liveBridgeNote, setLiveBridgeNote] = useState<string | null>(initialBridgeNote || null);
  const [liveCompletionNote, setLiveCompletionNote] = useState<string | null>(initialCompletionNote || null);

  // Subscribe to real-time updates for the sprint's bridge note and completion note for the completed day
  useEffect(() => {
    const targetSprintId = location.state?.sprintId || (user as any)?.enrolledSprintIds?.[0] || localStorage.getItem('vectorise_last_sprint');
    if (!targetSprintId) return;

    const unsubscribe = sprintService.subscribeToSprint(targetSprintId, (sprint) => {
      if (sprint && Array.isArray(sprint.dailyContent)) {
        const dContent = sprint.dailyContent.find((dc: any) => dc.day === completedDay);
        if (dContent) {
          if (typeof dContent.bridgeNote === 'string' && dContent.bridgeNote.trim()) {
            setLiveBridgeNote(dContent.bridgeNote);
          }
          if (typeof dContent.completionNote === 'string' && dContent.completionNote.trim()) {
            setLiveCompletionNote(dContent.completionNote);
          }
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [location.state?.sprintId, completedDay, user]);

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

  const rawCompletionNote = isSprintLastDay ? (liveCompletionNote || initialCompletionNote || '') : '';
  const formattedCompletionNote = rawCompletionNote
    ? formatInterpolatedText(
        rawCompletionNote,
        dayContent,
        location.state?.taskInputs,
        location.state?.sprint?.dailyContent || location.state?.allDaysContent,
        location.state?.enrollment?.progress || location.state?.allDaysInputs
      )
    : '';

  const displayCompletionNote = formattedCompletionNote;

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

  const sprint = location.state?.sprint;
  const isFlowSprint = sprint?.previewMode === 'flow';

  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [emailError, setEmailError] = useState('');

  // Automatically save guest email in Firestore when entered to make it the primary identifier
  useEffect(() => {
    if (!user && emailInput && emailInput.includes('@') && emailInput.length > 5) {
      const guestUserId = localStorage.getItem('vectorise_guest_user_id');
      const sId = location.state?.sprintId || location.state?.sprint?.id;
      if (guestUserId && sId) {
        localStorage.setItem('guest_email', emailInput);
        sprintService.updateGuestEmail(guestUserId, emailInput, sId).catch(err => {
          console.warn("[DaySuccessPage] Failed to save guest email:", err);
        });
      }
    }
  }, [emailInput, user, location.state]);

  const getCtaUrlWithEmail = (baseUrl: string, email: string) => {
    if (!baseUrl) return '';
    if (!email) return baseUrl;
    try {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}email=${encodeURIComponent(email)}&prefilled_email=${encodeURIComponent(email)}&customer_email=${encodeURIComponent(email)}`;
    } catch (e) {
      return baseUrl;
    }
  };

  const handleCtaClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (!emailInput || !emailInput.includes('@')) {
      e.preventDefault();
      setEmailError('Please enter a valid email address to track your payment.');
      return;
    }
    setEmailError('');
  };

  if (isFlowSprint && isSprintLastDay) {
    return (
      <div className="min-h-[100dvh] w-screen bg-[#FDFDFD] flex flex-col justify-between p-6 md:p-12 overflow-x-hidden relative text-gray-900 font-sans">
        {/* Background Ambience */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[50%] bg-[#0E7850]/5 rounded-full blur-[120px]" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-[#0E7850]/5 rounded-full blur-[120px]" />
        </div>

        {/* Top Header Bar */}
        <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col items-center pt-4 pb-2 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-amber-800">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-black uppercase tracking-wider">
              Sprint Fully Completed!
            </span>
          </div>
        </div>

        {/* Main Content Landing Page */}
        <main className="relative z-10 max-w-lg w-full mx-auto flex-1 flex flex-col justify-center items-center py-8 text-center space-y-6">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="space-y-4"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight uppercase">
              {sprint?.offerTitle || "Upgrade to the Premium Masterclass"}
            </h1>
            
            {sprint?.offerPrice ? (
              <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0E7850]/10 border border-[#0E7850]/20 rounded-full text-[#0E7850] text-sm font-black uppercase tracking-wider font-mono">
                <Tag className="w-4 h-4 text-[#0E7850]" />
                <span>Special Price: ${sprint?.offerPrice}</span>
              </div>
            ) : null}

            <p className="text-base text-gray-500 leading-relaxed pt-2 max-w-md mx-auto">
              {sprint?.offerDescription || "Unlock permanent access to all your results, download exclusive companion resources, and accelerate your development with personalized feedback from the coach."}
            </p>

            {displayCompletionNote ? (
              <p className="text-xs sm:text-sm md:text-base font-black text-gray-900 tracking-tight leading-tight py-4 max-w-md mx-auto italic">
                "{displayCompletionNote}"
              </p>
            ) : null}
          </motion.div>

          {/* Core Trust Pillars */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-full bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 text-left space-y-3 max-w-md"
          >
            <div className="flex items-start gap-3">
              <span className="text-[#0E7850] font-bold text-lg select-none">✓</span>
              <p className="text-xs font-semibold text-gray-600">Full lifetime access to this sprint and future iterations.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#0E7850] font-bold text-lg select-none">✓</span>
              <p className="text-xs font-semibold text-gray-600">Verified certification of completion to showcase your achievement.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#0E7850] font-bold text-lg select-none">✓</span>
              <p className="text-xs font-semibold text-gray-600">Downloadable interactive worksheets and summary notes.</p>
            </div>
          </motion.div>

          {/* Email Tracking Input Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="w-full max-w-md bg-gray-50/80 p-6 rounded-[2rem] border border-gray-100 text-left space-y-3"
          >
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
              Your Payment Tracking Email
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail className="w-4 h-4 text-gray-400" />
              </span>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (emailError) setEmailError('');
                }}
                placeholder="name@example.com"
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 focus:border-[#0E7850] focus:ring-1 focus:ring-[#0E7850] rounded-2xl text-xs font-semibold outline-none transition-all shadow-sm text-gray-900"
              />
            </div>
            {emailError ? (
              <p className="text-[10px] font-bold text-red-500 tracking-wide uppercase">
                {emailError}
              </p>
            ) : (
              <p className="text-[9px] text-gray-400 font-medium leading-normal">
                Enter the email you intend to use at checkout. The coach uses this to automatically track and verify your payment to unlock permanent access.
              </p>
            )}
          </motion.div>
        </main>

        {/* CTA Button Footer */}
        <footer className="relative z-10 w-full max-w-md mx-auto py-4">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-3"
          >
            {sprint?.offerCtaUrl ? (
              <a
                href={getCtaUrlWithEmail(sprint.offerCtaUrl, emailInput)}
                onClick={handleCtaClick}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-[#0E7850] hover:bg-[#0c6644] text-white rounded-3xl font-black uppercase tracking-[0.15em] text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer text-center animate-pulse"
              >
                <span>{sprint?.offerCtaText || "Get Access Now"}</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </a>
            ) : (
              <button
                disabled
                className="w-full py-4 bg-gray-300 text-gray-500 rounded-3xl font-black uppercase tracking-[0.15em] text-xs flex items-center justify-center gap-2"
              >
                <span>Offer link not set by coach</span>
              </button>
            )}
            <button
              onClick={() => navigate('/explore', { replace: true })}
              className="w-full py-3 bg-transparent text-gray-400 hover:text-gray-600 text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              Back to Explore
            </button>
          </motion.div>
        </footer>
      </div>
    );
  }

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
        </motion.div>

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
    </div>
  );
};

export default DaySuccessPage;
