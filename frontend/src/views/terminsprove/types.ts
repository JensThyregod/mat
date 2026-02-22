export interface DifficultyDistribution {
  easy: number
  medium: number
  hard: number
}

export interface TerminsproveRequest {
  level: string
  examPart: string
  taskCount: number
  focusCategories: string[]
  difficulty: DifficultyDistribution
  customInstructions?: string
}

export type ProgressEventType =
  | 'progress'
  | 'phaseStarted'
  | 'taskStarted'
  | 'taskFormatted'
  | 'taskValidated'
  | 'taskVisualized'
  | 'taskCompleted'
  | 'taskImageGenerating'
  | 'taskImageReady'
  | 'taskFailed'
  | 'completed'
  | 'error'

export type TaskGenerationPhase =
  | 'brainstorming'
  | 'formatting'
  | 'validating'
  | 'visualizing'
  | 'complete'

export interface GenerationProgress {
  status: string
  message: string
  tasksCompleted: number
  totalTasks: number
  currentAgentName?: string
  progressPercentage: number
  eventType?: ProgressEventType
  completedTask?: GeneratedTask
  taskIndex?: number
  taskPhase?: TaskGenerationPhase
  taskId?: string
  imageUrl?: string
}

export interface CanvasTask {
  id: string
  index: number
  phase: TaskGenerationPhase
  task?: GeneratedTask
  startTime: number
  imageGenerating?: boolean
  imageUrl?: string
}

export interface TaskAnswer {
  value: string
  unit?: string
}

export interface SolutionStep {
  stepNumber: number
  description: string
  mathExpression: string
  result: string
}

export interface SubQuestion {
  label: string
  questionText: string
  answer: TaskAnswer
  difficulty: string
  points: number
  solutionSteps: SolutionStep[]
}

export interface GeneratedTask {
  id: string
  taskTypeId: string
  category: string
  contextText: string
  subQuestions: SubQuestion[]
  questionText: string
  questionLatex: string
  answers: TaskAnswer[]
  difficulty: string
  solutionSteps: SolutionStep[]
  estimatedTimeSeconds: number
  points: number
  validation: {
    isValid: boolean
    isSolvable: boolean
    issues: string[]
  }
  imageUrl?: string
}

export interface TerminsproveResult {
  id: string
  tasks: GeneratedTask[]
  status: string
  metadata: {
    startedAt: string
    completedAt?: string
    totalIterations: number
    regeneratedTaskCount: number
    categoryDistribution: Record<string, number>
    difficultyDistribution: Record<string, number>
  }
}
