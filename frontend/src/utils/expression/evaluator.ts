/**
 * Expression Evaluator
 * 
 * Evaluates AST nodes to compute numeric values.
 * Also provides simplification utilities.
 */

import {
  isNumber,
  isVariable,
  isBinary,
  isUnary,
  isPower,
  createNumber,
  createBinary,
  createUnary,
  createVariable,
  createPower,
} from './ast'
import type { ASTNode } from './ast'

// Result of evaluation - either a number or an expression with variables
export type EvalResult = 
  | { type: 'number'; value: number }
  | { type: 'expression'; node: ASTNode }

/**
 * Evaluate an AST node, returning a numeric result if possible
 */
export function evaluate(node: ASTNode): EvalResult {
  if (isNumber(node)) {
    return { type: 'number', value: node.value }
  }

  if (isVariable(node)) {
    // Can't evaluate a variable to a number
    return { type: 'expression', node }
  }

  if (isUnary(node)) {
    const result = evaluate(node.operand)
    if (result.type === 'number') {
      return { type: 'number', value: -result.value }
    }
    return { type: 'expression', node }
  }

  if (isPower(node)) {
    const baseResult = evaluate(node.base)
    if (baseResult.type === 'number') {
      return { type: 'number', value: Math.pow(baseResult.value, node.exponent) }
    }
    return { type: 'expression', node }
  }

  if (isBinary(node)) {
    const left = evaluate(node.left)
    const right = evaluate(node.right)

    if (left.type === 'number' && right.type === 'number') {
      switch (node.op) {
        case '+':
          return { type: 'number', value: left.value + right.value }
        case '-':
          return { type: 'number', value: left.value - right.value }
        case '*':
          return { type: 'number', value: left.value * right.value }
        case '/':
          if (right.value === 0) {
            return { type: 'expression', node } // Can't divide by zero
          }
          return { type: 'number', value: left.value / right.value }
      }
    }

    return { type: 'expression', node }
  }

  return { type: 'expression', node }
}

/**
 * Try to evaluate to a number, returning null if not possible
 */
export function tryEvaluate(node: ASTNode): number | null {
  const result = evaluate(node)
  return result.type === 'number' ? result.value : null
}

/**
 * Simplify an AST by evaluating constant subexpressions
 */
export function simplify(node: ASTNode): ASTNode {
  // First, try to evaluate the whole thing
  const wholeResult = evaluate(node)
  if (wholeResult.type === 'number') {
    return createNumber(wholeResult.value, node.location)
  }

  // Otherwise, simplify children
  if (isUnary(node)) {
    const simplified = simplify(node.operand)
    const result = tryEvaluate(simplified)
    if (result !== null) {
      return createNumber(-result, node.location)
    }
    return createUnary(simplified, node.location)
  }

  if (isPower(node)) {
    const simplified = simplify(node.base)
    const result = tryEvaluate(simplified)
    if (result !== null) {
      return createNumber(Math.pow(result, node.exponent), node.location)
    }
    return createPower(simplified, node.exponent, node.location)
  }

  if (isBinary(node)) {
    const left = simplify(node.left)
    const right = simplify(node.right)

    const leftVal = tryEvaluate(left)
    const rightVal = tryEvaluate(right)

    // If both are numbers, compute
    if (leftVal !== null && rightVal !== null) {
      let result: number
      switch (node.op) {
        case '+': result = leftVal + rightVal; break
        case '-': result = leftVal - rightVal; break
        case '*': result = leftVal * rightVal; break
        case '/': 
          if (rightVal === 0) return createBinary(node.op, left, right, node.location)
          result = leftVal / rightVal
          break
      }
      return createNumber(result!, node.location)
    }

    // Simplification rules
    
    // x + 0 = x, 0 + x = x
    if (node.op === '+') {
      if (leftVal === 0) return right
      if (rightVal === 0) return left
    }

    // x - 0 = x
    if (node.op === '-') {
      if (rightVal === 0) return left
    }

    // x * 1 = x, 1 * x = x
    if (node.op === '*') {
      if (leftVal === 1) return right
      if (rightVal === 1) return left
      // x * 0 = 0, 0 * x = 0
      if (leftVal === 0 || rightVal === 0) {
        return createNumber(0, node.location)
      }
    }

    // x / 1 = x
    if (node.op === '/') {
      if (rightVal === 1) return left
    }

    return createBinary(node.op, left, right, node.location)
  }

  if (isVariable(node)) {
    return node
  }

  return node
}

/**
 * Convert AST back to string representation
 */
export function astToString(node: ASTNode): string {
  if (isNumber(node)) {
    // Format nicely
    if (Number.isInteger(node.value)) {
      return node.value.toString()
    }
    return node.value.toFixed(2).replace(/\.?0+$/, '')
  }

  if (isVariable(node)) {
    if (node.coefficient === 1) {
      return node.name
    }
    if (node.coefficient === -1) {
      return `-${node.name}`
    }
    return `${node.coefficient}${node.name}`
  }

  if (isUnary(node)) {
    const operandStr = astToString(node.operand)
    // Wrap in parens if needed
    if (isBinary(node.operand)) {
      return `-(${operandStr})`
    }
    return `-${operandStr}`
  }

  if (isPower(node)) {
    const baseStr = astToString(node.base)
    // Wrap base in parens if it's a binary op
    if (isBinary(node.base) || isUnary(node.base)) {
      return `(${baseStr})^${node.exponent}`
    }
    return `${baseStr}^${node.exponent}`
  }

  if (isBinary(node)) {
    const leftStr = astToString(node.left)
    const rightStr = astToString(node.right)

    // Determine if we need parentheses
    const leftNeedsParens = needsParens(node.left, node, 'left')
    const rightNeedsParens = needsParens(node.right, node, 'right')

    const left = leftNeedsParens ? `(${leftStr})` : leftStr
    const right = rightNeedsParens ? `(${rightStr})` : rightStr

    // Use nice operators
    const opChar = node.op === '*' ? ' × ' : node.op === '/' ? ' ÷ ' : ` ${node.op} `
    
    return `${left}${opChar}${right}`
  }

  return ''
}

function needsParens(child: ASTNode, parent: ASTNode, side: 'left' | 'right'): boolean {
  if (!isBinary(child) || !isBinary(parent)) {
    return false
  }

  const parentPrecedence = getPrecedence(parent.op)
  const childPrecedence = getPrecedence(child.op)

  if (childPrecedence < parentPrecedence) {
    return true
  }

  // Right associativity for subtraction and division
  if (side === 'right' && (parent.op === '-' || parent.op === '/')) {
    if (childPrecedence === parentPrecedence) {
      return true
    }
  }

  return false
}

function getPrecedence(op: '+' | '-' | '*' | '/'): number {
  switch (op) {
    case '+':
    case '-':
      return 1
    case '*':
    case '/':
      return 2
  }
}

// Note: evaluateString and simplifyString are exported from index.ts
// to avoid circular dependency issues

