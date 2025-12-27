/**
 * Generator: tal_lineaere_funktioner
 * 
 * Generates linear function problems
 * - Read slope and y-intercept from graph
 * - Match equation to line
 * - Multiple choice format
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

interface LinearFunction {
  a: number  // slope
  b: number  // y-intercept
}

export class LineaereFunktionerGenerator extends LogicBasedGenerator {
  readonly taskType = 'tal_lineaere_funktioner'
  readonly name = 'Lineære funktioner'

  private formatEquation(f: LinearFunction): string {
    const { a, b } = f
    if (b === 0) {
      return `y = ${a}x`
    } else if (b > 0) {
      return `y = ${a}x + ${b}`
    } else {
      return `y = ${a}x - ${Math.abs(b)}`
    }
  }

  private generateSVG(f: LinearFunction): string {
    const width = 200
    const height = 200
    const padding = 20
    const gridSize = (width - 2 * padding) / 10
    
    // Calculate line points
    const x1 = -5
    const y1 = f.a * x1 + f.b
    const x2 = 5
    const y2 = f.a * x2 + f.b
    
    // Convert to SVG coordinates
    const toSvgX = (x: number) => padding + (x + 5) * gridSize
    const toSvgY = (y: number) => height - padding - (y + 5) * gridSize
    
    // Clamp line to visible area
    const clipLine = (x1: number, y1: number, x2: number, y2: number) => {
      const minY = -5, maxY = 5
      const points = []
      
      for (const x of [x1, x2]) {
        const y = f.a * x + f.b
        if (y >= minY && y <= maxY) {
          points.push({ x, y })
        }
      }
      
      // Check intersections with y boundaries
      if (f.a !== 0) {
        const xAtMinY = (minY - f.b) / f.a
        const xAtMaxY = (maxY - f.b) / f.a
        
        if (xAtMinY >= -5 && xAtMinY <= 5) points.push({ x: xAtMinY, y: minY })
        if (xAtMaxY >= -5 && xAtMaxY <= 5) points.push({ x: xAtMaxY, y: maxY })
      }
      
      if (points.length >= 2) {
        points.sort((a, b) => a.x - b.x)
        return { x1: points[0].x, y1: points[0].y, x2: points[points.length - 1].x, y2: points[points.length - 1].y }
      }
      return { x1, y1, x2, y2 }
    }
    
    const clipped = clipLine(x1, y1, x2, y2)
    
    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    
    // Grid
    svg += `<g stroke="#e0e0e0" stroke-width="1">`
    for (let i = -5; i <= 5; i++) {
      const x = toSvgX(i)
      const y = toSvgY(i)
      svg += `<line x1="${x}" y1="${padding}" x2="${x}" y2="${height - padding}"/>`
      svg += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}"/>`
    }
    svg += `</g>`
    
    // Axes
    svg += `<g stroke="#333" stroke-width="2">`
    svg += `<line x1="${toSvgX(0)}" y1="${padding}" x2="${toSvgX(0)}" y2="${height - padding}"/>`
    svg += `<line x1="${padding}" y1="${toSvgY(0)}" x2="${width - padding}" y2="${toSvgY(0)}"/>`
    svg += `</g>`
    
    // Axis labels
    svg += `<text x="${width - 10}" y="${toSvgY(0) - 5}" font-size="12" fill="#333">x</text>`
    svg += `<text x="${toSvgX(0) + 5}" y="${padding + 10}" font-size="12" fill="#333">y</text>`
    
    // Line
    svg += `<line x1="${toSvgX(clipped.x1)}" y1="${toSvgY(clipped.y1)}" x2="${toSvgX(clipped.x2)}" y2="${toSvgY(clipped.y2)}" stroke="#C2725A" stroke-width="3"/>`
    
    svg += `</svg>`
    return svg
  }

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    // Generate a linear function with nice values
    const slopes = [-2, -1, -0.5, 0.5, 1, 2, 3]
    const intercepts = [-3, -2, -1, 0, 1, 2, 3]
    
    const correct: LinearFunction = {
      a: rng.pick(slopes),
      b: rng.pick(intercepts),
    }
    
    // Generate wrong options with different slopes or intercepts
    const wrongs: LinearFunction[] = []
    
    // Wrong slope
    const wrongSlopes = slopes.filter(s => s !== correct.a)
    wrongs.push({ a: rng.pick(wrongSlopes), b: correct.b })
    
    // Wrong intercept
    const wrongIntercepts = intercepts.filter(i => i !== correct.b)
    wrongs.push({ a: correct.a, b: rng.pick(wrongIntercepts) })
    
    // Both wrong
    wrongs.push({ a: rng.pick(wrongSlopes), b: rng.pick(wrongIntercepts) })
    
    const options = rng.shuffle([correct, ...wrongs.slice(0, 3)])
    const correctLetter = String.fromCharCode(65 + options.findIndex(o => o.a === correct.a && o.b === correct.b))
    
    const svg = this.generateSVG(correct)

    return {
      type: this.taskType,
      title: 'Lineære funktioner',
      intro: 'En ret linje er tegnet i et koordinatsystem.',
      figure: {
        type: 'svg',
        content: svg,
      },
      questions: [
        {
          text: `Hvilken ligning passer til linjen?\n\nA) \\(${this.formatEquation(options[0])}\\)\nB) \\(${this.formatEquation(options[1])}\\)\nC) \\(${this.formatEquation(options[2])}\\)\nD) \\(${this.formatEquation(options[3])}\\)`,
          answer: correctLetter,
          answer_type: 'multiple_choice',
          accept_alternatives: [this.formatEquation(correct)],
        }
      ],
      variables: {
        slope: correct.a,
        intercept: correct.b,
      }
    }
  }
}

