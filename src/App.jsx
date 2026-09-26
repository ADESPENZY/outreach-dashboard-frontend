import { BrowserRouter, Route, Routes, Navigate } from 'react-router';
import { lazy, Suspense } from 'react';
import { ToastContainer } from 'react-toastify';
import LandingPage from './pages/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

// Everything below the marketing page is code-split. "/" is now a public
// landing page, and a visitor who never signs in should not be made to
// download the dashboard, the charts, or the settings tree to read it.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DashboardPage = lazy(() => import('./components/DashboardPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const OutreachPage = lazy(() => import('./pages/OutreachPage'));
const ProgressPage = lazy(() => import('./pages/progress/ProgressPage'));
const InterviewPrepPage = lazy(() => import('./pages/InterviewPrepPage'));
const InterviewPrepNewPage = lazy(() => import('./pages/InterviewPrepNewPage'));
const InterviewLivePage = lazy(() => import('./pages/InterviewLivePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const SettingsHomeRoute = lazy(() =>
  import('./components/settings/SettingsMobile').then((m) => ({ default: m.SettingsHomeRoute })),
);
const SettingsSectionRoute = lazy(() =>
  import('./components/settings/SettingsMobile').then((m) => ({ default: m.SettingsSectionRoute })),
);
const SettingsTabRedirect = lazy(() =>
  import('./components/settings/SettingsMobile').then((m) => ({ default: m.SettingsTabRedirect })),
);
import ErrorBoundary from './components/ErrorBoundary';
import AppBootLoader from './components/AppBootLoader';
import VersionCheck from './components/VersionCheck';
import InstallPrompt from './components/InstallPrompt';
import PushPrompt from './components/PushPrompt';
import { useEffect, useState } from 'react';
import { ApplyDirLoader } from './components/ui/ApplyDirLoader';

// TEMP — visual verification of the branded Screen loader. Flip to false (or
// delete this block + the <ApplyDirLoader.Screen> below) once verified. It just
// shows the loading identity for 2s on initial load.
// OFF for production — it was adding a flat 2s delay to every page load.
const SHOW_BOOT_DEMO = false;

function App() {
  const [bootDemo, setBootDemo] = useState(SHOW_BOOT_DEMO);

  useEffect(() => {
    if (!SHOW_BOOT_DEMO) return undefined;
    const t = setTimeout(() => setBootDemo(false), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AuthProvider>
      {/* TEMP demo — see note above */}
      {SHOW_BOOT_DEMO && <ApplyDirLoader.Screen isLoading={bootDemo} />}
      <AppBootLoader />
      <BrowserRouter>
        {/* Boundary wraps only the routed pages — a page crash shows the
            branded fallback while the toasts/version/install prompts below
            keep working. */}
        <ErrorBoundary>
          <Suspense fallback={null}>
          <Routes>
            {/* Public */}
            <Route index element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy" element={<LegalPage doc="privacy" />} />
            <Route path="/terms" element={<LegalPage doc="terms" />} />

            {/* Onboarding wizard removed — setup is progressive (Profile page,
                CV drawer, Auto-Scout, Inboxes). Old links redirect to Profile. */}
            <Route element={<ProtectedRoute requireOnboarding={false} />}>
              <Route path="/onboarding" element={<SettingsTabRedirect tab="profile" />} />
            </Route>

            {/* Dashboard — JWT only; onboarding is now optional (progressive disclosure) */}
            <Route element={<ProtectedRoute requireOnboarding={false} />}>
              <Route path="/dashboard" element={<Dashboard />}>
                {/* ── The 5 product pages ──────────────────────────────── */}
                <Route index                    element={<DashboardPage />} />   {/* Home */}
                <Route path="opportunities"     element={<JobsPage />} />        {/* was Jobs */}
                <Route path="introductions"     element={<OutreachPage />} />    {/* was Outreach */}
                <Route path="progress"          element={<ProgressPage />} />    {/* new: merges Analytics + JobTracker + Inboxes later */}
                <Route path="interview"         element={<InterviewPrepPage />} />
                <Route path="interview/new"     element={<InterviewPrepNewPage />} />
                <Route path="interview/:sessionId/live" element={<InterviewLivePage />} />  {/* placeholder until the live layer */}
                {/* Settings is two-faced by breakpoint: at md+ both routes
                    render the unchanged tab-rail page; below md, `settings`
                    is a grouped row list and `settings/<slug>` is one section
                    per screen (see components/settings/SettingsMobile.jsx). */}
                <Route path="settings"          element={<SettingsHomeRoute />} />
                <Route path="settings/:section" element={<SettingsSectionRoute />} />
                {/* Old standalone Profile page retired — it now lives as the
                    Profile tab inside Settings. */}
                <Route path="profile"           element={<SettingsTabRedirect tab="profile" />} />

                {/* ── Redirects: old paths → new homes ─────────────────── */}
                <Route path="jobs"              element={<Navigate to="/dashboard/opportunities" replace />} />
                <Route path="outreach"          element={<Navigate to="/dashboard/introductions" replace />} />
                <Route path="analytics"         element={<Navigate to="/dashboard/progress" replace />} />
                <Route path="job-tracker"       element={<Navigate to="/dashboard/progress" replace />} />
                {/* Inboxes, Warmup, and Auto-Scout pages removed — they now live
                    inside Settings (Connected Emails) / onboarding. */}
                <Route path="inboxes"           element={<Navigate to="/dashboard/settings" replace />} />
                <Route path="warmup"            element={<Navigate to="/dashboard/settings" replace />} />
                <Route path="auto-scout"        element={<Navigate to="/dashboard/settings" replace />} />
                <Route path="connectedAccounts" element={<Navigate to="/dashboard/settings" replace />} />
              </Route>
            </Route>

            {/* Catch-all — an unmatched path used to render an empty tree
                (blank white screen). MUST stay the LAST route so it can never
                shadow a real path. */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </ErrorBoundary>

        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />

        {/* Graceful "new version available" prompt (Vercel free-tier safe) */}
        <VersionCheck />

        {/* PWA install nudge — one-tap on Android, "Add to Home Screen" on iOS */}
        <InstallPrompt />

        {/* Gentle push opt-in, shown after the user's first sent intro */}
        <PushPrompt />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
