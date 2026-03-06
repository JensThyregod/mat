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
        this.student = {
          id: profile.sub,
          name: (profile.preferred_username as string) ?? (profile.name as string) ?? 'Student',
          code: '',
          email: profile.email as string | undefined,
          emailVerified: profile.email_verified as boolean | undefined,
        }
        this.loading = false
        this.error = null
      })
    } else {
      runInAction(() => {
        this.student = null
      })
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
    this.error = null
    this.loading = false
    this.root.taskStore.reset()
  }
}
