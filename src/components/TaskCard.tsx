import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import classNames from 'classnames'
import type { Task } from '../types'
import { Tag } from './Tag'
import { getCategoryFromType } from '../utils/taskCategory'
import './TaskCard.css'

type Props = {
  task: Task
  answered?: boolean
  progress?: { answered: number; total: number }
  updatedAt?: string
  onClick?: () => void
  isSelected?: boolean
}

export const TaskCard = ({ task, answered, updatedAt, progress, onClick, isSelected }: Props) => {
  const formattedDate = task.dueAt
    ? new Date(task.dueAt).toLocaleDateString('da-DK', {
        day: 'numeric',
        month: 'short',
      })
    : null

  // Get category for color theming
  const category = getCategoryFromType(task.type ?? '')
  const categoryColors = {
    algebra: 'var(--color-algebra)',
    geometri: 'var(--color-geometri)',
    statistik: 'var(--color-statistik)',
  }
  const accentColor = categoryColors[category] || 'var(--color-accent)'

  // 3D tilt effect on hover
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x, { stiffness: 500, damping: 50 })
  const mouseYSpring = useSpring(y, { stiffness: 500, damping: 50 })

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['2deg', '-2deg'])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-2deg', '2deg'])

  const glowX = useTransform(mouseXSpring, [-0.5, 0.5], ['0%', '100%'])
  const glowY = useTransform(mouseYSpring, [-0.5, 0.5], ['0%', '100%'])

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    if (!onClick) return
    const rect = event.currentTarget.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top
    const xPct = mouseX / width - 0.5
    const yPct = mouseY / height - 0.5
    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  // Calculate progress percentage
  const progressPercent = progress 
    ? Math.round((progress.answered / progress.total) * 100) 
    : 0

  return (
    <motion.article
      className={classNames('task-card-new', {
        'task-card-new--clickable': !!onClick,
        'task-card-new--selected': isSelected,
        'task-card-new--complete': answered,
      })}
      style={{ 
        '--task-accent': accentColor,
      } as React.CSSProperties}
      layoutId={`task-card-${task.id}`}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={onClick ? { 
        y: -4,
        transition: { type: 'spring', stiffness: 400, damping: 25 }
      } : undefined}
      whileTap={onClick ? { 
        scale: 0.98,
        transition: { duration: 0.1 }
      } : undefined}
    >
      {/* Glass background */}
      <div className="task-card-new__bg" />
      
      {/* Gradient border */}
      <div className="task-card-new__border" />
      
      {/* Hover glow effect */}
      <motion.div
        className="task-card-new__glow"
        style={{
          background: useTransform(
            [glowX, glowY],
            ([x, y]) => `radial-gradient(500px circle at ${x} ${y}, ${accentColor}10, transparent 50%)`
          ),
        }}
      />

      {/* 3D content wrapper */}
      <motion.div 
        className="task-card-new__content"
        style={{
          rotateX: onClick ? rotateX : 0,
          rotateY: onClick ? rotateY : 0,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Category indicator */}
        <div className="task-card-new__category-bar" />
        
        {/* Header */}
        <div className="task-card-new__header">
          <div className="task-card-new__title-section">
            <motion.h3 
              className="task-card-new__title"
              layoutId={`task-title-${task.id}`}
            >
              {task.title}
            </motion.h3>
            <div className="task-card-new__meta">
              <motion.div layoutId={`task-difficulty-${task.id}`}>
                <Tag label={task.difficulty} tone="info" />
              </motion.div>
              {formattedDate && <Tag label={`Forfald: ${formattedDate}`} />}
            </div>
          </div>
          
          {/* Status indicator */}
          <div className="task-card-new__status">
            {answered ? (
              <div className="task-card-new__status-complete">
                <span className="task-card-new__status-icon">✓</span>
              </div>
            ) : progress ? (
              <div className="task-card-new__status-progress">
                <svg viewBox="0 0 36 36" className="task-card-new__progress-ring">
                  <circle
                    className="task-card-new__progress-track"
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    strokeWidth="3"
                  />
                  <circle
                    className="task-card-new__progress-fill"
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    strokeWidth="3"
                    strokeDasharray={`${progressPercent} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="task-card-new__progress-text">
                  {progress.answered}/{progress.total}
                </span>
              </div>
            ) : (
              <Tag label="Mangler svar" tone="warning" />
            )}
          </div>
        </div>

        {/* Tags */}
        <motion.div 
          className="task-card-new__tags" 
          layoutId={`task-tags-${task.id}`}
        >
          {task.tags.map((tag) => (
            <span key={tag} className="task-card-new__tag">
              {tag}
            </span>
          ))}
        </motion.div>

        {/* Last updated */}
        {updatedAt && (
          <div className="task-card-new__updated">
            Sidst opdateret {new Date(updatedAt).toLocaleDateString('da-DK', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </motion.div>
    </motion.article>
  )
}
