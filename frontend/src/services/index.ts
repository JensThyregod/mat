import type { ApiClient } from './apiClient'
import { createMockApiClient } from './mockApiClient'
import { createHttpApiClient } from './httpApiClient'

export type { ApiClient } from './apiClient'

export function createApiClient(): ApiClient {
  const mode = import.meta.env.VITE_API_MODE ?? 'mock'
  if (mode === 'http') {
    return createHttpApiClient()
  }
  return createMockApiClient()
}
