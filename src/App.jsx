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
import OutreachPage from './pages/OutreachPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import AutoScoutSettings from './pages/AutoScoutSettings';
import { AuthProvider } from './context/AuthContext';
import AppBootLoader from './components/AppBootLoader';

function App() {
  return (
    <AuthProvider>
      <AppBootLoader />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route index element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Onboarding wizard removed — setup is progressive (Profile page,
              CV drawer, Auto-Scout, Inboxes). Old links redirect to Profile. */}
          <Route element={<ProtectedRoute requireOnboarding={false} />}>
            <Route path="/onboarding" element={<Navigate to="/dashboard/profile" replace />} />
          </Route>

          {/* Dashboard — JWT only; onboarding is now optional (progressive disclosure) */}
          <Route element={<ProtectedRoute requireOnboarding={false} />}>
            <Route path="/dashboard" element={<Dashboard />}>
              <Route index element={<DashboardPage />} />
              <Route path="analytics"         element={<Analytics />} />
              <Route path="inboxes"           element={<Inboxes />} />
              <Route path="job-tracker"       element={<JobTracker />} />
              <Route path="jobs"              element={<JobsPage />} />
              <Route path="outreach"          element={<OutreachPage />} />
              <Route path="warmup"            element={<WarmUp />} />
              <Route path="settings"          element={<Settings />} />
              <Route path="auto-scout"        element={<AutoScoutSettings />} />
              {/* Consolidated into Inboxes — keep the old path working */}
              <Route path="connectedAccounts" element={<Navigate to="/dashboard/inboxes" replace />} />
              <Route path="profile"           element={<ProfilePage />} />
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
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
