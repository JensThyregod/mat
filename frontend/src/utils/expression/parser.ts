/**
 * Recursive Descent Parser for Mathematical Expressions
 * 
 * Grammar (with proper operator precedence):
 *   Expression  → Term (('+' | '-') Term)*
 *   Term        → Factor (('*' | '/') Factor)*
 *   Factor      → Power | '-' Factor
 *   Power       → Atom ('^' number)?
 *   Atom        → number | variable | '(' Expression ')'
 */

import { tokenize } from './lexer'
import type { Token, TokenType } from './lexer'
import { 
  createNumber, 
  createVariable, 
  createBinary, 
  createUnary, 
  createPower,
} from './ast'
import type { ASTNode, TokenLocation } from './ast'

export class ParseError extends Error {
  constructor(message: string, public position: number) {
    super(message)
    this.name = 'ParseError'
  }
}

export class Parser {
  private tokens: Token[] = []
  private pos: number = 0

  constructor(private input: string) {}

  parse(): ASTNode {
    this.tokens = tokenize(this.input)
    this.pos = 0
    
    const result = this.parseExpression()
    
    // Ensure we consumed all tokens (except EOF)
    if (!this.isAtEnd()) {
      throw new ParseError(
        `Unexpected token: ${this.current().value}`,
        this.current().location.start
      )
    }
    
    return result
  }

  private current(): Token {
    return this.tokens[this.pos]
  }

  private previous(): Token {
    return this.tokens[this.pos - 1]
  }

  private isAtEnd(): boolean {
    return this.current().type === 'EOF'
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false
    return this.current().type === type
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++
    return this.previous()
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance()
        return true
      }
    }
    return false
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance()
    throw new ParseError(message, this.current().location.start)
  }

  // Expression → Term (('+' | '-') Term)*
  private parseExpression(): ASTNode {
    let left = this.parseTerm()

    while (this.match('PLUS', 'MINUS')) {
      const op = this.previous()
      const right = this.parseTerm()
      const location: TokenLocation = {
        start: left.location?.start ?? 0,
        end: right.location?.end ?? 0
      }
      left = createBinary(
        op.type === 'PLUS' ? '+' : '-',
        left,
        right,
        location
      )
    }

    return left
  }

  // Term → Factor (('*' | '/') Factor)*
  private parseTerm(): ASTNode {
    let left = this.parseFactor()

    while (this.match('MULTIPLY', 'DIVIDE')) {
      const op = this.previous()
      const right = this.parseFactor()
      const location: TokenLocation = {
        start: left.location?.start ?? 0,
        end: right.location?.end ?? 0
      }
      left = createBinary(
        op.type === 'MULTIPLY' ? '*' : '/',
        left,
        right,
        location
      )
    }

    return left
  }

  // Factor → Power | '-' Factor
  private parseFactor(): ASTNode {
    if (this.match('MINUS')) {
      const op = this.previous()
      const operand = this.parseFactor()
      return createUnary(operand, {
        start: op.location.start,
        end: operand.location?.end ?? 0
      })
    }

    return this.parsePower()
  }

  // Power → Atom ('^' number)?
  private parsePower(): ASTNode {
    const base = this.parseAtom()

    if (this.match('POWER')) {
      // Expect a number for the exponent
      if (this.check('NUMBER')) {
        const expToken = this.advance()
        return createPower(base, expToken.numericValue ?? 2, {
          start: base.location?.start ?? 0,
          end: expToken.location.end
        })
      } else if (this.check('MINUS')) {
        // Handle negative exponents like x^-2
        this.advance()
        if (this.check('NUMBER')) {
          const expToken = this.advance()
          return createPower(base, -(expToken.numericValue ?? 1), {
            start: base.location?.start ?? 0,
            end: expToken.location.end
          })
        }
      }
      // If no number follows ^, default to ^2
      return createPower(base, 2, base.location)
    }

    return base
  }

  // Atom → number | variable | '(' Expression ')'
  private parseAtom(): ASTNode {
    if (this.match('NUMBER')) {
      const token = this.previous()
      return createNumber(token.numericValue ?? 0, token.location)
    }

    if (this.match('VARIABLE')) {
      const token = this.previous()
      return createVariable(token.value, 1, token.location)
    }

    if (this.match('LPAREN')) {
      const startLoc = this.previous().location
      const expr = this.parseExpression()
      const endToken = this.consume('RPAREN', "Expected ')' after expression")
      
      // Update location to include parentheses
      if (expr.location) {
        expr.location = {
          start: startLoc.start,
          end: endToken.location.end
        }
      }
      
      return expr
    }

    throw new ParseError(
      `Unexpected token: ${this.current().value || 'end of input'}`,
      this.current().location.start
    )
  }
}

// Convenience function to parse an expression string
export function parse(input: string): ASTNode {
  const parser = new Parser(input)
  return parser.parse()
}

// Try to parse, returning null on failure
export function tryParse(input: string): ASTNode | null {
  try {
    return parse(input)
  } catch {
    return null
  }
}

