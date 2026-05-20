
import React, { useState, useEffect } from 'react';
import Header from './Header';
import BottomNav from './BottomNav';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sprintService } from '../services/sprintService';
import { userService } from '../services/userService';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';

interface ParticipantLayoutProps {
  children?: React.ReactNode;
}

const ParticipantLayout: React.FC<ParticipantLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';
  const { user } = useAuth();

  const [pendingAction, setPendingAction] = useState<any>(null);
  const [pendingSprint, setPendingSprint] = useState<any>(null);
  const [showCoinPopup, setShowCoinPopup] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  useEffect(() => {
    if (!user) return;
    const pendingRaw = localStorage.getItem('pending_first_action');
    if (!pendingRaw) return;
    try {
      const pending = JSON.parse(pendingRaw);
      if (pending && pending.pricingType === 'credits') {
        sprintService.getSprintById(pending.sprintId).then((sprint) => {
          if (sprint) {
            // Only show if the user isn't already active/queued in this sprint
            sprintService.getUserEnrollments(user.id).then((enrollments) => {
              const alreadyEnrolled = enrollments.some(e => e.sprint_id === pending.sprintId);
              if (!alreadyEnrolled) {
                setPendingAction(pending);
                setPendingSprint(sprint);
                setShowCoinPopup(true);
              } else {
                // Already enrolled, clear pending action
                localStorage.removeItem('pending_first_action');
              }
            });
          }
        });
      }
    } catch (err) {
      console.error("Error reading pending first action in layout:", err);
    }
  }, [user]);

  return (
    <div className="h-[100dvh] w-full bg-light overflow-hidden flex flex-col">
      {/* Main content area: overflow-y-auto enables scrolling for the whole view */}
      {isHomePage && <Header />}
      <main className={`flex-1 bg-light relative overflow-y-auto custom-scrollbar ${isHomePage ? 'pt-24' : ''} pb-24`}>
        {children || <Outlet />}
      </main>
      <BottomNav />
      
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

            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2 col-auto">Congratulations! 🎉</h3>
            <p className="text-emerald-600 font-extrabold text-xs uppercase tracking-widest mb-4">
              Your account is open!
            </p>
            <p className="text-gray-500 font-medium text-xs sm:text-sm leading-relaxed mb-6">
              You've been successfully registered and awarded an account creation gift of <span className="text-gray-950 font-black">50 coins</span>! 🪙
              <br />
              <span className="inline-block mt-2">
                Use your coins to unlock the full <span className="text-gray-900 font-bold italic">"{pendingSprint.title}"</span> sprint and complete the remaining Day 1 actions.
              </span>
            </p>

            <div className="bg-gray-50 rounded-2xl p-4 mb-8 flex justify-between items-center text-left border border-gray-100">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sprint Unlock Cost</p>
                <p className="text-sm font-black text-gray-800">🪙 {pendingSprint.pointCost || 50} coins</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Your Gift Balance</p>
                <p className="text-sm font-black text-emerald-600">🪙 {(user as any)?.walletBalance ?? 50} coins</p>
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
                    const cost = pendingSprint.pointCost || 50;
                    
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
                    const enrollment = await sprintService.enrollUser(user.id, pendingSprint.id, pendingSprint.duration);

                    toast.success(`Sprint unlocked! Paid 🪙 ${cost} coins.`);

                    // Close and clear state
                    setShowCoinPopup(false);

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
                  <>Pay with Gift Coins & Start</>
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