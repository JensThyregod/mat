/**
 * Generator: tal_pris_rabat_procent
 * 
 * Generates price, discount, and percentage problems
 * Uses LLM to create realistic shopping scenarios
 * 
 * Example: "En pung koster 120 kr og en taske koster 80 kr. Der er 25% rabat."
 */

import { LLMGenerator, SeededRandom, type GeneratorConfig, type GeneratedTask, type OpenAIService, type OpenAISchema } from '../types'

// ════════════════════════════════════════════════════════════════
// LLM RESPONSE SCHEMA
// ════════════════════════════════════════════════════════════════

interface Product {
  name: string
  price: number
}

interface PrisRabatLLMResponse {
  store_type: string
  intro_sentence: string
  products: Product[]
  discount_reason: string
}

const PRIS_RABAT_SCHEMA: OpenAISchema = {
  type: 'object',
  properties: {
    store_type: {
      type: 'string',
      description: 'Type of store (e.g., "sportsbutik", "tøjbutik", "elektronikbutik")',
    },
    intro_sentence: {
      type: 'string',
      description: 'A short sentence introducing the shopping scenario',
    },
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Product name' },
          price: { type: 'number', description: 'Price in kr (nice round numbers: 50, 80, 100, 120, 150, 200, 250, 300)' },
        },
        required: ['name', 'price'],
        additionalProperties: false,
      },
      description: 'List of 2 products with prices',
    },
    discount_reason: {
      type: 'string',
      description: 'Reason for discount (e.g., "weekendtilbud", "udsalg", "medlemsrabat")',
    },
  },
  required: ['store_type', 'intro_sentence', 'products', 'discount_reason'],
  additionalProperties: false,
}

// ════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Du er en matematiklærer der laver eksamensopgaver til 9. klasse.
Lav et realistisk indkøbsscenarie til en pris/rabat opgave.

Krav:
- Scenariet skal være relaterbart for danske teenagere
- Brug runde priser der er nemme at regne med (50, 80, 100, 120, 150, 200, 250, 300 kr)
- Præcis 2 produkter
- Priserne skal give pæne tal når man beregner rabat (10%, 20%, 25%, 50%)
- Summen af priserne bør være delelig med 4 eller 5 for pæne procentberegninger

Gode butikstyper:
- Sportsbutik (sko, bold, tasker)
- Tøjbutik (t-shirts, bukser, jakker)
- Elektronikbutik (høretelefoner, covers, ladere)
- Boghandel (bøger, penalhuse, kalendere)

Rabatårsager:
- Weekendtilbud, udsalg, Black Friday, sommersalg
- Medlemsrabat, studentrabat, morgenrabat`

// ════════════════════════════════════════════════════════════════
// GENERATOR
// ════════════════════════════════════════════════════════════════

export class PrisRabatGenerator extends LLMGenerator {
  readonly taskType = 'tal_pris_rabat_procent'
  readonly name = 'Pris, rabat og procent'

  constructor(openai: OpenAIService) {
    super(openai)
  }

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = new SeededRandom(config?.seed)
    
    // Get scenario from LLM
    const scenario = await this.openai.generateStructured<PrisRabatLLMResponse>(
      SYSTEM_PROMPT,
      'Lav et nyt indkøbsscenarie til en pris/rabat opgave.',
      PRIS_RABAT_SCHEMA,
      'shopping_context'
    )
    
    // Ensure we have exactly 2 products
    const products = scenario.products.slice(0, 2)
    if (products.length < 2) {
      products.push({ name: 'vare', price: 100 })
    }
    
    // Pick a discount percentage that gives clean numbers
    const totalBeforeDiscount = products[0].price + products[1].price
    const discountOptions = [10, 20, 25, 50]
    
    // Find a discount that gives a clean result
    let discountPercent = rng.pick(discountOptions)
    const discountAmount = (totalBeforeDiscount * discountPercent) / 100
    const totalAfterDiscount = totalBeforeDiscount - discountAmount
    
    // Adjust if not clean
    if (!Number.isInteger(discountAmount)) {
      discountPercent = 20 // Fallback to 20%
    }
    
    const finalDiscountAmount = (totalBeforeDiscount * discountPercent) / 100
    const finalTotalAfter = totalBeforeDiscount - finalDiscountAmount
    
    // Build intro
    const productDesc = products.map(p => `${p.name} til ${p.price} kr`).join(' og ')
    const intro = `${scenario.intro_sentence}\n\nI en ${scenario.store_type} koster ${productDesc}.\nDer er ${discountPercent}% ${scenario.discount_reason} på alle varer.`

    return {
      type: this.taskType,
      title: 'Pris, rabat og procent',
      intro,
      figure: null,
      questions: [
        {
          text: 'Hvad koster de to varer tilsammen før rabat?',
          answer: String(totalBeforeDiscount),
          answer_type: 'number',
          accept_alternatives: [`${totalBeforeDiscount} kr`],
        },
        {
          text: 'Hvor meget sparer man i alt med rabatten?',
          answer: String(finalDiscountAmount),
          answer_type: 'number',
          accept_alternatives: [`${finalDiscountAmount} kr`],
        },
        {
          text: 'Hvad er den samlede pris efter rabat?',
          answer: String(finalTotalAfter),
          answer_type: 'number',
          accept_alternatives: [`${finalTotalAfter} kr`],
        }
      ],
      variables: {
        store: scenario.store_type,
        product1: products[0].name,
        price1: products[0].price,
        product2: products[1].name,
        price2: products[1].price,
        discountPercent,
        discountReason: scenario.discount_reason,
      }
    }
  }
}

