import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'sonner';
import Header from './components/Header';
import BottomNavigation from './components/BottomNavigation';
import TopBanner from './components/TopBanner';
import { NotificationManager } from './components/NotificationManager';
import { DormancyPrompt } from './components/DormancyPrompt';

import { sprintService } from './services/sprintService';
import { pushNotificationService } from './services/pushNotificationService';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { analyticsTracker } from './services/analyticsTracker';
import { AppRoutes } from './routes';
import { UserRole } from './types';

// Verification dependencies
import { auth, db } from './services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { toast as alertToast } from 'sonner';

const AppContent: React.FC = () => {
  const { user, activeRole, loading, mustVerifyEmail, checkVerification, logout } = useAuth();
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Email confirmation states
  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [isResendingLink, setIsResendingLink] = useState(false);
  const [localCode, setLocalCode] = useState('');

  // 1) Ensure verification code is generated/loaded
  useEffect(() => {
    const ensureCodeExists = async () => {
      if (mustVerifyEmail && user && auth.currentUser) {
        const currentCode = (user as any).verificationCode;
        if (!currentCode) {
          const generated = Math.floor(100000 + Math.random() * 900000).toString();
          try {
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
              verificationCode: generated
            });
            setLocalCode(generated);
          } catch (e) {
            console.error("Failed to generate verification code", e);
          }
        } else {
          setLocalCode(currentCode);
        }
      }
    };
    ensureCodeExists();
  }, [mustVerifyEmail, user]);

  const handleDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...codeDigits];
    newDigits[index] = val.slice(-1);
    setCodeDigits(newDigits);
    
    // Auto focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`digit-box-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      const prevInput = document.getElementById(`digit-box-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleCodeVerify = async () => {
    if (!auth.currentUser) return;
    const entered = codeDigits.join('');
    if (entered.length < 6) {
      alertToast.error("Please fill all 6 digits of the confirmation code.");
      return;
    }
    setVerifyingCode(true);
    try {
      const targetCode = localCode || (user as any).verificationCode;
      if (entered === targetCode) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          emailVerifiedOverride: true
        });
        alertToast.success("Registry code verified successfully! Welcome.");
      } else {
        alertToast.error("Incorrect confirmation code. Check the code and try again.");
      }
    } catch (err) {
      console.error(err);
      alertToast.error("Error verifying code. Try again.");
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResendOverlayMail = async () => {
    if (auth.currentUser) {
      setIsResendingLink(true);
      try {
        await sendEmailVerification(auth.currentUser);
        alertToast.success("Verification link resent to your email.");
      } catch (err) {
        alertToast.error("Failed to resend. Please try again in a moment.");
      } finally {
        setIsResendingLink(false);
      }
    }
  };

  const handleIHaveClickedLink = async () => {
    setVerifyingCode(true);
    try {
      const isVerified = await checkVerification();
      if (isVerified) {
        alertToast.success("Email verified successfully! Welcome.");
      } else {
        alertToast.error("We checked, but the link hasn't been verified in your inbox yet!");
      }
    } catch (err) {
      console.error(err);
      alertToast.error("Failed to check status.");
    } finally {
      setVerifyingCode(false);
    }
  };

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    let interval: any;
    if (user) {
      analyticsTracker.identify(user.id, user.email);
      
      // Update activity state on load
      pushNotificationService.updateActivity(user.id, 'Active');

      // Periodically update activity while user is active
      interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          pushNotificationService.updateActivity(user.id, 'Active');
        }
      }, 2 * 60 * 1000); // Every 2 minutes
    }
    
    analyticsTracker.trackEvent('page_view', { path: location.pathname + location.hash }, user?.id, user?.email);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [location.pathname, location.hash, user?.id]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refFromUrl = urlParams.get('ref');
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || "");
    const refFromHash = hashParams.get('ref');
    const finalRef = refFromUrl || refFromHash;
    const sprintId = urlParams.get('sprintId') || hashParams.get('sprintId');
    
    if (finalRef) {
      const sessionProcessedKey = `vec_click_${finalRef}_${sprintId || 'main'}`;
      const isAlreadyProcessed = sessionStorage.getItem(sessionProcessedKey);

      if (!isAlreadyProcessed) {
        sprintService.incrementLinkClick(finalRef, sprintId);
        sessionStorage.setItem(sessionProcessedKey, 'true');
        const existingRef = localStorage.getItem('vectorise_ref');
        if (!existingRef) {
          localStorage.setItem('vectorise_ref', finalRef);
          const expires = new Date();
          expires.setTime(expires.getTime() + (30 * 24 * 60 * 60 * 1000));
          document.cookie = `vectorise_ref=${finalRef};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
        }
      }
    }

    if (sprintId) {
      localStorage.setItem('vectorise_last_sprint', sprintId);
    }
  }, [location.pathname]);

  const isOnboardingRoute = location.pathname.startsWith('/onboarding') || 
                            location.pathname === '/recommended' || 
                            location.pathname === '/coach/onboarding/complete' ||
                            location.pathname.startsWith('/join/') ||
                            location.pathname === '/partner/apply';
  
  const isAuthRoute = 
    location.pathname === '/login' || 
    location.pathname === '/signup' || 
    location.pathname === '/verify-email' ||
    location.pathname === '/payment-success';

  const showGlobalHeader = location.pathname === '/dashboard';

  const showParticipantNav = 
    user && 
    activeRole === UserRole.PARTICIPANT && 
    !isOnboardingRoute &&
    !location.pathname.startsWith('/coach') &&
    !location.pathname.startsWith('/admin') &&
    !isAuthRoute;

  const showTopBanner = !isOnboardingRoute && !isAuthRoute;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA]">
        <div className="w-10 h-10 border-4 border-[#0E7850] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans ${isOnboardingRoute ? 'bg-primary text-white' : 'bg-light text-dark'}`}>
      {showTopBanner && <TopBanner deferredPrompt={deferredPrompt} />}
      <Toaster position="top-center" richColors visibleToasts={1} />
      {showGlobalHeader && <Header />}
      <main className={showGlobalHeader ? "container mx-auto px-4 md:px-6 lg:px-8" : ""}>
        <AppRoutes />
      </main>
      {showParticipantNav && <BottomNavigation />}
      <NotificationManager />
      <DormancyPrompt />
      <PWAInstallPrompt deferredPrompt={deferredPrompt} />

      {mustVerifyEmail && user && (
        <div id="email-verification-lock" className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 sm:p-10 text-center relative max-h-[90vh] overflow-y-auto">
            
            <div className="w-16 h-16 bg-primary/5 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#0E7850]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <h2 className="text-2.5xl font-black text-gray-900 mb-1 tracking-tight uppercase leading-none">Verify Your Path</h2>
            <p className="text-gray-500 text-xs mb-6 font-medium">
              We've sent a portal link and code to:<br/>
              <span className="text-primary font-black italic">{user.email}</span>
            </p>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6 text-left">
              <div className="text-[9px] text-gray-400 font-bold leading-relaxed uppercase tracking-widest mb-3 text-center">
                Enter your 6-digit registry code below:
              </div>
              
              <div className="flex justify-between gap-1.5 max-w-[260px] mx-auto">
                {codeDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`digit-box-${idx}`}
                    type="text"
                    pattern="\d*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-9 h-11 bg-white border border-gray-200 rounded-xl text-center font-black text-lg text-gray-900 outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all shadow-sm"
                  />
                ))}
              </div>
            </div>

            {localCode && (
              <div className="mb-6 p-2.5 bg-primary/5 rounded-xl border border-primary/10 text-center">
                <p className="text-[8px] text-primary font-black tracking-widest uppercase">
                  Development Code Notice:
                </p>
                <p className="text-sm font-black tracking-widest text-[#0E7850] mt-0.5">
                  {localCode}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button 
                type="button"
                disabled={verifyingCode}
                onClick={handleCodeVerify}
                className="w-full py-3.5 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg transition-transform active:scale-95 disabled:opacity-50"
              >
                {verifyingCode ? 'Verifying Code...' : 'Submit Code ✓'}
              </button>

              <button 
                type="button"
                disabled={verifyingCode}
                onClick={handleIHaveClickedLink}
                className="w-full py-3 border border-gray-200 text-gray-800 rounded-full text-[9px] font-black uppercase tracking-[0.15em] transition-all hover:bg-gray-50 hover:border-gray-300 active:scale-95"
              >
                I've clicked the link instead
              </button>

              <div className="flex justify-between gap-4 pt-3 border-t border-gray-100">
                <button 
                  type="button"
                  disabled={isResendingLink}
                  onClick={handleResendOverlayMail}
                  className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline disabled:opacity-50 mt-1"
                >
                  {isResendingLink ? 'Sending Link...' : 'Resend Email'}
                </button>

                <button 
                  type="button"
                  onClick={async () => {
                    await logout();
                  }}
                  className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline mt-1"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;