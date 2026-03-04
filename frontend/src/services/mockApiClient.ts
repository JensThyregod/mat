import type { ApiClient } from './apiClient'
import type { SignupResponse, Student } from '../types'
import {
  fetchTasks,
  fetchTask,
  fetchAnswersForStudent,
  authenticateStudent,
  saveAnswer,
  loadTaskSetState,
  saveQuestionAnswer,
} from './mockApi'

export function createMockApiClient(): ApiClient {
  return {
    fetchTasks,
    fetchTask,
    fetchAnswersForStudent,
    authenticateStudent,
    async signupStudent(_name: string, _code: string, _email: string): Promise<SignupResponse> {
      return { message: 'Mock: konto oprettet', studentId: 'mock-id' }
    },
    async verifyEmail(_token: string): Promise<Student> {
      return { id: 'test', name: 'Test User', code: 'test', emailVerified: true }
    },
    async resendVerification(): Promise<void> {},
    saveAnswer,
    loadTaskSetState,
    saveQuestionAnswer,
  }
}
