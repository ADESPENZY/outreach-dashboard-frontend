import { useState, useEffect } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router';
import Dashboard from './pages/Dashboard';
import Analytics from './components/Analytics';
import Inboxes from './components/Inboxes';
import JobTracker from './components/JobTracker.jsx';
import WarmUp from './components/WarmUp';
import Settings from './components/Settings';
import DashboardPage from './components/DashboardPage';
import { ToastContainer } from 'react-toastify';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import JobsPage from './pages/JobsPage';
import ConnectedAccounts from './components/ConnectedAccounts';
import Onboarding from './pages/Onboarding';
import ProfilePage from './pages/ProfilePage';
import Spinner from './components/Spinner';
import { getProfile } from './services/apiBlog';

/**
 * Wraps Dashboard routes. After JWT auth passes, checks if the user has
 * completed onboarding. If not, redirects to /onboarding.
 * Only runs once per Dashboard mount so inner navigation isn't affected.
 */
function OnboardingGuard({ children }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'redirect'

  useEffect(() => {
    getProfile()
      .then(profile => {
        setStatus(profile?.onboarding_complete ? 'ok' : 'redirect');
      })
      .catch(() => setStatus('redirect'));
  }, []);

  if (status === 'loading') return <Spinner />;
  if (status === 'redirect') return <Navigate to="/onboarding" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route index element={<LoginPage />} />

        {/* Onboarding — JWT protected but outside dashboard layout */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* Dashboard — JWT + onboarding guard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <OnboardingGuard>
                <Dashboard />
              </OnboardingGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="analytics"         element={<Analytics />} />
          <Route path="inboxes"           element={<Inboxes />} />
          <Route path="job-tracker"       element={<JobTracker />} />
          <Route path="jobs"              element={<JobsPage />} />
          <Route path="warmup"            element={<WarmUp />} />
          <Route path="settings"          element={<Settings />} />
          <Route path="connectedAccounts" element={<ConnectedAccounts />} />
          <Route path="profile"           element={<ProfilePage />} />
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
    </BrowserRouter>
  );
}

export default App;
