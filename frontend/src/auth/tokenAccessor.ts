let _currentToken: string | null = null

export function setCurrentAccessToken(token: string | null) {
  _currentToken = token
}

export function getCurrentAccessToken(): string | null {
  return _currentToken
}

export function getStreamingAuthHeaders(): Record<string, string> {
  if (_currentToken) {
    return { Authorization: `Bearer ${_currentToken}` }
  }
  return {}
}
