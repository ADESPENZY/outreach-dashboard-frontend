import { BrowserRouter, Route, Routes,  } from 'react-router'
import Dashboard from './pages/Dashboard'
import Analytics from './components/Analytics'
import Inboxes from './components/Inboxes'
import JobTracker from './components/JobTracker.jsx'
import WarmUp from './components/WarmUp'
import Settings from './components/Settings'
import DashboardPage from './components/DashboardPage'
import { ToastContainer } from 'react-toastify'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import JobsPage from './pages/JobsPage'
import ConnectedAccounts from './components/ConnectedAccounts'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path='analytics' element={<Analytics />} />
          <Route path='inboxes' element={<Inboxes />} />
          <Route path='job-tracker' element={<JobTracker />} />
          <Route path='jobs' element={<JobsPage />} />
          <Route path='warmup' element={<WarmUp />} />
          <Route path='settings' element={<Settings/>} />
          <Route path='connectedAccounts' element={<ConnectedAccounts/>} />
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
        theme="light" // or "dark"
      />
    </BrowserRouter>
  )
}

export default App
