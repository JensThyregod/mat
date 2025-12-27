import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { observer } from 'mobx-react-lite'
import { useStore } from '../stores/storeProvider'
import { TaskContent } from './TaskContent'
import { Spinner } from './Spinner'
import { Tag } from './Tag'
import { parseLatexToStructure, type ParsedQuestion } from '../utils/latexParser'
import { loadTaskSetState, saveQuestionAnswer } from '../services/mockApi'
import { getCategoryByPartIndex, CATEGORIES } from '../utils/taskCategory'
import { checkAnswer } from '../utils/answerChecker'
import type { Task, TaskSetState } from '../types'

// Helper to check if an answer is correct using smart type-aware validation
function checkAnswerCorrectness(
  userAnswer: string,
  question: ParsedQuestion | undefined
): 'neutral' | 'correct' | 'incorrect' {
  if (!question || !question.correctAnswer) return 'neutral'
  
  return checkAnswer(
    userAnswer,
    question.correctAnswer,
    question.answerType,
    question.acceptAlternatives
  )
}

interface TaskDetailOverlayProps {
  task: Task
  onClose: () => void
}

export const TaskDetailOverlay = observer(({ task, onClose }: TaskDetailOverlayProps) => {
  const { authStore, taskStore } = useStore()
  const [partIndex, setPartIndex] = useState(0)
  const [taskState, setTaskState] = useState<TaskSetState | null>(null)

  const parts = task.parts ?? [task.latex]
  const totalParts = parts.length
  const currentPartLatex = parts[partIndex] ?? ''

  // Parse the current part to get questions with correct answers
  const parsedPart = useMemo(
    () => parseLatexToStructure(currentPartLatex),
    [currentPartLatex]
  )

  // Load task set state from "backend"
  useEffect(() => {
    if (!task.id || !authStore.student) return
    
    loadTaskSetState(authStore.student.id, task.id).then((state) => {
      setTaskState(state)
    })
  }, [task.id, authStore.student])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Prevent body scroll when overlay is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Get current answer for a question from state
  const getQuestionState = useCallback(
    (questionIndex: number) => {
      return taskState?.parts[partIndex]?.[questionIndex] ?? null
    },
    [taskState, partIndex]
  )

  // Handle answer change - save immediately to backend
  const handleAnswerChange = useCallback(
    (questionIndex: number, value: string) => {
      if (!task.id || !authStore.student) return

      saveQuestionAnswer(
        authStore.student.id,
        task.id,
        partIndex,
        questionIndex,
        value,
        false,
        'neutral'
      ).then((newState) => {
        setTaskState(newState)
      })
    },
    [task.id, authStore.student, partIndex]
  )

  // Handle blur - validate the answer
  const handleAnswerBlur = useCallback(
    (questionIndex: number) => {
      if (!task.id || !authStore.student) return

      const currentState = taskState?.parts[partIndex]?.[questionIndex]
      const answer = currentState?.answer ?? ''
      
      const question = parsedPart.questions[questionIndex]
      const status = checkAnswerCorrectness(answer, question)

      saveQuestionAnswer(
        authStore.student.id,
        task.id,
        partIndex,
        questionIndex,
        answer,
        true,
        status
      ).then((newState) => {
        setTaskState(newState)
      })
    },
    [task.id, authStore.student, partIndex, taskState, parsedPart.questions]
  )

  const goTo = (i: number) => setPartIndex(i)

  // Build answers array and states from taskState
  const answers: string[] = []
  const answerStates: Map<number, { validated: boolean; status: 'neutral' | 'correct' | 'incorrect' }> = new Map()
  
  for (let i = 0; i < parsedPart.questions.length; i++) {
    const qState = getQuestionState(i)
    answers.push(qState?.answer ?? '')
    if (qState) {
      answerStates.set(i, { validated: qState.validated, status: qState.status })
    }
  }

  // Get current category based on part index
  const currentCategory = getCategoryByPartIndex(partIndex)

  const overlayContent = (
    <motion.div
      className="task-overlay-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.article
        className="task-overlay-content glass-panel"
        layoutId={`task-card-${task.id}`}
        onClick={(e) => e.stopPropagation()}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          // Close if dragged down more than 100px with velocity
          if (info.offset.y > 100 || info.velocity.y > 500) {
            onClose()
          }
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
          mass: 1,
        }}
      >
        {/* Close button */}
        <button 
          className="task-overlay-close" 
          onClick={onClose}
          aria-label="Luk"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header with morphing elements */}
        <div className="task-overlay-header">
          <div className={`category-badge category-badge--${currentCategory.id}`}>
            <span className="category-badge__dot" />
            {currentCategory.name}
          </div>
          <motion.h1 layoutId={`task-title-${task.id}`}>{task.title}</motion.h1>
          <div className="task-overlay-meta">
            <motion.div layoutId={`task-difficulty-${task.id}`}>
              <Tag label={task.difficulty} tone="info" />
            </motion.div>
            {totalParts > 1 && (
              <div className="pill">Opgave {partIndex + 1} / {totalParts}</div>
            )}
          </div>
        </div>

        {/* Tags */}
        <motion.div className="task-overlay-tags" layoutId={`task-tags-${task.id}`}>
          {task.tags.map((tag) => (
            <span key={tag} className="chip">
              #{tag}
            </span>
          ))}
        </motion.div>

        {/* Content area - fades in after morph */}
        <motion.div
          className="task-overlay-body"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          {taskStore.loading ? (
            <div className="center">
              <Spinner />
              <p className="text-muted">Henter opgave...</p>
            </div>
          ) : (
            <>
              <TaskContent
                latex={currentPartLatex}
                answers={answers}
                answerStates={answerStates}
                onAnswerChange={handleAnswerChange}
                onAnswerBlur={handleAnswerBlur}
                disabled={!authStore.student}
              />

              {totalParts > 1 && (
                <div className="task-detail__pager">
                  <div className="dot-nav">
                    {parts.map((_, i) => {
                      const hasAnswers = taskState?.parts[i] && Object.keys(taskState.parts[i]).length > 0
                      const partCategory = getCategoryByPartIndex(i)
                      return (
                        <button
                          key={i}
                          type="button"
                          className={`dot ${partCategory.cssClass} ${i === partIndex ? 'active' : ''} ${
                            hasAnswers ? 'done' : ''
                          }`}
                          onClick={() => goTo(i)}
                          aria-label={`Opgave ${i + 1} - ${partCategory.name}`}
                          title={`Opgave ${i + 1}: ${partCategory.name}`}
                        >
                          {i + 1}
                        </button>
                      )
                    })}
                  </div>
                  <div className="category-legend">
                    <span className="category-legend__item">
                      <span className="category-legend__dot category-legend__dot--algebra" />
                      {CATEGORIES.algebra.shortName}
                    </span>
                    <span className="category-legend__item">
                      <span className="category-legend__dot category-legend__dot--geometri" />
                      {CATEGORIES.geometri.shortName}
                    </span>
                    <span className="category-legend__item">
                      <span className="category-legend__dot category-legend__dot--statistik" />
                      {CATEGORIES.statistik.shortName}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.article>
    </motion.div>
  )

  return createPortal(overlayContent, document.body)
})

// Wrapper component that handles AnimatePresence
export const TaskDetailOverlayWrapper = observer(({ 
  task, 
  onClose 
}: { 
  task: Task | null
  onClose: () => void 
}) => {
  return (
    <AnimatePresence>
      {task && <TaskDetailOverlay task={task} onClose={onClose} />}
    </AnimatePresence>
  )
})

