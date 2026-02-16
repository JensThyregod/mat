/**
 * Figure Graph Builder
 * 
 * Builds a DerivationGraph from a CompositeFigure by:
 * 1. Creating quantity nodes for each edge (length/radius)
 * 2. Creating quantity nodes for each shape's area
 * 3. Detecting geometric relationships and adding derivation rules
 * 4. Setting up targets (the areas we want to compute)
 */

import type { CompositeFigure, Shape, Edge } from './sammensat-figur'
import {
  createGraph,
  addQuantity,
  addTarget,
  addDerivation,
  addRadiusDiameterRules,
  addParallelSideRules,
  addQuarterCircleRules,
  addSemicircleRules,
  addCollinearRules,
  addPythagoreanRules,
  addRectangleAreaRule,
  addTriangleAreaRule,
  addSemicircleAreaRule,
  addQuarterCircleAreaRule,
  addTotalAreaRule,
  type DerivationGraph,
  type Quantity,
} from './derivation-graph'

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

const EPSILON = 0.01  // Tolerance for floating point comparison

// ════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════

function edgeLength(edge: Edge): number {
  const dx = edge.p2.x - edge.p1.x
  const dy = edge.p2.y - edge.p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

function roundValue(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Check if two edges are parallel (same direction or opposite)
 */
function areParallel(e1: Edge, e2: Edge): boolean {
  if (e1.type !== 'line' || e2.type !== 'line') return false
  
  const dx1 = e1.p2.x - e1.p1.x
  const dy1 = e1.p2.y - e1.p1.y
  const dx2 = e2.p2.x - e2.p1.x
  const dy2 = e2.p2.y - e2.p1.y
  
  // Cross product should be ~0 for parallel lines
  const cross = dx1 * dy2 - dy1 * dx2
  return Math.abs(cross) < EPSILON * Math.max(edgeLength(e1), edgeLength(e2))
}

/**
 * Check if two edges have the same length
 */
function haveSameLength(e1: Edge, e2: Edge): boolean {
  const len1 = edgeLength(e1)
  const len2 = edgeLength(e2)
  return Math.abs(len1 - len2) < EPSILON
}


// ════════════════════════════════════════════════════════════════
// QUANTITY ID GENERATORS
// ════════════════════════════════════════════════════════════════

function edgeLengthId(edgeId: string): string {
  return `len_${edgeId}`
}

function edgeRadiusId(edgeId: string): string {
  return `rad_${edgeId}`
}

function shapeAreaId(shapeId: string): string {
  return `area_${shapeId}`
}

// ════════════════════════════════════════════════════════════════
// GRAPH BUILDING
// ════════════════════════════════════════════════════════════════

/**
 * Build a derivation graph from a composite figure
 */
export function buildGraphFromFigure(figure: CompositeFigure): DerivationGraph {
  const graph = createGraph()
  
  // Step 1: Create quantities for all edges
  createEdgeQuantities(graph, figure)
  
  // Step 2: Create area quantities for all shapes
  createAreaQuantities(graph, figure)
  
  // Step 3: Add shape-specific derivation rules
  addShapeRules(graph, figure)
  
  // Step 4: Detect and add cross-shape relationships (seams, aligned edges)
  addCrossShapeRules(graph, figure)
  
  // Step 5: Add area computation rules
  addAreaRules(graph, figure)
  
  // Step 6: Set up targets (the total area or individual areas)
  setupTargets(graph, figure)
  
  return graph
}

/**
 * Create quantity nodes for each edge
 */
function createEdgeQuantities(graph: DerivationGraph, figure: CompositeFigure): void {
  for (const [id, edge] of figure.edges) {
    if (edge.type === 'line') {
      const quantity: Quantity = {
        id: edgeLengthId(id),
        type: 'length',
        value: roundValue(edgeLength(edge)),
        edgeId: id,
        // Visible edges can be measured; seams cannot
        measurable: edge.visible,
      }
      addQuantity(graph, quantity)
    } else if (edge.type === 'arc') {
      // Arc has a radius
      const quantity: Quantity = {
        id: edgeRadiusId(id),
        type: 'radius',
        value: roundValue(edge.radius!),
        edgeId: id,
        // Arc radius can be measured if edge is visible
        measurable: edge.visible,
      }
      addQuantity(graph, quantity)
      
      // Also add a diameter quantity (2 × radius)
      const diameterQuantity: Quantity = {
        id: `dia_${id}`,
        type: 'diameter',
        value: roundValue(edge.radius! * 2),
        edgeId: id,
        // Diameter is derivable, not directly measurable
        measurable: false,
      }
      addQuantity(graph, diameterQuantity)
      
      // Add the radius ↔ diameter rule
      addRadiusDiameterRules(graph, edgeRadiusId(id), `dia_${id}`)
    }
  }
}

/**
 * Create area quantity nodes for each shape
 */
function createAreaQuantities(graph: DerivationGraph, figure: CompositeFigure): void {
  for (const shape of figure.shapes) {
    const quantity: Quantity = {
      id: shapeAreaId(shape.id),
      type: 'area',
      value: roundValue(shape.area),
      shapeId: shape.id,
      // Area is computed, not directly measurable
      measurable: false,
    }
    addQuantity(graph, quantity)
  }
  
  // Create total area quantity
  const totalAreaQuantity: Quantity = {
    id: 'total_area',
    type: 'area',
    value: roundValue(figure.totalArea),
    measurable: false,
  }
  addQuantity(graph, totalAreaQuantity)
}

/**
 * Add derivation rules based on each shape's geometry
 */
function addShapeRules(graph: DerivationGraph, figure: CompositeFigure): void {
  for (const shape of figure.shapes) {
    const shapeEdges = shape.edges.map(id => figure.edges.get(id)).filter((e): e is Edge => !!e)
    
    switch (shape.type) {
      case 'rect':
        addRectangleRules(graph, shapeEdges)
        break
      case 'right-triangle':
        addRightTriangleRules(graph, shapeEdges)
        break
      case 'semicircle':
        addSemicircleShapeRules(graph, shapeEdges)
        break
      case 'quarter-circle':
        addQuarterCircleShapeRules(graph, shapeEdges)
        break
    }
  }
}

/**
 * Check if two edges share any vertex (are adjacent)
 */
function edgesShareVertex(e1: Edge, e2: Edge): boolean {
  const points = [e1.p1, e1.p2, e2.p1, e2.p2]
  
  // Check if any point from e1 matches any point from e2
  for (const p1 of [e1.p1, e1.p2]) {
    for (const p2 of [e2.p1, e2.p2]) {
      if (Math.abs(p1.x - p2.x) < EPSILON && Math.abs(p1.y - p2.y) < EPSILON) {
        return true
      }
    }
  }
  return false
}

/**
 * Add rules for rectangle geometry
 * 
 * Opposite sides are equal - if you know one, you know the other.
 * 
 * IMPORTANT: We must identify which edges are actually OPPOSITE (don't share vertices),
 * not just same-length. For a square, all 4 edges have the same length, but only
 * pairs that don't share vertices are truly opposite and can derive each other.
 */
function addRectangleRules(graph: DerivationGraph, edges: Edge[]): void {
  const lineEdges = edges.filter(e => e.type === 'line')
  
  // Find pairs of opposite edges (edges that don't share any vertex)
  // In a rectangle, opposite edges have the same length AND don't share vertices
  for (let i = 0; i < lineEdges.length; i++) {
    for (let j = i + 1; j < lineEdges.length; j++) {
      const e1 = lineEdges[i]
      const e2 = lineEdges[j]
      
      // Check if they have the same length AND don't share any vertex (i.e., are opposite)
      const sameLength = Math.abs(edgeLength(e1) - edgeLength(e2)) < EPSILON
      const areOpposite = !edgesShareVertex(e1, e2)
      
      if (sameLength && areOpposite) {
        // These are truly opposite sides - knowing one gives you the other
        addParallelSideRules(
          graph,
          edgeLengthId(e1.id),
          edgeLengthId(e2.id)
        )
      }
    }
  }
}

/**
 * Identify legs and hypotenuse in a right triangle
 * 
 * The hypotenuse is the longest side.
 * Returns { legs: [edge, edge], hypotenuse: edge } or null if not enough edges.
 */
function identifyTriangleParts(edges: Edge[]): { 
  legs: [Edge, Edge]; 
  hypotenuse: Edge 
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

/**
 * Add rules for right triangle geometry
 * 
 * Pythagorean theorem: knowing any 2 sides lets you derive the 3rd
 */
function addRightTriangleRules(graph: DerivationGraph, edges: Edge[]): void {
  const parts = identifyTriangleParts(edges)
  if (!parts) return
  
  const leg1Id = edgeLengthId(parts.legs[0].id)
  const leg2Id = edgeLengthId(parts.legs[1].id)
  const hypotenuseId = edgeLengthId(parts.hypotenuse.id)
  
  // Add Pythagorean theorem derivation rules
  addPythagoreanRules(graph, leg1Id, leg2Id, hypotenuseId)
}

/**
 * Add rules for semicircle geometry
 * 
 * The flat edge = diameter = 2 × radius
 */
function addSemicircleShapeRules(graph: DerivationGraph, edges: Edge[]): void {
  const arc = edges.find(e => e.type === 'arc')
  const flatEdge = edges.find(e => e.type === 'line')
  
  if (!arc || !flatEdge) return
  
  // The flat edge length equals the diameter
  // flat edge → radius (1 step: divide by 2)
  // radius → flat edge (1 step: multiply by 2)
  addSemicircleRules(graph, edgeRadiusId(arc.id), edgeLengthId(flatEdge.id))
}

/**
 * Add rules for quarter-circle geometry
 * 
 * Both straight edges = radius
 */
function addQuarterCircleShapeRules(graph: DerivationGraph, edges: Edge[]): void {
  const arc = edges.find(e => e.type === 'arc')
  const straightEdges = edges.filter(e => e.type === 'line')
  
  if (!arc || straightEdges.length !== 2) return
  
  addQuarterCircleRules(
    graph,
    edgeRadiusId(arc.id),
    edgeLengthId(straightEdges[0].id),
    edgeLengthId(straightEdges[1].id)
  )
}

/**
 * Check if two edges are actually collinear (on the same infinite line)
 * and share at least one endpoint (forming a connected line segment)
 */
function areConnectedCollinear(e1: Edge, e2: Edge): boolean {
  if (e1.type !== 'line' || e2.type !== 'line') return false
  if (!areParallel(e1, e2)) return false
  
  // Check if they share an endpoint
  const shareEndpoint = 
    (Math.abs(e1.p1.x - e2.p1.x) < EPSILON && Math.abs(e1.p1.y - e2.p1.y) < EPSILON) ||
    (Math.abs(e1.p1.x - e2.p2.x) < EPSILON && Math.abs(e1.p1.y - e2.p2.y) < EPSILON) ||
    (Math.abs(e1.p2.x - e2.p1.x) < EPSILON && Math.abs(e1.p2.y - e2.p1.y) < EPSILON) ||
    (Math.abs(e1.p2.x - e2.p2.x) < EPSILON && Math.abs(e1.p2.y - e2.p2.y) < EPSILON)
  
  return shareEndpoint
}

/**
 * Check if two edges occupy the same physical space (same endpoints)
 */
function edgesOverlap(e1: Edge, e2: Edge): boolean {
  if (e1.type !== 'line' || e2.type !== 'line') return false
  if (e1.id === e2.id) return false // Same edge
  
  // Check if endpoints match (either direction)
  const match1 = 
    Math.abs(e1.p1.x - e2.p1.x) < EPSILON && Math.abs(e1.p1.y - e2.p1.y) < EPSILON &&
    Math.abs(e1.p2.x - e2.p2.x) < EPSILON && Math.abs(e1.p2.y - e2.p2.y) < EPSILON
  
  const match2 = 
    Math.abs(e1.p1.x - e2.p2.x) < EPSILON && Math.abs(e1.p1.y - e2.p2.y) < EPSILON &&
    Math.abs(e1.p2.x - e2.p1.x) < EPSILON && Math.abs(e1.p2.y - e2.p1.y) < EPSILON
  
  return match1 || match2
}

/**
 * Add cross-shape derivation rules
 * 
 * - Seams: When two shapes are attached, each shape has its own edge object
 *   for the seam. These are different edge IDs but represent the same physical
 *   edge. We need to add rules connecting them.
 * 
 * - Collinear edges: edges that share an endpoint and form a longer line
 *   (A + B = C relationships)
 * 
 * NOTE: We intentionally do NOT add "aligned edge" rules for edges that
 * happen to be at the same coordinate but aren't connected. Just because
 * two horizontal edges are at the same y-level doesn't mean a student
 * can derive one from the other - they're separate measurements!
 */
function addCrossShapeRules(graph: DerivationGraph, figure: CompositeFigure): void {
  const allEdges = Array.from(figure.edges.values())
  const lineEdges = allEdges.filter(e => e.type === 'line')
  
  // Find seam pairs: edges from different shapes that occupy the same physical space
  // When shapes are attached, both the target edge and attachment edge become seams,
  // but they're separate edge objects. We need to connect them.
  for (let i = 0; i < lineEdges.length; i++) {
    for (let j = i + 1; j < lineEdges.length; j++) {
      const e1 = lineEdges[i]
      const e2 = lineEdges[j]
      
      // Check if these two edges are overlapping seams
      if (!e1.visible && !e2.visible && edgesOverlap(e1, e2)) {
        // These edges are the same physical edge (seam) - add derivation rules
        // 0 steps because they're literally the same edge
        addDerivation(graph, {
          sources: [edgeLengthId(e1.id)],
          target: edgeLengthId(e2.id),
          steps: 0,
          reason: 'same edge (seam between shapes)',
        })
        addDerivation(graph, {
          sources: [edgeLengthId(e2.id)],
          target: edgeLengthId(e1.id),
          steps: 0,
          reason: 'same edge (seam between shapes)',
        })
      }
    }
  }
  
  // Find collinear edges that share endpoints (A + B = C)
  // Only consider edges that are actually connected
  for (let i = 0; i < lineEdges.length; i++) {
    for (let j = i + 1; j < lineEdges.length; j++) {
      // Check if these two edges are connected (share an endpoint)
      if (!areConnectedCollinear(lineEdges[i], lineEdges[j])) continue
      
      // They're connected collinear edges - find if there's a third edge
      // that spans both of them
      const combinedLength = roundValue(edgeLength(lineEdges[i]) + edgeLength(lineEdges[j]))
      
      for (let k = 0; k < lineEdges.length; k++) {
        if (k === i || k === j) continue
        
        const thirdLength = roundValue(edgeLength(lineEdges[k]))
        if (Math.abs(combinedLength - thirdLength) < EPSILON) {
          // Check if this third edge is actually the combined span
          if (areParallel(lineEdges[i], lineEdges[k])) {
            addCollinearRules(
              graph,
              edgeLengthId(lineEdges[i].id),
              edgeLengthId(lineEdges[j].id),
              edgeLengthId(lineEdges[k].id)
            )
          }
        }
      }
    }
  }
}

/**
 * Add area computation rules for each shape type
 */
function addAreaRules(graph: DerivationGraph, figure: CompositeFigure): void {
  for (const shape of figure.shapes) {
    const shapeEdges = shape.edges.map(id => figure.edges.get(id)).filter((e): e is Edge => !!e)
    const areaId = shapeAreaId(shape.id)
    
    switch (shape.type) {
      case 'rect': {
        // Find two PERPENDICULAR edges (not opposite) for width × height
        // Even for a square, we need to know TWO perpendicular sides -
        // you can't assume it's a square just by looking at it!
        const lineEdges = shapeEdges.filter(e => e.type === 'line')
        
        // Find two edges that are adjacent (share a vertex) = perpendicular
        let widthEdge: Edge | null = null
        let heightEdge: Edge | null = null
        
        for (let i = 0; i < lineEdges.length && !heightEdge; i++) {
          for (let j = i + 1; j < lineEdges.length; j++) {
            // Check if they share a vertex (are adjacent/perpendicular)
            if (edgesShareVertex(lineEdges[i], lineEdges[j])) {
              widthEdge = lineEdges[i]
              heightEdge = lineEdges[j]
              break
            }
          }
        }
        
        if (widthEdge && heightEdge) {
          addRectangleAreaRule(
            graph,
            areaId,
            edgeLengthId(widthEdge.id),
            edgeLengthId(heightEdge.id)
          )
        }
        break
      }
      
      case 'right-triangle': {
        // Need the two legs (not hypotenuse!) for area calculation
        const parts = identifyTriangleParts(shapeEdges)
        if (parts) {
          addTriangleAreaRule(
            graph,
            areaId,
            edgeLengthId(parts.legs[0].id),
            edgeLengthId(parts.legs[1].id)
          )
        }
        break
      }
      
      case 'semicircle': {
        const arc = shapeEdges.find(e => e.type === 'arc')
        if (arc) {
          addSemicircleAreaRule(graph, areaId, edgeRadiusId(arc.id))
        }
        break
      }
      
      case 'quarter-circle': {
        const arc = shapeEdges.find(e => e.type === 'arc')
        if (arc) {
          addQuarterCircleAreaRule(graph, areaId, edgeRadiusId(arc.id))
        }
        break
      }
    }
  }
  
  // Total area = sum of all shape areas
  const componentIds = figure.shapes.map(s => shapeAreaId(s.id))
  addTotalAreaRule(graph, 'total_area', componentIds)
}

/**
 * Set up the target quantities (what we want to compute)
 */
function setupTargets(graph: DerivationGraph, figure: CompositeFigure): void {
  // The main target is total area
  addTarget(graph, 'total_area')
  
  // But we might also want individual areas (for step-by-step solving)
  // Uncomment to require solving each shape:
  // for (const shape of figure.shapes) {
  //   addTarget(graph, shapeAreaId(shape.id))
  // }
}

// ════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════

export {
  edgeLengthId,
  edgeRadiusId,
  shapeAreaId,
}

