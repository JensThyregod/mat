/**
 * Expression Parser Module
 * 
 * A CFG-based expression parser with:
 * - Lexer: Tokenizes strings into tokens
 * - Parser: Builds AST using recursive descent
 * - Analyzer: Finds simplification opportunities
 * - Evaluator: Computes values and simplifies
 */

// AST types
export {
  type TokenLocation,
  type ASTNode,
  type NumberNode,
  type VariableNode,
  type BinaryNode,
  type UnaryNode,
  type PowerNode,
  type SimplificationOpportunity,
  type CommonFactorOpportunity,
  type LikeTermsOpportunity,
  type ReducibleFractionOpportunity,
  // Helpers
  createNumber,
  createVariable,
  createBinary,
  createUnary,
  createPower,
  // Type guards
  isNumber,
  isVariable,
  isBinary,
  isUnary,
  isPower,
  isAdditive,
  isMultiplicative,
  isFraction,
} from './ast'

// Lexer
export {
  type Token,
  type TokenType,
  Lexer,
  tokenize,
} from './lexer'

// Parser
export {
  Parser,
  ParseError,
  parse,
  tryParse,
} from './parser'

// Analyzer
export {
  analyzeExpression,
  analyzeFraction,
  isLocationHighlighted,
  getOpportunitiesAtLocation,
} from './analyzer'

// Evaluator
export {
  type EvalResult,
  evaluate,
  tryEvaluate,
  simplify,
  astToString,
} from './evaluator'

// Convenience functions that combine parser + evaluator
import { tryParse } from './parser'
import { tryEvaluate, simplify, astToString } from './evaluator'

/**
 * Evaluate a string expression, returning the numeric result or null
 */
export function evaluateString(expr: string): number | null {
  const ast = tryParse(expr)
  if (!ast) return null
  return tryEvaluate(ast)
}

/**
 * Simplify a string expression, returning the simplified string
 */
export function simplifyString(expr: string): string {
  const ast = tryParse(expr)
  if (!ast) return expr
  const simplified = simplify(ast)
  return astToString(simplified)
}

