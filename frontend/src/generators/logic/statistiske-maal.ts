/**
 * Generator: stat_statistiske_maal
 * 
 * Generates statistical measures problems
 * - Maximum/minimum (størsteværdi/mindsteværdi)
 * - Mode (typetal)
 * - Median
 * - Mean (gennemsnit)
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

const CONTEXTS = [
  { name: 'karakterer', unit: '', dataType: 'numbers' },
  { name: 'antal solgte is', unit: 'stk', dataType: 'numbers' },
  { name: 'temperatur i °C', unit: '°C', dataType: 'numbers' },
  { name: 'antal point', unit: 'point', dataType: 'numbers' },
]

export class StatistiskeMaalGenerator extends LogicBasedGenerator {
  readonly taskType = 'stat_statistiske_maal'
  readonly name = 'Statistiske mål'

  private findMode(data: number[]): number {
    const counts = new Map<number, number>()
    for (const n of data) {
      counts.set(n, (counts.get(n) || 0) + 1)
    }
    let mode = data[0]
    let maxCount = 0
    for (const [value, count] of counts) {
      if (count > maxCount) {
        maxCount = count
        mode = value
      }
    }
    return mode
  }

  private findMedian(data: number[]): number {
    const sorted = [...data].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2
    }
    return sorted[mid]
  }

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    const context = rng.pick(CONTEXTS)
    
    // Generate data with a clear mode
    const dataSize = rng.pick([7, 9, 11])
    const baseValue = rng.int(5, 15)
    const data: number[] = []
    
    // Create data with variation and a clear mode
    const modeValue = baseValue + rng.int(-2, 2)
    const modeCount = rng.int(3, 4)
    
    for (let i = 0; i < modeCount; i++) {
      data.push(modeValue)
    }
    
    while (data.length < dataSize) {
      const value = baseValue + rng.int(-4, 6)
      if (value !== modeValue || data.filter(d => d === value).length < modeCount) {
        data.push(value)
      }
    }
    
    // Shuffle for display
    const displayData = rng.shuffle([...data])
    
    // Calculate statistics
    const min = Math.min(...data)
    const max = Math.max(...data)
    const mode = this.findMode(data)
    const median = this.findMedian(data)
    const sum = data.reduce((a, b) => a + b, 0)
    const mean = sum / data.length
    
    // Format data as table
    const dataString = displayData.join(', ')

    return {
      type: this.taskType,
      title: 'Statistiske mål',
      intro: `I en undersøgelse er følgende ${context.name} registreret:\n\n${dataString}`,
      figure: null,
      questions: [
        {
          text: 'Hvad er størsteværdien (maksimum)?',
          answer: String(max),
          answer_type: 'number',
        },
        {
          text: 'Hvad er mindsteværdien (minimum)?',
          answer: String(min),
          answer_type: 'number',
        },
        {
          text: 'Hvad er typetallet (den værdi der forekommer flest gange)?',
          answer: String(mode),
          answer_type: 'number',
        },
        {
          text: 'Hvad er medianen?',
          answer: Number.isInteger(median) ? String(median) : median.toFixed(1),
          answer_type: 'number',
        },
      ],
      variables: {
        context: context.name,
        dataSize,
        min,
        max,
        mode,
        median,
        mean: mean.toFixed(1),
      }
    }
  }
}

