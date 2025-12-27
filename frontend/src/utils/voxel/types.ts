/**
 * Voxel Figure Types
 * 
 * Core data structures for defining 3D cube-based figures (like centicubes).
 * Designed for easy generation by LLMs.
 * 
 * Coordinate System:
 * - X: right (→)
 * - Y: up (↑)
 * - Z: towards viewer (coming out of screen)
 * 
 * Example usage:
 * ```typescript
 * // Define an L-shaped figure
 * const lShape: VoxelFigure = {
 *   id: 'l_shape_1',
 *   name: 'L-figur',
 *   cubes: [
 *     [0, 0, 0], [1, 0, 0], [2, 0, 0],  // bottom row
 *     [0, 1, 0],                         // vertical part
 *   ],
 * }
 * ```
 */

/** A single cube position in 3D space [x, y, z] */
export type CubePosition = [x: number, y: number, z: number]

/** A complete voxel figure definition */
export interface VoxelFigure {
  /** Unique identifier for this figure */
  id: string
  
  /** Human-readable name (e.g., "L-figur", "Trappe") */
  name: string
  
  /** Array of cube positions that make up the figure */
  cubes: CubePosition[]
  
  /** Optional description of the figure */
  description?: string
  
  /** Tags for categorization (e.g., "simple", "complex", "symmetric") */
  tags?: string[]
}

/** Render options for SVG generation */
export interface VoxelRenderOptions {
  /** Size of each cube in pixels (default: 20) */
  cubeSize?: number
  
  /** Stroke color for cube edges (default: '#1e293b') */
  strokeColor?: string
  
  /** Stroke width for edges (default: 1.5) */
  strokeWidth?: number
  
  /** Colors for the three visible faces of cubes */
  faceColors?: {
    top?: string      // default: '#60a5fa' (blue-400)
    left?: string     // default: '#3b82f6' (blue-500)
    right?: string    // default: '#2563eb' (blue-600)
  }
  
  /** Background color (default: transparent) */
  backgroundColor?: string
  
  /** Padding around the figure in pixels (default: 10) */
  padding?: number
  
  /** Show grid lines on projections (default: true) */
  showGrid?: boolean
  
  /** Grid/projection fill color (default: '#60a5fa') */
  projectionFillColor?: string
  
  /** Grid line color (default: '#334155') */
  gridColor?: string
}

/** 2D projection type */
export type ProjectionType = 'top' | 'front' | 'side'

/** Result of generating a 2D projection */
export interface ProjectionResult {
  /** The projection type */
  type: ProjectionType
  
  /** Human-readable label (e.g., "Fra oven", "Forfra", "Fra siden") */
  label: string
  
  /** The SVG string */
  svg: string
  
  /** Width of the SVG in pixels */
  width: number
  
  /** Height of the SVG in pixels */
  height: number
  
  /** 2D grid representation (for debugging/comparison) */
  grid: boolean[][]
}

/** Complete rendered figure with all views */
export interface RenderedFigure {
  /** The source figure */
  figure: VoxelFigure
  
  /** Isometric 3D view */
  isometric: {
    svg: string
    width: number
    height: number
  }
  
  /** 2D projections */
  projections: {
    top: ProjectionResult
    front: ProjectionResult
    side: ProjectionResult
  }
}

/** Task configuration for projection matching */
export interface ProjectionTaskConfig {
  /** The correct figure (the one that matches the projections) */
  correctFigure: VoxelFigure
  
  /** Distractor figures (incorrect options) */
  distractors: VoxelFigure[]
  
  /** Which projections to show */
  showProjections: ProjectionType[]
  
  /** Shuffle order of options */
  shuffleOptions?: boolean
}

/** A generated projection matching task */
export interface ProjectionTask {
  /** The projections shown to the student */
  projections: ProjectionResult[]
  
  /** All figure options (including correct answer) */
  options: Array<{
    label: string  // e.g., "A", "B", "C", "D"
    figure: VoxelFigure
    svg: string    // isometric view SVG
    isCorrect: boolean
  }>
  
  /** The correct answer label */
  correctAnswer: string
}

