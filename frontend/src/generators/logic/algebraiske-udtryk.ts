/**
 * Generator: tal_algebraiske_udtryk
 * 
 * Generates algebraic expression recognition problems
 * - Equivalent expressions
 * - Division/multiplication relationships
 * - Powers and repeated multiplication
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

interface ExpressionPair {
  expression: string
  equivalents: string[]
  nonEquivalents: string[]
}

export class AlgebraiskeUdtrykGenerator extends LogicBasedGenerator {
  readonly taskType = 'tal_algebraiske_udtryk'
  readonly name = 'Algebraiske udtryk'

  private generateExpressionPairs(rng: ReturnType<typeof this.createRng>): ExpressionPair[] {
    const pairs: ExpressionPair[] = [
      // Division and fractions
      {
        expression: '\\frac{a}{b}',
        equivalents: ['a : b', 'a \\cdot \\frac{1}{b}'],
        nonEquivalents: ['a \\cdot b', '\\frac{b}{a}', 'a - b'],
      },
      // Powers
      {
        expression: 'a^3',
        equivalents: ['a \\cdot a \\cdot a'],
        nonEquivalents: ['3a', 'a + a + a', 'a^2 \\cdot a^2'],
      },
      {
        expression: 'a^2',
        equivalents: ['a \\cdot a'],
        nonEquivalents: ['2a', 'a + a', '2 \\cdot a'],
      },
      // Distributive property
      {
        expression: '2(a + b)',
        equivalents: ['2a + 2b'],
        nonEquivalents: ['2a + b', '2ab', 'a + b + 2'],
      },
      {
        expression: '3(x - 2)',
        equivalents: ['3x - 6'],
        nonEquivalents: ['3x - 2', 'x - 6', '3x + 6'],
      },
      // Negative numbers
      {
        expression: '-(a + b)',
        equivalents: ['-a - b'],
        nonEquivalents: ['-a + b', 'a - b', '-a - (-b)'],
      },
      // Fractions
      {
        expression: '\\frac{2a}{2}',
        equivalents: ['a'],
        nonEquivalents: ['2a', '\\frac{a}{2}', '2'],
      },
    ]
    
    return rng.shuffle(pairs).slice(0, 3)
  }

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    const pairs = this.generateExpressionPairs(rng)
    
    const questions = pairs.map((pair, _i) => {
      // Pick one equivalent and two non-equivalents
      const correct = rng.pick(pair.equivalents)
      const wrongs = rng.shuffle(pair.nonEquivalents).slice(0, 2)
      const options = rng.shuffle([correct, ...wrongs])
      
      const correctLetter = String.fromCharCode(65 + options.indexOf(correct))
      
      return {
        text: `Hvilket udtryk er lig med \\(${pair.expression}\\)?\n\nA) \\(${options[0]}\\)\nB) \\(${options[1]}\\)\nC) \\(${options[2]}\\)`,
        answer: correctLetter,
        answer_type: 'multiple_choice' as const,
      }
    })

    return {
      type: this.taskType,
      title: 'Algebraiske udtryk',
      intro: 'Find det udtryk der har samme værdi.',
      figure: null,
      questions,
      variables: {
        expressionCount: pairs.length,
      }
    }
  }
}

