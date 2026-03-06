import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FractionInput } from '../FractionInput'
import { renderLatexToHtml } from '../../utils/latexRenderer'
import { parseMultipleChoice } from '../../utils/multipleChoice'
import type { GeneratedQuestion } from '../../generators/types'
import type { AnswerStatus } from '../../utils/answerChecker'

export function QuestionRow({ index, question, answer, status, taskComplete, xpDelta, onAnswerChange }: {
  index: number
  question: GeneratedQuestion
  answer: string
  status?: AnswerStatus
  taskComplete: boolean
  xpDelta?: number
  onAnswerChange: (idx: number, value: string) => void
}) {
  const isMultipleChoice = question.answer_type === 'multiple_choice'
  const mcData = useMemo(
    () => isMultipleChoice ? parseMultipleChoice(question.text) : null,
    [question.text, isMultipleChoice],
  )
  const textHtml = useMemo(
    () => mcData ? mcData.promptHtml : renderLatexToHtml(question.text, { newlineToBr: true }),
    [question.text, mcData],
  )
  const showCorrectAnswer = taskComplete && status === 'incorrect'
  const effectiveStatus = status && status !== 'neutral' ? status : undefined

  return (
    <div className={`training__question ${effectiveStatus ? `training__question--${effectiveStatus}` : ''}`}>
      <div className="training__question-header">
        <span className="training__question-number">{index + 1}</span>
        <div className="training__question-text" dangerouslySetInnerHTML={{ __html: textHtml }} />
      </div>

      {mcData ? (
        <div className="training__mc-options">
          {mcData.options.map(opt => {
            const isSelected = answer === opt.letter
            const isCorrectOption = opt.letter === question.answer
            let optionClass = 'training__mc-option'
            if (isSelected && !taskComplete) optionClass += ' training__mc-option--selected'
            if (taskComplete && isCorrectOption) optionClass += ' training__mc-option--correct'
            if (taskComplete && isSelected && !isCorrectOption) optionClass += ' training__mc-option--incorrect'

            return (
              <button
                key={opt.letter}
                type="button"
                className={optionClass}
                onClick={() => !taskComplete && onAnswerChange(index, opt.letter)}
                disabled={taskComplete}
              >
                <span className="training__mc-letter">{opt.letter}</span>
                <span className="training__mc-text" dangerouslySetInnerHTML={{ __html: opt.html }} />
              </button>
            )
          })}
          <AnimatePresence>
            {taskComplete && xpDelta !== undefined && (
              <motion.span
                className={`training__xp-delta ${xpDelta >= 0 ? 'training__xp-delta--positive' : 'training__xp-delta--negative'}`}
                initial={{ opacity: 0, scale: 0.5, x: -8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: index * 0.1 }}
              >
                {xpDelta >= 0 ? '+' : ''}{xpDelta} XP
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="training__question-input-row">
          {question.answer_type === 'fraction' ? (
            <FractionInput
              value={answer}
              onChange={(v) => onAnswerChange(index, v)}
              disabled={taskComplete}
              status={effectiveStatus === 'correct' ? 'correct' : effectiveStatus === 'incorrect' ? 'incorrect' : 'neutral'}
            />
          ) : (
            <div className={`training__answer-pill ${effectiveStatus ? `training__answer-pill--${effectiveStatus}` : ''}`}>
              {effectiveStatus && (
                <div className="training__answer-icon">
                  {effectiveStatus === 'correct' ? '✓' : '✗'}
                </div>
              )}
              <input
                type="text"
                className="training__answer-input"
                placeholder="Dit svar"
                value={answer}
                onChange={(e) => onAnswerChange(index, e.target.value)}
                disabled={taskComplete}
              />
            </div>
          )}

          <AnimatePresence>
            {taskComplete && xpDelta !== undefined && (
              <motion.span
                className={`training__xp-delta ${xpDelta >= 0 ? 'training__xp-delta--positive' : 'training__xp-delta--negative'}`}
                initial={{ opacity: 0, scale: 0.5, x: -8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: index * 0.1 }}
              >
                {xpDelta >= 0 ? '+' : ''}{xpDelta} XP
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      )}

      {showCorrectAnswer && !mcData && (
        <motion.div
          className="training__correct-answer"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          Rigtigt svar: <strong dangerouslySetInnerHTML={{ __html: renderLatexToHtml(question.answer, { newlineToBr: true }) }} />
        </motion.div>
      )}
    </div>
  )
}
