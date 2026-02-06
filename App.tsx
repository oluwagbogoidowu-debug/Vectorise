
import React from 'react';
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

// New specialized onboarding pages
import FocusSelector from './pages/Onboarding/FocusSelector';
import ClaritySprintDescription from './pages/Onboarding/ClaritySprintDescription';
import CommitmentFraming from './pages/Onboarding/CommitmentFraming';
import ClaritySprintPayment from './pages/Onboarding/ClaritySprintPayment';

// Impact / Referral System
import ImpactDashboard from './pages/Participant/Impact/ImpactDashboard';
import ReferralShare from './pages/Participant/Impact/ReferralShare';
import RippleEffect from './pages/Participant/Impact/RippleEffect';
import GrowthRewards from './pages/Participant/Impact/GrowthRewards';
import ReferralSuccess from './pages/Participant/Impact/ReferralSuccess';
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
  
  const isOnboardingRoute = location.pathname.startsWith('/onboarding') || 
                            location.pathname === '/recommended' || 
                            location.pathname === '/coach/onboarding/complete' ||
                            location.pathname.startsWith('/join/');
  
  const isAuthRoute = 
    location.pathname === '/login' || 
    location.pathname === '/signup' || 
    location.pathname === '/verify-email';

  const isParticipantAppLayout = 
    location.pathname === '/dashboard' || 
    location.pathname === '/discover' ||
    location.pathname === '/my-sprints' ||
    location.pathname === '/profile' ||
    location.pathname.startsWith('/profile/') ||
    location.pathname === '/growth' ||
    location.pathname === '/impact' ||
    location.pathname === '/impact/share' ||
    location.pathname === '/impact/ripple' ||
    location.pathname === '/impact/rewards' ||
    location.pathname === '/impact/badges' ||
    location.pathname.startsWith('/participant/sprint/');

  const isCoachAppLayout = location.pathname.startsWith('/coach/') && location.pathname !== '/coach/onboarding/complete';

  // Exclude home page and onboarding/auth routes from global header to allow specialized layouts
  const showGlobalHeader = !isOnboardingRoute && !isParticipantAppLayout && !isCoachAppLayout && !isAuthRoute && location.pathname !== '/';

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
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <HomePage />} />
          <Route path="/recommended" element={<RecommendedSprints />} />
          
          <Route path="/onboarding/welcome" element={<Welcome />} />
          <Route path="/onboarding/focus-selector" element={<FocusSelector />} />
          <Route path="/onboarding/clarity-description" element={<ClaritySprintDescription />} />
          <Route path="/onboarding/commitment" element={<CommitmentFraming />} />
          <Route path="/onboarding/clarity-payment" element={<ClaritySprintPayment />} />
          <Route path="/onboarding/intro" element={<QuizIntro />} />
          <Route path="/onboarding/quiz" element={<Quiz />} />

          <Route path="/onboarding/coach/welcome" element={<CoachWelcome />} />
          <Route path="/onboarding/coach/intro" element={<CoachQuizIntro />} />
          <Route path="/onboarding/coach/quiz" element={<CoachQuiz />} />
          <Route path="/coach/onboarding/complete" element={<CoachOnboardingComplete />} />
          
          <Route path="/join/:referralCode/:sprintId" element={<SprintInviteLanding />} />

          <Route path="/dashboard" element={
            <ProtectedRoute roles={[UserRole.COACH, UserRole.PARTICIPANT, UserRole.ADMIN]}>
              {activeRole === UserRole.COACH && <Navigate to="/coach/dashboard" />}
              {activeRole === UserRole.PARTICIPANT && <ParticipantLayout><ParticipantDashboard /></ParticipantLayout>}
              {activeRole === UserRole.ADMIN && <Navigate to="/admin/dashboard" />}
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

          <Route element={<ProtectedRoute roles={[UserRole.PARTICIPANT]}><ParticipantLayout /></ProtectedRoute>}>
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
              <ProtectedRoute roles={[UserRole.PARTICIPANT, UserRole.COACH, UserRole.ADMIN]}>
                  <ParticipantLayout>
                      <SprintView />
                  </ParticipantLayout>
              </ProtectedRoute>
          } />
          
          <Route path="/impact/success" element={<ReferralSuccess />} />
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
