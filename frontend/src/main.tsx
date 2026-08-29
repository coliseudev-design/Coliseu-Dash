import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { BranchProvider } from './contexts/BranchContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30s
      gcTime: 5 * 60_000,       // 5 min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Auto reload when dynamic import fails after a new deployment
window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

window.addEventListener('error', (event) => {
  if (
    event?.message?.includes('Failed to fetch dynamically imported module') ||
    event?.message?.includes('Expected a JavaScript-or-Wasm module script')
  ) {
    const lastReload = sessionStorage.getItem('last_chunk_reload')
    const now = Date.now()
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem('last_chunk_reload', String(now))
      window.location.reload()
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <BranchProvider>
          <App />
        </BranchProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
