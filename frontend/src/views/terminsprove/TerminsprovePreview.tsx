import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '../../components/GlassCard'
import type { CanvasTask, GeneratedTask, TerminsproveResult } from './types'
import { API_BASE_URL, getCategoryColor, getDifficultyLabel, getPhaseLabel } from './utils'

// ─── Exam Canvas (streaming tasks) ────────────────────────────────────────────

interface ExamCanvasProps {
  canvasTasks: CanvasTask[]
  canvasRef: React.RefObject<HTMLDivElement | null>
  examPart: string
  isGenerating: boolean
  generationSpeed: number | null
  onCancel: () => void
  onReset: () => void
}

export function ExamCanvas({
  canvasTasks,
  canvasRef,
  examPart,
  isGenerating,
  generationSpeed,
  onCancel,
  onReset,
}: ExamCanvasProps) {
  const completedCount = canvasTasks.filter(t => t.phase.toLowerCase() === 'complete').length
  const allComplete = !isGenerating && completedCount === canvasTasks.length && canvasTasks.length > 0

  return (
    <motion.section
      className="terminsprove__exam"
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1] as const,
        scale: { duration: 0.5 }
      }}
    >
      <div className="terminsprove__exam-paper" ref={canvasRef}>
        {/* Exam Header */}
        <div className="terminsprove__exam-header">
          <div className="terminsprove__exam-header-top">
            <div className="terminsprove__exam-logo">Terminsprøve</div>
            <div className="terminsprove__exam-meta-info">
              {isGenerating && (
                <>
                  <span className="terminsprove__exam-generating-badge">
                    <span className="terminsprove__exam-generating-dot" />
                    Genererer...
                  </span>
                  <motion.button
                    className="terminsprove__exam-cancel-btn"
                    onClick={onCancel}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    ✕ Annuller
                  </motion.button>
                </>
              )}
              {!isGenerating && completedCount > 0 && (
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
              {completedCount} / {canvasTasks.length} færdige
            </span>
            {generationSpeed && (
              <>
                <span>•</span>
                <span>{generationSpeed < 1000 ? `${generationSpeed}ms` : `${(generationSpeed / 1000).toFixed(1)}s`}/opgave</span>
              </>
            )}
          </div>
          <div className="terminsprove__exam-divider" />
        </div>

        {/* Exam Tasks */}
        <div className="terminsprove__exam-tasks">
          <AnimatePresence mode="popLayout">
            {canvasTasks.map((canvasTask) => (
              <ExamTaskCard key={canvasTask.id} canvasTask={canvasTask} />
            ))}
          </AnimatePresence>
        </div>

        {/* Exam Footer */}
        {allComplete && (
          <div className="terminsprove__exam-footer">
            <div className="terminsprove__exam-divider" />
            <p className="terminsprove__exam-footer-text">
              Slut på prøven · {canvasTasks.length} opgaver · {canvasTasks.reduce((sum, t) => sum + (t.task?.points || 0), 0)} point i alt
            </p>
            <div className="terminsprove__exam-footer-actions">
              <motion.button
                className="terminsprove__new-exam-btn"
                onClick={onReset}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Generer ny terminsprøve
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  )
}

// ─── Single exam task card (in the streaming canvas) ──────────────────────────

function ExamTaskCard({ canvasTask }: { canvasTask: CanvasTask }) {
  const isComplete = canvasTask.phase.toLowerCase() === 'complete'
  const task = canvasTask.task
  const hasSubQuestions = task?.subQuestions && task.subQuestions.length > 0
  const displayText = task?.contextText || task?.questionText || ''

  return (
    <motion.div
      className={`terminsprove__exam-task ${isComplete ? 'complete' : 'loading'}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      layout
    >
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

      {!isComplete && (
        <div className="terminsprove__exam-task-skeleton">
          <div className="terminsprove__exam-skeleton-line terminsprove__exam-skeleton-line--long" />
          <div className="terminsprove__exam-skeleton-line terminsprove__exam-skeleton-line--medium" />
          <div className="terminsprove__exam-skeleton-line terminsprove__exam-skeleton-line--short" />
        </div>
      )}

      {isComplete && task && (
        <motion.div
          className="terminsprove__exam-task-body"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
        >
          {displayText && (
            <p className="terminsprove__exam-task-context">{displayText}</p>
          )}

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
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
            >
              <img
                src={`${API_BASE_URL}${canvasTask.imageUrl}`}
                alt={`Illustration til opgave ${canvasTask.index}`}
                className="terminsprove__exam-task-illustration"
              />
            </motion.div>
          )}

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
            task.questionText && !task.contextText && (
              <p className="terminsprove__exam-task-question-text">
                {task.questionText}
              </p>
            )
          )}

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
}

// ─── Results section (shown after generation completes) ───────────────────────

interface ResultsSectionProps {
  result: TerminsproveResult
  expandedTask: string | null
  onToggleTask: (taskId: string) => void
}

export function ResultsSection({ result, expandedTask, onToggleTask }: ResultsSectionProps) {
  return (
    <motion.section
      className="terminsprove__results"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
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

      <div className="terminsprove__task-list">
        {result.tasks.map((task, index) => (
          <ResultTaskCard
            key={task.id}
            task={task}
            index={index}
            isExpanded={expandedTask === task.id}
            onToggle={() => onToggleTask(task.id)}
          />
        ))}
      </div>

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
  )
}

// ─── Single result task card (expandable) ─────────────────────────────────────

interface ResultTaskCardProps {
  task: GeneratedTask
  index: number
  isExpanded: boolean
  onToggle: () => void
}

function ResultTaskCard({ task, index, isExpanded, onToggle }: ResultTaskCardProps) {
  const diffInfo = getDifficultyLabel(task.difficulty)
  const hasSubQuestions = task.subQuestions && task.subQuestions.length > 0

  return (
    <motion.div
      className="terminsprove__task-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{ '--task-color': getCategoryColor(task.category) } as React.CSSProperties}
    >
      <button
        className="terminsprove__task-header"
        onClick={onToggle}
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
            {task.contextText && (
              <div className="terminsprove__task-question">
                <h4>Kontekst</h4>
                <p>{task.contextText}</p>
              </div>
            )}

            {task.imageUrl && (
              <div className="terminsprove__task-image">
                <img
                  src={task.imageUrl.startsWith('http') ? task.imageUrl : `${API_BASE_URL}${task.imageUrl}`}
                  alt={`Illustration til opgave ${index + 1}`}
                  className="terminsprove__task-illustration"
                  loading="lazy"
                />
              </div>
            )}

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
}
