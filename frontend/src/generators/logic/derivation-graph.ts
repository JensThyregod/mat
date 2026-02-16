/**
 * Derivation Graph System for Composite Figures
 * 
 * This module models the relationships between measurable quantities in a
 * composite figure. It enables:
 * 
 * 1. Finding the MINIMUM set of measurements needed to solve a figure
 * 2. Tracking DERIVATION DEPTH (steps required) for difficulty calculation
 * 3. Explicit geometric relationships (radius↔diameter, parallel sides, etc.)
 * 
 * The graph is directed: an edge from A to B means "knowing A lets you derive B"
 */

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

/**
 * A measurable quantity in the figure
 */
export interface Quantity {
  id: string
  type: 'length' | 'radius' | 'diameter' | 'area'
  value: number
  
  // Reference back to the figure
  edgeId?: string   // For edge-based quantities
  shapeId?: string  // For shape-based quantities (area)
  
  // Is this quantity directly visible/measurable by the student?
  // (e.g., visible edges can be measured, seams cannot)
  measurable: boolean
}

/**
 * A derivation relationship between quantities
 */
export interface Derivation {
  id: string
  
  // The quantities needed to derive the target
  sources: string[]  // quantity IDs
  
  // The quantity that can be derived
  target: string     // quantity ID
  
  // Number of "mental steps" this derivation requires
  // Used for difficulty calculation
  steps: number
  
  // Human-readable explanation
  reason: string
}

/**
 * The complete derivation graph
 */
export interface DerivationGraph {
  // All quantities in the figure
  quantities: Map<string, Quantity>
  
  // All derivation relationships
  derivations: Derivation[]
  
  // Target quantities (what we need to compute - typically areas)
  targets: Set<string>
}

/**
 * Result of solving the derivation problem
 */
export interface DerivationSolution {
  // Can the targets be reached from the sources?
  solvable: boolean
  
  // Minimum set of quantities that must be given as measurements
  requiredSources: Set<string>
  
  // Maximum derivation depth (longest path from any source to any target)
  maxDepth: number
  
  // The derivation path for each target
  derivationPaths: Map<string, DerivationPath>
}

export interface DerivationPath {
  targetId: string
  steps: DerivationStep[]
  totalSteps: number
}

export interface DerivationStep {
  derivationId: string
  sourceQuantities: string[]
  derivedQuantity: string
  reason: string
  stepCount: number
}

// ════════════════════════════════════════════════════════════════
// GRAPH CONSTRUCTION
// ════════════════════════════════════════════════════════════════

/**
 * Create an empty derivation graph
 */
export function createGraph(): DerivationGraph {
  return {
    quantities: new Map(),
    derivations: [],
    targets: new Set(),
  }
}

/**
 * Add a quantity to the graph
 */
export function addQuantity(
  graph: DerivationGraph,
  quantity: Quantity
): void {
  graph.quantities.set(quantity.id, quantity)
}

/**
 * Add a derivation rule to the graph
 */
export function addDerivation(
  graph: DerivationGraph,
  derivation: Omit<Derivation, 'id'>
): void {
  const id = `d${graph.derivations.length + 1}`
  graph.derivations.push({ ...derivation, id })
}

/**
 * Mark a quantity as a target (must be computable)
 */
export function addTarget(graph: DerivationGraph, quantityId: string): void {
  graph.targets.add(quantityId)
}

// ════════════════════════════════════════════════════════════════
// STANDARD DERIVATION RULES
// ════════════════════════════════════════════════════════════════

/**
 * Add the radius ↔ diameter derivation rules
 * 
 * - radius → diameter (d = 2r) - 1 step
 * - diameter → radius (r = d/2) - 1 step
 */
export function addRadiusDiameterRules(
  graph: DerivationGraph,
  radiusId: string,
  diameterId: string
): void {
  addDerivation(graph, {
    sources: [radiusId],
    target: diameterId,
    steps: 1,
    reason: 'diameter = 2 × radius',
  })
  
  addDerivation(graph, {
    sources: [diameterId],
    target: radiusId,
    steps: 1,
    reason: 'radius = diameter ÷ 2',
  })
}

/**
 * Add the "parallel sides are equal" rule for rectangles
 * 
 * In a rectangle, opposite sides have the same length.
 * If you know one side, you know its parallel counterpart (0 steps - immediate).
 */
export function addParallelSideRules(
  graph: DerivationGraph,
  edge1Id: string,
  edge2Id: string
): void {
  // These are effectively the same quantity - 0 steps to derive
  addDerivation(graph, {
    sources: [edge1Id],
    target: edge2Id,
    steps: 0,
    reason: 'opposite sides of rectangle are equal',
  })
  
  addDerivation(graph, {
    sources: [edge2Id],
    target: edge1Id,
    steps: 0,
    reason: 'opposite sides of rectangle are equal',
  })
}

/**
 * Add rules for quarter-circle geometry
 * 
 * - radius = each straight edge length
 * - Either straight edge → radius (0 steps)
 * - radius → both straight edges (0 steps)
 */
export function addQuarterCircleRules(
  graph: DerivationGraph,
  radiusId: string,
  edge1Id: string,
  edge2Id: string
): void {
  // Straight edges equal radius
  addDerivation(graph, {
    sources: [edge1Id],
    target: radiusId,
    steps: 0,
    reason: 'straight edge of quarter-circle equals radius',
  })
  
  addDerivation(graph, {
    sources: [edge2Id],
    target: radiusId,
    steps: 0,
    reason: 'straight edge of quarter-circle equals radius',
  })
  
  addDerivation(graph, {
    sources: [radiusId],
    target: edge1Id,
    steps: 0,
    reason: 'radius equals straight edge of quarter-circle',
  })
  
  addDerivation(graph, {
    sources: [radiusId],
    target: edge2Id,
    steps: 0,
    reason: 'radius equals straight edge of quarter-circle',
  })
  
  // The two straight edges are equal (they're both the radius)
  addDerivation(graph, {
    sources: [edge1Id],
    target: edge2Id,
    steps: 0,
    reason: 'both straight edges of quarter-circle are equal (both = radius)',
  })
  
  addDerivation(graph, {
    sources: [edge2Id],
    target: edge1Id,
    steps: 0,
    reason: 'both straight edges of quarter-circle are equal (both = radius)',
  })
}

/**
 * Add rules for semicircle geometry
 * 
 * - diameter = flat edge length
 * - radius = diameter / 2
 */
export function addSemicircleRules(
  graph: DerivationGraph,
  radiusId: string,
  flatEdgeId: string
): void {
  // The flat edge IS the diameter, so flat edge → radius is just dividing by 2
  addDerivation(graph, {
    sources: [flatEdgeId],
    target: radiusId,
    steps: 1,
    reason: 'radius = flat edge (diameter) ÷ 2',
  })
  
  // radius → flat edge (diameter) = 2 × radius
  addDerivation(graph, {
    sources: [radiusId],
    target: flatEdgeId,
    steps: 1,
    reason: 'flat edge (diameter) = 2 × radius',
  })
}

/**
 * Add rules for seam edges (shared between shapes)
 * 
 * When two shapes share an edge (seam), if you know the length from
 * one shape's geometry, you know it for the other shape too.
 * This requires the student to recognize the geometric relationship.
 */
export function addSeamRule(
  graph: DerivationGraph,
  edge1Id: string,
  edge2Id: string,
  shape1Type: string,
  shape2Type: string
): void {
  // Seams require recognizing that shapes share an edge
  // This is a 1-step derivation (geometric reasoning)
  addDerivation(graph, {
    sources: [edge1Id],
    target: edge2Id,
    steps: 1,
    reason: `${shape1Type} and ${shape2Type} share this edge`,
  })
  
  addDerivation(graph, {
    sources: [edge2Id],
    target: edge1Id,
    steps: 1,
    reason: `${shape2Type} and ${shape1Type} share this edge`,
  })
}

/**
 * Add rules for collinear edges (edges that form a larger line)
 * 
 * If edge A and edge B are collinear and together form edge C:
 * - A + B = C (1 step)
 * - C - A = B (1 step)
 * - C - B = A (1 step)
 */
export function addCollinearRules(
  graph: DerivationGraph,
  edgeAId: string,
  edgeBId: string,
  edgeCId: string
): void {
  // A + B = C
  addDerivation(graph, {
    sources: [edgeAId, edgeBId],
    target: edgeCId,
    steps: 1,
    reason: 'sum of collinear edges',
  })
  
  // C - A = B
  addDerivation(graph, {
    sources: [edgeCId, edgeAId],
    target: edgeBId,
    steps: 1,
    reason: 'difference of collinear edges',
  })
  
  // C - B = A
  addDerivation(graph, {
    sources: [edgeCId, edgeBId],
    target: edgeAId,
    steps: 1,
    reason: 'difference of collinear edges',
  })
}

/**
 * Add rules for aligned edges (edges with same x or y coordinates)
 * 
 * If two edges have the same x-coordinates for their endpoints,
 * their lengths can be related through y-coordinate differences.
 */
export function addAlignedEdgeRules(
  graph: DerivationGraph,
  edge1Id: string,
  edge2Id: string,
  alignmentType: 'horizontal' | 'vertical'
): void {
  // If edges are perfectly aligned (same length), they derive each other
  addDerivation(graph, {
    sources: [edge1Id],
    target: edge2Id,
    steps: 0,
    reason: `${alignmentType}ly aligned edges have equal lengths`,
  })
  
  addDerivation(graph, {
    sources: [edge2Id],
    target: edge1Id,
    steps: 0,
    reason: `${alignmentType}ly aligned edges have equal lengths`,
  })
}

/**
 * Add Pythagorean theorem rules for a right triangle
 * 
 * In a right triangle with legs a, b and hypotenuse c:
 * - a² + b² = c²
 * - Therefore: c = √(a² + b²), a = √(c² - b²), b = √(c² - a²)
 * 
 * This means knowing any two sides lets you derive the third.
 * This is a 1-step derivation (applying Pythagorean theorem).
 */
export function addPythagoreanRules(
  graph: DerivationGraph,
  leg1Id: string,
  leg2Id: string,
  hypotenuseId: string
): void {
  // Two legs → hypotenuse
  addDerivation(graph, {
    sources: [leg1Id, leg2Id],
    target: hypotenuseId,
    steps: 1,
    reason: 'Pythagorean theorem: c = √(a² + b²)',
  })
  
  // Hypotenuse + one leg → other leg
  addDerivation(graph, {
    sources: [hypotenuseId, leg2Id],
    target: leg1Id,
    steps: 1,
    reason: 'Pythagorean theorem: a = √(c² - b²)',
  })
  
  addDerivation(graph, {
    sources: [hypotenuseId, leg1Id],
    target: leg2Id,
    steps: 1,
    reason: 'Pythagorean theorem: b = √(c² - a²)',
  })
}

// ════════════════════════════════════════════════════════════════
// AREA DERIVATION RULES
// ════════════════════════════════════════════════════════════════

/**
 * Add rule for rectangle area
 * 
 * Area = width × height (1 step - multiplication)
 */
export function addRectangleAreaRule(
  graph: DerivationGraph,
  areaId: string,
  widthId: string,
  heightId: string
): void {
  addDerivation(graph, {
    sources: [widthId, heightId],
    target: areaId,
    steps: 1,
    reason: 'rectangle area = width × height',
  })
}

/**
 * Add rule for right triangle area
 * 
 * Area = (base × height) / 2 (1 step)
 */
export function addTriangleAreaRule(
  graph: DerivationGraph,
  areaId: string,
  baseId: string,
  heightId: string
): void {
  addDerivation(graph, {
    sources: [baseId, heightId],
    target: areaId,
    steps: 1,
    reason: 'triangle area = (base × height) ÷ 2',
  })
}

/**
 * Add rule for semicircle area
 * 
 * Area = (π × r²) / 2 (1 step)
 */
export function addSemicircleAreaRule(
  graph: DerivationGraph,
  areaId: string,
  radiusId: string
): void {
  addDerivation(graph, {
    sources: [radiusId],
    target: areaId,
    steps: 1,
    reason: 'semicircle area = (π × r²) ÷ 2',
  })
}

/**
 * Add rule for quarter-circle area
 * 
 * Area = (π × r²) / 4 (1 step)
 */
export function addQuarterCircleAreaRule(
  graph: DerivationGraph,
  areaId: string,
  radiusId: string
): void {
  addDerivation(graph, {
    sources: [radiusId],
    target: areaId,
    steps: 1,
    reason: 'quarter-circle area = (π × r²) ÷ 4',
  })
}

/**
 * Add rule for total area (sum of component areas)
 */
export function addTotalAreaRule(
  graph: DerivationGraph,
  totalAreaId: string,
  componentAreaIds: string[]
): void {
  addDerivation(graph, {
    sources: componentAreaIds,
    target: totalAreaId,
    steps: 1,
    reason: 'total area = sum of component areas',
  })
}

// ════════════════════════════════════════════════════════════════
// GRAPH SOLVING
// ════════════════════════════════════════════════════════════════

/**
 * Find which quantities can be derived from a given set of known quantities
 * 
 * Uses iterative forward propagation until no new quantities can be derived.
 * Returns the set of all derivable quantities and the derivation steps used.
 */
export function propagate(
  graph: DerivationGraph,
  knownIds: Set<string>
): { derived: Set<string>; stepsUsed: DerivationStep[] } {
  const derived = new Set(knownIds)
  const stepsUsed: DerivationStep[] = []
  let changed = true
  
  while (changed) {
    changed = false
    
    for (const derivation of graph.derivations) {
      // Skip if we already know the target
      if (derived.has(derivation.target)) continue
      
      // Check if all sources are known
      const allSourcesKnown = derivation.sources.every(s => derived.has(s))
      
      if (allSourcesKnown) {
        derived.add(derivation.target)
        stepsUsed.push({
          derivationId: derivation.id,
          sourceQuantities: derivation.sources,
          derivedQuantity: derivation.target,
          reason: derivation.reason,
          stepCount: derivation.steps,
        })
        changed = true
      }
    }
  }
  
  return { derived, stepsUsed }
}

/**
 * Check if all targets can be reached from the given sources
 */
export function canReachTargets(
  graph: DerivationGraph,
  sourceIds: Set<string>
): boolean {
  const { derived } = propagate(graph, sourceIds)
  
  for (const target of graph.targets) {
    if (!derived.has(target)) return false
  }
  
  return true
}

/**
 * Calculate the maximum derivation depth from sources to targets
 * 
 * This represents the longest chain of derivation steps needed.
 */
export function calculateDerivationDepth(
  graph: DerivationGraph,
  sourceIds: Set<string>
): number {
  // BFS-like approach: track depth at which each quantity is derived
  const depth = new Map<string, number>()
  
  // Sources have depth 0
  for (const id of sourceIds) {
    depth.set(id, 0)
  }
  
  let changed = true
  
  while (changed) {
    changed = false
    
    for (const derivation of graph.derivations) {
      // Skip if we already know the target's depth
      if (depth.has(derivation.target)) continue
      
      // Check if all sources have known depths
      const sourceDepths = derivation.sources.map(s => depth.get(s))
      if (sourceDepths.some(d => d === undefined)) continue
      
      // New depth = max source depth + derivation steps
      const maxSourceDepth = Math.max(...(sourceDepths as number[]))
      const newDepth = maxSourceDepth + derivation.steps
      
      depth.set(derivation.target, newDepth)
      changed = true
    }
  }
  
  // Find max depth among targets
  let maxDepth = 0
  for (const target of graph.targets) {
    const d = depth.get(target)
    if (d !== undefined && d > maxDepth) {
      maxDepth = d
    }
  }
  
  return maxDepth
}

/**
 * Find the minimum set of measurable quantities that must be given
 * to allow all targets to be derived.
 * 
 * This is essentially a set cover problem. We use a greedy approach:
 * 1. Start with all targets
 * 2. Work backwards to find which sources are needed
 * 3. Prefer measurable quantities
 * 4. Minimize the total number of measurements
 */
export function findMinimumSources(
  graph: DerivationGraph
): Set<string> {
  const measurable = new Set<string>()
  for (const [id, q] of graph.quantities) {
    if (q.measurable) {
      measurable.add(id)
    }
  }
  
  // Greedy approach: try removing each measurable quantity and see if still solvable
  // Start with all measurable quantities as potential sources
  const sources = new Set(measurable)
  
  // First, find a valid starting set (may include non-essential ones)
  if (!canReachTargets(graph, sources)) {
    // Not all targets reachable even with all measurements - problem!
    console.warn('Cannot reach all targets even with all measurable quantities')
    return sources
  }
  
  // Now try to minimize by removing quantities one by one
  const candidates = Array.from(sources)
  
  for (const candidate of candidates) {
    const withoutCandidate = new Set(sources)
    withoutCandidate.delete(candidate)
    
    if (canReachTargets(graph, withoutCandidate)) {
      // Still solvable without this quantity - remove it
      sources.delete(candidate)
    }
  }
  
  return sources
}

/**
 * Find an optimal set of sources that achieves a target derivation depth
 * 
 * This allows generating problems of specific difficulty by controlling
 * how many derivation steps are required.
 * 
 * @param targetDepth The desired maximum derivation depth
 * @param minDepth Minimum acceptable depth (for "at least this hard")
 */
export function findSourcesForDepth(
  graph: DerivationGraph,
  targetDepth: number,
  minDepth: number = 0
): { sources: Set<string>; actualDepth: number } | null {
  const measurable = new Set<string>()
  for (const [id, q] of graph.quantities) {
    if (q.measurable) {
      measurable.add(id)
    }
  }
  
  // Start with minimum sources
  const minSources = findMinimumSources(graph)
  const minSourcesDepth = calculateDerivationDepth(graph, minSources)
  
  if (minSourcesDepth >= minDepth && minSourcesDepth <= targetDepth) {
    return { sources: minSources, actualDepth: minSourcesDepth }
  }
  
  // If we need more depth (fewer given measurements), 
  // this is a harder optimization problem.
  // For now, return the minimum sources.
  
  // If we need less depth (more given measurements),
  // add measurements that shortcut derivations
  if (minSourcesDepth > targetDepth) {
    const sources = new Set(minSources)
    let currentDepth = minSourcesDepth
    
    // Add intermediate quantities as "given" to reduce depth
    for (const [id, q] of graph.quantities) {
      if (q.measurable && !sources.has(id)) {
        sources.add(id)
        currentDepth = calculateDerivationDepth(graph, sources)
        
        if (currentDepth <= targetDepth) {
          break
        }
      }
    }
    
    return { sources, actualDepth: currentDepth }
  }
  
  return { sources: minSources, actualDepth: minSourcesDepth }
}

/**
 * Solve the derivation problem: find what measurements are needed
 * and trace the derivation paths
 */
export function solve(graph: DerivationGraph): DerivationSolution {
  const requiredSources = findMinimumSources(graph)
  const { derived, stepsUsed } = propagate(graph, requiredSources)
  
  // Check if all targets are reachable
  const solvable = Array.from(graph.targets).every(t => derived.has(t))
  
  // Calculate max depth
  const maxDepth = calculateDerivationDepth(graph, requiredSources)
  
  // Build derivation paths for each target
  const derivationPaths = new Map<string, DerivationPath>()
  
  for (const target of graph.targets) {
    // Find all steps that contribute to this target
    // (simplified: just include all steps used)
    const path: DerivationPath = {
      targetId: target,
      steps: stepsUsed.filter(s => {
        // Check if this step is on the path to this target
        // (simplified heuristic)
        return true
      }),
      totalSteps: stepsUsed.reduce((sum, s) => sum + s.stepCount, 0),
    }
    derivationPaths.set(target, path)
  }
  
  return {
    solvable,
    requiredSources,
    maxDepth,
    derivationPaths,
  }
}

// ════════════════════════════════════════════════════════════════
// DEBUGGING / LOGGING
// ════════════════════════════════════════════════════════════════

/**
 * Print the derivation graph for debugging
 */
export function logGraph(graph: DerivationGraph): void {
  console.group('📊 Derivation Graph')
  
  console.log('Quantities:')
  for (const [id, q] of graph.quantities) {
    const marker = q.measurable ? '📏' : '🔒'
    console.log(`  ${marker} ${id}: ${q.type}=${q.value}` + 
      (q.edgeId ? ` (edge ${q.edgeId})` : '') +
      (q.shapeId ? ` (shape ${q.shapeId})` : ''))
  }
  
  console.log('\nDerivations:')
  for (const d of graph.derivations) {
    console.log(`  ${d.id}: [${d.sources.join(', ')}] → ${d.target} (${d.steps} steps)`)
    console.log(`      "${d.reason}"`)
  }
  
  console.log('\nTargets:', Array.from(graph.targets).join(', '))
  
  console.groupEnd()
}

/**
 * Print the solution for debugging
 */
export function logSolution(solution: DerivationSolution, graph: DerivationGraph): void {
  console.group('🎯 Derivation Solution')
  
  console.log('Solvable:', solution.solvable)
  console.log('Max derivation depth:', solution.maxDepth)
  
  console.log('\nRequired measurements:')
  for (const id of solution.requiredSources) {
    const q = graph.quantities.get(id)
    if (q) {
      console.log(`  📏 ${id}: ${q.type}=${q.value}` + 
        (q.edgeId ? ` on edge ${q.edgeId}` : ''))
    }
  }
  
  console.log('\nDerivation paths:')
  for (const [targetId, path] of solution.derivationPaths) {
    console.log(`  Target ${targetId}: ${path.totalSteps} total steps`)
    for (const step of path.steps) {
      console.log(`    [${step.sourceQuantities.join(', ')}] → ${step.derivedQuantity}: "${step.reason}"`)
    }
  }
  
  console.groupEnd()
}

