import { makeAutoObservable, runInAction } from 'mobx'
import type { Student } from '../types'
import { readJson, writeJson } from '../utils/storage'
import type { RootStore } from './storeProvider'
import { authenticateStudent } from '../services/mockApi'

const STUDENT_KEY = 'mock.student'

export class AuthStore {
  student: Student | null = null
  loading = false
  error: string | null = null
  private root: RootStore

  constructor(root: RootStore) {
    makeAutoObservable(this)
    this.root = root
    this.hydrate()
  }

  hydrate() {
    const saved = readJson<Student | null>(STUDENT_KEY, null)
    if (saved) {
      this.student = saved
    }
  }

  async login(name: string, code: string) {
    if (!name.trim() || !code.trim()) {
      this.error = 'Skriv både navn og klassekode.'
      return false
    }
    this.loading = true
    this.error = null
    const student = await authenticateStudent(name, code)
    runInAction(() => {
      if (student) {
        this.student = student
        writeJson(STUDENT_KEY, student)
        this.root.taskStore.loadTasks(student.id)
      } else {
        this.error = 'Ugyldigt login. Tjek navn/kode.'
      }
      this.loading = false
    })
    return Boolean(student)
  }

  logout() {
    this.student = null
    this.error = null
    this.loading = false
    writeJson(STUDENT_KEY, null)
    this.root.taskStore.reset()
  }
}

