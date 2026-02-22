/**
 * Generator Test View
 *
 * A testing interface for all task generators.
 * Only visible to test users.
 */

import { useState, useCallback, useMemo, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import { GlassCard } from '../components/GlassCard'
import {
  initGenerators,
  getSupportedTypes,
  requiresLLM,
  generateTask,
  generateBatch,
  type GeneratedTask
} from '../generators'
import type { TaskInstance } from '../types/taskSchema'
import { TASK_TYPES, type TaskTypeInfo } from './generator-test/constants'
import { BatchGeneratorPanel, type BatchConfig } from './generator-test/BatchGeneratorPanel'
import { TaskPreviewPanel } from './generator-test/TaskPreviewPanel'
import { ExploreGrid } from './generator-test/ExploreGrid'
import { TaskModal } from './generator-test/TaskModal'

type ViewMode = 'explore' | 'batch'

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

  // Batch state
  const [batchConfig, setBatchConfig] = useState<BatchConfig>({})
  const [totalTasks, setTotalTasks] = useState(0)
  const [batchResults, setBatchResults] = useState<TaskInstance[] | null>(null)
  const [rerollingIndex, setRerollingIndex] = useState<number | null>(null)

  const initializedRef = useRef(false)
  if (!initializedRef.current) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY || ''
    initGenerators(apiKey)
    initializedRef.current = true
  }

  const supportedTypes = new Set(getSupportedTypes())

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

  const groupedTypes = useMemo(() => ({
    algebra: filteredTypes.filter(t => t.category === 'algebra'),
    geometri: filteredTypes.filter(t => t.category === 'geometri'),
    statistik: filteredTypes.filter(t => t.category === 'statistik'),
  }), [filteredTypes])

  // ── Explore mode handlers ──────────────────────────────────────

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
  }, [selectedDifficulty])

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const closeModal = () => {
    setShowModal(false)
    setGeneratedTask(null)
    setError(null)
    setSelectedType(null)
  }

  // ── Batch mode handlers ────────────────────────────────────────

  const updateBatchCount = (typeId: string, delta: number) => {
    setBatchConfig(prev => {
      const current = prev[typeId] || { count: 0, difficulty: 'middel' as const }
      const nextCount = Math.max(0, current.count + delta)
      const newConfig = { ...prev, [typeId]: { ...current, count: nextCount } }
      if (nextCount === 0) delete newConfig[typeId]
      setTotalTasks(Object.values(newConfig).reduce((sum, item) => sum + item.count, 0))
      return newConfig
    })
  }

  const setBatchCountForType = (typeId: string, count: number) => {
    setBatchConfig(prev => {
      const current = prev[typeId] || { count: 0, difficulty: 'middel' as const }
      const nextCount = Math.max(0, count)
      const newConfig = { ...prev, [typeId]: { ...current, count: nextCount } }
      if (nextCount === 0) delete newConfig[typeId]
      setTotalTasks(Object.values(newConfig).reduce((sum, item) => sum + item.count, 0))
      return newConfig
    })
  }

  const setBatchDifficulty = (typeId: string, difficulty: 'let' | 'middel' | 'svaer') => {
    setBatchConfig(prev => {
      const current = prev[typeId]
      if (!current) return prev
      return { ...prev, [typeId]: { ...current, difficulty } }
    })
  }

  const distributeTotal = (total: number) => {
    setTotalTasks(total)
    let targetTypes = Object.keys(batchConfig)
    if (targetTypes.length === 0) {
      targetTypes = TASK_TYPES.filter(t => supportedTypes.has(t.id)).map(t => t.id)
    }
    if (targetTypes.length === 0) return

    const countPerType = Math.floor(total / targetTypes.length)
    const remainder = total % targetTypes.length
    const newConfig: BatchConfig = {}
    targetTypes.forEach((id, index) => {
      const count = countPerType + (index < remainder ? 1 : 0)
      if (count > 0) {
        const existing = batchConfig[id]
        newConfig[id] = { count, difficulty: existing ? existing.difficulty : 'middel' }
      }
    })
    setBatchConfig(newConfig)
  }

  const handleSelectAll = () => {
    const newConfig: BatchConfig = {}
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
      setBatchResults(results.flat())
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
      setBatchResults(prev => {
        if (!prev) return prev
        const updated = [...prev]
        updated[index] = { ...newTask, id: `${newTask.type}_${Date.now()}_${index}` } as TaskInstance
        return updated
      })
    } catch (err) {
      console.error('Failed to reroll task:', err)
    } finally {
      setRerollingIndex(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────

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

      {viewMode === 'explore' ? (
        <ExploreGrid
          groupedTypes={groupedTypes}
          supportedTypes={supportedTypes}
          expandedCategories={expandedCategories}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleCategory={toggleCategory}
          onGenerate={handleGenerate}
          selectedDifficulty={selectedDifficulty}
          onDifficultyChange={setSelectedDifficulty}
        />
      ) : (
        <div className="batch-view" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {!batchResults ? (
            <BatchGeneratorPanel
              groupedTypes={groupedTypes}
              supportedTypes={supportedTypes}
              batchConfig={batchConfig}
              totalTasks={totalTasks}
              loading={loading}
              error={error}
              onUpdateBatchCount={updateBatchCount}
              onSetBatchCount={setBatchCountForType}
              onSetBatchDifficulty={setBatchDifficulty}
              onDistributeTotal={distributeTotal}
              onSelectAll={handleSelectAll}
              onResetSelection={() => { setBatchConfig({}); setTotalTasks(0) }}
              onGenerate={handleBatchGenerate}
              onClear={clearBatch}
            />
          ) : (
            <TaskPreviewPanel
              batchResults={batchResults}
              rerollingIndex={rerollingIndex}
              onRerollTask={handleRerollTask}
              onNewGeneration={() => { setBatchResults(null); setTotalTasks(0); setBatchConfig({}) }}
            />
          )}
        </div>
      )}

      {/* Legend */}
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

      {showModal && (
        <TaskModal
          loading={loading}
          error={error}
          generatedTask={generatedTask}
          selectedType={selectedType}
          onClose={closeModal}
          onRetry={() => selectedType && handleGenerate(selectedType)}
        />
      )}
    </section>
  )
})
