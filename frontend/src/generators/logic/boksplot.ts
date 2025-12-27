/**
 * Generator: stat_boksplot
 * 
 * Generates boxplot interpretation problems
 * Students must read min, Q1, median, Q3, max and compare datasets
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask, SeededRandom } from '../types'
import type { BoxplotFigure } from '../../types/taskSchema'

interface BoxplotData {
  min: number
  q1: number
  median: number
  q3: number
  max: number
}

const CONTEXTS = [
  { name: 'Klasse', items: ['9.A', '9.B', '9.C', '9.D', '9.E'], pronoun: 'Hvilken', plural: 'klasser' },
  { name: 'Hold', items: ['Hold A', 'Hold B', 'Hold C', 'Hold D', 'Hold E'], pronoun: 'Hvilket', plural: 'hold' },
  { name: 'År', items: ['2020', '2021', '2022', '2023', '2024'], pronoun: 'Hvilket', plural: 'år' },
  { name: 'By', items: ['København', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg'], pronoun: 'Hvilken', plural: 'byer' },
  { name: 'Skole', items: ['Nordskolen', 'Sydskolen', 'Østskolen', 'Vestskolen', 'Centerskolen'], pronoun: 'Hvilken', plural: 'skoler' },
  { name: 'Gruppe', items: ['Gruppe 1', 'Gruppe 2', 'Gruppe 3', 'Gruppe 4', 'Gruppe 5'], pronoun: 'Hvilken', plural: 'grupper' },
]

const MEASURES = [
  { name: 'karakterer', unit: '', axisMin: 0, axisMax: 15, dataMin: 2, dataMax: 12, step: 1 },
  { name: 'højde i cm', unit: 'cm', axisMin: 140, axisMax: 200, dataMin: 155, dataMax: 185, step: 5 },
  { name: 'antal point', unit: 'point', axisMin: 0, axisMax: 120, dataMin: 20, dataMax: 95, step: 5 },
  { name: 'løbetid i sekunder', unit: 'sek', axisMin: 0, axisMax: 80, dataMin: 15, dataMax: 55, step: 5 },
  { name: 'score på test', unit: '', axisMin: 0, axisMax: 50, dataMin: 10, dataMax: 45, step: 2 },
  { name: 'antal rigtige svar', unit: '', axisMin: 0, axisMax: 30, dataMin: 5, dataMax: 25, step: 2 },
  { name: 'hoppeafstand i cm', unit: 'cm', axisMin: 0, axisMax: 250, dataMin: 80, dataMax: 200, step: 10 },
  { name: 'ventetid i minutter', unit: 'min', axisMin: 0, axisMax: 60, dataMin: 5, dataMax: 45, step: 5 },
]

interface GeneratedQuestion {
  text: string
  answer: string
  answer_type: 'number' | 'text'
  accept_alternatives?: string[]
}

// Question templates for variety
interface QuestionTemplate {
  generate: (
    context: typeof CONTEXTS[0],
    measure: typeof MEASURES[0],
    datasets: Record<string, BoxplotData>,
    datasetNames: string[],
    rng: SeededRandom
  ) => GeneratedQuestion | null  // null if question cannot be generated with unique answer
}

/**
 * Helper: Find the unique winner for a comparison, or null if there's a tie
 */
function findUniqueExtreme(
  entries: { name: string; value: number }[],
  type: 'max' | 'min'
): { name: string; value: number } | null {
  if (entries.length === 0) return null
  
  const sorted = [...entries].sort((a, b) => 
    type === 'max' ? b.value - a.value : a.value - b.value
  )
  
  // Check if there's a tie for first place
  if (sorted.length > 1 && sorted[0].value === sorted[1].value) {
    return null
  }
  
  return sorted[0]
}

/**
 * Helper: Count how many satisfy a condition, ensuring the count is unique
 */
function countWithCondition(
  datasets: Record<string, BoxplotData>,
  condition: (d: BoxplotData) => boolean
): number {
  return Object.values(datasets).filter(condition).length
}

const QUESTION_TEMPLATES: QuestionTemplate[] = [
  // ============================================
  // BASIC READING QUESTIONS
  // ============================================
  
  // Median reading
  {
    generate: (context, measure, datasets, datasetNames, rng) => {
      const name = rng.pick(datasetNames)
      return {
        text: `Hvad er medianen for ${name}?`,
        answer: String(datasets[name].median),
        answer_type: 'number',
      }
    }
  },
  
  // Q1 reading
  {
    generate: (context, measure, datasets, datasetNames, rng) => {
      const name = rng.pick(datasetNames)
      return {
        text: `Hvad er nedre kvartil (Q1) for ${name}?`,
        answer: String(datasets[name].q1),
        answer_type: 'number',
      }
    }
  },
  
  // Q3 reading
  {
    generate: (context, measure, datasets, datasetNames, rng) => {
      const name = rng.pick(datasetNames)
      return {
        text: `Hvad er øvre kvartil (Q3) for ${name}?`,
        answer: String(datasets[name].q3),
        answer_type: 'number',
      }
    }
  },
  
  // ============================================
  // ANALYTICAL QUESTIONS - Percentile interpretation
  // ============================================
  
  // "I hvilken [context] har 75% af observationerne en værdi OVER [value]?"
  // Answer: The one where Q1 equals that value (25% below Q1, 75% above)
  {
    generate: (context, measure, datasets, datasetNames) => {
      // Find a Q1 value that is unique
      const q1Values = Object.entries(datasets).map(([name, d]) => ({ name, value: d.q1 }))
      const uniqueQ1s = q1Values.filter(item => 
        q1Values.filter(other => other.value === item.value).length === 1
      )
      
      if (uniqueQ1s.length === 0) return null
      
      // Pick one with a unique Q1
      const chosen = uniqueQ1s[0]
      
      return {
        text: `I hvilken ${context.name.toLowerCase()} har 75% af observationerne en værdi over ${chosen.value}?`,
        answer: chosen.name,
        answer_type: 'text',
      }
    }
  },
  
  // "I hvilken [context] har 25% af observationerne en værdi OVER [value]?"
  // Answer: The one where Q3 equals that value (75% below Q3, 25% above)
  {
    generate: (context, measure, datasets, datasetNames) => {
      const q3Values = Object.entries(datasets).map(([name, d]) => ({ name, value: d.q3 }))
      const uniqueQ3s = q3Values.filter(item => 
        q3Values.filter(other => other.value === item.value).length === 1
      )
      
      if (uniqueQ3s.length === 0) return null
      
      const chosen = uniqueQ3s[0]
      
      return {
        text: `I hvilken ${context.name.toLowerCase()} har 25% af observationerne en værdi over ${chosen.value}?`,
        answer: chosen.name,
        answer_type: 'text',
      }
    }
  },
  
  // "I hvilken [context] har 50% af observationerne en værdi under [value]?"
  // Answer: The one where median equals that value
  {
    generate: (context, measure, datasets, datasetNames) => {
      const medianValues = Object.entries(datasets).map(([name, d]) => ({ name, value: d.median }))
      const uniqueMedians = medianValues.filter(item => 
        medianValues.filter(other => other.value === item.value).length === 1
      )
      
      if (uniqueMedians.length === 0) return null
      
      const chosen = uniqueMedians[0]
      
      return {
        text: `I hvilken ${context.name.toLowerCase()} har 50% af observationerne en værdi under ${chosen.value}?`,
        answer: chosen.name,
        answer_type: 'text',
      }
    }
  },
  
  // "I hvilken [context] ligger de midterste 50% af observationerne mellem [Q1] og [Q3]?"
  {
    generate: (context, measure, datasets, datasetNames) => {
      // Find a dataset with unique IQR boundaries
      const iqrBounds = Object.entries(datasets).map(([name, d]) => ({ 
        name, 
        q1: d.q1, 
        q3: d.q3,
        key: `${d.q1}-${d.q3}` 
      }))
      const uniqueBounds = iqrBounds.filter(item => 
        iqrBounds.filter(other => other.key === item.key).length === 1
      )
      
      if (uniqueBounds.length === 0) return null
      
      const chosen = uniqueBounds[0]
      
      return {
        text: `I hvilken ${context.name.toLowerCase()} ligger de midterste 50% af observationerne mellem ${chosen.q1} og ${chosen.q3}?`,
        answer: chosen.name,
        answer_type: 'text',
      }
    }
  },
  
  // "Hvor mange [contexts] har mindst 75% af observationerne over [threshold]?"
  {
    generate: (context, measure, datasets, datasetNames, rng) => {
      // Pick a threshold value that exists as a Q1
      const allQ1s = [...new Set(Object.values(datasets).map(d => d.q1))].sort((a, b) => a - b)
      if (allQ1s.length === 0) return null
      
      const threshold = rng.pick(allQ1s)
      // Count datasets where Q1 >= threshold (meaning 75%+ is above threshold)
      const count = countWithCondition(datasets, d => d.q1 >= threshold)
      
      // Ensure there's a unique answer (not all or none unless it's actually that)
      if (count === 0 || count === datasetNames.length) {
        // Try with a different interpretation
        return null
      }
      
      return {
        text: `Hvor mange ${context.plural} har mindst 75% af observationerne over ${threshold}?`,
        answer: String(count),
        answer_type: 'number',
      }
    }
  },
  
  // "Hvor mange [contexts] har en median højere end [threshold]?"
  {
    generate: (context, measure, datasets, datasetNames) => {
      // Find a median value to use as threshold
      const medians = Object.values(datasets).map(d => d.median).sort((a, b) => a - b)
      // Use a value that's not the highest or lowest median
      if (medians.length < 2) return null
      
      const threshold = medians[Math.floor(medians.length / 2)]
      const count = countWithCondition(datasets, d => d.median > threshold)
      
      return {
        text: `Hvor mange ${context.plural} har en median højere end ${threshold}?`,
        answer: String(count),
        answer_type: 'number',
      }
    }
  },
  
  // ============================================
  // COMPARISON QUESTIONS  
  // ============================================
  
  // Highest median (with uniqueness check)
  {
    generate: (context, measure, datasets) => {
      const medians = Object.entries(datasets).map(([n, d]) => ({ name: n, value: d.median }))
      const winner = findUniqueExtreme(medians, 'max')
      if (!winner) return null
      
      return {
        text: `${context.pronoun} ${context.name.toLowerCase()} har den højeste median?`,
        answer: winner.name,
        answer_type: 'text',
      }
    }
  },
  
  // Lowest median (with uniqueness check)
  {
    generate: (context, measure, datasets) => {
      const medians = Object.entries(datasets).map(([n, d]) => ({ name: n, value: d.median }))
      const winner = findUniqueExtreme(medians, 'min')
      if (!winner) return null
      
      return {
        text: `${context.pronoun} ${context.name.toLowerCase()} har den laveste median?`,
        answer: winner.name,
        answer_type: 'text',
      }
    }
  },
  
  // Largest range (with uniqueness check)
  {
    generate: (context, measure, datasets) => {
      const ranges = Object.entries(datasets).map(([n, d]) => ({ name: n, value: d.max - d.min }))
      const winner = findUniqueExtreme(ranges, 'max')
      if (!winner) return null
      
      return {
        text: `${context.pronoun} ${context.name.toLowerCase()} har størst variationsbredde?`,
        answer: winner.name,
        answer_type: 'text',
      }
    }
  },
  
  // Smallest range (with uniqueness check)
  {
    generate: (context, measure, datasets) => {
      const ranges = Object.entries(datasets).map(([n, d]) => ({ name: n, value: d.max - d.min }))
      const winner = findUniqueExtreme(ranges, 'min')
      if (!winner) return null
      
      return {
        text: `${context.pronoun} ${context.name.toLowerCase()} har mindst spredning?`,
        answer: winner.name,
        answer_type: 'text',
      }
    }
  },
  
  // Largest IQR (with uniqueness check)
  {
    generate: (context, measure, datasets) => {
      const iqrs = Object.entries(datasets).map(([n, d]) => ({ name: n, value: d.q3 - d.q1 }))
      const winner = findUniqueExtreme(iqrs, 'max')
      if (!winner) return null
      
      return {
        text: `${context.pronoun} ${context.name.toLowerCase()} har størst kvartilbredde?`,
        answer: winner.name,
        answer_type: 'text',
      }
    }
  },
  
  // Smallest IQR (with uniqueness check)
  {
    generate: (context, measure, datasets) => {
      const iqrs = Object.entries(datasets).map(([n, d]) => ({ name: n, value: d.q3 - d.q1 }))
      const winner = findUniqueExtreme(iqrs, 'min')
      if (!winner) return null
      
      return {
        text: `${context.pronoun} ${context.name.toLowerCase()} har mindst kvartilbredde?`,
        answer: winner.name,
        answer_type: 'text',
      }
    }
  },
  
  // Highest max value (with uniqueness check)
  {
    generate: (context, measure, datasets) => {
      const maxes = Object.entries(datasets).map(([n, d]) => ({ name: n, value: d.max }))
      const winner = findUniqueExtreme(maxes, 'max')
      if (!winner) return null
      
      return {
        text: `${context.pronoun} ${context.name.toLowerCase()} har den højeste maksimumværdi?`,
        answer: winner.name,
        answer_type: 'text',
      }
    }
  },
  
  // Lowest min value (with uniqueness check)
  {
    generate: (context, measure, datasets) => {
      const mins = Object.entries(datasets).map(([n, d]) => ({ name: n, value: d.min }))
      const winner = findUniqueExtreme(mins, 'min')
      if (!winner) return null
      
      return {
        text: `${context.pronoun} ${context.name.toLowerCase()} har den laveste minimumværdi?`,
        answer: winner.name,
        answer_type: 'text',
      }
    }
  },
  
  // ============================================
  // NUMERIC CALCULATION QUESTIONS
  // ============================================
  
  // Variationsbredde
  {
    generate: (context, measure, datasets, datasetNames, rng) => {
      const name = rng.pick(datasetNames)
      const range = datasets[name].max - datasets[name].min
      return {
        text: `Hvad er variationsbredden for ${name}?`,
        answer: String(range),
        answer_type: 'number',
        accept_alternatives: measure.unit ? [`${range} ${measure.unit}`] : undefined,
      }
    }
  },
  
  // IQR
  {
    generate: (context, measure, datasets, datasetNames, rng) => {
      const name = rng.pick(datasetNames)
      const iqr = datasets[name].q3 - datasets[name].q1
      return {
        text: `Hvad er kvartilbredden (IQR) for ${name}?`,
        answer: String(iqr),
        answer_type: 'number',
      }
    }
  },
  
  // Difference in medians
  {
    generate: (context, measure, datasets, datasetNames, rng) => {
      if (datasetNames.length < 2) return null
      const [name1, name2] = rng.shuffle([...datasetNames]).slice(0, 2)
      const diff = Math.abs(datasets[name1].median - datasets[name2].median)
      return {
        text: `Hvad er forskellen i median mellem ${name1} og ${name2}?`,
        answer: String(diff),
        answer_type: 'number',
      }
    }
  },
]

export class BoksplotGenerator extends LogicBasedGenerator {
  readonly taskType = 'stat_boksplot'
  readonly name = 'Boksplot'

  /**
   * Generate boxplot data with nice round numbers.
   * Ensures all 5 values (min, Q1, median, Q3, max) are:
   * - Positive (> 0)
   * - Rounded to step size
   * - At least one step apart from each other
   */
  private generateBoxplotData(rng: SeededRandom, measure: typeof MEASURES[0]): BoxplotData {
    const { step, dataMin, dataMax } = measure
    
    // Round to step size, ensuring result is at least step (never 0)
    const roundToStep = (n: number) => Math.max(step, Math.round(n / step) * step)
    
    // We need 5 distinct values with at least step between each
    // So minimum range needed is 4 * step
    const minRequiredRange = step * 8 // Give more room for variety
    
    // Calculate available range
    const availableMin = Math.max(step, dataMin) // Never start at 0
    const availableMax = dataMax
    
    // Generate min: in the first portion of range
    const minVariation = Math.floor((availableMax - availableMin - minRequiredRange) * 0.3 / step)
    const min = roundToStep(availableMin + rng.int(0, Math.max(0, minVariation)) * step)
    
    // Generate max: in the last portion of range, ensuring enough room
    const maxLowerBound = min + minRequiredRange
    const maxVariation = Math.floor((availableMax - maxLowerBound) * 0.5 / step)
    const max = roundToStep(maxLowerBound + rng.int(0, Math.max(0, maxVariation)) * step)
    
    // Now we have min and max. Generate Q1, median, Q3 between them.
    // Each must be at least one step apart.
    const innerRange = max - min
    const slots = Math.floor(innerRange / step) - 1 // Number of available positions between min and max
    
    if (slots < 3) {
      // Not enough room - spread evenly
      return {
        min,
        q1: min + step,
        median: min + step * 2,
        q3: min + step * 3,
        max: min + step * 4
      }
    }
    
    // Pick 3 distinct positions for Q1, median, Q3
    // Q1 should be in first third, median in middle, Q3 in last third
    const thirdSize = Math.floor(slots / 3)
    
    // Q1: position 1 to thirdSize
    const q1Pos = 1 + rng.int(0, Math.max(0, thirdSize - 1))
    const q1 = min + q1Pos * step
    
    // Q3: position (slots - thirdSize + 1) to slots
    const q3MinPos = Math.max(q1Pos + 2, slots - thirdSize + 1)
    const q3Pos = q3MinPos + rng.int(0, Math.max(0, slots - q3MinPos))
    const q3 = min + q3Pos * step
    
    // Median: between Q1 and Q3
    const medianMinPos = q1Pos + 1
    const medianMaxPos = q3Pos - 1
    const medianPos = medianMinPos + rng.int(0, Math.max(0, medianMaxPos - medianMinPos))
    const median = min + medianPos * step
    
    return { min, q1, median, q3, max }
  }

  /**
   * Check if two boxplots are identical
   */
  private areBoxplotsIdentical(a: BoxplotData, b: BoxplotData): boolean {
    return a.min === b.min && a.q1 === b.q1 && a.median === b.median && 
           a.q3 === b.q3 && a.max === b.max
  }

  /**
   * Generate unique boxplots - retry if any two are identical
   */
  private generateUniqueBoxplots(
    rng: SeededRandom, 
    measure: typeof MEASURES[0], 
    names: string[],
    maxAttempts = 50
  ): Record<string, BoxplotData> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const datasets: Record<string, BoxplotData> = {}
      
      for (const name of names) {
        datasets[name] = this.generateBoxplotData(rng, measure)
      }
      
      // Check for duplicates
      const dataList = Object.values(datasets)
      let hasDuplicate = false
      
      for (let i = 0; i < dataList.length && !hasDuplicate; i++) {
        for (let j = i + 1; j < dataList.length && !hasDuplicate; j++) {
          if (this.areBoxplotsIdentical(dataList[i], dataList[j])) {
            hasDuplicate = true
          }
        }
      }
      
      if (!hasDuplicate) {
        return datasets
      }
    }
    
    // Fallback: just return the last attempt (very unlikely to reach here)
    const datasets: Record<string, BoxplotData> = {}
    for (const name of names) {
      datasets[name] = this.generateBoxplotData(rng, measure)
    }
    return datasets
  }

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    // Pick context and measure
    const context = rng.pick(CONTEXTS)
    const measure = rng.pick(MEASURES)
    
    // 3-5 datasets
    const numDatasets = rng.int(3, 5)
    const datasetNames = rng.shuffle([...context.items]).slice(0, numDatasets)
    
    // Generate unique boxplots (no two identical)
    const datasets = this.generateUniqueBoxplots(rng, measure, datasetNames)
    
    // Build figure with extended axis range
    const figure: BoxplotFigure = {
      type: 'boxplot',
      data: datasets,
      axisMin: measure.axisMin,
      axisMax: measure.axisMax
    }
    
    // Pick 4-5 diverse questions with unique answers
    const numQuestions = rng.int(4, 5)
    const shuffledTemplates = rng.shuffle([...QUESTION_TEMPLATES])
    const questions: GeneratedQuestion[] = []
    const usedQuestionTexts = new Set<string>()
    
    for (const template of shuffledTemplates) {
      if (questions.length >= numQuestions) break
      
      const q = template.generate(context, measure, datasets, datasetNames, rng)
      
      // Skip if question couldn't be generated (no unique answer)
      if (!q) continue
      
      // Avoid duplicate question texts
      if (usedQuestionTexts.has(q.text)) continue
      usedQuestionTexts.add(q.text)
      
      questions.push(q)
    }

    return {
      type: this.taskType,
      title: 'Boksplot',
      intro: `Boksplottene viser ${measure.name} for ${numDatasets} forskellige ${context.plural}.`,
      figure,
      questions,
      variables: { 
        context: context.name,
        measure: measure.name,
        datasets: datasetNames,
        numDatasets
      }
    }
  }
}
