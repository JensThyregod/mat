import type { AnswerRecord, Student, Task, TaskSetState } from '../types'

export interface ApiClient {
  fetchTasks(studentId: string): Promise<Task[]>
  fetchTask(studentId: string, taskId: string): Promise<Task | undefined>
  fetchAnswersForStudent(studentId: string): Promise<Record<string, AnswerRecord[]>>
  authenticateStudent(name: string, code: string): Promise<Student | null>
  saveAnswer(
    studentId: string,
    taskId: string,
    partIndex: number,
    partCount: number,
    answer: string,
  ): Promise<AnswerRecord>
  loadTaskSetState(studentId: string, taskId: string): Promise<TaskSetState | null>
  saveQuestionAnswer(
    studentId: string,
    taskId: string,
    partIndex: number,
    questionIndex: number,
    answer: string,
    validated: boolean,
    status: 'neutral' | 'correct' | 'incorrect',
  ): Promise<TaskSetState>
}
