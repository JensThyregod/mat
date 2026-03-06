import type { ApiClient, UserProfile } from './apiClient'
import {
  fetchTasks,
  fetchTask,
  fetchAnswersForStudent,
  saveAnswer,
  loadTaskSetState,
  saveQuestionAnswer,
} from './mockApi'

const MOCK_STUDENT_ID = 'test'

export function createMockApiClient(): ApiClient {
  return {
    setAccessToken() {},

    async getProfile(): Promise<UserProfile> {
      return { id: MOCK_STUDENT_ID, name: 'Test User', email: 'test@test.dk', emailVerified: true, isTestUser: true }
    },

    async deleteUser(): Promise<void> {
      console.log('Mock: deleteUser called')
    },

    fetchTasks() {
      return fetchTasks(MOCK_STUDENT_ID)
    },

    fetchTask(taskId) {
      return fetchTask(MOCK_STUDENT_ID, taskId)
    },

    fetchAnswersForStudent() {
      return fetchAnswersForStudent(MOCK_STUDENT_ID)
    },

    saveAnswer(taskId, partIndex, partCount, answer) {
      return saveAnswer(MOCK_STUDENT_ID, taskId, partIndex, partCount, answer)
    },

    loadTaskSetState(taskId) {
      return loadTaskSetState(MOCK_STUDENT_ID, taskId)
    },

    saveQuestionAnswer(taskId, partIndex, questionIndex, answer, validated, status) {
      return saveQuestionAnswer(MOCK_STUDENT_ID, taskId, partIndex, questionIndex, answer, validated, status)
    },
  }
}
