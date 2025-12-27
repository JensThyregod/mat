import { useMemo, useRef, useState } from 'react'
import { parseLatexToStructure, type ParsedTask, type ParsedFigure } from '../utils/latexParser'
import { 
  parseTriangleConfig, computeTriangle, generateTriangleSVG,
  parsePolygonConfig, computePolygon, generatePolygonSVG 
} from '../utils/geometry'
import {
  generateProceduralTask,
  generateProjectionTask,
} from '../utils/voxel'
import { FractionInput } from './FractionInput'

/**
 * Parse voxel figure config from .tex content
 * Format:
 *   difficulty: medium
 *   seed: 12345 (optional)
 */
function parseVoxelConfig(content: string): { difficulty: 'easy' | 'medium' | 'hard'; seed?: number } {
  const lines = content.trim().split('\n')
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  let seed: number | undefined

  for (const line of lines) {
    const trimmed = line.trim()
    const diffMatch = trimmed.match(/^difficulty:\s*(easy|medium|hard)$/i)
    if (diffMatch) {
      difficulty = diffMatch[1].toLowerCase() as 'easy' | 'medium' | 'hard'
    }
    const seedMatch = trimmed.match(/^seed:\s*(\d+)$/i)
    if (seedMatch) {
      seed = parseInt(seedMatch[1], 10)
    }
  }

  return { difficulty, seed }
}

/**
 * Renders a voxel projection matching figure
 */
function VoxelFigureRenderer({ content }: { content: string }) {
  const config = useMemo(() => parseVoxelConfig(content), [content])
  
  // Generate task on mount (stable per config)
  const [taskData] = useState(() => {
    const { correctFigure, distractors } = generateProceduralTask(config.difficulty)
    return generateProjectionTask({
      correctFigure,
      distractors,
      showProjections: ['top', 'front', 'side'],
      shuffleOptions: true,
    }, { cubeSize: 16, padding: 6 })
  })

  return (
    <div className="voxel-figure">
      {/* Projections row */}
      <div className="voxel-figure__projections">
        {taskData.projections.map(proj => (
          <div key={proj.type} className="voxel-figure__projection">
            <div 
              className="voxel-figure__projection-svg"
              dangerouslySetInnerHTML={{ __html: proj.svg }}
            />
            <div className="voxel-figure__projection-label">{proj.label}</div>
          </div>
        ))}
      </div>
      
      {/* Options grid */}
      <div className="voxel-figure__options">
        {taskData.options.map(option => (
          <div 
            key={option.label} 
            className="voxel-figure__option"
            data-correct={option.isCorrect}
          >
            <div 
              className="voxel-figure__option-svg"
              dangerouslySetInnerHTML={{ __html: option.svg }}
            />
            <div className="voxel-figure__option-label">{option.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Renders different figure types (SVG, image, or computed geometry)
 */
function FigureRenderer({ figure }: { figure: ParsedFigure }) {
  const svg = useMemo(() => {
    if (figure.type === 'triangle') {
      const config = parseTriangleConfig(figure.content)
      const data = computeTriangle(config)
      return generateTriangleSVG(data)
    }
    if (figure.type === 'polygon') {
      const config = parsePolygonConfig(figure.content)
      const data = computePolygon(config)
      return generatePolygonSVG(data)
    }
    return null
  }, [figure])

  switch (figure.type) {
    case 'svg':
      return (
        <div
          className="task-figure task-figure--svg"
          dangerouslySetInnerHTML={{ __html: figure.content }}
        />
      )
    case 'image':
      return (
        <img
          className="task-figure task-figure--image"
          src={figure.content}
          alt={figure.alt ?? 'Figur'}
        />
      )
    case 'triangle':
    case 'polygon':
      return (
        <div
          className="task-figure task-figure--svg"
          dangerouslySetInnerHTML={{ __html: svg ?? '' }}
        />
      )
    case 'voxel':
      return <VoxelFigureRenderer content={figure.content} />
    default:
      return null
  }
}

type AnswerState = {
  validated: boolean
  status: 'neutral' | 'correct' | 'incorrect'
}

type Props = {
  latex: string
  answers: string[]
  answerStates?: Map<number, AnswerState>  // Validation state per question from backend
  onAnswerChange: (questionIndex: number, value: string) => void
  onAnswerBlur?: (questionIndex: number) => void
  disabled?: boolean
}

export const TaskContent = ({
  latex,
  answers,
  answerStates = new Map(),
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
            // Only show correct/incorrect if validated and answer hasn't changed
            const answerStatus = (state?.validated && state.status !== 'neutral')
              ? state.status
              : 'neutral'
            
            return (
              <div key={question.index} className="task-question">
                <div className="task-question__header">
                  <span className="task-question__number">
                    {question.index + 1}
                  </span>
                  <div
                    className="task-question__text"
                    dangerouslySetInnerHTML={{ __html: question.contentHtml }}
                  />
                </div>
                {question.answerType === 'fraction' ? (
                  <FractionInput
                    value={answer}
                    onChange={(value) => onAnswerChange(question.index, value)}
                    onBlur={() => onAnswerBlur?.(question.index)}
                    disabled={disabled}
                    status={answerStatus}
                  />
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

