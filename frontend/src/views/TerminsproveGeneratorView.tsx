import { useState, useCallback, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '../components/GlassCard'
import { PageTransition } from '../components/animation'
import './TerminsproveGeneratorView.css'

// Types for the API
interface DifficultyDistribution {
  easy: number
  medium: number
  hard: number
}

interface TerminsproveRequest {
  level: string
  examPart: string
  taskCount: number
  focusCategories: string[]
  difficulty: DifficultyDistribution
  customInstructions?: string
}

// Event types matching backend (camelCase from JsonStringEnumConverter)
type ProgressEventType = 
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

type TaskGenerationPhase = 
  | 'brainstorming'
  | 'formatting'
  | 'validating'
  | 'visualizing'
  | 'complete'

interface GenerationProgress {
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

// Track in-progress tasks on the canvas
interface CanvasTask {
  id: string
  index: number
  phase: TaskGenerationPhase
  task?: GeneratedTask
  startTime: number
  /** Whether an image is currently being generated for this task */
  imageGenerating?: boolean
  /** URL of the generated image (set when image generation completes) */
  imageUrl?: string
}

interface TaskAnswer {
  value: string
  unit?: string
}

interface SolutionStep {
  stepNumber: number
  description: string
  mathExpression: string
  result: string
}

interface SubQuestion {
  label: string
  questionText: string
  answer: TaskAnswer
  solutionSteps: SolutionStep[]
  difficulty: string
  points: number
}

interface GeneratedTask {
  id: string
  taskTypeId: string
  category: string
  contextText: string
  subQuestions: SubQuestion[]
  // Legacy single-question fields
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
  /** URL to a generated illustration image (from Gemini image generation) */
  imageUrl?: string
}

interface TerminsproveResult {
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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
}

const AGENT_ICONS: Record<string, string> = {
  'BrainstormAgent': '💡',
  'FormatterAgent': '📝',
  'ValidatorAgent': '✅',
  'VisualizationAgent': '🎨',
  'GeminiImageGenerationAgent': '🖼️',
  'BatchTaskGenerator': '⚡',
}

const API_BASE = 'http://localhost:5000/api/terminsprove'

export const TerminsproveGeneratorView = observer(() => {
  // Form state
  const [taskCount, setTaskCount] = useState(10)
  const [examPart, setExamPart] = useState('uden_hjaelpemidler')
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const [result, setResult] = useState<TerminsproveResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  
  // Canvas state - tasks appear here as they're generated
  const [canvasTasks, setCanvasTasks] = useState<CanvasTask[]>([])
  const [showCanvas, setShowCanvas] = useState(false)
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  
  // Calculate generation speed
  const generationSpeed = generationStartTime && canvasTasks.length > 0
    ? Math.round((Date.now() - generationStartTime) / canvasTasks.length)
    : null

  const handleProgressEvent = useCallback((progressData: GenerationProgress) => {
    setProgress(progressData)
    
    // Normalize event type to lowercase for matching (handles both PascalCase and camelCase)
    const eventType = (progressData.eventType || 'progress').toLowerCase()
    const taskIndex = progressData.taskIndex
    
    switch (eventType) {
      case 'taskstarted':
        if (taskIndex) {
          // Add a new in-progress task to the canvas with placeholder
          setCanvasTasks(prev => {
            const exists = prev.some(t => t.index === taskIndex)
            if (exists) return prev
            return [...prev, {
              id: `task-${taskIndex}-${Date.now()}`,
              index: taskIndex,
              phase: (progressData.taskPhase || 'formatting') as TaskGenerationPhase,
              startTime: Date.now()
            }]
          })
        }
        break
        
      case 'taskformatted':
      case 'taskvalidated':
      case 'taskvisualized':
        if (taskIndex) {
          // Update the phase of the task
          setCanvasTasks(prev => prev.map(t => 
            t.index === taskIndex 
              ? { ...t, phase: (progressData.taskPhase || t.phase) as TaskGenerationPhase, task: progressData.completedTask || t.task }
              : t
          ))
        }
        break
        
      case 'taskcompleted':
        if (progressData.completedTask) {
          const task = progressData.completedTask
          const idx = taskIndex || progressData.tasksCompleted
          
          setCanvasTasks(prev => {
            // Check if placeholder exists for this task index
            const existingIdx = prev.findIndex(t => t.index === idx)
            
            if (existingIdx >= 0) {
              // Update placeholder with real task data
              const updated = [...prev]
              updated[existingIdx] = { ...updated[existingIdx], phase: 'complete', task }
              return updated
            } else {
              // No placeholder - add completed task directly
              return [...prev, {
                id: `task-${idx}-${Date.now()}`,
                index: idx,
                phase: 'complete' as TaskGenerationPhase,
                task,
                startTime: Date.now()
              }]
            }
          })
          
          // Scroll canvas to show newest task
          requestAnimationFrame(() => {
            canvasRef.current?.scrollTo({
              top: canvasRef.current.scrollHeight,
              behavior: 'smooth'
            })
          })
        }
        break
        
      case 'taskimagegenerating':
        // Mark a task as having an image being generated (show placeholder)
        {
          const targetTaskId = progressData.taskId
          const targetIdx = taskIndex
          if (targetTaskId || targetIdx) {
            setCanvasTasks(prev => prev.map(t => {
              const match = targetTaskId 
                ? t.task?.id === targetTaskId 
                : t.index === targetIdx
              return match ? { ...t, imageGenerating: true } : t
            }))
          }
        }
        break
        
      case 'taskimageready':
        // Image generation complete — fill in the image URL
        {
          const imgTaskId = progressData.taskId
          const imgIdx = taskIndex
          const imgUrl = progressData.imageUrl
          if (imgUrl && (imgTaskId || imgIdx)) {
            setCanvasTasks(prev => prev.map(t => {
              const match = imgTaskId 
                ? t.task?.id === imgTaskId 
                : t.index === imgIdx
              if (match) {
                // Also update the task object's imageUrl so it persists to result
                const updatedTask = t.task ? { ...t.task, imageUrl: imgUrl } : t.task
                return { ...t, imageGenerating: false, imageUrl: imgUrl, task: updatedTask }
              }
              return t
            }))
          }
        }
        break
      
      case 'taskfailed':
        if (taskIndex) {
          setCanvasTasks(prev => prev.filter(t => t.index !== taskIndex))
        }
        break
        
      case 'completed':
        // Final completion event
        break
    }
  }, [])

  const startGeneration = useCallback(async () => {
    setIsGenerating(true)
    setProgress(null)
    setResult(null)
    setError(null)
    setCanvasTasks([])
    setShowCanvas(true)
    setGenerationStartTime(Date.now())
    
    const request: TerminsproveRequest = {
      level: 'fp9',
      examPart,
      taskCount,
      focusCategories: [],
      difficulty: { easy: 0.3, medium: 0.5, hard: 0.2 },
    }

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`${API_BASE}/generate/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              continue
            }

            try {
              const parsed = JSON.parse(data)
              
              if (parsed.type === 'result') {
                setResult(parsed.data)
              } else if (parsed.type === 'error') {
                setError(parsed.message)
              } else {
                // Handle progress events
                handleProgressEvent(parsed)
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Generation cancelled')
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      }
    } finally {
      setIsGenerating(false)
    }
  }, [examPart, taskCount, handleProgressEvent])

  const cancelGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'tal_og_algebra': return 'var(--color-algebra)'
      case 'geometri_og_maaling': return 'var(--color-geometri)'
      case 'statistik_og_sandsynlighed': return 'var(--color-statistik)'
      default: return 'var(--color-accent)'
    }
  }

  const getDifficultyLabel = (diff: string) => {
    switch (diff) {
      case 'let': return { label: 'Let', color: 'var(--color-success)' }
      case 'middel': return { label: 'Middel', color: 'var(--color-warning)' }
      case 'svær': return { label: 'Svær', color: 'var(--color-error)' }
      default: return { label: diff, color: 'var(--color-text-muted)' }
    }
  }

  const getPhaseLabel = (phase: TaskGenerationPhase) => {
    const p = phase.toLowerCase()
    switch (p) {
      case 'brainstorming': return 'Brainstormer'
      case 'formatting': return 'Genererer...'
      case 'validating': return 'Validerer'
      case 'visualizing': return 'Visualiserer'
      case 'complete': return 'Færdig'
      default: return phase
    }
  }

  return (
    <PageTransition>
      <motion.div
        className="terminsprove"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <motion.section className="terminsprove__hero" variants={itemVariants}>
          <div className="terminsprove__hero-content">
            <div className="terminsprove__hero-badge">
              <span className="terminsprove__hero-badge-icon">🤖</span>
              <span>AI Agent Orchestration</span>
            </div>
            <h1 className="terminsprove__hero-title">Terminsprøve Generator</h1>
            <p className="terminsprove__hero-subtitle">
              Generer automatisk en komplet terminsprøve med AI-drevne agenter. 
              Brainstorm, formatering, validering og visualisering - alt sammen automatisk.
            </p>
          </div>
          
          <div className="terminsprove__agent-flow">
            {['💡', '📝', '✅', '🎨'].map((icon, i) => (
              <motion.div
                key={i}
                className="terminsprove__agent-node"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + i * 0.1, type: 'spring' }}
              >
                <span>{icon}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Configuration Form */}
        <motion.section className="terminsprove__config" variants={itemVariants}>
          <GlassCard variant="elevated" padding="lg" radius="2xl">
            <h2 className="terminsprove__section-title">Konfiguration</h2>
            
            <div className="terminsprove__form-grid">
              {/* Task Count */}
              <div className="terminsprove__form-group">
                <label className="terminsprove__label">Antal opgaver</label>
                <div className="terminsprove__slider-row">
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={taskCount}
                    onChange={(e) => setTaskCount(Number(e.target.value))}
                    className="terminsprove__slider"
                  />
                  <span className="terminsprove__slider-value">{taskCount}</span>
                </div>
              </div>

              {/* Exam Part */}
              <div className="terminsprove__form-group">
                <label className="terminsprove__label">Prøvedel</label>
                <div className="terminsprove__radio-group">
                  <button
                    className={`terminsprove__radio-btn ${examPart === 'uden_hjaelpemidler' ? 'active' : ''}`}
                    onClick={() => setExamPart('uden_hjaelpemidler')}
                  >
                    <span>📵</span>
                    Uden hjælpemidler
                  </button>
                  <button
                    className={`terminsprove__radio-btn ${examPart === 'med_hjaelpemidler' ? 'active' : ''}`}
                    onClick={() => setExamPart('med_hjaelpemidler')}
                  >
                    <span>🧮</span>
                    Med hjælpemidler
                  </button>
                </div>
              </div>

            </div>

            {/* Generate Button */}
            <div className="terminsprove__actions">
              {!isGenerating ? (
                <motion.button
                  className="terminsprove__generate-btn"
                  onClick={startGeneration}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="terminsprove__generate-icon">✨</span>
                  Generer Terminsprøve
                </motion.button>
              ) : (
                <motion.button
                  className="terminsprove__cancel-btn"
                  onClick={cancelGeneration}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>✕</span>
                  Annuller
                </motion.button>
              )}
            </div>
          </GlassCard>
        </motion.section>

        {/* Progress Section */}
        <AnimatePresence>
          {isGenerating && progress && (
            <motion.section
              className="terminsprove__progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GlassCard variant="elevated" padding="lg" radius="2xl">
                <div className="terminsprove__progress-header">
                  <div className="terminsprove__progress-agent">
                    <span className="terminsprove__progress-agent-icon">
                      {AGENT_ICONS[progress.currentAgentName || ''] || '⚙️'}
                    </span>
                    <span className="terminsprove__progress-agent-name">
                      {progress.currentAgentName || 'Processing'}
                    </span>
                  </div>
                  <span className="terminsprove__progress-status">{progress.status}</span>
                </div>
                
                <div className="terminsprove__progress-bar-container">
                  <motion.div
                    className="terminsprove__progress-bar"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.progressPercentage}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                
                <div className="terminsprove__progress-info">
                  <span className="terminsprove__progress-message">{progress.message}</span>
                  <span className="terminsprove__progress-count">
                    {progress.tasksCompleted} / {progress.totalTasks}
                  </span>
                </div>
              </GlassCard>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Exam Document Canvas */}
        <AnimatePresence>
          {showCanvas && canvasTasks.length > 0 && (
            <motion.section
              className="terminsprove__exam"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Exam Document */}
              <div className="terminsprove__exam-paper" ref={canvasRef}>
                {/* Exam Header */}
                <div className="terminsprove__exam-header">
                  <div className="terminsprove__exam-header-top">
                    <div className="terminsprove__exam-logo">Terminsprøve</div>
                    <div className="terminsprove__exam-meta-info">
                      {isGenerating && (
                        <span className="terminsprove__exam-generating-badge">
                          <span className="terminsprove__exam-generating-dot" />
                          Genererer...
                        </span>
                      )}
                      {!isGenerating && canvasTasks.filter(t => t.phase.toLowerCase() === 'complete').length > 0 && (
                        <span className="terminsprove__exam-complete-badge">
                          ✓ Færdig
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="terminsprove__exam-title-row">
                    <h1 className="terminsprove__exam-title">
                      Matematik · FP9
                    </h1>
                    <p className="terminsprove__exam-subtitle">
                      {examPart === 'uden_hjaelpemidler' ? 'Uden hjælpemidler' : 'Med hjælpemidler'}
                    </p>
                  </div>
                  <div className="terminsprove__exam-info-row">
                    <span>Antal opgaver: {canvasTasks.length}</span>
                    <span>•</span>
                    <span>
                      {canvasTasks.filter(t => t.phase.toLowerCase() === 'complete').length} / {canvasTasks.length} færdige
                    </span>
                    {generationSpeed && (
                      <>
                        <span>•</span>
                        <span>{generationSpeed < 1000 ? `${generationSpeed}ms` : `${(generationSpeed/1000).toFixed(1)}s`}/opgave</span>
                      </>
                    )}
                  </div>
                  <div className="terminsprove__exam-divider" />
                </div>

                {/* Exam Tasks */}
                <div className="terminsprove__exam-tasks">
                  <AnimatePresence mode="popLayout">
                    {canvasTasks.map((canvasTask) => {
                      const isComplete = canvasTask.phase.toLowerCase() === 'complete'
                      const task = canvasTask.task
                      const hasSubQuestions = task?.subQuestions && task.subQuestions.length > 0
                      const displayText = task?.contextText || task?.questionText || ''
                      
                      return (
                        <motion.div
                          key={canvasTask.id}
                          className={`terminsprove__exam-task ${isComplete ? 'complete' : 'loading'}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ 
                            type: 'spring', 
                            stiffness: 300, 
                            damping: 25
                          }}
                          layout
                        >
                          {/* Task number and category badge */}
                          <div className="terminsprove__exam-task-header">
                            <div className="terminsprove__exam-task-number">
                              Opgave {canvasTask.index}
                            </div>
                            {isComplete && task && (
                              <div className="terminsprove__exam-task-badges">
                                <span 
                                  className="terminsprove__exam-task-category"
                                  style={{ '--cat-color': getCategoryColor(task.category) } as React.CSSProperties}
                                >
                                  {task.category.replace(/_/g, ' ')}
                                </span>
                                <span className="terminsprove__exam-task-points">
                                  {task.points} point
                                </span>
                              </div>
                            )}
                            {!isComplete && (
                              <div className="terminsprove__exam-task-loading-badge">
                                <span className="terminsprove__exam-task-spinner" />
                                {getPhaseLabel(canvasTask.phase)}
                              </div>
                            )}
                          </div>

                          {/* Loading skeleton */}
                          {!isComplete && (
                            <div className="terminsprove__exam-task-skeleton">
                              <div className="terminsprove__exam-skeleton-line terminsprove__exam-skeleton-line--long" />
                              <div className="terminsprove__exam-skeleton-line terminsprove__exam-skeleton-line--medium" />
                              <div className="terminsprove__exam-skeleton-line terminsprove__exam-skeleton-line--short" />
                            </div>
                          )}

                          {/* Completed task content */}
                          {isComplete && task && (
                            <motion.div
                              className="terminsprove__exam-task-body"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            >
                              {/* Context text */}
                              {displayText && (
                                <p className="terminsprove__exam-task-context">
                                  {displayText}
                                </p>
                              )}

                              {/* Image: placeholder while generating, actual image when ready */}
                              {canvasTask.imageGenerating && !canvasTask.imageUrl && (
                                <div className="terminsprove__exam-task-image-placeholder">
                                  <div className="terminsprove__exam-task-image-spinner" />
                                  <span>Genererer illustration...</span>
                                </div>
                              )}
                              {canvasTask.imageUrl && (
                                <motion.div 
                                  className="terminsprove__exam-task-image"
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                >
                                  <img 
                                    src={`http://localhost:5000${canvasTask.imageUrl}`}
                                    alt={`Illustration til opgave ${canvasTask.index}`}
                                    className="terminsprove__exam-task-illustration"
                                  />
                                </motion.div>
                              )}

                              {/* Sub-questions */}
                              {hasSubQuestions ? (
                                <div className="terminsprove__exam-subquestions">
                                  {task.subQuestions.map((sq, sqIdx) => (
                                    <motion.div
                                      key={sq.label}
                                      className="terminsprove__exam-subquestion"
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: sqIdx * 0.08 }}
                                    >
                                      <span className="terminsprove__exam-subquestion-label">
                                        {sq.label})
                                      </span>
                                      <div className="terminsprove__exam-subquestion-content">
                                        <p className="terminsprove__exam-subquestion-text">
                                          {sq.questionText}
                                        </p>
                                        <div className="terminsprove__exam-subquestion-meta">
                                          <span 
                                            className="terminsprove__exam-subquestion-difficulty"
                                            style={{ color: getDifficultyLabel(sq.difficulty).color }}
                                          >
                                            {getDifficultyLabel(sq.difficulty).label}
                                          </span>
                                          <span className="terminsprove__exam-subquestion-points">
                                            {sq.points}p
                                          </span>
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              ) : (
                                /* Legacy single question fallback */
                                task.questionText && !task.contextText && (
                                  <p className="terminsprove__exam-task-question-text">
                                    {task.questionText}
                                  </p>
                                )
                              )}

                              {/* Answer lines (like a real exam) */}
                              {hasSubQuestions && (
                                <div className="terminsprove__exam-answer-area">
                                  {task.subQuestions.map((sq) => (
                                    <div key={sq.label} className="terminsprove__exam-answer-line">
                                      <span className="terminsprove__exam-answer-label">{sq.label})</span>
                                      <div className="terminsprove__exam-answer-blank" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>

                {/* Exam Footer */}
                {!isGenerating && canvasTasks.filter(t => t.phase.toLowerCase() === 'complete').length === canvasTasks.length && canvasTasks.length > 0 && (
                  <div className="terminsprove__exam-footer">
                    <div className="terminsprove__exam-divider" />
                    <p className="terminsprove__exam-footer-text">
                      Slut på prøven · {canvasTasks.length} opgaver · {canvasTasks.reduce((sum, t) => sum + (t.task?.points || 0), 0)} point i alt
                    </p>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.section
              className="terminsprove__error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GlassCard variant="surface" padding="lg" radius="xl">
                <div className="terminsprove__error-content">
                  <span className="terminsprove__error-icon">⚠️</span>
                  <div>
                    <h3>Der opstod en fejl</h3>
                    <p>{error}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence>
          {result && result.tasks.length > 0 && (
            <motion.section
              className="terminsprove__results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Results Header */}
              <div className="terminsprove__results-header">
                <h2 className="terminsprove__section-title">
                  Genereret Terminsprøve
                </h2>
                <div className="terminsprove__results-stats">
                  <div className="terminsprove__results-stat">
                    <span className="terminsprove__results-stat-value">{result.tasks.length}</span>
                    <span className="terminsprove__results-stat-label">Opgaver</span>
                  </div>
                  <div className="terminsprove__results-stat">
                    <span className="terminsprove__results-stat-value">
                      {result.tasks.filter(t => t.validation.isValid).length}
                    </span>
                    <span className="terminsprove__results-stat-label">Validerede</span>
                  </div>
                  <div className="terminsprove__results-stat">
                    <span className="terminsprove__results-stat-value">
                      {result.metadata.totalIterations}
                    </span>
                    <span className="terminsprove__results-stat-label">Iterationer</span>
                  </div>
                </div>
              </div>

              {/* Task Cards with sub-questions */}
              <div className="terminsprove__task-list">
                {result.tasks.map((task, index) => {
                  const diffInfo = getDifficultyLabel(task.difficulty)
                  const isExpanded = expandedTask === task.id
                  const hasSubQuestions = task.subQuestions && task.subQuestions.length > 0
                  
                  return (
                    <motion.div
                      key={task.id}
                      className="terminsprove__task-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      style={{ '--task-color': getCategoryColor(task.category) } as React.CSSProperties}
                    >
                      <button
                        className="terminsprove__task-header"
                        onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                      >
                        <div className="terminsprove__task-number">{index + 1}</div>
                        <div className="terminsprove__task-info">
                          <h3 className="terminsprove__task-title">
                            {task.contextText 
                              ? (task.contextText.length > 80 ? task.contextText.slice(0, 80) + '...' : task.contextText)
                              : task.taskTypeId.replace(/_/g, ' ')
                            }
                          </h3>
                          <div className="terminsprove__task-meta">
                            <span 
                              className="terminsprove__task-difficulty"
                              style={{ color: diffInfo.color }}
                            >
                              {diffInfo.label}
                            </span>
                            <span className="terminsprove__task-time">
                              ⏱️ {Math.ceil(task.estimatedTimeSeconds / 60)} min
                            </span>
                            <span className="terminsprove__task-points">
                              ⭐ {task.points} point
                            </span>
                            {hasSubQuestions && (
                              <span className="terminsprove__task-subcount">
                                {task.subQuestions.length} delopgaver
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`terminsprove__task-validation ${task.validation.isValid ? 'valid' : 'invalid'}`}>
                          {task.validation.isValid ? '✓' : '!'}
                        </div>
                        <div className={`terminsprove__task-expand ${isExpanded ? 'expanded' : ''}`}>
                          ▼
                        </div>
                      </button>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            className="terminsprove__task-content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            {/* Context text */}
                            {task.contextText && (
                              <div className="terminsprove__task-question">
                                <h4>Kontekst</h4>
                                <p>{task.contextText}</p>
                              </div>
                            )}

                            {/* Generated illustration image */}
                            {task.imageUrl && (
                              <div className="terminsprove__task-image">
                                <img 
                                  src={task.imageUrl.startsWith('http') ? task.imageUrl : `http://localhost:5000${task.imageUrl}`}
                                  alt={`Illustration til opgave ${index + 1}`}
                                  className="terminsprove__task-illustration"
                                  loading="lazy"
                                />
                              </div>
                            )}

                            {/* Sub-questions with answers */}
                            {hasSubQuestions ? (
                              <div className="terminsprove__task-subquestions">
                                <h4>Delopgaver</h4>
                                {task.subQuestions.map((sq) => (
                                  <div key={sq.label} className="terminsprove__task-subquestion">
                                    <div className="terminsprove__task-subquestion-header">
                                      <span className="terminsprove__task-subquestion-label">{sq.label})</span>
                                      <span className="terminsprove__task-subquestion-text">{sq.questionText}</span>
                                    </div>
                                    <div className="terminsprove__task-subquestion-answer">
                                      <span className="terminsprove__answer-pill">
                                        Svar: {sq.answer.value} {sq.answer.unit || ''}
                                      </span>
                                      <span 
                                        className="terminsprove__task-subquestion-diff"
                                        style={{ color: getDifficultyLabel(sq.difficulty).color }}
                                      >
                                        {getDifficultyLabel(sq.difficulty).label}
                                      </span>
                                      <span className="terminsprove__task-subquestion-pts">{sq.points}p</span>
                                    </div>
                                    {sq.solutionSteps && sq.solutionSteps.length > 0 && (
                                      <ol className="terminsprove__solution-steps terminsprove__solution-steps--compact">
                                        {sq.solutionSteps.map(step => (
                                          <li key={step.stepNumber}>
                                            <span className="terminsprove__step-desc">{step.description}</span>
                                            <code className="terminsprove__step-math">{step.result}</code>
                                          </li>
                                        ))}
                                      </ol>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              /* Legacy single question */
                              <>
                                {task.questionText && (
                                  <div className="terminsprove__task-question">
                                    <h4>Opgavetekst</h4>
                                    <p>{task.questionText}</p>
                                  </div>
                                )}
                                
                                {task.answers && task.answers.length > 0 && (
                                  <div className="terminsprove__task-answer">
                                    <h4>Svar</h4>
                                    <div className="terminsprove__answer-pills">
                                      {task.answers.map((ans, i) => (
                                        <span key={i} className="terminsprove__answer-pill">
                                          {ans.value} {ans.unit || ''}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {task.solutionSteps && task.solutionSteps.length > 0 && (
                                  <div className="terminsprove__task-solution">
                                    <h4>Løsning</h4>
                                    <ol className="terminsprove__solution-steps">
                                      {task.solutionSteps.map(step => (
                                        <li key={step.stepNumber}>
                                          <span className="terminsprove__step-desc">{step.description}</span>
                                          <code className="terminsprove__step-math">{step.result}</code>
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {!task.validation.isValid && task.validation.issues && task.validation.issues.length > 0 && (
                              <div className="terminsprove__task-issues">
                                <h4>Valideringsproblemer</h4>
                                <ul>
                                  {task.validation.issues.map((issue, i) => (
                                    <li key={i}>{issue}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </div>

              {/* Distribution Charts */}
              <div className="terminsprove__distribution">
                <GlassCard variant="surface" padding="md" radius="xl">
                  <h4>Kategorifordeling</h4>
                  <div className="terminsprove__chart">
                    {Object.entries(result.metadata.categoryDistribution).map(([cat, count]) => (
                      <div key={cat} className="terminsprove__chart-bar">
                        <div 
                          className="terminsprove__chart-fill"
                          style={{ 
                            width: `${(count / result.tasks.length) * 100}%`,
                            backgroundColor: getCategoryColor(cat)
                          }}
                        />
                        <span className="terminsprove__chart-label">
                          {cat.replace(/_/g, ' ')} ({count})
                        </span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
                
                <GlassCard variant="surface" padding="md" radius="xl">
                  <h4>Sværhedsfordeling</h4>
                  <div className="terminsprove__chart">
                    {Object.entries(result.metadata.difficultyDistribution).map(([diff, count]) => {
                      const info = getDifficultyLabel(diff)
                      return (
                        <div key={diff} className="terminsprove__chart-bar">
                          <div 
                            className="terminsprove__chart-fill"
                            style={{ 
                              width: `${(count / result.tasks.length) * 100}%`,
                              backgroundColor: info.color
                            }}
                          />
                          <span className="terminsprove__chart-label">
                            {info.label} ({count})
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </GlassCard>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </motion.div>
    </PageTransition>
  )
})

