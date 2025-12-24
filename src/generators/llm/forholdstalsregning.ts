/**
 * Generator: tal_forholdstalsregning
 * 
 * Generates proportion/ratio problems in recipe context
 * Uses LLM to create realistic recipes
 * 
 * Example: "En opskrift på 4 pandekager kræver 200g mel. Hvor meget mel til 10 pandekager?"
 */

import { LLMGenerator, SeededRandom, type GeneratorConfig, type GeneratedTask, type OpenAIService, type OpenAISchema } from '../types'

// ════════════════════════════════════════════════════════════════
// LLM RESPONSE SCHEMA
// ════════════════════════════════════════════════════════════════

interface Ingredient {
  name: string
  amount: number
  unit: string
}

interface ForholdLLMResponse {
  dish_name: string
  base_portions: number
  portion_word: string
  ingredients: Ingredient[]
  intro_text: string
}

const FORHOLD_SCHEMA: OpenAISchema = {
  type: 'object',
  properties: {
    dish_name: {
      type: 'string',
      description: 'Name of the dish (e.g., "pandekager", "smoothie")',
    },
    base_portions: {
      type: 'number',
      description: 'Number of portions in the base recipe (4-8)',
    },
    portion_word: {
      type: 'string',
      description: 'Word for portion (e.g., "pandekager", "portioner", "personer")',
    },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Ingredient name' },
          amount: { type: 'number', description: 'Amount in base recipe (nice round numbers like 100, 150, 200, 250, 300, 50)' },
          unit: { type: 'string', description: 'Unit (g, dL, stk, spsk)' },
        },
        required: ['name', 'amount', 'unit'],
        additionalProperties: false,
      },
      description: 'List of 3-5 ingredients with amounts',
    },
    intro_text: {
      type: 'string',
      description: 'A short intro sentence describing the recipe context',
    },
  },
  required: ['dish_name', 'base_portions', 'portion_word', 'ingredients', 'intro_text'],
  additionalProperties: false,
}

// ════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Du er en matematiklærer der laver eksamensopgaver til 9. klasse.
Lav en realistisk opskrift til en forholdstalsregning-opgave.

Krav:
- Opskriften skal være simpel og velkendt for danske teenagere
- Brug runde tal der er nemme at regne med i hovedet (50, 100, 150, 200, 250, 300)
- 3-5 ingredienser er nok
- base_portions skal være et tal mellem 4 og 8
- Enheder skal være g (gram), dL (deciliter), stk (stykker), eller spsk (spiseskefulde)

Gode eksempler på retter:
- Pandekager, smoothies, muffins, cookies
- Pasta med sauce, pizza, nachos
- Morgenmad, snacks

Undgå:
- Komplicerede retter
- Ulige tal der er svære at regne med`

// ════════════════════════════════════════════════════════════════
// GENERATOR
// ════════════════════════════════════════════════════════════════

export class ForholdstalsregningGenerator extends LLMGenerator {
  readonly taskType = 'tal_forholdstalsregning'
  readonly name = 'Forholdstalsregning'

  constructor(openai: OpenAIService) {
    super(openai)
  }

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = new SeededRandom(config?.seed)
    
    // Get recipe from LLM
    const recipe = await this.openai.generateStructured<ForholdLLMResponse>(
      SYSTEM_PROMPT,
      'Lav en ny opskrift til en forholdstalsregning-opgave.',
      FORHOLD_SCHEMA,
      'recipe_context'
    )
    
    // Calculate target portions (must scale nicely)
    const scalingFactors = [1.5, 2, 2.5, 3]
    const scaleFactor = rng.pick(scalingFactors)
    const targetPortions = recipe.base_portions * scaleFactor
    
    // Pick an ingredient to ask about
    const askIngredient = rng.pick(recipe.ingredients)
    const scaledAmount = askIngredient.amount * scaleFactor
    
    // Build intro with recipe
    const ingredientList = recipe.ingredients
      .map(i => `${i.amount} ${i.unit} ${i.name}`)
      .join(', ')
    
    const intro = `${recipe.intro_text}\n\nOpskrift til ${recipe.base_portions} ${recipe.portion_word}:\n${ingredientList}`

    // Second question: how many portions with given amount
    const secondIngredient = rng.pick(recipe.ingredients.filter(i => i !== askIngredient)) || askIngredient
    const givenAmount = secondIngredient.amount * rng.pick([2, 3, 4])
    const possiblePortions = (givenAmount / secondIngredient.amount) * recipe.base_portions

    return {
      type: this.taskType,
      title: 'Forholdstalsregning',
      intro,
      figure: null,
      questions: [
        {
          text: `Hvor meget ${askIngredient.name} skal der bruges til ${targetPortions} ${recipe.portion_word}?`,
          answer: String(scaledAmount),
          answer_type: 'number',
          accept_alternatives: [`${scaledAmount} ${askIngredient.unit}`],
        },
        {
          text: `Hvor mange ${recipe.portion_word} kan man lave med ${givenAmount} ${secondIngredient.unit} ${secondIngredient.name}?`,
          answer: String(possiblePortions),
          answer_type: 'number',
        }
      ],
      variables: {
        dish: recipe.dish_name,
        basePortions: recipe.base_portions,
        targetPortions,
        scaleFactor,
        ingredients: recipe.ingredients.map(i => i.name),
      }
    }
  }
}

