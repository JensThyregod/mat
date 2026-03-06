import type { AnswerRecord, Task, TaskSetState } from '../types'

export type UserProfile = {
  id: string
  name: string
  email: string
  emailVerified: boolean
}

export interface ApiClient {
  setAccessToken(token: string | null): void
  getProfile(): Promise<UserProfile>
  fetchTasks(): Promise<Task[]>
  fetchTask(taskId: string): Promise<Task | undefined>
  fetchAnswersForStudent(): Promise<Record<string, AnswerRecord[]>>
  saveAnswer(
    taskId: string,
    partIndex: number,
    partCount: number,
    answer: string,
  ): Promise<AnswerRecord>
  loadTaskSetState(taskId: string): Promise<TaskSetState | null>
  saveQuestionAnswer(
    taskId: string,
    partIndex: number,
    questionIndex: number,
    answer: string,
    validated: boolean,
    status: 'neutral' | 'correct' | 'incorrect',
  ): Promise<TaskSetState>
}
