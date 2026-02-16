/**
 * Generator Test View
 * 
 * A beautiful testing interface for all task generators.
 * Only visible to test users.
 */

import { useState, useCallback, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import { Button } from '../components/Button'
import { Spinner } from '../components/Spinner'
import { GeneratedTaskPreview } from '../components/GeneratedTaskPreview'
import { GlassCard, SurfaceCard } from '../components/GlassCard'
import { 
  initGenerators, 
  getSupportedTypes, 
  requiresLLM,
  generateTask,
  generateBatch,
  type GeneratedTask 
} from '../generators'
import type { TaskInstance } from '../types/taskSchema'

// ════════════════════════════════════════════════════════════════
// TASK TYPE METADATA
// ════════════════════════════════════════════════════════════════

interface TaskTypeInfo {
  id: string
  name: string
  number: number
  description: string
  category: 'algebra' | 'geometri' | 'statistik'
}

const TASK_TYPES: TaskTypeInfo[] = [
  // TAL OG ALGEBRA (1-10)
  { id: 'tal_pris_rabat_procent', number: 1, name: 'Hverdagsregning', description: 'Priser, rabatter og tilbud', category: 'algebra' },
  { id: 'tal_forholdstalsregning', number: 2, name: 'Proportionalitet', description: 'Opskrifter og forhold', category: 'algebra' },
  { id: 'tal_hastighed_tid', number: 3, name: 'Hastighed & tid', description: 'Distance og fart', category: 'algebra' },
  { id: 'tal_broeker_og_antal', number: 4, name: 'Brøker & procent', description: 'Brøker i kontekst', category: 'algebra' },
  { id: 'tal_regnearter', number: 5, name: 'Regnearter', description: 'Plus, minus, gange', category: 'algebra' },
  { id: 'tal_regnehierarki', number: 6, name: 'Regnehierarki', description: 'Parenteser', category: 'algebra' },
  { id: 'tal_ligninger', number: 7, name: 'Ligninger', description: 'Simple ligninger', category: 'algebra' },
  { id: 'tal_overslag', number: 8, name: 'Overslag', description: 'Estimering', category: 'algebra' },
  { id: 'tal_algebraiske_udtryk', number: 9, name: 'Algebra', description: 'Udtryk og variable', category: 'algebra' },
  { id: 'tal_lineaere_funktioner', number: 10, name: 'Funktioner', description: 'Lineære funktioner', category: 'algebra' },
  
  // GEOMETRI OG MÅLING (11-18)
  { id: 'geo_enhedsomregning', number: 11, name: 'Enheder', description: 'Omregning', category: 'geometri' },
  { id: 'geo_trekant_elementer', number: 12, name: 'Trekanter', description: 'Elementer', category: 'geometri' },
  { id: 'geo_ligedannethed', number: 13, name: 'Målestok', description: 'Ligedannethed', category: 'geometri' },
  { id: 'geo_sammensat_figur', number: 14, name: 'Areal', description: 'Sammensatte figurer', category: 'geometri' },
  { id: 'geo_rumfang', number: 15, name: 'Rumfang', description: 'Prismer og cylindre', category: 'geometri' },
  { id: 'geo_vinkelsum', number: 16, name: 'Vinkler', description: 'Vinkelregler', category: 'geometri' },
  { id: 'geo_transformationer', number: 17, name: 'Transformationer', description: 'Spejling, rotation', category: 'geometri' },
  { id: 'geo_projektioner', number: 18, name: '3D-figurer', description: 'Projektioner', category: 'geometri' },
  
  // STATISTIK OG SANDSYNLIGHED (19-22)
  { id: 'stat_soejlediagram', number: 19, name: 'Diagrammer', description: 'Aflæsning', category: 'statistik' },
  { id: 'stat_statistiske_maal', number: 20, name: 'Statistik', description: 'Median, typetal', category: 'statistik' },
  { id: 'stat_boksplot', number: 21, name: 'Boksplot', description: 'Kvartiler', category: 'statistik' },
  { id: 'stat_sandsynlighed', number: 22, name: 'Sandsynlighed', description: 'Beregning', category: 'statistik' },
]

const CATEGORY_INFO = {
  algebra: { 
    name: 'Tal og Algebra', 
    icon: '🔢', 
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    count: 10,
  },
  geometri: { 
    name: 'Geometri og Måling', 
    icon: '📐', 
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    count: 8,
  },
  statistik: { 
    name: 'Statistik og Sandsynlighed', 
    icon: '📊', 
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
    count: 4,
  },
}

// Initialize on first render
let initialized = false

type ViewMode = 'explore' | 'batch'

// ════════════════════════════════════════════════════════════════
// LATEX EXPORT
// ════════════════════════════════════════════════════════════════

/**
 * Convert task text with \(...\) and $...$ to proper LaTeX
 */
function convertToLatex(text: string): string {
  if (!text) return ''
  
  // Convert \(...\) to $...$
  let result = text.replace(/\\\((.+?)\\\)/g, '$$$1$$')
  
  // Replace newlines with LaTeX line breaks
  result = result.replace(/\n/g, '\n\n')
  
  return result
}

/**
 * Convert SVG string to PNG data URL using canvas
 */
async function svgToPng(svgContent: string, scale: number = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    // Extract dimensions from SVG
    const widthMatch = svgContent.match(/width="([0-9.]+)"/)
    const heightMatch = svgContent.match(/height="([0-9.]+)"/)
    
    const width = widthMatch ? parseFloat(widthMatch[1]) : 400
    const height = heightMatch ? parseFloat(heightMatch[1]) : 300
    
    // Create image from SVG
    const img = new Image()
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    
    img.onload = () => {
      // Create canvas and draw
      const canvas = document.createElement('canvas')
      canvas.width = width * scale
      canvas.height = height * scale
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      
      // White background
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw scaled image
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)
      
      // Convert to PNG
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

/**
 * Convert data URL to Uint8Array
 */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i)
  }
  return array
}

/**
 * Simple ZIP file creator (no external dependencies)
 * Creates a valid ZIP archive with multiple files
 */
class SimpleZip {
  private files: { name: string; data: Uint8Array }[] = []
  
  addFile(name: string, data: Uint8Array | string) {
    const bytes = typeof data === 'string' 
      ? new TextEncoder().encode(data)
      : data
    this.files.push({ name, data: bytes })
  }
  
  generate(): Blob {
    const localHeaders: Uint8Array[] = []
    const centralHeaders: Uint8Array[] = []
    let offset = 0
    
    for (const file of this.files) {
      const nameBytes = new TextEncoder().encode(file.name)
      
      // Local file header
      const localHeader = new Uint8Array(30 + nameBytes.length)
      const localView = new DataView(localHeader.buffer)
      
      localView.setUint32(0, 0x04034b50, true)  // Local file header signature
      localView.setUint16(4, 20, true)          // Version needed
      localView.setUint16(6, 0, true)           // General purpose flag
      localView.setUint16(8, 0, true)           // Compression method (store)
      localView.setUint16(10, 0, true)          // Last mod time
      localView.setUint16(12, 0, true)          // Last mod date
      localView.setUint32(14, this.crc32(file.data), true)  // CRC-32
      localView.setUint32(18, file.data.length, true)       // Compressed size
      localView.setUint32(22, file.data.length, true)       // Uncompressed size
      localView.setUint16(26, nameBytes.length, true)       // File name length
      localView.setUint16(28, 0, true)          // Extra field length
      localHeader.set(nameBytes, 30)
      
      localHeaders.push(localHeader)
      localHeaders.push(file.data)
      
      // Central directory header
      const centralHeader = new Uint8Array(46 + nameBytes.length)
      const centralView = new DataView(centralHeader.buffer)
      
      centralView.setUint32(0, 0x02014b50, true)  // Central directory signature
      centralView.setUint16(4, 20, true)          // Version made by
      centralView.setUint16(6, 20, true)          // Version needed
      centralView.setUint16(8, 0, true)           // General purpose flag
      centralView.setUint16(10, 0, true)          // Compression method
      centralView.setUint16(12, 0, true)          // Last mod time
      centralView.setUint16(14, 0, true)          // Last mod date
      centralView.setUint32(16, this.crc32(file.data), true)  // CRC-32
      centralView.setUint32(20, file.data.length, true)       // Compressed size
      centralView.setUint32(24, file.data.length, true)       // Uncompressed size
      centralView.setUint16(28, nameBytes.length, true)       // File name length
      centralView.setUint16(30, 0, true)          // Extra field length
      centralView.setUint16(32, 0, true)          // File comment length
      centralView.setUint16(34, 0, true)          // Disk number start
      centralView.setUint16(36, 0, true)          // Internal file attributes
      centralView.setUint32(38, 0, true)          // External file attributes
      centralView.setUint32(42, offset, true)     // Relative offset of local header
      centralHeader.set(nameBytes, 46)
      
      centralHeaders.push(centralHeader)
      offset += localHeader.length + file.data.length
    }
    
    // End of central directory
    const centralDirSize = centralHeaders.reduce((sum, h) => sum + h.length, 0)
    const endRecord = new Uint8Array(22)
    const endView = new DataView(endRecord.buffer)
    
    endView.setUint32(0, 0x06054b50, true)          // End of central directory signature
    endView.setUint16(4, 0, true)                    // Disk number
    endView.setUint16(6, 0, true)                    // Disk number with central directory
    endView.setUint16(8, this.files.length, true)    // Number of entries on this disk
    endView.setUint16(10, this.files.length, true)   // Total number of entries
    endView.setUint32(12, centralDirSize, true)      // Size of central directory
    endView.setUint32(16, offset, true)              // Offset of central directory
    endView.setUint16(20, 0, true)                   // Comment length
    
    const allParts = [...localHeaders, ...centralHeaders, endRecord]
    return new Blob(allParts as BlobPart[], { type: 'application/zip' })
  }
  
  private crc32(data: Uint8Array): number {
    let crc = 0xFFFFFFFF
    const table = this.getCrcTable()
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF]
    }
    return (crc ^ 0xFFFFFFFF) >>> 0
  }
  
  private getCrcTable(): Uint32Array {
    const table = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      }
      table[i] = c
    }
    return table
  }
}

/**
 * Render a figure to SVG string for export
 */
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
        
        // Whisker lines
        svg += `<line x1="${toX(stats.min)}" y1="${y}" x2="${toX(stats.q1)}" y2="${y}" stroke="#333" stroke-width="1.5"/>`
        svg += `<line x1="${toX(stats.q3)}" y1="${y}" x2="${toX(stats.max)}" y2="${y}" stroke="#333" stroke-width="1.5"/>`
        // Whisker caps
        svg += `<line x1="${toX(stats.min)}" y1="${y-8}" x2="${toX(stats.min)}" y2="${y+8}" stroke="#333" stroke-width="1.5"/>`
        svg += `<line x1="${toX(stats.max)}" y1="${y-8}" x2="${toX(stats.max)}" y2="${y+8}" stroke="#333" stroke-width="1.5"/>`
        // Box
        svg += `<rect x="${toX(stats.q1)}" y="${y-12}" width="${toX(stats.q3) - toX(stats.q1)}" height="24" fill="#E8F4F8" stroke="#333" stroke-width="1.5"/>`
        // Median
        svg += `<line x1="${toX(stats.median)}" y1="${y-12}" x2="${toX(stats.median)}" y2="${y+12}" stroke="#C2725A" stroke-width="2"/>`
        // Label
        svg += `<text x="5" y="${y + 4}" font-size="12" fill="#333">${label}</text>`
      })
      
      svg += '</svg>'
      return svg
    }
    
    // For other types, return null (will show placeholder in LaTeX)
    default:
      return null
  }
}

/**
 * Export tasks to LaTeX format with PNG figures as a ZIP file
 */
async function exportToLatex(tasks: TaskInstance[]): Promise<void> {
  const today = new Date().toLocaleDateString('da-DK', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  const dateStr = new Date().toISOString().slice(0, 10)
  
  // Group tasks by category
  const tasksByType = tasks.reduce((acc, task) => {
    const typeInfo = TASK_TYPES.find(t => t.id === task.type)
    const category = typeInfo?.category || 'andet'
    if (!acc[category]) acc[category] = []
    acc[category].push({ task, typeInfo })
    return acc
  }, {} as Record<string, { task: TaskInstance, typeInfo: TaskTypeInfo | undefined }[]>)
  
  // Create ZIP archive
  const zip = new SimpleZip()
  
  // Collect figures to export
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

  const categoryOrder: ('algebra' | 'geometri' | 'statistik')[] = ['algebra', 'geometri', 'statistik']
  
  for (const category of categoryOrder) {
    const categoryTasks = tasksByType[category]
    if (!categoryTasks || categoryTasks.length === 0) continue
    
    const info = CATEGORY_INFO[category]
    latex += `\\section*{${info.name}}\n\n`
    
    for (const { task } of categoryTasks) {
      latex += `\\stepcounter{opgave}\n`
      latex += `\\subsection*{Opgave \\theopgave}\n\n`
      
      // Add intro
      if (task.intro) {
        latex += `${convertToLatex(task.intro)}\n\n`
      }
      
      // Add figure as image
      if (task.figure) {
        figureIndex++
        const filename = `figur-${figureIndex}.png`
        
        // Convert figure to SVG, then to PNG
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
      
      // Add questions
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
  
  for (const category of categoryOrder) {
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
  
  // Add LaTeX file to ZIP
  zip.addFile('opgavesaet.tex', latex)
  
  // Add all figure images to ZIP
  for (const fig of figures) {
    zip.addFile(fig.filename, dataUrlToBytes(fig.dataUrl))
  }
  
  // Generate and download ZIP
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

const DifficultySelector = ({ 
  value, 
  onChange,
  disabled = false
}: { 
  value: 'let' | 'middel' | 'svaer'
  onChange: (v: 'let' | 'middel' | 'svaer') => void
  disabled?: boolean
}) => (
  <div style={{ display: 'flex', background: 'var(--color-bg-subtle)', padding: 4, borderRadius: 10, border: '1px solid var(--color-border)' }}>
    {(['let', 'middel', 'svaer'] as const).map(diff => (
      <button
        key={diff}
        onClick={() => onChange(diff)}
        disabled={disabled}
        className="hover-scale"
        style={{
          flex: 1,
          padding: '6px 12px',
          borderRadius: 8,
          border: 'none',
          background: value === diff ? 'var(--color-surface)' : 'transparent',
          color: value === diff ? 'var(--color-text)' : 'var(--color-text-muted)',
          boxShadow: value === diff ? 'var(--shadow-sm)' : 'none',
          fontWeight: 600,
          fontSize: 13,
          cursor: disabled ? 'not-allowed' : 'pointer',
          textTransform: 'capitalize',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s ease'
        }}
      >
        {diff}
      </button>
    ))}
  </div>
)

export const GeneratorTestView = observer(() => {
  const [viewMode, setViewMode] = useState<ViewMode>('explore')
  const [selectedType, setSelectedType] = useState<TaskTypeInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedTask, setGeneratedTask] = useState<GeneratedTask | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['algebra', 'geometri', 'statistik']))
  const [showModal, setShowModal] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState<'let' | 'middel' | 'svaer'>('middel')

  // Batch Mode State
  const [batchConfig, setBatchConfig] = useState<Record<string, { count: number, difficulty: 'let' | 'middel' | 'svaer' }>>({})
  const [totalTasks, setTotalTasks] = useState(0)
  const [batchResults, setBatchResults] = useState<TaskInstance[] | null>(null)
  const [showAnswersInBatch, setShowAnswersInBatch] = useState(false)
  const [rerollingIndex, setRerollingIndex] = useState<number | null>(null)
  const [exportingLatex, setExportingLatex] = useState(false)
  
  // Initialize generators on first render
  if (!initialized) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY || ''
    initGenerators(apiKey)
    initialized = true
  }
  
  const supportedTypes = new Set(getSupportedTypes())
  
  // Filter task types based on search
  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) return TASK_TYPES
    const q = searchQuery.toLowerCase()
    return TASK_TYPES.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.description.toLowerCase().includes(q) ||
      t.id.includes(q) ||
      String(t.number).includes(q)
    )
  }, [searchQuery])
  
  // Group filtered types by category
  const groupedTypes = useMemo(() => ({
    algebra: filteredTypes.filter(t => t.category === 'algebra'),
    geometri: filteredTypes.filter(t => t.category === 'geometri'),
    statistik: filteredTypes.filter(t => t.category === 'statistik'),
  }), [filteredTypes])
  
  const handleGenerate = useCallback(async (typeInfo: TaskTypeInfo) => {
    setSelectedType(typeInfo)
    setLoading(true)
    setError(null)
    setShowModal(true)
    
    try {
      const task = await generateTask(typeInfo.id, { difficulty: selectedDifficulty })
      setGeneratedTask(task)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setGeneratedTask(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // ════════════════════════════════════════════════════════════════
  // BATCH MODE LOGIC
  // ════════════════════════════════════════════════════════════════

  const updateBatchCount = (typeId: string, delta: number) => {
    setBatchConfig(prev => {
      const current = prev[typeId] || { count: 0, difficulty: 'middel' }
      const nextCount = Math.max(0, current.count + delta)
      const newConfig = { ...prev, [typeId]: { ...current, count: nextCount } }
      if (nextCount === 0) delete newConfig[typeId]
      
      // Update total
      const newTotal = Object.values(newConfig).reduce((sum, item) => sum + item.count, 0)
      setTotalTasks(newTotal)
      
      return newConfig
    })
  }

  const setBatchCount = (typeId: string, count: number) => {
    setBatchConfig(prev => {
      const current = prev[typeId] || { count: 0, difficulty: 'middel' }
      const nextCount = Math.max(0, count)
      const newConfig = { ...prev, [typeId]: { ...current, count: nextCount } }
      if (nextCount === 0) delete newConfig[typeId]
      
      // Update total
      const newTotal = Object.values(newConfig).reduce((sum, item) => sum + item.count, 0)
      setTotalTasks(newTotal)
      
      return newConfig
    })
  }

  const setBatchDifficulty = (typeId: string, difficulty: 'let' | 'middel' | 'svaer') => {
    setBatchConfig(prev => {
      const current = prev[typeId]
      if (!current) return prev // Can't set difficulty if not selected
      
      return { ...prev, [typeId]: { ...current, difficulty } }
    })
  }

  const distributeTotal = (total: number) => {
    setTotalTasks(total)
    
    // Find currently selected types, or all supported if none selected
    let targetTypes = Object.keys(batchConfig)
    if (targetTypes.length === 0) {
      // Fallback: If no types selected, select ALL supported types
      targetTypes = TASK_TYPES.filter(t => supportedTypes.has(t.id)).map(t => t.id)
    }

    if (targetTypes.length === 0) return

    const countPerType = Math.floor(total / targetTypes.length)
    const remainder = total % targetTypes.length

    const newConfig: Record<string, { count: number, difficulty: 'let' | 'middel' | 'svaer' }> = {}
    targetTypes.forEach((id, index) => {
      const count = countPerType + (index < remainder ? 1 : 0)
      if (count > 0) {
        // Preserve existing difficulty or default to 'middel'
        const existing = batchConfig[id]
        newConfig[id] = { 
          count, 
          difficulty: existing ? existing.difficulty : 'middel' 
        }
      }
    })
    setBatchConfig(newConfig)
  }

  const handleSelectAll = () => {
    const newConfig: Record<string, { count: number, difficulty: 'let' | 'middel' | 'svaer' }> = {}
    let count = 0
    TASK_TYPES.forEach(t => {
      if (supportedTypes.has(t.id)) {
        newConfig[t.id] = { count: 1, difficulty: 'middel' }
        count++
      }
    })
    setBatchConfig(newConfig)
    setTotalTasks(count)
  }

  const handleBatchGenerate = async () => {
    setLoading(true)
    setError(null)
    setBatchResults(null)

    try {
      const promises: Promise<TaskInstance[]>[] = []
      
      for (const [typeId, config] of Object.entries(batchConfig)) {
        if (config.count > 0) {
          promises.push(generateBatch(typeId, config.count, { difficulty: config.difficulty }))
        }
      }
      
      const results = await Promise.all(promises)
      const allTasks = results.flat()
      setBatchResults(allTasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const clearBatch = () => {
    setBatchConfig({})
    setTotalTasks(0)
    setBatchResults(null)
    setError(null)
  }

  const handleRerollTask = async (index: number) => {
    if (!batchResults) return
    
    const task = batchResults[index]
    const difficulty = (task.variables?.difficulty as 'let' | 'middel' | 'svaer') || 'middel'
    
    setRerollingIndex(index)
    
    try {
      const newTask = await generateTask(task.type, { difficulty })
      
      // Replace the task in the array
      setBatchResults(prev => {
        if (!prev) return prev
        const updated = [...prev]
        updated[index] = {
          ...newTask,
          id: `${newTask.type}_${Date.now()}_${index}`,
        } as TaskInstance
        return updated
      })
    } catch (err) {
      console.error('Failed to reroll task:', err)
    } finally {
      setRerollingIndex(null)
    }
  }
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }
  
  const closeModal = () => {
    setShowModal(false)
    setGeneratedTask(null)
    setError(null)
    setSelectedType(null)
  }

  return (
    <section className="testlab">
      {/* Hero Header */}
      <header className="testlab__hero">
        <div className="testlab__hero-content">
          <div className="testlab__hero-badge">
            <span className="testlab__hero-badge-icon">🧪</span>
            <span>Developer Preview</span>
          </div>
          <h1 className="testlab__hero-title">Generator Test Lab</h1>
          <p className="testlab__hero-subtitle">
            Test og udforsk alle 22 opgavegeneratorer. 
            {viewMode === 'explore' 
              ? ' Klik på en type for at generere unikke opgaver.' 
              : ' Sammensæt et opgavesæt ved at vælge antal for hver type.'}
          </p>
        </div>
        
        {/* Mode Switcher */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
          <GlassCard padding="sm" radius="lg" style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.05)' }}>
            <button 
              className={`btn btn-sm ${viewMode === 'explore' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('explore')}
            >
              Udforsk
            </button>
            <button 
              className={`btn btn-sm ${viewMode === 'batch' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('batch')}
            >
              Opgavesæt
            </button>
          </GlassCard>

          {/* Stats */}
          <div className="testlab__stats">
            <div className="testlab__stat">
              <div className="testlab__stat-value">{TASK_TYPES.length}</div>
              <div className="testlab__stat-label">Typer</div>
            </div>
            <div className="testlab__stat testlab__stat--accent">
              <div className="testlab__stat-value">{TASK_TYPES.filter(t => !requiresLLM(t.id)).length}</div>
              <div className="testlab__stat-label">Logik</div>
            </div>
          </div>
        </div>
      </header>

      {/* Shared Difficulty Selector - ONLY FOR EXPLORE MODE */}
      {viewMode === 'explore' && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <GlassCard padding="sm" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Sværhedsgrad:</span>
            <DifficultySelector value={selectedDifficulty} onChange={setSelectedDifficulty} />
          </GlassCard>
        </div>
      )}
      
      {viewMode === 'explore' ? (
        <>
          {/* Search */}
          <div className="testlab__search">
            <div className="testlab__search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <input
              type="text"
              className="testlab__search-input"
              placeholder="Søg efter opgavetype..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="testlab__search-clear" onClick={() => setSearchQuery('')}>
                ✕
              </button>
            )}
          </div>
          
          {/* Categories */}
          <div className="testlab__categories">
            {(['algebra', 'geometri', 'statistik'] as const).map(category => {
              const info = CATEGORY_INFO[category]
              const types = groupedTypes[category]
              const isExpanded = expandedCategories.has(category)
              
              if (types.length === 0) return null
              
              return (
                <div key={category} className={`testlab__category ${isExpanded ? 'expanded' : ''}`}>
                  <button 
                    className="testlab__category-header"
                    onClick={() => toggleCategory(category)}
                    style={{ '--category-color': info.color, '--category-gradient': info.gradient } as React.CSSProperties}
                  >
                    <div className="testlab__category-icon">{info.icon}</div>
                    <div className="testlab__category-info">
                      <h2 className="testlab__category-name">{info.name}</h2>
                      <span className="testlab__category-count">{types.length} opgavetyper</span>
                    </div>
                    <div className={`testlab__category-arrow ${isExpanded ? 'expanded' : ''}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </button>
                  
                  <div className={`testlab__category-content ${isExpanded ? 'expanded' : ''}`}>
                    <div className="testlab__grid">
                      {types.map(typeInfo => {
                        const isSupported = supportedTypes.has(typeInfo.id)
                        const isLLM = requiresLLM(typeInfo.id)
                        
                        return (
                          <button
                            key={typeInfo.id}
                            className={`testlab__card ${!isSupported ? 'disabled' : ''}`}
                            onClick={() => isSupported && handleGenerate(typeInfo)}
                            disabled={!isSupported}
                            style={{ '--category-color': info.color } as React.CSSProperties}
                          >
                            <div className="testlab__card-number">{typeInfo.number}</div>
                            <div className="testlab__card-content">
                              <h3 className="testlab__card-title">{typeInfo.name}</h3>
                              <p className="testlab__card-desc">{typeInfo.description}</p>
                            </div>
                            <div className="testlab__card-badge">
                              {!isSupported ? (
                                <span className="testlab__badge testlab__badge--disabled">🚧</span>
                              ) : isLLM ? (
                                <span className="testlab__badge testlab__badge--ai">🤖 AI</span>
                              ) : (
                                <span className="testlab__badge testlab__badge--logic">⚡</span>
                              )}
                            </div>
                            <div className="testlab__card-arrow">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                              </svg>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        /* ══════════════════════════════════════════════════════════════
           BATCH MODE UI
           ══════════════════════════════════════════════════════════════ */
        <div className="batch-view" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          {/* Batch Controls */}
          {!batchResults ? (
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
              
              {/* Sticky Controls */}
              <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <GlassCard padding="md">
                  <h3 style={{ marginBottom: 16 }}>Indstillinger</h3>
                  
                  <div className="field" style={{ marginBottom: 20 }}>
                    <label className="field-label">Total Antal</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input 
                        type="number" 
                        className="field-input" 
                        value={totalTasks}
                        onChange={e => distributeTotal(parseInt(e.target.value) || 0)}
                        min={0}
                        max={100}
                      />
                      <Button variant="secondary" onClick={() => distributeTotal(totalTasks)}>Fordel</Button>
                    </div>
                    <p className="field-hint" style={{ marginTop: 8 }}>
                      Vælg opgavetyper først, eller brug 'Fordel' til at sprede antallet jævnt over alle typer.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                    <Button variant="secondary" className="btn-sm" onClick={handleSelectAll}>Vælg alle</Button>
                    <Button variant="ghost" className="btn-sm" onClick={() => { setBatchConfig({}); setTotalTasks(0); }}>Nulstil valg</Button>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button 
                      variant="primary" 
                      className="btn-block" 
                      onClick={handleBatchGenerate}
                      disabled={loading || totalTasks === 0}
                    >
                      {loading ? 'Genererer...' : `Generer ${totalTasks} opgaver`}
                    </Button>
                    <Button variant="ghost" className="btn-icon" onClick={clearBatch} title="Nulstil">
                      ✕
                    </Button>
                  </div>
                </GlassCard>

                {error && (
                  <div className="testlab__modal-error" style={{ padding: 16, minHeight: 'auto', background: 'rgba(255,59,48,0.1)', borderRadius: 12 }}>
                     <p style={{ color: 'var(--color-error)', margin: 0 }}>{error}</p>
                  </div>
                )}
              </div>

              {/* Type Selection Grid */}
              <div className="testlab__categories">
                {(['algebra', 'geometri', 'statistik'] as const).map(category => {
                  const info = CATEGORY_INFO[category]
                  const types = groupedTypes[category]
                  if (types.length === 0) return null
                  
                  return (
                    <div key={category} className="testlab__category expanded" style={{ overflow: 'visible' }}>
                       <div 
                        className="testlab__category-header"
                        style={{ '--category-color': info.color, '--category-gradient': info.gradient, cursor: 'default' } as React.CSSProperties}
                      >
                        <div className="testlab__category-icon" style={{ width: 40, height: 40, fontSize: 20 }}>{info.icon}</div>
                        <div className="testlab__category-info">
                          <h2 className="testlab__category-name" style={{ fontSize: '1.1rem' }}>{info.name}</h2>
                        </div>
                      </div>

                      <div className="testlab__grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                        {types.map(typeInfo => {
                          const isSupported = supportedTypes.has(typeInfo.id)
                          const config = batchConfig[typeInfo.id]
                          const count = config?.count || 0
                          
                          return (
                            <SurfaceCard 
                              key={typeInfo.id}
                              padding="sm"
                              className={!isSupported ? 'disabled' : ''}
                              style={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                gap: 12,
                                border: count > 0 ? `2px solid ${info.color}` : undefined,
                                opacity: !isSupported ? 0.6 : 1
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                                <div className="testlab__card-number" style={{ width: 32, height: 32, fontSize: 13, borderColor: info.color, color: info.color }}>
                                  {typeInfo.number}
                                </div>
                                
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {typeInfo.name}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                                    {requiresLLM(typeInfo.id) ? '🤖 AI' : '⚡ Logic'}
                                  </div>
                                </div>

                                {isSupported && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--color-bg-subtle)', borderRadius: 8, padding: 2 }}>
                                    <button 
                                      className="btn btn-ghost btn-sm" 
                                      style={{ width: 24, height: 24, padding: 0 }}
                                      onClick={() => updateBatchCount(typeInfo.id, -1)}
                                    >
                                      -
                                    </button>
                                    <input 
                                      type="text" 
                                      value={count} 
                                      onChange={(e) => setBatchCount(typeInfo.id, parseInt(e.target.value) || 0)}
                                      style={{ width: 32, textAlign: 'center', background: 'transparent', border: 'none', fontWeight: 600 }}
                                    />
                                    <button 
                                      className="btn btn-ghost btn-sm" 
                                      style={{ width: 24, height: 24, padding: 0 }}
                                      onClick={() => updateBatchCount(typeInfo.id, 1)}
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                              </div>

                              {isSupported && count > 0 && (
                                <div style={{ width: '100%', paddingTop: 8, borderTop: '1px solid var(--color-border-subtle)' }}>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    {(['let', 'middel', 'svaer'] as const).map(d => (
                                      <button
                                        key={d}
                                        onClick={() => setBatchDifficulty(typeInfo.id, d)}
                                        style={{
                                          flex: 1,
                                          fontSize: 11,
                                          padding: '4px',
                                          borderRadius: 6,
                                          border: 'none',
                                          background: config.difficulty === d ? info.color : 'transparent',
                                          color: config.difficulty === d ? 'white' : 'var(--color-text-muted)',
                                          cursor: 'pointer',
                                          fontWeight: 600,
                                          textTransform: 'capitalize'
                                        }}
                                      >
                                        {d}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </SurfaceCard>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Results View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <GlassCard padding="md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 24, zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="testlab__hero-badge" style={{ marginBottom: 0 }}>
                    <span className="testlab__hero-badge-icon">✅</span>
                    <span>Resultat</span>
                  </div>
                  <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{batchResults.length} opgaver genereret</h2>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input 
                      type="checkbox" 
                      checked={showAnswersInBatch} 
                      onChange={e => setShowAnswersInBatch(e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    Vis svar
                  </label>
                  <Button 
                    variant="secondary" 
                    disabled={exportingLatex}
                    onClick={async () => {
                      setExportingLatex(true)
                      try {
                        await exportToLatex(batchResults)
                      } finally {
                        setExportingLatex(false)
                      }
                    }}
                  >
                    {exportingLatex ? '⏳ Eksporterer...' : '📄 LaTeX'}
                  </Button>
                  <Button variant="secondary" onClick={() => window.print()}>🖨️ Udskriv</Button>
                  <Button variant="primary" onClick={() => { setBatchResults(null); setTotalTasks(0); setBatchConfig({}); }}>Ny generering</Button>
                </div>
              </GlassCard>

              <div className="task-list" style={{ display: 'flex', flexDirection: 'column', gap: 48, paddingBottom: 100 }}>
                {batchResults.map((task, index) => (
                  <div key={task.id} style={{ breakInside: 'avoid', opacity: rerollingIndex === index ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--color-border)' }}>
                      <span className="testlab__card-number" style={{ background: 'var(--color-text)', color: 'white', borderColor: 'transparent' }}>
                        {index + 1}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'monospace', flex: 1 }}>{task.type}</span>
                      <button
                        onClick={() => handleRerollTask(index)}
                        disabled={rerollingIndex !== null}
                        title="Generer ny opgave"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--color-border)',
                          background: rerollingIndex === index ? 'var(--color-bg-subtle)' : 'var(--color-surface)',
                          color: 'var(--color-text-secondary)',
                          cursor: rerollingIndex !== null ? 'not-allowed' : 'pointer',
                          fontSize: 13,
                          fontWeight: 500,
                          transition: 'all 0.2s',
                        }}
                        className="hover-scale"
                      >
                        {rerollingIndex === index ? (
                          <>
                            <Spinner />
                            <span>Genererer...</span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 16 }}>🔄</span>
                            <span>Ny opgave</span>
                          </>
                        )}
                      </button>
                    </div>
                    {/* Render using preview but casting TaskInstance to GeneratedTask since they are compatible */}
                    <GeneratedTaskPreview task={task as any} showAnswers={showAnswersInBatch} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Legend - Only show in explore or config mode */}
      {!batchResults && (
        <div className="testlab__legend">
          <div className="testlab__legend-item">
            <span className="testlab__badge testlab__badge--logic">⚡</span>
            <span>Instant (logic-baseret)</span>
          </div>
          <div className="testlab__legend-item">
            <span className="testlab__badge testlab__badge--ai">🤖 AI</span>
            <span>OpenAI-powered</span>
          </div>
        </div>
      )}
      
      {/* Modal - Only used in Explore mode */}
      {showModal && (
        <div className="testlab__modal-overlay" onClick={closeModal}>
          <div className="testlab__modal" onClick={e => e.stopPropagation()}>
            <button className="testlab__modal-close" onClick={closeModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            
            {loading && (
              <div className="testlab__modal-loading">
                <Spinner />
                <p>Genererer opgave...</p>
              </div>
            )}
            
            {error && (
              <div className="testlab__modal-error">
                <div className="testlab__modal-error-icon">❌</div>
                <h3>Der opstod en fejl</h3>
                <p>{error}</p>
                <Button variant="primary" onClick={() => selectedType && handleGenerate(selectedType)}>
                  Prøv igen
                </Button>
              </div>
            )}
            
            {!loading && !error && generatedTask && selectedType && (
              <>
                <div className="testlab__modal-header">
                  <div 
                    className="testlab__modal-category-badge"
                    style={{ '--category-color': CATEGORY_INFO[selectedType.category].color } as React.CSSProperties}
                  >
                    <span>{CATEGORY_INFO[selectedType.category].icon}</span>
                    <span>{CATEGORY_INFO[selectedType.category].name}</span>
                  </div>
                  <div className="testlab__modal-title-row">
                    <span className="testlab__modal-number">#{selectedType.number}</span>
                    <h2 className="testlab__modal-title">{selectedType.name}</h2>
                  </div>
                  <Button 
                    variant="primary" 
                    onClick={() => handleGenerate(selectedType)}
                  >
                    🔄 Ny opgave
                  </Button>
                </div>
                
                <div className="testlab__modal-content">
                  <GeneratedTaskPreview task={generatedTask} showAnswers={true} />
                </div>
                
                {generatedTask.variables && (
                  <details className="testlab__modal-debug">
                    <summary>🔧 Debug: Genererings-variabler</summary>
                    <pre>{JSON.stringify(generatedTask.variables, null, 2)}</pre>
                  </details>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
})
