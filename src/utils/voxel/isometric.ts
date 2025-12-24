/**
 * Isometric SVG Renderer for Voxel Figures
 * 
 * Renders a 3D cube-based figure in isometric projection.
 * Uses standard isometric angles (30° from horizontal).
 */

import type { VoxelFigure, VoxelRenderOptions, CubePosition } from './types'

/** Default render options */
const DEFAULT_OPTIONS: Required<VoxelRenderOptions> = {
  cubeSize: 20,
  strokeColor: '#1e293b',
  strokeWidth: 1.5,
  faceColors: {
    top: '#60a5fa',    // blue-400
    left: '#3b82f6',   // blue-500
    right: '#2563eb',  // blue-600
  },
  backgroundColor: 'transparent',
  padding: 10,
  showGrid: true,
  projectionFillColor: '#60a5fa',
  gridColor: '#334155',
}

/** Isometric projection constants */
const ISO = {
  // cos(30°) and sin(30°) for isometric projection
  COS_30: Math.cos(Math.PI / 6),  // ≈ 0.866
  SIN_30: Math.sin(Math.PI / 6),  // = 0.5
}

/**
 * Convert 3D coordinates to 2D isometric screen coordinates
 * 
 * @param x - X position (right)
 * @param y - Y position (up)
 * @param z - Z position (towards viewer)
 * @param cubeSize - Size of each cube in pixels
 * @returns Screen coordinates [screenX, screenY]
 */
export function toIsometric(
  x: number,
  y: number,
  z: number,
  cubeSize: number
): [number, number] {
  // Isometric projection formula:
  // screenX = (x - z) * cos(30°) * cubeSize
  // screenY = -y * cubeSize + (x + z) * sin(30°) * cubeSize
  const screenX = (x - z) * ISO.COS_30 * cubeSize
  const screenY = -y * cubeSize + (x + z) * ISO.SIN_30 * cubeSize
  
  return [screenX, screenY]
}

/**
 * Calculate the bounding box of a voxel figure in isometric projection
 */
function calculateBounds(
  cubes: CubePosition[],
  cubeSize: number
): { minX: number; maxX: number; minY: number; maxY: number } {
  if (cubes.length === 0) {
    return { minX: 0, maxX: cubeSize, minY: 0, maxY: cubeSize }
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  // Check all 8 corners of each cube
  for (const [x, y, z] of cubes) {
    for (let dx = 0; dx <= 1; dx++) {
      for (let dy = 0; dy <= 1; dy++) {
        for (let dz = 0; dz <= 1; dz++) {
          const [sx, sy] = toIsometric(x + dx, y + dy, z + dz, cubeSize)
          minX = Math.min(minX, sx)
          maxX = Math.max(maxX, sx)
          minY = Math.min(minY, sy)
          maxY = Math.max(maxY, sy)
        }
      }
    }
  }

  return { minX, maxX, minY, maxY }
}

/**
 * Generate SVG path for a single isometric cube face
 */
function cubeFacePath(
  corners: [number, number][],
  offsetX: number,
  offsetY: number
): string {
  const points = corners
    .map(([x, y]) => `${(x + offsetX).toFixed(1)},${(y + offsetY).toFixed(1)}`)
    .join(' ')
  return `M ${points} Z`
}

/**
 * Check if a cube position exists in the figure
 */
function hasCubeAt(cubes: CubePosition[], x: number, y: number, z: number): boolean {
  return cubes.some(([cx, cy, cz]) => cx === x && cy === y && cz === z)
}

/**
 * Generate the SVG for a single cube at position [x, y, z]
 * Only draws faces that are visible (not occluded by other cubes)
 */
function generateCubeSVG(
  x: number,
  y: number,
  z: number,
  cubes: CubePosition[],
  options: Required<VoxelRenderOptions>,
  offsetX: number,
  offsetY: number
): string {
  const { cubeSize, strokeColor, strokeWidth, faceColors } = options
  const paths: string[] = []

  // Calculate all 8 corners of the cube
  const corners = {
    // Bottom face corners
    b_front_left: toIsometric(x, y, z + 1, cubeSize),
    b_front_right: toIsometric(x + 1, y, z + 1, cubeSize),
    b_back_left: toIsometric(x, y, z, cubeSize),
    b_back_right: toIsometric(x + 1, y, z, cubeSize),
    // Top face corners
    t_front_left: toIsometric(x, y + 1, z + 1, cubeSize),
    t_front_right: toIsometric(x + 1, y + 1, z + 1, cubeSize),
    t_back_left: toIsometric(x, y + 1, z, cubeSize),
    t_back_right: toIsometric(x + 1, y + 1, z, cubeSize),
  }

  // Top face (visible if no cube above)
  if (!hasCubeAt(cubes, x, y + 1, z)) {
    const topPath = cubeFacePath([
      corners.t_back_left,
      corners.t_back_right,
      corners.t_front_right,
      corners.t_front_left,
    ], offsetX, offsetY)
    paths.push(`<path d="${topPath}" fill="${faceColors.top}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`)
  }

  // Left face (visible if no cube to the left/front in Z)
  if (!hasCubeAt(cubes, x, y, z + 1)) {
    const leftPath = cubeFacePath([
      corners.b_front_left,
      corners.t_front_left,
      corners.t_front_right,
      corners.b_front_right,
    ], offsetX, offsetY)
    paths.push(`<path d="${leftPath}" fill="${faceColors.left}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`)
  }

  // Right face (visible if no cube to the right in X)
  if (!hasCubeAt(cubes, x + 1, y, z)) {
    const rightPath = cubeFacePath([
      corners.b_front_right,
      corners.t_front_right,
      corners.t_back_right,
      corners.b_back_right,
    ], offsetX, offsetY)
    paths.push(`<path d="${rightPath}" fill="${faceColors.right}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`)
  }

  return paths.join('\n  ')
}

/**
 * Sort cubes for correct rendering order (painter's algorithm)
 * Cubes further from viewer should be drawn first
 */
function sortCubesForRendering(cubes: CubePosition[]): CubePosition[] {
  return [...cubes].sort((a, b) => {
    // Sort by: y (bottom first), then z (back first), then x (left first)
    if (a[1] !== b[1]) return a[1] - b[1]  // y ascending (bottom to top)
    if (a[2] !== b[2]) return a[2] - b[2]  // z ascending (back to front)
    return a[0] - b[0]                      // x ascending (left to right)
  })
}

/**
 * Generate complete isometric SVG for a voxel figure
 * 
 * @param figure - The voxel figure to render
 * @param options - Render options
 * @returns SVG string and dimensions
 */
export function renderIsometric(
  figure: VoxelFigure,
  options: VoxelRenderOptions = {}
): { svg: string; width: number; height: number } {
  const opts: Required<VoxelRenderOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
    faceColors: { ...DEFAULT_OPTIONS.faceColors, ...options.faceColors },
  }

  const { cubeSize, padding, backgroundColor } = opts
  // strokeColor and strokeWidth are available in opts but rendered via faceColors

  // Calculate bounds
  const bounds = calculateBounds(figure.cubes, cubeSize)
  const width = Math.ceil(bounds.maxX - bounds.minX + padding * 2)
  const height = Math.ceil(bounds.maxY - bounds.minY + padding * 2)

  // Offset to center the figure
  const offsetX = padding - bounds.minX
  const offsetY = padding - bounds.minY

  // Sort cubes for correct rendering order
  const sortedCubes = sortCubesForRendering(figure.cubes)

  // Generate cube paths
  const cubePaths = sortedCubes
    .map(([x, y, z]) => generateCubeSVG(x, y, z, figure.cubes, opts, offsetX, offsetY))
    .join('\n  ')

  // Build SVG
  const bgRect = backgroundColor !== 'transparent'
    ? `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`
    : ''

  const svg = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  ${bgRect}
  <!-- Isometric view of ${figure.name || figure.id} -->
  ${cubePaths}
</svg>`

  return { svg, width, height }
}

/**
 * Quick helper to render just the isometric SVG string
 */
export function isometricSVG(
  figure: VoxelFigure,
  options?: VoxelRenderOptions
): string {
  return renderIsometric(figure, options).svg
}

