// ============================================
// LATEX RENDERER
// Renders LaTeX strings (with math) to HTML using KaTeX
// ============================================

import katex from 'katex'

// ============================================
// CORE RENDERING
// ============================================

/**
 * Render a LaTeX math expression to HTML using KaTeX
 */
export function renderMath(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex.trim(), {
      throwOnError: false,
      displayMode,
    })
  } catch {
    return `<code class="latex-error">${escapeHtml(latex)}</code>`
  }
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Process LaTeX text commands to HTML
 */
export function processTextContent(text: string, preserveSpaces: boolean = false): string {
  let processed = text.replace(/\s+/g, ' ')
  
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

// ============================================
// MAIN RENDERING FUNCTION
// ============================================

/**
 * Render a string containing LaTeX math to HTML
 * 
 * Supports:
 * - \(...\) → inline math
 * - \[...\] → display math
 * - $...$ → inline math
 * - $$...$$ → display math
 * - Plain text with LaTeX commands
 */
export function renderLatexToHtml(text: string): string {
  if (!text) return ''
  
  const parts: string[] = []
  let remaining = text
  
  // Patterns to match math delimiters
  const patterns: Array<{
    regex: RegExp
    handler: (match: RegExpMatchArray) => string
  }> = [
    // Display math \[...\]
    {
      regex: /^\\\[([\s\S]*?)\\\]/,
      handler: (m) => `<div class="latex-display-math">${renderMath(m[1], true)}</div>`,
    },
    // Display math $$...$$
    {
      regex: /^\$\$([\s\S]*?)\$\$/,
      handler: (m) => `<div class="latex-display-math">${renderMath(m[1], true)}</div>`,
    },
    // Inline math \(...\)
    {
      regex: /^\\\(([\s\S]*?)\\\)/,
      handler: (m) => renderMath(m[1], false),
    },
    // Inline math $...$ (single dollar, not escaped)
    {
      regex: /^\$([^$]+?)\$/,
      handler: (m) => renderMath(m[1], false),
    },
    // Newline (paragraph break)
    {
      regex: /^\n\s*\n/,
      handler: () => '<br><br>',
    },
  ]
  
  while (remaining.length > 0) {
    let matched = false
    
    for (const { regex, handler } of patterns) {
      const match = remaining.match(regex)
      if (match) {
        parts.push(handler(match))
        remaining = remaining.slice(match[0].length)
        matched = true
        break
      }
    }
    
    if (!matched) {
      // Find next math delimiter
      const nextSpecial = remaining.search(/\\\(|\\\[|\$/)
      
      if (nextSpecial === -1) {
        // Rest is plain text
        parts.push(processTextContent(remaining, true))
        break
      } else if (nextSpecial === 0) {
        // Unknown pattern starting with special char, consume one char
        parts.push(remaining[0])
        remaining = remaining.slice(1)
      } else {
        // Plain text before next special
        parts.push(processTextContent(remaining.slice(0, nextSpecial), true))
        remaining = remaining.slice(nextSpecial)
      }
    }
  }
  
  return parts.join('')
}

/**
 * Check if a string contains LaTeX math delimiters
 */
export function containsMath(text: string): boolean {
  return /\\\(|\\\[|\$/.test(text)
}

/**
 * Render pure math (without delimiters) to HTML
 */
export function renderPureMath(latex: string, displayMode: boolean = false): string {
  return renderMath(latex, displayMode)
}

