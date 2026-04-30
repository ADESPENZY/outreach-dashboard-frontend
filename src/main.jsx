import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // staleTime: 0 (default) — always refetch in the background on mount,
      // but show cached data instantly so there's no loading spinner on navigation.
      // This is the stale-while-revalidate pattern React Query is built around.
      retry: 1,                    // retry a failed request once before surfacing the error
      refetchOnWindowFocus: false, // don't silently refetch when the user alt-tabs back
    },
    mutations: {
      retry: 0, // mutations should never auto-retry — the user must explicitly retry
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
