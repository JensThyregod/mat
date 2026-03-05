import { useCallback, useEffect, useMemo, useState } from 'react'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { observer } from 'mobx-react-lite'
import { useStore } from '../stores/storeProvider'
import { TaskContent } from './TaskContent'
import { Spinner } from './Spinner'
import { Tag } from './Tag'
import { parseLatexToStructure, type ParsedQuestion } from '../utils/latexParser'
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
  const store = useStore()
  const { authStore, taskStore, api } = store
  const [partIndex, setPartIndex] = useState(0)
  const [taskState, setTaskState] = useState<TaskSetState | null>(null)
  const [revealed, setRevealed] = useState(false)

  const parts = task.parts ?? [task.latex]
  const totalParts = parts.length
  const currentPartLatex = parts[partIndex] ?? ''

  const parsedPart = useMemo(
    () => parseLatexToStructure(currentPartLatex),
    [currentPartLatex]
  )

  useEffect(() => {
    if (!task.id || !authStore.student) return
    
    api.loadTaskSetState(authStore.student.id, task.id).then((state) => {
      setTaskState(state)
    })
  }, [task.id, authStore.student, api])

  useKeyboardShortcut('Escape', onClose)
  useBodyScrollLock()

  const getQuestionState = useCallback(
    (questionIndex: number) => {
      return taskState?.parts[partIndex]?.[questionIndex] ?? null
    },
    [taskState, partIndex]
  )

  const handleAnswerChange = useCallback(
    (questionIndex: number, value: string) => {
      if (!task.id || !authStore.student || revealed) return

      api.saveQuestionAnswer(
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
    [task.id, authStore.student, partIndex, api, revealed]
  )

  const handleCheckAnswers = useCallback(async () => {
    if (!task.id || !authStore.student) return

    for (let i = 0; i < parsedPart.questions.length; i++) {
      const currentState = taskState?.parts[partIndex]?.[i]
      const answer = currentState?.answer ?? ''
      const question = parsedPart.questions[i]
      const status = checkAnswerCorrectness(answer, question)

      const newState = await api.saveQuestionAnswer(
        authStore.student.id,
        task.id,
        partIndex,
        i,
        answer,
        true,
        status
      )
      setTaskState(newState)
    }
    setRevealed(true)
  }, [task.id, authStore.student, partIndex, taskState, parsedPart.questions, api])

  const isPartAlreadyChecked = useCallback((pi: number) => {
    const partState = taskState?.parts[pi]
    if (!partState) return false
    return Object.values(partState).some(q => q.validated && q.status !== 'neutral')
  }, [taskState])

  const goTo = useCallback((i: number) => {
    setPartIndex(i)
    setRevealed(isPartAlreadyChecked(i))
  }, [isPartAlreadyChecked])

  const handleNextPart = useCallback(() => {
    if (partIndex < totalParts - 1) {
      goTo(partIndex + 1)
    } else {
      onClose()
    }
  }, [partIndex, totalParts, goTo, onClose])

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

  const correctAnswers: Map<number, string> = useMemo(() => {
    const map = new Map<number, string>()
    for (const q of parsedPart.questions) {
      if (q.correctAnswer) map.set(q.index, q.correctAnswer)
    }
    return map
  }, [parsedPart.questions])

  const hasAnyAnswer = answers.some(a => a.trim().length > 0)

  const currentCategory = getCategoryByPartIndex(partIndex)

  const overlayContent = (
    <motion.div
      className="task-overlay-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={task.title}
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
                answerStates={revealed ? answerStates : new Map()}
                correctAnswers={revealed ? correctAnswers : new Map()}
                onAnswerChange={handleAnswerChange}
                disabled={!authStore.student || revealed}
              />

              <div className="task-detail__actions">
                {!revealed ? (
                  <button
                    className="task-detail__check-btn"
                    onClick={handleCheckAnswers}
                    disabled={!hasAnyAnswer}
                  >
                    Tjek svar
                  </button>
                ) : (
                  <button
                    className="task-detail__next-btn"
                    onClick={handleNextPart}
                  >
                    {partIndex < totalParts - 1 ? 'Næste opgave' : 'Afslut'}
                  </button>
                )}
              </div>

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

