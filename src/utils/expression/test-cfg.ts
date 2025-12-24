/**
 * Comprehensive CFG Parser Tests
 * Run with: npx tsx src/utils/expression/test-cfg.ts
 */

import { tokenize } from './lexer'
import { parse, tryParse } from './parser'
import { analyzeExpression, analyzeFraction } from './analyzer'
import { tryEvaluate, simplify, astToString } from './evaluator'
import { evaluateString, simplifyString } from './index'
import { isNumber, isBinary, isVariable, isUnary, isPower } from './ast'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`✓ ${name}`)
    passed++
  } catch (e) {
    console.error(`✗ ${name}`)
    console.error(`  ${e instanceof Error ? e.message : e}`)
    failed++
  }
}

function assertEqual<T>(actual: T, expected: T, msg = '') {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${msg ? ': ' + msg : ''}`)
  }
}

function assertClose(actual: number, expected: number, epsilon = 0.0001) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`Expected ${expected}, got ${actual}`)
  }
}

console.log('\n=== LEXER TESTS ===\n')

test('tokenize simple number', () => {
  const tokens = tokenize('42')
  assertEqual(tokens.length, 2) // NUMBER + EOF
  assertEqual(tokens[0].type, 'NUMBER')
  assertEqual(tokens[0].numericValue, 42)
})

test('tokenize decimal number', () => {
  const tokens = tokenize('3.14')
  assertEqual(tokens[0].type, 'NUMBER')
  assertClose(tokens[0].numericValue!, 3.14)
})

test('tokenize variable', () => {
  const tokens = tokenize('x')
  assertEqual(tokens[0].type, 'VARIABLE')
  assertEqual(tokens[0].value, 'x')
})

test('tokenize coefficient + variable (3x)', () => {
  const tokens = tokenize('3x')
  // Should produce: NUMBER, MULTIPLY (implicit), VARIABLE
  assertEqual(tokens[0].type, 'NUMBER')
  assertEqual(tokens[0].numericValue, 3)
  assertEqual(tokens[1].type, 'MULTIPLY')
  assertEqual(tokens[2].type, 'VARIABLE')
  assertEqual(tokens[2].value, 'x')
})

test('tokenize expression with spaces', () => {
  const tokens = tokenize('3 + 5')
  assertEqual(tokens[0].type, 'NUMBER')
  assertEqual(tokens[1].type, 'PLUS')
  assertEqual(tokens[2].type, 'NUMBER')
})

test('tokenize all operators', () => {
  const tokens = tokenize('+ - * / ^')
  assertEqual(tokens[0].type, 'PLUS')
  assertEqual(tokens[1].type, 'MINUS')
  assertEqual(tokens[2].type, 'MULTIPLY')
  assertEqual(tokens[3].type, 'DIVIDE')
  assertEqual(tokens[4].type, 'POWER')
})

test('tokenize unicode operators', () => {
  const tokens = tokenize('5 × 3 ÷ 2')
  assertEqual(tokens[1].type, 'MULTIPLY')
  assertEqual(tokens[3].type, 'DIVIDE')
})

test('tokenize parentheses', () => {
  const tokens = tokenize('(x + 1)')
  assertEqual(tokens[0].type, 'LPAREN')
  assertEqual(tokens[4].type, 'RPAREN')
})

test('tokenize power', () => {
  const tokens = tokenize('x^2')
  assertEqual(tokens[1].type, 'POWER')
})

test('tokenize complex expression', () => {
  const tokens = tokenize('3x^2 + 2x - 5')
  // 3, *, x, ^, 2, +, 2, *, x, -, 5, EOF
  const types = tokens.map(t => t.type)
  assertEqual(types.includes('NUMBER'), true)
  assertEqual(types.includes('VARIABLE'), true)
  assertEqual(types.includes('POWER'), true)
  assertEqual(types.includes('PLUS'), true)
  assertEqual(types.includes('MINUS'), true)
})

console.log('\n=== PARSER TESTS ===\n')

test('parse simple number', () => {
  const ast = parse('42')
  assertEqual(isNumber(ast), true)
  if (isNumber(ast)) {
    assertEqual(ast.value, 42)
  }
})

test('parse variable', () => {
  const ast = parse('x')
  assertEqual(isVariable(ast), true)
})

test('parse addition', () => {
  const ast = parse('3 + 5')
  assertEqual(isBinary(ast), true)
  if (isBinary(ast)) {
    assertEqual(ast.op, '+')
  }
})

test('parse subtraction', () => {
  const ast = parse('10 - 3')
  assertEqual(isBinary(ast), true)
  if (isBinary(ast)) {
    assertEqual(ast.op, '-')
  }
})

test('parse multiplication', () => {
  const ast = parse('4 * 5')
  assertEqual(isBinary(ast), true)
  if (isBinary(ast)) {
    assertEqual(ast.op, '*')
  }
})

test('parse division', () => {
  const ast = parse('20 / 4')
  assertEqual(isBinary(ast), true)
  if (isBinary(ast)) {
    assertEqual(ast.op, '/')
  }
})

test('parse operator precedence (mul before add)', () => {
  const ast = parse('2 + 3 * 4')
  // Should be 2 + (3 * 4), not (2 + 3) * 4
  assertEqual(isBinary(ast), true)
  if (isBinary(ast)) {
    assertEqual(ast.op, '+')
    assertEqual(isBinary(ast.right), true)
    if (isBinary(ast.right)) {
      assertEqual(ast.right.op, '*')
    }
  }
})

test('parse operator precedence (div before sub)', () => {
  const ast = parse('10 - 6 / 2')
  // Should be 10 - (6 / 2)
  assertEqual(isBinary(ast), true)
  if (isBinary(ast)) {
    assertEqual(ast.op, '-')
    assertEqual(isBinary(ast.right), true)
  }
})

test('parse parentheses override precedence', () => {
  const ast = parse('(2 + 3) * 4')
  // Should be (2 + 3) * 4
  assertEqual(isBinary(ast), true)
  if (isBinary(ast)) {
    assertEqual(ast.op, '*')
    assertEqual(isBinary(ast.left), true)
    if (isBinary(ast.left)) {
      assertEqual(ast.left.op, '+')
    }
  }
})

test('parse unary minus', () => {
  const ast = parse('-5')
  assertEqual(isUnary(ast), true)
  if (isUnary(ast)) {
    assertEqual(isNumber(ast.operand), true)
  }
})

test('parse power', () => {
  const ast = parse('x^2')
  assertEqual(isPower(ast), true)
  if (isPower(ast)) {
    assertEqual(ast.exponent, 2)
  }
})

test('parse coefficient times variable', () => {
  const ast = parse('3x')
  assertEqual(isBinary(ast), true)
  if (isBinary(ast)) {
    assertEqual(ast.op, '*')
  }
})

test('parse nested parentheses', () => {
  const ast = parse('((1 + 2) * 3)')
  assertEqual(isBinary(ast), true)
})

test('parse complex algebraic expression', () => {
  const ast = parse('3x^2 + 2x - 5')
  assertEqual(isBinary(ast), true)
  // This is a valid parse - just verify it doesn't throw
})

test('tryParse returns null on invalid input', () => {
  const result = tryParse('3 + + 5')
  assertEqual(result, null)
})

test('tryParse returns null on unmatched paren', () => {
  const result = tryParse('(3 + 5')
  assertEqual(result, null)
})

console.log('\n=== EVALUATOR TESTS ===\n')

test('evaluate simple number', () => {
  const ast = parse('42')
  const result = tryEvaluate(ast)
  assertEqual(result, 42)
})

test('evaluate addition', () => {
  const ast = parse('3 + 5')
  const result = tryEvaluate(ast)
  assertEqual(result, 8)
})

test('evaluate subtraction', () => {
  const ast = parse('10 - 3')
  const result = tryEvaluate(ast)
  assertEqual(result, 7)
})

test('evaluate multiplication', () => {
  const ast = parse('4 * 5')
  const result = tryEvaluate(ast)
  assertEqual(result, 20)
})

test('evaluate division', () => {
  const ast = parse('20 / 4')
  const result = tryEvaluate(ast)
  assertEqual(result, 5)
})

test('evaluate respects precedence', () => {
  const ast = parse('2 + 3 * 4')
  const result = tryEvaluate(ast)
  assertEqual(result, 14) // 2 + 12 = 14, not (2+3)*4 = 20
})

test('evaluate parentheses', () => {
  const ast = parse('(2 + 3) * 4')
  const result = tryEvaluate(ast)
  assertEqual(result, 20)
})

test('evaluate unary minus', () => {
  const ast = parse('-5')
  const result = tryEvaluate(ast)
  assertEqual(result, -5)
})

test('evaluate double negative', () => {
  const ast = parse('--5')
  const result = tryEvaluate(ast)
  assertEqual(result, 5)
})

test('evaluate power', () => {
  const ast = parse('2^3')
  const result = tryEvaluate(ast)
  assertEqual(result, 8)
})

test('evaluate complex numeric', () => {
  const ast = parse('(10 + 5) / 3 * 2')
  const result = tryEvaluate(ast)
  assertEqual(result, 10)
})

test('evaluate returns null for variables', () => {
  const ast = parse('x + 5')
  const result = tryEvaluate(ast)
  assertEqual(result, null)
})

test('evaluateString works', () => {
  const result = evaluateString('3 + 5 * 2')
  assertEqual(result, 13)
})

test('evaluateString with unicode operators', () => {
  const result = evaluateString('10 × 2 ÷ 4')
  assertEqual(result, 5)
})

test('simplifyString simplifies constants', () => {
  const result = simplifyString('3 + 5')
  assertEqual(result, '8')
})

console.log('\n=== AST TO STRING TESTS ===\n')

test('astToString number', () => {
  const ast = parse('42')
  const str = astToString(ast)
  assertEqual(str, '42')
})

test('astToString preserves structure', () => {
  const ast = parse('3 + 5')
  const result = astToString(simplify(ast))
  assertEqual(result, '8')
})

console.log('\n=== ANALYZER TESTS ===\n')

test('analyze finds like terms', () => {
  const ast = parse('3x + 2x')
  const opps = analyzeExpression(ast)
  const likeTerms = opps.filter(o => o.type === 'like-terms')
  assertEqual(likeTerms.length > 0, true)
})

test('analyzeFraction finds common factors', () => {
  const num = parse('6')
  const den = parse('4')
  const opps = analyzeFraction(num, den)
  const commonFactors = opps.filter(o => o.type === 'common-factor')
  assertEqual(commonFactors.length > 0, true)
  if (commonFactors.length > 0 && commonFactors[0].type === 'common-factor') {
    assertEqual(commonFactors[0].factor, 2) // GCD of 6 and 4 is 2
  }
})

test('analyzeFraction with larger numbers', () => {
  const num = parse('12')
  const den = parse('8')
  const opps = analyzeFraction(num, den)
  const commonFactors = opps.filter(o => o.type === 'common-factor')
  assertEqual(commonFactors.length > 0, true)
  if (commonFactors.length > 0 && commonFactors[0].type === 'common-factor') {
    assertEqual(commonFactors[0].factor, 4) // GCD of 12 and 8 is 4
  }
})

test('analyzeFraction with expression numerator', () => {
  const num = parse('6x + 12')
  const den = parse('3')
  const opps = analyzeFraction(num, den)
  const commonFactors = opps.filter(o => o.type === 'common-factor')
  // 6, 12 are both divisible by 3
  assertEqual(commonFactors.length > 0, true)
})

test('analyze finds reducible fraction', () => {
  const ast = parse('6 / 4')
  const opps = analyzeExpression(ast)
  const reducible = opps.filter(o => o.type === 'reducible-fraction')
  assertEqual(reducible.length > 0, true)
})

test('analyzeFraction 5x/5 - common factor locations are precise', () => {
  // This tests that "5x / 5" only highlights the 5, not the x
  const num = parse('5x')
  const den = parse('5')
  const opps = analyzeFraction(num, den)
  const commonFactors = opps.filter(o => o.type === 'common-factor')
  assertEqual(commonFactors.length > 0, true)
  
  if (commonFactors.length > 0 && commonFactors[0].type === 'common-factor') {
    const cf = commonFactors[0]
    assertEqual(cf.factor, 5)
    // Numerator location should only cover the "5", not the "x"
    // "5x" -> 5 is at [0,1), x is at [1,2)
    assertEqual(cf.numeratorLocations.length, 1)
    const numLoc = cf.numeratorLocations[0]
    assertEqual(numLoc.start, 0)
    assertEqual(numLoc.end, 1) // Should end at 1, not include x at position 1-2
  }
})

console.log('\n=== EDGE CASES ===\n')

test('handle empty-ish input gracefully', () => {
  const result = tryParse('')
  assertEqual(result, null)
})

test('handle just spaces', () => {
  const result = tryParse('   ')
  assertEqual(result, null)
})

test('decimal operations', () => {
  const result = evaluateString('3.5 + 2.5')
  assertEqual(result, 6)
})

test('negative numbers in expressions', () => {
  const result = evaluateString('5 + -3')
  assertEqual(result, 2)
})

test('multiple operations same precedence (left to right)', () => {
  const result = evaluateString('10 - 5 - 2')
  assertEqual(result, 3) // (10-5)-2 = 3, not 10-(5-2) = 7
})

test('division left to right', () => {
  const result = evaluateString('100 / 10 / 2')
  assertEqual(result, 5) // (100/10)/2 = 5
})

test('mixed precedence complex', () => {
  const result = evaluateString('2 + 3 * 4 - 6 / 2')
  // 2 + 12 - 3 = 11
  assertEqual(result, 11)
})

test('deeply nested parentheses', () => {
  const result = evaluateString('(((1 + 2) * 3) + 4) * 2')
  // ((3*3)+4)*2 = (9+4)*2 = 13*2 = 26
  assertEqual(result, 26)
})

test('power with multiplication', () => {
  const result = evaluateString('2 * 3^2')
  // 2 * 9 = 18
  assertEqual(result, 18)
})

test('multiple powers', () => {
  const result = evaluateString('2^2 + 3^2')
  // 4 + 9 = 13
  assertEqual(result, 13)
})

console.log('\n=== SUMMARY ===\n')
console.log(`Passed: ${passed}`)
console.log(`Failed: ${failed}`)
console.log(`Total:  ${passed + failed}`)

// Exit with error code if any tests failed
if (failed > 0) {
  throw new Error(`${failed} tests failed`)
}

