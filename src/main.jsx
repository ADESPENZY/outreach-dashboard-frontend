import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// FIRST: register the beforeinstallprompt listener before Chrome fires it —
// a component-level listener mounts too late and misses the event.
import './services/pwaInstall'
import './index.css'
import App from './App.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'

// Sane defaults so a single failing/slow endpoint can't turn into a request
// storm: retry once (not the default 3×), don't refetch on every window focus,
// and treat data as fresh for a minute. This keeps the backend from being
// hammered by N queries × 3 retries when something hiccups.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
})

// Keep the installed PWA fresh. vite-plugin-pwa (registerType: 'autoUpdate')
// already registers the service worker and reloads when a new one activates —
// but by default it only checks for a new version on a cold launch, which on
// iOS can lag for hours. We nudge the check on every focus + once a minute, so
// a deploy reaches the installed app within ~a minute of it being open instead
// of whenever iOS decides to look.
if ('serviceWorker' in navigator) {
  const checkForUpdate = () => {
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg && reg.update())
      .catch(() => {})
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate()
  })
  window.addEventListener('focus', checkForUpdate)
  setInterval(checkForUpdate, 60 * 1000)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
