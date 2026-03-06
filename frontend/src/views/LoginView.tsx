import { Navigate } from 'react-router-dom'

/**
 * @deprecated Login is now handled by Keycloak. This component redirects to the landing page.
 */
export const LoginView = () => {
  return <Navigate to="/" replace />
}
