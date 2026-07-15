import { BrowserRouter, Route, Routes, Navigate } from 'react-router';
import Dashboard from './pages/Dashboard';
import Settings from './components/Settings';
import DashboardPage from './components/DashboardPage';
import { ToastContainer } from 'react-toastify';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import JobsPage from './pages/JobsPage';
import OutreachPage from './pages/OutreachPage';
import ProgressPage from './pages/ProgressPage';
import RegisterPage from './pages/RegisterPage';
import LegalPage from './pages/LegalPage';
import { AuthProvider } from './context/AuthContext';
import AppBootLoader from './components/AppBootLoader';
import VersionCheck from './components/VersionCheck';
import InstallPrompt from './components/InstallPrompt';
import { useEffect, useState } from 'react';
import { ApplyDirLoader } from './components/ui/ApplyDirLoader';

// TEMP — visual verification of the branded Screen loader. Flip to false (or
// delete this block + the <ApplyDirLoader.Screen> below) once verified. It just
// shows the loading identity for 2s on initial load.
const SHOW_BOOT_DEMO = true;

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
        <Routes>
          {/* Public */}
          <Route index element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/privacy" element={<LegalPage doc="privacy" />} />
          <Route path="/terms" element={<LegalPage doc="terms" />} />

          {/* Onboarding wizard removed — setup is progressive (Profile page,
              CV drawer, Auto-Scout, Inboxes). Old links redirect to Profile. */}
          <Route element={<ProtectedRoute requireOnboarding={false} />}>
            <Route path="/onboarding" element={<Navigate to="/dashboard/settings?tab=profile" replace />} />
          </Route>

          {/* Dashboard — JWT only; onboarding is now optional (progressive disclosure) */}
          <Route element={<ProtectedRoute requireOnboarding={false} />}>
            <Route path="/dashboard" element={<Dashboard />}>
              {/* ── The 4 product pages ──────────────────────────────── */}
              <Route index                    element={<DashboardPage />} />   {/* Home */}
              <Route path="opportunities"     element={<JobsPage />} />        {/* was Jobs */}
              <Route path="introductions"     element={<OutreachPage />} />    {/* was Outreach */}
              <Route path="progress"          element={<ProgressPage />} />    {/* new: merges Analytics + JobTracker + Inboxes later */}
              <Route path="settings"          element={<Settings />} />
              {/* Old standalone Profile page retired — it now lives as the
                  Profile tab inside Settings. */}
              <Route path="profile"           element={<Navigate to="/dashboard/settings?tab=profile" replace />} />

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
        </Routes>

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
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
