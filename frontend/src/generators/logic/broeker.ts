/**
 * Generator: tal_broeker_og_antal
 * 
 * Generates fraction and percentage problems in context
 * - Fractions of quantities
 * - Percentage calculations
 * - Part-whole relationships
 * 
 * Pure logic - no LLM required
 */

import { LogicBasedGenerator, type GeneratorConfig, type GeneratedTask } from '../types'

// Context scenarios for fraction problems
const FRACTION_CONTEXTS = [
  {
    introTemplate: 'Der er {total} elever i en klasse.',
    findTotalTemplate: 'I en klasse er {fraction} af eleverne {subgroup}.',
    total: 24,
    item: 'elever',
    fractions: [
      { fraction: '\\frac{1}{2}', decimal: 0.5, description: 'halvdelen' },
      { fraction: '\\frac{1}{3}', decimal: 1/3, description: 'en tredjedel' },
      { fraction: '\\frac{1}{4}', decimal: 0.25, description: 'en fjerdedel' },
      { fraction: '\\frac{2}{3}', decimal: 2/3, description: 'to tredjedele' },
      { fraction: '\\frac{3}{4}', decimal: 0.75, description: 'tre fjerdedele' },
    ],
    subgroups: ['piger', 'drenge', 'elever med briller', 'elever der cykler til skole'],
  },
  {
    introTemplate: 'Til en fest er der bestilt {total} pizzaer.',
    findTotalTemplate: 'Til en fest er {fraction} af pizzaerne {subgroup}.',
    total: 12,
    item: 'pizzaer',
    fractions: [
      { fraction: '\\frac{1}{2}', decimal: 0.5, description: 'halvdelen' },
      { fraction: '\\frac{1}{3}', decimal: 1/3, description: 'en tredjedel' },
      { fraction: '\\frac{1}{4}', decimal: 0.25, description: 'en fjerdedel' },
      { fraction: '\\frac{1}{6}', decimal: 1/6, description: 'en sjettedel' },
    ],
    subgroups: ['vegetar', 'med pepperoni', 'med skinke', 'med ost'],
  },
  {
    introTemplate: 'Der er {total} bøger i en bogsamling.',
    findTotalTemplate: 'I en bogsamling er {fraction} af bøgerne {subgroup}.',
    total: 60,
    item: 'bøger',
    fractions: [
      { fraction: '\\frac{1}{2}', decimal: 0.5, description: 'halvdelen' },
      { fraction: '\\frac{1}{3}', decimal: 1/3, description: 'en tredjedel' },
      { fraction: '\\frac{1}{4}', decimal: 0.25, description: 'en fjerdedel' },
      { fraction: '\\frac{1}{5}', decimal: 0.2, description: 'en femtedel' },
      { fraction: '\\frac{2}{5}', decimal: 0.4, description: 'to femtedele' },
    ],
    subgroups: ['krimier', 'fantasy', 'fagbøger', 'tegneserier'],
  },
  {
    introTemplate: 'Der er {total} stykker slik i en pose.',
    findTotalTemplate: 'I en pose med slik er {fraction} af stykkerne {subgroup}.',
    total: 30,
    item: 'stykker slik',
    fractions: [
      { fraction: '\\frac{1}{2}', decimal: 0.5, description: 'halvdelen' },
      { fraction: '\\frac{1}{3}', decimal: 1/3, description: 'en tredjedel' },
      { fraction: '\\frac{1}{5}', decimal: 0.2, description: 'en femtedel' },
      { fraction: '\\frac{2}{5}', decimal: 0.4, description: 'to femtedele' },
    ],
    subgroups: ['chokolade', 'vingummi', 'lakrids', 'bolsjer'],
  },
]

// Percentage contexts
const PERCENTAGE_CONTEXTS = [
  { context: 'elever i en klasse', total: 25, item: 'elever' },
  { context: 'biler på en parkeringsplads', total: 80, item: 'biler' },
  { context: 'æbler i en kasse', total: 50, item: 'æbler' },
  { context: 'mål i en fodboldturnering', total: 40, item: 'mål' },
]

export class BroekerGenerator extends LogicBasedGenerator {
  readonly taskType = 'tal_broeker_og_antal'
  readonly name = 'Brøker og antal'

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = this.createRng(config?.seed)
    
    // Pick problem type
    const problemType = rng.pick(['fraction_of_total', 'find_total', 'percentage'] as const)
    
    let intro: string
    let questions: Array<{ text: string; answer: string; answer_type: 'number' | 'fraction'; accept_alternatives?: string[] }>
    
    switch (problemType) {
      case 'fraction_of_total': {
        const scenario = rng.pick(FRACTION_CONTEXTS)
        const fractionInfo = rng.pick(scenario.fractions)
        const subgroup = rng.pick(scenario.subgroups)
        
        // Calculate result (ensure it's a whole number)
        const result = Math.round(scenario.total * fractionInfo.decimal)
        
        intro = scenario.introTemplate.replace('{total}', String(scenario.total))
        
        questions = [
          {
            text: `${fractionInfo.description.charAt(0).toUpperCase() + fractionInfo.description.slice(1)} af ${scenario.item} er ${subgroup}. Hvor mange ${subgroup} er der?`,
            answer: String(result),
            answer_type: 'number',
          },
          {
            text: `Skriv \\(${fractionInfo.fraction}\\) som decimaltal.`,
            answer: fractionInfo.decimal === 1/3 ? '0,33' : fractionInfo.decimal === 2/3 ? '0,67' : String(fractionInfo.decimal).replace('.', ','),
            answer_type: 'number',
            accept_alternatives: [
              String(fractionInfo.decimal),
              String(Math.round(fractionInfo.decimal * 100) / 100).replace('.', ','),
            ],
          },
        ]
        break
      }
      
      case 'find_total': {
        const scenario = rng.pick(FRACTION_CONTEXTS)
        const fractionInfo = rng.pick(scenario.fractions.filter(f => f.decimal >= 0.25))
        const subgroup = rng.pick(scenario.subgroups)
        
        // Calculate the part
        const part = Math.round(scenario.total * fractionInfo.decimal)
        
        // Use template and add the count information
        const mainIntro = scenario.findTotalTemplate
          .replace('{fraction}', fractionInfo.description)
          .replace('{subgroup}', subgroup)
        intro = `${mainIntro}\n\nDer er ${part} ${subgroup}.`
        
        questions = [
          {
            text: `Hvor mange ${scenario.item} er der i alt?`,
            answer: String(scenario.total),
            answer_type: 'number',
          },
          {
            text: `Hvor mange ${scenario.item} er IKKE ${subgroup}?`,
            answer: String(scenario.total - part),
            answer_type: 'number',
          },
        ]
        break
      }
      
      case 'percentage': {
        const scenario = rng.pick(PERCENTAGE_CONTEXTS)
        const percent = rng.pick([10, 20, 25, 40, 50, 75])
        const part = (scenario.total * percent) / 100
        
        intro = `Der er ${scenario.total} ${scenario.item} ${scenario.context.includes('i en') ? 'i en' : 'på en'} ${scenario.context.replace(/^.*?(klasse|parkeringsplads|kasse|turnering).*$/, '$1')}.`
        
        questions = [
          {
            text: `Hvor mange er ${percent}% af ${scenario.total}?`,
            answer: String(part),
            answer_type: 'number',
          },
          {
            text: `Skriv ${percent}% som en brøk.`,
            answer: percent === 10 ? '1/10' : percent === 20 ? '1/5' : percent === 25 ? '1/4' : percent === 40 ? '2/5' : percent === 50 ? '1/2' : '3/4',
            answer_type: 'fraction',
            accept_alternatives: [`\\frac{${percent}}{100}`],
          },
        ]
        break
      }
    }

    return {
      type: this.taskType,
      title: 'Brøker, decimaltal og procent',
      intro,
      figure: null,
      questions,
      variables: {
        problemType,
      }
    }
  }
}

