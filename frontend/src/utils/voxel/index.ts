/**
 * Voxel Figure Generation System
 * 
 * A modular system for creating and rendering 3D voxel (cube-based) figures
 * with isometric views and 2D projections. Designed for geometry tasks
 * involving spatial reasoning.
 * 
 * ═══════════════════════════════════════════════════════════════
 * QUICK START
 * ═══════════════════════════════════════════════════════════════
 * 
 * ```typescript
 * import { 
 *   L_SHAPE, 
 *   renderComplete, 
 *   generateRandomTask,
 *   createFigure 
 * } from './utils/voxel'
 * 
 * // 1. Render a predefined figure
 * const rendered = renderComplete(L_SHAPE)
 * console.log(rendered.isometric.svg)      // 3D isometric view
 * console.log(rendered.projections.top.svg) // Top projection
 * 
 * // 2. Generate a random task
 * const task = generateRandomTask('medium')
 * // task.projections  - the 2D views to show
 * // task.options      - the 3D figures (A, B, C, D)
 * // task.correctAnswer - "B" (or similar)
 * 
 * // 3. Create a custom figure
 * const myFigure = createFigure('my_shape', 'Min Figur', [
 *   ['##', '#.'],  // bottom layer
 *   ['#.', '..'],  // top layer
 * ])
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════
 * EXPORTS
 * ═══════════════════════════════════════════════════════════════
 */

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export type {
  CubePosition,
  VoxelFigure,
  VoxelRenderOptions,
  ProjectionType,
  ProjectionResult,
  RenderedFigure,
  ProjectionTaskConfig,
  ProjectionTask,
} from './types'

// ────────────────────────────────────────────────────────────────
// Isometric Rendering
// ────────────────────────────────────────────────────────────────

export {
  toIsometric,
  renderIsometric,
  isometricSVG,
} from './isometric'

// ────────────────────────────────────────────────────────────────
// 2D Projections
// ────────────────────────────────────────────────────────────────

export {
  generateProjectionGrid,
  renderProjection,
  renderAllProjections,
  projectionsMatch,
  figureMatchesProjections,
} from './projections'

// ────────────────────────────────────────────────────────────────
// Figure Creation & Helpers
// ────────────────────────────────────────────────────────────────

export {
  createFigure,
  createFigureFromCubes,
  renderComplete,
} from './figures'

// ────────────────────────────────────────────────────────────────
// Transformations
// ────────────────────────────────────────────────────────────────

export {
  rotateY90,
  mirrorX,
  mirrorZ,
} from './figures'

// ────────────────────────────────────────────────────────────────
// Task Generation (predefined figures)
// ────────────────────────────────────────────────────────────────

export {
  generateProjectionTask,
  findDistinctFigures,
  generateRandomTask,
} from './figures'

// ────────────────────────────────────────────────────────────────
// Procedural Generation
// ────────────────────────────────────────────────────────────────

export {
  generateRandomFigure,
  generateFigureWithCount,
  generateDistractors,
  generateTask as generateProceduralTask,
  DIFFICULTY_CONFIG,
  type GeneratorConfig,
  type DistractorConfig,
  type GeneratedTask,
} from './generator'

// ────────────────────────────────────────────────────────────────
// Predefined Figures
// ────────────────────────────────────────────────────────────────

export {
  // Individual figures
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
  
  // Collections
  ALL_FIGURES,
  SIMPLE_FIGURES,
  FIGURES_3D,
  SYMMETRIC_FIGURES,
} from './figures'

