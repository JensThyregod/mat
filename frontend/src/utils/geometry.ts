/**
 * Geometry utilities for generating SVG figures from declarative descriptions.
 * Designed to work with auto-generated .tex files.
 */

export type TriangleAngle = {
  value: number | null  // null means "unknown" (to be calculated)
  label: string         // e.g., "A", "B", "C"
  highlight?: boolean   // highlight as the question mark
}

export type TriangleConfig = {
  angles: {
    A: TriangleAngle
    B: TriangleAngle
    C: TriangleAngle
  }
  width?: number
  height?: number
}

export type Point = { x: number; y: number }

export type TriangleData = {
  vertices: { A: Point; B: Point; C: Point }
  angles: { A: number; B: number; C: number }
  config: TriangleConfig
}

/**
 * Calculate triangle vertices from angles.
 * Places A at bottom-left, B at bottom-right, C at top.
 */
export function computeTriangle(config: TriangleConfig): TriangleData {
  const width = config.width ?? 260
  const height = config.height ?? 180
  const padding = 40

  // Get angle values, computing unknown angle if needed
  let angleA = config.angles.A.value
  let angleB = config.angles.B.value
  let angleC = config.angles.C.value

  // Calculate missing angle (sum must be 180°)
  if (angleA === null && angleB !== null && angleC !== null) {
    angleA = 180 - angleB - angleC
  } else if (angleB === null && angleA !== null && angleC !== null) {
    angleB = 180 - angleA - angleC
  } else if (angleC === null && angleA !== null && angleB !== null) {
    angleC = 180 - angleA - angleB
  } else if (angleA === null || angleB === null || angleC === null) {
    // Default to equilateral if too many unknowns
    angleA = angleA ?? 60
    angleB = angleB ?? 60
    angleC = angleC ?? 60
  }

  // Convert to radians
  const radA = (angleA * Math.PI) / 180
  const radB = (angleB * Math.PI) / 180

  // Calculate vertex positions
  // A at origin, B on the x-axis
  const base = width - 2 * padding

  // C is at intersection of lines from A and B at their respective angles
  // Line from A: y = x * tan(A)
  // Line from B: y = (base - x) * tan(B)
  const tanA = Math.tan(radA)
  const tanB = Math.tan(radB)

  const cx = (base * tanB) / (tanA + tanB)
  const cy = cx * tanA

  // Scale to fit in viewBox with padding
  const maxY = cy
  const scale = Math.min(1, (height - 2 * padding) / maxY)

  const vertices = {
    A: { x: padding, y: height - padding },
    B: { x: padding + base * scale, y: height - padding },
    C: { x: padding + cx * scale, y: height - padding - cy * scale },
  }

  return {
    vertices,
    angles: { A: angleA, B: angleB, C: angleC },
    config,
  }
}

/**
 * Generate angle arc path for SVG
 */
function generateAngleArc(
  vertex: Point,
  angle: number,
  startAngle: number,
  radius: number = 25
): string {
  const startRad = (startAngle * Math.PI) / 180
  const endRad = ((startAngle + angle) * Math.PI) / 180

  const startX = vertex.x + radius * Math.cos(startRad)
  const startY = vertex.y - radius * Math.sin(startRad) // SVG y is inverted
  const endX = vertex.x + radius * Math.cos(endRad)
  const endY = vertex.y - radius * Math.sin(endRad)

  const largeArc = angle > 180 ? 1 : 0
  const sweep = 0 // Counter-clockwise in SVG coords

  return `M ${startX.toFixed(1)},${startY.toFixed(1)} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${endX.toFixed(1)},${endY.toFixed(1)}`
}

/**
 * Calculate the direction angle from one point to another
 */
function directionAngle(from: Point, to: Point): number {
  const dx = to.x - from.x
  const dy = from.y - to.y // Invert because SVG y is down
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

/**
 * Generate complete SVG for a triangle
 */
export function generateTriangleSVG(data: TriangleData): string {
  const { vertices, angles, config } = data
  const { A, B, C } = vertices
  const width = config.width ?? 260
  const height = config.height ?? 180

  // Calculate direction angles for each vertex
  const dirAB = directionAngle(A, B)
  const dirAC = directionAngle(A, C)
  const dirBA = directionAngle(B, A)
  const dirBC = directionAngle(B, C)
  const dirCA = directionAngle(C, A)
  const dirCB = directionAngle(C, B)

  // Generate angle arcs
  const arcRadius = 22
  const arcA = generateAngleArc(A, angles.A, dirAB, arcRadius)
  const arcB = generateAngleArc(B, angles.B, dirBC, arcRadius)
  const arcC = generateAngleArc(C, angles.C, dirCA, arcRadius)

  // Calculate label positions (inside the triangle, just past the arc)
  const labelOffset = 36  // Slightly past arc radius (22) + some margin
  const labelA = {
    x: A.x + labelOffset * Math.cos(((dirAB + dirAC) / 2) * Math.PI / 180),
    y: A.y - labelOffset * Math.sin(((dirAB + dirAC) / 2) * Math.PI / 180),
  }
  const labelB = {
    x: B.x + labelOffset * Math.cos(((dirBA + dirBC) / 2) * Math.PI / 180),
    y: B.y - labelOffset * Math.sin(((dirBA + dirBC) / 2) * Math.PI / 180),
  }
  const labelC = {
    x: C.x + labelOffset * Math.cos(((dirCA + dirCB) / 2) * Math.PI / 180),
    y: C.y - labelOffset * Math.sin(((dirCA + dirCB) / 2) * Math.PI / 180),
  }

  // Vertex label positions (outside the triangle)
  const vertexLabelOffset = 18
  const vertexLabelA = {
    x: A.x - vertexLabelOffset,
    y: A.y + vertexLabelOffset,
  }
  const vertexLabelB = {
    x: B.x + vertexLabelOffset,
    y: B.y + vertexLabelOffset,
  }
  const vertexLabelC = {
    x: C.x,
    y: C.y - vertexLabelOffset,
  }

  // Format angle display
  const formatAngle = (cfg: TriangleAngle, computed: number) => {
    if (cfg.value === null || cfg.highlight) {
      return '?'
    }
    return `${computed}°`
  }

  const displayA = formatAngle(config.angles.A, angles.A)
  const displayB = formatAngle(config.angles.B, angles.B)
  const displayC = formatAngle(config.angles.C, angles.C)

  const highlightColor = '#fbbf24'
  const normalColor = '#e2e8f0'
  const colorA = config.angles.A.highlight || config.angles.A.value === null ? highlightColor : normalColor
  const colorB = config.angles.B.highlight || config.angles.B.value === null ? highlightColor : normalColor
  const colorC = config.angles.C.highlight || config.angles.C.value === null ? highlightColor : normalColor

  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Triangle -->
  <polygon points="${C.x.toFixed(1)},${C.y.toFixed(1)} ${A.x.toFixed(1)},${A.y.toFixed(1)} ${B.x.toFixed(1)},${B.y.toFixed(1)}" 
           fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linejoin="round"/>
  
  <!-- Angle arcs -->
  <path d="${arcA}" fill="none" stroke="#22d3ee" stroke-width="2"/>
  <path d="${arcB}" fill="none" stroke="#22d3ee" stroke-width="2"/>
  <path d="${arcC}" fill="none" stroke="#22d3ee" stroke-width="2"/>
  
  <!-- Vertex labels -->
  <text x="${vertexLabelA.x.toFixed(1)}" y="${vertexLabelA.y.toFixed(1)}" text-anchor="middle" fill="#e2e8f0" font-size="15" font-weight="600">${config.angles.A.label}</text>
  <text x="${vertexLabelB.x.toFixed(1)}" y="${vertexLabelB.y.toFixed(1)}" text-anchor="middle" fill="#e2e8f0" font-size="15" font-weight="600">${config.angles.B.label}</text>
  <text x="${vertexLabelC.x.toFixed(1)}" y="${vertexLabelC.y.toFixed(1)}" text-anchor="middle" fill="#e2e8f0" font-size="15" font-weight="600">${config.angles.C.label}</text>
  
  <!-- Angle values -->
  <text x="${labelA.x.toFixed(1)}" y="${labelA.y.toFixed(1)}" text-anchor="middle" fill="${colorA}" font-size="13" font-weight="500">${displayA}</text>
  <text x="${labelB.x.toFixed(1)}" y="${labelB.y.toFixed(1)}" text-anchor="middle" fill="${colorB}" font-size="13" font-weight="500">${displayB}</text>
  <text x="${labelC.x.toFixed(1)}" y="${labelC.y.toFixed(1)}" text-anchor="middle" fill="${colorC}" font-size="13" font-weight="500">${displayC}</text>
</svg>`
}

/**
 * Parse triangle config from declarative syntax
 * 
 * Syntax:
 * %% FIGURE_TRIANGLE
 * A: 65°
 * B: 45°
 * C: ?
 * %% FIGURE_END
 */
export function parseTriangleConfig(content: string): TriangleConfig {
  const lines = content.trim().split('\n')
  
  const angles: TriangleConfig['angles'] = {
    A: { value: 60, label: 'A' },
    B: { value: 60, label: 'B' },
    C: { value: 60, label: 'C' },
  }

  for (const line of lines) {
    const trimmed = line.trim()
    
    // Match patterns like "A: 65°" or "A: ?" or "A: 65° highlight"
    const match = trimmed.match(/^([ABC]):\s*(\?|(\d+)°?)(\s+highlight)?$/i)
    if (match) {
      const vertex = match[1].toUpperCase() as 'A' | 'B' | 'C'
      const isUnknown = match[2] === '?'
      const value = isUnknown ? null : parseInt(match[3], 10)
      const highlight = Boolean(match[4])
      
      angles[vertex] = {
        value,
        label: vertex,
        highlight: highlight || isUnknown,
      }
    }
  }

  return { angles }
}


// ============================================================================
// POLYGON SUPPORT
// ============================================================================

export type PolygonVertex = {
  label: string
  x: number
  y: number
}

export type PolygonSide = {
  from: string
  to: string
  label: string
  highlight?: boolean
}

export type PolygonConfig = {
  vertices: PolygonVertex[]
  sides: PolygonSide[]
  rightAngles: string[]  // vertex labels that have right angles
  showAngles: boolean    // whether to display angle markers (default true)
  showLabels: boolean    // whether to display vertex labels (default true)
  width?: number
  height?: number
}

export type PolygonData = {
  vertices: PolygonVertex[]
  sides: PolygonSide[]
  rightAngles: string[]
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
  config: PolygonConfig
}

/**
 * Parse polygon config from declarative syntax
 * 
 * Syntax:
 * %% FIGURE_POLYGON
 * A: (0,0)
 * B: (4,0)
 * C: (4,3)
 * D: (0,3)
 * side AB: 2a
 * side BC: 3
 * right-angle: A B C D
 * show-angles: false     (optional, default true)
 * %% FIGURE_END
 */
export function parsePolygonConfig(content: string): PolygonConfig {
  const lines = content.trim().split('\n')
  
  const vertices: PolygonVertex[] = []
  const sides: PolygonSide[] = []
  let rightAngles: string[] = []
  let showAngles = true   // default to showing angles
  let showLabels = true   // default to showing vertex labels

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Match vertex: "A: (0,0)" or "A: (0, 0)"
    const vertexMatch = trimmed.match(/^([A-Z]):\s*\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/i)
    if (vertexMatch) {
      vertices.push({
        label: vertexMatch[1].toUpperCase(),
        x: parseFloat(vertexMatch[2]),
        y: parseFloat(vertexMatch[3]),
      })
      continue
    }

    // Match side: "side AB: 2a" or "side AB: 2a highlight"
    const sideMatch = trimmed.match(/^side\s+([A-Z])([A-Z]):\s*(.+?)(\s+highlight)?$/i)
    if (sideMatch) {
      sides.push({
        from: sideMatch[1].toUpperCase(),
        to: sideMatch[2].toUpperCase(),
        label: sideMatch[3].trim(),
        highlight: Boolean(sideMatch[4]),
      })
      continue
    }

    // Match right-angle: "right-angle: A B C D"
    const rightAngleMatch = trimmed.match(/^right-angle:\s*(.+)$/i)
    if (rightAngleMatch) {
      rightAngles = rightAngleMatch[1].split(/\s+/).map(s => s.toUpperCase())
      continue
    }

    // Match show-angles: "show-angles: false" or "show-angles: true"
    const showAnglesMatch = trimmed.match(/^show-angles:\s*(true|false)$/i)
    if (showAnglesMatch) {
      showAngles = showAnglesMatch[1].toLowerCase() === 'true'
      continue
    }

    // Match show-labels: "show-labels: false" or "show-labels: true"
    const showLabelsMatch = trimmed.match(/^show-labels:\s*(true|false)$/i)
    if (showLabelsMatch) {
      showLabels = showLabelsMatch[1].toLowerCase() === 'true'
      continue
    }
  }

  return { vertices, sides, rightAngles, showAngles, showLabels }
}

/**
 * Compute polygon data with proper scaling
 */
export function computePolygon(config: PolygonConfig): PolygonData {
  const width = config.width ?? 280
  const height = config.height ?? 200
  const padding = 50

  // Calculate bounds of the input coordinates
  const xs = config.vertices.map(v => v.x)
  const ys = config.vertices.map(v => v.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const inputWidth = maxX - minX || 1
  const inputHeight = maxY - minY || 1

  // Scale to fit viewBox with padding
  const availableWidth = width - 2 * padding
  const availableHeight = height - 2 * padding
  const scale = Math.min(availableWidth / inputWidth, availableHeight / inputHeight)

  // Transform vertices to SVG coordinates (flip Y axis)
  const vertices: PolygonVertex[] = config.vertices.map(v => ({
    label: v.label,
    x: padding + (v.x - minX) * scale,
    y: height - padding - (v.y - minY) * scale,
  }))

  return {
    vertices,
    sides: config.sides,
    rightAngles: config.rightAngles,
    bounds: { minX, maxX, minY, maxY },
    config,
  }
}

/**
 * Generate right angle marker (small square)
 */
function generateRightAngleMarker(
  vertex: Point,
  prev: Point,
  next: Point,
  size: number = 12
): string {
  // Calculate unit vectors along both edges
  const toPrev = { x: prev.x - vertex.x, y: prev.y - vertex.y }
  const toNext = { x: next.x - vertex.x, y: next.y - vertex.y }
  
  const lenPrev = Math.sqrt(toPrev.x ** 2 + toPrev.y ** 2)
  const lenNext = Math.sqrt(toNext.x ** 2 + toNext.y ** 2)
  
  const unitPrev = { x: toPrev.x / lenPrev, y: toPrev.y / lenPrev }
  const unitNext = { x: toNext.x / lenNext, y: toNext.y / lenNext }

  // Points for the right angle square
  const p1 = { x: vertex.x + unitPrev.x * size, y: vertex.y + unitPrev.y * size }
  const p2 = { x: vertex.x + unitPrev.x * size + unitNext.x * size, y: vertex.y + unitPrev.y * size + unitNext.y * size }
  const p3 = { x: vertex.x + unitNext.x * size, y: vertex.y + unitNext.y * size }

  return `M ${p1.x.toFixed(1)},${p1.y.toFixed(1)} L ${p2.x.toFixed(1)},${p2.y.toFixed(1)} L ${p3.x.toFixed(1)},${p3.y.toFixed(1)}`
}

/**
 * Generate complete SVG for a polygon
 */
export function generatePolygonSVG(data: PolygonData): string {
  const { vertices, sides, rightAngles, config } = data
  const width = config.width ?? 280
  const height = config.height ?? 200

  if (vertices.length < 3) {
    return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><text x="50%" y="50%" text-anchor="middle" fill="#e2e8f0">Polygon needs at least 3 vertices</text></svg>`
  }

  // Build polygon points string
  const polygonPoints = vertices.map(v => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' ')

  // Generate vertex labels (positioned outward from polygon center) - only if showLabels is true
  const centerX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length
  const centerY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length
  
  const vertexLabels = config.showLabels
    ? vertices.map(v => {
        const outX = v.x - centerX
        const outY = v.y - centerY
        const outLen = Math.sqrt(outX ** 2 + outY ** 2) || 1
        
        const labelX = v.x + (outX / outLen) * 16  // Close to vertex
        const labelY = v.y + (outY / outLen) * 16

        return `<text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="#e2e8f0" font-size="14" font-weight="600">${v.label}</text>`
      }).join('\n  ')
    : ''

  // Generate side labels
  const sideLabels = sides.map(side => {
    const fromVertex = vertices.find(v => v.label === side.from)
    const toVertex = vertices.find(v => v.label === side.to)
    
    if (!fromVertex || !toVertex) return ''

    // Position label at midpoint, offset outward
    const midX = (fromVertex.x + toVertex.x) / 2
    const midY = (fromVertex.y + toVertex.y) / 2
    
    const dx = toVertex.x - fromVertex.x
    const dy = toVertex.y - fromVertex.y
    
    // Perpendicular vector
    let perpX = -dy
    let perpY = dx
    const perpLen = Math.sqrt(perpX ** 2 + perpY ** 2) || 1
    perpX /= perpLen
    perpY /= perpLen
    
    // Make sure it points outward
    const toCenter = { x: centerX - midX, y: centerY - midY }
    if (perpX * toCenter.x + perpY * toCenter.y > 0) {
      perpX = -perpX
      perpY = -perpY
    }
    
    const labelX = midX + perpX * 12  // Close to side but not overlapping
    const labelY = midY + perpY * 12
    
    const color = side.highlight ? '#fbbf24' : '#e2e8f0'

    return `<text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="${color}" font-size="13" font-weight="500">${side.label}</text>`
  }).join('\n  ')

  // Generate right angle markers (only if showAngles is true)
  const rightAngleMarkers = config.showAngles 
    ? rightAngles.map(label => {
        const idx = vertices.findIndex(v => v.label === label)
        if (idx === -1) return ''
        
        const vertex = vertices[idx]
        const prev = vertices[(idx - 1 + vertices.length) % vertices.length]
        const next = vertices[(idx + 1) % vertices.length]
        
        const path = generateRightAngleMarker(vertex, prev, next)
        return `<path d="${path}" fill="none" stroke="#22d3ee" stroke-width="1.5"/>`
      }).join('\n  ')
    : ''

  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Polygon -->
  <polygon points="${polygonPoints}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linejoin="round"/>
  
  <!-- Right angle markers -->
  ${rightAngleMarkers}
  
  <!-- Vertex labels -->
  ${vertexLabels}
  
  <!-- Side labels -->
  ${sideLabels}
</svg>`
}

