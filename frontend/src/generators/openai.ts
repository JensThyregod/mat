/**
 * OpenAI Service
 * 
 * Handles communication with OpenAI API for structured output generation.
 * Uses the JSON mode with schema validation for reliable task generation.
 */

import type { OpenAIService, OpenAISchema } from './types'

// ════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL = 'gpt-4o-mini'

export interface OpenAIConfig {
  apiKey: string
  model?: string
  maxTokens?: number
  temperature?: number
}

// ════════════════════════════════════════════════════════════════
// OPENAI SERVICE IMPLEMENTATION
// ════════════════════════════════════════════════════════════════

export class OpenAI implements OpenAIService {
  private readonly apiKey: string
  private readonly model: string
  private readonly maxTokens: number
  private readonly temperature: number

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey
    this.model = config.model ?? DEFAULT_MODEL
    this.maxTokens = config.maxTokens ?? 1000
    this.temperature = config.temperature ?? 0.7
  }

  /**
   * Generate structured output using OpenAI's response_format feature
   */
  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: OpenAISchema,
    schemaName: string
  ): Promise<T> {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: schemaName,
            strict: true,
            schema: schema,
          },
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content in OpenAI response')
    }

    try {
      return JSON.parse(content) as T
    } catch {
      throw new Error(`Failed to parse OpenAI response as JSON: ${content}`)
    }
  }
}

// ════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ════════════════════════════════════════════════════════════════

let instance: OpenAI | null = null

export function getOpenAI(apiKey?: string): OpenAI {
  if (!instance) {
    const key = apiKey ?? import.meta.env.VITE_OPENAI_API_KEY
    if (!key) {
      throw new Error('OpenAI API key not provided. Set VITE_OPENAI_API_KEY or pass it to getOpenAI()')
    }
    instance = new OpenAI({ apiKey: key })
  }
  return instance
}

export function initOpenAI(config: OpenAIConfig): OpenAI {
  instance = new OpenAI(config)
  return instance
}

