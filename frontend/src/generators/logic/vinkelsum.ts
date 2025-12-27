/**
 * Generator: geo_vinkelsum
 * 
 * Generates triangle angle sum problems
 * Given two angles, calculate the third using A + B + C = 180°
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

type TriangleType = 'spidsvinklet' | 'retvinklet' | 'stumpvinklet'

export class VinkelsumGenerator extends LogicBasedGenerator {
  readonly taskType = 'geo_vinkelsum'
  readonly name = 'Vinkelsum i trekant'

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    // Generate two angles, ensuring valid triangle
    // and that the third angle is also reasonable
    let angleA: number, angleB: number, angleC: number
    
    // Decide which type of triangle
    const types: TriangleType[] = ['spidsvinklet', 'spidsvinklet', 'retvinklet', 'stumpvinklet']
    const triangleType = rng.pick(types)
    
    switch (triangleType) {
      case 'retvinklet':
        // One angle is 90°
        angleC = 90
        angleA = rng.int(20, 70)
        angleB = 90 - angleA
        break
        
      case 'stumpvinklet':
        // One angle > 90°
        angleC = rng.int(91, 140)
        const remaining = 180 - angleC
        angleA = rng.int(Math.max(10, Math.floor(remaining / 4)), Math.floor(remaining / 2))
        angleB = remaining - angleA
        break
        
      case 'spidsvinklet':
      default:
        // All angles < 90°
        angleA = rng.int(30, 80)
        angleB = rng.int(30, Math.min(80, 149 - angleA))
        angleC = 180 - angleA - angleB
        // Ensure all acute
        if (angleC >= 90) {
          angleC = rng.int(30, 80)
          angleB = 180 - angleA - angleC
        }
        break
    }
    
    // Ensure all angles are positive
    if (angleB <= 0 || angleC <= 0) {
      angleA = 60
      angleB = 50
      angleC = 70
    }

    // Randomly decide which angle to ask for
    const askFor = rng.pick(['A', 'B', 'C'] as const)
    const givenAngles = { A: angleA, B: angleB, C: angleC }
    const unknownAngle = givenAngles[askFor]
    
    // Build intro text - use proper LaTeX formatting
    const givenList = Object.entries(givenAngles)
      .filter(([k]) => k !== askFor)
      .map(([k, v]) => `\\(${k} = ${v}^\\circ\\)`)
      .join(' og ')

    return {
      type: this.taskType,
      title: 'Vinkelsum',
      intro: `I en trekant gælder at vinklerne er ${givenList}.`,
      figure: {
        type: 'triangle',
        vertices: {
          A: { angle: askFor === 'A' ? '?' : angleA },
          B: { angle: askFor === 'B' ? '?' : angleB },
          C: { angle: askFor === 'C' ? '?' : angleC },
        }
      },
      questions: [
        {
          text: `Beregn \\(${askFor}\\).`,
          answer: String(unknownAngle),
          answer_type: 'number',
          accept_alternatives: [`${unknownAngle}°`, `${unknownAngle} grader`],
        },
        {
          text: `Kontroller at \\(A + B + C = 180^\\circ\\).`,
          answer: '180',
          answer_type: 'number',
          accept_alternatives: ['180°', 'ja', 'yes', 'korrekt'],
        }
      ],
      variables: { 
        angle_a: angleA, 
        angle_b: angleB,
        unknown: askFor
      }
    }
  }
}

