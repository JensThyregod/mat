import { useMemo, useState } from 'react'
import type {
  TaskFigure,
  TriangleFigure,
  PolygonFigure,
} from '../../types/taskSchema'
import type { ParsedFigure } from '../../utils/latexParser'
import {
  parseTriangleConfig, computeTriangle, generateTriangleSVG,
  parsePolygonConfig, computePolygon, generatePolygonSVG,
} from '../../utils/geometry'
import {
  generateProceduralTask,
  generateProjectionTask,
} from '../../utils/voxel'

export type FigureInput = TaskFigure | ParsedFigure

// ── Sub-renderers ─────────────────────────────────────────────

function TriangleFigureRenderer({ figure }: { figure: TriangleFigure }) {
  const svg = useMemo(() => {
    const content = `
A: ${figure.vertices.A.angle}
B: ${figure.vertices.B.angle}
C: ${figure.vertices.C.angle}
    `.trim()
    return generateTriangleSVG(computeTriangle(parseTriangleConfig(content)))
  }, [figure])

  return <div className="task-figure task-figure--svg" dangerouslySetInnerHTML={{ __html: svg }} />
}

function PolygonFigureRenderer({ figure }: { figure: PolygonFigure }) {
  const svg = useMemo(() => {
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
    return generatePolygonSVG(computePolygon(parsePolygonConfig(content)))
  }, [figure])

  return <div className="task-figure task-figure--svg" dangerouslySetInnerHTML={{ __html: svg }} />
}

function GeometryFromContentRenderer({ content, parser }: {
  content: string
  parser: 'triangle' | 'polygon'
}) {
  const svg = useMemo(() => {
    if (parser === 'triangle') {
      return generateTriangleSVG(computeTriangle(parseTriangleConfig(content)))
    }
    return generatePolygonSVG(computePolygon(parsePolygonConfig(content)))
  }, [content, parser])

  return <div className="task-figure task-figure--svg" dangerouslySetInnerHTML={{ __html: svg ?? '' }} />
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
            <div className="voxel-figure__projection-svg" dangerouslySetInnerHTML={{ __html: proj.svg }} />
            <div className="voxel-figure__projection-label">{proj.label}</div>
          </div>
        ))}
      </div>
      <div className="voxel-figure__options">
        {taskData.options.map(option => (
          <div key={option.label} className="voxel-figure__option" data-correct={option.isCorrect}>
            <div className="voxel-figure__option-svg" dangerouslySetInnerHTML={{ __html: option.svg }} />
            <div className="voxel-figure__option-label">{option.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarChartRenderer({ data }: { data: Record<string, number> }) {
  const maxValue = Math.max(...Object.values(data))

  return (
    <div className="bar-chart-figure">
      <div className="bar-chart-figure__bars">
        {Object.entries(data).map(([label, value]) => (
          <div key={label} className="bar-chart-figure__bar-container">
            <div className="bar-chart-figure__bar" style={{ height: `${(value / maxValue) * 100}%` }}>
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
  const displayMin = axisMin ?? Math.min(...allValues)
  const displayMax = axisMax ?? Math.max(...allValues)
  const range = displayMax - displayMin
  const toPercent = (val: number) => ((val - displayMin) / range) * 100

  const generateTicks = () => {
    const tickInterval = range <= 20 ? 2 : range <= 50 ? 5 : range <= 100 ? 10 : 20
    const ticks: number[] = []
    const start = Math.ceil(displayMin / tickInterval) * tickInterval
    for (let t = start; t <= displayMax; t += tickInterval) {
      ticks.push(t)
    }
    if (!ticks.includes(displayMin)) ticks.unshift(displayMin)
    if (!ticks.includes(displayMax)) ticks.push(displayMax)
    return [...new Set(ticks)].sort((a, b) => a - b)
  }

  const ticks = generateTicks()

  const sortEntries = (entries: [string, typeof data[string]][]) => {
    return [...entries].sort((a, b) => {
      const numA = parseFloat(a[0]), numB = parseFloat(b[0])
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB
      const sA = a[0].match(/(\d+)$/), sB = b[0].match(/(\d+)$/)
      if (sA && sB) return parseInt(sA[1]) - parseInt(sB[1])
      return a[0].localeCompare(b[0], 'da', { numeric: true })
    })
  }

  const entries = sortEntries(Object.entries(data))

  return (
    <div className="boxplot-figure">
      <div className="boxplot-figure__grid-layer">
        <div className="boxplot-figure__grid-label-space" />
        <div className="boxplot-figure__grid">
          {ticks.map(tick => (
            <div key={tick} className="boxplot-figure__gridline" style={{ left: `${toPercent(tick)}%` }} />
          ))}
        </div>
      </div>
      <div className="boxplot-figure__rows">
        {entries.map(([label, stats]) => (
          <div key={label} className="boxplot-figure__row">
            <div className="boxplot-figure__label">{label}</div>
            <div className="boxplot-figure__plot">
              <div className="boxplot-figure__whisker" style={{ left: `${toPercent(stats.min)}%`, width: `${toPercent(stats.max) - toPercent(stats.min)}%` }} />
              <div className="boxplot-figure__box" style={{ left: `${toPercent(stats.q1)}%`, width: `${toPercent(stats.q3) - toPercent(stats.q1)}%` }} />
              <div className="boxplot-figure__median" style={{ left: `${toPercent(stats.median)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="boxplot-figure__x-axis">
        <div className="boxplot-figure__grid-label-space" />
        <div className="boxplot-figure__x-ticks">
          {ticks.map(tick => (
            <span key={tick} className="boxplot-figure__x-label" style={{ left: `${toPercent(tick)}%` }}>{tick}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function parseVoxelDifficulty(content: string): 'easy' | 'medium' | 'hard' {
  const match = content.match(/^difficulty:\s*(easy|medium|hard)$/im)
  return (match?.[1]?.toLowerCase() as 'easy' | 'medium' | 'hard') ?? 'medium'
}

/**
 * Distinguish ParsedFigure (content-string based) from TaskFigure (structured)
 * for types that exist in both unions (triangle, polygon, voxel).
 * ParsedFigure variants carry a `content: string` and lack the structured fields.
 */
function isParsedGeometry(figure: FigureInput): figure is ParsedFigure & { type: 'triangle' | 'polygon' | 'voxel' } {
  if (!figure) return false
  const f = figure as Record<string, unknown>
  if (figure.type === 'triangle') return !('vertices' in f)
  if (figure.type === 'polygon') return !('vertices' in f)
  if (figure.type === 'voxel') return !('difficulty' in f)
  return false
}

// ── Main FigureRenderer ───────────────────────────────────────

export function FigureRenderer({ figure }: { figure: FigureInput }) {
  if (!figure) return null

  // ParsedFigure geometry types (content-string based, from latexParser)
  if (isParsedGeometry(figure)) {
    switch (figure.type) {
      case 'triangle':
        return <GeometryFromContentRenderer content={figure.content} parser="triangle" />
      case 'polygon':
        return <GeometryFromContentRenderer content={figure.content} parser="polygon" />
      case 'voxel':
        return <VoxelFigureRenderer difficulty={parseVoxelDifficulty(figure.content)} />
    }
  }

  // TaskFigure types (structured, from taskSchema)
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
      return <div className="task-figure task-figure--svg" dangerouslySetInnerHTML={{ __html: figure.content }} />
    case 'image':
      return <img className="task-figure task-figure--image" src={'src' in figure ? figure.src : (figure as ParsedFigure & { type: 'image' }).content} alt={figure.alt ?? 'Figur'} />
    default:
      return (
        <div className="task-figure task-figure--json">
          <pre>{JSON.stringify(figure, null, 2)}</pre>
        </div>
      )
  }
}
