// ============================================
// ANSWER CHECKER UTILITY
// Smart programmatic answer validation
// ============================================

import type { AnswerType } from '../types/taskSchema'

export type AnswerStatus = 'neutral' | 'correct' | 'incorrect'

/**
 * Configuration for numerical comparison
 */
interface NumericCompareOptions {
  /** Relative tolerance for floating point comparison (default: 0.001 = 0.1%) */
  relativeTolerance?: number
  /** Absolute tolerance for numbers close to zero (default: 0.0001) */
  absoluteTolerance?: number
}

const DEFAULT_NUMERIC_OPTIONS: NumericCompareOptions = {
  relativeTolerance: 0.001,
  absoluteTolerance: 0.0001,
}

/**
 * Normalize a string for basic text comparison
 */
function normalizeText(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/°/g, '')
    .replace(/^\+/, '')
}

/**
 * Parse a string as a number, handling various formats
 */
function parseNumber(s: string): number | null {
  const normalized = s
    .trim()
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/°/g, '')
    .replace(/^\+/, '')
    .replace(/%$/, '')

  // Handle fractions like "1/2", "3/4", "-5/8"
  const fractionMatch = normalized.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/)
  if (fractionMatch) {
    const numerator = parseFloat(fractionMatch[1])
    const denominator = parseFloat(fractionMatch[2])
    if (denominator === 0) return null
    return numerator / denominator
  }

  // Handle mixed numbers like "1 1/2" or "2 3/4"
  const mixedMatch = normalized.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/)
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1])
    const numerator = parseInt(mixedMatch[2])
    const denominator = parseInt(mixedMatch[3])
    if (denominator === 0) return null
    const sign = whole < 0 ? -1 : 1
    return whole + sign * (numerator / denominator)
  }

  const num = parseFloat(normalized)
  if (isNaN(num)) return null
  return num
}

/**
 * Compare two numbers with tolerance
 */
function compareNumbers(
  userValue: number,
  correctValue: number,
  options: NumericCompareOptions = DEFAULT_NUMERIC_OPTIONS
): boolean {
  const { relativeTolerance = 0.001, absoluteTolerance = 0.0001 } = options

  if (userValue === correctValue) return true

  if (Math.abs(correctValue) < absoluteTolerance) {
    return Math.abs(userValue - correctValue) <= absoluteTolerance
  }

  const relativeError = Math.abs((userValue - correctValue) / correctValue)
  return relativeError <= relativeTolerance
}

/**
 * Check if a fraction representation is correct
 */
function checkFraction(userAnswer: string, correctAnswer: string): boolean {
  const userNum = parseNumber(userAnswer)
  const correctNum = parseNumber(correctAnswer)
  
  if (userNum !== null && correctNum !== null) {
    return compareNumbers(userNum, correctNum)
  }
  
  return normalizeText(userAnswer) === normalizeText(correctAnswer)
}

/**
 * Check if a numeric answer is correct
 */
function checkNumber(userAnswer: string, correctAnswer: string): boolean {
  const userNum = parseNumber(userAnswer)
  const correctNum = parseNumber(correctAnswer)
  
  if (userNum !== null && correctNum !== null) {
    return compareNumbers(userNum, correctNum)
  }
  
  return normalizeText(userAnswer) === normalizeText(correctAnswer)
}

/**
 * Check if a percent answer is correct
 */
function checkPercent(userAnswer: string, correctAnswer: string): boolean {
  const cleanUser = userAnswer.trim().replace(/%$/, '')
  const cleanCorrect = correctAnswer.trim().replace(/%$/, '')
  
  const userNum = parseNumber(cleanUser)
  const correctNum = parseNumber(cleanCorrect)
  
  if (userNum !== null && correctNum !== null) {
    return compareNumbers(userNum, correctNum)
  }
  
  return normalizeText(cleanUser) === normalizeText(cleanCorrect)
}

/**
 * Check if a text answer is correct
 */
function checkText(userAnswer: string, correctAnswer: string): boolean {
  return normalizeText(userAnswer) === normalizeText(correctAnswer)
}

/**
 * Check if a multiple choice answer is correct
 */
function checkMultipleChoice(userAnswer: string, correctAnswer: string): boolean {
  return normalizeText(userAnswer) === normalizeText(correctAnswer)
}

/**
 * Check if a mathematical expression is correct
 */
function checkExpression(userAnswer: string, correctAnswer: string): boolean {
  const normalizeExpression = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/\*/g, '·')
      .replace(/x/g, 'x')
      .replace(/\^/g, '^')
  
  return normalizeExpression(userAnswer) === normalizeExpression(correctAnswer)
}

/**
 * Check if a unit answer is correct
 */
function checkUnit(userAnswer: string, correctAnswer: string): boolean {
  const normalizeUnit = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/,/g, '.')
      .replace(/m²|m2|kvm/g, 'm²')
      .replace(/m³|m3|kbm/g, 'm³')
      .replace(/km\/t|km\/h|kmh|kmph/g, 'km/t')
      .replace(/m\/s|ms/g, 'm/s')
      .replace(/cm²|cm2/g, 'cm²')
      .replace(/cm³|cm3/g, 'cm³')
      .replace(/l|liter/g, 'L')
      .replace(/ml|milliliter/g, 'mL')
      .replace(/kg|kilogram/g, 'kg')
      .replace(/g|gram/g, 'g')
  
  const extractNumber = (s: string) => {
    const match = s.match(/^(-?[\d.,]+)/)
    return match ? parseNumber(match[1]) : null
  }
  
  const userNum = extractNumber(userAnswer)
  const correctNum = extractNumber(correctAnswer)
  
  if (userNum !== null && correctNum !== null) {
    if (!compareNumbers(userNum, correctNum)) return false
  }
  
  const userUnit = userAnswer.replace(/^-?[\d.,\s]+/, '')
  const correctUnit = correctAnswer.replace(/^-?[\d.,\s]+/, '')
  
  return normalizeUnit(userUnit) === normalizeUnit(correctUnit)
}

/**
 * Get the appropriate checker function for an answer type
 */
function getChecker(answerType: AnswerType): (user: string, correct: string) => boolean {
  switch (answerType) {
    case 'number':
      return checkNumber
    case 'fraction':
      return checkFraction
    case 'percent':
      return checkPercent
    case 'text':
      return checkText
    case 'multiple_choice':
      return checkMultipleChoice
    case 'expression':
      return checkExpression
    case 'unit':
      return checkUnit
    default:
      return checkText
  }
}

/**
 * Main answer checking function
 */
export function checkAnswer(
  userAnswer: string,
  correctAnswer: string,
  answerType: AnswerType = 'text',
  acceptAlternatives: string[] = []
): AnswerStatus {
  if (!userAnswer.trim()) return 'neutral'
  if (!correctAnswer) return 'neutral'
  
  const allCorrect = [correctAnswer, ...acceptAlternatives]
  const checker = getChecker(answerType)
  
  for (const correct of allCorrect) {
    if (checker(userAnswer, correct)) {
      return 'correct'
    }
  }
  
  return 'incorrect'
}

/**
 * Legacy function for backwards compatibility
 */
export function checkAnswerLegacy(
  userAnswer: string,
  correctAnswer: string | null
): AnswerStatus {
  if (!userAnswer.trim() || !correctAnswer) return 'neutral'
  
  const acceptableAnswers = correctAnswer.split('|').map(normalizeText)
  const normalizedUser = normalizeText(userAnswer)
  
  return acceptableAnswers.includes(normalizedUser) ? 'correct' : 'incorrect'
}

/**
 * Parse a pipe-separated answer string into primary and alternatives
 */
export function parseAnswerString(answerString: string): {
  primary: string
  alternatives: string[]
} {
  const parts = answerString.split('|').map(s => s.trim()).filter(Boolean)
  return {
    primary: parts[0] || '',
    alternatives: parts.slice(1),
  }
}

