import { renderLatexToHtml } from './latexRenderer'

export interface MCOption {
  letter: string
  text: string
  html: string
}

export interface ParsedMC {
  prompt: string
  promptHtml: string
  options: MCOption[]
}

export function parseMultipleChoice(
  questionText: string,
  opts?: { optionNewlineToBr?: boolean },
): ParsedMC | null {
  const optionPattern = /\n\n([A-D]\).+(?:\n[A-D]\).+)*)\s*$/s
  const match = questionText.match(optionPattern)
  if (!match) return null

  const prompt = questionText.slice(0, match.index!).trim()
  const promptHtml = renderLatexToHtml(prompt, { newlineToBr: true })
  const useNewline = opts?.optionNewlineToBr ?? true
  const optionLines = match[1].split('\n').filter(l => l.trim())
  const options: MCOption[] = optionLines.map(line => {
    const m = line.match(/^([A-D])\)\s*(.+)$/)
    if (!m) return { letter: '?', text: line, html: renderLatexToHtml(line, { newlineToBr: useNewline }) }
    return { letter: m[1], text: m[2].trim(), html: renderLatexToHtml(m[2].trim(), { newlineToBr: useNewline }) }
  })

  return { prompt, promptHtml, options }
}
