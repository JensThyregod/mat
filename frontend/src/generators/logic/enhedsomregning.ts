/**
 * Generator: geo_enhedsomregning
 * 
 * Generates unit conversion problems
 * Length: mm ↔ cm ↔ m ↔ km
 * Weight: g ↔ kg
 * Volume: dL ↔ L
 * Time: timer ↔ døgn
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

interface UnitConversion {
  from: string
  to: string
  factor: number  // Multiply "from" by this to get "to"
  category: string
}

const CONVERSIONS: UnitConversion[] = [
  // Length
  { from: 'mm', to: 'cm', factor: 0.1, category: 'længde' },
  { from: 'cm', to: 'mm', factor: 10, category: 'længde' },
  { from: 'cm', to: 'm', factor: 0.01, category: 'længde' },
  { from: 'm', to: 'cm', factor: 100, category: 'længde' },
  { from: 'm', to: 'km', factor: 0.001, category: 'længde' },
  { from: 'km', to: 'm', factor: 1000, category: 'længde' },
  
  // Weight
  { from: 'g', to: 'kg', factor: 0.001, category: 'vægt' },
  { from: 'kg', to: 'g', factor: 1000, category: 'vægt' },
  
  // Volume
  { from: 'dL', to: 'L', factor: 0.1, category: 'rumfang' },
  { from: 'L', to: 'dL', factor: 10, category: 'rumfang' },
  { from: 'mL', to: 'L', factor: 0.001, category: 'rumfang' },
  { from: 'L', to: 'mL', factor: 1000, category: 'rumfang' },
  
  // Time
  { from: 'timer', to: 'døgn', factor: 1/24, category: 'tid' },
  { from: 'døgn', to: 'timer', factor: 24, category: 'tid' },
  { from: 'minutter', to: 'timer', factor: 1/60, category: 'tid' },
  { from: 'timer', to: 'minutter', factor: 60, category: 'tid' },
]

export class EnhedsomregningGenerator extends LogicBasedGenerator {
  readonly taskType = 'geo_enhedsomregning'
  readonly name = 'Enhedsomregning'

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    // Pick a conversion that gives a clean result
    const conversion = rng.pick(CONVERSIONS)
    
    // Generate a value that gives a clean result
    let value: number
    let answer: number
    
    if (conversion.factor >= 1) {
      // Multiplying up (e.g., m to cm)
      value = rng.int(1, 20)
      answer = value * conversion.factor
    } else {
      // Dividing down (e.g., cm to m)
      // Generate answer first, then calculate value
      if (conversion.factor === 0.1) {
        answer = rng.int(1, 20)
        value = answer * 10
      } else if (conversion.factor === 0.01) {
        answer = rng.int(1, 10)
        value = answer * 100
      } else if (conversion.factor === 0.001) {
        answer = rng.int(1, 10)
        value = answer * 1000
      } else if (conversion.factor === 1/24) {
        // Special case for hours to days
        const days = rng.pick([1, 2, 3, 4, 5])
        value = days * 24
        answer = days
      } else if (conversion.factor === 1/60) {
        // Special case for minutes to hours
        const hours = rng.pick([1, 2, 3, 4, 5])
        value = hours * 60
        answer = hours
      } else {
        value = rng.int(10, 100)
        answer = value * conversion.factor
      }
    }

    // Format answer nicely
    const answerStr = Number.isInteger(answer) 
      ? String(answer) 
      : answer.toFixed(2).replace(/\.?0+$/, '')

    return {
      type: this.taskType,
      title: 'Enhedsomregning',
      intro: 'Omregn følgende.',
      figure: null,
      questions: [
        {
          text: `Omregn ${value} ${conversion.from} til ${conversion.to}`,
          answer: answerStr,
          answer_type: 'number',
        }
      ],
      variables: { 
        value, 
        from: conversion.from, 
        to: conversion.to,
        category: conversion.category 
      }
    }
  }
}

