/**
 * Generator: tal_broeker_og_antal
 * 
 * Generates fraction problems in everyday context
 * Uses LLM to create realistic scenarios
 * 
 * Example: "I en klasse er 7/18 af eleverne 16 år. Der er 36 elever."
 */

import { LLMGenerator, SeededRandom, type GeneratorConfig, type GeneratedTask, type OpenAIService, type OpenAISchema } from '../types'

// ════════════════════════════════════════════════════════════════
// LLM RESPONSE SCHEMA
// ════════════════════════════════════════════════════════════════

interface BroekerLLMResponse {
  context: string
  property: string
  subject: string
  intro_sentence: string
}

const BROEKER_SCHEMA: OpenAISchema = {
  type: 'object',
  properties: {
    context: {
      type: 'string',
      description: 'The context (e.g., "klasse", "hold", "forening")',
    },
    property: {
      type: 'string',
      description: 'The property being counted (e.g., "er 16 år", "spiller fodbold")',
    },
    subject: {
      type: 'string',
      description: 'The subject being counted (e.g., "elever", "medlemmer")',
    },
    intro_sentence: {
      type: 'string',
      description: 'A complete intro sentence in Danish with LaTeX fraction placeholder {FRACTION} and total placeholder {TOTAL}',
    },
  },
  required: ['context', 'property', 'subject', 'intro_sentence'],
  additionalProperties: false,
}

// ════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Du er en matematiklærer der laver eksamensopgaver til 9. klasse.
Lav en realistisk hverdagskontekst for en brøkopgave.

Krav:
- Konteksten skal være relaterbar for danske 9. klasses elever
- Brug naturligt dansk sprog
- Intro-sætningen skal indeholde placeholders {FRACTION} og {TOTAL}
- {FRACTION} vil blive erstattet med LaTeX brøk som \\(\\tfrac{7}{18}\\)
- {TOTAL} vil blive erstattet med det samlede antal

Eksempler på gode kontekster:
- Elever i en klasse (alder, hobbyer, transportmiddel)
- Medlemmer i en forening (sport, musik)
- Deltagere på en lejrskole
- Ansatte i en butik

Undgå:
- For komplekse scenarier
- Urealistiske situationer
- Samme kontekst som i prompten`

// ════════════════════════════════════════════════════════════════
// GENERATOR
// ════════════════════════════════════════════════════════════════

export class BroekerGenerator extends LLMGenerator {
  readonly taskType = 'tal_broeker_og_antal'
  readonly name = 'Brøker og antal'

  constructor(openai: OpenAIService) {
    super(openai)
  }

  async generate(config?: GeneratorConfig): Promise<GeneratedTask> {
    const rng = new SeededRandom(config?.seed)
    
    // Generate fraction (ensure clean answer when applied to total)
    const denominators = [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20]
    const denominator = rng.pick(denominators)
    const numerator = rng.int(1, denominator - 1)
    
    // Total must be divisible by denominator for clean answer
    const multiplier = rng.int(2, 4)
    const total = denominator * multiplier
    
    // Calculate answers
    const countWithProperty = (numerator * total) / denominator
    const complementNumerator = denominator - numerator
    const complementFraction = `${complementNumerator}/${denominator}`
    
    // Get creative context from LLM
    const llmResponse = await this.openai.generateStructured<BroekerLLMResponse>(
      SYSTEM_PROMPT,
      `Lav en ny kontekst for en brøkopgave. Brøken er ${numerator}/${denominator} og det totale antal er ${total}.`,
      BROEKER_SCHEMA,
      'broeker_context'
    )
    
    // Build intro with actual values
    const fraction = `\\tfrac{${numerator}}{${denominator}}`
    const intro = llmResponse.intro_sentence
      .replace('{FRACTION}', `\\(${fraction}\\)`)
      .replace('{TOTAL}', String(total))

    return {
      type: this.taskType,
      title: 'Brøker og antal',
      intro,
      figure: null,
      questions: [
        {
          text: `Hvor stor en brøkdel af ${llmResponse.subject} ${llmResponse.property} ikke?`,
          answer: complementFraction,
          answer_type: 'fraction',
          accept_alternatives: [`${complementNumerator}/${denominator}`],
        },
        {
          text: `Hvor mange af ${llmResponse.subject} ${llmResponse.property}?`,
          answer: String(countWithProperty),
          answer_type: 'number',
        }
      ],
      variables: {
        numerator,
        denominator,
        total,
        context: llmResponse.context,
        property: llmResponse.property,
      }
    }
  }
}

