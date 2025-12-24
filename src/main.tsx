import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { StoreProvider, createRootStore } from './stores/storeProvider'
import './index.css'
import 'katex/dist/katex.min.css'

const store = createRootStore()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider value={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StoreProvider>
  </StrictMode>,
)
