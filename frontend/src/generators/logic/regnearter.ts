/**
 * Generator: tal_regnearter
 * 
 * Generates basic arithmetic problems (addition, subtraction, multiplication, division)
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

type Operator = '+' | '-' | '·' | ':'

export class RegneArterGenerator extends LogicBasedGenerator {
  readonly taskType = 'tal_regnearter'
  readonly name = 'Almindelige regnearter'

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    // Pick operator
    const operators: Operator[] = ['+', '-', '·', ':']
    const operator = rng.pick(operators)
    
    // Generate numbers based on operator
    let a: number, b: number, answer: number
    
    switch (operator) {
      case '+':
        // Addition: sum should be reasonable for mental math
        a = rng.int(10, 99)
        b = rng.int(10, 99)
        answer = a + b
        break
        
      case '-':
        // Subtraction: ensure positive result
        a = rng.int(30, 99)
        b = rng.int(10, a - 5)
        answer = a - b
        break
        
      case '·':
        // Multiplication: keep it manageable
        a = rng.int(2, 12)
        b = rng.int(2, 12)
        answer = a * b
        break
        
      case ':':
        // Division: ensure clean division
        b = rng.int(2, 12)
        answer = rng.int(2, 12)
        a = b * answer
        break
    }

    return {
      type: this.taskType,
      title: 'Regnearter',
      intro: 'Beregn følgende.',
      figure: null,
      questions: [
        {
          text: `Beregn \\(${a} ${operator} ${b}\\)`,
          answer: String(answer),
          answer_type: 'number',
        }
      ],
      variables: { a, b, operator }
    }
  }
}

