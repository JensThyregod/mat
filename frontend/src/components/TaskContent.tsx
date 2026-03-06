import { useMemo, useRef } from 'react'
import { parseLatexToStructure, type ParsedTask } from '../utils/latexParser'
import { FigureRenderer } from './figures/FigureRenderer'
import { FractionInput } from './FractionInput'
import { parseMultipleChoice } from '../utils/multipleChoice'

type AnswerState = {
  validated: boolean
  status: 'neutral' | 'correct' | 'incorrect'
}

type Props = {
  latex: string
  answers: string[]
  answerStates?: Map<number, AnswerState>
  correctAnswers?: Map<number, string>
  onAnswerChange: (questionIndex: number, value: string) => void
  onAnswerBlur?: (questionIndex: number) => void
  disabled?: boolean
}

export const TaskContent = ({
  latex,
  answers,
  answerStates = new Map(),
  correctAnswers = new Map(),
  onAnswerChange,
  onAnswerBlur,
  disabled = false,
}: Props) => {
  const parsed: ParsedTask = useMemo(
    () => parseLatexToStructure(latex),
    [latex]
  )

  // Track which answers were validated when we last ENTERED this part
  // We update this every time latex changes (switching parts)
  const validatedOnEnterRef = useRef<Set<number>>(new Set())
  const prevLatexRef = useRef<string | null>(null)
  
  // When latex changes (switching parts), capture which answers are currently validated
  // This runs synchronously BEFORE the render so we don't animate already-validated answers
  if (prevLatexRef.current !== latex) {
    prevLatexRef.current = latex
    const validated = new Set<number>()
    answerStates.forEach((state, idx) => {
      if (state.validated && state.status !== 'neutral') {
        validated.add(idx)
      }
    })
    validatedOnEnterRef.current = validated
  }
  
  // Check if an answer should animate (was NOT validated when we entered this part)
  const shouldAnimate = (questionIndex: number): boolean => {
    return !validatedOnEnterRef.current.has(questionIndex)
  }

  return (
    <div className="task-content">
      {parsed.titleHtml && (
        <div
          className="task-content__title"
          dangerouslySetInnerHTML={{ __html: parsed.titleHtml }}
        />
      )}

      {(parsed.introHtml || parsed.figure) && (
        <div className={`task-content__context ${parsed.figure ? 'has-figure' : ''}`}>
          {parsed.introHtml && (
            <div
              className="task-content__intro"
              dangerouslySetInnerHTML={{ __html: parsed.introHtml }}
            />
          )}
          {parsed.figure && (
            <div className="task-content__figure">
              <FigureRenderer figure={parsed.figure} />
            </div>
          )}
        </div>
      )}

      {parsed.questions.length > 0 && (
        <div className="task-content__questions">
          {parsed.questions.map((question) => {
            const answer = answers[question.index] ?? ''
            const state = answerStates.get(question.index)
            const answerStatus = (state?.validated && state.status !== 'neutral')
              ? state.status
              : 'neutral'
            const isMultipleChoice = question.answerType === 'multiple_choice'
            const mcData = isMultipleChoice ? parseMultipleChoice(question.content, { optionNewlineToBr: false }) : null
            
            return (
              <div key={question.index} className="task-question">
                <div className="task-question__header">
                  <span className="task-question__number">
                    {question.index + 1}
                  </span>
                  <div
                    className="task-question__text"
                    dangerouslySetInnerHTML={{ __html: mcData ? mcData.promptHtml : question.contentHtml }}
                  />
                </div>
                {mcData ? (
                  <div className="task-mc-options">
                    {mcData.options.map(opt => {
                      const isSelected = answer === opt.letter
                      const isCorrectOption = opt.letter === question.correctAnswer
                      const revealed = answerStatus !== 'neutral'
                      let cls = 'task-mc-option'
                      if (isSelected && !revealed) cls += ' task-mc-option--selected'
                      if (revealed && isCorrectOption) cls += ' task-mc-option--correct'
                      if (revealed && isSelected && !isCorrectOption) cls += ' task-mc-option--incorrect'

                      return (
                        <button
                          key={opt.letter}
                          type="button"
                          className={cls}
                          onClick={() => !disabled && onAnswerChange(question.index, opt.letter)}
                          disabled={disabled}
                        >
                          <span className="task-mc-letter">{opt.letter}</span>
                          <span className="task-mc-text" dangerouslySetInnerHTML={{ __html: opt.html }} />
                        </button>
                      )
                    })}
                  </div>
                ) : question.answerType === 'fraction' ? (
                  <>
                    <FractionInput
                      value={answer}
                      onChange={(value) => onAnswerChange(question.index, value)}
                      onBlur={() => onAnswerBlur?.(question.index)}
                      disabled={disabled}
                      status={answerStatus}
                    />
                    {answerStatus === 'incorrect' && correctAnswers.has(question.index) && (
                      <div className="answer-correction">
                        Rigtigt svar: <strong>{correctAnswers.get(question.index)}</strong>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={`answer-pill answer-pill--${answerStatus} ${answerStatus !== 'neutral' && shouldAnimate(question.index) ? 'answer-pill--animate' : ''}`}>
                    {answerStatus !== 'neutral' && (
                      <div className="answer-pill__icon">
                        {answerStatus === 'correct' ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    )}
                    <input
                      type="text"
                      className="answer-pill__input"
                      placeholder="Dit svar"
                      value={answer}
                      onChange={(e) => onAnswerChange(question.index, e.target.value)}
                      onBlur={() => onAnswerBlur?.(question.index)}
                      disabled={disabled}
                    />
                  </div>
                )}
                {!mcData && answerStatus === 'incorrect' && correctAnswers.has(question.index) && (
                  <div className="answer-correction">
                    Rigtigt svar: <strong>{correctAnswers.get(question.index)}</strong>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

