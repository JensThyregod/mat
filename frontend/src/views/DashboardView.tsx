import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { motion } from 'framer-motion'
import { useStore } from '../stores/storeProvider'
import { GlassCard, InteractiveCard } from '../components/GlassCard'
import { ProgressRing } from '../components/ProgressRing'
import { PageTransition } from '../components/animation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './DashboardView.css'

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
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

// Quick action cards data
const QUICK_ACTIONS = [
  {
    id: 'tasks',
    path: '/tasks',
    icon: '📚',
    title: 'Opgaver',
    description: 'Se dine tildelte opgaver',
    color: 'var(--color-algebra)',
  },
  {
    id: 'skills',
    path: '/skills',
    icon: '⭐',
    title: 'Færdigheder',
    description: 'Se din progression',
    color: 'var(--color-geometri)',
  },
  {
    id: 'practice',
    path: '/practice',
    icon: '✏️',
    title: 'Øvelse',
    description: 'Træn ligninger',
    color: 'var(--color-statistik)',
  },
]

// Category progress data (mock - would come from skill tree later)
const CATEGORY_PROGRESS = [
  { id: 'algebra', name: 'Tal & Algebra', icon: '🔢', progress: 72, color: 'algebra' as const },
  { id: 'geometri', name: 'Geometri', icon: '📐', progress: 45, color: 'geometri' as const },
  { id: 'statistik', name: 'Statistik', icon: '📊', progress: 33, color: 'statistik' as const },
]

export const DashboardView = observer(() => {
  useDocumentTitle('Hjem')
  const { authStore, taskStore } = useStore()
  const studentName = authStore.student?.name ?? 'Elev'
  
  // Calculate task statistics
  const stats = useMemo(() => {
    const total = taskStore.tasks.length
    const completed = taskStore.tasks.filter(task => {
      const parts = task.parts ?? [task.latex]
      const answers = taskStore.answers[task.id] ?? []
      const answeredCount = answers.filter(Boolean).length
      return answeredCount === parts.length && parts.length > 0
    }).length
    
    const inProgress = taskStore.tasks.filter(task => {
      const parts = task.parts ?? [task.latex]
      const answers = taskStore.answers[task.id] ?? []
      const answeredCount = answers.filter(Boolean).length
      return answeredCount > 0 && answeredCount < parts.length
    }).length
    
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0
    
    return { total, completed, inProgress, progressPercent }
  }, [taskStore.tasks, taskStore.answers])

  // Get greeting based on time
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Godmorgen'
    if (hour < 18) return 'God eftermiddag'
    return 'Godaften'
  }, [])

  // Overall progress (average of categories)
  const overallProgress = Math.round(
    CATEGORY_PROGRESS.reduce((sum, cat) => sum + cat.progress, 0) / CATEGORY_PROGRESS.length
  )

  return (
    <PageTransition>
      <motion.div
        className="dashboard"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <motion.section className="dashboard__hero" variants={itemVariants}>
          <div className="dashboard__greeting">
            <p className="dashboard__greeting-label">{greeting}</p>
            <h1 className="dashboard__greeting-name">{studentName}</h1>
            <p className="dashboard__greeting-subtitle">
              Klar til at lære noget nyt i dag?
            </p>
          </div>
          
          <div className="dashboard__progress-card">
            <GlassCard variant="elevated" padding="lg" radius="2xl">
              <div className="dashboard__progress-content">
                <ProgressRing 
                  value={overallProgress} 
                  size="lg"
                  color="accent"
                  label="total"
                />
                <div className="dashboard__progress-stats">
                  <div className="dashboard__progress-stat">
                    <span className="dashboard__progress-stat-value">{stats.completed}</span>
                    <span className="dashboard__progress-stat-label">Færdige</span>
                  </div>
                  <div className="dashboard__progress-stat">
                    <span className="dashboard__progress-stat-value">{stats.inProgress}</span>
                    <span className="dashboard__progress-stat-label">I gang</span>
                  </div>
                  <div className="dashboard__progress-stat">
                    <span className="dashboard__progress-stat-value">{stats.total}</span>
                    <span className="dashboard__progress-stat-label">Total</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </motion.section>

        {/* Quick Actions */}
        <motion.section className="dashboard__section" variants={itemVariants}>
          <h2 className="dashboard__section-title">Genveje</h2>
          <div className="dashboard__quick-actions">
            {QUICK_ACTIONS.map((action, index) => (
              <motion.div
                key={action.id}
                variants={itemVariants}
                custom={index}
              >
                <Link to={action.path} className="dashboard__action-link">
                  <InteractiveCard 
                    padding="lg" 
                    radius="xl"
                    className="dashboard__action-card"
                  >
                    <div 
                      className="dashboard__action-icon"
                      style={{ '--action-color': action.color } as React.CSSProperties}
                    >
                      {action.icon}
                    </div>
                    <div className="dashboard__action-content">
                      <h3 className="dashboard__action-title">{action.title}</h3>
                      <p className="dashboard__action-desc">{action.description}</p>
                    </div>
                    <div className="dashboard__action-arrow">→</div>
                  </InteractiveCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Category Progress */}
        <motion.section className="dashboard__section" variants={itemVariants}>
          <h2 className="dashboard__section-title">Kategorier</h2>
          <div className="dashboard__categories">
            {CATEGORY_PROGRESS.map((category, index) => (
              <motion.div
                key={category.id}
                variants={itemVariants}
                custom={index}
              >
                <GlassCard 
                  variant="surface" 
                  padding="md" 
                  radius="lg"
                  className="dashboard__category-card"
                >
                  <div className="dashboard__category-header">
                    <span className="dashboard__category-icon">{category.icon}</span>
                    <span className="dashboard__category-name">{category.name}</span>
                  </div>
                  <div className="dashboard__category-progress">
                    <div className="dashboard__category-bar">
                      <motion.div 
                        className="dashboard__category-fill"
                        style={{ 
                          backgroundColor: `var(--color-${category.color})`,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${category.progress}%` }}
                        transition={{ 
                          duration: 1, 
                          delay: 0.3 + index * 0.1,
                          ease: [0.22, 1, 0.36, 1]
                        }}
                      />
                    </div>
                    <span 
                      className="dashboard__category-percent"
                      style={{ color: `var(--color-${category.color})` }}
                    >
                      {category.progress}%
                    </span>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Recent Activity */}
        {taskStore.tasks.length > 0 && (
          <motion.section className="dashboard__section" variants={itemVariants}>
            <div className="dashboard__section-header">
              <h2 className="dashboard__section-title">Seneste opgaver</h2>
              <Link to="/tasks" className="dashboard__section-link">
                Se alle →
              </Link>
            </div>
            <div className="dashboard__recent">
              {taskStore.tasks.slice(0, 3).map((task, index) => {
                const parts = task.parts ?? [task.latex]
                const answers = taskStore.answers[task.id] ?? []
                const answeredCount = answers.filter(Boolean).length
                const isComplete = answeredCount === parts.length
                
                return (
                  <motion.div
                    key={task.id}
                    variants={itemVariants}
                    custom={index}
                  >
                    <Link to={`/tasks/${task.id}`}>
                      <InteractiveCard 
                        padding="md" 
                        radius="lg"
                        className="dashboard__recent-card"
                      >
                        <div className="dashboard__recent-info">
                          <h4 className="dashboard__recent-title">{task.title}</h4>
                          <span className="dashboard__recent-progress">
                            {answeredCount}/{parts.length} spørgsmål
                          </span>
                        </div>
                        <div className={`dashboard__recent-status ${isComplete ? 'dashboard__recent-status--complete' : ''}`}>
                          {isComplete ? '✓' : `${Math.round((answeredCount / parts.length) * 100)}%`}
                        </div>
                      </InteractiveCard>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </motion.section>
        )}
      </motion.div>
    </PageTransition>
  )
})

