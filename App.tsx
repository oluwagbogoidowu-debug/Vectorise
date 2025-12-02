
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
import ParticipantDashboard from './pages/Participant/ParticipantDashboard';
import SprintView from './pages/Participant/SprintView';
import AdminDashboard from './pages/Admin/AdminDashboard';
import { UserRole } from './types';
import DiscoverSprints from './pages/Participant/DiscoverSprints';
import { Welcome } from './pages/Onboarding/Welcome';
import QuizIntro from './pages/Onboarding/QuizIntro';
import Quiz from './pages/Onboarding/Quiz';
import RecommendedSprints from './pages/Participant/RecommendedSprints';
import ParticipantLayout from './components/ParticipantLayout';
import Tribe from './pages/Participant/Tribe';
import Profile from './pages/Participant/Profile';
import Shine from './pages/Participant/Shine';
import MySprints from './pages/Participant/MySprints';
import GrowthDashboard from './pages/Participant/GrowthDashboard';
import BottomNavigation from './components/BottomNavigation';

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

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { user, activeRole, loading } = useAuth();

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check against the currently active role (view mode) or the user's base role
  // This allows a Participant who has switched to Coach mode to access Coach routes
  const roleMatches = roles.includes(activeRole) || roles.includes(user.role);

  if (!roleMatches) {
      // If trying to access coach routes but in participant mode, redirect to dashboard
      if (roles.includes(UserRole.COACH) && activeRole === UserRole.PARTICIPANT) {
          return <Navigate to="/dashboard" replace />;
      }
      // If trying to access participant routes but in coach mode, redirect to coach dashboard
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
  
  // Onboarding paths
  const isOnboarding = location.pathname.startsWith('/onboarding');
  
  // Paths that use the bottom navigation layout (Participant) - Logic updated to be Global
  const isParticipantAppLayout = 
    location.pathname === '/dashboard' || 
    location.pathname === '/discover' || 
    location.pathname === '/my-sprints' ||
    location.pathname === '/tribe' || 
    location.pathname === '/shine' ||
    location.pathname === '/profile' ||
    location.pathname === '/growth' ||
    location.pathname === '/impact' ||
    location.pathname === '/impact/share' ||
    location.pathname === '/impact/ripple' ||
    location.pathname === '/impact/rewards' ||
    location.pathname === '/impact/badges' ||
    location.pathname.startsWith('/participant/sprint/');

  // Paths that use the bottom navigation layout (Coach)
  const isCoachAppLayout = location.pathname.startsWith('/coach/');

  // Only show the global marketing header if NOT onboarding AND NOT in any app layout
  const showGlobalHeader = !isOnboarding && !isParticipantAppLayout && !isCoachAppLayout;

  // Show Participant Bottom Navigation globally if active role is PARTICIPANT and not on excluded pages
  const showParticipantNav = 
    user && 
    activeRole === UserRole.PARTICIPANT && 
    !isOnboarding &&
    !location.pathname.startsWith('/coach') &&
    !location.pathname.startsWith('/admin') &&
    !location.pathname.startsWith('/login') &&
    !location.pathname.startsWith('/signup') &&
    !location.pathname.startsWith('/verify-email');

  return (
    <div className={`min-h-screen font-sans ${isOnboarding ? 'bg-primary text-white' : 'bg-light text-dark'}`}>
      {showGlobalHeader && <Header />}
      <main className={showGlobalHeader ? "container mx-auto p-4 md:p-6 lg:p-8" : ""}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <HomePage />} />
          <Route path="/recommended" element={<RecommendedSprints />} />
          
          {/* Onboarding Routes */}
          <Route path="/onboarding/welcome" element={<Welcome />} />
          <Route path="/onboarding/intro" element={<QuizIntro />} />
          <Route path="/onboarding/quiz" element={<Quiz />} />
          
          {/* Dashboard Redirect based on Active Role */}
          <Route path="/dashboard" element={
            <ProtectedRoute roles={[UserRole.COACH, UserRole.PARTICIPANT, UserRole.ADMIN]}>
              {activeRole === UserRole.COACH && <Navigate to="/coach/dashboard" />}
              {activeRole === UserRole.PARTICIPANT && <ParticipantLayout><ParticipantDashboard /></ParticipantLayout>}
              {activeRole === UserRole.ADMIN && <Navigate to="/admin/dashboard" />}
            </ProtectedRoute>
          } />

          {/* Coach Routes - Nested under CoachLayout */}
          <Route element={<ProtectedRoute roles={[UserRole.COACH]}><CoachLayout /></ProtectedRoute>}>
             <Route path="/coach/dashboard" element={<CoachDashboard />} />
             <Route path="/coach/sprints" element={<CoachSprints />} />
             <Route path="/coach/participants" element={<CoachParticipants />} />
             <Route path="/coach/shine" element={<Shine viewMode="coach" />} />
             <Route path="/coach/earnings" element={<CoachEarnings />} />
             {/* Reuse Profile component but will render in Coach context */}
             <Route path="/coach/profile" element={<Profile />} />
          </Route>

          {/* Coach Sub-routes (Full screen/No nav) */}
          <Route path="/coach/sprint/new" element={<ProtectedRoute roles={[UserRole.COACH]}><CreateSprint /></ProtectedRoute>} />
          <Route path="/coach/sprint/edit/:sprintId" element={<ProtectedRoute roles={[UserRole.COACH]}><EditSprint /></ProtectedRoute>} />

          {/* Participant App Layout Routes */}
          <Route element={<ProtectedRoute roles={[UserRole.PARTICIPANT]}><ParticipantLayout /></ProtectedRoute>}>
             <Route path="/discover" element={<DiscoverSprints />} />
             <Route path="/my-sprints" element={<MySprints />} />
             <Route path="/shine" element={<Shine />} />
             <Route path="/tribe" element={<Tribe />} />
             <Route path="/profile" element={<Profile />} />
             <Route path="/growth" element={<GrowthDashboard />} />
             <Route path="/impact" element={<ImpactDashboard />} />
             <Route path="/impact/share" element={<ReferralShare />} />
             <Route path="/impact/ripple" element={<RippleEffect />} />
             <Route path="/impact/rewards" element={<GrowthRewards />} />
             <Route path="/impact/badges" element={<Badges />} />
          </Route>
          
          {/* Shared Sprint View - Accessible by Participant, Coach, and Admin */}
          <Route path="/participant/sprint/:enrollmentId" element={
              <ProtectedRoute roles={[UserRole.PARTICIPANT, UserRole.COACH, UserRole.ADMIN]}>
                  <ParticipantLayout>
                      <SprintView />
                  </ParticipantLayout>
              </ProtectedRoute>
          } />
          
          <Route path="/impact/success" element={<ReferralSuccess />} />

          {/* Public view of sprint (landing page) - keeps global header */}
          <Route path="/sprint/:sprintId" element={<SprintLandingPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute roles={[UserRole.ADMIN]}><AdminDashboard /></ProtectedRoute>} />

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
