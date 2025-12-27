/**
 * Predefined Voxel Figures & Generation Helpers
 * 
 * This module contains:
 * 1. A library of predefined figures (L-shapes, T-shapes, stairs, etc.)
 * 2. Helper functions for creating new figures
 * 3. Random generation utilities for creating task variations
 * 
 * ═══════════════════════════════════════════════════════════════
 * 🤖 LLM GENERATION GUIDE
 * ═══════════════════════════════════════════════════════════════
 * 
 * To add a new figure, use this pattern:
 * 
 * ```typescript
 * export const MY_FIGURE: VoxelFigure = {
 *   id: 'my_figure',           // unique snake_case id
 *   name: 'Min Figur',         // Danish display name
 *   description: 'En figur...', // Optional description
 *   tags: ['simple'],          // Optional tags for filtering
 *   cubes: [
 *     // Each cube is [x, y, z] where:
 *     // x = right, y = up, z = towards viewer
 *     [0, 0, 0], [1, 0, 0],    // bottom layer
 *     [0, 1, 0],               // second layer
 *   ],
 * }
 * ```
 * 
 * Quick tips:
 * - Build layer by layer (y=0 is bottom, y=1 is next up, etc.)
 * - Use the createFigure() helper for easier creation
 * - Test with renderComplete() to see all views
 * ═══════════════════════════════════════════════════════════════
 */

import type { VoxelFigure, CubePosition, RenderedFigure, ProjectionTask, ProjectionTaskConfig } from './types'
import { renderIsometric } from './isometric'
import { renderAllProjections, generateProjectionGrid, projectionsMatch } from './projections'
import type { VoxelRenderOptions, ProjectionType } from './types'

// ════════════════════════════════════════════════════════════════
// FIGURE CREATION HELPERS
// ════════════════════════════════════════════════════════════════

/**
 * Create a VoxelFigure from a simple layer-based definition
 * 
 * @example
 * const lShape = createFigure('l_shape', 'L-figur', [
 *   // Layer 0 (bottom) - strings where '#' = cube, '.' = empty
 *   [
 *     '##',
 *     '#.',
 *   ],
 *   // Layer 1 (top)
 *   [
 *     '#.',
 *     '..',
 *   ],
 * ])
 */
export function createFigure(
  id: string,
  name: string,
  layers: string[][],
  options?: { description?: string; tags?: string[] }
): VoxelFigure {
  const cubes: CubePosition[] = []

  for (let y = 0; y < layers.length; y++) {
    const layer = layers[y]
    for (let z = 0; z < layer.length; z++) {
      const row = layer[z]
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '#') {
          cubes.push([x, y, z])
        }
      }
    }
  }

  return {
    id,
    name,
    cubes,
    description: options?.description,
    tags: options?.tags,
  }
}

/**
 * Create a VoxelFigure directly from cube coordinates
 */
export function createFigureFromCubes(
  id: string,
  name: string,
  cubes: CubePosition[],
  options?: { description?: string; tags?: string[] }
): VoxelFigure {
  return {
    id,
    name,
    cubes: [...cubes],
    description: options?.description,
    tags: options?.tags,
  }
}

// ════════════════════════════════════════════════════════════════
// PREDEFINED FIGURES LIBRARY
// ════════════════════════════════════════════════════════════════

/** Simple L-shape (4 cubes) */
export const L_SHAPE: VoxelFigure = createFigure(
  'l_shape',
  'L-figur',
  [
    [
      '###',
      '#..',
    ],
  ],
  { tags: ['simple', 'classic'] }
)

/** L-shape with height (5 cubes) */
export const L_SHAPE_TALL: VoxelFigure = createFigure(
  'l_shape_tall',
  'Høj L-figur',
  [
    [
      '##',
      '#.',
    ],
    [
      '#.',
      '..',
    ],
  ],
  { tags: ['simple'] }
)

/** T-shape (5 cubes) */
export const T_SHAPE: VoxelFigure = createFigure(
  't_shape',
  'T-figur',
  [
    [
      '###',
      '.#.',
    ],
  ],
  { tags: ['simple', 'symmetric'] }
)

/** Stairs (3 steps) */
export const STAIRS_3: VoxelFigure = createFigure(
  'stairs_3',
  'Trappe (3 trin)',
  [
    ['#..'],
    ['##.'],
    ['###'],
  ],
  { tags: ['stairs', 'classic'] }
)

/** Stairs (2 steps) */
export const STAIRS_2: VoxelFigure = createFigure(
  'stairs_2',
  'Trappe (2 trin)',
  [
    ['#.'],
    ['##'],
  ],
  { tags: ['stairs', 'simple'] }
)

/** Tower (3 high) */
export const TOWER_3: VoxelFigure = createFigure(
  'tower_3',
  'Tårn (3 høj)',
  [
    ['#'],
    ['#'],
    ['#'],
  ],
  { tags: ['simple', 'symmetric'] }
)

/** Bridge shape */
export const BRIDGE: VoxelFigure = createFigure(
  'bridge',
  'Bro',
  [
    [
      '#.#',
    ],
    [
      '###',
    ],
  ],
  { tags: ['bridge', 'classic'] }
)

/** U-shape */
export const U_SHAPE: VoxelFigure = createFigure(
  'u_shape',
  'U-figur',
  [
    [
      '#.#',
      '###',
    ],
  ],
  { tags: ['simple'] }
)

/** Plus/Cross shape */
export const PLUS_SHAPE: VoxelFigure = createFigure(
  'plus_shape',
  'Plus-figur',
  [
    [
      '.#.',
      '###',
      '.#.',
    ],
  ],
  { tags: ['symmetric', 'classic'] }
)

/** Corner shape (3D L) */
export const CORNER_3D: VoxelFigure = createFigure(
  'corner_3d',
  '3D-hjørne',
  [
    [
      '##',
      '#.',
    ],
    [
      '#.',
      '..',
    ],
  ],
  { tags: ['3d'] }
)

/** S/Z-shape (tetris-like) */
export const S_SHAPE: VoxelFigure = createFigure(
  's_shape',
  'S-figur',
  [
    [
      '.##',
      '##.',
    ],
  ],
  { tags: ['tetris'] }
)

/** Z-shape */
export const Z_SHAPE: VoxelFigure = createFigure(
  'z_shape',
  'Z-figur',
  [
    [
      '##.',
      '.##',
    ],
  ],
  { tags: ['tetris'] }
)

/** I-shape (4 in a row) */
export const I_SHAPE: VoxelFigure = createFigure(
  'i_shape',
  'I-figur',
  [
    ['####'],
  ],
  { tags: ['tetris', 'symmetric'] }
)

/** Square (2x2) */
export const SQUARE_2X2: VoxelFigure = createFigure(
  'square_2x2',
  'Kvadrat (2×2)',
  [
    [
      '##',
      '##',
    ],
  ],
  { tags: ['symmetric', 'simple'] }
)

/** Cube (2x2x2) */
export const CUBE_2X2X2: VoxelFigure = createFigure(
  'cube_2x2x2',
  'Terning (2×2×2)',
  [
    [
      '##',
      '##',
    ],
    [
      '##',
      '##',
    ],
  ],
  { tags: ['symmetric', '3d'] }
)

/** Pyramid base (no top) */
export const PYRAMID_BASE: VoxelFigure = createFigure(
  'pyramid_base',
  'Pyramide-base',
  [
    [
      '###',
      '###',
      '###',
    ],
    [
      '.#.',
      '###',
      '.#.',
    ],
    [
      '...',
      '.#.',
      '...',
    ],
  ],
  { tags: ['complex', 'pyramid'] }
)

/** Hook shape (J-like) */
export const HOOK_SHAPE: VoxelFigure = createFigure(
  'hook_shape',
  'Krog-figur',
  [
    [
      '.#',
      '##',
    ],
    [
      '.#',
      '..',
    ],
  ],
  { tags: ['3d'] }
)

/** Diagonal stairs */
export const DIAGONAL_STAIRS: VoxelFigure = createFigure(
  'diagonal_stairs',
  'Diagonal trappe',
  [
    [
      '#..',
      '.#.',
      '..#',
    ],
  ],
  { tags: ['diagonal'] }
)

// ════════════════════════════════════════════════════════════════
// FIGURE COLLECTIONS (grouped for easy access)
// ════════════════════════════════════════════════════════════════

/** All predefined figures */
export const ALL_FIGURES: VoxelFigure[] = [
  L_SHAPE,
  L_SHAPE_TALL,
  T_SHAPE,
  STAIRS_3,
  STAIRS_2,
  TOWER_3,
  BRIDGE,
  U_SHAPE,
  PLUS_SHAPE,
  CORNER_3D,
  S_SHAPE,
  Z_SHAPE,
  I_SHAPE,
  SQUARE_2X2,
  CUBE_2X2X2,
  PYRAMID_BASE,
  HOOK_SHAPE,
  DIAGONAL_STAIRS,
]

/** Simple figures (good for easy tasks) */
export const SIMPLE_FIGURES = ALL_FIGURES.filter(f => f.tags?.includes('simple'))

/** 3D figures (require spatial reasoning) */
export const FIGURES_3D = ALL_FIGURES.filter(f => f.tags?.includes('3d'))

/** Symmetric figures */
export const SYMMETRIC_FIGURES = ALL_FIGURES.filter(f => f.tags?.includes('symmetric'))

// ════════════════════════════════════════════════════════════════
// FIGURE TRANSFORMATIONS
// ════════════════════════════════════════════════════════════════

/**
 * Rotate a figure 90° around the Y axis (looking from above)
 */
export function rotateY90(figure: VoxelFigure): VoxelFigure {
  const bounds = calculateBounds(figure.cubes)
  const maxZ = bounds.maxZ

  const rotatedCubes: CubePosition[] = figure.cubes.map(([x, y, z]) => {
    // Rotate 90° around Y: (x, y, z) -> (maxZ - z, y, x)
    return [maxZ - z, y, x]
  })

  return {
    ...figure,
    id: `${figure.id}_rot90`,
    cubes: normalizeCubes(rotatedCubes),
  }
}

/**
 * Mirror a figure along the X axis
 */
export function mirrorX(figure: VoxelFigure): VoxelFigure {
  const bounds = calculateBounds(figure.cubes)
  const maxX = bounds.maxX

  const mirroredCubes: CubePosition[] = figure.cubes.map(([x, y, z]) => {
    return [maxX - x, y, z]
  })

  return {
    ...figure,
    id: `${figure.id}_mirror_x`,
    cubes: normalizeCubes(mirroredCubes),
  }
}

/**
 * Mirror a figure along the Z axis
 */
export function mirrorZ(figure: VoxelFigure): VoxelFigure {
  const bounds = calculateBounds(figure.cubes)
  const maxZ = bounds.maxZ

  const mirroredCubes: CubePosition[] = figure.cubes.map(([x, y, z]) => {
    return [x, y, maxZ - z]
  })

  return {
    ...figure,
    id: `${figure.id}_mirror_z`,
    cubes: normalizeCubes(mirroredCubes),
  }
}

/**
 * Normalize cube positions so minimum x, y, z are all 0
 */
function normalizeCubes(cubes: CubePosition[]): CubePosition[] {
  const bounds = calculateBounds(cubes)
  return cubes.map(([x, y, z]) => [
    x - bounds.minX,
    y - bounds.minY,
    z - bounds.minZ,
  ])
}

function calculateBounds(cubes: CubePosition[]): {
  minX: number; maxX: number
  minY: number; maxY: number
  minZ: number; maxZ: number
} {
  if (cubes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 }
  }

  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  let minZ = Infinity, maxZ = -Infinity

  for (const [x, y, z] of cubes) {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }

  return { minX, maxX, minY, maxY, minZ, maxZ }
}

// ════════════════════════════════════════════════════════════════
// RENDERING HELPERS
// ════════════════════════════════════════════════════════════════

/**
 * Render a complete figure with isometric view and all projections
 */
export function renderComplete(
  figure: VoxelFigure,
  options?: VoxelRenderOptions
): RenderedFigure {
  const isometricResult = renderIsometric(figure, options)
  const projections = renderAllProjections(figure, options)

  return {
    figure,
    isometric: isometricResult,
    projections,
  }
}

// ════════════════════════════════════════════════════════════════
// TASK GENERATION
// ════════════════════════════════════════════════════════════════

/**
 * Generate a projection matching task
 * 
 * @param config - Task configuration with correct figure and distractors
 * @param options - Render options
 * @returns Complete task with projections and labeled options
 */
export function generateProjectionTask(
  config: ProjectionTaskConfig,
  options?: VoxelRenderOptions
): ProjectionTask {
  const { correctFigure, distractors, showProjections, shuffleOptions = true } = config

  // Render projections for the correct figure
  const allProjections = renderAllProjections(correctFigure, options)
  const projections = showProjections.map(type => allProjections[type])

  // Create options array
  let allFigures = [correctFigure, ...distractors]
  
  // Shuffle if requested
  if (shuffleOptions) {
    allFigures = shuffleArray(allFigures)
  }

  // Assign labels (A, B, C, D, ...)
  const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const optionsList = allFigures.map((figure, index) => {
    const { svg } = renderIsometric(figure, options)
    return {
      label: labels[index],
      figure,
      svg,
      isCorrect: figure.id === correctFigure.id,
    }
  })

  const correctAnswer = optionsList.find(opt => opt.isCorrect)!.label

  return {
    projections,
    options: optionsList,
    correctAnswer,
  }
}

/**
 * Shuffle an array (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Find figures that have different projections from a given figure
 * Useful for selecting good distractors
 */
export function findDistinctFigures(
  targetFigure: VoxelFigure,
  candidates: VoxelFigure[],
  count: number,
  projectionTypes: ProjectionType[] = ['top', 'front', 'side']
): VoxelFigure[] {
  // Get target projections
  const targetProjections = projectionTypes.map(type => 
    generateProjectionGrid(targetFigure.cubes, type).grid
  )

  // Filter candidates that have at least one different projection
  const distinctCandidates = candidates.filter(candidate => {
    if (candidate.id === targetFigure.id) return false
    
    const candidateProjections = projectionTypes.map(type =>
      generateProjectionGrid(candidate.cubes, type).grid
    )

    // Check if any projection is different
    return candidateProjections.some((grid, i) => 
      !projectionsMatch(grid, targetProjections[i])
    )
  })

  // Shuffle and take requested count
  return shuffleArray(distinctCandidates).slice(0, count)
}

/**
 * Generate a random task from the predefined figures
 */
export function generateRandomTask(
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  options?: VoxelRenderOptions
): ProjectionTask {
  let figurePool: VoxelFigure[]
  let numDistractors: number
  let projectionTypes: ProjectionType[]

  switch (difficulty) {
    case 'easy':
      figurePool = SIMPLE_FIGURES.length > 0 ? SIMPLE_FIGURES : ALL_FIGURES.slice(0, 6)
      numDistractors = 2
      projectionTypes = ['front', 'side']
      break
    case 'hard':
      figurePool = [...ALL_FIGURES, ...ALL_FIGURES.map(rotateY90)]
      numDistractors = 4
      projectionTypes = ['top', 'front', 'side']
      break
    case 'medium':
    default:
      figurePool = ALL_FIGURES
      numDistractors = 3
      projectionTypes = ['top', 'front', 'side']
  }

  // Pick a random correct figure
  const correctFigure = figurePool[Math.floor(Math.random() * figurePool.length)]

  // Find distinct distractors
  const distractors = findDistinctFigures(correctFigure, figurePool, numDistractors, projectionTypes)

  return generateProjectionTask({
    correctFigure,
    distractors,
    showProjections: projectionTypes,
    shuffleOptions: true,
  }, options)
}

