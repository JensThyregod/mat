import { describe, it, expect } from 'vitest'
import {
  parseTaskYaml,
  parseTaskToRuntime,
  extractTypeFromFilename,
  extractInstanceNumber,
  generateTaskId,
} from '../utils/yamlTaskParser'

const VALID_YAML = `
id: test_task_001
type: test_type
title: Test Task
intro: "Find the answer"
figure: null
questions:
  - text: "What is 2+2?"
    answer: "4"
    answer_type: number
`.trim()

const MULTI_QUESTION_YAML = `
id: multi_q_001
type: multi_type
title: Multiple Questions
intro: "Answer all questions"
figure: null
questions:
  - text: "What is 1+1?"
    answer: "2"
    answer_type: number
  - text: "What is 3+3?"
    answer: "6"
    answer_type: number
    accept_alternatives:
      - "six"
`.trim()

describe('yamlTaskParser', () => {
  describe('parseTaskYaml', () => {
    it('parses valid YAML into a TaskInstance', () => {
      const task = parseTaskYaml(VALID_YAML)
      expect(task.id).toBe('test_task_001')
      expect(task.type).toBe('test_type')
      expect(task.title).toBe('Test Task')
      expect(task.intro).toBe('Find the answer')
      expect(task.figure).toBeNull()
      expect(task.questions).toHaveLength(1)
      expect(task.questions[0].text).toBe('What is 2+2?')
      expect(task.questions[0].answer).toBe('4')
      expect(task.questions[0].answer_type).toBe('number')
    })

    it('parses YAML with multiple questions and alternatives', () => {
      const task = parseTaskYaml(MULTI_QUESTION_YAML)
      expect(task.questions).toHaveLength(2)
      expect(task.questions[1].accept_alternatives).toEqual(['six'])
    })

    it('throws on empty input', () => {
      expect(() => parseTaskYaml('')).toThrow()
    })

    it('throws when id is missing', () => {
      const yaml = `
type: test_type
title: Test
intro: "x"
questions:
  - text: "Q?"
    answer: "A"
    answer_type: text
`.trim()
      expect(() => parseTaskYaml(yaml)).toThrow('id')
    })

    it('throws when type is missing', () => {
      const yaml = `
id: test_001
title: Test
intro: "x"
questions:
  - text: "Q?"
    answer: "A"
    answer_type: text
`.trim()
      expect(() => parseTaskYaml(yaml)).toThrow('type')
    })

    it('throws when title is missing', () => {
      const yaml = `
id: test_001
type: test_type
intro: "x"
questions:
  - text: "Q?"
    answer: "A"
    answer_type: text
`.trim()
      expect(() => parseTaskYaml(yaml)).toThrow('title')
    })

    it('throws when questions array is empty', () => {
      const yaml = `
id: test_001
type: test_type
title: Test
intro: "x"
questions: []
`.trim()
      expect(() => parseTaskYaml(yaml)).toThrow('question')
    })

    it('throws when a question is missing text', () => {
      const yaml = `
id: test_001
type: test_type
title: Test
intro: "x"
questions:
  - answer: "A"
    answer_type: text
`.trim()
      expect(() => parseTaskYaml(yaml)).toThrow('text')
    })

    it('throws when a question is missing answer_type', () => {
      const yaml = `
id: test_001
type: test_type
title: Test
intro: "x"
questions:
  - text: "Q?"
    answer: "A"
`.trim()
      expect(() => parseTaskYaml(yaml)).toThrow('answer_type')
    })
  })

  describe('parseTaskToRuntime', () => {
    it('converts a TaskInstance to ParsedTaskInstance', () => {
      const task = parseTaskYaml(VALID_YAML)
      const runtime = parseTaskToRuntime(task)

      expect(runtime.id).toBe('test_task_001')
      expect(runtime.type).toBe('test_type')
      expect(runtime.title).toBe('Test Task')
      expect(typeof runtime.introHtml).toBe('string')
      expect(runtime.figure).toBeNull()
    })

    it('renders question text to HTML', () => {
      const task = parseTaskYaml(VALID_YAML)
      const runtime = parseTaskToRuntime(task)

      expect(runtime.questions).toHaveLength(1)
      expect(runtime.questions[0].index).toBe(0)
      expect(runtime.questions[0].text).toBe('What is 2+2?')
      expect(typeof runtime.questions[0].textHtml).toBe('string')
      expect(runtime.questions[0].answer).toBe('4')
      expect(runtime.questions[0].answerType).toBe('number')
    })

    it('populates acceptAlternatives from the task', () => {
      const task = parseTaskYaml(MULTI_QUESTION_YAML)
      const runtime = parseTaskToRuntime(task)

      expect(runtime.questions[0].acceptAlternatives).toEqual([])
      expect(runtime.questions[1].acceptAlternatives).toEqual(['six'])
    })

    it('renders LaTeX math in intro to HTML with KaTeX', () => {
      const yaml = `
id: math_001
type: math_type
title: Math Task
intro: "Compute $x^2$"
figure: null
questions:
  - text: "What is $2^2$?"
    answer: "4"
    answer_type: number
`.trim()
      const task = parseTaskYaml(yaml)
      const runtime = parseTaskToRuntime(task)

      expect(runtime.introHtml).toContain('katex')
      expect(runtime.questions[0].textHtml).toContain('katex')
    })
  })

  describe('extractTypeFromFilename', () => {
    it('extracts type from a standard filename', () => {
      expect(extractTypeFromFilename('tal_broeker_001.yaml')).toBe('tal_broeker')
    })

    it('extracts type from a multi-part name', () => {
      expect(extractTypeFromFilename('statistik_og_sandsynlighed_042.yaml')).toBe('statistik_og_sandsynlighed')
    })

    it('handles .yml extension', () => {
      expect(extractTypeFromFilename('my_type_007.yml')).toBe('my_type')
    })

    it('returns full base name when no trailing number', () => {
      expect(extractTypeFromFilename('some_type.yaml')).toBe('some_type')
    })

    it('handles single-part name with number', () => {
      expect(extractTypeFromFilename('algebra_001.yaml')).toBe('algebra')
    })
  })

  describe('extractInstanceNumber', () => {
    it('extracts the instance number', () => {
      expect(extractInstanceNumber('tal_broeker_001.yaml')).toBe(1)
    })

    it('extracts larger numbers', () => {
      expect(extractInstanceNumber('type_042.yaml')).toBe(42)
    })

    it('returns 0 when no trailing number', () => {
      expect(extractInstanceNumber('some_type.yaml')).toBe(0)
    })

    it('handles .yml extension', () => {
      expect(extractInstanceNumber('type_123.yml')).toBe(123)
    })
  })

  describe('generateTaskId', () => {
    it('formats with zero-padded 3-digit instance number', () => {
      expect(generateTaskId('tal_broeker', 1)).toBe('tal_broeker_001')
    })

    it('handles larger numbers', () => {
      expect(generateTaskId('type', 42)).toBe('type_042')
    })

    it('handles numbers >= 100', () => {
      expect(generateTaskId('type', 100)).toBe('type_100')
    })

    it('handles numbers >= 1000 (no truncation)', () => {
      expect(generateTaskId('type', 1234)).toBe('type_1234')
    })
  })
})
