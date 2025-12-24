/**
 * Generator: geo_sammensat_figur
 * 
 * Generates composite figure problems (L-shapes, etc.)
 * Calculate area and perimeter by splitting into rectangles
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'
import type { PolygonFigure } from '../../types/taskSchema'

type FigureShape = 'L' | 'T' | 'U'

export class SammensatFigurGenerator extends LogicBasedGenerator {
  readonly taskType = 'geo_sammensat_figur'
  readonly name = 'Sammensat figur'

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    // Pick shape type
    const shape = rng.pick<FigureShape>(['L', 'T', 'U'])
    
    // Generate dimensions (nice numbers for mental math)
    const width = rng.intStep(40, 100, 10)
    const height = rng.intStep(60, 120, 10)
    const cutoutWidth = rng.intStep(20, Math.floor(width * 0.6), 10)
    const cutoutHeight = rng.intStep(20, Math.floor(height * 0.6), 10)
    
    let area: number
    let perimeter: number
    let figure: PolygonFigure
    let introText: string
    
    switch (shape) {
      case 'L': {
        // L-shape: full rectangle minus top-right rectangle
        area = width * height - cutoutWidth * cutoutHeight
        perimeter = 2 * (width + height) + 2 * (cutoutWidth + cutoutHeight) - 2 * Math.min(cutoutWidth, cutoutHeight)
        // Actually simpler: trace the outline
        perimeter = width + height + cutoutWidth + (height - cutoutHeight) + (width - cutoutWidth) + cutoutHeight
        
        figure = {
          type: 'polygon',
          vertices: {
            A: [0, 0],
            B: [width, 0],
            C: [width, height - cutoutHeight],
            D: [width - cutoutWidth, height - cutoutHeight],
            E: [width - cutoutWidth, height],
            F: [0, height],
          },
          sides: {
            AB: String(width),
            BC: String(height - cutoutHeight),
            CD: String(cutoutWidth),
            DE: String(cutoutHeight),
            EF: String(width - cutoutWidth),
            FA: String(height),
          },
          right_angles: ['A', 'B', 'C', 'D', 'E', 'F'],
        }
        introText = `En L-formet figur har mål som vist på figuren (alle mål er i cm).`
        break
      }
      
      case 'T': {
        // T-shape: top bar + vertical stem
        const barWidth = width
        const barHeight = rng.intStep(20, 40, 10)
        const stemWidth = rng.intStep(20, Math.floor(width * 0.5), 10)
        const stemHeight = height - barHeight
        
        area = barWidth * barHeight + stemWidth * stemHeight
        perimeter = 2 * barHeight + barWidth + 2 * stemHeight + stemWidth + 
                   (barWidth - stemWidth) // the two horizontal bits
        
        figure = {
          type: 'polygon',
          vertices: {
            A: [0, 0],
            B: [barWidth, 0],
            C: [barWidth, barHeight],
            D: [(barWidth + stemWidth) / 2, barHeight],
            E: [(barWidth + stemWidth) / 2, height],
            F: [(barWidth - stemWidth) / 2, height],
            G: [(barWidth - stemWidth) / 2, barHeight],
            H: [0, barHeight],
          },
          right_angles: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        }
        introText = `En T-formet figur har mål som vist på figuren (alle mål er i cm).`
        break
      }
      
      case 'U': {
        // U-shape: rectangle with cutout from top middle
        const legWidth = rng.intStep(20, Math.floor(width * 0.3), 10)
        const cutoutInnerWidth = width - 2 * legWidth
        const cutoutInnerHeight = rng.intStep(30, Math.floor(height * 0.6), 10)
        
        area = width * height - cutoutInnerWidth * cutoutInnerHeight
        perimeter = 2 * width + 2 * height + 2 * cutoutInnerHeight
        
        figure = {
          type: 'polygon',
          vertices: {
            A: [0, 0],
            B: [width, 0],
            C: [width, height],
            D: [width - legWidth, height],
            E: [width - legWidth, height - cutoutInnerHeight],
            F: [legWidth, height - cutoutInnerHeight],
            G: [legWidth, height],
            H: [0, height],
          },
          right_angles: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        }
        introText = `En U-formet figur har mål som vist på figuren (alle mål er i cm).`
        break
      }
    }

    return {
      type: this.taskType,
      title: 'Sammensat figur',
      intro: introText,
      figure,
      questions: [
        {
          text: 'Beregn arealet af figuren.',
          answer: String(area),
          answer_type: 'number',
          accept_alternatives: [`${area} cm²`, `${area} cm^2`],
        },
        {
          text: 'Beregn omkredsen af figuren.',
          answer: String(perimeter),
          answer_type: 'number',
          accept_alternatives: [`${perimeter} cm`],
        }
      ],
      variables: { 
        width, 
        height, 
        cutoutWidth, 
        cutoutHeight,
        shape 
      }
    }
  }
}

