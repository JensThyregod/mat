/**
 * LaTeX export — converts generated tasks into a .tex document
 * bundled with PNG figures inside a ZIP archive.
 */

import type { TaskInstance } from '../types/taskSchema'
import { SimpleZip, dataUrlToBytes } from './zipExport'
import { TASK_TYPES, CATEGORY_INFO, CATEGORY_ORDER, type TaskTypeInfo } from '../views/generator-test/constants'

function convertToLatex(text: string): string {
  if (!text) return ''
  let result = text.replace(/\\\((.+?)\\\)/g, '$$$1$$')
  result = result.replace(/\n/g, '\n\n')
  return result
}

async function svgToPng(svgContent: string, scale: number = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const widthMatch = svgContent.match(/width="([0-9.]+)"/)
    const heightMatch = svgContent.match(/height="([0-9.]+)"/)

    const width = widthMatch ? parseFloat(widthMatch[1]) : 400
    const height = heightMatch ? parseFloat(heightMatch[1]) : 300

    const img = new Image()
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width * scale
      canvas.height = height * scale

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)

      const pngDataUrl = canvas.toDataURL('image/png')
      URL.revokeObjectURL(url)
      resolve(pngDataUrl)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG'))
    }

    img.src = url
  })
}

function figureToSvg(figure: TaskInstance['figure']): string | null {
  if (!figure) return null

  switch (figure.type) {
    case 'svg':
      return figure.content

    case 'bar_chart': {
      const entries = Object.entries(figure.data)
      const maxVal = Math.max(...Object.values(figure.data))
      const barWidth = 50
      const gap = 10
      const chartHeight = 200
      const chartWidth = entries.length * (barWidth + gap) + gap

      let svg = `<svg width="${chartWidth}" height="${chartHeight + 40}" xmlns="http://www.w3.org/2000/svg">`
      svg += `<rect width="100%" height="100%" fill="white"/>`

      entries.forEach(([label, value], i) => {
        const barHeight = (value / maxVal) * chartHeight
        const x = gap + i * (barWidth + gap)
        const y = chartHeight - barHeight

        svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#6366F1"/>`
        svg += `<text x="${x + barWidth/2}" y="${y - 5}" text-anchor="middle" font-size="12" fill="#333">${value}</text>`
        svg += `<text x="${x + barWidth/2}" y="${chartHeight + 20}" text-anchor="middle" font-size="11" fill="#666">${label}</text>`
      })

      svg += '</svg>'
      return svg
    }

    case 'boxplot': {
      const entries = Object.entries(figure.data)
      const allVals = entries.flatMap(([, d]) => [d.min, d.max])
      const dataMin = Math.min(...allVals)
      const dataMax = Math.max(...allVals)
      const range = dataMax - dataMin || 1

      const plotWidth = 400
      const rowHeight = 40
      const labelWidth = 60
      const chartHeight = entries.length * rowHeight + 40

      const toX = (v: number) => labelWidth + ((v - dataMin) / range) * (plotWidth - labelWidth - 20)

      let svg = `<svg width="${plotWidth}" height="${chartHeight}" xmlns="http://www.w3.org/2000/svg">`
      svg += `<rect width="100%" height="100%" fill="white"/>`

      entries.forEach(([label, stats], i) => {
        const y = 20 + i * rowHeight + rowHeight / 2

        svg += `<line x1="${toX(stats.min)}" y1="${y}" x2="${toX(stats.q1)}" y2="${y}" stroke="#333" stroke-width="1.5"/>`
        svg += `<line x1="${toX(stats.q3)}" y1="${y}" x2="${toX(stats.max)}" y2="${y}" stroke="#333" stroke-width="1.5"/>`
        svg += `<line x1="${toX(stats.min)}" y1="${y-8}" x2="${toX(stats.min)}" y2="${y+8}" stroke="#333" stroke-width="1.5"/>`
        svg += `<line x1="${toX(stats.max)}" y1="${y-8}" x2="${toX(stats.max)}" y2="${y+8}" stroke="#333" stroke-width="1.5"/>`
        svg += `<rect x="${toX(stats.q1)}" y="${y-12}" width="${toX(stats.q3) - toX(stats.q1)}" height="24" fill="#E8F4F8" stroke="#333" stroke-width="1.5"/>`
        svg += `<line x1="${toX(stats.median)}" y1="${y-12}" x2="${toX(stats.median)}" y2="${y+12}" stroke="#C2725A" stroke-width="2"/>`
        svg += `<text x="5" y="${y + 4}" font-size="12" fill="#333">${label}</text>`
      })

      svg += '</svg>'
      return svg
    }

    default:
      return null
  }
}

export async function exportToLatex(tasks: TaskInstance[]): Promise<void> {
  const today = new Date().toLocaleDateString('da-DK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const dateStr = new Date().toISOString().slice(0, 10)

  const tasksByType = tasks.reduce((acc, task) => {
    const typeInfo = TASK_TYPES.find(t => t.id === task.type)
    const category = typeInfo?.category || 'andet'
    if (!acc[category]) acc[category] = []
    acc[category].push({ task, typeInfo })
    return acc
  }, {} as Record<string, { task: TaskInstance, typeInfo: TaskTypeInfo | undefined }[]>)

  const zip = new SimpleZip()

  const figures: { filename: string; dataUrl: string }[] = []
  let figureIndex = 0

  let latex = `\\documentclass[11pt,a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[danish]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{graphicx}

\\geometry{margin=2.5cm}

\\newcounter{opgave}

\\begin{document}

\\begin{center}
{\\LARGE\\textbf{Matematik Opgavesæt}}\\\\[0.5em]
{\\large ${today}}\\\\[0.3em]
${tasks.length} opgaver
\\end{center}

\\vspace{1.5em}
\\hrule
\\vspace{1.5em}

`

  for (const category of CATEGORY_ORDER) {
    const categoryTasks = tasksByType[category]
    if (!categoryTasks || categoryTasks.length === 0) continue

    const info = CATEGORY_INFO[category]
    latex += `\\section*{${info.name}}\n\n`

    for (const { task } of categoryTasks) {
      latex += `\\stepcounter{opgave}\n`
      latex += `\\subsection*{Opgave \\theopgave}\n\n`

      if (task.intro) {
        latex += `${convertToLatex(task.intro)}\n\n`
      }

      if (task.figure) {
        figureIndex++
        const filename = `figur-${figureIndex}.png`

        const svgContent = figureToSvg(task.figure)
        if (svgContent) {
          try {
            const pngDataUrl = await svgToPng(svgContent)
            figures.push({ filename, dataUrl: pngDataUrl })

            latex += `\\begin{center}\n`
            latex += `\\includegraphics[width=0.6\\textwidth]{${filename}}\n`
            latex += `\\end{center}\n\n`
          } catch {
            latex += `% Figure ${figureIndex} could not be converted\n\n`
          }
        } else {
          latex += `% Figure ${figureIndex}: type "${task.figure.type}" not supported\n\n`
        }
      }

      if (task.questions.length > 0) {
        latex += `\\begin{enumerate}[label=\\alph*)]\n`
        for (const q of task.questions) {
          latex += `\\item ${convertToLatex(q.text)}\n`
          latex += `\\vspace{3em}\n`
        }
        latex += `\\end{enumerate}\n`
      }

      latex += `\\vspace{1em}\n\\hrule\n\\vspace{1em}\n\n`
    }
  }

  // Answer key
  latex += `\\newpage\n\\section*{Facitliste}\n\n\\begin{enumerate}\n`

  for (const category of CATEGORY_ORDER) {
    const categoryTasks = tasksByType[category]
    if (!categoryTasks || categoryTasks.length === 0) continue

    for (const { task } of categoryTasks) {
      if (task.questions.length === 1) {
        latex += `\\item ${convertToLatex(task.questions[0].answer)}\n`
      } else {
        const answers = task.questions.map((q, i) =>
          `${String.fromCharCode(97 + i)}) ${convertToLatex(q.answer)}`
        ).join(', ')
        latex += `\\item ${answers}\n`
      }
    }
  }

  latex += `\\end{enumerate}\n\n\\end{document}\n`

  zip.addFile('opgavesaet.tex', latex)

  for (const fig of figures) {
    zip.addFile(fig.filename, dataUrlToBytes(fig.dataUrl))
  }

  const zipBlob = zip.generate()
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `opgavesaet-${dateStr}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
