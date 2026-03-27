import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
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
import UserAnalyticsDetail from './pages/Admin/UserAnalyticsDetail';
import CreateFoundationalSprint from './pages/Admin/CreateFoundationalSprint';
import AdminCoachDetail from './pages/Admin/AdminCoachDetail';
import AdminUserDetail from './pages/Admin/AdminUserDetail';
import CreateTrack from './pages/Admin/CreateTrack';
import EditTrack from './pages/Admin/EditTrack';
import TrackDescriptionPage from './pages/TrackDescriptionPage';
import { UserRole } from './types';
import { Welcome } from './pages/Onboarding/Welcome';
import QuizIntro from './pages/Onboarding/QuizIntro';
import Quiz from './pages/Onboarding/Quiz';
import RecommendedSprints from './pages/Participant/RecommendedSprints';
import ParticipantLayout from './components/ParticipantLayout';
import Profile from './pages/Participant/Profile';
import CoachProfile from './pages/Coach/CoachProfile';
import PublicProfile from './pages/Participant/PublicProfile';
import MySprints from './pages/Participant/MySprints';
import GrowthDashboard from './pages/Participant/GrowthDashboard';
import SprintInviteLanding from './pages/Participant/SprintInviteLanding';
import PartnerPage from './pages/Partner/PartnerPage';
import PartnerApply from './pages/Partner/PartnerApply';
import PartnerDashboard from './pages/Partner/PartnerDashboard';

import FocusSelector from './pages/Onboarding/FocusSelector';
import ProgramDescription from './pages/Onboarding/ProgramDescription';
import CommitmentFraming from './pages/Onboarding/CommitmentFraming';
import SprintPayment from './pages/Onboarding/SprintPayment';
import TheMap from './pages/Onboarding/TheMap';
import { CoachWelcome } from './pages/Onboarding/CoachWelcome';
import CoachQuizIntro from './pages/Onboarding/CoachQuizIntro';
import CoachQuiz from './pages/Onboarding/CoachQuiz';
import CoachOnboardingComplete from './pages/Coach/CoachOnboardingComplete';
import CoachLayout from './components/CoachLayout';
import CoachDashboard from './pages/Coach/CoachDashboard';
import CoachSprints from './pages/Coach/CoachSprints';
import CoachParticipants from './pages/Coach/CoachParticipants';
import CoachEarnings from './pages/Coach/CoachEarnings';
import CoachImpact from './pages/Coach/CoachImpact';
import CoachSettings from './pages/Coach/Settings';
import CoachEditProfile from './pages/Coach/Profile/EditProfile';
import SprintPreviewPage from './pages/Coach/SprintPreviewPage'; // New import

import ImpactDashboard from './pages/Participant/Impact/ImpactDashboard';
import ReferralShare from './pages/Participant/Impact/ReferralShare';
import RippleEffect from './pages/Participant/Impact/RippleEffect';
import GrowthRewards from './pages/Participant/Impact/GrowthRewards';
import Badges from './pages/Participant/Impact/Badges';
import ReferralSuccess from './pages/Participant/Impact/ReferralSuccess';
import PaymentSuccess from './pages/Participant/PaymentSuccess';

import AccountSettings from './pages/Participant/Profile/AccountSettings';
import EditProfile from './pages/Participant/Profile/EditProfile';
import IdentitySettings from './pages/Participant/Profile/IdentitySettings';
import RiseArchive from './pages/Participant/Profile/RiseArchive';

import BuyCoins from './pages/Participant/BuyCoins';

import SprintPreview from './pages/Participant/SprintPreview';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { user, activeRole, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admins bypass role checks
  if (user.role === UserRole.ADMIN) return <>{children}</>;

  const hasAccess = roles.includes(user.role as UserRole) || roles.includes(activeRole);

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  const { user, activeRole } = useAuth();
  const location = useLocation();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <SignUpPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/" element={
        user 
          ? <Navigate to={`/dashboard${location.search}`} replace /> 
          : <Navigate to={`/login${location.search}`} replace />
      } />
      <Route path="/welcome" element={<HomePage />} />
      <Route path="/recommended" element={<RecommendedSprints />} />
      <Route path="/partner" element={<PartnerPage />} />
      <Route path="/partner/apply" element={<PartnerApply />} />
      <Route path="/partner/dashboard" element={<ProtectedRoute roles={[UserRole.PARTNER, UserRole.ADMIN]}><PartnerDashboard /></ProtectedRoute>} />
      
      {/* Consolidated Onboarding Paths */}
      <Route path="/onboarding/welcome" element={<Welcome />} />
      <Route path="/onboarding/focus-selector" element={<FocusSelector />} />
      <Route path="/onboarding/description/:sprintId" element={<ProgramDescription />} />
      <Route path="/onboarding/commitment" element={<CommitmentFraming />} />
      <Route path="/onboarding/sprint-payment" element={<SprintPayment />} />
      <Route path="/onboarding/map" element={<TheMap />} />
      <Route path="/onboarding/intro" element={<QuizIntro />} />
      <Route path="/onboarding/quiz" element={<Quiz />} />
      
      {/* Coach Specific Onboarding */}
      <Route path="/onboarding/coach/welcome" element={<CoachWelcome />} />
      <Route path="/onboarding/coach/intro" element={<CoachQuizIntro />} />
      <Route path="/onboarding/coach/quiz" element={<CoachQuiz />} />
      <Route path="/coach/onboarding/complete" element={<CoachOnboardingComplete />} />
      <Route path="/join/:referralCode/:sprintId" element={<SprintInviteLanding />} />
      
      {/* Authenticated Dashboard Core */}
      <Route path="/dashboard" element={
        <ProtectedRoute roles={[UserRole.COACH, UserRole.PARTICIPANT, UserRole.ADMIN, UserRole.PARTNER]}>
          {activeRole === UserRole.COACH && <Navigate to="/coach/dashboard" replace />}
          {activeRole === UserRole.ADMIN && <Navigate to="/admin/dashboard" replace />}
          {activeRole === UserRole.PARTNER && <Navigate to="/partner/dashboard" replace />}
          {(activeRole === UserRole.PARTICIPANT || activeRole === UserRole.PARTNER) && <ParticipantLayout><ParticipantDashboard /></ParticipantLayout>}
        </ProtectedRoute>
      } />
      
      {/* Coach Track */}
      <Route element={<ProtectedRoute roles={[UserRole.COACH]}><CoachLayout /></ProtectedRoute>}>
         <Route path="/coach/dashboard" element={<CoachDashboard />} />
         <Route path="/coach/sprints" element={<CoachSprints />} />
         <Route path="/coach/participants" element={<CoachParticipants />} />
         <Route path="/coach/earnings" element={<CoachEarnings />} />
         <Route path="/coach/impact" element={<CoachImpact />} />
         <Route path="/coach/profile" element={<CoachProfile />} />
         <Route path="/coach/profile/settings" element={<CoachSettings />} />
         <Route path="/coach/profile/settings/edit" element={<CoachEditProfile />} />
      </Route>
      <Route path="/coach/sprint/new" element={<ProtectedRoute roles={[UserRole.COACH]}><CreateSprint /></ProtectedRoute>} />
      <Route path="/coach/sprint/edit/:sprintId" element={<ProtectedRoute roles={[UserRole.COACH, UserRole.ADMIN]}><EditSprint /></ProtectedRoute>} />
      <Route path="/coach/sprint/preview/:sprintId" element={<ProtectedRoute roles={[UserRole.COACH, UserRole.ADMIN]}><SprintPreviewPage /></ProtectedRoute>} /> {/* New Route */}
      
      {/* Participant Track */}
      <Route element={<ProtectedRoute roles={[UserRole.PARTICIPANT, UserRole.PARTNER]}><ParticipantLayout /></ProtectedRoute>}>
         <Route path="/discover" element={<DiscoverSprints />} />
         <Route path="/my-sprints" element={<MySprints />} />
         <Route path="/profile" element={<Profile />} />
         <Route path="/profile/settings" element={<AccountSettings />} />
         <Route path="/profile/settings/edit" element={<EditProfile />} />
         <Route path="/profile/settings/identity" element={<IdentitySettings />} />
          <Route path="/profile/archive" element={<RiseArchive />} />
          <Route path="/profile/hall-of-rise" element={<Badges />} />
         <Route path="/profile/:userId" element={<PublicProfile />} />
         <Route path="/growth" element={<GrowthDashboard />} />
         <Route path="/impact" element={<ImpactDashboard />} />
         <Route path="/impact/share" element={<ReferralShare />} />
         <Route path="/impact/ripple" element={<RippleEffect />} />
         <Route path="/impact/rewards" element={<GrowthRewards />} />
         <Route path="/impact/badges" element={<Badges />} />
         <Route path="/buy-coins" element={<BuyCoins />} />
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
      
      {/* Admin Track */}
      <Route path="/admin/dashboard" element={<ProtectedRoute roles={[UserRole.ADMIN]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/user/:userId" element={<ProtectedRoute roles={[UserRole.ADMIN]}><AdminUserDetail /></ProtectedRoute>} />
      <Route path="/admin/analytics/user/:identifier" element={<ProtectedRoute roles={[UserRole.ADMIN]}><UserAnalyticsDetail /></ProtectedRoute>} />
      <Route path="/admin/sprint/new" element={<ProtectedRoute roles={[UserRole.ADMIN]}><CreateFoundationalSprint /></ProtectedRoute>} />
      <Route path="/admin/coach/:coachId" element={<ProtectedRoute roles={[UserRole.ADMIN]}><AdminCoachDetail /></ProtectedRoute>} />
      <Route path="/admin/track/new" element={<ProtectedRoute roles={[UserRole.ADMIN]}><CreateTrack /></ProtectedRoute>} />
      <Route path="/admin/track/edit/:trackId" element={<ProtectedRoute roles={[UserRole.ADMIN]}><EditTrack /></ProtectedRoute>} />
      <Route path="/track/:trackId" element={<TrackDescriptionPage />} />
      
      <Route path="/sprint/preview/:sprintId" element={<SprintPreview />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
