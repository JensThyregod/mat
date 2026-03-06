import { makeAutoObservable, runInAction } from 'mobx'
import type { User } from 'oidc-client-ts'
import type { Student } from '../types'
import type { RootStore } from './storeProvider'

export class AuthStore {
  student: Student | null = null
  loading = false
  error: string | null = null
  private root: RootStore
  private _oidcUser: User | null = null
  private _profileFetched = false

  constructor(root: RootStore) {
    makeAutoObservable(this)
    this.root = root
  }

  get accessToken(): string | null {
    return this._oidcUser?.access_token ?? null
  }

  get isAuthenticated(): boolean {
    return this.student !== null && this._oidcUser !== null && !this._oidcUser.expired
  }

  setOidcUser(user: User | null | undefined) {
    this._oidcUser = user ?? null

    if (user && !user.expired) {
      const profile = user.profile
      runInAction(() => {
        const givenName = (profile.given_name as string) ?? ''
        const familyName = (profile.family_name as string) ?? ''
        const fullName = `${givenName} ${familyName}`.trim() || (profile.name as string) || 'Student'
        this.student = {
          id: profile.sub,
          name: fullName,
          code: '',
          email: profile.email as string | undefined,
          emailVerified: profile.email_verified as boolean | undefined,
          isTestUser: this.student?.isTestUser,
        }
        this.loading = false
        this.error = null
      })

      if (!this._profileFetched) {
        this.fetchBackendProfile()
      }
    } else {
      runInAction(() => {
        this.student = null
        this._profileFetched = false
      })
    }
  }

  private async fetchBackendProfile() {
    try {
      const profile = await this.root.api.getProfile()
      runInAction(() => {
        if (this.student) {
          this.student = { ...this.student, isTestUser: profile.isTestUser }
        }
        this._profileFetched = true
      })
    } catch {
      // Backend profile fetch is best-effort; don't block auth flow
    }
  }

  setLoading(value: boolean) {
    this.loading = value
  }

  setError(message: string | null) {
    this.error = message
  }

  logout() {
    this.student = null
    this._oidcUser = null
    this._profileFetched = false
    this.error = null
    this.loading = false
    this.root.taskStore.reset()
  }
}
