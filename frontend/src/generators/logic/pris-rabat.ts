/**
 * Generator: tal_pris_rabat_procent
 * 
 * Generates price, discount, and percentage problems
 * Uses pure logic with randomized realistic scenarios
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

// Predefined scenarios for variety
const SCENARIOS = [
  {
    store: 'sportsbutik',
    products: [
      { name: 'fodbold', prices: [80, 100, 120, 150] },
      { name: 'løbesko', prices: [200, 250, 300, 400] },
      { name: 'rygsæk', prices: [150, 200, 250] },
      { name: 'vandflasker', prices: [50, 80, 100] },
    ],
    discountReasons: ['weekendtilbud', 'medlemsrabat', 'sommersalg'],
  },
  {
    store: 'tøjbutik',
    products: [
      { name: 't-shirt', prices: [100, 150, 200] },
      { name: 'jeans', prices: [200, 250, 300, 400] },
      { name: 'jakke', prices: [300, 400, 500] },
      { name: 'hættetrøje', prices: [200, 250, 300] },
    ],
    discountReasons: ['udsalg', 'Black Friday tilbud', 'vinterbud'],
  },
  {
    store: 'elektronikbutik',
    products: [
      { name: 'høretelefoner', prices: [150, 200, 250, 300] },
      { name: 'oplader', prices: [50, 80, 100, 150] },
      { name: 'cover', prices: [80, 100, 150] },
      { name: 'powerbank', prices: [100, 150, 200] },
    ],
    discountReasons: ['studierabat', 'weekend-deal', 'lagerudsalg'],
  },
  {
    store: 'boghandel',
    products: [
      { name: 'bog', prices: [80, 100, 150, 200] },
      { name: 'penalhus', prices: [50, 80, 100] },
      { name: 'kalender', prices: [100, 150, 200] },
      { name: 'notesbog', prices: [40, 60, 80] },
    ],
    discountReasons: ['skolestart-tilbud', 'medlemsrabat', 'julesalg'],
  },
  {
    store: 'legetøjsbutik',
    products: [
      { name: 'LEGO-sæt', prices: [200, 300, 400, 500] },
      { name: 'brætspil', prices: [150, 200, 250] },
      { name: 'puslespil', prices: [80, 100, 150] },
      { name: 'actionfigur', prices: [100, 150, 200] },
    ],
    discountReasons: ['fødselsdag-tilbud', 'julesalg', 'lagersalg'],
  },
]

const DISCOUNT_PERCENTS = [10, 15, 20, 25, 30, 40, 50]

export class PrisRabatGenerator extends LogicBasedGenerator {
  readonly taskType = 'tal_pris_rabat_procent'
  readonly name = 'Pris, rabat og procent'

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    // Pick random scenario
    const scenario = rng.pick(SCENARIOS)
    
    // Pick 2 different products
    const availableProducts = rng.shuffle([...scenario.products])
    const product1 = availableProducts[0]
    const product2 = availableProducts[1]
    
    const price1 = rng.pick(product1.prices)
    const price2 = rng.pick(product2.prices)
    const discountReason = rng.pick(scenario.discountReasons)
    
    // Find a discount that gives clean numbers
    const totalBeforeDiscount = price1 + price2
    
    // Pick discount that results in whole numbers
    let discountPercent = rng.pick(DISCOUNT_PERCENTS)
    let discountAmount = (totalBeforeDiscount * discountPercent) / 100
    
    // If not whole number, try to find one that works
    if (!Number.isInteger(discountAmount)) {
      for (const dp of DISCOUNT_PERCENTS) {
        const testAmount = (totalBeforeDiscount * dp) / 100
        if (Number.isInteger(testAmount)) {
          discountPercent = dp
          discountAmount = testAmount
          break
        }
      }
    }
    
    // Fallback: ensure clean numbers
    if (!Number.isInteger(discountAmount)) {
      discountPercent = 20
      discountAmount = Math.round((totalBeforeDiscount * discountPercent) / 100)
    }
    
    const totalAfterDiscount = totalBeforeDiscount - discountAmount
    
    // Build intro
    const intro = `I en ${scenario.store} koster en ${product1.name} ${price1} kr og en ${product2.name} koster ${price2} kr.\n\nDer er ${discountPercent}% ${discountReason} på alle varer.`

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
          answer: String(discountAmount),
          answer_type: 'number',
          accept_alternatives: [`${discountAmount} kr`],
        },
        {
          text: 'Hvad er den samlede pris efter rabat?',
          answer: String(totalAfterDiscount),
          answer_type: 'number',
          accept_alternatives: [`${totalAfterDiscount} kr`],
        }
      ],
      variables: {
        store: scenario.store,
        product1: product1.name,
        price1,
        product2: product2.name,
        price2,
        discountPercent,
        discountReason,
      }
    }
  }
}

