/**
 * Expression Analyzer
 * 
 * Analyzes an AST to find simplification opportunities:
 * - Common factors between numerator and denominator
 * - Like terms that can be combined
 * - Reducible fractions
 */

import {
  isNumber,
  isVariable,
  isBinary,
  isUnary,
  isPower,
  isFraction,
} from './ast'
import type {
  ASTNode,
  TokenLocation,
  SimplificationOpportunity,
  CommonFactorOpportunity,
  LikeTermsOpportunity,
  ReducibleFractionOpportunity,
} from './ast'

// Helper: Greatest Common Divisor
function gcd(a: number, b: number): number {
  a = Math.abs(Math.floor(a))
  b = Math.abs(Math.floor(b))
  while (b) {
    const t = b
    b = a % b
    a = t
  }
  return a
}

// Helper: GCD of multiple numbers
function gcdMultiple(numbers: number[]): number {
  if (numbers.length === 0) return 1
  return numbers.reduce((acc, n) => gcd(acc, n), numbers[0])
}

// Term signature for grouping like terms
type TermSignature = {
  variable: string | null  // null for constants
  exponent: number
}

// Collected term info
type CollectedTerm = {
  coefficient: number
  location: TokenLocation
  signature: TermSignature
}

/**
 * Extract all numeric coefficients from an expression
 * Returns array of { value, location } for each coefficient found
 */
function extractCoefficients(node: ASTNode): { value: number; location: TokenLocation }[] {
  const result: { value: number; location: TokenLocation }[] = []

  function walk(n: ASTNode): void {
    if (isNumber(n)) {
      result.push({ value: n.value, location: n.location! })
    } else if (isVariable(n)) {
      // Variables have coefficient 1 implicitly, but we track explicit coefficients
      // from 3x parsed as 3 * x
    } else if (isBinary(n)) {
      walk(n.left)
      walk(n.right)
    } else if (isUnary(n)) {
      walk(n.operand)
    } else if (isPower(n)) {
      walk(n.base)
    }
  }

  walk(node)
  return result
}

/**
 * Extract terms from an additive expression (a + b - c + d...)
 * Each term has a coefficient, variable signature, and location
 */
function extractTerms(node: ASTNode, sign: number = 1): CollectedTerm[] {
  const terms: CollectedTerm[] = []

  function walkAdditive(n: ASTNode, currentSign: number): void {
    if (isBinary(n) && (n.op === '+' || n.op === '-')) {
      walkAdditive(n.left, currentSign)
      walkAdditive(n.right, n.op === '+' ? currentSign : -currentSign)
    } else {
      // This is a single term, analyze it
      const term = analyzeTerm(n, currentSign)
      if (term) {
        terms.push(term)
      }
    }
  }

  walkAdditive(node, sign)
  return terms
}

/**
 * Analyze a single term (not additive) to get its signature
 */
function analyzeTerm(node: ASTNode, sign: number): CollectedTerm | null {
  let coefficient = sign
  let variable: string | null = null
  let exponent = 1

  function walk(n: ASTNode): void {
    if (isNumber(n)) {
      coefficient *= n.value
    } else if (isVariable(n)) {
      variable = n.name
      // coefficient already includes n.coefficient from lexer normalization
    } else if (isUnary(n)) {
      coefficient *= -1
      walk(n.operand)
    } else if (isPower(n)) {
      walk(n.base)
      exponent = n.exponent
    } else if (isBinary(n) && n.op === '*') {
      walk(n.left)
      walk(n.right)
    } else if (isBinary(n) && n.op === '/') {
      // For division, we only look at the numerator for term analysis
      walk(n.left)
    }
  }

  walk(node)

  return {
    coefficient,
    location: node.location || { start: 0, end: 0 },
    signature: { variable, exponent }
  }
}

/**
 * Find like terms that can be combined
 */
function findLikeTerms(node: ASTNode): LikeTermsOpportunity[] {
  const terms = extractTerms(node)
  const opportunities: LikeTermsOpportunity[] = []

  // Group by signature
  const groups = new Map<string, CollectedTerm[]>()
  for (const term of terms) {
    const key = `${term.signature.variable ?? 'const'}^${term.signature.exponent}`
    const group = groups.get(key) || []
    group.push(term)
    groups.set(key, group)
  }

  // Find groups with multiple terms
  for (const [, group] of groups) {
    if (group.length > 1) {
      opportunities.push({
        type: 'like-terms',
        variable: group[0].signature.variable,
        exponent: group[0].signature.exponent,
        locations: group.map(t => t.location)
      })
    }
  }

  return opportunities
}

/**
 * Find common factors between numerator and denominator of a fraction
 */
function findCommonFactors(numerator: ASTNode, denominator: ASTNode): CommonFactorOpportunity[] {
  const numCoeffs = extractCoefficients(numerator)
  const denCoeffs = extractCoefficients(denominator)

  if (numCoeffs.length === 0 || denCoeffs.length === 0) {
    return []
  }

  const opportunities: CommonFactorOpportunity[] = []

  // Find all numeric values
  const numValues = numCoeffs.map(c => Math.abs(c.value)).filter(v => v !== 0 && Number.isInteger(v))
  const denValues = denCoeffs.map(c => Math.abs(c.value)).filter(v => v !== 0 && Number.isInteger(v))

  if (numValues.length === 0 || denValues.length === 0) {
    return []
  }

  // Calculate GCD of all values
  const allValues = [...numValues, ...denValues]
  const commonGcd = gcdMultiple(allValues)

  if (commonGcd > 1) {
    // Find which coefficients are divisible by the GCD
    const numLocs = numCoeffs
      .filter(c => Number.isInteger(c.value) && c.value % commonGcd === 0)
      .map(c => c.location)
    
    const denLocs = denCoeffs
      .filter(c => Number.isInteger(c.value) && c.value % commonGcd === 0)
      .map(c => c.location)

    if (numLocs.length > 0 && denLocs.length > 0) {
      opportunities.push({
        type: 'common-factor',
        factor: commonGcd,
        numeratorLocations: numLocs,
        denominatorLocations: denLocs
      })
    }
  }

  // Also check for specific divisors between individual pairs
  for (const denCoeff of denCoeffs) {
    if (!Number.isInteger(denCoeff.value) || denCoeff.value === 0 || denCoeff.value === 1) {
      continue
    }
    
    const factor = Math.abs(denCoeff.value)
    const divisibleNum = numCoeffs.filter(
      c => Number.isInteger(c.value) && c.value % factor === 0
    )

    if (divisibleNum.length > 0 && factor > 1) {
      // Check if this is already covered by the GCD opportunity
      const alreadyCovered = opportunities.some(
        op => op.type === 'common-factor' && op.factor === factor
      )
      
      if (!alreadyCovered) {
        opportunities.push({
          type: 'common-factor',
          factor,
          numeratorLocations: divisibleNum.map(c => c.location),
          denominatorLocations: [denCoeff.location]
        })
      }
    }
  }

  return opportunities
}

/**
 * Find reducible fractions (single number / single number)
 */
function findReducibleFractions(node: ASTNode): ReducibleFractionOpportunity[] {
  const opportunities: ReducibleFractionOpportunity[] = []

  function walk(n: ASTNode): void {
    if (isFraction(n)) {
      // Check if both sides are simple numbers
      if (isNumber(n.left) && isNumber(n.right)) {
        const numVal = Math.abs(n.left.value)
        const denVal = Math.abs(n.right.value)
        
        if (Number.isInteger(numVal) && Number.isInteger(denVal) && denVal !== 0) {
          const g = gcd(numVal, denVal)
          if (g > 1) {
            opportunities.push({
              type: 'reducible-fraction',
              gcd: g,
              numeratorLocation: n.left.location!,
              denominatorLocation: n.right.location!
            })
          }
        }
      }
    }
    
    // Recurse into children
    if (isBinary(n)) {
      walk(n.left)
      walk(n.right)
    } else if (isUnary(n)) {
      walk(n.operand)
    } else if (isPower(n)) {
      walk(n.base)
    }
  }

  walk(node)
  return opportunities
}

/**
 * Analyze an expression for all simplification opportunities
 */
export function analyzeExpression(node: ASTNode): SimplificationOpportunity[] {
  const opportunities: SimplificationOpportunity[] = []

  // Find like terms
  opportunities.push(...findLikeTerms(node))

  // Find reducible fractions
  opportunities.push(...findReducibleFractions(node))

  return opportunities
}

/**
 * Analyze a fraction (numerator/denominator) for common factors
 */
export function analyzeFraction(
  numerator: ASTNode, 
  denominator: ASTNode
): SimplificationOpportunity[] {
  const opportunities: SimplificationOpportunity[] = []

  // Find common factors between num and den
  opportunities.push(...findCommonFactors(numerator, denominator))

  // Also analyze each part individually
  opportunities.push(...analyzeExpression(numerator))
  opportunities.push(...analyzeExpression(denominator))

  return opportunities
}

/**
 * Check if a specific location is highlighted by any opportunity
 */
export function isLocationHighlighted(
  location: TokenLocation,
  opportunities: SimplificationOpportunity[],
  partType: 'numerator' | 'denominator' | 'expression'
): boolean {
  for (const opp of opportunities) {
    if (opp.type === 'common-factor') {
      const locs = partType === 'denominator' 
        ? opp.denominatorLocations 
        : opp.numeratorLocations
      if (locs.some(l => overlaps(l, location))) {
        return true
      }
    } else if (opp.type === 'like-terms') {
      if (opp.locations.some(l => overlaps(l, location))) {
        return true
      }
    } else if (opp.type === 'reducible-fraction') {
      if (partType === 'numerator' && overlaps(opp.numeratorLocation, location)) {
        return true
      }
      if (partType === 'denominator' && overlaps(opp.denominatorLocation, location)) {
        return true
      }
    }
  }
  return false
}

/**
 * Get all opportunities that affect a specific location
 */
export function getOpportunitiesAtLocation(
  location: TokenLocation,
  opportunities: SimplificationOpportunity[],
  partType: 'numerator' | 'denominator' | 'expression'
): SimplificationOpportunity[] {
  return opportunities.filter(opp => {
    if (opp.type === 'common-factor') {
      const locs = partType === 'denominator' 
        ? opp.denominatorLocations 
        : opp.numeratorLocations
      return locs.some(l => overlaps(l, location))
    } else if (opp.type === 'like-terms') {
      return opp.locations.some(l => overlaps(l, location))
    } else if (opp.type === 'reducible-fraction') {
      if (partType === 'numerator') return overlaps(opp.numeratorLocation, location)
      if (partType === 'denominator') return overlaps(opp.denominatorLocation, location)
    }
    return false
  })
}

// Helper: Check if two locations overlap (using half-open intervals [start, end))
function overlaps(a: TokenLocation, b: TokenLocation): boolean {
  // Two intervals [a.start, a.end) and [b.start, b.end) overlap if:
  // a.start < b.end AND b.start < a.end
  return a.start < b.end && b.start < a.end
}

