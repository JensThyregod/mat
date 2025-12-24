/**
 * Procedural Voxel Figure Generator
 * 
 * Generates random 3D voxel figures with:
 * - Configurable cube count
 * - Guaranteed orthogonal connectivity (no diagonal-only connections)
 * - Similar-looking distractors that differ in at least one projection
 */

import type { VoxelFigure, CubePosition, ProjectionType } from './types'
import { generateProjectionGrid, projectionsMatch } from './projections'

// ════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════

export interface GeneratorConfig {
  /** Number of cubes in the figure */
  cubeCount: number
  
  /** Maximum extent in any dimension (default: 4) */
  maxExtent?: number
  
  /** Seed for reproducible generation (optional) */
  seed?: number
}

export interface DistractorConfig {
  /** The correct figure to create distractors for */
  correctFigure: VoxelFigure
  
  /** Number of distractors to generate */
  count: number
  
  /** How similar should distractors be (0-1, higher = more similar) */
  similarity?: number
  
  /** Maximum attempts per distractor */
  maxAttempts?: number
}

/** Difficulty presets */
export const DIFFICULTY_CONFIG = {
  easy: { cubeCount: 4, maxExtent: 3 },
  medium: { cubeCount: 7, maxExtent: 4 },
  hard: { cubeCount: 10, maxExtent: 4 },
} as const

// ════════════════════════════════════════════════════════════════
// RANDOM UTILITIES
// ════════════════════════════════════════════════════════════════

/** Simple seeded random number generator */
class SeededRandom {
  private seed: number
  
  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 2147483647)
  }
  
  /** Get next random number [0, 1) */
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647
    return (this.seed - 1) / 2147483646
  }
  
  /** Get random integer [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
  
  /** Pick random element from array */
  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)]
  }
  
  /** Shuffle array in place */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }
}

// ════════════════════════════════════════════════════════════════
// CUBE UTILITIES
// ════════════════════════════════════════════════════════════════

/** 6 orthogonal directions (face neighbors) */
const DIRECTIONS: CubePosition[] = [
  [1, 0, 0],   // +X
  [-1, 0, 0],  // -X
  [0, 1, 0],   // +Y
  [0, -1, 0],  // -Y
  [0, 0, 1],   // +Z
  [0, 0, -1],  // -Z
]

/** Convert cube position to string key */
function cubeKey(pos: CubePosition): string {
  return `${pos[0]},${pos[1]},${pos[2]}`
}

/** Check if a cube exists at position */
function hasCubeAt(cubes: Set<string>, pos: CubePosition): boolean {
  return cubes.has(cubeKey(pos))
}

/** Get all orthogonal neighbors of a position */
function getNeighbors(pos: CubePosition): CubePosition[] {
  return DIRECTIONS.map(([dx, dy, dz]) => [
    pos[0] + dx,
    pos[1] + dy,
    pos[2] + dz,
  ] as CubePosition)
}

/** Check if position is within bounds */
function inBounds(pos: CubePosition, maxExtent: number): boolean {
  return pos[0] >= 0 && pos[0] < maxExtent &&
         pos[1] >= 0 && pos[1] < maxExtent &&
         pos[2] >= 0 && pos[2] < maxExtent
}

/** Normalize cubes so minimum coordinates are 0 */
function normalizeCubes(cubes: CubePosition[]): CubePosition[] {
  if (cubes.length === 0) return []
  
  const minX = Math.min(...cubes.map(c => c[0]))
  const minY = Math.min(...cubes.map(c => c[1]))
  const minZ = Math.min(...cubes.map(c => c[2]))
  
  return cubes.map(([x, y, z]) => [x - minX, y - minY, z - minZ])
}

/** Check if all cubes are orthogonally connected */
function isConnected(cubes: CubePosition[]): boolean {
  if (cubes.length <= 1) return true
  
  const cubeSet = new Set(cubes.map(cubeKey))
  const visited = new Set<string>()
  const queue: CubePosition[] = [cubes[0]]
  visited.add(cubeKey(cubes[0]))
  
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const neighbor of getNeighbors(current)) {
      const key = cubeKey(neighbor)
      if (cubeSet.has(key) && !visited.has(key)) {
        visited.add(key)
        queue.push(neighbor)
      }
    }
  }
  
  return visited.size === cubes.length
}

// ════════════════════════════════════════════════════════════════
// FIGURE GENERATION
// ════════════════════════════════════════════════════════════════

/**
 * Generate a random connected voxel figure
 * 
 * Algorithm: Start with one cube, then randomly grow by adding
 * cubes that share a face with existing cubes.
 */
export function generateRandomFigure(config: GeneratorConfig): VoxelFigure {
  const { cubeCount, maxExtent = 4, seed } = config
  const rng = new SeededRandom(seed)
  
  const cubeSet = new Set<string>()
  const cubes: CubePosition[] = []
  
  // Start with a cube near the center-bottom
  const startPos: CubePosition = [
    rng.int(1, maxExtent - 2),
    0,  // Start at bottom
    rng.int(1, maxExtent - 2),
  ]
  cubes.push(startPos)
  cubeSet.add(cubeKey(startPos))
  
  // Grow the figure by adding connected cubes
  let attempts = 0
  const maxAttempts = cubeCount * 100
  
  while (cubes.length < cubeCount && attempts < maxAttempts) {
    attempts++
    
    // Pick a random existing cube
    const baseCube = rng.pick(cubes)
    
    // Get valid neighbor positions
    const neighbors = getNeighbors(baseCube).filter(pos => 
      inBounds(pos, maxExtent) && !hasCubeAt(cubeSet, pos)
    )
    
    if (neighbors.length === 0) continue
    
    // Prefer growing horizontally/up, less down
    const weightedNeighbors = neighbors.flatMap(pos => {
      const dy = pos[1] - baseCube[1]
      if (dy > 0) return [pos, pos, pos]  // 3x weight for going up
      if (dy === 0) return [pos, pos]      // 2x weight for horizontal
      return [pos]                          // 1x weight for going down
    })
    
    const newPos = rng.pick(weightedNeighbors)
    cubes.push(newPos)
    cubeSet.add(cubeKey(newPos))
  }
  
  // Normalize positions
  const normalized = normalizeCubes(cubes)
  
  return {
    id: `gen_${Date.now()}_${rng.int(1000, 9999)}`,
    name: `Figur (${cubes.length} klodser)`,
    cubes: normalized,
    tags: ['generated'],
  }
}

/**
 * Generate a figure with a specific cube count, retrying if needed
 */
export function generateFigureWithCount(
  cubeCount: number,
  maxExtent: number = 4,
  maxRetries: number = 10
): VoxelFigure {
  for (let i = 0; i < maxRetries; i++) {
    const figure = generateRandomFigure({ cubeCount, maxExtent })
    if (figure.cubes.length === cubeCount && isConnected(figure.cubes)) {
      return figure
    }
  }
  
  // Fallback: return whatever we got
  return generateRandomFigure({ cubeCount, maxExtent })
}

// ════════════════════════════════════════════════════════════════
// DISTRACTOR GENERATION
// ════════════════════════════════════════════════════════════════

/**
 * Check if two figures have identical projections
 */
function hasIdenticalProjections(
  figure1: VoxelFigure,
  figure2: VoxelFigure,
  types: ProjectionType[] = ['top', 'front', 'side']
): boolean {
  for (const type of types) {
    const grid1 = generateProjectionGrid(figure1.cubes, type).grid
    const grid2 = generateProjectionGrid(figure2.cubes, type).grid
    if (!projectionsMatch(grid1, grid2)) {
      return false
    }
  }
  return true
}

/**
 * Count how many projections match between two figures
 */
function countMatchingProjections(
  figure1: VoxelFigure,
  figure2: VoxelFigure
): number {
  const types: ProjectionType[] = ['top', 'front', 'side']
  let matches = 0
  
  for (const type of types) {
    const grid1 = generateProjectionGrid(figure1.cubes, type).grid
    const grid2 = generateProjectionGrid(figure2.cubes, type).grid
    if (projectionsMatch(grid1, grid2)) {
      matches++
    }
  }
  
  return matches
}

/**
 * Create a variation of a figure by moving one cube
 */
function createVariation(figure: VoxelFigure, rng: SeededRandom): VoxelFigure | null {
  if (figure.cubes.length < 2) return null
  
  const cubes = [...figure.cubes]
  
  // Try to find a cube we can move
  const shuffledIndices = rng.shuffle([...Array(cubes.length).keys()])
  
  for (const removeIdx of shuffledIndices) {
    const toRemove = cubes[removeIdx]
    
    // Check if removing this cube keeps the figure connected
    const remaining = cubes.filter((_, i) => i !== removeIdx)
    if (!isConnected(remaining)) continue
    
    // Find valid new positions (must be adjacent to remaining cubes)
    const remainingSet = new Set(remaining.map(cubeKey))
    const validPositions: CubePosition[] = []
    
    for (const cube of remaining) {
      for (const neighbor of getNeighbors(cube)) {
        if (!remainingSet.has(cubeKey(neighbor)) && 
            neighbor[0] >= 0 && neighbor[1] >= 0 && neighbor[2] >= 0 &&
            neighbor[0] < 5 && neighbor[1] < 5 && neighbor[2] < 5) {
          // Don't put it back where it was
          if (cubeKey(neighbor) !== cubeKey(toRemove)) {
            validPositions.push(neighbor)
          }
        }
      }
    }
    
    if (validPositions.length > 0) {
      const newPos = rng.pick(validPositions)
      const newCubes = [...remaining, newPos]
      
      return {
        ...figure,
        id: `${figure.id}_var`,
        cubes: normalizeCubes(newCubes),
      }
    }
  }
  
  return null
}

/**
 * Generate distractors that look similar but have different projections
 */
export function generateDistractors(config: DistractorConfig): VoxelFigure[] {
  const { correctFigure, count, maxAttempts = 100 } = config
  const rng = new SeededRandom()
  
  const distractors: VoxelFigure[] = []
  const cubeCount = correctFigure.cubes.length
  let attempts = 0
  
  while (distractors.length < count && attempts < maxAttempts * count) {
    attempts++
    
    let candidate: VoxelFigure | null = null
    
    // Strategy 1: Modify the correct figure (more similar)
    if (rng.next() < 0.6) {
      candidate = createVariation(correctFigure, rng)
      
      // Try multiple variations for more difference
      if (candidate && rng.next() < 0.3) {
        const second = createVariation(candidate, rng)
        if (second) candidate = second
      }
    }
    
    // Strategy 2: Generate a completely new figure with same cube count
    if (!candidate) {
      candidate = generateFigureWithCount(cubeCount, 4, 3)
    }
    
    if (!candidate) continue
    
    // Check that projections are different
    if (hasIdenticalProjections(correctFigure, candidate)) {
      continue
    }
    
    // Check it's not identical to existing distractors
    const isDuplicate = distractors.some(d => 
      hasIdenticalProjections(d, candidate!)
    )
    if (isDuplicate) continue
    
    // Prefer distractors that share some projections (trickier!)
    const matchCount = countMatchingProjections(correctFigure, candidate)
    
    // Accept distractors that share 0-2 projections (not all 3)
    if (matchCount < 3) {
      candidate.id = `distractor_${distractors.length + 1}`
      candidate.name = `Figur (${candidate.cubes.length} klodser)`
      distractors.push(candidate)
    }
  }
  
  return distractors
}

// ════════════════════════════════════════════════════════════════
// COMPLETE TASK GENERATION
// ════════════════════════════════════════════════════════════════

export interface GeneratedTask {
  correctFigure: VoxelFigure
  distractors: VoxelFigure[]
}

/**
 * Generate a complete task with correct figure and distractors
 */
export function generateTask(
  difficulty: 'easy' | 'medium' | 'hard'
): GeneratedTask {
  const config = DIFFICULTY_CONFIG[difficulty]
  
  // Generate the correct figure
  const correctFigure = generateFigureWithCount(config.cubeCount, config.maxExtent)
  correctFigure.id = 'correct'
  correctFigure.name = `Figur (${correctFigure.cubes.length} klodser)`
  
  // Determine number of distractors
  const distractorCount = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4
  
  // Generate distractors
  const distractors = generateDistractors({
    correctFigure,
    count: distractorCount,
    maxAttempts: 50,
  })
  
  return { correctFigure, distractors }
}

