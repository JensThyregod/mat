import type { ApiClient, UserProfile } from './apiClient'
import type { AnswerRecord, Task, TaskSetState } from '../types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

let _accessToken: string | null = null

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...init,
  })
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body?.detail ?? body?.title ?? ''
    } catch {
      /* response wasn't JSON */
    }
    throw new Error(detail || `API ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...init,
  })
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body?.detail ?? body?.title ?? ''
    } catch {
      /* response wasn't JSON */
    }
    throw new Error(detail || `API ${res.status}: ${res.statusText}`)
  }
}

export function createHttpApiClient(): ApiClient {
  return {
    setAccessToken(token: string | null) {
      _accessToken = token
    },

    getProfile() {
      return request<UserProfile>('/auth/me')
    },

    deleteUser() {
      return requestVoid('/auth/me', { method: 'DELETE' })
    },

    fetchTasks() {
      return request<Task[]>('/students/me/tasks')
    },

    fetchTask(taskId) {
      return request<Task | undefined>(`/students/me/tasks/${taskId}`)
    },

    fetchAnswersForStudent() {
      return request<Record<string, AnswerRecord[]>>('/students/me/answers')
    },

    saveAnswer(taskId, partIndex, partCount, answer) {
      return request<AnswerRecord>(`/students/me/tasks/${taskId}/answers`, {
        method: 'POST',
        body: JSON.stringify({ partIndex, partCount, answer }),
      })
    },

    loadTaskSetState(taskId) {
      return request<TaskSetState | null>(`/students/me/tasks/${taskId}/state`)
    },

    saveQuestionAnswer(taskId, partIndex, questionIndex, answer, validated, status) {
      return request<TaskSetState>(`/students/me/tasks/${taskId}/state`, {
        method: 'POST',
        body: JSON.stringify({ partIndex, questionIndex, answer, validated, status }),
      })
    },
  }
}
