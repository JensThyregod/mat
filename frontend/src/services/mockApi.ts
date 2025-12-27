// ============================================
// MOCK API
// Loads YAML task files and provides API endpoints
// ============================================

import profileTest from '../../../backend/data/users/test/profile.json'
import type { AnswerRecord, Student, Task, TaskSetState, QuestionAnswerState, TaskInstance } from '../types'
import { readJson, writeJson } from '../utils/storage'
import { parseTaskYaml, parseTaskToRuntime } from '../utils/yamlTaskParser'

// Import all YAML task files
import talBroeker001 from '../../../tasks/tal_broeker_001.yaml?raw'
import talBroeker002 from '../../../tasks/tal_broeker_002.yaml?raw'
import geoVinkelsum001 from '../../../tasks/geo_vinkelsum_001.yaml?raw'
import geoSammensat001 from '../../../tasks/geo_sammensat_001.yaml?raw'
import geoSammensat002 from '../../../tasks/geo_sammensat_002.yaml?raw'
import talPrisRabat001 from '../../../tasks/tal_pris_rabat_001.yaml?raw'
import talForholdstalsregning001 from '../../../tasks/tal_forholdstalsregning_001.yaml?raw'
import talLigninger001 from '../../../tasks/tal_ligninger_001.yaml?raw'
import talRegnearter001 from '../../../tasks/tal_regnearter_001.yaml?raw'
import geoEnhedsomregning001 from '../../../tasks/geo_enhedsomregning_001.yaml?raw'
import geoProjektioner001 from '../../../tasks/geo_projektioner_001.yaml?raw'
import statSandsynlighed001 from '../../../tasks/stat_sandsynlighed_001.yaml?raw'
import statSoejlediagram001 from '../../../tasks/stat_soejlediagram_001.yaml?raw'
import statBoksplot001 from '../../../tasks/stat_boksplot_001.yaml?raw'

// ============================================
// STORAGE KEYS
// ============================================

const ANSWERS_KEY = 'mock.answers'
const TASK_STATE_PREFIX = 'taskstate.'

type AnswerState = Record<string, Record<string, AnswerRecord[]>>

function getTaskStateKey(studentId: string, taskId: string): string {
  return `${TASK_STATE_PREFIX}${studentId}.${taskId}`
}

// ============================================
// TASK CATALOG
// Parse all YAML files into TaskInstance objects
// ============================================

const yamlSources = [
  talBroeker001,
  talBroeker002,
  geoVinkelsum001,
  geoSammensat001,
  geoSammensat002,
  talPrisRabat001,
  talForholdstalsregning001,
  talLigninger001,
  talRegnearter001,
  geoEnhedsomregning001,
  geoProjektioner001,
  statSandsynlighed001,
  statSoejlediagram001,
  statBoksplot001,
]

// Parse all tasks at module load time
const taskCatalog: Map<string, TaskInstance> = new Map()

for (const yaml of yamlSources) {
  try {
    const task = parseTaskYaml(yaml)
    taskCatalog.set(task.id, task)
  } catch (e) {
    console.error('Failed to parse task YAML:', e)
  }
}

// ============================================
// TASK SETS
// Predefined collections of tasks for assignment
// ============================================

interface TaskSetDefinition {
  id: string
  title: string
  taskIds: string[]
}

const taskSets: TaskSetDefinition[] = [
  {
    id: 'demo-set',
    title: 'Demo sæt · Brøker og geometri',
    taskIds: [
      'tal_broeker_001',
      'tal_broeker_002',
      'geo_vinkelsum_001',
      'geo_sammensat_001',
      'geo_sammensat_002',
    ],
  },
  {
    id: 'fp9-traening',
    title: 'FP9 Træningssæt · Uden hjælpemidler',
    taskIds: [
      'tal_pris_rabat_001',
      'tal_forholdstalsregning_001',
      'tal_regnearter_001',
      'tal_ligninger_001',
      'geo_enhedsomregning_001',
      'geo_projektioner_001',
      'stat_soejlediagram_001',
      'stat_boksplot_001',
      'stat_sandsynlighed_001',
    ],
  },
]

// User assignments: which task sets are assigned to which users
const userTaskSetAssignments: Record<string, string[]> = {
  test: ['demo-set', 'fp9-traening'],
}

// ============================================
// CONVERT TASK INSTANCE TO LEGACY TASK FORMAT
// For backwards compatibility with existing components
// ============================================

// Note: This function is kept for potential future use when we want 
// to convert individual task instances to legacy format
// function taskInstanceToLegacyTask(instance: TaskInstance): Task {
//   const questionsLatex = instance.questions
//     .map((q) => `\\item ${q.text} %% ANS: ${q.answer}`)
//     .join('\n  ')
//   
//   const fullLatex = `\\section*{${instance.title}}
// ${instance.intro}
// 
// \\begin{enumerate}[label=\\textbf{\\arabic*.}]
//   ${questionsLatex}
// \\end{enumerate}`
// 
//   return {
//     id: instance.id,
//     title: instance.title,
//     latex: fullLatex,
//     parts: [fullLatex],
//     tags: [instance.type],
//     difficulty: 'medium',
//   }
// }

function getTasksForUser(userId: string): Task[] {
  const assignedSetIds = userTaskSetAssignments[userId] ?? []
  const tasks: Task[] = []
  
  for (const setId of assignedSetIds) {
    const set = taskSets.find(s => s.id === setId)
    if (!set) continue
    
    // Create a "super task" for each set (like the old behavior)
    const setTasks = set.taskIds
      .map(id => taskCatalog.get(id))
      .filter((t): t is TaskInstance => t !== undefined)
    
    if (setTasks.length === 0) continue
    
    // Build parts from each task in the set
    const parts = setTasks.map(instance => {
      const questionsLatex = instance.questions
        .map((q) => `\\item ${q.text} %% ANS: ${q.answer}${q.accept_alternatives ? '|' + q.accept_alternatives.join('|') : ''}`)
        .join('\n  ')
      
      return `\\section*{${instance.title}}
${instance.intro}

\\begin{enumerate}[label=\\textbf{\\arabic*.}]
  ${questionsLatex}
\\end{enumerate}`
    })
    
    tasks.push({
      id: set.id,
      title: set.title,
      latex: parts[0] ?? set.title,
      parts,
      tags: ['taskset'],
      difficulty: 'medium',
    })
  }
  
  return tasks
}

// ============================================
// USER PROFILES
// ============================================

const userProfiles: Student[] = [
  profileTest as Student,
]

// ============================================
// API FUNCTIONS
// ============================================

const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms))

export async function fetchTasks(studentId: string): Promise<Task[]> {
  await delay()
  return getTasksForUser(studentId)
}

export async function fetchTask(
  studentId: string,
  taskId: string,
): Promise<Task | undefined> {
  await delay(120)
  const tasks = getTasksForUser(studentId)
  return tasks.find((t) => t.id === taskId)
}

export async function fetchAnswersForStudent(
  studentId: string,
): Promise<Record<string, AnswerRecord[]>> {
  await delay(140)
  const answers = readJson<AnswerState>(ANSWERS_KEY, {})
  return answers[studentId] ?? {}
}

export async function authenticateStudent(
  name: string,
  code: string,
): Promise<Student | null> {
  await delay(80)
  const normalizedCode = code.trim().toLowerCase()
  const normalizedName = name.trim().toLowerCase()
  const match = userProfiles.find(
    (u) =>
      u.code.toLowerCase() === normalizedCode &&
      u.name.toLowerCase() === normalizedName,
  )
  return match ? { ...match, name: match.name.trim() } : null
}

export async function saveAnswer(
  studentId: string,
  taskId: string,
  partIndex: number,
  partCount: number,
  answer: string,
): Promise<AnswerRecord> {
  await delay()
  const answers = readJson<AnswerState>(ANSWERS_KEY, {})
  const record: AnswerRecord = {
    taskId,
    studentId,
    answer,
    updatedAt: new Date().toISOString(),
    partIndex,
    partCount,
  }
  const currentTaskAnswers = answers[studentId]?.[taskId] ?? []
  const updatedTaskAnswers = [...currentTaskAnswers]
  updatedTaskAnswers[partIndex] = record

  const next = {
    ...answers,
    [studentId]: {
      ...(answers[studentId] ?? {}),
      [taskId]: updatedTaskAnswers,
    },
  } as AnswerState
  writeJson(ANSWERS_KEY, next)
  return record
}

// ============================================
// TASK SET STATE API (per-question answers)
// ============================================

export async function loadTaskSetState(
  studentId: string,
  taskId: string,
): Promise<TaskSetState | null> {
  await delay(50)
  const key = getTaskStateKey(studentId, taskId)
  const state = readJson<TaskSetState | null>(key, null)
  return state
}

export async function saveQuestionAnswer(
  studentId: string,
  taskId: string,
  partIndex: number,
  questionIndex: number,
  answer: string,
  validated: boolean,
  status: 'neutral' | 'correct' | 'incorrect',
): Promise<TaskSetState> {
  const key = getTaskStateKey(studentId, taskId)
  const existing = readJson<TaskSetState | null>(key, null)
  
  const now = new Date().toISOString()
  const questionState: QuestionAnswerState = {
    answer,
    validated,
    status,
    updatedAt: now,
  }
  
  const state: TaskSetState = existing ?? {
    taskId,
    studentId,
    parts: {},
    updatedAt: now,
  }
  
  if (!state.parts[partIndex]) {
    state.parts[partIndex] = {}
  }
  
  state.parts[partIndex][questionIndex] = questionState
  state.updatedAt = now
  
  writeJson(key, state)
  return state
}

// ============================================
// NEW API: Direct access to task catalog
// ============================================

/**
 * Get a task instance by ID from the catalog
 */
export function getTaskInstanceById(taskId: string): TaskInstance | undefined {
  return taskCatalog.get(taskId)
}

/**
 * Get all task instances in the catalog
 */
export function getAllTaskInstances(): TaskInstance[] {
  return Array.from(taskCatalog.values())
}

/**
 * Get parsed (runtime) version of a task
 */
export function getParsedTaskInstance(taskId: string) {
  const instance = taskCatalog.get(taskId)
  if (!instance) return undefined
  return parseTaskToRuntime(instance)
}

/**
 * Get all task sets
 */
export function getAllTaskSets(): TaskSetDefinition[] {
  return taskSets
}
