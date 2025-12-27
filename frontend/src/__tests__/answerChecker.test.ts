import { describe, it, expect } from 'vitest'
import { checkAnswer, parseAnswerString, checkAnswerLegacy } from '../utils/answerChecker'

describe('answerChecker', () => {
  describe('checkAnswer - number type', () => {
    it('should accept exact match', () => {
      expect(checkAnswer('42', '42', 'number')).toBe('correct')
    })

    it('should accept numbers with different decimal formats', () => {
      expect(checkAnswer('16.67', '16.67', 'number')).toBe('correct')
      expect(checkAnswer('16,67', '16.67', 'number')).toBe('correct')
    })

    it('should accept floating point close matches', () => {
      // 16.66667 should match 16.6667 (within tolerance)
      expect(checkAnswer('16.66667', '16.6667', 'number')).toBe('correct')
      // 0.333333 should match 1/3 = 0.333...
      expect(checkAnswer('0.333333', '0.333333', 'number')).toBe('correct')
    })

    it('should accept fraction input for number answers', () => {
      expect(checkAnswer('1/3', '0.333333', 'number')).toBe('correct')
      expect(checkAnswer('50/3', '16.666667', 'number')).toBe('correct')
    })

    it('should accept leading + sign', () => {
      expect(checkAnswer('+27', '27', 'number')).toBe('correct')
    })

    it('should reject clearly wrong answers', () => {
      expect(checkAnswer('10', '42', 'number')).toBe('incorrect')
      expect(checkAnswer('16.5', '16.67', 'number')).toBe('incorrect')
    })

    it('should return neutral for empty answer', () => {
      expect(checkAnswer('', '42', 'number')).toBe('neutral')
      expect(checkAnswer('   ', '42', 'number')).toBe('neutral')
    })
  })

  describe('checkAnswer - fraction type', () => {
    it('should accept exact fraction match', () => {
      expect(checkAnswer('1/2', '1/2', 'fraction')).toBe('correct')
      expect(checkAnswer('11/18', '11/18', 'fraction')).toBe('correct')
    })

    it('should accept equivalent fractions', () => {
      expect(checkAnswer('2/4', '1/2', 'fraction')).toBe('correct')
      expect(checkAnswer('3/6', '1/2', 'fraction')).toBe('correct')
      expect(checkAnswer('4/8', '1/2', 'fraction')).toBe('correct')
    })

    it('should accept decimal representation of fractions', () => {
      expect(checkAnswer('0.5', '1/2', 'fraction')).toBe('correct')
      expect(checkAnswer('0.25', '1/4', 'fraction')).toBe('correct')
    })

    it('should reject wrong fractions', () => {
      expect(checkAnswer('1/3', '1/2', 'fraction')).toBe('incorrect')
      expect(checkAnswer('2/3', '1/2', 'fraction')).toBe('incorrect')
    })
  })

  describe('checkAnswer - percent type', () => {
    it('should accept with or without % sign', () => {
      expect(checkAnswer('25', '25%', 'percent')).toBe('correct')
      expect(checkAnswer('25%', '25', 'percent')).toBe('correct')
      expect(checkAnswer('25%', '25%', 'percent')).toBe('correct')
    })

    it('should accept decimal percentages', () => {
      expect(checkAnswer('12.5', '12.5%', 'percent')).toBe('correct')
      expect(checkAnswer('12,5', '12.5', 'percent')).toBe('correct')
    })

    it('should reject wrong percentages', () => {
      expect(checkAnswer('30', '25%', 'percent')).toBe('incorrect')
    })
  })

  describe('checkAnswer - text type', () => {
    it('should match case-insensitively', () => {
      expect(checkAnswer('hello', 'Hello', 'text')).toBe('correct')
      expect(checkAnswer('HELLO', 'hello', 'text')).toBe('correct')
    })

    it('should ignore extra whitespace', () => {
      expect(checkAnswer('  hello  ', 'hello', 'text')).toBe('correct')
      expect(checkAnswer('hello world', 'hello  world', 'text')).toBe('correct')
    })
  })

  describe('checkAnswer - with alternatives', () => {
    it('should accept any of the alternatives', () => {
      expect(checkAnswer('14', '14', 'number', ['7+7', '2*7'])).toBe('correct')
      expect(checkAnswer('7+7', '14', 'number', ['7+7', '2*7'])).toBe('correct')
    })

    it('should check alternatives with proper type', () => {
      // Alternative "0.5" should work for fraction "1/2"
      expect(checkAnswer('0.5', '1/2', 'fraction', ['0.5'])).toBe('correct')
    })
  })

  describe('checkAnswer - unit type', () => {
    it('should handle basic unit answers', () => {
      expect(checkAnswer('10 m', '10 m', 'unit')).toBe('correct')
      expect(checkAnswer('10m', '10 m', 'unit')).toBe('correct')
    })

    it('should normalize common unit variations', () => {
      expect(checkAnswer('5 m²', '5 m2', 'unit')).toBe('correct')
      expect(checkAnswer('5 kvm', '5 m²', 'unit')).toBe('correct')
    })
  })

  describe('parseAnswerString', () => {
    it('should split pipe-separated answers', () => {
      const result = parseAnswerString('14|7+7|2*7')
      expect(result.primary).toBe('14')
      expect(result.alternatives).toEqual(['7+7', '2*7'])
    })

    it('should handle single answer', () => {
      const result = parseAnswerString('42')
      expect(result.primary).toBe('42')
      expect(result.alternatives).toEqual([])
    })
  })

  describe('checkAnswerLegacy', () => {
    it('should work with pipe-separated answers', () => {
      expect(checkAnswerLegacy('14', '14|7+7')).toBe('correct')
      expect(checkAnswerLegacy('7+7', '14|7+7')).toBe('correct')
      expect(checkAnswerLegacy('10', '14|7+7')).toBe('incorrect')
    })

    it('should return neutral for empty answers', () => {
      expect(checkAnswerLegacy('', '14')).toBe('neutral')
      expect(checkAnswerLegacy('14', null)).toBe('neutral')
    })
  })
})

