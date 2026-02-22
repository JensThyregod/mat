import type { ApiClient } from './apiClient'
import type { AnswerRecord, Student, Task, TaskSetState } from '../types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export function createHttpApiClient(): ApiClient {
  return {
    fetchTasks(studentId) {
      return request<Task[]>(`/students/${studentId}/tasks`)
    },

    fetchTask(studentId, taskId) {
      return request<Task | undefined>(`/students/${studentId}/tasks/${taskId}`)
    },

    fetchAnswersForStudent(studentId) {
      return request<Record<string, AnswerRecord[]>>(`/students/${studentId}/answers`)
    },

    authenticateStudent(name, code) {
      return request<Student | null>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ name, code }),
      })
    },

    saveAnswer(studentId, taskId, partIndex, partCount, answer) {
      return request<AnswerRecord>(`/students/${studentId}/tasks/${taskId}/answers`, {
        method: 'POST',
        body: JSON.stringify({ partIndex, partCount, answer }),
      })
    },

    loadTaskSetState(studentId, taskId) {
      return request<TaskSetState | null>(`/students/${studentId}/tasks/${taskId}/state`)
    },

    saveQuestionAnswer(studentId, taskId, partIndex, questionIndex, answer, validated, status) {
      return request<TaskSetState>(`/students/${studentId}/tasks/${taskId}/state`, {
        method: 'POST',
        body: JSON.stringify({ partIndex, questionIndex, answer, validated, status }),
      })
    },
  }
}
