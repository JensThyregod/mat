import { Link } from 'react-router-dom'
import type { Task } from '../types'
import { Tag } from './Tag'

type Props = {
  task: Task
  answered?: boolean
  progress?: { answered: number; total: number }
  updatedAt?: string
}

export const TaskCard = ({ task, answered, updatedAt, progress }: Props) => {
  const formattedDate = task.dueAt
    ? new Date(task.dueAt).toLocaleDateString('da-DK', {
        day: 'numeric',
        month: 'short',
      })
    : null

  return (
    <Link to={`/tasks/${task.id}`} className="task-card card glass-panel">
      <div className="task-card__top">
        <div className="task-card__title">
          <h3>{task.title}</h3>
          <div className="task-card__meta">
            <Tag label={task.difficulty} tone="info" />
            {formattedDate ? <Tag label={`Forfald: ${formattedDate}`} /> : null}
          </div>
        </div>
        {answered ? (
          <Tag
            label={updatedAt ? `Afleveret ${new Date(updatedAt).toLocaleString('da-DK')}` : 'Afleveret'}
            tone="success"
          />
        ) : (
          <Tag label="Mangler svar" tone="warning" />
        )}
        {progress ? (
          <Tag
            label={`Progress ${progress.answered}/${progress.total}`}
            tone={progress.answered === progress.total ? 'success' : 'info'}
          />
        ) : null}
      </div>
      <div className="task-card__tags">
        {task.tags.map((tag) => (
          <span key={tag} className="chip">
            #{tag}
          </span>
        ))}
      </div>
    </Link>
  )
}

