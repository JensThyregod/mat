import { useMemo } from 'react'
import katex from 'katex'
import { parseLatexToHtml, containsLatexStructure } from '../utils/latexParser'
import { MathErrorBoundary } from './ErrorBoundary'

type Props = {
  latex: string
  displayMode?: boolean
}

const LatexViewInner = ({ latex, displayMode = true }: Props) => {
  const rendered = useMemo(() => {
    if (!latex) return ''
    const trimmed = latex.trim()

    if (containsLatexStructure(trimmed)) {
      return parseLatexToHtml(trimmed)
    }

    try {
      return katex.renderToString(trimmed, {
        throwOnError: false,
        displayMode,
      })
    } catch {
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

export const LatexView = (props: Props) => (
  <MathErrorBoundary>
    <LatexViewInner {...props} />
  </MathErrorBoundary>
)
