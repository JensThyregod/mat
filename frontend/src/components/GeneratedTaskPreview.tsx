/**
 * Generated Task Preview Component
 * 
 * Renders a generated task (TaskInstance) using the same visual style
 * as the real task rendering system.
 */

import { useMemo } from 'react'
import type { GeneratedTask, GeneratedQuestion } from '../generators/types'
import { FigureRenderer } from './figures/FigureRenderer'
import { renderLatexToHtml } from '../utils/latexRenderer'

// ════════════════════════════════════════════════════════════════
// QUESTION RENDERER
// ════════════════════════════════════════════════════════════════

function QuestionRenderer({ 
  question, 
  index,
  showAnswer = true 
}: { 
  question: GeneratedQuestion
  index: number
  showAnswer?: boolean
}) {
  const textHtml = useMemo(() => renderLatexToHtml(question.text, { newlineToBr: true }), [question.text])
  
  return (
    <div className="task-question">
      <div className="task-question__header">
        <span className="task-question__number">{index + 1}</span>
        <div
          className="task-question__text"
          dangerouslySetInnerHTML={{ __html: textHtml }}
        />
      </div>
      {showAnswer && (
        <div className="answer-pill answer-pill--correct">
          <div className="answer-pill__icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <span className="answer-pill__answer">
            {question.answer}
            <span className="answer-pill__type">({question.answer_type})</span>
          </span>
        </div>
      )}
      {showAnswer && question.accept_alternatives && question.accept_alternatives.length > 0 && (
        <div className="answer-alternatives">
          Også accepteret: {question.accept_alternatives.join(', ')}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════

type Props = {
  task: GeneratedTask
  showAnswers?: boolean
}

export const GeneratedTaskPreview = ({ task, showAnswers = true }: Props) => {
  const introHtml = useMemo(() => renderLatexToHtml(task.intro, { newlineToBr: true }), [task.intro])
  const hasFigure = task.figure !== null

  return (
    <div className="task-content">
      <div className="task-content__title">
        <div className="latex-section">{task.title}</div>
      </div>

      <div className={`task-content__context ${hasFigure ? 'has-figure' : ''}`}>
        <div
          className="task-content__intro"
          dangerouslySetInnerHTML={{ __html: introHtml }}
        />
        {hasFigure && (
          <div className="task-content__figure">
            <FigureRenderer figure={task.figure} />
          </div>
        )}
      </div>

      {task.questions.length > 0 && (
        <div className="task-content__questions">
          {task.questions.map((question, i) => (
            <QuestionRenderer
              key={i}
              question={question}
              index={i}
              showAnswer={showAnswers}
            />
          ))}
        </div>
      )}
    </div>
  )
}


