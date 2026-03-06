import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion'
import { useStore } from '../stores/storeProvider'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { TaskCard } from '../components/TaskCard'
import { TaskDetailOverlayWrapper } from '../components/TaskDetailOverlay'
import { PageTransition, AnimatedList, AnimatedListItem } from '../components/animation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { TrainingPanel } from './TrainingView'
import type { Task } from '../types'
import './TasksView.css'

type Segment = 'opgaver' | 'training'

const SEGMENTS: { value: Segment; label: string; icon: string }[] = [
  { value: 'opgaver', label: 'Opgavesæt', icon: '📚' },
  { value: 'training', label: 'Træning', icon: '🎯' },
]

export const TasksView = observer(() => {
  useDocumentTitle('Opgaver')
  const { taskStore, authStore } = useStore()
  const navigate = useNavigate()
  const { taskId } = useParams<{ taskId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialSegment = (searchParams.get('tab') as Segment) || 'opgaver'
  const [segment, setSegment] = useState<Segment>(initialSegment)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  useEffect(() => {
    if (authStore.student) {
      taskStore.loadTasks()
    }
  }, [authStore.student, taskStore])

  useEffect(() => {
    if (taskId && taskStore.tasks.length > 0) {
      const task = taskStore.tasks.find(t => t.id === taskId)
      if (task) {
        setSelectedTask(task)
        setSegment('opgaver')
      }
    } else {
      setSelectedTask(null)
    }
  }, [taskId, taskStore.tasks])

  const handleSegmentChange = useCallback((seg: Segment) => {
    setSegment(seg)
    if (seg === 'training') {
      setSearchParams({ tab: 'training' }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [setSearchParams])

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task)
    navigate(`/tasks/${task.id}`, { replace: false })
  }, [navigate])

  const handleClose = useCallback(() => {
    setSelectedTask(null)
    navigate('/tasks', { replace: false })
  }, [navigate])

  const totalTasks = taskStore.tasks.length
  const completedTasks = taskStore.tasks.filter(task => {
    const parts = task.parts ?? [task.latex]
    const answers = taskStore.answers[task.id] ?? []
    const answeredCount = answers.filter(Boolean).length
    return answeredCount === parts.length && parts.length > 0
  }).length

  return (
    <PageTransition>
      <LayoutGroup>
        <section className="tasks-combined">
          {/* Shared header */}
          <div className="tasks-combined__header">
            <div className="tasks-combined__header-text">
              <h1 className="tasks-combined__title">Opgaver</h1>
              <p className="tasks-combined__subtitle">
                {segment === 'opgaver'
                  ? 'Tildelte opgavesæt fra din lærer'
                  : 'Uendelig træning tilpasset dit niveau'}
              </p>
            </div>

            {segment === 'opgaver' && totalTasks > 0 && (
              <div className="tasks-combined__stats">
                <div className="stat-pill">
                  <span className="stat-pill__value">{totalTasks}</span>
                  <span className="stat-pill__label">Opgaver</span>
                </div>
                <div className="stat-pill stat-pill--success">
                  <span className="stat-pill__value">{completedTasks}</span>
                  <span className="stat-pill__label">Færdige</span>
                </div>
              </div>
            )}
          </div>

          {/* Segment control */}
          <div className="segment-control">
            {SEGMENTS.map(seg => (
              <button
                key={seg.value}
                className={`segment-control__item ${segment === seg.value ? 'segment-control__item--active' : ''}`}
                onClick={() => handleSegmentChange(seg.value)}
              >
                {segment === seg.value && (
                  <motion.div
                    className="segment-control__indicator"
                    layoutId="segment-indicator"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="segment-control__icon">{seg.icon}</span>
                <span className="segment-control__label">{seg.label}</span>
              </button>
            ))}
          </div>

          {/* Segment content */}
          <AnimatePresence mode="wait">
            {segment === 'opgaver' ? (
              <motion.div
                key="opgaver"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <OppgaverPanel
                  taskStore={taskStore}
                  selectedTask={selectedTask}
                  onTaskClick={handleTaskClick}
                />
              </motion.div>
            ) : (
              <motion.div
                key="training"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <TrainingPanel embedded />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {segment === 'opgaver' && (
          <TaskDetailOverlayWrapper
            task={selectedTask}
            onClose={handleClose}
          />
        )}
      </LayoutGroup>
    </PageTransition>
  )
})

const OppgaverPanel = observer(({ taskStore, selectedTask, onTaskClick }: {
  taskStore: { loading: boolean; error: string | null; tasks: Task[]; answers: Record<string, ({ updatedAt?: string } | null)[]> }
  selectedTask: Task | null
  onTaskClick: (task: Task) => void
}) => {
  if (taskStore.loading) {
    return (
      <div className="center" style={{ padding: '64px 0' }}>
        <Spinner />
        <p className="text-muted">Henter opgaver...</p>
      </div>
    )
  }

  if (taskStore.error) {
    return (
      <EmptyState
        title="Der skete en fejl"
        description={taskStore.error}
      />
    )
  }

  if (!taskStore.tasks.length) {
    return (
      <EmptyState
        title="Ingen opgaver endnu"
        description="Din lærer har ikke tildelt opgaver endnu."
      />
    )
  }

  return (
    <AnimatedList className="grid columns-2" staggerDelay={0.06}>
      {taskStore.tasks.map((task) => {
        const parts = task.parts ?? [task.latex]
        const answers = taskStore.answers[task.id] ?? []
        const answeredCount = answers.filter(Boolean).length
        const allAnswered = answeredCount === parts.length && parts.length > 0
        const updatedAt = answers
          .filter(Boolean)
          .map((a) => a!.updatedAt)
          .sort()
          .at(-1)
        return (
          <AnimatedListItem key={task.id}>
            <TaskCard
              task={task}
              answered={allAnswered}
              updatedAt={updatedAt}
              progress={{ answered: answeredCount, total: parts.length }}
              onClick={() => onTaskClick(task)}
              isSelected={selectedTask?.id === task.id}
            />
          </AnimatedListItem>
        )
      })}
    </AnimatedList>
  )
})
