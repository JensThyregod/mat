import { motion, AnimatePresence } from 'framer-motion'
import { FigureRenderer } from '../figures/FigureRenderer'
import { renderLatexToHtml } from '../../utils/latexRenderer'
import { getMasteryLabel } from '../../utils/masteryHelpers'
import { QuestionRow } from './QuestionRow'
import type { ActiveTask } from './trainingConstants'
import type { SkillCatalogEntry } from '../../practice'
import type { AnswerStatus } from '../../utils/answerChecker'

export function TrainingTaskCard({ activeTask, currentCatalog, categoryLabel, answers, statuses, taskComplete, xpDeltas, lastLevelUp, onAnswerChange, onCheckAll, onNextTask, checkDisabled }: {
  activeTask: ActiveTask
  currentCatalog: SkillCatalogEntry | undefined
  categoryLabel: string
  answers: Record<number, string>
  statuses: Record<number, AnswerStatus>
  taskComplete: boolean
  xpDeltas: Record<number, number>
  lastLevelUp: { skillName: string; level: string } | null
  onAnswerChange: (idx: number, value: string) => void
  onCheckAll: () => void
  onNextTask: () => void
  checkDisabled: boolean
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTask.startedAt}
        className="training__task-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="training__task-header">
          <span className={`training__category-badge training__category-badge--${currentCatalog?.category}`}>
            {categoryLabel}
          </span>
          <span className="training__skill-badge">
            {currentCatalog?.name ?? activeTask.skillId}
          </span>
          <span className="training__difficulty-badge">
            {activeTask.difficulty === 'let' ? 'Let' : activeTask.difficulty === 'svaer' ? 'Svær' : 'Middel'}
          </span>
        </div>

        <h2 className="training__task-title">{activeTask.task.title}</h2>

        {activeTask.task.intro && (
          <div
            className="training__task-intro"
            dangerouslySetInnerHTML={{ __html: renderLatexToHtml(activeTask.task.intro, { newlineToBr: true }) }}
          />
        )}

        {activeTask.task.figure && (
          <div className="training__task-figure">
            <FigureRenderer figure={activeTask.task.figure} />
          </div>
        )}

        <div className="training__questions">
          {activeTask.task.questions.map((question, i) => (
            <QuestionRow
              key={i}
              index={i}
              question={question}
              answer={answers[i] ?? ''}
              status={taskComplete ? (statuses[i] ?? 'neutral') : undefined}
              taskComplete={taskComplete}
              xpDelta={taskComplete ? xpDeltas[i] : undefined}
              onAnswerChange={onAnswerChange}
            />
          ))}
        </div>

        <AnimatePresence>
          {lastLevelUp && (
            <motion.div
              className="training__levelup"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="training__levelup-icon">⬆</span>
              <span>{lastLevelUp.skillName}: <strong>{getMasteryLabel(lastLevelUp.level)}</strong></span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="training__actions">
          {!taskComplete ? (
            <button
              className="training__btn training__btn--primary"
              onClick={onCheckAll}
              disabled={checkDisabled}
            >
              Tjek svar
            </button>
          ) : (
            <button
              className="training__btn training__btn--primary"
              onClick={onNextTask}
            >
              Næste opgave →
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
