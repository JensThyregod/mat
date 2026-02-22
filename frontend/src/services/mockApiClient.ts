import type { ApiClient } from './apiClient'
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
    saveAnswer,
    loadTaskSetState,
    saveQuestionAnswer,
  }
}
