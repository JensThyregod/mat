import { describe, it, expect } from 'vitest'
import {
  parseLatexToHtml,
  containsLatexStructure,
  parseLatexToStructure,
} from '../utils/latexParser'

describe('latexParser', () => {
  describe('containsLatexStructure', () => {
    it('returns true for \\section', () => {
      expect(containsLatexStructure('\\section{Title}')).toBe(true)
      expect(containsLatexStructure('\\section*{Title}')).toBe(true)
    })

    it('returns true for \\begin{enumerate}', () => {
      expect(containsLatexStructure('\\begin{enumerate}\\item A\\end{enumerate}')).toBe(true)
    })

    it('returns true for \\end{...}', () => {
      expect(containsLatexStructure('\\end{enumerate}')).toBe(true)
    })

    it('returns true for \\item', () => {
      expect(containsLatexStructure('\\item First question')).toBe(true)
    })

    it('returns false for plain math expressions', () => {
      expect(containsLatexStructure('x^2 + 1')).toBe(false)
      expect(containsLatexStructure('$\\frac{1}{2}$')).toBe(false)
      expect(containsLatexStructure('$$a + b = c$$')).toBe(false)
    })

    it('returns false for an empty string', () => {
      expect(containsLatexStructure('')).toBe(false)
    })
  })

  describe('parseLatexToHtml', () => {
    it('renders \\section as <h2>', () => {
      const html = parseLatexToHtml('\\section{My Title}')
      expect(html).toContain('<h2')
      expect(html).toContain('My Title')
    })

    it('renders \\section* as <h2>', () => {
      const html = parseLatexToHtml('\\section*{Starred}')
      expect(html).toContain('<h2')
      expect(html).toContain('Starred')
    })

    it('renders enumerate as <ol> with <li> items', () => {
      const latex = '\\begin{enumerate}\\item First\\item Second\\end{enumerate}'
      const html = parseLatexToHtml(latex)
      expect(html).toContain('<ol')
      expect(html).toContain('</ol>')
      expect(html).toContain('<li')
      expect(html).toContain('First')
      expect(html).toContain('Second')
    })

    it('handles inline math $...$', () => {
      const html = parseLatexToHtml('The value is $x^2$.')
      expect(html).toContain('katex')
    })

    it('handles display math $$...$$', () => {
      const html = parseLatexToHtml('$$a + b = c$$')
      expect(html).toContain('latex-display-math')
    })

    it('handles display math \\[...\\]', () => {
      const html = parseLatexToHtml('\\[x = 5\\]')
      expect(html).toContain('latex-display-math')
    })

    it('handles inline math \\(...\\)', () => {
      const html = parseLatexToHtml('Value is \\(x\\).')
      expect(html).toContain('katex')
    })

    it('wraps plain text in <p> tags', () => {
      const html = parseLatexToHtml('Hello world')
      expect(html).toContain('<p>')
      expect(html).toContain('Hello world')
    })

    it('returns empty string for empty input', () => {
      const html = parseLatexToHtml('')
      expect(html).toBe('')
    })

    it('handles mixed text and math in a single paragraph', () => {
      const html = parseLatexToHtml('The area is $A = \\pi r^2$ square meters.')
      expect(html).toContain('katex')
      expect(html).toContain('square meters')
    })

    it('handles multiple paragraphs separated by blank lines', () => {
      const html = parseLatexToHtml('First paragraph.\n\nSecond paragraph.')
      const pCount = (html.match(/<p>/g) || []).length
      expect(pCount).toBe(2)
    })
  })

  describe('parseLatexToStructure', () => {
    it('extracts title from \\section*{...}', () => {
      const result = parseLatexToStructure('\\section*{My Task}')
      expect(result.title).toBe('My Task')
      expect(result.titleHtml).toContain('<h2')
      expect(result.titleHtml).toContain('My Task')
    })

    it('extracts intro text before enumerate', () => {
      const latex = 'Some intro text\n\n\\begin{enumerate}\\item Q1\\end{enumerate}'
      const result = parseLatexToStructure(latex)
      expect(result.intro).toContain('Some intro text')
      expect(result.introHtml).toBeTruthy()
    })

    it('extracts questions from \\item blocks', () => {
      const latex = '\\begin{enumerate}\\item First question\\item Second question\\end{enumerate}'
      const result = parseLatexToStructure(latex)
      expect(result.questions).toHaveLength(2)
      expect(result.questions[0].index).toBe(0)
      expect(result.questions[0].content).toContain('First question')
      expect(result.questions[1].index).toBe(1)
      expect(result.questions[1].content).toContain('Second question')
    })

    it('extracts answers from %% ANS: comments', () => {
      const latex = '\\begin{enumerate}\\item What is 2+2?\n%% ANS: 4\n\\end{enumerate}'
      const result = parseLatexToStructure(latex)
      expect(result.questions).toHaveLength(1)
      expect(result.questions[0].correctAnswer).toBe('4')
    })

    it('infers answer type "number" for numeric answers', () => {
      const latex = '\\begin{enumerate}\\item Q?\n%% ANS: 42\n\\end{enumerate}'
      const result = parseLatexToStructure(latex)
      expect(result.questions[0].answerType).toBe('number')
    })

    it('infers answer type "fraction" for fraction answers', () => {
      const latex = '\\begin{enumerate}\\item Q?\n%% ANS: 3/4\n\\end{enumerate}'
      const result = parseLatexToStructure(latex)
      expect(result.questions[0].answerType).toBe('fraction')
    })

    it('parses explicit type annotation like "27:number"', () => {
      const latex = '\\begin{enumerate}\\item Q?\n%% ANS: 27:number\n\\end{enumerate}'
      const result = parseLatexToStructure(latex)
      expect(result.questions[0].correctAnswer).toBe('27')
      expect(result.questions[0].answerType).toBe('number')
    })

    it('parses alternatives from pipe-separated values', () => {
      const latex = '\\begin{enumerate}\\item Q?\n%% ANS: yes|ja|yep\n\\end{enumerate}'
      const result = parseLatexToStructure(latex)
      expect(result.questions[0].correctAnswer).toBe('yes')
      expect(result.questions[0].acceptAlternatives).toEqual(['ja', 'yep'])
    })

    it('parses type annotation with alternatives', () => {
      const latex = '\\begin{enumerate}\\item Q?\n%% ANS: 5:number|five\n\\end{enumerate}'
      const result = parseLatexToStructure(latex)
      expect(result.questions[0].correctAnswer).toBe('5')
      expect(result.questions[0].answerType).toBe('number')
      expect(result.questions[0].acceptAlternatives).toEqual(['five'])
    })

    it('generates contentHtml for each question', () => {
      const latex = '\\begin{enumerate}\\item Compute $2+3$\\end{enumerate}'
      const result = parseLatexToStructure(latex)
      expect(result.questions[0].contentHtml).toContain('katex')
    })

    it('returns null title/intro when not present', () => {
      const latex = '\\begin{enumerate}\\item Only a question\\end{enumerate}'
      const result = parseLatexToStructure(latex)
      expect(result.title).toBeNull()
      expect(result.titleHtml).toBeNull()
    })

    it('returns empty questions for empty input', () => {
      const result = parseLatexToStructure('')
      expect(result.questions).toHaveLength(0)
      expect(result.title).toBeNull()
      expect(result.intro).toBeNull()
    })

    it('handles figure tokens (SVG)', () => {
      const latex = '%% FIGURE_SVG alt="diagram"\n<svg></svg>\n%% FIGURE_END\n\\begin{enumerate}\\item Q\\end{enumerate}'
      const result = parseLatexToStructure(latex)
      expect(result.figure).not.toBeNull()
      expect(result.figure!.type).toBe('svg')
    })

    it('sets figure to null when no figure is present', () => {
      const latex = '\\begin{enumerate}\\item Q\\end{enumerate}'
      const result = parseLatexToStructure(latex)
      expect(result.figure).toBeNull()
    })
  })
})
