import katex from 'katex'

/**
 * Parses LaTeX content and converts it to HTML with KaTeX-rendered math.
 * 
 * Supports:
 * - \section*{...} → <h2>...</h2>
 * - \begin{enumerate}[...]...\end{enumerate} → <ol>...</ol>
 * - \item → <li>...</li>
 * - \(...\) → inline math (KaTeX)
 * - \[...\] → display math (KaTeX)
 * - $$...$$ → display math (KaTeX)
 * - $...$ → inline math (KaTeX)
 * - Plain text → <p>...</p>
 */

type Token =
  | { type: 'section'; content: string }
  | { type: 'enumerate_start'; label?: string }
  | { type: 'enumerate_end' }
  | { type: 'item' }
  | { type: 'text'; content: string }
  | { type: 'inline_math'; content: string }
  | { type: 'display_math'; content: string }
  | { type: 'newline' }
  | { type: 'figure_svg'; content: string; alt?: string }
  | { type: 'figure_image'; src: string; alt?: string }
  | { type: 'figure_triangle'; content: string }
  | { type: 'figure_polygon'; content: string }
  | { type: 'figure_voxel'; content: string }
  | { type: 'answer'; content: string }

function renderMath(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex.trim(), {
      throwOnError: false,
      displayMode,
    })
  } catch {
    return `<code class="latex-error">${escapeHtml(latex)}</code>`
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function tokenize(latex: string): Token[] {
  const tokens: Token[] = []
  let remaining = latex

  // Patterns to match (order matters!)
  const patterns: Array<{
    regex: RegExp
    handler: (match: RegExpMatchArray) => Token | Token[] | null
  }> = [
    // %% ANS: answer - correct answer for a question
    {
      regex: /^%%\s*ANS:\s*(.+?)(?:\n|$)/,
      handler: (m) => ({ type: 'answer', content: m[1].trim() }),
    },
    // %% FIGURE_TRIANGLE with angle definitions until %% FIGURE_END
    {
      regex: /^%%\s*FIGURE_TRIANGLE\s*\n([\s\S]*?)%%\s*FIGURE_END/,
      handler: (m) => ({ type: 'figure_triangle', content: m[1].trim() }),
    },
    // %% FIGURE_POLYGON with vertex and side definitions until %% FIGURE_END
    {
      regex: /^%%\s*FIGURE_POLYGON\s*\n([\s\S]*?)%%\s*FIGURE_END/,
      handler: (m) => ({ type: 'figure_polygon', content: m[1].trim() }),
    },
    // %% FIGURE_VOXEL with 3D voxel projection config until %% FIGURE_END
    {
      regex: /^%%\s*FIGURE_VOXEL\s*\n([\s\S]*?)%%\s*FIGURE_END/,
      handler: (m) => ({ type: 'figure_voxel', content: m[1].trim() }),
    },
    // %% FIGURE_SVG alt="..." followed by SVG content until %% FIGURE_END
    {
      regex: /^%%\s*FIGURE_SVG(?:\s+alt="([^"]*)")?\s*\n([\s\S]*?)%%\s*FIGURE_END/,
      handler: (m) => ({ type: 'figure_svg', content: m[2].trim(), alt: m[1] }),
    },
    // %% FIGURE_IMAGE src="..." alt="..."
    {
      regex: /^%%\s*FIGURE_IMAGE\s+src="([^"]+)"(?:\s+alt="([^"]*)")?/,
      handler: (m) => ({ type: 'figure_image', src: m[1], alt: m[2] }),
    },
    // \section*{...}
    {
      regex: /^\\section\*?\{([^}]*)\}/,
      handler: (m) => ({ type: 'section', content: m[1] }),
    },
    // \begin{enumerate}[label=...]
    {
      regex: /^\\begin\{enumerate\}(?:\[([^\]]*)\])?/,
      handler: (m) => ({ type: 'enumerate_start', label: m[1] }),
    },
    // \end{enumerate}
    {
      regex: /^\\end\{enumerate\}/,
      handler: () => ({ type: 'enumerate_end' }),
    },
    // \item
    {
      regex: /^\\item\s*/,
      handler: () => ({ type: 'item' }),
    },
    // Display math \[...\]
    {
      regex: /^\\\[([\s\S]*?)\\\]/,
      handler: (m) => ({ type: 'display_math', content: m[1] }),
    },
    // Display math $$...$$
    {
      regex: /^\$\$([\s\S]*?)\$\$/,
      handler: (m) => ({ type: 'display_math', content: m[1] }),
    },
    // Inline math \(...\)
    {
      regex: /^\\\(([\s\S]*?)\\\)/,
      handler: (m) => ({ type: 'inline_math', content: m[1] }),
    },
    // Inline math $...$ (single dollar, not escaped)
    {
      regex: /^\$([^$]+?)\$/,
      handler: (m) => ({ type: 'inline_math', content: m[1] }),
    },
    // Double newline (paragraph break)
    {
      regex: /^\n\s*\n/,
      handler: () => ({ type: 'newline' }),
    },
    // Single newline with trailing spaces (line break in .tex)
    {
      regex: /^  \n/,
      handler: () => ({ type: 'newline' }),
    },
  ]

  while (remaining.length > 0) {
    let matched = false

    for (const { regex, handler } of patterns) {
      const match = remaining.match(regex)
      if (match) {
        const result = handler(match)
        if (result) {
          if (Array.isArray(result)) {
            tokens.push(...result)
          } else {
            tokens.push(result)
          }
        }
        remaining = remaining.slice(match[0].length)
        matched = true
        break
      }
    }

    if (!matched) {
      // Consume text until next special character or pattern (including %% for answers)
      const nextSpecial = remaining.search(/\\|\$|\n\s*\n|  \n|%%/)
      if (nextSpecial === -1) {
        // Rest is plain text
        const text = remaining.trim()
        if (text) {
          tokens.push({ type: 'text', content: text })
        }
        break
      } else if (nextSpecial === 0) {
        // Unknown command, consume single character
        tokens.push({ type: 'text', content: remaining[0] })
        remaining = remaining.slice(1)
      } else {
        // Plain text before next special
        const text = remaining.slice(0, nextSpecial)
        if (text.trim()) {
          tokens.push({ type: 'text', content: text })
        }
        remaining = remaining.slice(nextSpecial)
      }
    }
  }

  return tokens
}

function processTextContent(text: string, preserveSpaces: boolean = false): string {
  // Clean up whitespace but preserve meaningful spaces
  let processed = text
    .replace(/\s+/g, ' ')
  
  // Only trim if not preserving spaces (for inline content we need leading/trailing spaces)
  if (!preserveSpaces) {
    processed = processed.trim()
  }
  
  // Handle common LaTeX text commands
  processed = processed
    .replace(/\\textbf\{([^}]*)\}/g, '<strong>$1</strong>')
    .replace(/\\textit\{([^}]*)\}/g, '<em>$1</em>')
    .replace(/\\emph\{([^}]*)\}/g, '<em>$1</em>')
    .replace(/\\underline\{([^}]*)\}/g, '<u>$1</u>')
    .replace(/\\,/g, '&thinsp;')
    .replace(/\\ /g, '&nbsp;')
    .replace(/~/g, '&nbsp;')
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    .replace(/``/g, '"')
    .replace(/''/g, '"')
  
  return processed
}

export function parseLatexToHtml(latex: string): string {
  const tokens = tokenize(latex)
  const htmlParts: string[] = []
  let inList = false
  let inListItem = false
  let currentParagraph: string[] = []

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      const content = currentParagraph.join('').trim()
      if (content) {
        if (inListItem) {
          htmlParts.push(content)
        } else {
          htmlParts.push(`<p>${content}</p>`)
        }
      }
      currentParagraph = []
    }
  }

  for (const token of tokens) {
    switch (token.type) {
      case 'section':
        flushParagraph()
        htmlParts.push(`<h2 class="latex-section">${processTextContent(token.content)}</h2>`)
        break

      case 'enumerate_start':
        flushParagraph()
        inList = true
        htmlParts.push('<ol class="latex-enumerate">')
        break

      case 'enumerate_end':
        if (inListItem) {
          flushParagraph()
          htmlParts.push('</li>')
          inListItem = false
        }
        htmlParts.push('</ol>')
        inList = false
        break

      case 'item':
        if (inListItem) {
          flushParagraph()
          htmlParts.push('</li>')
        }
        htmlParts.push('<li class="latex-item">')
        inListItem = true
        break

      case 'inline_math':
        currentParagraph.push(renderMath(token.content, false))
        break

      case 'display_math':
        flushParagraph()
        htmlParts.push(`<div class="latex-display-math">${renderMath(token.content, true)}</div>`)
        break

      case 'text':
        // Preserve leading/trailing spaces for inline content mixing with math
        currentParagraph.push(processTextContent(token.content, true))
        break

      case 'newline':
        flushParagraph()
        break
    }
  }

  // Close any open elements
  flushParagraph()
  if (inListItem) {
    htmlParts.push('</li>')
  }
  if (inList) {
    htmlParts.push('</ol>')
  }

  return htmlParts.join('\n')
}

/**
 * Checks if content contains any LaTeX structure commands.
 * If not, it might be pure math and should be rendered as-is with KaTeX.
 */
export function containsLatexStructure(latex: string): boolean {
  const structurePatterns = [
    /\\section/,
    /\\begin\{/,
    /\\end\{/,
    /\\item/,
  ]
  return structurePatterns.some((p) => p.test(latex))
}

/**
 * Structured representation of a parsed LaTeX task
 */
export type ParsedTask = {
  title: string | null       // From \section*{...}
  titleHtml: string | null   // Rendered HTML for title
  intro: string | null       // Text before \begin{enumerate}
  introHtml: string | null   // Rendered HTML for intro
  figure: ParsedFigure | null // Optional figure (SVG or image)
  questions: ParsedQuestion[] // Individual questions from \item
}

export type ParsedFigure = 
  | { type: 'svg'; content: string; alt?: string }
  | { type: 'image'; content: string; alt?: string }
  | { type: 'triangle'; content: string }  // Declarative triangle config
  | { type: 'polygon'; content: string }   // Declarative polygon config
  | { type: 'voxel'; content: string }     // 3D voxel projection config

export type ParsedQuestion = {
  index: number              // 0-based index
  content: string            // Raw content
  contentHtml: string        // Rendered HTML
  correctAnswer: string | null  // Expected answer from %% ANS: ...
  answerType: 'number' | 'fraction' | 'percent' | 'text' | 'multiple_choice' | 'expression' | 'unit'  // Type for smart validation
  acceptAlternatives: string[]  // Alternative correct answers
}

/**
 * Parses LaTeX into structured data with separate questions.
 * This allows React components to render each question with its own answer field.
 */
export function parseLatexToStructure(latex: string): ParsedTask {
  const tokens = tokenize(latex)
  
  let title: string | null = null
  let titleHtml: string | null = null
  let figure: ParsedFigure | null = null
  const introTokens: Token[] = []
  const questions: ParsedQuestion[] = []
  
  let phase: 'before_list' | 'in_list' | 'after_list' = 'before_list'
  let currentQuestionTokens: Token[] = []
  let questionIndex = 0

  function flushQuestion() {
    if (currentQuestionTokens.length > 0) {
      // Extract answer token if present
      const answerToken = currentQuestionTokens.find(t => t.type === 'answer')
      const contentTokens = currentQuestionTokens.filter(t => t.type !== 'answer')
      
      const content = tokensToRawText(contentTokens)
      const contentHtml = tokensToHtml(contentTokens)
      
      // Parse answer string which may contain: "answer|alt1|alt2" or "answer:type" or "answer:type|alt1|alt2"
      let correctAnswer: string | null = null
      let answerType: ParsedQuestion['answerType'] = 'text'
      let acceptAlternatives: string[] = []
      
      if (answerToken?.type === 'answer') {
        const answerContent = answerToken.content
        
        // Check for type annotation like "27:number" or "11/18:fraction"
        const typeMatch = answerContent.match(/^(.+):(\w+)(?:\|(.+))?$/)
        if (typeMatch) {
          correctAnswer = typeMatch[1].trim()
          const typeStr = typeMatch[2].toLowerCase()
          if (['number', 'fraction', 'percent', 'text', 'multiple_choice', 'expression', 'unit'].includes(typeStr)) {
            answerType = typeStr as ParsedQuestion['answerType']
          }
          if (typeMatch[3]) {
            acceptAlternatives = typeMatch[3].split('|').map(s => s.trim())
          }
        } else {
          // No type annotation - split by pipe for alternatives
          const parts = answerContent.split('|').map(s => s.trim())
          correctAnswer = parts[0] || null
          acceptAlternatives = parts.slice(1)
          
          // Infer type from answer format
          if (correctAnswer) {
            if (/^-?\d+\/\d+$/.test(correctAnswer)) {
              answerType = 'fraction'
            } else if (/^-?\d+(\.\d+)?%?$/.test(correctAnswer.replace(/,/g, '.'))) {
              answerType = correctAnswer.endsWith('%') ? 'percent' : 'number'
            }
          }
        }
      }
      
      questions.push({
        index: questionIndex++,
        content,
        contentHtml,
        correctAnswer,
        answerType,
        acceptAlternatives,
      })
      currentQuestionTokens = []
    }
  }

  for (const token of tokens) {
    switch (token.type) {
      case 'section':
        title = token.content
        titleHtml = `<h2 class="latex-section">${processTextContent(token.content)}</h2>`
        break

      case 'figure_svg':
        figure = {
          type: 'svg',
          content: token.content,
          alt: token.alt,
        }
        break

      case 'figure_image':
        figure = {
          type: 'image',
          content: token.src,
          alt: token.alt,
        }
        break

      case 'figure_triangle':
        figure = {
          type: 'triangle',
          content: token.content,
        }
        break

      case 'figure_polygon':
        figure = {
          type: 'polygon',
          content: token.content,
        }
        break

      case 'figure_voxel':
        figure = {
          type: 'voxel',
          content: token.content,
        }
        break

      case 'enumerate_start':
        phase = 'in_list'
        break

      case 'enumerate_end':
        flushQuestion()
        phase = 'after_list'
        break

      case 'item':
        if (phase === 'in_list') {
          flushQuestion()
        }
        break

      default:
        if (phase === 'before_list') {
          introTokens.push(token)
        } else if (phase === 'in_list') {
          currentQuestionTokens.push(token)
        }
        // Ignore tokens after list for now
        break
    }
  }

  // Flush any remaining question
  flushQuestion()

  const intro = tokensToRawText(introTokens)
  const introHtml = tokensToHtml(introTokens)

  return {
    title,
    titleHtml,
    intro: intro || null,
    introHtml: introHtml || null,
    figure,
    questions,
  }
}

function tokensToRawText(tokens: Token[]): string {
  return tokens
    .map((t) => {
      switch (t.type) {
        case 'text':
          return t.content
        case 'inline_math':
        case 'display_math':
          return `$${t.content}$`
        case 'newline':
          return '\n'
        default:
          return ''
      }
    })
    .join('')
    .trim()
}

function tokensToHtml(tokens: Token[]): string {
  const parts: string[] = []
  let currentParagraph: string[] = []

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      const content = currentParagraph.join('').trim()
      if (content) {
        parts.push(content)
      }
      currentParagraph = []
    }
  }

  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        // Preserve leading/trailing spaces for inline content mixing with math
        currentParagraph.push(processTextContent(token.content, true))
        break
      case 'inline_math':
        currentParagraph.push(renderMath(token.content, false))
        break
      case 'display_math':
        flushParagraph()
        parts.push(`<div class="latex-display-math">${renderMath(token.content, true)}</div>`)
        break
      case 'newline':
        flushParagraph()
        break
    }
  }

  flushParagraph()
  return parts.join(' ')
}

