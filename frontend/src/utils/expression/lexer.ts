/**
 * Lexer for Expression Parser
 * 
 * Tokenizes mathematical expressions into a stream of tokens.
 * Handles: numbers, variables (with optional coefficients), operators, parentheses, powers
 */

import type { TokenLocation } from './ast'

export type TokenType = 
  | 'NUMBER'
  | 'VARIABLE'
  | 'PLUS'
  | 'MINUS'
  | 'MULTIPLY'
  | 'DIVIDE'
  | 'POWER'
  | 'LPAREN'
  | 'RPAREN'
  | 'EOF'

export type Token = {
  type: TokenType
  value: string
  numericValue?: number  // For NUMBER tokens
  location: TokenLocation
}

export class Lexer {
  private input: string
  private pos: number = 0
  private tokens: Token[] = []

  constructor(input: string) {
    // Normalize operators
    this.input = input
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/·/g, '*')
  }

  tokenize(): Token[] {
    this.tokens = []
    this.pos = 0

    while (this.pos < this.input.length) {
      this.skipWhitespace()
      if (this.pos >= this.input.length) break

      const char = this.input[this.pos]

      if (this.isDigit(char) || (char === '.' && this.isDigit(this.peek(1)))) {
        this.readNumber()
      } else if (this.isLetter(char)) {
        this.readVariable()
      } else if (char === '+') {
        this.addToken('PLUS', '+')
      } else if (char === '-') {
        this.addToken('MINUS', '-')
      } else if (char === '*') {
        this.addToken('MULTIPLY', '*')
      } else if (char === '/') {
        this.addToken('DIVIDE', '/')
      } else if (char === '^') {
        this.addToken('POWER', '^')
      } else if (char === '(') {
        this.addToken('LPAREN', '(')
      } else if (char === ')') {
        this.addToken('RPAREN', ')')
      } else {
        // Skip unknown characters
        this.pos++
      }
    }

    // Add EOF token
    this.tokens.push({
      type: 'EOF',
      value: '',
      location: { start: this.pos, end: this.pos }
    })

    return this.tokens
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++
    }
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char)
  }

  private isLetter(char: string): boolean {
    return /[a-zA-Z]/.test(char)
  }

  private peek(offset: number = 0): string {
    const idx = this.pos + offset
    return idx < this.input.length ? this.input[idx] : ''
  }

  private addToken(type: TokenType, value: string, numericValue?: number): void {
    const start = this.pos
    this.pos += value.length
    this.tokens.push({
      type,
      value,
      numericValue,
      location: { start, end: this.pos }
    })
  }

  private readNumber(): void {
    const start = this.pos
    let value = ''

    // Read integer part
    while (this.pos < this.input.length && this.isDigit(this.input[this.pos])) {
      value += this.input[this.pos]
      this.pos++
    }

    // Read decimal part
    if (this.pos < this.input.length && this.input[this.pos] === '.') {
      value += '.'
      this.pos++
      while (this.pos < this.input.length && this.isDigit(this.input[this.pos])) {
        value += this.input[this.pos]
        this.pos++
      }
    }

    const numericValue = parseFloat(value)

    // Check if immediately followed by a variable (e.g., "3x")
    if (this.pos < this.input.length && this.isLetter(this.input[this.pos])) {
      // This is a coefficient + variable, e.g., "3x"
      // First add the number token
      this.tokens.push({
        type: 'NUMBER',
        value,
        numericValue,
        location: { start, end: this.pos }
      })
      // Then add implicit multiplication
      this.tokens.push({
        type: 'MULTIPLY',
        value: '*',
        location: { start: this.pos, end: this.pos }
      })
      // The variable will be read in the next iteration
    } else {
      this.tokens.push({
        type: 'NUMBER',
        value,
        numericValue,
        location: { start, end: this.pos }
      })
    }
  }

  private readVariable(): void {
    const start = this.pos
    let value = ''

    // Read variable name (can be multiple letters, e.g., "sin", "cos", "xy")
    while (this.pos < this.input.length && this.isLetter(this.input[this.pos])) {
      value += this.input[this.pos]
      this.pos++
    }

    // Check for subscript numbers (e.g., x1, x2)
    while (this.pos < this.input.length && this.isDigit(this.input[this.pos])) {
      value += this.input[this.pos]
      this.pos++
    }

    this.tokens.push({
      type: 'VARIABLE',
      value,
      location: { start, end: this.pos }
    })
  }
}

// Convenience function
export function tokenize(input: string): Token[] {
  const lexer = new Lexer(input)
  return lexer.tokenize()
}

