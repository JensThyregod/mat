import { makeAutoObservable, runInAction } from 'mobx'
import type { Student } from '../types'
import { readJson, writeJson } from '../utils/storage'
import type { RootStore } from './storeProvider'

const STUDENT_KEY = 'mock.student'

export class AuthStore {
  student: Student | null = null
  loading = false
  error: string | null = null
  successMessage: string | null = null
  emailNotVerified = false
  resendCooldown = 0
  private root: RootStore
  private cooldownTimer: ReturnType<typeof setInterval> | null = null

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
      this.error = 'Skriv både brugernavn og kode.'
      return false
    }
    this.loading = true
    this.error = null
    this.successMessage = null
    this.emailNotVerified = false

    try {
      const student = await this.root.api.authenticateStudent(name, code)
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
    } catch (err: unknown) {
      runInAction(() => {
        const message = err instanceof Error ? err.message : String(err)
        if (message.includes('403')) {
          this.emailNotVerified = true
          this.error = 'Du skal bekræfte din email før du kan logge ind. Tjek din indbakke.'
        } else {
          this.error = 'Ugyldigt login. Tjek navn/kode.'
        }
        this.loading = false
      })
      return false
    }
  }

  async signup(name: string, code: string, email: string) {
    if (!name.trim() || !code.trim() || !email.trim()) {
      this.error = 'Alle felter skal udfyldes.'
      return false
    }
    this.loading = true
    this.error = null
    this.successMessage = null

    try {
      const result = await this.root.api.signupStudent(name, code, email)
      runInAction(() => {
        this.successMessage = result.message
        this.loading = false
      })
      return true
    } catch (err: unknown) {
      runInAction(() => {
        const message = err instanceof Error ? err.message : String(err)
        if (message.includes('409')) {
          this.error = 'Brugernavn eller email er allerede i brug.'
        } else {
          this.error = 'Noget gik galt. Prøv igen.'
        }
        this.loading = false
      })
      return false
    }
  }

  async verifyEmail(token: string) {
    this.loading = true
    this.error = null

    try {
      const student = await this.root.api.verifyEmail(token)
      runInAction(() => {
        this.student = student
        writeJson(STUDENT_KEY, student)
        this.root.taskStore.loadTasks(student.id)
        this.loading = false
      })
      return true
    } catch {
      runInAction(() => {
        this.error = 'Bekræftelses-linket er ugyldigt eller udløbet.'
        this.loading = false
      })
      return false
    }
  }

  async resendVerification(name: string, code: string) {
    this.loading = true
    this.error = null

    try {
      await this.root.api.resendVerification(name, code)
      runInAction(() => {
        this.successMessage = 'Ny bekræftelses-email sendt! Tjek din indbakke.'
        this.loading = false
        this.startCooldown(60)
      })
      return true
    } catch (err: unknown) {
      runInAction(() => {
        const message = err instanceof Error ? err.message : String(err)
        if (message.includes('429')) {
          this.emailNotVerified = true
          this.error = 'Vent venligst før du sender en ny bekræftelses-email.'
          this.startCooldown(60)
        } else {
          this.error = 'Kunne ikke sende email. Prøv igen.'
        }
        this.loading = false
      })
      return false
    }
  }

  private startCooldown(seconds: number) {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer)
    this.resendCooldown = seconds
    this.cooldownTimer = setInterval(() => {
      runInAction(() => {
        this.resendCooldown--
        if (this.resendCooldown <= 0) {
          this.resendCooldown = 0
          if (this.cooldownTimer) {
            clearInterval(this.cooldownTimer)
            this.cooldownTimer = null
          }
        }
      })
    }, 1000)
  }

  logout() {
    this.student = null
    this.error = null
    this.successMessage = null
    this.loading = false
    this.emailNotVerified = false
    writeJson(STUDENT_KEY, null)
    this.root.taskStore.reset()
  }
}

