import { makeAutoObservable, runInAction } from 'mobx'
import type { AnswerRecord, Task } from '../types'
import type { RootStore } from './storeProvider'

type SavingState = Record<string, boolean>

export class TaskStore {
  tasks: Task[] = []
  answers: Record<string, AnswerRecord[]> = {}
  loading = false
  error: string | null = null
  saving: SavingState = {}
  private root: RootStore

  constructor(root: RootStore) {
    makeAutoObservable(this)
    this.root = root
  }

  private get api() {
    return this.root.api
  }

  reset() {
    this.tasks = []
    this.answers = {}
    this.loading = false
    this.error = null
    this.saving = {}
  }

  get answeredTaskIds() {
    return new Set(
      Object.entries(this.answers)
        .filter(([, arr]) => arr.length > 0)
        .map(([taskId]) => taskId),
    )
  }

  answerFor(taskId: string, partIndex?: number) {
    const arr = this.answers[taskId] ?? []
    if (partIndex === undefined) return arr[0]
    return arr[partIndex]
  }

  async loadTasks(studentId: string) {
    this.loading = true
    this.error = null
    try {
      const [tasks, answers] = await Promise.all([
        this.api.fetchTasks(studentId),
        this.api.fetchAnswersForStudent(studentId),
      ])
      runInAction(() => {
        this.tasks = tasks
        this.answers = answers
        this.loading = false
      })
    } catch {
      runInAction(() => {
        this.error = 'Kunne ikke hente opgaverne.'
        this.loading = false
      })
    }
  }

  async getTask(taskId: string) {
    if (!this.root.authStore.student) return undefined
    const studentId = this.root.authStore.student.id
    const existing = this.tasks.find((t) => t.id === taskId)
    if (existing) return existing
    const fetched = await this.api.fetchTask(studentId, taskId)
    if (fetched) {
      runInAction(() => {
        this.tasks = [...this.tasks, fetched]
      })
    }
    return fetched
  }

  async submitAnswer(
    taskId: string,
    partIndex: number,
    partCount: number,
    answer: string,
  ) {
    if (!this.root.authStore.student) {
      this.error = 'Du skal være logget ind for at aflevere.'
      return null
    }
    const studentId = this.root.authStore.student.id
    this.saving = { ...this.saving, [`${taskId}-${partIndex}`]: true }
    try {
      const record = await this.api.saveAnswer(
        studentId,
        taskId,
        partIndex,
        partCount,
        answer,
      )
      runInAction(() => {
        const current = this.answers[taskId] ?? []
        const updated = [...current]
        updated[partIndex] = record
        this.answers = { ...this.answers, [taskId]: updated }
        const nextSaving = { ...this.saving }
        delete nextSaving[`${taskId}-${partIndex}`]
        this.saving = nextSaving
      })
      return record
    } catch {
      runInAction(() => {
        this.error = 'Fejl under gemning af svar.'
        const nextSaving = { ...this.saving }
        delete nextSaving[`${taskId}-${partIndex}`]
        this.saving = nextSaving
      })
      return null
    }
  }
}

