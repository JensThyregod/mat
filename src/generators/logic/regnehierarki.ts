/**
 * Generator: tal_regnehierarki
 * 
 * Generates order of operations problems
 * - Expressions with multiple operators
 * - Parentheses
 * - Correct precedence
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

type ExpressionType = 'add_mult' | 'sub_mult' | 'parentheses' | 'mixed'

export class RegnehierarkiGenerator extends LogicBasedGenerator {
  readonly taskType = 'tal_regnehierarki'
  readonly name = 'Regnearternes hierarki'

  private generateExpression(rng: ReturnType<typeof this.createRng>): { expr: string; answer: number } {
    const type = rng.pick<ExpressionType>(['add_mult', 'sub_mult', 'parentheses', 'mixed'])
    
    switch (type) {
      case 'add_mult': {
        // a + b · c  or  a · b + c
        const a = rng.int(2, 20)
        const b = rng.int(2, 10)
        const c = rng.int(2, 10)
        if (rng.bool()) {
          return { expr: `${a} + ${b} \\cdot ${c}`, answer: a + b * c }
        } else {
          return { expr: `${a} \\cdot ${b} + ${c}`, answer: a * b + c }
        }
      }
      
      case 'sub_mult': {
        // a - b · c  or  a · b - c
        const a = rng.int(20, 50)
        const b = rng.int(2, 8)
        const c = rng.int(2, 8)
        if (rng.bool()) {
          const answer = a - b * c
          if (answer > 0) {
            return { expr: `${a} - ${b} \\cdot ${c}`, answer }
          }
        }
        return { expr: `${a} \\cdot ${b} - ${c}`, answer: a * b - c }
      }
      
      case 'parentheses': {
        // (a + b) · c  or  a · (b + c)
        const a = rng.int(2, 12)
        const b = rng.int(2, 12)
        const c = rng.int(2, 8)
        if (rng.bool()) {
          return { expr: `(${a} + ${b}) \\cdot ${c}`, answer: (a + b) * c }
        } else {
          return { expr: `${a} \\cdot (${b} + ${c})`, answer: a * (b + c) }
        }
      }
      
      case 'mixed': {
        // a + b · c - d  or  a · b + c · d
        const a = rng.int(5, 20)
        const b = rng.int(2, 8)
        const c = rng.int(2, 8)
        const d = rng.int(2, 8)
        if (rng.bool()) {
          const answer = a + b * c - d
          if (answer > 0) {
            return { expr: `${a} + ${b} \\cdot ${c} - ${d}`, answer }
          }
        }
        return { expr: `${a} \\cdot ${b} + ${c} \\cdot ${d}`, answer: a * b + c * d }
      }
    }
  }

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    // Generate 3-4 expressions
    const count = rng.int(3, 4)
    const expressions: Array<{ expr: string; answer: number }> = []
    
    for (let i = 0; i < count; i++) {
      expressions.push(this.generateExpression(rng))
    }

    return {
      type: this.taskType,
      title: 'Regnearternes hierarki',
      intro: 'Beregn følgende udtryk. Husk at bruge regnearternes rækkefølge.',
      figure: null,
      questions: expressions.map((e, i) => ({
        text: `Beregn \\(${e.expr}\\)`,
        answer: String(e.answer),
        answer_type: 'number' as const,
      })),
      variables: {
        expressionCount: count,
      }
    }
  }
}

