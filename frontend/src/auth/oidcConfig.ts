import type { AuthProviderProps } from 'react-oidc-context'

const authority = import.meta.env.VITE_OIDC_AUTHORITY ?? 'http://localhost:8080'
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID ?? 'mat-frontend'

export const oidcConfig: AuthProviderProps = {
  authority,
  client_id: clientId,
  redirect_uri: window.location.origin + '/callback',
  post_logout_redirect_uri: window.location.origin,
  scope: 'openid profile email',
  response_type: 'code',
  automaticSilentRenew: true,
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname)
  },
}
