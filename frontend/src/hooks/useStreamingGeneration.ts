import { useState, useCallback, useRef } from 'react'
import type {
  TerminsproveRequest,
  GenerationProgress,
  TerminsproveResult,
  CanvasTask,
  TaskGenerationPhase,
} from '../views/terminsprove/types'
import { API_BASE } from '../views/terminsprove/utils'

export interface StreamingGenerationState {
  isGenerating: boolean
  result: TerminsproveResult | null
  error: string | null
  canvasTasks: CanvasTask[]
  showCanvas: boolean
  generationStartTime: number | null
  generationSpeed: number | null
  canvasRef: React.RefObject<HTMLDivElement | null>
}

export interface StreamingGenerationActions {
  startGeneration: (request: TerminsproveRequest) => Promise<void>
  cancelGeneration: () => void
  resetGeneration: () => void
}

export function useStreamingGeneration(): StreamingGenerationState & StreamingGenerationActions {
  const [isGenerating, setIsGenerating] = useState(false)
  const [, setProgress] = useState<GenerationProgress | null>(null)
  const [result, setResult] = useState<TerminsproveResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [canvasTasks, setCanvasTasks] = useState<CanvasTask[]>([])
  const [showCanvas, setShowCanvas] = useState(false)
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const generationSpeed = generationStartTime && canvasTasks.length > 0
    ? Math.round((Date.now() - generationStartTime) / canvasTasks.length)
    : null

  const handleProgressEvent = useCallback((progressData: GenerationProgress) => {
    setProgress(progressData)

    const eventType = (progressData.eventType || 'progress').toLowerCase()
    const taskIndex = progressData.taskIndex

    switch (eventType) {
      case 'taskstarted':
        if (taskIndex) {
          setCanvasTasks(prev => {
            const exists = prev.some(t => t.index === taskIndex)
            if (exists) return prev
            return [...prev, {
              id: `task-${taskIndex}-${Date.now()}`,
              index: taskIndex,
              phase: (progressData.taskPhase || 'formatting') as TaskGenerationPhase,
              startTime: Date.now()
            }]
          })
        }
        break

      case 'taskformatted':
      case 'taskvalidated':
      case 'taskvisualized':
        if (taskIndex) {
          setCanvasTasks(prev => prev.map(t =>
            t.index === taskIndex
              ? { ...t, phase: (progressData.taskPhase || t.phase) as TaskGenerationPhase, task: progressData.completedTask || t.task }
              : t
          ))
        }
        break

      case 'taskcompleted':
        if (progressData.completedTask) {
          const task = progressData.completedTask
          const idx = taskIndex || progressData.tasksCompleted

          setCanvasTasks(prev => {
            const existingIdx = prev.findIndex(t => t.index === idx)

            if (existingIdx >= 0) {
              const updated = [...prev]
              updated[existingIdx] = { ...updated[existingIdx], phase: 'complete', task }
              return updated
            } else {
              return [...prev, {
                id: `task-${idx}-${Date.now()}`,
                index: idx,
                phase: 'complete' as TaskGenerationPhase,
                task,
                startTime: Date.now()
              }]
            }
          })

          requestAnimationFrame(() => {
            canvasRef.current?.lastElementChild?.scrollIntoView({
              behavior: 'smooth',
              block: 'end'
            })
          })
        }
        break

      case 'taskimagegenerating':
        {
          const targetTaskId = progressData.taskId
          const targetIdx = taskIndex
          if (targetTaskId || targetIdx) {
            setCanvasTasks(prev => prev.map(t => {
              const match = targetTaskId
                ? t.task?.id === targetTaskId
                : t.index === targetIdx
              return match ? { ...t, imageGenerating: true } : t
            }))
          }
        }
        break

      case 'taskimageready':
        {
          const imgTaskId = progressData.taskId
          const imgIdx = taskIndex
          const imgUrl = progressData.imageUrl
          if (imgUrl && (imgTaskId || imgIdx)) {
            setCanvasTasks(prev => prev.map(t => {
              const match = imgTaskId
                ? t.task?.id === imgTaskId
                : t.index === imgIdx
              if (match) {
                const updatedTask = t.task ? { ...t.task, imageUrl: imgUrl } : t.task
                return { ...t, imageGenerating: false, imageUrl: imgUrl, task: updatedTask }
              }
              return t
            }))
          }
        }
        break

      case 'taskfailed':
        if (taskIndex) {
          setCanvasTasks(prev => prev.filter(t => t.index !== taskIndex))
        }
        break

      case 'completed':
        break
    }
  }, [])

  const startGeneration = useCallback(async (request: TerminsproveRequest) => {
    setIsGenerating(true)
    setProgress(null)
    setResult(null)
    setError(null)
    setCanvasTasks([])
    setShowCanvas(true)
    setGenerationStartTime(Date.now())

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`${API_BASE}/generate/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)

            if (data === '[DONE]') {
              continue
            }

            try {
              const parsed = JSON.parse(data)

              if (parsed.type === 'result') {
                setResult(parsed.data)
              } else if (parsed.type === 'error') {
                setError(parsed.message)
              } else {
                handleProgressEvent(parsed)
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Generation cancelled')
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      }
    } finally {
      setIsGenerating(false)
    }
  }, [handleProgressEvent])

  const cancelGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const resetGeneration = useCallback(() => {
    setShowCanvas(false)
    setCanvasTasks([])
    setResult(null)
    setProgress(null)
    setGenerationStartTime(null)
  }, [])

  return {
    isGenerating,
    result,
    error,
    canvasTasks,
    showCanvas,
    generationStartTime,
    generationSpeed,
    canvasRef,
    startGeneration,
    cancelGeneration,
    resetGeneration,
  }
}
