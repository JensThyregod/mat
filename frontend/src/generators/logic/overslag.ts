/**
 * Generator: tal_overslag
 * 
 * Generates estimation problems
 * - Evaluate order of magnitude
 * - Choose most likely result
 * - Multiple choice format
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

export class OverslagGenerator extends LogicBasedGenerator {
  readonly taskType = 'tal_overslag'
  readonly name = 'Overslagsregning'

  private generateOptions(correct: number, rng: ReturnType<typeof this.createRng>): string[] {
    const options = new Set<number>([correct])
    
    // Add wrong answers at different scales
    const factors = [0.1, 0.5, 2, 10, 0.25, 4]
    
    while (options.size < 4) {
      const factor = rng.pick(factors)
      const wrong = Math.round(correct * factor)
      if (wrong !== correct && wrong > 0) {
        options.add(wrong)
      }
    }
    
    return rng.shuffle(Array.from(options).map(String))
  }

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    // Pick problem type
    const problemType = rng.pick(['large_mult', 'large_div', 'estimate_sum', 'real_world'] as const)
    
    let expression: string
    let answer: number
    let context: string
    
    switch (problemType) {
      case 'large_mult': {
        const a = rng.int(20, 99)
        const b = rng.int(20, 99)
        answer = a * b
        expression = `${a} \\cdot ${b}`
        context = `Hvilket tal ligger \\(${expression}\\) tættest på?`
        break
      }
      
      case 'large_div': {
        const divisor = rng.int(5, 15)
        answer = rng.int(20, 100)
        const dividend = divisor * answer
        expression = `${dividend} : ${divisor}`
        context = `Hvilket tal ligger \\(${expression}\\) tættest på?`
        break
      }
      
      case 'estimate_sum': {
        const a = rng.int(100, 999)
        const b = rng.int(100, 999)
        const c = rng.int(100, 999)
        answer = a + b + c
        expression = `${a} + ${b} + ${c}`
        context = `Hvilket tal ligger \\(${expression}\\) tættest på?`
        break
      }
      
      case 'real_world': {
        const items = rng.int(5, 20)
        const pricePerItem = rng.intStep(10, 100, 5)
        answer = items * pricePerItem
        context = `Du køber ${items} varer til ${pricePerItem} kr stykket. Hvad er den samlede pris cirka?`
        expression = `${items} \\cdot ${pricePerItem}`
        break
      }
    }
    
    const options = this.generateOptions(answer, rng)
    const correctLetter = String.fromCharCode(65 + options.indexOf(String(answer)))

    return {
      type: this.taskType,
      title: 'Overslagsregning',
      intro: context,
      figure: null,
      questions: [
        {
          text: `Vælg det rigtige svar:\n\nA) ${options[0]}\nB) ${options[1]}\nC) ${options[2]}\nD) ${options[3]}`,
          answer: correctLetter,
          answer_type: 'multiple_choice',
          accept_alternatives: [String(answer)],
        }
      ],
      variables: {
        problemType,
        expression,
        answer,
        options: options.join(', '),
      }
    }
  }
}

