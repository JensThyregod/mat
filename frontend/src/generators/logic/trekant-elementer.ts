/**
 * Generator: geo_trekant_elementer
 * 
 * Generates triangle element identification problems
 * - Heights (højder)
 * - Medians (medianer)
 * - Similarity (ligedannethed)
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

type ElementType = 'height' | 'median' | 'angle_bisector'

const ELEMENT_NAMES: Record<ElementType, { danish: string; description: string }> = {
  height: { danish: 'højde', description: 'en linje fra et hjørne vinkelret på den modstående side' },
  median: { danish: 'median', description: 'en linje fra et hjørne til midtpunktet af den modstående side' },
  angle_bisector: { danish: 'vinkelhalveringslinje', description: 'en linje der deler en vinkel i to lige store dele' },
}

export class TrekantElementerGenerator extends LogicBasedGenerator {
  readonly taskType = 'geo_trekant_elementer'
  readonly name = 'Trekanters elementer'

  private generateTriangleSVG(highlightElement: ElementType): string {
    const width = 250
    const height = 200
    
    // Triangle vertices
    const A = { x: 50, y: 170 }
    const B = { x: 200, y: 170 }
    const C = { x: 120, y: 40 }
    
    // Midpoints
    const midAB = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }
    const midBC = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 }
    const midCA = { x: (C.x + A.x) / 2, y: (C.y + A.y) / 2 }
    
    // Foot of height from C to AB
    const footC = { x: C.x, y: A.y } // Since AB is horizontal
    
    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    
    // Triangle
    svg += `<polygon points="${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}" fill="none" stroke="#333" stroke-width="2"/>`
    
    // Highlight element
    if (highlightElement === 'height') {
      svg += `<line x1="${C.x}" y1="${C.y}" x2="${footC.x}" y2="${footC.y}" stroke="#C2725A" stroke-width="3" stroke-dasharray="5,3"/>`
      svg += `<rect x="${footC.x - 8}" y="${footC.y - 8}" width="8" height="8" fill="none" stroke="#C2725A" stroke-width="2"/>`
    } else if (highlightElement === 'median') {
      svg += `<line x1="${C.x}" y1="${C.y}" x2="${midAB.x}" y2="${midAB.y}" stroke="#C2725A" stroke-width="3" stroke-dasharray="5,3"/>`
      svg += `<circle cx="${midAB.x}" cy="${midAB.y}" r="4" fill="#C2725A"/>`
    } else if (highlightElement === 'angle_bisector') {
      // Approximate angle bisector
      const bisectorEnd = { x: (A.x + B.x) / 2 + 10, y: A.y }
      svg += `<line x1="${C.x}" y1="${C.y}" x2="${bisectorEnd.x}" y2="${bisectorEnd.y}" stroke="#C2725A" stroke-width="3" stroke-dasharray="5,3"/>`
    }
    
    // Labels
    svg += `<text x="${A.x - 15}" y="${A.y + 5}" font-size="16" font-weight="bold">A</text>`
    svg += `<text x="${B.x + 5}" y="${B.y + 5}" font-size="16" font-weight="bold">B</text>`
    svg += `<text x="${C.x - 5}" y="${C.y - 10}" font-size="16" font-weight="bold">C</text>`
    
    svg += `</svg>`
    return svg
  }

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    const elements: ElementType[] = ['height', 'median', 'angle_bisector']
    const correctElement = rng.pick(elements)
    const wrongElements = elements.filter(e => e !== correctElement)
    
    const options = rng.shuffle([correctElement, ...wrongElements])
    const correctLetter = String.fromCharCode(65 + options.indexOf(correctElement))
    
    const svg = this.generateTriangleSVG(correctElement)

    return {
      type: this.taskType,
      title: 'Trekanters elementer',
      intro: 'I trekanten er der tegnet en stiplet linje.',
      figure: {
        type: 'svg',
        content: svg,
      },
      questions: [
        {
          text: `Hvad er den stiplede linje?\n\nA) En ${ELEMENT_NAMES[options[0]].danish}\nB) En ${ELEMENT_NAMES[options[1]].danish}\nC) En ${ELEMENT_NAMES[options[2]].danish}`,
          answer: correctLetter,
          answer_type: 'multiple_choice',
          accept_alternatives: [ELEMENT_NAMES[correctElement].danish],
        },
        {
          text: `Beskriv hvad en ${ELEMENT_NAMES[correctElement].danish} er.`,
          answer: ELEMENT_NAMES[correctElement].description,
          answer_type: 'text',
        }
      ],
      variables: {
        element: correctElement,
      }
    }
  }
}

