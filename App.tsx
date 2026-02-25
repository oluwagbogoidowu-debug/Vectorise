import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import BottomNavigation from './components/BottomNavigation';
import { sprintService } from './services/sprintService';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { analyticsTracker } from './services/analyticsTracker';
import { AppRoutes } from './routes';
import { UserRole } from './types';

const AppContent: React.FC = () => {
  const { user, activeRole } = useAuth();
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (user) {
      analyticsTracker.identify(user.id, user.email);
    }
    analyticsTracker.trackEvent('page_view', { path: location.pathname + location.hash }, user?.id, user?.email);
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

  return (
    <div className={`min-h-screen font-sans ${isOnboardingRoute ? 'bg-primary text-white' : 'bg-light text-dark'}`}>
      {showGlobalHeader && <Header />}
      <main className={showGlobalHeader ? "container mx-auto px-4 md:px-6 lg:px-8" : ""}>
        <AppRoutes />
      </main>
      {showParticipantNav && <BottomNavigation />}
      <PWAInstallPrompt deferredPrompt={deferredPrompt} />
    </div>
  );
};


const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;