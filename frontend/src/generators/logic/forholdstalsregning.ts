/**
 * Generator: tal_forholdstalsregning
 * 
 * Generates proportion and ratio problems
 * - Recipes scaled up/down
 * - Mixing ratios
 * - Division by ratio
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

// Recipe scenarios
const RECIPE_SCENARIOS = [
  {
    dish: 'pandekager',
    baseServings: 4,
    ingredients: [
      { name: 'mel', amount: 200, unit: 'g' },
      { name: 'mælk', amount: 400, unit: 'ml' },
      { name: 'æg', amount: 2, unit: 'stk' },
    ],
  },
  {
    dish: 'smoothie',
    baseServings: 2,
    ingredients: [
      { name: 'banan', amount: 2, unit: 'stk' },
      { name: 'yoghurt', amount: 200, unit: 'ml' },
      { name: 'jordbær', amount: 150, unit: 'g' },
    ],
  },
  {
    dish: 'boller',
    baseServings: 10,
    ingredients: [
      { name: 'mel', amount: 500, unit: 'g' },
      { name: 'gær', amount: 25, unit: 'g' },
      { name: 'mælk', amount: 250, unit: 'ml' },
    ],
  },
  {
    dish: 'pasta med kødsovs',
    baseServings: 4,
    ingredients: [
      { name: 'hakket oksekød', amount: 400, unit: 'g' },
      { name: 'pasta', amount: 300, unit: 'g' },
      { name: 'tomatsovs', amount: 500, unit: 'ml' },
    ],
  },
  {
    dish: 'cookies',
    baseServings: 20,
    ingredients: [
      { name: 'smør', amount: 200, unit: 'g' },
      { name: 'sukker', amount: 150, unit: 'g' },
      { name: 'chokolade', amount: 200, unit: 'g' },
    ],
  },
]

// Mixing ratio scenarios
const MIXING_SCENARIOS = [
  { context: 'saftevand', item1: 'saft', item2: 'vand', ratios: [[1, 4], [1, 5], [2, 5]] },
  { context: 'maling', item1: 'hvid maling', item2: 'blå maling', ratios: [[1, 2], [2, 3], [3, 4]] },
  { context: 'beton', item1: 'cement', item2: 'sand', ratios: [[1, 3], [1, 4], [2, 5]] },
]

export class ForholdstalsregningGenerator extends LogicBasedGenerator {
  readonly taskType = 'tal_forholdstalsregning'
  readonly name = 'Forholdstalsregning'

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    // Pick problem type
    const problemType = rng.pick(['recipe_scale_up', 'recipe_scale_down', 'mixing_ratio'] as const)
    
    let intro: string
    let questions: Array<{ text: string; answer: string; answer_type: 'number'; accept_alternatives?: string[] }>
    
    switch (problemType) {
      case 'recipe_scale_up': {
        const recipe = rng.pick(RECIPE_SCENARIOS)
        const multiplier = rng.pick([2, 3, 4])
        const targetServings = recipe.baseServings * multiplier
        
        const ingredient = rng.pick(recipe.ingredients)
        const scaledAmount = ingredient.amount * multiplier
        
        intro = `En opskrift på ${recipe.dish} er beregnet til ${recipe.baseServings} personer.\n\nOpskriften bruger ${ingredient.amount} ${ingredient.unit} ${ingredient.name}.`
        
        questions = [
          {
            text: `Hvor meget ${ingredient.name} skal der bruges til ${targetServings} personer?`,
            answer: String(scaledAmount),
            answer_type: 'number',
            accept_alternatives: [`${scaledAmount} ${ingredient.unit}`],
          },
          {
            text: `Hvor mange gange skal opskriften ganges op for at lave ${targetServings} portioner?`,
            answer: String(multiplier),
            answer_type: 'number',
          },
        ]
        break
      }
      
      case 'recipe_scale_down': {
        const recipe = rng.pick(RECIPE_SCENARIOS.filter(r => r.baseServings >= 4))
        const divisor = rng.pick([2, 4])
        const targetServings = recipe.baseServings / divisor
        
        const ingredient = rng.pick(recipe.ingredients.filter(i => i.amount >= divisor * 2))
        const scaledAmount = ingredient.amount / divisor
        
        intro = `En opskrift på ${recipe.dish} er beregnet til ${recipe.baseServings} personer.\n\nOpskriften bruger ${ingredient.amount} ${ingredient.unit} ${ingredient.name}.`
        
        questions = [
          {
            text: `Hvor meget ${ingredient.name} skal der bruges til ${targetServings} personer?`,
            answer: String(scaledAmount),
            answer_type: 'number',
            accept_alternatives: [`${scaledAmount} ${ingredient.unit}`],
          },
          {
            text: `Hvis man har ${ingredient.amount * 2} ${ingredient.unit} ${ingredient.name}, hvor mange personer kan man lave ${recipe.dish} til?`,
            answer: String(recipe.baseServings * 2),
            answer_type: 'number',
          },
        ]
        break
      }
      
      case 'mixing_ratio': {
        const scenario = rng.pick(MIXING_SCENARIOS)
        const [ratio1, ratio2] = rng.pick(scenario.ratios)
        const totalParts = ratio1 + ratio2
        
        // Pick a total amount that divides evenly
        const multiplier = rng.pick([2, 3, 4, 5, 6])
        const totalAmount = totalParts * multiplier
        
        const amount1 = ratio1 * multiplier
        const amount2 = ratio2 * multiplier
        
        intro = `Til at lave ${scenario.context} blander man ${scenario.item1} og ${scenario.item2} i forholdet ${ratio1}:${ratio2}.`
        
        questions = [
          {
            text: `Hvis man vil lave ${totalAmount} liter ${scenario.context}, hvor meget ${scenario.item1} skal man bruge?`,
            answer: String(amount1),
            answer_type: 'number',
            accept_alternatives: [`${amount1} liter`, `${amount1} l`],
          },
          {
            text: `Hvor meget ${scenario.item2} skal man bruge til ${totalAmount} liter?`,
            answer: String(amount2),
            answer_type: 'number',
            accept_alternatives: [`${amount2} liter`, `${amount2} l`],
          },
        ]
        break
      }
    }

    return {
      type: this.taskType,
      title: 'Forholdstalsregning',
      intro,
      figure: null,
      questions,
      variables: {
        problemType,
      }
    }
  }
}

