/**
 * Generator: geo_sammensat_figur
 * 
 * Generates composite figure problems using a composable shape system.
 * Students must decompose complex shapes into primitives to calculate area.
 * 
 * Difficulty progression:
 * - let: L, T, U shapes - all dimensions labeled
 * - middel: Composite shapes with curves - all dimensions labeled
 * - svaer: Composite shapes with MISSING dimensions to derive
 * 
 * Uses π = 3 for simpler calculations.
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask, SeededRandom } from '../types'
import type { PolygonFigure, SvgFigure } from '../../types/taskSchema'

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

const PI = 3  // Simple π for mental math

const COLORS = {
  fill: '#E8F4F8',
  stroke: '#2D3748',
  dim: '#C2725A',
  rightAngle: '#718096',
}

// ════════════════════════════════════════════════════════════════
// SHAPE PRIMITIVES
// ════════════════════════════════════════════════════════════════

interface Rect { type: 'rect'; w: number; h: number }
interface Semicircle { type: 'semicircle'; r: number }
interface QuarterCircle { type: 'quarter'; r: number }
interface Triangle { type: 'triangle'; base: number; height: number }

type Shape = Rect | Semicircle | QuarterCircle | Triangle

function shapeArea(s: Shape): number {
  switch (s.type) {
    case 'rect': return s.w * s.h
    case 'semicircle': return (PI * s.r * s.r) / 2
    case 'quarter': return (PI * s.r * s.r) / 4
    case 'triangle': return (s.base * s.height) / 2
  }
}

// ════════════════════════════════════════════════════════════════
// COMPOSITE FIGURE DEFINITION
// ════════════════════════════════════════════════════════════════

type AttachPosition = 'top' | 'bottom' | 'left' | 'right'
type CutPosition = 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'

interface Attachment {
  shape: Shape
  position: AttachPosition
}

interface Cutout {
  shape: Shape
  position: CutPosition
}

interface CompositeFigure {
  base: Rect
  attachments: Attachment[]
  cutouts: Cutout[]
}

function computeArea(fig: CompositeFigure): number {
  let area = shapeArea(fig.base)
  for (const a of fig.attachments) area += shapeArea(a.shape)
  for (const c of fig.cutouts) area -= shapeArea(c.shape)
  return Math.round(area * 100) / 100
}

// ════════════════════════════════════════════════════════════════
// SVG RENDERING
// ════════════════════════════════════════════════════════════════

interface Dimension {
  x1: number; y1: number; x2: number; y2: number
  label: string
  textX: number; textY: number
  dashed?: boolean
}

function renderDimension(d: Dimension): string {
  const style = d.dashed ? 'stroke-dasharray="4,2"' : ''
  return `
    <line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}" stroke="${COLORS.dim}" stroke-width="2" ${style}/>
    <text x="${d.textX}" y="${d.textY}" class="dim">${d.label}</text>
  `
}

function rightAngle(x: number, y: number, size: number, rot: number): string {
  const rad = rot * Math.PI / 180
  const c = Math.cos(rad), s = Math.sin(rad)
  const p1 = { x: x + size * c, y: y + size * s }
  const p2 = { x: x + size * c - size * s, y: y + size * s + size * c }
  const p3 = { x: x - size * s, y: y + size * c }
  return `<path d="M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}" fill="none" stroke="${COLORS.rightAngle}" stroke-width="1.5"/>`
}

function createSvg(w: number, h: number, content: string, id: string): string {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
<style>.dim{font:600 14px Inter,sans-serif;fill:${COLORS.dim}}</style>
${content.replace(/id="/g, `id="${id}_`).replace(/url\(#/g, `url(#${id}_`)}
</svg>`
}

// ════════════════════════════════════════════════════════════════
// FIGURE BUILDERS
// ════════════════════════════════════════════════════════════════

interface FigureResult {
  svg: string
  area: number
  variables: Record<string, number | string>
}

/**
 * Build a composite figure with optional hidden dimensions for hard mode
 */
function buildFigure(
  fig: CompositeFigure,
  rng: SeededRandom,
  hiddenDims: Set<string> = new Set()
): FigureResult {
  const scale = 4
  const pad = 50
  
  // Calculate bounds
  const { base, attachments, cutouts } = fig
  let minX = 0, maxX = base.w, minY = 0, maxY = base.h
  
  for (const a of attachments) {
    if (a.position === 'top' && a.shape.type === 'semicircle') maxY += a.shape.r
    if (a.position === 'top' && a.shape.type === 'triangle') maxY += a.shape.height
    if (a.position === 'bottom' && a.shape.type === 'semicircle') minY -= a.shape.r
    if (a.position === 'right' && a.shape.type === 'semicircle') maxX += a.shape.r
    if (a.position === 'left' && a.shape.type === 'semicircle') minX -= a.shape.r
  }
  
  const figW = maxX - minX
  const figH = maxY - minY
  const svgW = figW * scale + 2 * pad
  const svgH = figH * scale + 2 * pad
  
  // Transform to SVG coords (y-flip)
  const tx = (x: number) => pad + (x - minX) * scale
  const ty = (y: number) => svgH - pad - (y - minY) * scale
  
  // Build path
  let paths = ''
  let dims: Dimension[] = []
  
  const bx0 = tx(0), bx1 = tx(base.w)
  const by0 = ty(0), by1 = ty(base.h)
  
  // Start with base rect outline, but we'll modify for attachments/cutouts
  let pathD = ''
  
  // Simple case: just attachments on sides, no cutouts in middle
  // Build clockwise from bottom-left
  
  // Bottom edge
  const bottomAttach = attachments.find(a => a.position === 'bottom' && a.shape.type === 'semicircle')
  if (bottomAttach && bottomAttach.shape.type === 'semicircle') {
    const r = bottomAttach.shape.r * scale
    const cx = (bx0 + bx1) / 2
    pathD += `M ${bx0} ${by0} L ${cx - r} ${by0} A ${r} ${r} 0 0 0 ${cx + r} ${by0} L ${bx1} ${by0}`
  } else {
    pathD += `M ${bx0} ${by0} L ${bx1} ${by0}`
  }
  
  // Right edge
  const rightAttach = attachments.find(a => a.position === 'right' && a.shape.type === 'semicircle')
  const rightCut = cutouts.find(c => c.position === 'right' && c.shape.type === 'semicircle')
  if (rightAttach && rightAttach.shape.type === 'semicircle') {
    const r = rightAttach.shape.r * scale
    const cy = (by0 + by1) / 2
    pathD += ` L ${bx1} ${cy + r} A ${r} ${r} 0 0 1 ${bx1} ${cy - r} L ${bx1} ${by1}`
  } else if (rightCut && rightCut.shape.type === 'semicircle') {
    const r = rightCut.shape.r * scale
    const cy = (by0 + by1) / 2
    pathD += ` L ${bx1} ${cy + r} A ${r} ${r} 0 0 0 ${bx1} ${cy - r} L ${bx1} ${by1}`
  } else {
    pathD += ` L ${bx1} ${by1}`
  }
  
  // Top edge
  const topAttach = attachments.find(a => a.position === 'top')
  if (topAttach?.shape.type === 'semicircle') {
    const r = topAttach.shape.r * scale
    const cx = (bx0 + bx1) / 2
    pathD += ` L ${cx + r} ${by1} A ${r} ${r} 0 0 1 ${cx - r} ${by1} L ${bx0} ${by1}`
  } else if (topAttach?.shape.type === 'triangle') {
    const cx = (bx0 + bx1) / 2
    const peakY = ty(base.h + topAttach.shape.height)
    pathD += ` L ${bx1} ${by1} L ${cx} ${peakY} L ${bx0} ${by1}`
  } else {
    pathD += ` L ${bx0} ${by1}`
  }
  
  // Left edge
  const leftAttach = attachments.find(a => a.position === 'left' && a.shape.type === 'semicircle')
  if (leftAttach && leftAttach.shape.type === 'semicircle') {
    const r = leftAttach.shape.r * scale
    const cy = (by0 + by1) / 2
    pathD += ` L ${bx0} ${cy - r} A ${r} ${r} 0 0 1 ${bx0} ${cy + r} L ${bx0} ${by0}`
  } else {
    pathD += ` L ${bx0} ${by0}`
  }
  
  pathD += ' Z'
  
  // Handle corner cutouts
  for (const c of cutouts) {
    if (c.shape.type === 'quarter') {
      const r = c.shape.r * scale
      
      switch (c.position) {
        case 'bottom-right':
          paths += `<path d="M ${bx1} ${by0 - r} A ${r} ${r} 0 0 1 ${bx1 - r} ${by0}" fill="white" stroke="${COLORS.stroke}" stroke-width="2"/>`
          break
        case 'bottom-left':
          paths += `<path d="M ${bx0 + r} ${by0} A ${r} ${r} 0 0 1 ${bx0} ${by0 - r}" fill="white" stroke="${COLORS.stroke}" stroke-width="2"/>`
          break
        case 'top-right':
          paths += `<path d="M ${bx1 - r} ${by1} A ${r} ${r} 0 0 1 ${bx1} ${by1 + r}" fill="white" stroke="${COLORS.stroke}" stroke-width="2"/>`
          break
        case 'top-left':
          paths += `<path d="M ${bx0} ${by1 + r} A ${r} ${r} 0 0 1 ${bx0 + r} ${by1}" fill="white" stroke="${COLORS.stroke}" stroke-width="2"/>`
          break
      }
    }
  }
  
  // Handle center cutout (circle)
  let maskDef = ''
  const centerCut = cutouts.find(c => c.position === 'center')
  if (centerCut && centerCut.shape.type === 'semicircle') {
    // Actually a full circle cutout in center
    const r = centerCut.shape.r * scale
    const cx = (bx0 + bx1) / 2
    const cy = (by0 + by1) / 2
    maskDef = `<defs><mask id="m"><rect x="0" y="0" width="${svgW}" height="${svgH}" fill="white"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="black"/></mask></defs>`
    paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="white" stroke="${COLORS.stroke}" stroke-width="2"/>`
  }
  
  // Main shape
  const maskAttr = centerCut ? 'mask="url(#m)"' : ''
  paths = `${maskDef}<path d="${pathD}" fill="${COLORS.fill}" stroke="${COLORS.stroke}" stroke-width="2" ${maskAttr}/>${paths}`
  
  // Build dimensions
  // Base width (bottom)
  if (!hiddenDims.has('baseW')) {
    dims.push({ x1: bx0, y1: by0 + 15, x2: bx1, y2: by0 + 15, label: `${base.w} cm`, textX: (bx0 + bx1) / 2, textY: by0 + 35 })
  }
  
  // Base height (left side)
  if (!hiddenDims.has('baseH')) {
    dims.push({ x1: bx0 - 15, y1: by0, x2: bx0 - 15, y2: by1, label: `${base.h} cm`, textX: bx0 - 40, textY: (by0 + by1) / 2 + 5 })
  }
  
  // Attachments dimensions
  for (const a of attachments) {
    if (a.shape.type === 'semicircle') {
      const r = a.shape.r
      if (a.position === 'top' && !hiddenDims.has('topR')) {
        const cx = (bx0 + bx1) / 2
        dims.push({ x1: cx, y1: by1, x2: cx, y2: ty(base.h + r), label: `${r} cm`, textX: cx + 12, textY: (by1 + ty(base.h + r)) / 2 + 5, dashed: true })
      }
      if (a.position === 'right' && !hiddenDims.has('rightR')) {
        const cy = (by0 + by1) / 2
        dims.push({ x1: bx1, y1: cy, x2: tx(base.w + r), y2: cy, label: `${r} cm`, textX: (bx1 + tx(base.w + r)) / 2, textY: cy - 10, dashed: true })
      }
    }
    if (a.shape.type === 'triangle' && a.position === 'top' && !hiddenDims.has('triH')) {
      const cx = (bx0 + bx1) / 2
      dims.push({ x1: cx, y1: by1, x2: cx, y2: ty(base.h + a.shape.height), label: `${a.shape.height} cm`, textX: cx + 15, textY: (by1 + ty(base.h + a.shape.height)) / 2, dashed: true })
    }
  }
  
  // Cutout dimensions
  for (const c of cutouts) {
    if (c.shape.type === 'semicircle' && c.position === 'right' && !hiddenDims.has('cutR')) {
      const cy = (by0 + by1) / 2
      dims.push({ x1: bx1, y1: cy, x2: bx1 - c.shape.r * scale, y2: cy, label: `${c.shape.r} cm`, textX: bx1 - c.shape.r * scale / 2, textY: cy - 10, dashed: true })
    }
    if (c.shape.type === 'quarter') {
      const r = c.shape.r
      if (!hiddenDims.has('cornerR')) {
        // Show radius for corner cutout
        if (c.position === 'bottom-right') {
          dims.push({ x1: bx1 - r * scale, y1: by0 + 15, x2: bx1, y2: by0 + 15, label: `${r} cm`, textX: bx1 - r * scale / 2, textY: by0 + 35 })
        }
      }
    }
  }
  
  // Right angles
  let angles = ''
  angles += rightAngle(bx0, by0, 10, -90)
  if (!rightAttach && !rightCut) angles += rightAngle(bx1, by0, 10, 180)
  if (!topAttach) {
    angles += rightAngle(bx0, by1, 10, 0)
    angles += rightAngle(bx1, by1, 10, 90)
  }
  
  const dimSvg = dims.map(renderDimension).join('')
  const content = paths + angles + dimSvg
  
  return {
    svg: createSvg(svgW, svgH, content, `fig_${rng.int(1000, 9999)}`),
    area: computeArea(fig),
    variables: {
      baseW: base.w,
      baseH: base.h,
      ...Object.fromEntries(
        attachments.flatMap((a, i) => {
          if (a.shape.type === 'semicircle') return [[`attach${i}R`, a.shape.r]]
          if (a.shape.type === 'triangle') return [[`attach${i}H`, a.shape.height]]
          return []
        })
      ),
      ...Object.fromEntries(
        cutouts.flatMap((c, i) => {
          if (c.shape.type === 'semicircle') return [[`cut${i}R`, c.shape.r]]
          if (c.shape.type === 'quarter') return [[`cut${i}R`, c.shape.r]]
          return []
        })
      ),
    },
  }
}

// ════════════════════════════════════════════════════════════════
// RANDOM FIGURE GENERATORS
// ════════════════════════════════════════════════════════════════

function randomMiddelFigure(rng: SeededRandom): { fig: CompositeFigure; hidden: Set<string> } {
  const baseW = rng.intStep(20, 50, 10)
  const baseH = rng.intStep(20, 40, 10)
  
  const figType = rng.int(0, 5)
  
  switch (figType) {
    case 0: // Rect + semicircle top
      return {
        fig: {
          base: { type: 'rect', w: baseW, h: baseH },
          attachments: [{ shape: { type: 'semicircle', r: baseW / 2 }, position: 'top' }],
          cutouts: [],
        },
        hidden: new Set(),
      }
    case 1: // Rect + semicircle right
      return {
        fig: {
          base: { type: 'rect', w: baseW, h: baseH },
          attachments: [{ shape: { type: 'semicircle', r: baseH / 2 }, position: 'right' }],
          cutouts: [],
        },
        hidden: new Set(),
      }
    case 2: // Rect + triangle top
      return {
        fig: {
          base: { type: 'rect', w: baseW, h: baseH },
          attachments: [{ shape: { type: 'triangle', base: baseW, height: rng.intStep(10, 25, 5) }, position: 'top' }],
          cutouts: [],
        },
        hidden: new Set(),
      }
    case 3: // Rect - semicircle (cutout on right)
      return {
        fig: {
          base: { type: 'rect', w: baseW, h: baseH },
          attachments: [],
          cutouts: [{ shape: { type: 'semicircle', r: Math.min(rng.intStep(5, 15, 5), Math.floor(baseH / 3)) }, position: 'right' }],
        },
        hidden: new Set(),
      }
    case 4: // Stadium (semicircle on both ends)
      return {
        fig: {
          base: { type: 'rect', w: baseW, h: baseH },
          attachments: [
            { shape: { type: 'semicircle', r: baseH / 2 }, position: 'left' },
            { shape: { type: 'semicircle', r: baseH / 2 }, position: 'right' },
          ],
          cutouts: [],
        },
        hidden: new Set(),
      }
    default: // Rect - quarter circle corner
      return {
        fig: {
          base: { type: 'rect', w: baseW, h: baseH },
          attachments: [],
          cutouts: [{ shape: { type: 'quarter', r: rng.intStep(5, Math.min(baseW, baseH) - 5, 5) }, position: 'bottom-right' }],
        },
        hidden: new Set(),
      }
  }
}

function randomSvaerFigure(rng: SeededRandom): { fig: CompositeFigure; hidden: Set<string> } {
  const { fig } = randomMiddelFigure(rng)
  
  // Hide some dimensions based on figure type
  const hidden = new Set<string>()
  
  // For semicircle attachments, hide the radius (can be derived from base dimensions)
  if (fig.attachments.some(a => a.shape.type === 'semicircle' && a.position === 'top')) {
    hidden.add('topR')
  }
  if (fig.attachments.some(a => a.shape.type === 'semicircle' && a.position === 'right')) {
    hidden.add('rightR')
  }
  // For cutouts, sometimes hide the radius
  if (fig.cutouts.some(c => c.shape.type === 'semicircle') && rng.bool(0.5)) {
    hidden.add('cutR')
  }
  if (fig.cutouts.some(c => c.shape.type === 'quarter') && rng.bool(0.5)) {
    hidden.add('cornerR')
  }
  
  return { fig, hidden }
}

// ════════════════════════════════════════════════════════════════
// LET: POLYGON FIGURES
// ════════════════════════════════════════════════════════════════

type LetShape = 'L' | 'T' | 'U'

function generateLetShape(shape: LetShape, rng: SeededRandom): {
  figure: PolygonFigure
  area: number
  perimeter: number
  variables: Record<string, number | string>
} {
  const width = rng.intStep(40, 100, 10)
  const height = rng.intStep(60, 120, 10)
  const cutW = rng.intStep(20, Math.floor(width * 0.6), 10)
  const cutH = rng.intStep(20, Math.floor(height * 0.6), 10)
  
  let area: number, perimeter: number, figure: PolygonFigure
  
  switch (shape) {
    case 'L': {
      area = width * height - cutW * cutH
      perimeter = width + height + cutW + (height - cutH) + (width - cutW) + cutH
      figure = {
        type: 'polygon',
        vertices: {
          A: [0, 0], B: [width, 0], C: [width, height - cutH],
          D: [width - cutW, height - cutH], E: [width - cutW, height], F: [0, height],
        },
        sides: {
          AB: String(width), BC: String(height - cutH), CD: String(cutW),
          DE: String(cutH), EF: String(width - cutW), FA: String(height),
        },
        right_angles: ['A', 'B', 'C', 'D', 'E', 'F'],
      }
      break
    }
    case 'T': {
      const barH = rng.intStep(20, 40, 10)
      const stemW = rng.intStep(20, Math.floor(width * 0.5), 10)
      const stemH = height - barH
      area = width * barH + stemW * stemH
      perimeter = 2 * barH + width + 2 * stemH + stemW + (width - stemW)
      figure = {
        type: 'polygon',
        vertices: {
          A: [0, 0], B: [width, 0], C: [width, barH],
          D: [(width + stemW) / 2, barH], E: [(width + stemW) / 2, height],
          F: [(width - stemW) / 2, height], G: [(width - stemW) / 2, barH], H: [0, barH],
        },
        right_angles: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
      }
      break
    }
    case 'U': {
      const legW = rng.intStep(20, Math.floor(width * 0.3), 10)
      const innerW = width - 2 * legW
      const innerH = rng.intStep(30, Math.floor(height * 0.6), 10)
      area = width * height - innerW * innerH
      perimeter = 2 * width + 2 * height + 2 * innerH
      figure = {
        type: 'polygon',
        vertices: {
          A: [0, 0], B: [width, 0], C: [width, height],
          D: [width - legW, height], E: [width - legW, height - innerH],
          F: [legW, height - innerH], G: [legW, height], H: [0, height],
        },
        right_angles: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
      }
      break
    }
  }
  
  return { figure, area, perimeter, variables: { width, height, cutW, cutH, shape } }
}

// ════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ════════════════════════════════════════════════════════════════

export class SammensatFigurGenerator extends LogicBasedGenerator {
  readonly taskType = 'geo_sammensat_figur'
  readonly name = 'Sammensat figur'

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    const difficulty = config?.difficulty ?? rng.pick(['let', 'middel', 'svaer'] as const)
    
    switch (difficulty) {
      case 'let': return this.generateLet(rng)
      case 'middel': return this.generateMiddel(rng)
      case 'svaer': return this.generateSvaer(rng)
    }
  }
  
  private generateLet(rng: SeededRandom): GeneratedTask {
    const shape = rng.pick<LetShape>(['L', 'T', 'U'])
    const { figure, area, perimeter, variables } = generateLetShape(shape, rng)
    
    return {
      type: this.taskType,
      title: 'Areal',
      intro: 'Beregn arealet af figuren. Alle mål er i cm.',
      figure,
      questions: [
        { text: 'Hvad er arealet?', answer: String(area), answer_type: 'number', accept_alternatives: [`${area} cm²`] },
        { text: 'Hvad er omkredsen?', answer: String(perimeter), answer_type: 'number', accept_alternatives: [`${perimeter} cm`] },
      ],
      variables: { ...variables, difficulty: 'let' },
    }
  }
  
  private generateMiddel(rng: SeededRandom): GeneratedTask {
    const { fig, hidden } = randomMiddelFigure(rng)
    const result = buildFigure(fig, rng, hidden)
    
    return {
      type: this.taskType,
      title: 'Areal',
      intro: `Beregn arealet af figuren. Alle mål er i cm. Brug $\\pi = 3$.`,
      figure: { type: 'svg', content: result.svg } as SvgFigure,
      questions: [
        { text: 'Hvad er arealet?', answer: String(result.area), answer_type: 'number', accept_alternatives: [`${result.area} cm²`, `${Math.round(result.area)}`] },
      ],
      variables: { ...result.variables, difficulty: 'middel' },
    }
  }
  
  private generateSvaer(rng: SeededRandom): GeneratedTask {
    const { fig, hidden } = randomSvaerFigure(rng)
    const result = buildFigure(fig, rng, hidden)
    
    return {
      type: this.taskType,
      title: 'Areal',
      intro: `Beregn arealet af figuren. Nogle mål skal du selv finde. Brug $\\pi = 3$.`,
      figure: { type: 'svg', content: result.svg } as SvgFigure,
      questions: [
        { text: 'Hvad er arealet?', answer: String(result.area), answer_type: 'number', accept_alternatives: [`${result.area} cm²`, `${Math.round(result.area)}`] },
      ],
      variables: { ...result.variables, difficulty: 'svaer' },
    }
  }
}

