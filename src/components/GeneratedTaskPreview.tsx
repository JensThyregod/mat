/**
 * Generated Task Preview Component
 * 
 * Renders a generated task (TaskInstance) using the same visual style
 * as the real task rendering system.
 */

import { useMemo, useState } from 'react'
import katex from 'katex'
import type { GeneratedTask, GeneratedQuestion } from '../generators/types'
import type { TaskFigure, TriangleFigure, PolygonFigure } from '../types/taskSchema'
import { 
  parseTriangleConfig, computeTriangle, generateTriangleSVG,
  parsePolygonConfig, computePolygon, generatePolygonSVG 
} from '../utils/geometry'
import {
  generateProceduralTask,
  generateProjectionTask,
} from '../utils/voxel'

// ════════════════════════════════════════════════════════════════
// LATEX RENDERING
// ════════════════════════════════════════════════════════════════

/**
 * Render inline LaTeX in text (handles \(...\) and $...$ notation)
 */
function renderLatexInText(text: string): string {
  if (!text) return ''
  
  // Replace \(...\) with rendered KaTeX
  let result = text.replace(/\\\((.+?)\\\)/g, (_, math) => {
    try {
      return katex.renderToString(math, { throwOnError: false, displayMode: false })
    } catch {
      return `<span class="latex-error">${math}</span>`
    }
  })
  
  // Replace $...$ with rendered KaTeX (but not $$...$$)
  result = result.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (_, math) => {
    try {
      return katex.renderToString(math, { throwOnError: false, displayMode: false })
    } catch {
      return `<span class="latex-error">${math}</span>`
    }
  })
  
  // Replace $$...$$ with display mode KaTeX
  result = result.replace(/\$\$(.+?)\$\$/g, (_, math) => {
    try {
      return `<div class="latex-display-math">${katex.renderToString(math, { throwOnError: false, displayMode: true })}</div>`
    } catch {
      return `<span class="latex-error">${math}</span>`
    }
  })
  
  // Replace newlines with <br>
  result = result.replace(/\n/g, '<br>')
  
  return result
}

// ════════════════════════════════════════════════════════════════
// FIGURE RENDERERS
// ════════════════════════════════════════════════════════════════

function TriangleFigureRenderer({ figure }: { figure: TriangleFigure }) {
  const svg = useMemo(() => {
    // Convert the TaskFigure format to the geometry parser format
    const content = `
A: ${figure.vertices.A.angle}
B: ${figure.vertices.B.angle}
C: ${figure.vertices.C.angle}
    `.trim()
    const config = parseTriangleConfig(content)
    const data = computeTriangle(config)
    return generateTriangleSVG(data)
  }, [figure])

  return (
    <div
      className="task-figure task-figure--svg"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

function PolygonFigureRenderer({ figure }: { figure: PolygonFigure }) {
  const svg = useMemo(() => {
    // Convert vertices to polygon parser format
    const vertexLines = Object.entries(figure.vertices)
      .map(([name, pos]) => {
        const coords = Array.isArray(pos) ? pos : [pos.x, pos.y]
        return `${name}: ${coords[0]}, ${coords[1]}`
      })
      .join('\n')
    
    const sideLines = figure.sides
      ? Object.entries(figure.sides).map(([side, label]) => `side ${side}: ${label}`).join('\n')
      : ''
    
    const rightAngles = figure.right_angles
      ? `right_angles: ${figure.right_angles.join(', ')}`
      : ''
    
    const content = [vertexLines, sideLines, rightAngles].filter(Boolean).join('\n')
    const config = parsePolygonConfig(content)
    const data = computePolygon(config)
    return generatePolygonSVG(data)
  }, [figure])

  return (
    <div
      className="task-figure task-figure--svg"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

function VoxelFigureRenderer({ difficulty }: { difficulty: 'easy' | 'medium' | 'hard' }) {
  const [taskData] = useState(() => {
    const { correctFigure, distractors } = generateProceduralTask(difficulty)
    return generateProjectionTask({
      correctFigure,
      distractors,
      showProjections: ['top', 'front', 'side'],
      shuffleOptions: true,
    }, { cubeSize: 16, padding: 6 })
  })

  return (
    <div className="voxel-figure">
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

function BarChartRenderer({ data }: { data: Record<string, number> }) {
  const maxValue = Math.max(...Object.values(data))
  const entries = Object.entries(data)
  
  return (
    <div className="bar-chart-figure">
      <div className="bar-chart-figure__bars">
        {entries.map(([label, value]) => (
          <div key={label} className="bar-chart-figure__bar-container">
            <div 
              className="bar-chart-figure__bar"
              style={{ height: `${(value / maxValue) * 100}%` }}
            >
              <span className="bar-chart-figure__value">{value}</span>
            </div>
            <span className="bar-chart-figure__label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BoxplotRenderer({ data, axisMin, axisMax }: { 
  data: Record<string, { min: number; q1: number; median: number; q3: number; max: number }>
  axisMin?: number
  axisMax?: number 
}) {
  const allValues = Object.values(data).flatMap(d => [d.min, d.max])
  const dataMin = Math.min(...allValues)
  const dataMax = Math.max(...allValues)
  
  // Use custom axis bounds if provided, otherwise use data bounds
  const displayMin = axisMin ?? dataMin
  const displayMax = axisMax ?? dataMax
  const range = displayMax - displayMin
  
  const toPercent = (val: number) => ((val - displayMin) / range) * 100
  
  // Generate tick marks at nice intervals
  const generateTicks = () => {
    const tickInterval = range <= 20 ? 2 : range <= 50 ? 5 : range <= 100 ? 10 : 20
    const ticks: number[] = []
    const start = Math.ceil(displayMin / tickInterval) * tickInterval
    for (let t = start; t <= displayMax; t += tickInterval) {
      ticks.push(t)
    }
    // Ensure we show the endpoints
    if (!ticks.includes(displayMin)) ticks.unshift(displayMin)
    if (!ticks.includes(displayMax)) ticks.push(displayMax)
    return [...new Set(ticks)].sort((a, b) => a - b)
  }
  
  const ticks = generateTicks()
  
  // Sort entries if they are sortable (numbers, years, or have numeric/alphabetic suffixes)
  const sortEntries = (entries: [string, typeof data[string]][]) => {
    return [...entries].sort((a, b) => {
      const labelA = a[0]
      const labelB = b[0]
      
      // Try pure numeric sort (for years like "2020", "2021")
      const numA = parseFloat(labelA)
      const numB = parseFloat(labelB)
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }
      
      // Try extracting trailing numbers (for "Gruppe 1", "Hold A" etc.)
      const suffixMatchA = labelA.match(/(\d+)$/)
      const suffixMatchB = labelB.match(/(\d+)$/)
      if (suffixMatchA && suffixMatchB) {
        return parseInt(suffixMatchA[1]) - parseInt(suffixMatchB[1])
      }
      
      // Alphabetical/natural sort for class names like "9.A", "9.B"
      return labelA.localeCompare(labelB, 'da', { numeric: true })
    })
  }
  
  const entries = sortEntries(Object.entries(data))
  
  return (
    <div className="boxplot-figure">
      {/* Grid lines layer (behind everything) */}
      <div className="boxplot-figure__grid-layer">
        <div className="boxplot-figure__grid-label-space" />
        <div className="boxplot-figure__grid">
          {ticks.map(tick => (
            <div 
              key={tick}
              className="boxplot-figure__gridline"
              style={{ left: `${toPercent(tick)}%` }}
            />
          ))}
        </div>
      </div>
      
      {/* Boxplot rows with labels */}
      <div className="boxplot-figure__rows">
        {entries.map(([label, stats]) => (
          <div key={label} className="boxplot-figure__row">
            <div className="boxplot-figure__label">{label}</div>
            <div className="boxplot-figure__plot">
              {/* Whisker line */}
              <div 
                className="boxplot-figure__whisker"
                style={{
                  left: `${toPercent(stats.min)}%`,
                  width: `${toPercent(stats.max) - toPercent(stats.min)}%`
                }}
              />
              {/* Box */}
              <div 
                className="boxplot-figure__box"
                style={{
                  left: `${toPercent(stats.q1)}%`,
                  width: `${toPercent(stats.q3) - toPercent(stats.q1)}%`
                }}
              />
              {/* Median line */}
              <div 
                className="boxplot-figure__median"
                style={{ left: `${toPercent(stats.median)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      
      {/* X-axis with tick labels */}
      <div className="boxplot-figure__x-axis">
        <div className="boxplot-figure__grid-label-space" />
        <div className="boxplot-figure__x-ticks">
          {ticks.map(tick => (
            <span 
              key={tick} 
              className="boxplot-figure__x-label"
              style={{ left: `${toPercent(tick)}%` }}
            >
              {tick}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function FigureRenderer({ figure }: { figure: TaskFigure }) {
  if (!figure) return null

  switch (figure.type) {
    case 'triangle':
      return <TriangleFigureRenderer figure={figure} />
    case 'polygon':
      return <PolygonFigureRenderer figure={figure} />
    case 'voxel':
      return <VoxelFigureRenderer difficulty={figure.difficulty} />
    case 'bar_chart':
      return <BarChartRenderer data={figure.data} />
    case 'boxplot':
      return <BoxplotRenderer data={figure.data} axisMin={figure.axisMin} axisMax={figure.axisMax} />
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
          src={figure.src}
          alt={figure.alt ?? 'Figur'}
        />
      )
    default:
      return (
        <div className="task-figure task-figure--json">
          <pre>{JSON.stringify(figure, null, 2)}</pre>
        </div>
      )
  }
}

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
  const textHtml = useMemo(() => renderLatexInText(question.text), [question.text])
  
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
  const introHtml = useMemo(() => renderLatexInText(task.intro), [task.intro])
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


