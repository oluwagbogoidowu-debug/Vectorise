import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { UserRole } from './types';
import ParticipantLayout from './components/ParticipantLayout';
import CoachLayout from './components/CoachLayout';

// Lazy loaded page components for lightning fast initial page loads
const LoginPage = lazy(() => import('./pages/Auth/LoginPage'));
const SignUpPage = lazy(() => import('./pages/Auth/SignUpPage'));
const VerifyEmailPage = lazy(() => import('./pages/Auth/VerifyEmailPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const CreateSprint = lazy(() => import('./pages/Coach/CreateSprint'));
const EditSprint = lazy(() => import('./pages/Coach/EditSprint'));
const SprintLandingPage = lazy(() => import('./pages/Participant/SprintLandingPage'));
const DiscoverSprints = lazy(() => import('./pages/Participant/DiscoverSprints'));
const ParticipantDashboard = lazy(() => import('./pages/Participant/ParticipantDashboard'));
const SprintView = lazy(() => import('./pages/Participant/SprintView'));
const DaySuccessPage = lazy(() => import('./pages/Participant/DaySuccessPage'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const UserAnalyticsDetail = lazy(() => import('./pages/Admin/UserAnalyticsDetail'));

const AdminCoachDetail = lazy(() => import('./pages/Admin/AdminCoachDetail'));
const AdminUserDetail = lazy(() => import('./pages/Admin/AdminUserDetail'));
const CreateTrack = lazy(() => import('./pages/Admin/CreateTrack'));
const EditTrack = lazy(() => import('./pages/Admin/EditTrack'));
const RoleSelectorPage = lazy(() => import('./pages/Admin/RoleSelectorPage'));
const TrackDescriptionPage = lazy(() => import('./pages/TrackDescriptionPage'));
const PublicDiscover = lazy(() => import('./pages/PublicDiscover'));
const Welcome = lazy(() => import('./pages/Onboarding/Welcome').then(m => ({ default: m.Welcome })));
const QuizIntro = lazy(() => import('./pages/Onboarding/QuizIntro'));
const Quiz = lazy(() => import('./pages/Onboarding/Quiz'));
const RecommendedSprints = lazy(() => import('./pages/Participant/RecommendedSprints'));
const Profile = lazy(() => import('./pages/Participant/Profile'));
const CoachProfile = lazy(() => import('./pages/Coach/CoachProfile'));
const PublicProfile = lazy(() => import('./pages/Participant/PublicProfile'));
const MySprints = lazy(() => import('./pages/Participant/MySprints'));
const GrowthDashboard = lazy(() => import('./pages/Participant/GrowthDashboard'));
const SprintInviteLanding = lazy(() => import('./pages/Participant/SprintInviteLanding'));
const PartnerPage = lazy(() => import('./pages/Partner/PartnerPage'));
const PartnerApply = lazy(() => import('./pages/Partner/PartnerApply'));
const PartnerDashboard = lazy(() => import('./pages/Partner/PartnerDashboard'));

const FocusSelector = lazy(() => import('./pages/Onboarding/FocusSelector'));
const StartHerePage = lazy(() => import('./pages/Onboarding/StartHere'));
const CommitmentFraming = lazy(() => import('./pages/Onboarding/CommitmentFraming'));
const SprintPayment = lazy(() => import('./pages/Onboarding/SprintPayment'));
const TheMap = lazy(() => import('./pages/Onboarding/TheMap'));
const CoachWelcome = lazy(() => import('./pages/Onboarding/CoachWelcome').then(m => ({ default: m.CoachWelcome })));
const CoachQuizIntro = lazy(() => import('./pages/Onboarding/CoachQuizIntro'));
const CoachQuiz = lazy(() => import('./pages/Onboarding/CoachQuiz'));
const CoachOnboardingComplete = lazy(() => import('./pages/Coach/CoachOnboardingComplete'));
const CoachDashboard = lazy(() => import('./pages/Coach/CoachDashboard'));
const CoachSprints = lazy(() => import('./pages/Coach/CoachSprints'));
const CoachParticipants = lazy(() => import('./pages/Coach/CoachParticipants'));
const CoachEarnings = lazy(() => import('./pages/Coach/CoachEarnings'));
const CoachImpact = lazy(() => import('./pages/Coach/CoachImpact'));
const CoachSettings = lazy(() => import('./pages/Coach/Profile/AccountSettings'));
const CoachEditProfile = lazy(() => import('./pages/Coach/Profile/EditProfile'));
const SprintPreviewPage = lazy(() => import('./pages/Coach/SprintPreviewPage'));

const ImpactDashboard = lazy(() => import('./pages/Participant/Impact/ImpactDashboard'));
const GrowthRewards = lazy(() => import('./pages/Participant/Impact/GrowthRewards'));
const Badges = lazy(() => import('./pages/Participant/Impact/Badges'));
const ReferralSuccess = lazy(() => import('./pages/Participant/Impact/ReferralSuccess'));
const PaymentSuccess = lazy(() => import('./pages/Participant/PaymentSuccess'));

const AccountSettings = lazy(() => import('./pages/Participant/Profile/AccountSettings'));
const EditProfile = lazy(() => import('./pages/Participant/Profile/EditProfile'));
const IdentitySettings = lazy(() => import('./pages/Participant/Profile/IdentitySettings'));
const SprintSettings = lazy(() => import('./pages/Participant/Profile/SprintSettings'));
const RiseArchive = lazy(() => import('./pages/Participant/Profile/RiseArchive'));

const BuyCoins = lazy(() => import('./pages/Participant/BuyCoins'));
const NextSprintRecommendation = lazy(() => import('./pages/Participant/NextSprintRecommendation'));
const SprintPreview = lazy(() => import('./pages/Participant/SprintPreview'));
const RiseBlog = lazy(() => import('./pages/Participant/RiseBlog'));

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[50vh] w-full">
    <div className="w-8 h-8 border-3 border-[#0E7850] border-t-transparent rounded-full animate-spin"></div>
  </div>
);

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { user, activeRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA]">
        <div className="w-10 h-10 border-4 border-[#0E7850] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
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
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <SignUpPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/" element={
          user 
            ? <Navigate to={`/dashboard${location.search}`} replace />
            : <HomePage />
        } />
        <Route path="/welcome" element={<HomePage />} />
        <Route path="/recommended" element={<RecommendedSprints />} />
        <Route path="/partner" element={<PartnerPage />} />
        <Route path="/partner/apply" element={<PartnerApply />} />
        <Route path="/partner/dashboard" element={<ProtectedRoute roles={[UserRole.PARTNER, UserRole.ADMIN]}><PartnerDashboard /></ProtectedRoute>} />
        
        {/* Consolidated Onboarding Paths */}
        <Route path="/onboarding/welcome" element={<Welcome />} />
        <Route path="/onboarding/focus-selector" element={<FocusSelector />} />
        <Route path="/onboarding/start-here" element={<StartHerePage />} />
        <Route path="/onboarding/start-here/:sprintId" element={<StartHerePage />} />
        <Route path="/onboarding/description/:sprintId" element={<SprintLandingPage />} />
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
        <Route path="/coach/sprint/preview/:sprintId" element={<ProtectedRoute roles={[UserRole.COACH, UserRole.ADMIN]}><SprintPreviewPage /></ProtectedRoute>} />
        
        {/* Participant Track */}
        {/* Public Discover */}
        <Route path="/discover" element={<PublicDiscover />} />

        <Route element={<ProtectedRoute roles={[UserRole.PARTICIPANT, UserRole.PARTNER]}><ParticipantLayout /></ProtectedRoute>}>
           <Route path="/explore" element={<DiscoverSprints />} />
           <Route path="/my-sprints" element={<MySprints />} />
           <Route path="/profile" element={<Profile />} />
           <Route path="/profile/settings" element={<AccountSettings />} />
           <Route path="/profile/settings/edit" element={<EditProfile />} />
           <Route path="/profile/settings/identity" element={<IdentitySettings />} />
           <Route path="/profile/settings/sprint" element={<SprintSettings />} />
            <Route path="/profile/archive" element={<RiseArchive />} />
            <Route path="/profile/hall-of-rise" element={<Badges />} />
           <Route path="/profile/:userId" element={<PublicProfile />} />
           <Route path="/growth" element={<GrowthDashboard />} />
           <Route path="/impact" element={<ImpactDashboard />} />
           <Route path="/impact/rewards" element={<GrowthRewards />} />
           <Route path="/impact/badges" element={<Badges />} />
           <Route path="/buy-coins" element={<BuyCoins />} />
           <Route path="/participant/day-success" element={<DaySuccessPage />} />
           <Route path="/participant/next-sprint" element={<NextSprintRecommendation />} />
           <Route path="/participant/next-sprint/:sprintId" element={<NextSprintRecommendation />} />
           <Route path="/participant/recommendation" element={<NextSprintRecommendation />} />
        </Route>

        {/* Public RiseBlog routes */}
        <Route element={<ParticipantLayout />}>
           <Route path="/blog" element={<RiseBlog />} />
           <Route path="/blog/:postId" element={<RiseBlog />} />
           <Route path="/:audienceSlug/:blogSlug" element={<RiseBlog />} />
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
        <Route path="/admin/role-selector" element={<ProtectedRoute roles={[UserRole.ADMIN]}><RoleSelectorPage /></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute roles={[UserRole.ADMIN]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/user/:userId" element={<ProtectedRoute roles={[UserRole.ADMIN]}><AdminUserDetail /></ProtectedRoute>} />
        <Route path="/admin/analytics/user/:identifier" element={<ProtectedRoute roles={[UserRole.ADMIN]}><UserAnalyticsDetail /></ProtectedRoute>} />
        <Route path="/admin/coach/:coachId" element={<ProtectedRoute roles={[UserRole.ADMIN]}><AdminCoachDetail /></ProtectedRoute>} />
        <Route path="/admin/track/new" element={<ProtectedRoute roles={[UserRole.ADMIN]}><CreateTrack /></ProtectedRoute>} />
        <Route path="/admin/track/edit/:trackId" element={<ProtectedRoute roles={[UserRole.ADMIN]}><EditTrack /></ProtectedRoute>} />
        <Route path="/track/:trackId" element={<TrackDescriptionPage />} />
        
        <Route path="/sprint/preview/:sprintId" element={<SprintPreview />} />
        <Route path="/sprint" element={<Navigate to="/discover" replace />} />
        <Route path="/sprints" element={<Navigate to="/discover" replace />} />
        <Route path="/track" element={<Navigate to="/discover" replace />} />
        <Route path="/tracks" element={<Navigate to="/discover" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
