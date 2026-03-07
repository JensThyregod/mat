import { Navigate } from 'react-router-dom'

/**
 * @deprecated Email verification is now handled by Zitadel. This component redirects to the landing page.
 */
export const VerifyEmailView = () => {
  return <Navigate to="/" replace />
}
