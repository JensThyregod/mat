/**
 * Generator: stat_sandsynlighed
 * 
 * Generates probability problems
 * - Simple probability: favorable/possible
 * - Complementary probability: P(not A) = 1 - P(A)
 * - Compound events: P(A and A) = P(A)²
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

interface ProbabilityScenario {
  name: string
  intro: string
  totalFields: number
  fields: { name: string; count: number }[]
}

const SPINNER_COLORS = ['rød', 'blå', 'grøn', 'gul', 'lilla', 'orange']
const BALL_COLORS = ['rød', 'blå', 'grøn', 'hvid', 'sort']
const PRIZE_TYPES = ['præmie', 'gevinst', 'nitte', 'prøv igen', 'rabat']

export class SandsynlighedGenerator extends LogicBasedGenerator {
  readonly taskType = 'stat_sandsynlighed'
  readonly name = 'Sandsynlighed'

  private createScenario(rng: ReturnType<typeof this.createRng>): ProbabilityScenario {
    const scenarioType = rng.pick(['spinner', 'balls', 'wheel'])
    
    switch (scenarioType) {
      case 'spinner': {
        const totalFields = rng.pick([4, 6, 8, 10, 12])
        const numColors = rng.int(2, Math.min(4, totalFields))
        const colors = rng.pickN(SPINNER_COLORS, numColors)
        
        // Distribute fields among colors
        const fields: { name: string; count: number }[] = []
        let remaining = totalFields
        
        for (let i = 0; i < colors.length - 1; i++) {
          const count = rng.int(1, remaining - (colors.length - i - 1))
          fields.push({ name: colors[i], count })
          remaining -= count
        }
        fields.push({ name: colors[colors.length - 1], count: remaining })
        
        return {
          name: 'spinner',
          intro: `En spinner er inddelt i ${totalFields} lige store felter med forskellige farver.`,
          totalFields,
          fields,
        }
      }
      
      case 'balls': {
        const totalBalls = rng.pick([6, 8, 10, 12, 15, 20])
        const numColors = rng.int(2, 4)
        const colors = rng.pickN(BALL_COLORS, numColors)
        
        const fields: { name: string; count: number }[] = []
        let remaining = totalBalls
        
        for (let i = 0; i < colors.length - 1; i++) {
          const count = rng.int(1, remaining - (colors.length - i - 1))
          fields.push({ name: colors[i], count })
          remaining -= count
        }
        fields.push({ name: colors[colors.length - 1], count: remaining })
        
        return {
          name: 'balls',
          intro: `I en pose er der ${totalBalls} kugler med forskellige farver. Man trækker tilfældigt én kugle.`,
          totalFields: totalBalls,
          fields,
        }
      }
      
      case 'wheel':
      default: {
        const totalFields = rng.pick([6, 8, 10, 12])
        const types = rng.pickN(PRIZE_TYPES, rng.int(2, 3))
        
        const fields: { name: string; count: number }[] = []
        let remaining = totalFields
        
        for (let i = 0; i < types.length - 1; i++) {
          const count = rng.int(1, remaining - (types.length - i - 1))
          fields.push({ name: types[i], count })
          remaining -= count
        }
        fields.push({ name: types[types.length - 1], count: remaining })
        
        return {
          name: 'wheel',
          intro: `Et lykkehjul har ${totalFields} lige store felter. Man drejer og ser hvor pilen lander.`,
          totalFields,
          fields,
        }
      }
    }
  }

  private formatFraction(num: number, den: number): string {
    // Simplify fraction
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
    const g = gcd(num, den)
    return `${num / g}/${den / g}`
  }

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    const scenario = this.createScenario(rng)
    
    // Pick a field to ask about
    const askField = rng.pick(scenario.fields)
    const p = askField.count / scenario.totalFields
    const pComplement = 1 - p
    
    // Build field description for intro
    const fieldDesc = scenario.fields
      .map(f => `${f.count} ${f.name}`)
      .join(', ')
    
    const fullIntro = `${scenario.intro}\nFordeling: ${fieldDesc}.`

    return {
      type: this.taskType,
      title: 'Sandsynlighed',
      intro: fullIntro,
      figure: null,
      questions: [
        {
          text: `Hvad er sandsynligheden for at få ${askField.name}?`,
          answer: this.formatFraction(askField.count, scenario.totalFields),
          answer_type: 'fraction',
          accept_alternatives: [
            `${askField.count}/${scenario.totalFields}`,
            (p * 100).toFixed(0) + '%',
            p.toFixed(2),
          ],
        },
        {
          text: `Hvad er sandsynligheden for IKKE at få ${askField.name}?`,
          answer: this.formatFraction(scenario.totalFields - askField.count, scenario.totalFields),
          answer_type: 'fraction',
          accept_alternatives: [
            `${scenario.totalFields - askField.count}/${scenario.totalFields}`,
            (pComplement * 100).toFixed(0) + '%',
          ],
        },
        {
          text: `Hvad er sandsynligheden for at få ${askField.name} to gange i træk?`,
          answer: this.formatFraction(askField.count * askField.count, scenario.totalFields * scenario.totalFields),
          answer_type: 'fraction',
          accept_alternatives: [
            `${askField.count * askField.count}/${scenario.totalFields * scenario.totalFields}`,
            (p * p * 100).toFixed(1) + '%',
          ],
        }
      ],
      variables: { 
        scenario: scenario.name,
        totalFields: scenario.totalFields,
        askField: askField.name,
        askCount: askField.count
      }
    }
  }
}

