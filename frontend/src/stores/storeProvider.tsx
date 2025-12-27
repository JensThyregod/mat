import { createContext, useContext } from 'react'
import { AuthStore } from './authStore'
import { TaskStore } from './taskStore'

export class RootStore {
  authStore: AuthStore
  taskStore: TaskStore

  constructor() {
    this.authStore = new AuthStore(this)
    this.taskStore = new TaskStore(this)
  }
}

const StoreContext = createContext<RootStore | null>(null)

export function StoreProvider({
  value,
  children,
}: {
  value: RootStore
  children: React.ReactNode
}) {
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) {
    throw new Error('StoreProvider mangler omkring komponent træet')
  }
  return ctx
}

export const createRootStore = () => new RootStore()

