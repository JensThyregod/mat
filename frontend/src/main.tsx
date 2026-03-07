import { createRoot } from 'react-dom/client'
import { StrictMode, lazy, Suspense } from 'react'

const AppEntrypoint = lazy(() => import('./main.app'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense>
      <AppEntrypoint />
    </Suspense>
  </StrictMode>,
)
