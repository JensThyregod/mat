import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { useStore } from '../stores/storeProvider'
import { TaskContent } from '../components/TaskContent'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { PageTransition } from '../components/animation'
import { parseLatexToStructure } from '../utils/latexParser'
import { loadTaskSetState, saveQuestionAnswer } from '../services/mockApi'
import { getCategoryByPartIndex, CATEGORIES } from '../utils/taskCategory'
import type { TaskSetState } from '../types'

// Helper to check if an answer is correct
function checkAnswerCorrectness(
  userAnswer: string,
  correctAnswer: string | null
): 'neutral' | 'correct' | 'incorrect' {
  if (!userAnswer.trim() || !correctAnswer) return 'neutral'
  
  const normalize = (s: string) =>
    s.trim().toLowerCase().replace(/\s+/g, '').replace(/,/g, '.').replace(/°/g, '').replace(/^\+/, '')
  
  const normalizedUser = normalize(userAnswer)
  const acceptableAnswers = correctAnswer.split('|').map(normalize)
  
  return acceptableAnswers.includes(normalizedUser) ? 'correct' : 'incorrect'
}

export const TaskDetailView = observer(() => {
  const { taskId } = useParams<{ taskId: string }>()
  const { taskStore, authStore } = useStore()
  const [partIndex, setPartIndex] = useState(0)
  // Task set state loaded from "backend"
  const [taskState, setTaskState] = useState<TaskSetState | null>(null)

  const task = useMemo(
    () => taskStore.tasks.find((t) => t.id === taskId),
    [taskId, taskStore.tasks]
  )

  const parts = task?.parts ?? (task ? [task.latex] : [])
  const totalParts = parts.length
  const currentPartLatex = parts[partIndex] ?? ''

  // Parse the current part to get questions with correct answers
  const parsedPart = useMemo(
    () => parseLatexToStructure(currentPartLatex),
    [currentPartLatex]
  )

  // Load task from store if not present
  useEffect(() => {
    if (taskId && !task) {
      taskStore.getTask(taskId)
    }
  }, [taskId, task, taskStore])

  // Load task set state from "backend"
  useEffect(() => {
    if (!taskId || !authStore.student) return
    
    loadTaskSetState(authStore.student.id, taskId).then((state) => {
      setTaskState(state)
    })
  }, [taskId, authStore.student])

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
      if (!taskId || !authStore.student) return

      // Save with neutral status (not validated yet)
      saveQuestionAnswer(
        authStore.student.id,
        taskId,
        partIndex,
        questionIndex,
        value,
        false, // not validated
        'neutral'
      ).then((newState) => {
        setTaskState(newState)
      })
    },
    [taskId, authStore.student, partIndex]
  )

  // Handle blur - validate the answer
  const handleAnswerBlur = useCallback(
    (questionIndex: number) => {
      if (!taskId || !authStore.student) return

      const currentState = taskState?.parts[partIndex]?.[questionIndex]
      const answer = currentState?.answer ?? ''
      
      // Find correct answer for this question
      const question = parsedPart.questions[questionIndex]
      const correctAnswer = question?.correctAnswer ?? null
      
      // Calculate status
      const status = checkAnswerCorrectness(answer, correctAnswer)

      // Save with validated status
      saveQuestionAnswer(
        authStore.student.id,
        taskId,
        partIndex,
        questionIndex,
        answer,
        true, // validated
        status
      ).then((newState) => {
        setTaskState(newState)
      })
    },
    [taskId, authStore.student, partIndex, taskState, parsedPart.questions]
  )

  const goTo = (i: number) => setPartIndex(i)

  if (taskStore.loading) {
    return (
      <PageTransition className="center">
        <Spinner />
        <p className="text-muted">Henter opgave...</p>
      </PageTransition>
    )
  }

  if (!taskId || (!task && !taskStore.loading)) {
    return (
      <PageTransition>
        <EmptyState
          title="Opgaven blev ikke fundet"
          description="Prøv at gå tilbage til opgavelisten."
        />
      </PageTransition>
    )
  }

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

  return (
    <PageTransition>
      <section className="task-detail glass-panel">
        <div className="task-detail__header">
          <div>
            <div className={`category-badge category-badge--${currentCategory.id}`}>
              <span className="category-badge__dot" />
              {currentCategory.name}
            </div>
            <h1>{task?.title}</h1>
          </div>
          {totalParts > 1 && (
            <div className="pill">Opgave {partIndex + 1} / {totalParts}</div>
          )}
        </div>

        {task ? (
          <div className="task-detail__body">
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

            {taskStore.error && (
              <div className="form-error">{taskStore.error}</div>
            )}
          </div>
        ) : (
          <div className="text-muted">Henter opgaven...</div>
        )}
      </section>
    </PageTransition>
  )
})
