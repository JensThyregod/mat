import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { motion, LayoutGroup } from 'framer-motion'
import { useStore } from '../stores/storeProvider'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { TaskCard } from '../components/TaskCard'
import { TaskDetailOverlayWrapper } from '../components/TaskDetailOverlay'
import { PageTransition, AnimatedList, AnimatedListItem } from '../components/animation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { Task } from '../types'
import './TasksView.css'

// Staggered header animation variants
const headerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const headerItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

const titleVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

export const TasksView = observer(() => {
  useDocumentTitle('Opgaver')
  const { taskStore, authStore } = useStore()
  const navigate = useNavigate()
  const { taskId } = useParams<{ taskId?: string }>()
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  useEffect(() => {
    if (authStore.student) {
      taskStore.loadTasks(authStore.student.id)
    }
  }, [authStore.student, taskStore])

  useEffect(() => {
    if (taskId && taskStore.tasks.length > 0) {
      const task = taskStore.tasks.find(t => t.id === taskId)
      if (task) {
        setSelectedTask(task)
      }
    } else {
      setSelectedTask(null)
    }
  }, [taskId, taskStore.tasks])

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task)
    navigate(`/tasks/${task.id}`, { replace: false })
  }, [navigate])

  const handleClose = useCallback(() => {
    setSelectedTask(null)
    navigate('/tasks', { replace: false })
  }, [navigate])

  if (taskStore.loading) {
    return (
      <PageTransition className="center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Spinner />
        </motion.div>
        <motion.p 
          className="text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Henter opgaver...
        </motion.p>
      </PageTransition>
    )
  }

  if (taskStore.error) {
    return (
      <PageTransition>
        <EmptyState
          title="Der skete en fejl"
          description={taskStore.error}
        />
      </PageTransition>
    )
  }

  if (!taskStore.tasks.length) {
    return (
      <PageTransition>
        <EmptyState
          title="Ingen opgaver endnu"
          description="Din lærer har ikke tildelt opgaver endnu."
        />
      </PageTransition>
    )
  }

  // Calculate stats
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
        <section className="tasks">
          {/* Enhanced header with animations */}
          <motion.div 
            className="tasks__header"
            variants={headerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="tasks__header-content">
              <motion.p className="eyebrow" variants={headerItemVariants}>
                Dine opgaver
              </motion.p>
              <motion.h1 variants={titleVariants}>
                Matematik workspace
              </motion.h1>
              <motion.p className="text-muted" variants={headerItemVariants}>
                Opgaverne er klar med LaTeX-visning og autosave på dine svar.
              </motion.p>
            </div>
            
            {/* Stats pills */}
            <motion.div 
              className="tasks__stats"
              variants={headerItemVariants}
            >
              <div className="stat-pill">
                <span className="stat-pill__value">{totalTasks}</span>
                <span className="stat-pill__label">Opgaver</span>
              </div>
              <div className="stat-pill stat-pill--success">
                <span className="stat-pill__value">{completedTasks}</span>
                <span className="stat-pill__label">Færdige</span>
              </div>
            </motion.div>
          </motion.div>

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
                    onClick={() => handleTaskClick(task)}
                    isSelected={selectedTask?.id === task.id}
                  />
                </AnimatedListItem>
              )
            })}
          </AnimatedList>
        </section>

        <TaskDetailOverlayWrapper 
          task={selectedTask} 
          onClose={handleClose} 
        />
      </LayoutGroup>
    </PageTransition>
  )
})
