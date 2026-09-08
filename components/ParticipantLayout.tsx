
import React, { useState, useEffect } from 'react';
import Header from './Header';
import BottomNavigation from './BottomNavigation';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sprintService } from '../services/sprintService';
import { userService } from '../services/userService';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { NotificationManager } from './NotificationManager';

interface ParticipantLayoutProps {
  children?: React.ReactNode;
}

const ParticipantLayout: React.FC<ParticipantLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';
  const isDashboard = location.pathname === '/dashboard';
  const showHeader = isHomePage || isDashboard;
  const { user } = useAuth();

  const [pendingAction, setPendingAction] = useState<any>(null);
  const [pendingSprint, setPendingSprint] = useState<any>(null);
  const [showCoinPopup, setShowCoinPopup] = useState(false);
  const [showAlreadyDonePopup, setShowAlreadyDonePopup] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Dynamic coin calculations
  const sprintCost = pendingSprint?.pointCost || 30;
  const userWalletBalance = (user as any)?.walletBalance ?? 50;
  const walletDisplayBalance = userWalletBalance <= 0 ? 50 : userWalletBalance;
  const remainingCoins = walletDisplayBalance - sprintCost;

  useEffect(() => {
    if (!user) return;
    if (location.pathname.startsWith('/participant/day-success')) {
      localStorage.removeItem('pending_first_action');
      return;
    }
    const pendingRaw = localStorage.getItem('pending_first_action');
    if (!pendingRaw) return;
    try {
      const pending = JSON.parse(pendingRaw);
      if (pending && pending.sprintId) {
        sprintService.getSprintById(pending.sprintId).then((sprint: any) => {
          if (sprint) {
            sprintService.getUserEnrollments(user.id).then(async (enrollments) => {
              const existingEnrollment = enrollments.find(e => e.sprint_id === pending.sprintId);
              if (!existingEnrollment) {
                try {
                  const enrollment = await sprintService.enrollUser(user.id, pending.sprintId, sprint.duration, {
                    firstActionInput: pending.firstActionInput, taskInputs: pending.taskInputs
                  });
                  if (enrollment && enrollment.progress && enrollment.progress[0]) {
                    const updatedProgress = [...enrollment.progress];
                    updatedProgress[0] = {
                        ...updatedProgress[0],
                        completed: true,
                        completedAt: new Date().toISOString(), answers: pending.taskInputs || [pending.firstActionInput], submission: pending.taskInputs?.[0] || pending.firstActionInput
                    };
                    const enrollmentRef = doc(db, "users", user.id, "enrollments", enrollment.id);
                    await updateDoc(enrollmentRef, { 
                        progress: updatedProgress,
                        last_activity_at: new Date().toISOString()
                    });
                  }
                  if (enrollment && enrollment.id) {
                    console.log("[ParticipantLayout] Confirmed target enrollment created/updated:", enrollment.id, "Removing pending_first_action");
                    localStorage.removeItem('pending_first_action');
                  } else {
                    console.warn("[ParticipantLayout] Enrollment ID not confirmed, keeping pending_first_action");
                  }
                  const d1Content = Array.isArray(sprint?.dailyContent) ? sprint.dailyContent.find((dc: any) => dc.day === 1) : undefined;
                  navigate('/participant/day-success', { 
                    replace: true, 
                    state: { 
                      day: 1, 
                      coinsUnlocked: 10, 
                      bridgeNote: d1Content?.bridgeNote,
                      sprintId: pending.sprintId, 
                      enrollmentId: enrollment?.id 
                    } 
                  });
                } catch (autoErr) {
                  console.error("Auto enrollment inside layout failed:", autoErr);
                }
              } else if (existingEnrollment.status === 'completed') {
                // Case 1: Already completed/done before, show "Check out recommended sprint" popup
                setPendingSprint(sprint);
                setShowAlreadyDonePopup(true);
              } else {
                // Case 2: In-progress/active, save any pending preview inputs to database and navigate to Day Success
                if (pending && (pending.taskInputs || pending.firstActionInput) && existingEnrollment.progress && existingEnrollment.progress[0]) {
                  try {
                    const updatedProgress = [...existingEnrollment.progress];
                    updatedProgress[0] = {
                      ...updatedProgress[0],
                      completed: true,
                      completedAt: new Date().toISOString(),
                      answers: pending.taskInputs || [pending.firstActionInput],
                      submission: pending.taskInputs?.[0] || pending.firstActionInput || ""
                    };
                    const enrollmentRef = doc(db, "users", user.id, "enrollments", existingEnrollment.id);
                    await updateDoc(enrollmentRef, {
                      progress: updatedProgress,
                      last_activity_at: new Date().toISOString()
                    });
                  } catch (e) {
                    console.error("Failed to update active enrollment progress with pending preview action:", e);
                  }
                }
                console.log("[ParticipantLayout] Confirmed existing enrollment updated:", existingEnrollment.id, "Removing pending_first_action");
                localStorage.removeItem('pending_first_action');
                const d1Content = Array.isArray(sprint?.dailyContent) ? sprint.dailyContent.find((dc: any) => dc.day === 1) : undefined;
                navigate('/participant/day-success', {
                  replace: true,
                  state: {
                    day: 1,
                    coinsUnlocked: 10,
                    bridgeNote: d1Content?.bridgeNote,
                    sprintId: pending.sprintId,
                    enrollmentId: existingEnrollment.id
                  }
                });
              }
            });
          }
        });
      }
    } catch (err) {
      console.error("Error reading pending first action in layout:", err);
    }
  }, [user, location.pathname]);

  useEffect(() => {
    if (localStorage.getItem('show_bonus_toast') === 'true') {
      localStorage.removeItem('show_bonus_toast');
      const timer = setTimeout(() => {
        toast.success("10 coin bonus claimed and first step completed successfully! 🪙", {
          duration: 5000,
        });
        
        const pushTimer = setTimeout(() => {
          localStorage.setItem('trigger_push_prompt_small', 'true');
          window.dispatchEvent(new Event('trigger_push_prompt'));
        }, 2000);
        
        return () => clearTimeout(pushTimer);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const isDaySuccess = location.pathname.startsWith('/participant/day-success');
  const isSprintView = location.pathname.startsWith('/participant/sprint');
  const isSettingsPage = location.pathname.startsWith('/profile/settings');
  const isNextSprint = location.pathname.startsWith('/participant/next-sprint') || location.pathname.startsWith('/participant/recommendation') || location.pathname === '/dashboard';
  const isFullBleedPage = isDaySuccess || isSprintView || isSettingsPage || isNextSprint || location.pathname.startsWith('/sprint') || location.pathname.startsWith('/coach/sprint/preview');

  return (
    <div className="h-[100dvh] w-full bg-light dark:bg-[#121212] overflow-hidden flex flex-col">
      {/* Main content area: overflow-y-auto enables scrolling for the whole view */}
      {showHeader && <Header />}
      <main className={`flex-1 bg-light dark:bg-[#121212] relative overflow-y-auto custom-scrollbar ${showHeader ? 'pt-2' : ''} ${isFullBleedPage ? 'pb-0' : 'pb-8'}`}>
        {children || <Outlet />}
      </main>
      
      {showCoinPopup && pendingSprint && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center relative overflow-hidden animate-slide-up border border-gray-100">
            {/* Interactive bouncing coin graphic */}
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 relative animate-bounce">
              <span className="text-4xl">🪙</span>
              <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                +50 FREE
              </div>
            </div>

            <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2 col-auto">You’ve begun your first sprint</h3>
            <p className="text-[#0E7850] font-extrabold text-[12px] uppercase tracking-wider mb-6">
              Let’s keep it going
            </p>

            <div className="bg-gray-50 rounded-[1.5rem] p-5 mb-8 border border-gray-100/70 text-left space-y-3 font-semibold text-xs sm:text-sm text-gray-600">
              <div className="flex justify-between items-center font-bold">
                <span>You have:</span>
                <span className="text-gray-950 font-black">{walletDisplayBalance} coins</span>
              </div>
              <div className="flex justify-between items-center font-bold">
                <span>This sprint uses:</span>
                <span className="text-gray-950 font-black">{sprintCost} coins</span>
              </div>
              <div className="h-px bg-gray-200/60 my-2" />
              <div className="flex justify-between items-center text-[#0E7850] font-black text-[13px] sm:text-[14px]">
                <span>You’ll have:</span>
                <span>{remainingCoins} coins left</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                disabled={isUnlocking}
                onClick={async () => {
                  if (!user) return;
                  setIsUnlocking(true);
                  try {
                    const cost = pendingSprint.pointCost || 30;
                    
                    // Award coins if their current balance doesn't cover it (already handles the free award UX beautifully)
                    const userBalance = (user as any).walletBalance ?? 0;
                    if (userBalance < cost) {
                      await userService.updateUserDocument(user.id, { walletBalance: 50 });
                    }

                    // Deduct standard coins
                    await userService.processWalletTransaction(user.id, {
                      amount: -cost,
                      type: 'spend',
                      description: `Unlocked sprint: ${pendingSprint.title}`
                    });

                    // Enroll
                    const enrollment = await sprintService.enrollUser(user.id, pendingSprint.id, pendingSprint.duration, {
                      firstActionInput: pendingAction?.firstActionInput
                    });

                    if (enrollment.status === 'queued') {
                      toast.success(`Paid 🪙 ${cost} coins. Added to waitlist since you have another active sprint! Day 1 progress saved.`);
                    } else {
                      toast.success(`Sprint unlocked! Paid 🪙 ${cost} coins.`);
                    }

                    // Close and clear state
                    setShowCoinPopup(false);
                    localStorage.removeItem('pending_first_action');

                    // Navigate straight to active sprint view to complete actions
                    navigate(`/participant/sprint/${enrollment.id}?day=1`);
                  } catch (err) {
                    console.error("Unlock error:", err);
                    toast.error("Unlock failed. Please try again.");
                  } finally {
                    setIsUnlocking(false);
                  }
                }}
                className="w-full py-4 bg-[#0E7850] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#0b5d3e] transition-colors shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUnlocking ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>Continue Sprint</>
                )}
              </button>

              <button
                type="button"
                disabled={isUnlocking}
                onClick={() => {
                  setShowCoinPopup(false);
                  localStorage.removeItem('pending_first_action');
                }}
                className="w-full py-4 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:text-gray-600 transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showAlreadyDonePopup && pendingSprint && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center relative overflow-hidden animate-slide-up border border-gray-100">
            <div className="w-16 h-16 bg-[#0E7850]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[#0E7850]">
              <span className="text-3xl">🎯</span>
            </div>

            <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2 col-auto">You’ve done this before!</h3>
            <p className="text-[#0E7850] font-extrabold text-[12px] uppercase tracking-wider mb-6">
              Sprint Already Completed
            </p>

            <p className="text-gray-500 font-medium text-xs leading-relaxed mb-8">
              You have already finished <strong>{pendingSprint.title}</strong> previously. Ready to explore another amazing sprint to level up?
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setShowAlreadyDonePopup(false);
                  localStorage.removeItem('pending_first_action');
                  navigate('/explore');
                }}
                className="w-full py-4 bg-[#0E7850] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#0b5d3e] transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                Check out recommended sprint
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAlreadyDonePopup(false);
                  localStorage.removeItem('pending_first_action');
                }}
                className="w-full py-3 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:text-gray-600 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <NotificationManager />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default ParticipantLayout;