/**
 * Generator: geo_rumfang
 * 
 * Generates volume and surface area problems
 * - Prisms (rectangular, triangular)
 * - Cylinders
 * - Volume and surface calculations
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

type Shape = 'rectangular_prism' | 'cylinder' | 'triangular_prism'

export class RumfangGenerator extends LogicBasedGenerator {
  readonly taskType = 'geo_rumfang'
  readonly name = 'Rumfang og overflade'

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    const shape = rng.pick<Shape>(['rectangular_prism', 'cylinder', 'triangular_prism'])
    
    let intro: string
    let formula: string
    let volume: number
    let questions: Array<{ text: string; answer: string; answer_type: 'number'; accept_alternatives?: string[] }>
    let svg: string
    
    switch (shape) {
      case 'rectangular_prism': {
        const length = rng.intStep(4, 12, 2)
        const width = rng.intStep(3, 8, 1)
        const height = rng.intStep(2, 6, 1)
        volume = length * width * height
        
        formula = 'V = l \\cdot b \\cdot h'
        intro = `Et rektangulært prisme (kasse) har længde ${length} cm, bredde ${width} cm og højde ${height} cm.`
        svg = this.generateBoxSVG(length, width, height)
        
        questions = [
          {
            text: 'Beregn rumfanget.',
            answer: String(volume),
            answer_type: 'number',
            accept_alternatives: [`${volume} cm³`, `${volume} cm^3`],
          },
          {
            text: 'Hvad er grundfladens areal?',
            answer: String(length * width),
            answer_type: 'number',
            accept_alternatives: [`${length * width} cm²`],
          }
        ]
        break
      }
      
      case 'cylinder': {
        const radius = rng.pick([2, 3, 4, 5])
        const height = rng.intStep(4, 12, 2)
        volume = Math.round(Math.PI * radius * radius * height)
        
        formula = 'V = \\pi \\cdot r^2 \\cdot h'
        intro = `En cylinder har radius ${radius} cm og højde ${height} cm.\n\nBrug \\(\\pi \\approx 3.14\\)`
        svg = this.generateCylinderSVG(radius, height)
        
        const approxVolume = Math.round(3.14 * radius * radius * height)
        
        questions = [
          {
            text: 'Beregn rumfanget.',
            answer: String(approxVolume),
            answer_type: 'number',
            accept_alternatives: [String(volume), `${approxVolume} cm³`, `${Math.round(3.14159 * radius * radius * height)}`],
          },
          {
            text: 'Hvad er grundfladens areal?',
            answer: String(Math.round(3.14 * radius * radius)),
            answer_type: 'number',
            accept_alternatives: [`${Math.round(Math.PI * radius * radius)} cm²`],
          }
        ]
        break
      }
      
      case 'triangular_prism': {
        const base = rng.intStep(4, 10, 2)
        const triangleHeight = rng.intStep(3, 8, 1)
        const length = rng.intStep(6, 12, 2)
        const triangleArea = (base * triangleHeight) / 2
        volume = triangleArea * length
        
        formula = 'V = G \\cdot h = \\frac{1}{2} \\cdot b \\cdot h_{trekant} \\cdot l'
        intro = `Et trekantet prisme har en grundflade der er en trekant med grundlinje ${base} cm og højde ${triangleHeight} cm. Prismet er ${length} cm langt.`
        svg = this.generateTriangularPrismSVG(base, triangleHeight, length)
        
        questions = [
          {
            text: 'Beregn grundfladens areal (trekanten).',
            answer: String(triangleArea),
            answer_type: 'number',
            accept_alternatives: [`${triangleArea} cm²`],
          },
          {
            text: 'Beregn rumfanget.',
            answer: String(volume),
            answer_type: 'number',
            accept_alternatives: [`${volume} cm³`],
          }
        ]
        break
      }
    }

    return {
      type: this.taskType,
      title: 'Rumfang og overflade',
      intro: `${intro}\n\nFormel: \\(${formula}\\)`,
      figure: {
        type: 'svg',
        content: svg,
      },
      questions,
      variables: {
        shape,
        volume,
      }
    }
  }

  private generateBoxSVG(l: number, w: number, h: number): string {
    const width = 200
    const height = 150
    
    // Isometric projection factors
    const scale = 8
    const dx = 0.7
    const dy = 0.4
    
    // Front-bottom-left corner
    const origin = { x: 40, y: 120 }
    
    // Calculate vertices
    const p = {
      fbl: origin,
      fbr: { x: origin.x + l * scale, y: origin.y },
      ftl: { x: origin.x, y: origin.y - h * scale },
      ftr: { x: origin.x + l * scale, y: origin.y - h * scale },
      bbl: { x: origin.x + w * scale * dx, y: origin.y - w * scale * dy },
      bbr: { x: origin.x + l * scale + w * scale * dx, y: origin.y - w * scale * dy },
      btl: { x: origin.x + w * scale * dx, y: origin.y - h * scale - w * scale * dy },
      btr: { x: origin.x + l * scale + w * scale * dx, y: origin.y - h * scale - w * scale * dy },
    }
    
    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    
    // Back faces (dashed)
    svg += `<g stroke="#999" stroke-width="1" stroke-dasharray="3,3" fill="none">`
    svg += `<line x1="${p.fbl.x}" y1="${p.fbl.y}" x2="${p.bbl.x}" y2="${p.bbl.y}"/>`
    svg += `<line x1="${p.bbl.x}" y1="${p.bbl.y}" x2="${p.btl.x}" y2="${p.btl.y}"/>`
    svg += `<line x1="${p.bbl.x}" y1="${p.bbl.y}" x2="${p.bbr.x}" y2="${p.bbr.y}"/>`
    svg += `</g>`
    
    // Front faces
    svg += `<g stroke="#333" stroke-width="2" fill="rgba(194,114,90,0.15)">`
    // Front
    svg += `<polygon points="${p.fbl.x},${p.fbl.y} ${p.fbr.x},${p.fbr.y} ${p.ftr.x},${p.ftr.y} ${p.ftl.x},${p.ftl.y}"/>`
    // Top
    svg += `<polygon points="${p.ftl.x},${p.ftl.y} ${p.ftr.x},${p.ftr.y} ${p.btr.x},${p.btr.y} ${p.btl.x},${p.btl.y}" fill="rgba(194,114,90,0.25)"/>`
    // Side
    svg += `<polygon points="${p.fbr.x},${p.fbr.y} ${p.bbr.x},${p.bbr.y} ${p.btr.x},${p.btr.y} ${p.ftr.x},${p.ftr.y}" fill="rgba(194,114,90,0.2)"/>`
    svg += `</g>`
    
    // Labels
    svg += `<text x="${(p.fbl.x + p.fbr.x) / 2}" y="${p.fbl.y + 15}" font-size="11" text-anchor="middle">${l} cm</text>`
    svg += `<text x="${p.fbr.x + 20}" y="${(p.fbr.y + p.ftr.y) / 2}" font-size="11">${h} cm</text>`
    svg += `<text x="${(p.fbr.x + p.bbr.x) / 2 + 5}" y="${(p.fbr.y + p.bbr.y) / 2 - 5}" font-size="11">${w} cm</text>`
    
    svg += `</svg>`
    return svg
  }

  private generateCylinderSVG(r: number, h: number): string {
    const width = 180
    const height = 160
    const scale = 8
    
    const cx = 90
    const cy = 130
    const rx = r * scale
    const ry = r * scale * 0.3
    const cylHeight = h * scale * 0.8
    
    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    
    // Bottom ellipse (back half dashed)
    svg += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="3,3"/>`
    
    // Sides
    svg += `<line x1="${cx - rx}" y1="${cy}" x2="${cx - rx}" y2="${cy - cylHeight}" stroke="#333" stroke-width="2"/>`
    svg += `<line x1="${cx + rx}" y1="${cy}" x2="${cx + rx}" y2="${cy - cylHeight}" stroke="#333" stroke-width="2"/>`
    
    // Top ellipse
    svg += `<ellipse cx="${cx}" cy="${cy - cylHeight}" rx="${rx}" ry="${ry}" fill="rgba(194,114,90,0.2)" stroke="#333" stroke-width="2"/>`
    
    // Bottom front arc
    svg += `<path d="M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy}" fill="none" stroke="#333" stroke-width="2"/>`
    
    // Labels
    svg += `<text x="${cx}" y="${cy + 20}" font-size="11" text-anchor="middle">r = ${r} cm</text>`
    svg += `<text x="${cx + rx + 10}" y="${cy - cylHeight / 2}" font-size="11">h = ${h} cm</text>`
    
    svg += `</svg>`
    return svg
  }

  private generateTriangularPrismSVG(base: number, tHeight: number, length: number): string {
    const width = 220
    const height = 150
    const scale = 6
    
    // Front triangle
    const fA = { x: 30, y: 130 }
    const fB = { x: 30 + base * scale, y: 130 }
    const fC = { x: 30 + base * scale / 2, y: 130 - tHeight * scale }
    
    // Back offset
    const dx = length * scale * 0.5
    const dy = length * scale * 0.25
    
    const bA = { x: fA.x + dx, y: fA.y - dy }
    const bB = { x: fB.x + dx, y: fB.y - dy }
    const bC = { x: fC.x + dx, y: fC.y - dy }
    
    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    
    // Back edges (dashed)
    svg += `<g stroke="#999" stroke-width="1" stroke-dasharray="3,3">`
    svg += `<line x1="${fA.x}" y1="${fA.y}" x2="${bA.x}" y2="${bA.y}"/>`
    svg += `<line x1="${bA.x}" y1="${bA.y}" x2="${bB.x}" y2="${bB.y}"/>`
    svg += `<line x1="${bA.x}" y1="${bA.y}" x2="${bC.x}" y2="${bC.y}"/>`
    svg += `</g>`
    
    // Visible faces
    svg += `<g stroke="#333" stroke-width="2">`
    // Front triangle
    svg += `<polygon points="${fA.x},${fA.y} ${fB.x},${fB.y} ${fC.x},${fC.y}" fill="rgba(194,114,90,0.2)"/>`
    // Top face
    svg += `<polygon points="${fC.x},${fC.y} ${bC.x},${bC.y} ${bB.x},${bB.y} ${fB.x},${fB.y}" fill="rgba(194,114,90,0.25)"/>`
    // Side face
    svg += `<polygon points="${fB.x},${fB.y} ${bB.x},${bB.y} ${bC.x},${bC.y} ${fC.x},${fC.y}" fill="rgba(194,114,90,0.15)"/>`
    svg += `</g>`
    
    // Labels
    svg += `<text x="${(fA.x + fB.x) / 2}" y="${fA.y + 15}" font-size="10" text-anchor="middle">${base} cm</text>`
    svg += `<text x="${fC.x - 20}" y="${(fA.y + fC.y) / 2}" font-size="10">${tHeight} cm</text>`
    svg += `<text x="${(fB.x + bB.x) / 2 + 10}" y="${(fB.y + bB.y) / 2}" font-size="10">${length} cm</text>`
    
    svg += `</svg>`
    return svg
  }
}

