/**
 * Generator: tal_ligninger
 * 
 * Generates simple first-order equations solvable by mental math
 * Types: ax = b, x + b = c, ax + b = c, ax - b = c
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

type EquationType = 'ax=c' | 'x+b=c' | 'ax+b=c' | 'ax-b=c'

export class LigningerGenerator extends LogicBasedGenerator {
  readonly taskType = 'tal_ligninger'
  readonly name = 'Ligninger'

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    // Pick equation type
    const types: EquationType[] = ['ax=c', 'x+b=c', 'ax+b=c', 'ax-b=c']
    const eqType = rng.pick(types)
    
    // Generate x first (the answer)
    const x = rng.int(2, 15)
    
    let equation: string
    let a: number | undefined
    let b: number | undefined
    let c: number
    
    switch (eqType) {
      case 'ax=c':
        // ax = c -> x = c/a
        a = rng.int(2, 10)
        c = a * x
        equation = `${a}x = ${c}`
        break
        
      case 'x+b=c':
        // x + b = c -> x = c - b
        b = rng.int(5, 30)
        c = x + b
        equation = `x + ${b} = ${c}`
        break
        
      case 'ax+b=c':
        // ax + b = c -> x = (c - b) / a
        a = rng.int(2, 8)
        b = rng.int(5, 20)
        c = a * x + b
        equation = `${a}x + ${b} = ${c}`
        break
        
      case 'ax-b=c':
        // ax - b = c -> x = (c + b) / a
        a = rng.int(2, 8)
        b = rng.int(5, 20)
        c = a * x - b
        // Ensure c is positive
        if (c < 0) {
          c = a * x + b
          equation = `${a}x + ${b} = ${c}`
        } else {
          equation = `${a}x - ${b} = ${c}`
        }
        break
    }

    return {
      type: this.taskType,
      title: 'Ligninger',
      intro: 'Løs ligningen.',
      figure: null,
      questions: [
        {
          text: `Løs ligningen: \\(${equation}\\)`,
          answer: String(x),
          answer_type: 'number',
          accept_alternatives: [`x = ${x}`, `x=${x}`],
        }
      ],
      variables: {
        ...(a !== undefined && { a }),
        ...(b !== undefined && { b }),
        c,
        x
      }
    }
  }
}

