import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import LoginPage from './pages/Auth/LoginPage';
import SignUpPage from './pages/Auth/SignUpPage';
import VerifyEmailPage from './pages/Auth/VerifyEmailPage';
import HomePage from './pages/HomePage';
import CreateSprint from './pages/Coach/CreateSprint';
import EditSprint from './pages/Coach/EditSprint';
import SprintLandingPage from './pages/Participant/SprintLandingPage';
import DiscoverSprints from './pages/Participant/DiscoverSprints';
import ParticipantDashboard from './pages/Participant/ParticipantDashboard';
import SprintView from './pages/Participant/SprintView';
import AdminDashboard from './pages/Admin/AdminDashboard';
import CreateFoundationalSprint from './pages/Admin/CreateFoundationalSprint';
import { UserRole } from './types';
import { Welcome } from './pages/Onboarding/Welcome';
import QuizIntro from './pages/Onboarding/QuizIntro';
import Quiz from './pages/Onboarding/Quiz';
import RecommendedSprints from './pages/Participant/RecommendedSprints';
import ParticipantLayout from './components/ParticipantLayout';
import Profile from './pages/Participant/Profile';
import PublicProfile from './pages/Participant/PublicProfile';
import MySprints from './pages/Participant/MySprints';
import GrowthDashboard from './pages/Participant/GrowthDashboard';
import BottomNavigation from './components/BottomNavigation';
import SprintInviteLanding from './pages/Participant/SprintInviteLanding';
import PartnerPage from './pages/Partner/PartnerPage';
import PartnerApply from './pages/Partner/PartnerApply';
import PartnerDashboard from './pages/Partner/PartnerDashboard';
import { sprintService } from './services/sprintService';

// New specialized onboarding pages
import FocusSelector from './pages/Onboarding/FocusSelector';
import ProgramDescription from './pages/Onboarding/ProgramDescription';
import CommitmentFraming from './pages/Onboarding/CommitmentFraming';
import SprintPayment from './pages/Onboarding/SprintPayment';

// Impact / Referral System
import ImpactDashboard from './pages/Participant/Impact/ImpactDashboard';
import ReferralShare from './pages/Participant/Impact/ReferralShare';
import RippleEffect from './pages/Participant/Impact/RippleEffect';
import GrowthRewards from './pages/Participant/Impact/GrowthRewards';
import ReferralSuccess from './pages/Participant/Impact/ReferralSuccess';
import PaymentSuccess from './pages/Participant/PaymentSuccess';
import Badges from './pages/Participant/Impact/Badges';

// New Coach Layout & Pages
import CoachLayout from './components/CoachLayout';
import CoachDashboard from './pages/Coach/CoachDashboard';
import CoachSprints from './pages/Coach/CoachSprints';
import CoachParticipants from './pages/Coach/CoachParticipants';
import CoachEarnings from './pages/Coach/CoachEarnings';
import CoachImpact from './pages/Coach/CoachImpact';

// Coach Onboarding
import { CoachWelcome } from './pages/Onboarding/CoachWelcome';
import CoachQuizIntro from './pages/Onboarding/CoachQuizIntro';
import CoachQuiz from './pages/Onboarding/CoachQuiz';
import CoachOnboardingComplete from './pages/Coach/CoachOnboardingComplete';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { user, activeRole, loading } = useAuth();

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-light">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleMatches = roles.includes(activeRole) || roles.includes(user.role);

  if (!roleMatches) {
      if (roles.includes(UserRole.COACH) && activeRole === UserRole.PARTICIPANT) {
          return <Navigate to="/dashboard" replace />;
      }
      if (roles.includes(UserRole.PARTICIPANT) && activeRole === UserRole.COACH) {
           return <Navigate to="/coach/dashboard" replace />;
      }
      return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, activeRole } = useAuth();
  const location = useLocation();

  // GLOBAL REFERRAL TRACKER (ENHANCED FOR TELEMETRY & IDEMPOTENCY)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refFromUrl = urlParams.get('ref');
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || "");
    const refFromHash = hashParams.get('ref');
    const finalRef = refFromUrl || refFromHash;
    const sprintId = urlParams.get('sprintId') || hashParams.get('sprintId');
    
    if (finalRef) {
      // PREVENT DOUBLE COUNTING: Use session-specific key including sprint context
      const sessionProcessedKey = `vec_click_${finalRef}_${sprintId || 'main'}`;
      const isAlreadyProcessed = sessionStorage.getItem(sessionProcessedKey);

      if (!isAlreadyProcessed) {
        // 1. Log Click to Firestore Telemetry
        sprintService.incrementLinkClick(finalRef, sprintId);

        // 2. Mark as processed for this session
        sessionStorage.setItem(sessionProcessedKey, 'true');

        // 3. Persist for signup attribution (First-Touch)
        const existingRef = localStorage.getItem('vectorise_ref');
        if (!existingRef) {
          console.log("[Registry] Capturing New First-Touch Referral:", finalRef);
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

  const hasRefParam = new URLSearchParams(window.location.search).has('ref') || 
                      new URLSearchParams(window.location.hash.split('?')[1] || "").has('ref');

  return (
    <div className={`min-h-screen font-sans ${isOnboardingRoute ? 'bg-primary text-white' : 'bg-light text-dark'}`}>
      {showGlobalHeader && <Header />}
      <main className={showGlobalHeader ? "container mx-auto px-4 md:px-6 lg:px-8" : ""}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/" element={(user && !hasRefParam) ? <Navigate to="/dashboard" /> : <HomePage />} />
          <Route path="/recommended" element={<RecommendedSprints />} />
          <Route path="/partner" element={<PartnerPage />} />
          <Route path="/partner/apply" element={<PartnerApply />} />
          <Route path="/partner/dashboard" element={<ProtectedRoute roles={[UserRole.PARTNER, UserRole.ADMIN]}><PartnerDashboard /></ProtectedRoute>} />
          <Route path="/onboarding/welcome" element={<Welcome />} />
          <Route path="/onboarding/focus-selector" element={<FocusSelector />} />
          <Route path="/onboarding/description/:sprintId" element={<ProgramDescription />} />
          <Route path="/onboarding/commitment" element={<CommitmentFraming />} />
          <Route path="/onboarding/sprint-payment" element={<SprintPayment />} />
          <Route path="/onboarding/intro" element={<QuizIntro />} />
          <Route path="/onboarding/quiz" element={<Quiz />} />
          <Route path="/onboarding/coach/welcome" element={<CoachWelcome />} />
          <Route path="/onboarding/coach/intro" element={<CoachQuizIntro />} />
          <Route path="/onboarding/coach/quiz" element={<CoachQuiz />} />
          <Route path="/coach/onboarding/complete" element={<CoachOnboardingComplete />} />
          <Route path="/join/:referralCode/:sprintId" element={<SprintInviteLanding />} />
          <Route path="/dashboard" element={
            <ProtectedRoute roles={[UserRole.COACH, UserRole.PARTICIPANT, UserRole.ADMIN, UserRole.PARTNER]}>
              {activeRole === UserRole.COACH && <Navigate to="/coach/dashboard" />}
              {activeRole === UserRole.ADMIN && <Navigate to="/admin/dashboard" />}
              {activeRole === UserRole.PARTNER && <Navigate to="/partner/dashboard" />}
              {(activeRole === UserRole.PARTICIPANT || activeRole === UserRole.PARTNER) && <ParticipantLayout><ParticipantDashboard /></ParticipantLayout>}
            </ProtectedRoute>
          } />
          <Route element={<ProtectedRoute roles={[UserRole.COACH]}><CoachLayout /></ProtectedRoute>}>
             <Route path="/coach/dashboard" element={<CoachDashboard />} />
             <Route path="/coach/sprints" element={<CoachSprints />} />
             <Route path="/coach/participants" element={<CoachParticipants />} />
             <Route path="/coach/earnings" element={<CoachEarnings />} />
             <Route path="/coach/impact" element={<CoachImpact />} />
             <Route path="/coach/profile" element={<Profile />} />
          </Route>
          <Route path="/coach/sprint/new" element={<ProtectedRoute roles={[UserRole.COACH]}><CreateSprint /></ProtectedRoute>} />
          <Route path="/coach/sprint/edit/:sprintId" element={<ProtectedRoute roles={[UserRole.COACH, UserRole.ADMIN]}><EditSprint /></ProtectedRoute>} />
          <Route element={<ProtectedRoute roles={[UserRole.PARTICIPANT, UserRole.PARTNER]}><ParticipantLayout /></ProtectedRoute>}>
             <Route path="/discover" element={<DiscoverSprints />} />
             <Route path="/my-sprints" element={<MySprints />} />
             <Route path="/profile" element={<Profile />} />
             <Route path="/profile/:userId" element={<PublicProfile />} />
             <Route path="/growth" element={<GrowthDashboard />} />
             <Route path="/impact" element={<ImpactDashboard />} />
             <Route path="/impact/share" element={<ReferralShare />} />
             <Route path="/impact/ripple" element={<RippleEffect />} />
             <Route path="/impact/rewards" element={<GrowthRewards />} />
             <Route path="/impact/badges" element={<Badges />} />
          </Route>
          <Route path="/participant/sprint/:enrollmentId" element={
              <ProtectedRoute roles={[UserRole.PARTICIPANT, UserRole.COACH, UserRole.ADMIN, UserRole.PARTNER]}>
                  <ParticipantLayout>
                      <SprintView />
                  </ParticipantLayout>
              </ProtectedRoute>
          } />
          <Route path="/impact/success" element={<ReferralSuccess />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/sprint/:sprintId" element={<SprintLandingPage />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute roles={[UserRole.ADMIN]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/sprint/new" element={<ProtectedRoute roles={[UserRole.ADMIN]}><CreateFoundationalSprint /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      {showParticipantNav && <BottomNavigation />}
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