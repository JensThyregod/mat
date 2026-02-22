/**
 * Generator: stat_soejlediagram
 * 
 * Generates bar chart interpretation problems
 * Students must read values, find max/min, calculate sum and average
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'
import type { BarChartFigure } from '../../types/taskSchema'

const CONTEXTS = [
  {
    name: 'måneder',
    singular: 'måned',
    categories: ['Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni'],
    measure: 'bøger læst',
    subject: 'Magnus',
    verb: 'læste',
  },
  {
    name: 'dage',
    singular: 'dag',
    categories: ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'],
    measure: 'km løbet',
    subject: 'Anna',
    verb: 'løb',
  },
  {
    name: 'elever',
    singular: 'elev',
    categories: ['Emil', 'Sofie', 'Oliver', 'Ida', 'Noah'],
    measure: 'point scoret',
    subject: 'Eleverne',
    verb: 'scorede',
  },
  {
    name: 'uger',
    singular: 'uge',
    categories: ['Uge 1', 'Uge 2', 'Uge 3', 'Uge 4'],
    measure: 'opgaver løst',
    subject: 'Klassen',
    verb: 'løste',
  },
  {
    name: 'fag',
    singular: 'fag',
    categories: ['Dansk', 'Matematik', 'Engelsk', 'Historie', 'Naturfag'],
    measure: 'timer brugt',
    subject: 'Maria',
    verb: 'brugte',
  },
]

export class SoejlediagramGenerator extends LogicBasedGenerator {
  readonly taskType = 'stat_soejlediagram'
  readonly name = 'Søjlediagram'

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    // Pick a context
    const context = rng.pick(CONTEXTS)
    
    // Use all or some categories
    const numCategories = rng.int(4, context.categories.length)
    const categories = context.categories.slice(0, numCategories)
    
    // Generate values for each category
    const data: Record<string, number> = {}
    let sum = 0
    let maxVal = 0
    let minVal = Infinity
    let maxCat = ''
    
    for (const cat of categories) {
      const value = rng.int(1, 15)
      data[cat] = value
      sum += value
      
      if (value > maxVal) {
        maxVal = value
        maxCat = cat
      }
      if (value < minVal) {
        minVal = value
      }
    }
    
    // Calculate average (ensure it's a nice number for some tasks)
    const average = sum / categories.length
    const averageStr = Number.isInteger(average) 
      ? String(average) 
      : average.toFixed(1)
    
    // Build figure
    const figure: BarChartFigure = {
      type: 'bar_chart',
      data,
    }
    
    // Pick a category to ask about specifically
    const askAbout = rng.pick(categories)
    const askValue = data[askAbout]

    return {
      type: this.taskType,
      title: 'Søjlediagram',
      intro: `${context.subject} har registreret ${context.measure} over forskellige ${context.name}.`,
      figure,
      questions: [
        {
          text: `Hvor mange ${context.measure} viser ${askAbout}?`,
          answer: String(askValue),
          answer_type: 'number',
        },
        {
          text: `Hvilken ${context.singular} har den højeste værdi?`,
          answer: maxCat.toLowerCase(),
          answer_type: 'text',
          accept_alternatives: [maxCat, maxCat.toLowerCase()],
        },
        {
          text: `Hvor mange ${context.measure} var der i alt?`,
          answer: String(sum),
          answer_type: 'number',
        },
        {
          text: 'Hvad er gennemsnittet?',
          answer: averageStr,
          answer_type: 'number',
          accept_alternatives: [average.toFixed(2)],
        }
      ],
      variables: { 
        context: context.name,
        categories: categories.join(', '),
        sum,
        average: averageStr
      }
    }
  }
}

