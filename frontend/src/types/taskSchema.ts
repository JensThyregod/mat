// ============================================
// TASK SCHEMA TYPES
// YAML-based task catalog system
// ============================================

// ============================================
// ENUMS & BASIC TYPES
// ============================================

export type Category = 'tal_og_algebra' | 'geometri_og_maaling' | 'statistik_og_sandsynlighed'
export type ExamPart = 'uden_hjaelpemidler' | 'med_hjaelpemidler'
export type Difficulty = 'let' | 'middel' | 'svaer'
export type AnswerType = 'number' | 'fraction' | 'percent' | 'text' | 'multiple_choice' | 'expression' | 'unit'
export type Level = 'fp9' | 'fp10' | 'gymnasium'

// ============================================
// ALLOWED TOOLS
// ============================================

export interface AllowedTools {
  calculator: boolean
  formula_sheet: boolean
  ruler?: boolean
  protractor?: boolean
  compass?: boolean
}

// ============================================
// VARIABLE DEFINITIONS (for task types)
// ============================================

export interface VariableConstraints {
  min?: number
  max?: number
  divisible_by?: number | string  // Can be another variable name
  options?: (string | number)[]
  denominator?: number[]  // For fraction type
  numerator_max?: number
}

export interface VariableDefinition {
  name: string
  type: 'integer' | 'fraction' | 'decimal' | 'text'
  constraints?: VariableConstraints
}

// ============================================
// FIGURE TYPES
// ============================================

export interface TriangleVertex {
  angle: number | '?'
}

export interface TriangleFigure {
  type: 'triangle'
  vertices: {
    A: TriangleVertex
    B: TriangleVertex
    C: TriangleVertex
  }
}

export interface PolygonVertex {
  x: number
  y: number
}

export interface PolygonFigure {
  type: 'polygon'
  vertices: Record<string, PolygonVertex | [number, number]>
  sides?: Record<string, string>  // e.g., "AB": "2a"
  right_angles?: string[]  // e.g., ["A", "B", "C", "D"]
  show_angles?: boolean
  show_labels?: boolean
}

export interface VoxelFigure {
  type: 'voxel'
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface SvgFigure {
  type: 'svg'
  content: string
  alt?: string
}

export interface ImageFigure {
  type: 'image'
  src: string
  alt?: string
}

export interface BarChartFigure {
  type: 'bar_chart'
  data: Record<string, number>
}

export interface BoxplotFigure {
  type: 'boxplot'
  data: Record<string, {
    min: number
    q1: number
    median: number
    q3: number
    max: number
  }>
  axisMin?: number  // Custom axis minimum (for extended range)
  axisMax?: number  // Custom axis maximum (for extended range)
}

export interface RectanglesFigure {
  type: 'rectangles'
  items: Record<string, string>  // e.g., "A": "3a × 2"
}

export interface TrianglesFigure {
  type: 'triangles'
  items: Record<string, [number, number, number] | string>
}

export interface TransformationsFigure {
  type: 'transformations'
  items: Record<string, string>
}

export interface IntersectingLinesFigure {
  type: 'intersecting_lines'
  angles: Record<string, number | '?'>
}

export type TaskFigure =
  | TriangleFigure
  | PolygonFigure
  | VoxelFigure
  | SvgFigure
  | ImageFigure
  | BarChartFigure
  | BoxplotFigure
  | RectanglesFigure
  | TrianglesFigure
  | TransformationsFigure
  | IntersectingLinesFigure
  | null

// ============================================
// QUESTION TYPES
// ============================================

export interface Question {
  text: string  // Can contain LaTeX
  answer: string
  answer_type: AnswerType
  accept_alternatives?: string[]  // Alternative correct answers
  points?: number
}

// ============================================
// SOURCE REFERENCE (official exam)
// ============================================

export interface ExamSource {
  exam: 'FP9' | 'FP10' | 'terminsprøve' | 'årsprøve'
  year: number
  month?: 'maj' | 'december'
  task_number?: number
}

// ============================================
// TASK TYPE DEFINITION (Schema/Template)
// ============================================

export interface TaskTypeDefinition {
  id: string
  name: string
  category: Category
  subcategory: string
  level: Level
  exam_part: ExamPart
  difficulty: Difficulty
  
  description: string
  
  allowed_tools: AllowedTools
  
  // Variable definitions for LLM generation
  variables?: VariableDefinition[]
  
  // Common question patterns (descriptive, for LLM)
  question_patterns?: string[]
  
  // Official exam examples
  official_examples?: ExamSource[]
  
  // Figure type hint (what kind of figure this task typically has)
  figure_type?: 'none' | 'triangle' | 'polygon' | 'voxel' | 'chart' | 'diagram'
}

// ============================================
// TASK INSTANCE (Actual task in catalog)
// ============================================

export interface TaskInstance {
  id: string  // Unique task ID, e.g., "tal_broeker_001"
  type: string  // References TaskTypeDefinition.id
  title: string
  
  intro: string  // Can contain LaTeX
  
  figure: TaskFigure
  
  questions: Question[]
  
  // Actual variable values used in this instance
  variables?: Record<string, string | number>
  
  // Optional source reference
  source?: ExamSource
}

// ============================================
// LEVEL METADATA
// ============================================

export interface LevelMeta {
  id: Level
  name: string
  description: string
  exam_parts: {
    id: ExamPart
    name: string
    duration_minutes: number
    allowed_tools: AllowedTools
    task_count: number
  }[]
}

// ============================================
// RUNTIME TYPES (for UI consumption)
// ============================================

/**
 * Parsed task ready for rendering
 * Combines TaskInstance with rendered HTML
 */
export interface ParsedTaskInstance {
  id: string
  type: string
  title: string
  
  introHtml: string
  
  figure: TaskFigure
  
  questions: {
    index: number
    text: string
    textHtml: string
    answer: string
    answerType: AnswerType
    acceptAlternatives: string[]
  }[]
}

/**
 * Task set for assignment to students
 * A curated collection of task IDs
 */
export interface TaskSet {
  id: string
  name: string
  description?: string
  level: Level
  exam_part: ExamPart
  task_ids: string[]  // References TaskInstance.id
}

