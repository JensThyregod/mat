/**
 * Generator: geo_sammensat_figur
 * 
 * Algorithmic composite figure generator using recursive shape attachment.
 * 
 * Algorithm:
 * 1. Start with a base shape (rect, right-triangle, semicircle, quarter-circle)
 * 2. For n iterations, attach a new shape to an existing edge
 * 3. Mark shared edges as "seams" (invisible but tracked)
 * 4. Only add measurements that cannot be derived from existing ones
 * 5. Final pass: remove any redundant measurements
 * 
 * Uses π = 3 for simpler mental math.
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask, SeededRandom } from '../types'
import type { SvgFigure } from '../../types/taskSchema'
import {
  buildGraphFromFigure,
} from './figure-graph-builder'
import {
  solve as solveGraph,
  findSourcesForDepth,
  logGraph,
  logSolution,
  type DerivationGraph,
  type DerivationSolution,
} from './derivation-graph'

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

const PI = 3
const SCALE = 5         // Larger scale for better visibility
const PADDING = 60      // Extra padding for dimension lines

const COLORS = {
  fill: '#E8F4F8',
  stroke: '#2D3748',
  dim: '#C2725A',
  rightAngle: '#718096',
}

// ════════════════════════════════════════════════════════════════
// GEOMETRY TYPES
// ════════════════════════════════════════════════════════════════

interface Point {
  x: number
  y: number
}

type ShapeType = 'rect' | 'right-triangle' | 'semicircle' | 'quarter-circle'

interface Edge {
  id: string
  p1: Point
  p2: Point
  type: 'line' | 'arc'
  // For arcs
  center?: Point
  radius?: number
  startAngle?: number  // radians
  endAngle?: number    // radians
  clockwise?: boolean
  // State
  visible: boolean     // false = internal seam
  shapeIds: string[]   // which shapes share this edge
}

interface Measurement {
  id: string
  edgeId?: string      // associated edge (for line measurements)
  type: 'length' | 'radius' | 'diameter'
  value: number
  label: string
  // For rendering
  position: Point
  angle: number        // rotation of label
  // Derivability
  derivedFrom?: string[] // IDs of measurements this can be calculated from
}

interface Shape {
  id: string
  type: ShapeType
  edges: string[]      // edge IDs
  area: number
  // Anchor point for positioning
  anchor: Point
  rotation: number     // 0, 90, 180, 270 degrees
}

interface CompositeFigure {
  shapes: Shape[]
  edges: Map<string, Edge>
  measurements: Measurement[]
  totalArea: number
}

// ════════════════════════════════════════════════════════════════
// POINT UTILITIES
// ════════════════════════════════════════════════════════════════

function pointsEqual(a: Point, b: Point, epsilon = 0.01): boolean {
  return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon
}

function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function rotatePoint(p: Point, origin: Point, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = p.x - origin.x
  const dy = p.y - origin.y
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  }
}

function edgeLength(edge: Edge): number {
  if (edge.type === 'line') {
    return distance(edge.p1, edge.p2)
  } else {
    // Arc length
    const r = edge.radius!
    const angle = Math.abs(edge.endAngle! - edge.startAngle!)
    return r * angle
  }
}

function edgeAngle(edge: Edge): number {
  return Math.atan2(edge.p2.y - edge.p1.y, edge.p2.x - edge.p1.x) * 180 / Math.PI
}

/**
 * Identify legs and hypotenuse in a right triangle
 * The hypotenuse is the longest side
 */
function identifyTriangleParts(edges: Edge[]): {
  legs: [Edge, Edge];
  hypotenuse: Edge;
} | null {
  const lineEdges = edges.filter(e => e.type === 'line')
  if (lineEdges.length !== 3) return null
  
  // Sort by length - hypotenuse is longest
  const sorted = [...lineEdges].sort((a, b) => edgeLength(b) - edgeLength(a))
  
  return {
    hypotenuse: sorted[0],
    legs: [sorted[1], sorted[2]],
  }
}

// ════════════════════════════════════════════════════════════════
// SHAPE FACTORIES
// ════════════════════════════════════════════════════════════════

let shapeCounter = 0
let edgeCounter = 0

function resetCounters(): void {
  shapeCounter = 0
  edgeCounter = 0
}

function createEdgeId(): string {
  return `e${++edgeCounter}`
}

function createShapeId(): string {
  return `s${++shapeCounter}`
}

/**
 * Create a rectangle at origin
 */
function createRect(w: number, h: number): { shape: Shape; edges: Edge[] } {
  const id = createShapeId()
  const e1 = createEdgeId(), e2 = createEdgeId(), e3 = createEdgeId(), e4 = createEdgeId()
  
  const edges: Edge[] = [
    { id: e1, p1: { x: 0, y: 0 }, p2: { x: w, y: 0 }, type: 'line', visible: true, shapeIds: [id] },
    { id: e2, p1: { x: w, y: 0 }, p2: { x: w, y: h }, type: 'line', visible: true, shapeIds: [id] },
    { id: e3, p1: { x: w, y: h }, p2: { x: 0, y: h }, type: 'line', visible: true, shapeIds: [id] },
    { id: e4, p1: { x: 0, y: h }, p2: { x: 0, y: 0 }, type: 'line', visible: true, shapeIds: [id] },
  ]
  
  return {
    shape: {
      id,
      type: 'rect',
      edges: [e1, e2, e3, e4],
      area: w * h,
      anchor: { x: 0, y: 0 },
      rotation: 0,
    },
    edges,
  }
}

/**
 * Create a right triangle (right angle at origin)
 */
function createRightTriangle(base: number, height: number): { shape: Shape; edges: Edge[] } {
  const id = createShapeId()
  const e1 = createEdgeId(), e2 = createEdgeId(), e3 = createEdgeId()
  
  const edges: Edge[] = [
    { id: e1, p1: { x: 0, y: 0 }, p2: { x: base, y: 0 }, type: 'line', visible: true, shapeIds: [id] },
    { id: e2, p1: { x: base, y: 0 }, p2: { x: 0, y: height }, type: 'line', visible: true, shapeIds: [id] },
    { id: e3, p1: { x: 0, y: height }, p2: { x: 0, y: 0 }, type: 'line', visible: true, shapeIds: [id] },
  ]
  
  return {
    shape: {
      id,
      type: 'right-triangle',
      edges: [e1, e2, e3],
      area: (base * height) / 2,
      anchor: { x: 0, y: 0 },
      rotation: 0,
    },
    edges,
  }
}

/**
 * Create a semicircle (flat edge at bottom)
 */
function createSemicircle(radius: number): { shape: Shape; edges: Edge[] } {
  const id = createShapeId()
  const e1 = createEdgeId(), e2 = createEdgeId()
  
  const edges: Edge[] = [
    // Flat bottom edge
    { id: e1, p1: { x: -radius, y: 0 }, p2: { x: radius, y: 0 }, type: 'line', visible: true, shapeIds: [id] },
    // Curved top
    { 
      id: e2, 
      p1: { x: radius, y: 0 }, 
      p2: { x: -radius, y: 0 }, 
      type: 'arc',
      center: { x: 0, y: 0 },
      radius,
      startAngle: 0,
      endAngle: Math.PI,
      clockwise: false,
      visible: true, 
      shapeIds: [id] 
    },
  ]
  
  return {
    shape: {
      id,
      type: 'semicircle',
      edges: [e1, e2],
      area: (PI * radius * radius) / 2,
      anchor: { x: 0, y: 0 },
      rotation: 0,
    },
    edges,
  }
}

/**
 * Create a quarter circle (right angle at origin, arc in first quadrant)
 */
function createQuarterCircle(radius: number): { shape: Shape; edges: Edge[] } {
  const id = createShapeId()
  const e1 = createEdgeId(), e2 = createEdgeId(), e3 = createEdgeId()
  
  const edges: Edge[] = [
    // Bottom edge
    { id: e1, p1: { x: 0, y: 0 }, p2: { x: radius, y: 0 }, type: 'line', visible: true, shapeIds: [id] },
    // Arc
    { 
      id: e2, 
      p1: { x: radius, y: 0 }, 
      p2: { x: 0, y: radius }, 
      type: 'arc',
      center: { x: 0, y: 0 },
      radius,
      startAngle: 0,
      endAngle: Math.PI / 2,
      clockwise: false,
      visible: true, 
      shapeIds: [id] 
    },
    // Left edge
    { id: e3, p1: { x: 0, y: radius }, p2: { x: 0, y: 0 }, type: 'line', visible: true, shapeIds: [id] },
  ]
  
  return {
    shape: {
      id,
      type: 'quarter-circle',
      edges: [e1, e2, e3],
      area: (PI * radius * radius) / 4,
      anchor: { x: 0, y: 0 },
      rotation: 0,
    },
    edges,
  }
}

// ════════════════════════════════════════════════════════════════
// SHAPE TRANSFORMATION
// ════════════════════════════════════════════════════════════════

/**
 * Translate all edges of a shape
 */
function translateEdges(edges: Edge[], dx: number, dy: number): void {
  for (const edge of edges) {
    edge.p1 = { x: edge.p1.x + dx, y: edge.p1.y + dy }
    edge.p2 = { x: edge.p2.x + dx, y: edge.p2.y + dy }
    if (edge.center) {
      edge.center = { x: edge.center.x + dx, y: edge.center.y + dy }
    }
  }
}

/**
 * Rotate all edges around a point
 */
function rotateEdges(edges: Edge[], origin: Point, angleDeg: number): void {
  for (const edge of edges) {
    edge.p1 = rotatePoint(edge.p1, origin, angleDeg)
    edge.p2 = rotatePoint(edge.p2, origin, angleDeg)
    if (edge.center) {
      edge.center = rotatePoint(edge.center, origin, angleDeg)
    }
    if (edge.startAngle !== undefined) {
      const rad = (angleDeg * Math.PI) / 180
      edge.startAngle = edge.startAngle + rad
      edge.endAngle = edge.endAngle! + rad
    }
  }
}

/**
 * Flip edges horizontally around x = 0
 * Reserved for future mirrored attachments
 */
function _flipEdgesHorizontal(edges: Edge[]): void {
  for (const edge of edges) {
    edge.p1 = { x: -edge.p1.x, y: edge.p1.y }
    edge.p2 = { x: -edge.p2.x, y: edge.p2.y }
    if (edge.center) {
      edge.center = { x: -edge.center.x, y: edge.center.y }
    }
    if (edge.startAngle !== undefined) {
      // Flip arc direction
      const temp = Math.PI - edge.startAngle
      edge.startAngle = Math.PI - edge.endAngle!
      edge.endAngle = temp
      edge.clockwise = !edge.clockwise
    }
    // Swap p1/p2 for lines to maintain winding
    if (edge.type === 'line') {
      const temp = edge.p1
      edge.p1 = edge.p2
      edge.p2 = temp
    }
  }
}

// ════════════════════════════════════════════════════════════════
// EDGE MATCHING & ATTACHMENT
// ════════════════════════════════════════════════════════════════

/**
 * Check if two line edges can be merged (same line, share or overlap)
 * Reserved for future edge merging logic
 */
function _edgesMatch(e1: Edge, e2: Edge): boolean {
  if (e1.type !== 'line' || e2.type !== 'line') return false
  
  // Check if endpoints match (either direction)
  const match1 = pointsEqual(e1.p1, e2.p2) && pointsEqual(e1.p2, e2.p1)
  const match2 = pointsEqual(e1.p1, e2.p1) && pointsEqual(e1.p2, e2.p2)
  
  return match1 || match2
}

/**
 * Find an edge in the figure that a new edge could attach to
 * 
 * @param avoidCircular - If true, skip edges belonging to circular shapes
 */
function findAttachmentEdge(
  figure: CompositeFigure,
  newEdge: Edge,
  rng: SeededRandom,
  avoidCircular = false
): Edge | null {
  const candidates: Edge[] = []
  
  for (const edge of figure.edges.values()) {
    if (!edge.visible) continue // Don't attach to seams
    if (edge.type !== 'line' || newEdge.type !== 'line') continue
    
    // If avoiding circular shapes, check if this edge belongs to one
    if (avoidCircular) {
      const belongsToCircular = edge.shapeIds.some(shapeId => {
        const shape = figure.shapes.find(s => s.id === shapeId)
        return shape && isCircularShape(shape.type)
      })
      if (belongsToCircular) continue
    }
    
    const edgeLen = distance(edge.p1, edge.p2)
    const newLen = distance(newEdge.p1, newEdge.p2)
    
    // Edges must be same length to attach
    if (Math.abs(edgeLen - newLen) < 0.01) {
      candidates.push(edge)
    }
  }
  
  return candidates.length > 0 ? rng.pick(candidates) : null
}

/**
 * Align a new shape's edge to an existing edge
 */
function alignToEdge(
  newEdges: Edge[],
  newAttachEdge: Edge,
  targetEdge: Edge
): void {
  // First translate so newAttachEdge.p1 aligns with targetEdge.p2
  const dx = targetEdge.p2.x - newAttachEdge.p1.x
  const dy = targetEdge.p2.y - newAttachEdge.p1.y
  translateEdges(newEdges, dx, dy)
  
  // Then rotate so edges are anti-parallel (facing each other)
  const targetAngle = edgeAngle(targetEdge)
  const newAngle = edgeAngle(newAttachEdge)
  const rotationNeeded = targetAngle + 180 - newAngle
  
  rotateEdges(newEdges, newAttachEdge.p1, rotationNeeded)
}

// ════════════════════════════════════════════════════════════════
// COMPOSITE FIGURE BUILDER
// ════════════════════════════════════════════════════════════════

/**
 * Initialize a composite figure with a base shape
 */
function initFigure(baseShape: Shape, baseEdges: Edge[]): CompositeFigure {
  const edges = new Map<string, Edge>()
  for (const e of baseEdges) {
    edges.set(e.id, e)
  }
  
  return {
    shapes: [baseShape],
    edges,
    measurements: [],
    totalArea: baseShape.area,
  }
}

/**
 * Check if a shape type is circular (has arcs)
 */
function isCircularShape(shapeType: ShapeType): boolean {
  return shapeType === 'semicircle' || shapeType === 'quarter-circle'
}

/**
 * Try to attach a new shape to the figure
 * 
 * CONSTRAINT: Circular shapes (semicircle, quarter-circle) cannot attach
 * to other circular shapes - it would be visually confusing.
 */
function attachShape(
  figure: CompositeFigure,
  newShape: Shape,
  newEdges: Edge[],
  rng: SeededRandom
): boolean {
  // Find a line edge from the new shape to attach
  const attachableEdges = newEdges.filter(e => e.type === 'line')
  if (attachableEdges.length === 0) return false
  
  // If new shape is circular, filter out edges that belong to circular shapes
  const isNewCircular = isCircularShape(newShape.type)
  
  // Try each attachable edge
  rng.shuffle(attachableEdges)
  
  for (const newAttachEdge of attachableEdges) {
    const targetEdge = findAttachmentEdge(figure, newAttachEdge, rng, isNewCircular)
    if (!targetEdge) continue
    
    // Align the new shape to the target edge
    alignToEdge(newEdges, newAttachEdge, targetEdge)
    
    // Mark both edges as seams (invisible)
    targetEdge.visible = false
    newAttachEdge.visible = false
    targetEdge.shapeIds.push(newShape.id)
    newAttachEdge.shapeIds.push(...targetEdge.shapeIds.filter(id => id !== newShape.id))
    
    // Add new shape and edges to figure
    figure.shapes.push(newShape)
    for (const e of newEdges) {
      figure.edges.set(e.id, e)
    }
    figure.totalArea += newShape.area
    
    return true
  }
  
  return false
}

// ════════════════════════════════════════════════════════════════
// MEASUREMENT SYSTEM
// ════════════════════════════════════════════════════════════════

// Future: graph-based derivability tracking
// interface MeasurementGraph {
//   derivations: Map<string, Set<string>>
//   values: Map<string, number>
// }

/**
 * Check if a value can be derived from existing measurements
 * This is a simplified derivability check
 */
function canDerive(
  value: number,
  existingValues: number[],
  allowedOps: ('add' | 'sub' | 'mul' | 'div' | 'half' | 'double')[] = ['add', 'sub', 'half', 'double']
): boolean {
  // Check direct match
  if (existingValues.some(v => Math.abs(v - value) < 0.01)) return true
  
  // Check simple derivations
  for (const v of existingValues) {
    if (allowedOps.includes('half') && Math.abs(v / 2 - value) < 0.01) return true
    if (allowedOps.includes('double') && Math.abs(v * 2 - value) < 0.01) return true
  }
  
  // Check pairwise operations
  for (let i = 0; i < existingValues.length; i++) {
    for (let j = i + 1; j < existingValues.length; j++) {
      const a = existingValues[i], b = existingValues[j]
      if (allowedOps.includes('add') && Math.abs(a + b - value) < 0.01) return true
      if (allowedOps.includes('sub') && Math.abs(Math.abs(a - b) - value) < 0.01) return true
    }
  }
  
  return false
}

/**
 * Add measurements to the figure, avoiding redundancy
 * 
 * Key insight: Seam edges (invisible) still provide geometric information
 * because the student can see they match adjacent visible edges.
 */
function addMeasurements(figure: CompositeFigure, _rng: SeededRandom): void {
  const measurements: Measurement[] = []
  const knownValues: number[] = []
  let measurementId = 0
  
  // Get visible edges only - seams are invisible to the student
  const allEdges = Array.from(figure.edges.values())
  const visibleEdges = allEdges.filter(e => e.visible)
  
  // Sort visible edges by length (larger first - more fundamental)
  visibleEdges.sort((a, b) => edgeLength(b) - edgeLength(a))
  
  // Track which arc radii we've ensured are derivable
  const arcRadii: number[] = []
  for (const edge of allEdges) {
    if (edge.type === 'arc' && edge.radius) {
      arcRadii.push(Math.round(edge.radius))
    }
  }
  
  // First pass: add measurements for visible line edges
  for (const edge of visibleEdges) {
    if (edge.type === 'line') {
      const len = Math.round(edgeLength(edge))
      
      // Only add if not derivable from existing measurements
      if (!canDerive(len, knownValues)) {
        const mid = midpoint(edge.p1, edge.p2)
        const angle = edgeAngle(edge)
        
        // Offset label perpendicular to edge
        const perpAngle = (angle + 90) * Math.PI / 180
        const offset = 15
        
        measurements.push({
          id: `m${++measurementId}`,
          edgeId: edge.id,
          type: 'length',
          value: len,
          label: `${len} cm`,
          position: {
            x: mid.x + Math.cos(perpAngle) * offset,
            y: mid.y + Math.sin(perpAngle) * offset,
          },
          angle: Math.abs(angle) > 45 && Math.abs(angle) < 135 ? 0 : angle,
        })
        
        knownValues.push(len)
      }
    }
  }
  
  // NOTE: We do NOT add seam lengths as "known" here
  // Seams are invisible - the student cannot see them directly
  // They must derive seam lengths from measured visible edges
  
  // Second pass: ensure arc radii are derivable
  // For each arc, check if radius can be derived; if not, add measurement
  for (const edge of visibleEdges) {
    if (edge.type === 'arc') {
      const r = Math.round(edge.radius!)
      
      // Check if radius is derivable from known values
      // Radius can be derived if: r is known, or 2r (diameter) is known
      const canDeriveRadius = canDerive(r, knownValues) || 
                              knownValues.some(v => Math.abs(v - 2 * r) < 0.01)
      
      if (!canDeriveRadius) {
        // Must add radius measurement
        const midAngle = (edge.startAngle! + edge.endAngle!) / 2
        const midPoint = {
          x: edge.center!.x + r * Math.cos(midAngle),
          y: edge.center!.y + r * Math.sin(midAngle),
        }
        
        measurements.push({
          id: `m${++measurementId}`,
          edgeId: edge.id,
          type: 'radius',
          value: r,
          label: `${r} cm`,
          position: midpoint(edge.center!, midPoint),
          angle: midAngle * 180 / Math.PI,
        })
        
        knownValues.push(r)
      }
    }
  }
  
  figure.measurements = measurements
}

/**
 * Final pass: remove redundant measurements, but be conservative
 * 
 * Only remove a measurement if:
 * 1. It can be derived from remaining measurements
 * 2. Removing it doesn't leave any arc without a derivable radius
 */
function pruneRedundantMeasurements(figure: CompositeFigure): void {
  const measurements = figure.measurements
  const toRemove: Set<string> = new Set()
  
  // Collect all arc radii that need to be derivable
  const requiredRadii: number[] = []
  for (const edge of figure.edges.values()) {
    if (edge.type === 'arc' && edge.radius) {
      const r = Math.round(edge.radius)
      if (!requiredRadii.includes(r)) {
        requiredRadii.push(r)
      }
    }
  }
  
  // NOTE: We do NOT include seam lengths - student cannot see them!
  
  // Check each measurement to see if it can be safely removed
  for (const m of measurements) {
    if (toRemove.has(m.id)) continue
    
    // Get values that would remain if we removed this measurement
    const remainingValues = measurements
      .filter(other => other.id !== m.id && !toRemove.has(other.id))
      .map(other => other.value)
    
    // Only use actual measurement values
    const allKnownValues = [...remainingValues]
    
    // Check if this measurement's value is derivable
    if (!canDerive(m.value, allKnownValues)) {
      continue // Can't remove - not derivable
    }
    
    // Extra check: if this is a radius measurement, make sure
    // all arc radii remain derivable after removal
    let allRadiiDerivable = true
    for (const r of requiredRadii) {
      // Check if r can be derived (either directly or as half of diameter)
      const derivable = canDerive(r, allKnownValues) ||
                        allKnownValues.some(v => Math.abs(v - 2 * r) < 0.01)
      if (!derivable) {
        allRadiiDerivable = false
        break
      }
    }
    
    if (allRadiiDerivable) {
      toRemove.add(m.id)
    }
  }
  
  figure.measurements = measurements.filter(m => !toRemove.has(m.id))
}

// ════════════════════════════════════════════════════════════════
// AREA SOLVER - Simulates how a student would solve the problem
// ════════════════════════════════════════════════════════════════

interface KnowledgeBase {
  // Known numeric values (edge lengths, radii)
  values: Set<number>
  // Known edge lengths by edge ID
  edgeLengths: Map<string, number>
  // Known radii by edge ID (for arcs)
  radii: Map<string, number>
  // Shapes whose area has been computed
  solvedShapes: Set<string>
  // Computed total area
  computedArea: number
}

function createKnowledgeBase(): KnowledgeBase {
  return {
    values: new Set(),
    edgeLengths: new Map(),
    radii: new Map(),
    solvedShapes: new Set(),
    computedArea: 0,
  }
}

/**
 * Try to derive a value from known values using simple operations
 * Reserved for potential future use
 */
function _tryDerive(value: number, kb: KnowledgeBase): boolean {
  const known = Array.from(kb.values)
  
  // Direct match
  if (known.some(v => Math.abs(v - value) < 0.01)) return true
  
  // Half of a known value
  if (known.some(v => Math.abs(v / 2 - value) < 0.01)) return true
  
  // Double of a known value
  if (known.some(v => Math.abs(v * 2 - value) < 0.01)) return true
  
  // Sum of two known values
  for (let i = 0; i < known.length; i++) {
    for (let j = i + 1; j < known.length; j++) {
      if (Math.abs(known[i] + known[j] - value) < 0.01) return true
      if (Math.abs(Math.abs(known[i] - known[j]) - value) < 0.01) return true
    }
  }
  
  return false
}

/**
 * Add a value to knowledge base (and derived values)
 */
function addKnowledge(value: number, kb: KnowledgeBase): void {
  kb.values.add(Math.round(value * 100) / 100)
  // Also add commonly derived values
  kb.values.add(Math.round(value * 2 * 100) / 100)  // double
  kb.values.add(Math.round(value / 2 * 100) / 100)  // half
}

/**
 * Propagate knowledge after solving a shape
 * 
 * Key geometric relationships:
 * - Semicircle: radius → diameter (straight edge) = 2×radius
 * - Quarter-circle: radius → both straight edges = radius
 * - Rectangle: knowing one side → opposite side has same length
 * - Seams: if two shapes share a seam, they share that edge length
 */
function propagateKnowledge(
  shape: Shape, 
  edges: Map<string, Edge>, 
  kb: KnowledgeBase,
  figure: CompositeFigure,
  verbose = false
): void {
  const shapeEdges = shape.edges.map(id => edges.get(id)).filter((e): e is Edge => !!e)
  const log = verbose ? (...args: unknown[]) => console.log('    [propagate]', ...args) : () => {}
  
  switch (shape.type) {
    case 'semicircle': {
      // If radius is known, the diameter (flat edge) = 2×radius
      const arc = shapeEdges.find(e => e.type === 'arc')
      const flatEdge = shapeEdges.find(e => e.type === 'line')
      
      if (arc && kb.radii.has(arc.id) && flatEdge && !kb.edgeLengths.has(flatEdge.id)) {
        const radius = kb.radii.get(arc.id)!
        const diameter = radius * 2
        kb.edgeLengths.set(flatEdge.id, diameter)
        addKnowledge(diameter, kb)
        log(`Semicircle radius=${radius} → diameter edge ${flatEdge.id}=${diameter}`)
      }
      break
    }
    
    case 'quarter-circle': {
      // If radius is known, both straight edges = radius
      const arc = shapeEdges.find(e => e.type === 'arc')
      const straightEdges = shapeEdges.filter(e => e.type === 'line')
      
      if (arc && kb.radii.has(arc.id)) {
        const radius = kb.radii.get(arc.id)!
        for (const edge of straightEdges) {
          if (!kb.edgeLengths.has(edge.id)) {
            kb.edgeLengths.set(edge.id, radius)
            addKnowledge(radius, kb)
            log(`Quarter-circle radius=${radius} → edge ${edge.id}=${radius}`)
          }
        }
      }
      break
    }
    
    case 'rect': {
      // If we know one side, the opposite side has the same length
      // Group edges by length (they come in pairs)
      const lineEdges = shapeEdges.filter(e => e.type === 'line')
      const lengthGroups: Map<number, Edge[]> = new Map()
      
      for (const edge of lineEdges) {
        const len = Math.round(edgeLength(edge))
        if (!lengthGroups.has(len)) lengthGroups.set(len, [])
        lengthGroups.get(len)!.push(edge)
      }
      
      // For each pair, if one is known, the other should be too
      for (const [len, pairEdges] of lengthGroups) {
        const anyKnown = pairEdges.some(e => kb.edgeLengths.has(e.id))
        if (anyKnown) {
          for (const edge of pairEdges) {
            if (!kb.edgeLengths.has(edge.id)) {
              kb.edgeLengths.set(edge.id, len)
              addKnowledge(len, kb)
              log(`Rectangle opposite side: edge ${edge.id}=${len}`)
            }
          }
        }
      }
      break
    }
    
    case 'right-triangle': {
      // Pythagorean theorem: if we know any 2 sides, we can derive the 3rd
      // IMPORTANT: Validate derivations against actual edge lengths to handle
      // rounding errors from non-Pythagorean-triple triangles
      const parts = identifyTriangleParts(shapeEdges)
      if (!parts) break
      
      const leg1 = parts.legs[0]
      const leg2 = parts.legs[1]
      const hyp = parts.hypotenuse
      
      const leg1Known = kb.edgeLengths.has(leg1.id)
      const leg2Known = kb.edgeLengths.has(leg2.id)
      const hypKnown = kb.edgeLengths.has(hyp.id)
      
      if (leg1Known && leg2Known && !hypKnown) {
        // c = √(a² + b²) - derive hypotenuse from legs
        const a = kb.edgeLengths.get(leg1.id)!
        const b = kb.edgeLengths.get(leg2.id)!
        const derivedC = Math.sqrt(a * a + b * b)
        const actualC = edgeLength(hyp)
        
        // Validate against actual length (5% tolerance)
        if (Math.abs(derivedC - actualC) / actualC < 0.05) {
          kb.edgeLengths.set(hyp.id, Math.round(actualC))
          addKnowledge(actualC, kb)
          log(`Pythagorean: legs ${a},${b} → hypotenuse ${hyp.id}=${Math.round(actualC)}`)
        }
      } else if (hypKnown && leg1Known && !leg2Known) {
        // b = √(c² - a²) - derive leg2 from hypotenuse and leg1
        const c = kb.edgeLengths.get(hyp.id)!
        const a = kb.edgeLengths.get(leg1.id)!
        const derivedB = Math.sqrt(Math.max(0, c * c - a * a))
        const actualB = edgeLength(leg2)
        
        // Validate against actual length (5% tolerance)
        if (Math.abs(derivedB - actualB) / actualB < 0.05) {
          kb.edgeLengths.set(leg2.id, Math.round(actualB))
          addKnowledge(actualB, kb)
          log(`Pythagorean: hyp ${c}, leg ${a} → leg ${leg2.id}=${Math.round(actualB)}`)
        }
      } else if (hypKnown && leg2Known && !leg1Known) {
        // a = √(c² - b²) - derive leg1 from hypotenuse and leg2
        const c = kb.edgeLengths.get(hyp.id)!
        const b = kb.edgeLengths.get(leg2.id)!
        const derivedA = Math.sqrt(Math.max(0, c * c - b * b))
        const actualA = edgeLength(leg1)
        
        // Validate against actual length (5% tolerance)
        if (Math.abs(derivedA - actualA) / actualA < 0.05) {
          kb.edgeLengths.set(leg1.id, Math.round(actualA))
          addKnowledge(actualA, kb)
          log(`Pythagorean: hyp ${c}, leg ${b} → leg ${leg1.id}=${Math.round(actualA)}`)
        }
      }
      break
    }
  }
  
  // Propagate across seams: if we know an edge length, and that edge is a seam,
  // the partner edge in the other shape also has that length
  for (const edge of shapeEdges) {
    if (!edge.visible && edge.shapeIds.length === 2 && kb.edgeLengths.has(edge.id)) {
      const length = kb.edgeLengths.get(edge.id)!
      
      // Find the partner shape and its corresponding seam edge
      const partnerShapeId = edge.shapeIds.find(id => id !== shape.id)
      if (partnerShapeId) {
        const partnerShape = figure.shapes.find(s => s.id === partnerShapeId)
        if (partnerShape) {
          // Find edges in partner shape that are seams with the same length
          for (const partnerEdgeId of partnerShape.edges) {
            const partnerEdge = edges.get(partnerEdgeId)
            if (partnerEdge && !partnerEdge.visible && partnerEdge.type === 'line') {
              const partnerLen = Math.round(edgeLength(partnerEdge))
              if (Math.abs(partnerLen - length) < 0.1 && !kb.edgeLengths.has(partnerEdgeId)) {
                kb.edgeLengths.set(partnerEdgeId, length)
                log(`Seam propagation: ${edge.id}=${length} → ${partnerEdgeId}=${length}`)
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Initialize knowledge base with ONLY the measurements given to the student
 * 
 * IMPORTANT: We do NOT add seam edge lengths here!
 * Seams are invisible - the student must derive those values from
 * visible edges that share the same length.
 */
function initKnowledge(figure: CompositeFigure): KnowledgeBase {
  const kb = createKnowledgeBase()
  
  // ONLY add explicit measurements - nothing else!
  for (const m of figure.measurements) {
    addKnowledge(m.value, kb)
    
    if (m.edgeId) {
      if (m.type === 'length') {
        kb.edgeLengths.set(m.edgeId, m.value)
      } else if (m.type === 'radius') {
        kb.radii.set(m.edgeId, m.value)
      }
    }
  }
  
  // NOTE: Seam edges are NOT added here!
  // The student cannot see seams - they must figure out those lengths
  // by recognizing that attached shapes share edge lengths.
  
  return kb
}

/**
 * Try to determine an edge's length from known information
 * Reserved for potential future use
 */
function _tryDetermineEdge(edge: Edge, kb: KnowledgeBase, _verbose = false): number | null {
  // Already known directly from a measurement?
  if (edge.type === 'line' && kb.edgeLengths.has(edge.id)) {
    return kb.edgeLengths.get(edge.id)!
  }
  if (edge.type === 'arc' && kb.radii.has(edge.id)) {
    return kb.radii.get(edge.id)!
  }
  
  // SEAM edges are INVISIBLE - student cannot directly determine them
  // They can only be inferred through shape geometry (handled in tryComputeShapeArea)
  if (!edge.visible) {
    return null
  }
  
  // For visible edges without measurements, we cannot just "guess" the length
  // The only way to know is through geometric relationships, which are
  // handled at the shape level (e.g., opposite sides of rectangle are equal)
  
  return null
}

/**
 * Get the actual length of an edge (for geometric reasoning within a shape)
 * This is used to find parallel edges with the same length
 */
function getEdgeActualLength(edge: Edge): number {
  if (edge.type === 'line') {
    return Math.round(edgeLength(edge))
  } else {
    return Math.round(edge.radius!)
  }
}

/**
 * Try to compute a shape's area given current knowledge
 * 
 * STRICT GEOMETRIC REASONING:
 * - Only VISIBLE edges with measurements can be used directly
 * - Other VISIBLE edges can be derived if geometrically linked
 *   (e.g., opposite sides of rectangle are equal)
 * - SEAM edges cannot be used - they're invisible!
 */
function tryComputeShapeArea(
  shape: Shape, 
  edges: Map<string, Edge>,
  kb: KnowledgeBase,
  verbose = false
): number | null {
  const shapeEdges = shape.edges.map(id => edges.get(id)).filter((e): e is Edge => !!e)
  const visibleEdges = shapeEdges.filter(e => e.visible)
  const log = verbose ? (msg: string) => console.log(`    ${msg}`) : () => {}
  
  switch (shape.type) {
    case 'rect': {
      // Rectangle: need width and height
      // Student can only use VISIBLE edges
      // If parallel visible edges exist, knowing one means knowing the other
      
      // Group visible edges by their length (parallel edges have same length)
      const knownLengths: number[] = []
      const edgesByLength = new Map<number, Edge[]>()
      
      for (const e of visibleEdges) {
        if (e.type !== 'line') continue
        const len = getEdgeActualLength(e)
        if (!edgesByLength.has(len)) edgesByLength.set(len, [])
        edgesByLength.get(len)!.push(e)
      }
      
      // For each length group, check if we have a measurement for ANY edge in the group
      for (const [len, edgesWithLen] of edgesByLength) {
        const hasMeasurement = edgesWithLen.some(e => kb.edgeLengths.has(e.id))
        if (hasMeasurement) {
          knownLengths.push(len)
          log(`Visible edges with length ${len}: [${edgesWithLen.map(e => e.id).join(', ')}] - KNOWN (at least one measured)`)
        } else {
          log(`Visible edges with length ${len}: [${edgesWithLen.map(e => e.id).join(', ')}] - UNKNOWN (no measurement)`)
        }
      }
      
      // Check what we know
      const uniqueKnown = [...new Set(knownLengths)]
      
      // If we have 2 different dimensions, we're done
      if (uniqueKnown.length >= 2) {
        const sorted = uniqueKnown.sort((a, b) => b - a)
        log(`→ rect area = ${sorted[0]} × ${sorted[1]} = ${sorted[0] * sorted[1]}`)
        return sorted[0] * sorted[1]
      }
      
      // If we have 1 dimension, check if this might be a square
      // (all edges have the same length)
      if (uniqueKnown.length === 1) {
        const allLengths = Array.from(edgesByLength.keys())
        if (allLengths.length === 1) {
          // All visible edges have the same length - it's a square!
          const side = uniqueKnown[0]
          log(`→ Square detected! All visible edges have length ${side}`)
          log(`→ square area = ${side}² = ${side * side}`)
          return side * side
        } else {
          // There are edges with different lengths, but we only know one dimension
          log(`→ Only one dimension known (${uniqueKnown[0]}), need the other`)
        }
      }
      
      log(`→ Need 2 dimensions, have ${uniqueKnown.length}`)
      return null
    }
    
    case 'right-triangle': {
      // Need the two LEGS (not hypotenuse!) for area calculation
      // First identify which edges are legs vs hypotenuse
      const parts = identifyTriangleParts(shapeEdges)
      if (!parts) {
        log(`→ Could not identify triangle parts`)
        return null
      }
      
      const leg1 = parts.legs[0]
      const leg2 = parts.legs[1]
      const hyp = parts.hypotenuse
      
      log(`Triangle parts: leg1=${leg1.id} (${Math.round(edgeLength(leg1))}), leg2=${leg2.id} (${Math.round(edgeLength(leg2))}), hyp=${hyp.id} (${Math.round(edgeLength(hyp))})`)
      
      // Check if we know the legs (either from measurements or derivation)
      const leg1Known = kb.edgeLengths.has(leg1.id)
      const leg2Known = kb.edgeLengths.has(leg2.id)
      
      if (leg1Known && leg2Known) {
        const a = kb.edgeLengths.get(leg1.id)!
        const b = kb.edgeLengths.get(leg2.id)!
        log(`→ triangle area = (${a} × ${b}) / 2 = ${(a * b) / 2}`)
        return (a * b) / 2
      }
      
      // If we know hypotenuse and one leg, we can derive the other via Pythagorean theorem
      // (This should have been done in propagateKnowledge, but check anyway)
      // IMPORTANT: Validate that the derived value matches the actual edge length
      // to handle rounding errors from non-Pythagorean-triple triangles
      const hypKnown = kb.edgeLengths.has(hyp.id)
      
      if (hypKnown && leg1Known) {
        const c = kb.edgeLengths.get(hyp.id)!
        const a = kb.edgeLengths.get(leg1.id)!
        const derivedB = Math.sqrt(c * c - a * a)
        const actualB = edgeLength(leg2)
        
        // Only use Pythagorean derivation if it matches actual length (within 5% tolerance)
        if (Math.abs(derivedB - actualB) / actualB < 0.05) {
          const b = Math.round(actualB)  // Use actual length, not derived
          kb.edgeLengths.set(leg2.id, b)
          addKnowledge(b, kb)
          log(`Derived leg2 via Pythagorean: ${leg2.id}=${b}`)
          log(`→ triangle area = (${a} × ${b}) / 2 = ${(a * b) / 2}`)
          return (a * b) / 2
        } else {
          log(`Pythagorean derivation failed: derived=${derivedB.toFixed(2)}, actual=${actualB.toFixed(2)}`)
        }
      }
      
      if (hypKnown && leg2Known) {
        const c = kb.edgeLengths.get(hyp.id)!
        const b = kb.edgeLengths.get(leg2.id)!
        const derivedA = Math.sqrt(c * c - b * b)
        const actualA = edgeLength(leg1)
        
        // Only use Pythagorean derivation if it matches actual length (within 5% tolerance)
        if (Math.abs(derivedA - actualA) / actualA < 0.05) {
          const a = Math.round(actualA)  // Use actual length, not derived
          kb.edgeLengths.set(leg1.id, a)
          addKnowledge(a, kb)
          log(`Derived leg1 via Pythagorean: ${leg1.id}=${a}`)
          log(`→ triangle area = (${a} × ${b}) / 2 = ${(a * b) / 2}`)
          return (a * b) / 2
        } else {
          log(`Pythagorean derivation failed: derived=${derivedA.toFixed(2)}, actual=${actualA.toFixed(2)}`)
        }
      }
      
      log(`→ Need both legs. Have: leg1=${leg1Known}, leg2=${leg2Known}, hyp=${hypKnown}`)
      return null
    }
    
    case 'semicircle': {
      const arc = visibleEdges.find(e => e.type === 'arc')
      const flatEdge = visibleEdges.find(e => e.type === 'line')
      
      // Check if we have radius directly measured
      if (arc && kb.radii.has(arc.id)) {
        const r = kb.radii.get(arc.id)!
        log(`→ semicircle area = (π × ${r}²) / 2 = ${(PI * r * r) / 2}`)
        return (PI * r * r) / 2
      }
      
      // Check if we have the diameter (flat edge) measured
      if (flatEdge && kb.edgeLengths.has(flatEdge.id)) {
        const diameter = kb.edgeLengths.get(flatEdge.id)!
        const radius = diameter / 2
        log(`Diameter ${flatEdge.id}=${diameter} (measured), so radius=${radius}`)
        if (arc) kb.radii.set(arc.id, radius)
        addKnowledge(radius, kb)
        log(`→ semicircle area = (π × ${radius}²) / 2 = ${(PI * radius * radius) / 2}`)
        return (PI * radius * radius) / 2
      }
      
      log(`→ Need radius or diameter measurement`)
      return null
    }
    
    case 'quarter-circle': {
      const arc = visibleEdges.find(e => e.type === 'arc')
      const straightEdges = visibleEdges.filter(e => e.type === 'line')
      
      // Check if we have radius directly measured
      if (arc && kb.radii.has(arc.id)) {
        const r = kb.radii.get(arc.id)!
        log(`→ quarter-circle area = (π × ${r}²) / 4 = ${(PI * r * r) / 4}`)
        return (PI * r * r) / 4
      }
      
      // Check if we have either straight edge measured (they equal the radius)
      for (const edge of straightEdges) {
        if (kb.edgeLengths.has(edge.id)) {
          const len = kb.edgeLengths.get(edge.id)!
          log(`Edge ${edge.id} length=${len} (measured) equals radius`)
          if (arc) kb.radii.set(arc.id, len)
          addKnowledge(len, kb)
          log(`→ quarter-circle area = (π × ${len}²) / 4 = ${(PI * len * len) / 4}`)
          return (PI * len * len) / 4
        }
      }
      
      log(`→ Need radius or leg measurement`)
      return null
    }
  }
  
  return null
}

/**
 * Log figure structure for debugging
 */
function logFigureStructure(figure: CompositeFigure): void {
  console.group('📐 FIGURE STRUCTURE')
  
  console.log('Shapes:', figure.shapes.length)
  for (const shape of figure.shapes) {
    console.log(`  ${shape.id}: ${shape.type}, area=${shape.area}, edges=[${shape.edges.join(', ')}]`)
  }
  
  console.log('\nEdges:')
  for (const [id, edge] of figure.edges) {
    if (edge.type === 'line') {
      const len = Math.round(edgeLength(edge))
      console.log(`  ${id}: LINE len=${len} ${edge.visible ? '(visible)' : '(SEAM)'} shapes=[${edge.shapeIds.join(', ')}]`)
    } else {
      console.log(`  ${id}: ARC r=${edge.radius} ${edge.visible ? '(visible)' : '(SEAM)'} shapes=[${edge.shapeIds.join(', ')}]`)
    }
  }
  
  console.log('\nMeasurements given to student:')
  for (const m of figure.measurements) {
    console.log(`  ${m.id}: ${m.type}=${m.value} on edge ${m.edgeId}`)
  }
  
  console.log(`\nExpected total area: ${figure.totalArea}`)
  console.groupEnd()
}

/**
 * Solve the figure by iteratively computing shape areas
 * Returns { success, computedArea, unsolvedShapes }
 */
function solveFigure(figure: CompositeFigure, verbose = false): {
  success: boolean
  computedArea: number
  unsolvedShapes: Shape[]
  kb: KnowledgeBase
} {
  if (verbose) {
    logFigureStructure(figure)
    console.group('🧮 SOLVING STEPS')
  }
  
  const kb = initKnowledge(figure)
  
  if (verbose) {
    console.log('\nInitial knowledge from measurements:')
    console.log('  Values:', Array.from(kb.values).filter(v => v > 0).sort((a, b) => b - a).slice(0, 10).join(', '))
    console.log('  Edge lengths known:', Array.from(kb.edgeLengths.entries()).map(([k, v]) => `${k}=${v}`).join(', ') || 'none')
    console.log('  Radii known:', Array.from(kb.radii.entries()).map(([k, v]) => `${k}=${v}`).join(', ') || 'none')
  }
  
  const unsolved = [...figure.shapes]
  let progress = true
  let iteration = 0
  
  // Iteratively try to solve shapes
  while (progress && unsolved.length > 0) {
    progress = false
    iteration++
    
    if (verbose) console.log(`\n--- Iteration ${iteration} ---`)
    
    for (let i = unsolved.length - 1; i >= 0; i--) {
      const shape = unsolved[i]
      const area = tryComputeShapeArea(shape, figure.edges, kb, verbose)
      
      if (area !== null) {
        kb.computedArea += area
        kb.solvedShapes.add(shape.id)
        unsolved.splice(i, 1)
        progress = true
        
        if (verbose) console.log(`  ✓ Solved ${shape.id} (${shape.type}): area = ${area}`)
        
        // Propagate knowledge from this solved shape to help solve others
        propagateKnowledge(shape, figure.edges, kb, figure, verbose)
      } else {
        if (verbose) console.log(`  ✗ Cannot solve ${shape.id} (${shape.type}) yet`)
      }
    }
  }
  
  if (verbose) {
    console.log(`\n--- RESULT ---`)
    console.log(`Solved: ${unsolved.length === 0 ? 'YES' : 'NO'}`)
    console.log(`Computed area: ${Math.round(kb.computedArea * 10) / 10}`)
    console.log(`Unsolved shapes: ${unsolved.map(s => s.id).join(', ') || 'none'}`)
    console.groupEnd()
  }
  
  return {
    success: unsolved.length === 0,
    computedArea: Math.round(kb.computedArea * 10) / 10,
    unsolvedShapes: unsolved,
    kb,
  }
}

/**
 * Find what measurement is needed to solve an unsolved shape
 * Uses the SAME logic as tryComputeShapeArea to determine what's missing
 */
function findMissingMeasurement(
  shape: Shape,
  edges: Map<string, Edge>,
  kb: KnowledgeBase
): { edge: Edge; type: 'length' | 'radius'; value: number } | null {
  const shapeEdges = shape.edges.map(id => edges.get(id)).filter((e): e is Edge => !!e)
  const visibleEdges = shapeEdges.filter(e => e.visible)
  
  switch (shape.type) {
    case 'rect': {
      // Group visible edges by length
      const edgesByLength = new Map<number, Edge[]>()
      for (const e of visibleEdges) {
        if (e.type !== 'line') continue
        const len = getEdgeActualLength(e)
        if (!edgesByLength.has(len)) edgesByLength.set(len, [])
        edgesByLength.get(len)!.push(e)
      }
      
      // Find a length group that has no measurements
      for (const [len, edgesWithLen] of edgesByLength) {
        const hasMeasurement = edgesWithLen.some(e => kb.edgeLengths.has(e.id))
        if (!hasMeasurement) {
          // Need to measure one edge from this group
          return { edge: edgesWithLen[0], type: 'length', value: len }
        }
      }
      return null
    }
    
    case 'right-triangle': {
      // We need to know BOTH legs to compute area
      // We can derive a leg if we know hypotenuse + other leg (Pythagorean)
      const parts = identifyTriangleParts(shapeEdges)
      if (!parts) return null
      
      const leg1Known = kb.edgeLengths.has(parts.legs[0].id)
      const leg2Known = kb.edgeLengths.has(parts.legs[1].id)
      const hypKnown = kb.edgeLengths.has(parts.hypotenuse.id)
      
      // If we already know both legs, we're good
      if (leg1Known && leg2Known) return null
      
      // If we know hyp + one leg, we can derive the other - we're good
      if (hypKnown && (leg1Known || leg2Known)) return null
      
      // Need to add a measurement. Prefer a leg over hypotenuse.
      // Check which visible edges are not yet measured
      if (!leg1Known && parts.legs[0].visible) {
        return { edge: parts.legs[0], type: 'length', value: Math.round(edgeLength(parts.legs[0])) }
      }
      if (!leg2Known && parts.legs[1].visible) {
        return { edge: parts.legs[1], type: 'length', value: Math.round(edgeLength(parts.legs[1])) }
      }
      if (!hypKnown && parts.hypotenuse.visible) {
        return { edge: parts.hypotenuse, type: 'length', value: Math.round(edgeLength(parts.hypotenuse)) }
      }
      
      return null
    }
    
    case 'semicircle': {
      const arc = visibleEdges.find(e => e.type === 'arc')
      const flatEdge = visibleEdges.find(e => e.type === 'line')
      
      // Check if we have radius or diameter measured
      if (arc && kb.radii.has(arc.id)) return null
      if (flatEdge && kb.edgeLengths.has(flatEdge.id)) return null
      
      // Need to add a measurement - prefer the flat edge (diameter)
      if (flatEdge) {
        return { edge: flatEdge, type: 'length', value: Math.round(edgeLength(flatEdge)) }
      }
      if (arc) {
        return { edge: arc, type: 'radius', value: Math.round(arc.radius!) }
      }
      return null
    }
    
    case 'quarter-circle': {
      const arc = visibleEdges.find(e => e.type === 'arc')
      const straightEdges = visibleEdges.filter(e => e.type === 'line')
      
      // Check if we have radius or a leg measured
      if (arc && kb.radii.has(arc.id)) return null
      if (straightEdges.some(e => kb.edgeLengths.has(e.id))) return null
      
      // Need to add a measurement - prefer a straight edge
      if (straightEdges.length > 0) {
        const edge = straightEdges[0]
        return { edge, type: 'length', value: Math.round(edgeLength(edge)) }
      }
      if (arc) {
        return { edge: arc, type: 'radius', value: Math.round(arc.radius!) }
      }
      return null
    }
  }
  
  return null
}

/**
 * Add a measurement for a specific edge
 */
function addMeasurementForEdge(
  figure: CompositeFigure,
  edge: Edge,
  type: 'length' | 'radius',
  value: number
): void {
  const id = `m${figure.measurements.length + 1}`
  
  if (type === 'length') {
    const mid = midpoint(edge.p1, edge.p2)
    const angle = edgeAngle(edge)
    const perpAngle = (angle + 90) * Math.PI / 180
    const offset = 15
    
    figure.measurements.push({
      id,
      edgeId: edge.id,
      type: 'length',
      value,
      label: `${value} cm`,
      position: {
        x: mid.x + Math.cos(perpAngle) * offset,
        y: mid.y + Math.sin(perpAngle) * offset,
      },
      angle: Math.abs(angle) > 45 && Math.abs(angle) < 135 ? 0 : angle,
    })
  } else {
    const midAngle = (edge.startAngle! + edge.endAngle!) / 2
    const midPoint = {
      x: edge.center!.x + value * Math.cos(midAngle),
      y: edge.center!.y + value * Math.sin(midAngle),
    }
    
    figure.measurements.push({
      id,
      edgeId: edge.id,
      type: 'radius',
      value,
      label: `${value} cm`,
      position: midpoint(edge.center!, midPoint),
      angle: midAngle * 180 / Math.PI,
    })
  }
}

/**
 * Ensure the figure is solvable by adding measurements until it can be solved
 * Returns true if figure is now solvable
 */
function ensureSolvable(figure: CompositeFigure, verbose = true): boolean {
  const maxIterations = 20  // Safety limit
  
  if (verbose) {
    console.log('\n' + '═'.repeat(60))
    console.log('ENSURING FIGURE IS SOLVABLE')
    console.log('═'.repeat(60))
  }
  
  for (let i = 0; i < maxIterations; i++) {
    if (verbose && i > 0) {
      console.log(`\n--- Attempt ${i + 1} after adding measurement ---`)
    }
    
    const result = solveFigure(figure, verbose)
    
    if (result.success) {
      // Verify computed area matches expected
      const expectedArea = Math.round(figure.totalArea * 10) / 10
      if (verbose) {
        console.log(`\n✓ SOLVABLE! Computed: ${result.computedArea}, Expected: ${expectedArea}`)
      }
      if (Math.abs(result.computedArea - expectedArea) < 0.1) {
        return true
      } else {
        console.warn(`⚠ Area mismatch: computed ${result.computedArea}, expected ${expectedArea}`)
        return true  // Still solvable, just a formula issue
      }
    }
    
    // Find what's missing and add it
    for (const shape of result.unsolvedShapes) {
      const missing = findMissingMeasurement(shape, figure.edges, result.kb)
      if (missing) {
        if (verbose) {
          console.log(`\n+ Adding measurement: ${missing.type}=${missing.value} on edge ${missing.edge.id}`)
        }
        addMeasurementForEdge(figure, missing.edge, missing.type, missing.value)
        break  // Re-run solver with new measurement
      }
    }
  }
  
  console.warn('Could not make figure solvable after max iterations')
  return false
}

/**
 * Validate that the figure is solvable by actually solving it
 */
function validateSolvability(figure: CompositeFigure): boolean {
  const result = solveFigure(figure)
  return result.success
}

/**
 * Minimize measurements by removing redundant ones
 * 
 * For each measurement, try removing it and check if still solvable.
 * If solvable without it, remove it permanently.
 * 
 * This ensures the student has to derive as much as possible.
 */
function minimizeMeasurements(figure: CompositeFigure, verbose = true): void {
  if (verbose) {
    console.log('\n' + '─'.repeat(60))
    console.log('MINIMIZING MEASUREMENTS')
    console.log('─'.repeat(60))
    console.log(`Starting with ${figure.measurements.length} measurements`)
  }
  
  let removed = 0
  let i = 0
  
  while (i < figure.measurements.length) {
    // Temporarily remove this measurement
    const backup = figure.measurements.splice(i, 1)[0]
    
    // Check if still solvable
    const result = solveFigure(figure, false)
    
    if (result.success) {
      // Still solvable! Keep it removed
      removed++
      if (verbose) {
        console.log(`  ✓ Removed ${backup.type}=${backup.value} on ${backup.edgeId} (redundant)`)
      }
      // Don't increment i - next measurement is now at position i
    } else {
      // Not solvable without it - put it back
      figure.measurements.splice(i, 0, backup)
      if (verbose) {
        console.log(`  ✗ Kept ${backup.type}=${backup.value} on ${backup.edgeId} (required)`)
      }
      i++
    }
  }
  
  if (verbose) {
    console.log(`\nRemoved ${removed} redundant measurements`)
    console.log(`Final: ${figure.measurements.length} measurements (minimum required)`)
  }
}

// ════════════════════════════════════════════════════════════════
// NEW DERIVATION-GRAPH BASED MEASUREMENT SYSTEM
// ════════════════════════════════════════════════════════════════

/**
 * Result of the graph-based measurement selection
 */
interface MeasurementSelectionResult {
  success: boolean
  measurements: Measurement[]
  derivationDepth: number
  graph: DerivationGraph
  solution: DerivationSolution
}

/**
 * Add measurements using the derivation graph approach
 * 
 * This is the new, more intelligent measurement system that:
 * 1. Builds a graph of all quantities and their derivation relationships
 * 2. Finds the minimum set of measurements needed to solve the figure
 * 3. Tracks derivation depth for difficulty calculation
 * 
 * @param targetDepth - Desired derivation depth (for difficulty control)
 *                      Higher depth = more derivation steps = harder
 */
function addMeasurementsWithGraph(
  figure: CompositeFigure,
  targetDepth: number = -1, // -1 = minimize measurements (max depth)
  verbose = true
): MeasurementSelectionResult {
  if (verbose) {
    console.log('\n' + '═'.repeat(60))
    console.log('GRAPH-BASED MEASUREMENT SELECTION')
    console.log('═'.repeat(60))
  }
  
  // Build the derivation graph from the figure
  const graph = buildGraphFromFigure(figure)
  
  if (verbose) {
    logGraph(graph)
  }
  
  // Find the required sources (minimum measurements)
  let solution: DerivationSolution
  let sources: Set<string>
  let actualDepth: number
  
  if (targetDepth >= 0) {
    // Try to find sources that achieve the target depth
    const result = findSourcesForDepth(graph, targetDepth)
    if (result) {
      sources = result.sources
      actualDepth = result.actualDepth
    } else {
      // Fall back to minimum sources
      solution = solveGraph(graph)
      sources = solution.requiredSources
      actualDepth = solution.maxDepth
    }
  } else {
    // Use minimum sources (maximum derivation depth)
    solution = solveGraph(graph)
    sources = solution.requiredSources
    actualDepth = solution.maxDepth
  }
  
  // Solve with the selected sources to get full solution info
  solution = solveGraph(graph)
  
  if (verbose) {
    logSolution(solution, graph)
    console.log(`\nSelected ${sources.size} measurements with derivation depth ${actualDepth}`)
  }
  
  // Convert sources to actual measurements on the figure
  const measurements: Measurement[] = []
  let measurementId = 0
  
  for (const sourceId of sources) {
    const quantity = graph.quantities.get(sourceId)
    if (!quantity || !quantity.edgeId) continue
    
    const edge = figure.edges.get(quantity.edgeId)
    if (!edge) continue
    
    measurementId++
    
    if (quantity.type === 'length' && edge.type === 'line') {
      const mid = midpoint(edge.p1, edge.p2)
      const angle = edgeAngle(edge)
      const perpAngle = (angle + 90) * Math.PI / 180
      const offset = 15
      
      measurements.push({
        id: `m${measurementId}`,
        edgeId: edge.id,
        type: 'length',
        value: quantity.value,
        label: `${quantity.value} cm`,
        position: {
          x: mid.x + Math.cos(perpAngle) * offset,
          y: mid.y + Math.sin(perpAngle) * offset,
        },
        angle: Math.abs(angle) > 45 && Math.abs(angle) < 135 ? 0 : angle,
      })
      
      if (verbose) {
        console.log(`  📏 Added length=${quantity.value} on edge ${edge.id}`)
      }
    } else if (quantity.type === 'radius' && edge.type === 'arc') {
      const midAngle = (edge.startAngle! + edge.endAngle!) / 2
      const midPoint = {
        x: edge.center!.x + quantity.value * Math.cos(midAngle),
        y: edge.center!.y + quantity.value * Math.sin(midAngle),
      }
      
      measurements.push({
        id: `m${measurementId}`,
        edgeId: edge.id,
        type: 'radius',
        value: quantity.value,
        label: `${quantity.value} cm`,
        position: midpoint(edge.center!, midPoint),
        angle: midAngle * 180 / Math.PI,
      })
      
      if (verbose) {
        console.log(`  📏 Added radius=${quantity.value} on edge ${edge.id}`)
      }
    }
  }
  
  if (verbose) {
    console.log(`\n✓ Added ${measurements.length} measurements (derivation depth: ${actualDepth})`)
  }
  
  return {
    success: solution.solvable,
    measurements,
    derivationDepth: actualDepth,
    graph,
    solution,
  }
}

/**
 * Apply graph-based measurements to a figure
 * 
 * This replaces the old addMeasurements + ensureSolvable + minimizeMeasurements chain.
 */
function applyGraphMeasurements(
  figure: CompositeFigure,
  difficulty: 'let' | 'middel' | 'svaer' = 'middel',
  verbose = true
): { derivationDepth: number; measurementCount: number } {
  // Target derivation depths based on difficulty
  // 
  // For reference, typical derivation depths:
  // - Single shape: 2 steps (dimensions → area → total)
  // - With Pythagorean: 3 steps (2 sides → 3rd side → area → total)
  // - Two shapes: 3-4 steps
  // - Complex figures: 4-6 steps
  //
  // let: Give more measurements to reduce derivation (target 2 steps max)
  // middel: Use minimum measurements (whatever the natural depth is)
  // svaer: Use minimum measurements (same as middel - the figure complexity determines difficulty)
  const targetDepth = difficulty === 'let' ? 2 
                    : -1 // -1 = minimize (use minimum measurements, maximize depth)
  
  const result = addMeasurementsWithGraph(figure, targetDepth, verbose)
  
  if (result.success) {
    figure.measurements = result.measurements
    return {
      derivationDepth: result.derivationDepth,
      measurementCount: result.measurements.length,
    }
  }
  
  // Fallback to old system if graph approach fails
  if (verbose) {
    console.warn('Graph-based measurement selection failed, falling back to old system')
  }
  
  addMeasurements(figure, new SeededRandom())
  ensureSolvable(figure, verbose)
  minimizeMeasurements(figure, verbose)
  
  return {
    derivationDepth: -1, // Unknown
    measurementCount: figure.measurements.length,
  }
}

// ════════════════════════════════════════════════════════════════
// SVG RENDERING
// ════════════════════════════════════════════════════════════════

function renderEdge(edge: Edge, scale: number, offsetX: number, offsetY: number): string {
  const x1 = offsetX + edge.p1.x * scale
  const y1 = offsetY - edge.p1.y * scale  // Flip Y for SVG
  const x2 = offsetX + edge.p2.x * scale
  const y2 = offsetY - edge.p2.y * scale
  
  if (edge.type === 'line') {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLORS.stroke}" stroke-width="2"/>`
  } else {
    // Arc
    const r = edge.radius! * scale
    const largeArc = Math.abs(edge.endAngle! - edge.startAngle!) > Math.PI ? 1 : 0
    const sweep = edge.clockwise ? 1 : 0
    return `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}" fill="none" stroke="${COLORS.stroke}" stroke-width="2"/>`
  }
}

/**
 * Calculate the centroid of all edges belonging to a shape
 */
function calculateShapeCentroid(
  shapeEdges: Edge[],
  scale: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number } {
  let sumX = 0, sumY = 0, count = 0
  
  for (const e of shapeEdges) {
    // Include both endpoints
    sumX += offsetX + e.p1.x * scale
    sumY += offsetY - e.p1.y * scale
    sumX += offsetX + e.p2.x * scale
    sumY += offsetY - e.p2.y * scale
    count += 2
    
    // For arcs, also include the center
    if (e.type === 'arc' && e.center) {
      sumX += offsetX + e.center.x * scale
      sumY += offsetY - e.center.y * scale
      count += 1
    }
  }
  
  return { x: sumX / count, y: sumY / count }
}

/**
 * Render a dimension with extension lines, dimension line, and tick marks
 * Standard technical drawing style
 */
function renderDimensionLine(
  m: Measurement,
  edge: Edge,
  allEdges: Map<string, Edge>,
  scale: number,
  offsetX: number,
  offsetY: number
): string {
  // Transform edge points to SVG coords
  const x1 = offsetX + edge.p1.x * scale
  const y1 = offsetY - edge.p1.y * scale
  const x2 = offsetX + edge.p2.x * scale
  const y2 = offsetY - edge.p2.y * scale
  
  // Edge vector and perpendicular
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  
  // Normalized perpendicular
  const perpX = -dy / len
  const perpY = dx / len
  
  // Find all edges that share a shape with this edge
  const shapeIds = edge.shapeIds
  const shapeEdges = Array.from(allEdges.values()).filter(e => 
    e.shapeIds.some(id => shapeIds.includes(id))
  )
  
  // Calculate the centroid of the shape(s) this edge belongs to
  const shapeCentroid = calculateShapeCentroid(shapeEdges, scale, offsetX, offsetY)
  
  // Check if perpendicular points toward shape center - if so, flip it (we want outside)
  const edgeMidX = (x1 + x2) / 2
  const edgeMidY = (y1 + y2) / 2
  const toCenterX = shapeCentroid.x - edgeMidX
  const toCenterY = shapeCentroid.y - edgeMidY
  const dot = perpX * toCenterX + perpY * toCenterY
  
  // If dot > 0, perpendicular points toward center, so flip to point outward
  const signedPerpX = dot > 0 ? -perpX : perpX
  const signedPerpY = dot > 0 ? -perpY : perpY
  
  // Dimension line offset from edge (increased for better visibility)
  const dimOffset = 22
  const extGap = 3      // Gap between edge and extension line start
  const extOverhang = 4 // How far extension line goes past dimension line
  const tickSize = 4    // Size of tick marks
  
  // Dimension line endpoints
  const dimX1 = x1 + signedPerpX * dimOffset
  const dimY1 = y1 + signedPerpY * dimOffset
  const dimX2 = x2 + signedPerpX * dimOffset
  const dimY2 = y2 + signedPerpY * dimOffset
  
  // Extension lines (from near edge to past dimension line)
  const ext1StartX = x1 + signedPerpX * extGap
  const ext1StartY = y1 + signedPerpY * extGap
  const ext1EndX = dimX1 + signedPerpX * extOverhang
  const ext1EndY = dimY1 + signedPerpY * extOverhang
  
  const ext2StartX = x2 + signedPerpX * extGap
  const ext2StartY = y2 + signedPerpY * extGap
  const ext2EndX = dimX2 + signedPerpX * extOverhang
  const ext2EndY = dimY2 + signedPerpY * extOverhang
  
  // Tick marks at ends (45 degree slashes)
  const tickAngle = Math.PI / 4
  const edgeAngle = Math.atan2(dy, dx)
  const tick1Angle = edgeAngle + tickAngle
  const tick2Angle = edgeAngle - tickAngle
  
  // Label position (middle of dimension line)
  const labelX = (dimX1 + dimX2) / 2
  const labelY = (dimY1 + dimY2) / 2
  
  // Calculate rotation for text (keep readable)
  let textAngle = Math.atan2(dimY2 - dimY1, dimX2 - dimX1) * 180 / Math.PI
  if (textAngle > 90) textAngle -= 180
  if (textAngle < -90) textAngle += 180
  
  // Build SVG
  let svg = ''
  
  // Extension lines (thin, same color as dimension)
  svg += `<line x1="${ext1StartX}" y1="${ext1StartY}" x2="${ext1EndX}" y2="${ext1EndY}" stroke="${COLORS.dim}" stroke-width="1"/>`
  svg += `<line x1="${ext2StartX}" y1="${ext2StartY}" x2="${ext2EndX}" y2="${ext2EndY}" stroke="${COLORS.dim}" stroke-width="1"/>`
  
  // Dimension line (with gap for text)
  const gapSize = 20 + m.label.length * 4
  const halfGap = gapSize / 2
  const dimMidX = (dimX1 + dimX2) / 2
  const dimMidY = (dimY1 + dimY2) / 2
  const unitDx = dx / len
  const unitDy = dy / len
  
  // Left half of dimension line
  svg += `<line x1="${dimX1}" y1="${dimY1}" x2="${dimMidX - unitDx * halfGap}" y2="${dimMidY - unitDy * halfGap}" stroke="${COLORS.dim}" stroke-width="1.5"/>`
  // Right half of dimension line
  svg += `<line x1="${dimMidX + unitDx * halfGap}" y1="${dimMidY + unitDy * halfGap}" x2="${dimX2}" y2="${dimY2}" stroke="${COLORS.dim}" stroke-width="1.5"/>`
  
  // Tick marks at ends
  svg += `<line x1="${dimX1 - Math.cos(tick1Angle) * tickSize}" y1="${dimY1 - Math.sin(tick1Angle) * tickSize}" 
                x2="${dimX1 + Math.cos(tick1Angle) * tickSize}" y2="${dimY1 + Math.sin(tick1Angle) * tickSize}" 
                stroke="${COLORS.dim}" stroke-width="1.5"/>`
  svg += `<line x1="${dimX2 - Math.cos(tick2Angle) * tickSize}" y1="${dimY2 - Math.sin(tick2Angle) * tickSize}" 
                x2="${dimX2 + Math.cos(tick2Angle) * tickSize}" y2="${dimY2 + Math.sin(tick2Angle) * tickSize}" 
                stroke="${COLORS.dim}" stroke-width="1.5"/>`
  
  // Label (white background for readability)
  svg += `<text x="${labelX}" y="${labelY}" class="dim" text-anchor="middle" dominant-baseline="middle" transform="rotate(${textAngle} ${labelX} ${labelY})">${m.label}</text>`
  
  return svg
}

/**
 * Render a radius dimension with a leader line from center to arc
 */
function renderRadiusDimension(
  m: Measurement,
  edge: Edge,
  scale: number,
  offsetX: number,
  offsetY: number
): string {
  const centerX = offsetX + edge.center!.x * scale
  const centerY = offsetY - edge.center!.y * scale
  const r = edge.radius! * scale
  
  // Draw from center toward the arc middle
  const midAngle = (edge.startAngle! + edge.endAngle!) / 2
  const arcX = centerX + r * Math.cos(midAngle)
  const arcY = centerY - r * Math.sin(midAngle)  // Flip Y
  
  // Label position (middle of radius line)
  const labelX = (centerX + arcX) / 2
  const labelY = (centerY + arcY) / 2
  
  let svg = ''
  
  // Radius line
  svg += `<line x1="${centerX}" y1="${centerY}" x2="${arcX}" y2="${arcY}" stroke="${COLORS.dim}" stroke-width="1.5" stroke-dasharray="4,2"/>`
  
  // Small circle at center
  svg += `<circle cx="${centerX}" cy="${centerY}" r="2" fill="${COLORS.dim}"/>`
  
  // Label
  svg += `<text x="${labelX}" y="${labelY}" class="dim-small" text-anchor="middle" dominant-baseline="middle">${m.label}</text>`
  
  return svg
}

function renderMeasurement(
  m: Measurement,
  edge: Edge | undefined,
  allEdges: Map<string, Edge>,
  scale: number,
  offsetX: number,
  offsetY: number
): string {
  if (!edge) {
    // Fallback: just render text at position
    const x = offsetX + m.position.x * scale
    const y = offsetY - m.position.y * scale
    return `<text x="${x}" y="${y}" class="dim" text-anchor="middle" dominant-baseline="middle">${m.label}</text>`
  }
  
  if (m.type === 'radius' && edge.type === 'arc') {
    return renderRadiusDimension(m, edge, scale, offsetX, offsetY)
  }
  
  if (edge.type === 'line') {
    return renderDimensionLine(m, edge, allEdges, scale, offsetX, offsetY)
  }
  
  // Fallback
  const x = offsetX + m.position.x * scale
  const y = offsetY - m.position.y * scale
  return `<text x="${x}" y="${y}" class="dim" text-anchor="middle" dominant-baseline="middle">${m.label}</text>`
}

/** Reserved for future right-angle markers */
function _renderRightAngle(p: Point, angle1: number, angle2: number, scale: number, offsetX: number, offsetY: number): string {
  const x = offsetX + p.x * scale
  const y = offsetY - p.y * scale
  const size = 8
  
  const rad1 = angle1 * Math.PI / 180
  const rad2 = angle2 * Math.PI / 180
  
  const p1x = x + size * Math.cos(rad1)
  const p1y = y - size * Math.sin(rad1)
  const p2x = x + size * Math.cos(rad1) + size * Math.cos(rad2)
  const p2y = y - size * Math.sin(rad1) - size * Math.sin(rad2)
  const p3x = x + size * Math.cos(rad2)
  const p3y = y - size * Math.sin(rad2)
  
  return `<path d="M ${p1x} ${p1y} L ${p2x} ${p2y} L ${p3x} ${p3y}" fill="none" stroke="${COLORS.rightAngle}" stroke-width="1.5"/>`
}

function renderFigure(figure: CompositeFigure, _id: string): string {
  // Calculate bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  
  for (const edge of figure.edges.values()) {
    for (const p of [edge.p1, edge.p2]) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    }
    if (edge.center) {
      const r = edge.radius!
      minX = Math.min(minX, edge.center.x - r)
      maxX = Math.max(maxX, edge.center.x + r)
      minY = Math.min(minY, edge.center.y - r)
      maxY = Math.max(maxY, edge.center.y + r)
    }
  }
  
  const figW = maxX - minX
  const figH = maxY - minY
  const svgW = figW * SCALE + 2 * PADDING
  const svgH = figH * SCALE + 2 * PADDING
  
  const offsetX = PADDING - minX * SCALE
  const offsetY = svgH - PADDING + minY * SCALE
  
  // Build filled shape path from visible edges
  const visibleEdges = Array.from(figure.edges.values()).filter(e => e.visible)
  
  // For now, render edges individually and use fill from bounding rect
  // (A proper implementation would trace the outline)
  
  let content = ''
  
  // Simple approach: render a filled polygon/path for each original shape
  // Then render visible edges on top
  for (const shape of figure.shapes) {
    const shapeEdges = shape.edges.map(eid => figure.edges.get(eid)!).filter(e => e)
    
    if (shapeEdges.length === 0) continue
    
    // Build path for this shape
    let pathD = ''
    let currentPoint: Point | null = null
    
    for (const edge of shapeEdges) {
      const x1 = offsetX + edge.p1.x * SCALE
      const y1 = offsetY - edge.p1.y * SCALE
      const x2 = offsetX + edge.p2.x * SCALE
      const y2 = offsetY - edge.p2.y * SCALE
      
      if (!currentPoint) {
        pathD += `M ${x1} ${y1}`
        currentPoint = edge.p1
      }
      
      if (edge.type === 'line') {
        pathD += ` L ${x2} ${y2}`
      } else {
        const r = edge.radius! * SCALE
        const largeArc = Math.abs(edge.endAngle! - edge.startAngle!) > Math.PI ? 1 : 0
        // Must match renderEdge sweep direction
        const sweep = edge.clockwise ? 1 : 0
        pathD += ` A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}`
      }
      currentPoint = edge.p2
    }
    
    pathD += ' Z'
    content += `<path d="${pathD}" fill="${COLORS.fill}" stroke="none"/>`
  }
  
  // Render visible edges
  for (const edge of visibleEdges) {
    content += renderEdge(edge, SCALE, offsetX, offsetY)
  }
  
  // Render measurements with proper dimension lines
  for (const m of figure.measurements) {
    const edge = m.edgeId ? figure.edges.get(m.edgeId) : undefined
    content += renderMeasurement(m, edge, figure.edges, SCALE, offsetX, offsetY)
  }
  
  return `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg">
<style>
  .dim { font: 600 12px Inter, system-ui, sans-serif; fill: ${COLORS.dim}; }
  .dim-small { font: 500 10px Inter, system-ui, sans-serif; fill: ${COLORS.dim}; }
</style>
${content}
</svg>`
}

// ════════════════════════════════════════════════════════════════
// RANDOM SHAPE CREATION
// ════════════════════════════════════════════════════════════════

// Pythagorean triples scaled to various sizes
// Each triple is [leg1, leg2, hypotenuse]
const PYTHAGOREAN_TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [6, 8, 10],    // 2 × (3,4,5)
  [9, 12, 15],   // 3 × (3,4,5)
  [12, 16, 20],  // 4 × (3,4,5)
  [15, 20, 25],  // 5 × (3,4,5)
  [10, 24, 26],  // 2 × (5,12,13)
]

function randomShape(rng: SeededRandom, sizeHint: number): { shape: Shape; edges: Edge[] } {
  const type = rng.pick<ShapeType>(['rect', 'right-triangle', 'semicircle', 'quarter-circle'])
  
  switch (type) {
    case 'rect': {
      const w = rng.intStep(Math.round(sizeHint * 0.5), Math.round(sizeHint * 1.5), 5)
      const h = rng.intStep(Math.round(sizeHint * 0.5), Math.round(sizeHint * 1.5), 5)
      return createRect(w, h)
    }
    case 'right-triangle': {
      // Use Pythagorean triples for clean integer math
      // This ensures Pythagorean theorem derivations work correctly
      const triple = rng.pick(PYTHAGOREAN_TRIPLES)
      
      // Optionally scale the triple to match size hint
      const avgLeg = (triple[0] + triple[1]) / 2
      const scale = Math.max(1, Math.round(sizeHint / avgLeg / 2))
      const base = triple[0] * scale
      const height = triple[1] * scale
      
      return createRightTriangle(base, height)
    }
    case 'semicircle': {
      const r = rng.intStep(Math.round(sizeHint * 0.3), Math.round(sizeHint * 0.8), 5)
      return createSemicircle(r)
    }
    case 'quarter-circle': {
      const r = rng.intStep(Math.round(sizeHint * 0.3), Math.round(sizeHint * 0.8), 5)
      return createQuarterCircle(r)
    }
  }
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
    
    resetCounters()
    
    // Number of iterations based on difficulty
    const iterations = difficulty === 'let' ? 1 : difficulty === 'middel' ? 2 : 3
    const sizeHint = 20  // Base size for shapes
    
    // Create base shape
    const { shape: baseShape, edges: baseEdges } = randomShape(rng, sizeHint)
    const figure = initFigure(baseShape, baseEdges)
    
    // Attach additional shapes
    for (let i = 0; i < iterations; i++) {
      const { shape: newShape, edges: newEdges } = randomShape(rng, sizeHint * 0.8)
      
      // Try to attach - may fail if no compatible edges
      attachShape(figure, newShape, newEdges, rng)
    }
    
    // Use the new graph-based measurement system
    // This automatically finds the minimum set of measurements and tracks derivation depth
    const measurementResult = applyGraphMeasurements(figure, difficulty, true)
    
    // Round the area
    const area = Math.round(figure.totalArea * 10) / 10
    
    // Render SVG
    const svg = renderFigure(figure, `fig_${rng.int(1000, 9999)}`)
    
    return {
      type: this.taskType,
      title: 'Areal af sammensat figur',
      intro: `Beregn arealet af figuren. Alle mål er i cm. Brug $\\pi = ${PI}$.`,
      figure: { type: 'svg', content: svg } as SvgFigure,
      questions: [
        { 
          text: 'Hvad er arealet?', 
          answer: String(area), 
          answer_type: 'number', 
          accept_alternatives: [`${area} cm²`, `${Math.round(area)} cm²`] 
        },
      ],
      variables: { 
        difficulty,
        shapeCount: figure.shapes.length,
        measurementCount: measurementResult.measurementCount,
        derivationDepth: measurementResult.derivationDepth,
        area,
      },
    }
  }
}

// Export for testing
export type { CompositeFigure, Shape, Edge, Measurement, KnowledgeBase, MeasurementSelectionResult }
export { 
  createRect, 
  createRightTriangle, 
  createSemicircle, 
  createQuarterCircle,
  initFigure,
  attachShape,
  addMeasurements,
  pruneRedundantMeasurements,
  validateSolvability,
  solveFigure,
  ensureSolvable,
  minimizeMeasurements,
  renderFigure,
  canDerive,
  PI,
  COLORS,
  // New graph-based system
  addMeasurementsWithGraph,
  applyGraphMeasurements,
}
