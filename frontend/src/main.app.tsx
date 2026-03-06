import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from 'react-oidc-context'
import App from './App.tsx'
import { StoreProvider, createRootStore } from './stores/storeProvider'
import { oidcConfig } from './auth/oidcConfig'
import './index.css'
import 'katex/dist/katex.min.css'

const store = createRootStore()

export default function AppEntrypoint() {
  return (
    <AuthProvider {...oidcConfig}>
      <StoreProvider value={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StoreProvider>
    </AuthProvider>
  )
}
