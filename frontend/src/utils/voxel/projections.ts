/**
 * 2D Projection Renderer for Voxel Figures
 * 
 * Generates top, front, and side view projections as SVG grids.
 * These are orthographic projections (no perspective).
 * 
 * Projection Axes:
 * - Top view:   X (horizontal), Z (vertical) - looking down the Y axis
 * - Front view: X (horizontal), Y (vertical) - looking along the Z axis
 * - Side view:  Z (horizontal), Y (vertical) - looking along the X axis
 */

import type { VoxelFigure, VoxelRenderOptions, ProjectionType, ProjectionResult, CubePosition } from './types'

/** Default render options */
const DEFAULT_OPTIONS: Required<VoxelRenderOptions> = {
  cubeSize: 20,
  strokeColor: '#1e293b',
  strokeWidth: 1.5,
  faceColors: {
    top: '#60a5fa',
    left: '#3b82f6',
    right: '#2563eb',
  },
  backgroundColor: 'transparent',
  padding: 10,
  showGrid: true,
  projectionFillColor: '#60a5fa',
  gridColor: '#334155',
}

/** Projection labels in Danish */
const PROJECTION_LABELS: Record<ProjectionType, string> = {
  top: 'Fra oven',
  front: 'Forfra',
  side: 'Fra siden',
}

/**
 * Calculate the bounding box of a voxel figure
 */
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

/**
 * Generate a 2D projection grid from a voxel figure
 * 
 * @param cubes - Array of cube positions
 * @param type - Which projection to generate
 * @returns 2D boolean grid where true = filled cell
 */
export function generateProjectionGrid(
  cubes: CubePosition[],
  type: ProjectionType
): { grid: boolean[][]; width: number; height: number } {
  const bounds = calculateBounds(cubes)
  
  let gridWidth: number
  let gridHeight: number
  let filled: Set<string>

  switch (type) {
    case 'top':
      // Looking down Y axis: X is horizontal, Z is vertical (inverted)
      gridWidth = bounds.maxX - bounds.minX + 1
      gridHeight = bounds.maxZ - bounds.minZ + 1
      filled = new Set(
        cubes.map(([x, , z]) => `${x - bounds.minX},${bounds.maxZ - z}`)
      )
      break
      
    case 'front':
      // Looking along Z axis: X is horizontal, Y is vertical (inverted for SVG)
      gridWidth = bounds.maxX - bounds.minX + 1
      gridHeight = bounds.maxY - bounds.minY + 1
      filled = new Set(
        cubes.map(([x, y]) => `${x - bounds.minX},${bounds.maxY - y}`)
      )
      break
      
    case 'side':
      // Looking along X axis: Z is horizontal, Y is vertical (inverted for SVG)
      gridWidth = bounds.maxZ - bounds.minZ + 1
      gridHeight = bounds.maxY - bounds.minY + 1
      filled = new Set(
        cubes.map(([, y, z]) => `${z - bounds.minZ},${bounds.maxY - y}`)
      )
      break
  }

  // Create 2D grid
  const grid: boolean[][] = []
  for (let row = 0; row < gridHeight; row++) {
    grid[row] = []
    for (let col = 0; col < gridWidth; col++) {
      grid[row][col] = filled.has(`${col},${row}`)
    }
  }

  return { grid, width: gridWidth, height: gridHeight }
}

/**
 * Generate SVG for a 2D projection grid
 */
function renderProjectionGrid(
  grid: boolean[][],
  gridWidth: number,
  gridHeight: number,
  options: Required<VoxelRenderOptions>
): { svg: string; width: number; height: number } {
  const { cubeSize, padding, strokeColor, strokeWidth, projectionFillColor, gridColor, showGrid, backgroundColor } = options

  const svgWidth = gridWidth * cubeSize + padding * 2
  const svgHeight = gridHeight * cubeSize + padding * 2

  const elements: string[] = []

  // Background
  if (backgroundColor !== 'transparent') {
    elements.push(`<rect width="${svgWidth}" height="${svgHeight}" fill="${backgroundColor}"/>`)
  }

  // Grid background (optional grid lines)
  if (showGrid) {
    // Vertical lines
    for (let i = 0; i <= gridWidth; i++) {
      const x = padding + i * cubeSize
      elements.push(`<line x1="${x}" y1="${padding}" x2="${x}" y2="${padding + gridHeight * cubeSize}" stroke="${gridColor}" stroke-width="0.5"/>`)
    }
    // Horizontal lines
    for (let i = 0; i <= gridHeight; i++) {
      const y = padding + i * cubeSize
      elements.push(`<line x1="${padding}" y1="${y}" x2="${padding + gridWidth * cubeSize}" y2="${y}" stroke="${gridColor}" stroke-width="0.5"/>`)
    }
  }

  // Filled cells
  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      if (grid[row][col]) {
        const x = padding + col * cubeSize
        const y = padding + row * cubeSize
        elements.push(
          `<rect x="${x}" y="${y}" width="${cubeSize}" height="${cubeSize}" fill="${projectionFillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`
        )
      }
    }
  }

  // Outer border
  elements.push(
    `<rect x="${padding}" y="${padding}" width="${gridWidth * cubeSize}" height="${gridHeight * cubeSize}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`
  )

  const svg = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  ${elements.join('\n  ')}
</svg>`

  return { svg, width: svgWidth, height: svgHeight }
}

/**
 * Render a single projection of a voxel figure
 */
export function renderProjection(
  figure: VoxelFigure,
  type: ProjectionType,
  options: VoxelRenderOptions = {}
): ProjectionResult {
  const opts: Required<VoxelRenderOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
    faceColors: { ...DEFAULT_OPTIONS.faceColors, ...options.faceColors },
  }

  const { grid, width: gridWidth, height: gridHeight } = generateProjectionGrid(figure.cubes, type)
  const { svg, width, height } = renderProjectionGrid(grid, gridWidth, gridHeight, opts)

  return {
    type,
    label: PROJECTION_LABELS[type],
    svg,
    width,
    height,
    grid,
  }
}

/**
 * Render all three projections of a voxel figure
 */
export function renderAllProjections(
  figure: VoxelFigure,
  options: VoxelRenderOptions = {}
): { top: ProjectionResult; front: ProjectionResult; side: ProjectionResult } {
  return {
    top: renderProjection(figure, 'top', options),
    front: renderProjection(figure, 'front', options),
    side: renderProjection(figure, 'side', options),
  }
}

/**
 * Compare two projection grids for equality
 * Useful for checking if two figures have the same projection
 */
export function projectionsMatch(
  grid1: boolean[][],
  grid2: boolean[][]
): boolean {
  if (grid1.length !== grid2.length) return false
  
  for (let row = 0; row < grid1.length; row++) {
    if (grid1[row].length !== grid2[row].length) return false
    for (let col = 0; col < grid1[row].length; col++) {
      if (grid1[row][col] !== grid2[row][col]) return false
    }
  }
  
  return true
}

/**
 * Check if a figure matches given projections
 * Returns true only if all provided projections match
 */
export function figureMatchesProjections(
  figure: VoxelFigure,
  projections: Partial<Record<ProjectionType, boolean[][]>>
): boolean {
  for (const [type, expectedGrid] of Object.entries(projections) as [ProjectionType, boolean[][]][]) {
    const { grid } = generateProjectionGrid(figure.cubes, type)
    if (!projectionsMatch(grid, expectedGrid)) {
      return false
    }
  }
  return true
}

