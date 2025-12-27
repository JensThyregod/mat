/**
 * AST Node Types for the Expression Parser
 * 
 * Grammar:
 *   Expression  → Term (('+' | '-') Term)*
 *   Term        → Factor (('*' | '/') Factor)*
 *   Factor      → Power | '-' Factor
 *   Power       → Atom ('^' number)?
 *   Atom        → number | variable | '(' Expression ')'
 */

// Token location for mapping AST nodes back to source positions
export type TokenLocation = {
  start: number
  end: number
}

// AST Node Types
export type NumberNode = {
  type: 'number'
  value: number
  location?: TokenLocation
}

export type VariableNode = {
  type: 'variable'
  name: string
  coefficient: number  // e.g., 3x has coefficient 3, x has coefficient 1
  location?: TokenLocation
}

export type BinaryNode = {
  type: 'binary'
  op: '+' | '-' | '*' | '/'
  left: ASTNode
  right: ASTNode
  location?: TokenLocation
}

export type UnaryNode = {
  type: 'unary'
  op: '-'
  operand: ASTNode
  location?: TokenLocation
}

export type PowerNode = {
  type: 'power'
  base: ASTNode
  exponent: number
  location?: TokenLocation
}

export type ASTNode = NumberNode | VariableNode | BinaryNode | UnaryNode | PowerNode

// Simplification opportunity types for UI highlighting
export type CommonFactorOpportunity = {
  type: 'common-factor'
  factor: number
  numeratorLocations: TokenLocation[]
  denominatorLocations: TokenLocation[]
}

export type LikeTermsOpportunity = {
  type: 'like-terms'
  variable: string | null  // null for constants
  exponent: number
  locations: TokenLocation[]
}

export type ReducibleFractionOpportunity = {
  type: 'reducible-fraction'
  gcd: number
  numeratorLocation: TokenLocation
  denominatorLocation: TokenLocation
}

export type SimplificationOpportunity = 
  | CommonFactorOpportunity
  | LikeTermsOpportunity
  | ReducibleFractionOpportunity

// Helper to create nodes
export const createNumber = (value: number, location?: TokenLocation): NumberNode => ({
  type: 'number',
  value,
  location,
})

export const createVariable = (name: string, coefficient = 1, location?: TokenLocation): VariableNode => ({
  type: 'variable',
  name,
  coefficient,
  location,
})

export const createBinary = (op: BinaryNode['op'], left: ASTNode, right: ASTNode, location?: TokenLocation): BinaryNode => ({
  type: 'binary',
  op,
  left,
  right,
  location,
})

export const createUnary = (operand: ASTNode, location?: TokenLocation): UnaryNode => ({
  type: 'unary',
  op: '-',
  operand,
  location,
})

export const createPower = (base: ASTNode, exponent: number, location?: TokenLocation): PowerNode => ({
  type: 'power',
  base,
  exponent,
  location,
})

// Type guards
export const isNumber = (node: ASTNode): node is NumberNode => node.type === 'number'
export const isVariable = (node: ASTNode): node is VariableNode => node.type === 'variable'
export const isBinary = (node: ASTNode): node is BinaryNode => node.type === 'binary'
export const isUnary = (node: ASTNode): node is UnaryNode => node.type === 'unary'
export const isPower = (node: ASTNode): node is PowerNode => node.type === 'power'

// Check if node is addition or subtraction
export const isAdditive = (node: ASTNode): node is BinaryNode => 
  isBinary(node) && (node.op === '+' || node.op === '-')

// Check if node is multiplication or division
export const isMultiplicative = (node: ASTNode): node is BinaryNode =>
  isBinary(node) && (node.op === '*' || node.op === '/')

// Check if node represents a fraction (division at top level)
export const isFraction = (node: ASTNode): node is BinaryNode =>
  isBinary(node) && node.op === '/'

