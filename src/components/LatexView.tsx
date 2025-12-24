import { useMemo } from 'react'
import katex from 'katex'
import { parseLatexToHtml, containsLatexStructure } from '../utils/latexParser'

type Props = {
  latex: string
  displayMode?: boolean
}

export const LatexView = ({ latex, displayMode = true }: Props) => {
  const rendered = useMemo(() => {
    if (!latex) return ''
    const trimmed = latex.trim()
    
    // Check if this contains LaTeX structure (sections, lists, etc.)
    // or is just pure math
    if (containsLatexStructure(trimmed)) {
      // Use our custom parser for structured LaTeX
      return parseLatexToHtml(trimmed)
    }
    
    // Pure math - render directly with KaTeX
    try {
      return katex.renderToString(trimmed, {
        throwOnError: false,
        displayMode,
      })
    } catch {
      // Fallback: try parsing as structured LaTeX anyway
      return parseLatexToHtml(trimmed)
    }
  }, [latex, displayMode])

  return (
    <div
      className="latex-view"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  )
}
