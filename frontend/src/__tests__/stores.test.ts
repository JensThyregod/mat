import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ApiClient } from '../services/apiClient'
import type { AnswerRecord, Task } from '../types'

vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
})

function createMockApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    fetchTasks: vi.fn().mockResolvedValue([]),
    fetchTask: vi.fn().mockResolvedValue(undefined),
    fetchAnswersForStudent: vi.fn().mockResolvedValue({}),
    authenticateStudent: vi.fn().mockResolvedValue(null),
    saveAnswer: vi.fn().mockResolvedValue({
      taskId: 't1',
      studentId: 's1',
      answer: '42',
      updatedAt: new Date().toISOString(),
    }),
    loadTaskSetState: vi.fn().mockResolvedValue(null),
    saveQuestionAnswer: vi.fn().mockResolvedValue({
      taskId: 't1',
      studentId: 's1',
      parts: {},
      updatedAt: new Date().toISOString(),
    }),
    ...overrides,
  }
}

const fakeStudent = { id: 's1', name: 'Test Elev', code: 'abc123' }

const fakeTasks: Task[] = [
  { id: 't1', title: 'Opgave 1', latex: '2+2', tags: ['aritmetik'], difficulty: 'easy' },
  { id: 't2', title: 'Opgave 2', latex: '3*3', tags: ['algebra'], difficulty: 'medium' },
]

const fakeAnswers: Record<string, AnswerRecord[]> = {
  t1: [{ taskId: 't1', studentId: 's1', answer: '4', updatedAt: '2026-01-01T00:00:00Z' }],
}

describe('RootStore', () => {
  it('creates authStore and taskStore', async () => {
    const { RootStore } = await import('../stores/storeProvider')
    const store = new RootStore(createMockApi())
    expect(store.authStore).toBeDefined()
    expect(store.taskStore).toBeDefined()
  })

  it('accepts a custom ApiClient', async () => {
    const { RootStore } = await import('../stores/storeProvider')
    const api = createMockApi()
    const store = new RootStore(api)
    expect(store.api).toBe(api)
  })
})

describe('AuthStore', () => {
  let store: Awaited<ReturnType<typeof createStore>>

  async function createStore(apiOverrides: Partial<ApiClient> = {}) {
    const { RootStore } = await import('../stores/storeProvider')
    return new RootStore(createMockApi(apiOverrides))
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    store = await createStore()
  })

  it('has correct initial state', () => {
    expect(store.authStore.student).toBeNull()
    expect(store.authStore.loading).toBe(false)
    expect(store.authStore.error).toBeNull()
  })

  it('sets error when login fields are empty', async () => {
    await store.authStore.login('', '')
    expect(store.authStore.error).toBe('Skriv både navn og klassekode.')
  })

  it('sets error when name is empty', async () => {
    const result = await store.authStore.login('', 'abc')
    expect(result).toBe(false)
    expect(store.authStore.error).toBe('Skriv både navn og klassekode.')
  })

  it('sets error when code is empty', async () => {
    const result = await store.authStore.login('Test', '')
    expect(result).toBe(false)
    expect(store.authStore.error).toBe('Skriv både navn og klassekode.')
  })

  it('sets student on valid credentials', async () => {
    store = await createStore({
      authenticateStudent: vi.fn().mockResolvedValue(fakeStudent),
      fetchTasks: vi.fn().mockResolvedValue(fakeTasks),
      fetchAnswersForStudent: vi.fn().mockResolvedValue(fakeAnswers),
    })

    const result = await store.authStore.login('Test Elev', 'abc123')

    expect(result).toBe(true)
    expect(store.authStore.student).toEqual(fakeStudent)
    expect(store.authStore.error).toBeNull()
    expect(store.authStore.loading).toBe(false)
  })

  it('sets error on invalid credentials', async () => {
    store = await createStore({
      authenticateStudent: vi.fn().mockResolvedValue(null),
    })

    const result = await store.authStore.login('Wrong', 'wrong')

    expect(result).toBe(false)
    expect(store.authStore.student).toBeNull()
    expect(store.authStore.error).toBe('Ugyldigt login. Tjek navn/kode.')
    expect(store.authStore.loading).toBe(false)
  })

  it('logout clears student and resets task store', async () => {
    store = await createStore({
      authenticateStudent: vi.fn().mockResolvedValue(fakeStudent),
      fetchTasks: vi.fn().mockResolvedValue(fakeTasks),
      fetchAnswersForStudent: vi.fn().mockResolvedValue(fakeAnswers),
    })

    await store.authStore.login('Test Elev', 'abc123')
    expect(store.authStore.student).toEqual(fakeStudent)

    store.authStore.logout()

    expect(store.authStore.student).toBeNull()
    expect(store.authStore.error).toBeNull()
    expect(store.authStore.loading).toBe(false)
    expect(store.taskStore.tasks).toEqual([])
    expect(store.taskStore.answers).toEqual({})
  })
})

describe('TaskStore', () => {
  let store: Awaited<ReturnType<typeof createStore>>

  async function createStore(apiOverrides: Partial<ApiClient> = {}) {
    const { RootStore } = await import('../stores/storeProvider')
    return new RootStore(createMockApi(apiOverrides))
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    store = await createStore()
  })

  it('has correct initial state', () => {
    expect(store.taskStore.tasks).toEqual([])
    expect(store.taskStore.answers).toEqual({})
    expect(store.taskStore.loading).toBe(false)
    expect(store.taskStore.error).toBeNull()
    expect(store.taskStore.saving).toEqual({})
  })

  it('loadTasks fetches tasks and answers', async () => {
    store = await createStore({
      fetchTasks: vi.fn().mockResolvedValue(fakeTasks),
      fetchAnswersForStudent: vi.fn().mockResolvedValue(fakeAnswers),
    })

    await store.taskStore.loadTasks('s1')

    expect(store.taskStore.tasks).toEqual(fakeTasks)
    expect(store.taskStore.answers).toEqual(fakeAnswers)
    expect(store.taskStore.loading).toBe(false)
    expect(store.taskStore.error).toBeNull()
  })

  it('loadTasks handles errors', async () => {
    store = await createStore({
      fetchTasks: vi.fn().mockRejectedValue(new Error('Network error')),
      fetchAnswersForStudent: vi.fn().mockResolvedValue({}),
    })

    await store.taskStore.loadTasks('s1')

    expect(store.taskStore.error).toBe('Kunne ikke hente opgaverne.')
    expect(store.taskStore.loading).toBe(false)
    expect(store.taskStore.tasks).toEqual([])
  })

  it('submitAnswer saves and updates answers', async () => {
    const savedRecord: AnswerRecord = {
      taskId: 't1',
      studentId: 's1',
      answer: '4',
      updatedAt: '2026-01-01T00:00:00Z',
      partIndex: 0,
      partCount: 1,
    }

    store = await createStore({
      authenticateStudent: vi.fn().mockResolvedValue(fakeStudent),
      fetchTasks: vi.fn().mockResolvedValue(fakeTasks),
      fetchAnswersForStudent: vi.fn().mockResolvedValue({}),
      saveAnswer: vi.fn().mockResolvedValue(savedRecord),
    })

    await store.authStore.login('Test Elev', 'abc123')
    const result = await store.taskStore.submitAnswer('t1', 0, 1, '4')

    expect(result).toEqual(savedRecord)
    expect(store.taskStore.answers['t1']?.[0]).toEqual(savedRecord)
    expect(store.taskStore.saving).toEqual({})
  })

  it('submitAnswer requires logged-in student', async () => {
    const result = await store.taskStore.submitAnswer('t1', 0, 1, '4')

    expect(result).toBeNull()
    expect(store.taskStore.error).toBe('Du skal være logget ind for at aflevere.')
  })

  it('submitAnswer handles save errors', async () => {
    store = await createStore({
      authenticateStudent: vi.fn().mockResolvedValue(fakeStudent),
      fetchTasks: vi.fn().mockResolvedValue([]),
      fetchAnswersForStudent: vi.fn().mockResolvedValue({}),
      saveAnswer: vi.fn().mockRejectedValue(new Error('Save failed')),
    })

    await store.authStore.login('Test Elev', 'abc123')
    const result = await store.taskStore.submitAnswer('t1', 0, 1, '4')

    expect(result).toBeNull()
    expect(store.taskStore.error).toBe('Fejl under gemning af svar.')
    expect(store.taskStore.saving).toEqual({})
  })

  it('reset clears all state', async () => {
    store = await createStore({
      fetchTasks: vi.fn().mockResolvedValue(fakeTasks),
      fetchAnswersForStudent: vi.fn().mockResolvedValue(fakeAnswers),
    })

    await store.taskStore.loadTasks('s1')
    expect(store.taskStore.tasks.length).toBe(2)

    store.taskStore.reset()

    expect(store.taskStore.tasks).toEqual([])
    expect(store.taskStore.answers).toEqual({})
    expect(store.taskStore.loading).toBe(false)
    expect(store.taskStore.error).toBeNull()
    expect(store.taskStore.saving).toEqual({})
  })

  it('answeredTaskIds returns set of task ids with answers', async () => {
    store = await createStore({
      fetchTasks: vi.fn().mockResolvedValue(fakeTasks),
      fetchAnswersForStudent: vi.fn().mockResolvedValue(fakeAnswers),
    })

    await store.taskStore.loadTasks('s1')

    const ids = store.taskStore.answeredTaskIds
    expect(ids).toBeInstanceOf(Set)
    expect(ids.has('t1')).toBe(true)
    expect(ids.has('t2')).toBe(false)
  })

  it('answeredTaskIds is empty when no answers exist', () => {
    const ids = store.taskStore.answeredTaskIds
    expect(ids.size).toBe(0)
  })
})
