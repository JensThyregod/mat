import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageTransition } from '../components/animation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useStore } from '../stores/storeProvider'
import { observer } from 'mobx-react-lite'
import { checkAnswer, type AnswerStatus } from '../utils/answerChecker'
import { FractionInput } from '../components/FractionInput'
import { initGenerators, generateTask, type GeneratedTask } from '../generators'
import {
  fetchSkills,
  recordTrainingResult,
  recommendNextSkill,
  resetSkills,
  type SkillStateDto,
  type SkillCatalogEntry,
} from '../practice'
import { SKILL_GENERATOR_MAP } from '../practice/skillMap'
import type { GeneratedQuestion } from '../generators/types'
import type { TaskFigure, TriangleFigure, PolygonFigure } from '../types/taskSchema'
import {
  parseTriangleConfig, computeTriangle, generateTriangleSVG,
  parsePolygonConfig, computePolygon, generatePolygonSVG,
} from '../utils/geometry'
import katex from 'katex'
import './TrainingView.css'

// ── LaTeX rendering ───────────────────────────────────────────

function renderLatex(text: string): string {
  if (!text) return ''
  let result = text.replace(/\\\((.+?)\\\)/g, (_, math) => {
    try { return katex.renderToString(math, { throwOnError: false, displayMode: false }) }
    catch { return math }
  })
  result = result.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (_, math) => {
    try { return katex.renderToString(math, { throwOnError: false, displayMode: false }) }
    catch { return math }
  })
  result = result.replace(/\$\$(.+?)\$\$/g, (_, math) => {
    try { return `<div class="latex-display-math">${katex.renderToString(math, { throwOnError: false, displayMode: true })}</div>` }
    catch { return math }
  })
  return result.replace(/\n/g, '<br>')
}

// ── Multiple choice parser ────────────────────────────────────

interface ParsedMCOption {
  letter: string
  text: string
  html: string
}

function parseMultipleChoice(questionText: string): { prompt: string; promptHtml: string; options: ParsedMCOption[] } | null {
  const optionPattern = /\n\n([A-D]\).+(?:\n[A-D]\).+)*)\s*$/s
  const match = questionText.match(optionPattern)
  if (!match) return null

  const prompt = questionText.slice(0, match.index!).trim()
  const promptHtml = renderLatex(prompt)
  const optionLines = match[1].split('\n').filter(l => l.trim())
  const options: ParsedMCOption[] = optionLines.map(line => {
    const m = line.match(/^([A-D])\)\s*(.+)$/)
    if (!m) return { letter: '?', text: line, html: renderLatex(line) }
    return { letter: m[1], text: m[2].trim(), html: renderLatex(m[2].trim()) }
  })

  return { prompt, promptHtml, options }
}

// ── Figure renderer ───────────────────────────────────────────

function FigureRenderer({ figure }: { figure: TaskFigure }) {
  const svg = useMemo(() => {
    if (!figure) return null
    if (figure.type === 'triangle') {
      const f = figure as TriangleFigure
      const content = `A: ${f.vertices.A.angle}\nB: ${f.vertices.B.angle}\nC: ${f.vertices.C.angle}`
      return generateTriangleSVG(computeTriangle(parseTriangleConfig(content)))
    }
    if (figure.type === 'polygon') {
      const f = figure as PolygonFigure
      const vertexLines = Object.entries(f.vertices)
        .map(([name, pos]) => {
          const coords = Array.isArray(pos) ? pos : [pos.x, pos.y]
          return `${name}: ${coords[0]}, ${coords[1]}`
        }).join('\n')
      const sideLines = f.sides ? Object.entries(f.sides).map(([s, l]) => `side ${s}: ${l}`).join('\n') : ''
      const rightAngles = f.right_angles ? `right_angles: ${f.right_angles.join(', ')}` : ''
      const content = [vertexLines, sideLines, rightAngles].filter(Boolean).join('\n')
      return generatePolygonSVG(computePolygon(parsePolygonConfig(content)))
    }
    return null
  }, [figure])

  if (!figure) return null

  if (figure.type === 'triangle' || figure.type === 'polygon') {
    return <div className="training-figure" dangerouslySetInnerHTML={{ __html: svg ?? '' }} />
  }
  if (figure.type === 'svg') {
    return <div className="training-figure" dangerouslySetInnerHTML={{ __html: figure.content }} />
  }
  if (figure.type === 'bar_chart') {
    const maxVal = Math.max(...Object.values(figure.data))
    return (
      <div className="training-barchart">
        {Object.entries(figure.data).map(([label, value]) => (
          <div key={label} className="training-barchart__col">
            <div className="training-barchart__bar" style={{ height: `${(value / maxVal) * 100}%` }}>
              <span className="training-barchart__value">{value}</span>
            </div>
            <span className="training-barchart__label">{label}</span>
          </div>
        ))}
      </div>
    )
  }
  if (figure.type === 'boxplot') {
    const allValues = Object.values(figure.data).flatMap(d => [d.min, d.max])
    const displayMin = figure.axisMin ?? Math.min(...allValues)
    const displayMax = figure.axisMax ?? Math.max(...allValues)
    const range = displayMax - displayMin
    const toPercent = (val: number) => ((val - displayMin) / range) * 100
    return (
      <div className="training-boxplot">
        {Object.entries(figure.data).map(([label, stats]) => (
          <div key={label} className="training-boxplot__row">
            <span className="training-boxplot__label">{label}</span>
            <div className="training-boxplot__plot">
              <div className="training-boxplot__whisker" style={{ left: `${toPercent(stats.min)}%`, width: `${toPercent(stats.max) - toPercent(stats.min)}%` }} />
              <div className="training-boxplot__box" style={{ left: `${toPercent(stats.q1)}%`, width: `${toPercent(stats.q3) - toPercent(stats.q1)}%` }} />
              <div className="training-boxplot__median" style={{ left: `${toPercent(stats.median)}%` }} />
            </div>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// ── Mastery helpers ───────────────────────────────────────────

function getMasteryLabel(level: string): string {
  const labels: Record<string, string> = {
    NotYetAssessed: 'Ikke vurderet',
    NotStarted: 'Ikke startet',
    Beginning: 'Begynder',
    Developing: 'Udvikler sig',
    Competent: 'Kompetent',
    Proficient: 'Dygtig',
    Mastered: 'Mestret',
  }
  return labels[level] ?? level
}

function getMasteryColor(level: string): string {
  const colors: Record<string, string> = {
    NotYetAssessed: 'var(--color-text-tertiary, #888)',
    NotStarted: '#ef4444',
    Beginning: '#f97316',
    Developing: '#eab308',
    Competent: '#22c55e',
    Proficient: '#3b82f6',
    Mastered: '#8b5cf6',
  }
  return colors[level] ?? '#888'
}

const GRADE_THRESHOLDS: [number, string][] = [
  [0.90, '12'], [0.80, '10'], [0.65, '7'], [0.50, '4'],
  [0.35, '02'], [0.20, '00'], [0, '-3'],
]

function meanToGrade(mean: number): string {
  for (const [threshold, grade] of GRADE_THRESHOLDS) {
    if (mean >= threshold) return grade
  }
  return '-3'
}

function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    '12': '#8b5cf6', '10': '#3b82f6', '7': '#22c55e', '4': '#eab308',
    '02': '#f97316', '00': '#ef4444', '-3': '#dc2626',
  }
  return colors[grade] ?? 'var(--color-text-tertiary)'
}

// ── Skill sidebar item ────────────────────────────────────────

function SkillPill({ skill, catalog, isActive }: {
  skill: SkillStateDto
  catalog: SkillCatalogEntry | undefined
  isActive: boolean
}) {
  const color = getMasteryColor(skill.masteryLevel)
  return (
    <div className={`skill-pill ${isActive ? 'skill-pill--active' : ''}`}>
      <div className="skill-pill__bar" style={{ width: `${skill.mean * 100}%`, backgroundColor: color }} />
      <span className="skill-pill__name">{catalog?.name ?? skill.skillId}</span>
      <span className="skill-pill__level" style={{ color }}>{getMasteryLabel(skill.masteryLevel)}</span>
    </div>
  )
}

// ── Training mode ─────────────────────────────────────────────

type TrainingMode = 'all' | 'tal' | 'geometri' | 'statistik'

const TRAINING_MODES: { value: TrainingMode; label: string; desc: string; icon: string; color?: string; skillCount: number }[] = [
  { value: 'all', label: 'Blandet Træning', desc: 'Alle emner blandet sammen', icon: '✦', skillCount: 22 },
  { value: 'tal', label: 'Tal og Algebra', desc: 'Regnearter, ligninger, funktioner', icon: '∑', color: 'var(--color-algebra)', skillCount: 10 },
  { value: 'geometri', label: 'Geometri', desc: 'Figurer, vinkler, rumfang', icon: '△', color: 'var(--color-geometri)', skillCount: 8 },
  { value: 'statistik', label: 'Statistik', desc: 'Diagrammer, sandsynlighed', icon: '◔', color: 'var(--color-statistik)', skillCount: 4 },
]

// ── Active task type ──────────────────────────────────────────

interface ActiveTask {
  skillId: string
  generatorType: string
  task: GeneratedTask
  difficulty: string
  startedAt: number
}

// ── Main component ────────────────────────────────────────────

export const TrainingPanel = observer(({ embedded = false }: { embedded?: boolean }) => {
  const { authStore } = useStore()
  const studentId = authStore.student?.id ?? 'test'

  const initializedRef = useRef(false)
  if (!initializedRef.current) {
    initGenerators()
    initializedRef.current = true
  }

  const [trainingMode, setTrainingMode] = useState<TrainingMode>('all')
  const [specificSkillId, setSpecificSkillId] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<TrainingMode | null>(null)
  const [modeChosen, setModeChosen] = useState(false)
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [statuses, setStatuses] = useState<Record<number, AnswerStatus>>({})
  const [loading, setLoading] = useState(false)
  const [taskComplete, setTaskComplete] = useState(false)
  const [skills, setSkills] = useState<SkillStateDto[]>([])
  const [catalog, setCatalog] = useState<SkillCatalogEntry[]>([])
  const [tasksThisSession, setTasksThisSession] = useState(0)
  const [correctThisSession, setCorrectThisSession] = useState(0)
  const [lastLevelUp, setLastLevelUp] = useState<{ skillName: string; level: string } | null>(null)
  const [showSkillPanel, setShowSkillPanel] = useState(false)
  const [backendAvailable, setBackendAvailable] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogMap = useMemo(() => {
    const map = new Map<string, SkillCatalogEntry>()
    catalog.forEach(c => map.set(c.skillId, c))
    return map
  }, [catalog])

  // Load skills from backend on mount
  useEffect(() => {
    fetchSkills()
      .then(res => {
        setSkills(res.skills)
        setCatalog(res.skillCatalog)
        setBackendAvailable(true)
      })
      .catch(err => {
        console.warn('Backend unavailable for skill tracking:', err)
        setBackendAvailable(false)
      })
  }, [studentId])

  const generateNext = useCallback(async () => {
    setLoading(true)
    setActiveTask(null)
    setAnswers({})
    setStatuses({})
    setTaskComplete(false)
    setLastLevelUp(null)
    setError(null)
    setXpDeltas({})
    setPrevMean(null)

    try {
      let skillId: string
      let difficulty: string
      let generatorType: string
      const categoryFilter = trainingMode === 'all' ? undefined : trainingMode

      if (specificSkillId) {
        skillId = specificSkillId
        const entry = catalogMap.get(skillId)
        const generators = entry?.generators ?? SKILL_GENERATOR_MAP.find(s => s.skillId === skillId)?.generators ?? []
        generatorType = generators[Math.floor(Math.random() * generators.length)] ?? 'tal_regnearter'
        const skillState = skills.find(s => s.skillId === skillId)
        difficulty = skillState ? (skillState.mean < 0.35 ? 'let' : skillState.mean > 0.65 ? 'svaer' : 'middel') : 'middel'
      } else if (backendAvailable) {
        console.log('[Training] Requesting recommendation from backend...', { category: categoryFilter ?? 'all' })
        const rec = await recommendNextSkill(categoryFilter)
        console.log('[Training] Recommendation:', rec)
        skillId = rec.skillId
        difficulty = rec.recommendedDifficulty
        const entry = catalogMap.get(skillId)
        const generators = entry?.generators ?? []
        generatorType = generators[Math.floor(Math.random() * generators.length)] ?? 'tal_regnearter'
      } else {
        let pool = catalog.length > 0 ? catalog : [{ skillId: 'regnearter', generators: ['tal_regnearter'], name: '', category: '' }]
        if (categoryFilter) pool = pool.filter(s => s.category === categoryFilter)
        if (pool.length === 0) pool = catalog
        const pick = pool[Math.floor(Math.random() * pool.length)]
        skillId = pick.skillId
        difficulty = 'middel'
        generatorType = pick.generators[Math.floor(Math.random() * pick.generators.length)]
      }

      console.log('[Training] Generating task:', { skillId, difficulty, generatorType })
      const task = await generateTask(generatorType, {
        difficulty: difficulty as 'let' | 'middel' | 'svaer',
      })
      console.log('[Training] Task generated:', task.title, `(${task.questions.length} questions)`)

      setActiveTask({ skillId, generatorType, task, difficulty, startedAt: Date.now() })
    } catch (err) {
      console.error('[Training] Failed to generate task:', err)
      setError(err instanceof Error ? err.message : 'Kunne ikke generere opgave')
    } finally {
      setLoading(false)
    }
  }, [studentId, backendAvailable, catalogMap, catalog, trainingMode, specificSkillId, skills])

  const hasGeneratedFirst = useRef(false)

  const handlePickMode = useCallback((mode: TrainingMode) => {
    setTrainingMode(mode)
    setSpecificSkillId(null)
    setModeChosen(true)
    setTasksThisSession(0)
    setCorrectThisSession(0)
    hasGeneratedFirst.current = true
  }, [])

  const handlePickSkill = useCallback((skillId: string, category: TrainingMode) => {
    setTrainingMode(category)
    setSpecificSkillId(skillId)
    setModeChosen(true)
    setTasksThisSession(0)
    setCorrectThisSession(0)
    hasGeneratedFirst.current = true
  }, [])

  const handleExitMode = useCallback(() => {
    setModeChosen(false)
    setActiveTask(null)
    setSpecificSkillId(null)
    setLoading(false)
    setError(null)
    hasGeneratedFirst.current = false
  }, [])

  // Generate task when mode changes (including initial pick)
  const prevModeRef = useRef(trainingMode)
  const prevChosenRef = useRef(modeChosen)
  useEffect(() => {
    const modeChanged = prevModeRef.current !== trainingMode
    const justChosen = !prevChosenRef.current && modeChosen
    prevModeRef.current = trainingMode
    prevChosenRef.current = modeChosen
    if ((modeChanged || justChosen) && hasGeneratedFirst.current) {
      generateNext()
    }
  }, [trainingMode, modeChosen, generateNext])

  const [xpDeltas, setXpDeltas] = useState<Record<number, number>>({})
  const [, setPrevMean] = useState<number | null>(null)

  const handleAnswerChange = useCallback((idx: number, value: string) => {
    if (taskComplete) return
    setAnswers(prev => ({ ...prev, [idx]: value }))
  }, [taskComplete])

  const handleCheckAll = useCallback(() => {
    if (!activeTask) return

    const currentSkill = skills.find(s => s.skillId === activeTask.skillId)
    const meanBefore = currentSkill?.mean ?? 0.5
    setPrevMean(meanBefore)

    const newStatuses: Record<number, AnswerStatus> = {}
    activeTask.task.questions.forEach((q, i) => {
      const userAnswer = answers[i] ?? ''
      if (userAnswer.trim()) {
        newStatuses[i] = checkAnswer(userAnswer, q.answer, q.answer_type, q.accept_alternatives ?? [])
      } else {
        newStatuses[i] = 'incorrect'
      }
    })
    setStatuses(newStatuses)
    setTaskComplete(true)

    const results = activeTask.task.questions.map((_, i) => ({
      isCorrect: newStatuses[i] === 'correct',
    }))

    const correctCount = results.filter(r => r.isCorrect).length
    setTasksThisSession(prev => prev + 1)
    setCorrectThisSession(prev => prev + correctCount)

    // Compute per-question XP deltas locally using the Bayesian weight formula
    const diffNum = activeTask.difficulty === 'let' ? 1.0 : activeTask.difficulty === 'svaer' ? 5.0 : 3.0
    const maxDiff = 5.0
    const wMin = 0.5
    const wMax = 1.0
    const norm = Math.min(diffNum / maxDiff, 1.0)

    let runningAlpha = currentSkill?.alpha ?? 1.0
    let runningBeta = currentSkill?.beta ?? 1.0
    const deltas: Record<number, number> = {}

    activeTask.task.questions.forEach((_, i) => {
      const isCorrect = newStatuses[i] === 'correct'
      const weight = isCorrect
        ? wMin + (wMax - wMin) * norm
        : wMax - (wMax - wMin) * norm

      const prevMeanLocal = runningAlpha / (runningAlpha + runningBeta)
      if (isCorrect) {
        runningAlpha += weight
      } else {
        runningBeta += weight
      }
      const newMeanLocal = runningAlpha / (runningAlpha + runningBeta)
      const XP_SCALE = 150
      deltas[i] = Math.round((newMeanLocal - prevMeanLocal) * XP_SCALE)
    })
    setXpDeltas(deltas)

    if (backendAvailable) {
      recordTrainingResult(activeTask.skillId, activeTask.difficulty, results)
        .then(result => {
          if (result.levelChanged) {
            const entry = catalogMap.get(activeTask.skillId)
            setLastLevelUp({
              skillName: entry?.name ?? activeTask.skillId,
              level: result.newLevel,
            })
          }
          setSkills(prev =>
            prev.map(s => s.skillId === result.updatedSkill.skillId ? result.updatedSkill : s)
          )
        })
        .catch(err => console.error('Failed to record result:', err))
    }
  }, [activeTask, answers, skills, studentId, backendAvailable, catalogMap])

  const handleNextTask = useCallback(() => {
    generateNext()
  }, [generateNext])

  const currentCatalog = activeTask ? catalogMap.get(activeTask.skillId) : null
  const categoryLabel = currentCatalog?.category === 'tal'
    ? 'Tal og Algebra'
    : currentCatalog?.category === 'geometri'
      ? 'Geometri og Måling'
      : 'Statistik og Sandsynlighed'

  const content = (
      <div className="training">
        {!embedded && (
          <header className="training__header">
            <div className="training__header-left">
              <h1 className="training__title">Træning</h1>
              <p className="training__subtitle">
                {modeChosen
                  ? 'Systemet vælger opgaver baseret på dine færdigheder'
                  : 'Vælg et emne for at starte'}
                {!backendAvailable && <span className="training__offline-badge"> (offline)</span>}
              </p>
            </div>
          </header>
        )}

        {modeChosen && (
          <div className="training__session-bar">
            <AnimatePresence>
              {(() => {
                const activeMode = TRAINING_MODES.find(m => m.value === trainingMode)!
                return (
                  <motion.div
                    className={`training__active-mode${activeMode.color ? ` training__active-mode--${trainingMode}` : ''}`}
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    {activeMode.color && <span className="training__active-mode-dot" style={{ background: activeMode.color }} />}
                    <span className="training__active-mode-label">
                      {specificSkillId
                        ? (catalogMap.get(specificSkillId)?.name ?? SKILL_GENERATOR_MAP.find(s => s.skillId === specificSkillId)?.name ?? specificSkillId)
                        : activeMode.label}
                    </span>
                    <button
                      className="training__active-mode-exit"
                      onClick={handleExitMode}
                      aria-label="Skift emne"
                    >
                      ✕
                    </button>
                  </motion.div>
                )
              })()}
            </AnimatePresence>
            <div className="training__stats">
              <div className="training__stat">
                <span className="training__stat-value">{tasksThisSession}</span>
                <span className="training__stat-label">Opgaver</span>
              </div>
              <div className="training__stat">
                <span className="training__stat-value">{correctThisSession}</span>
                <span className="training__stat-label">Rigtige</span>
              </div>
              <button
                className="training__skill-toggle"
                onClick={() => setShowSkillPanel(p => !p)}
              >
                {showSkillPanel ? 'Skjul' : 'Vis'} færdigheder
              </button>
            </div>
          </div>
        )}

        <div className="training__body">
          <AnimatePresence mode="wait">
            {!modeChosen && (
              <motion.div
                key="picker"
                className="training__mode-picker"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
              >
                {/* Hero card for mixed mode */}
                {(() => {
                  const mixed = TRAINING_MODES[0]
                  return (
                    <motion.button
                      className="training__mode-hero"
                      onClick={() => handlePickMode(mixed.value)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="training__mode-hero-icon">{mixed.icon}</span>
                      <div className="training__mode-hero-text">
                        <span className="training__mode-hero-label">{mixed.label}</span>
                        <span className="training__mode-hero-desc">{mixed.desc}</span>
                      </div>
                      <span className="training__mode-hero-meta">{mixed.skillCount} færdigheder</span>
                      <span className="training__mode-hero-arrow">→</span>
                    </motion.button>
                  )
                })()}

                <div className="training__mode-divider">
                  <span className="training__mode-divider-line" />
                  <span className="training__mode-divider-text">eller vælg et emne</span>
                  <span className="training__mode-divider-line" />
                </div>

                <div className="training__mode-list">
                  {TRAINING_MODES.slice(1).map((mode, i) => {
                    const isExpanded = expandedCategory === mode.value
                    const categorySkills = SKILL_GENERATOR_MAP.filter(s => s.category === mode.value)
                    return (
                      <motion.div
                        key={mode.value}
                        className={`training__mode-group training__mode-group--${mode.value}`}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 + i * 0.06, duration: 0.3 }}
                      >
                        <div className={`training__mode-row training__mode-row--${mode.value}${isExpanded ? ' training__mode-row--expanded' : ''}`}>
                          <button
                            className="training__mode-row-main"
                            onClick={() => setExpandedCategory(isExpanded ? null : mode.value)}
                          >
                            <span className="training__mode-row-icon" style={{ background: mode.color }}>{mode.icon}</span>
                            <div className="training__mode-row-text">
                              <span className="training__mode-row-label">{mode.label}</span>
                              <span className="training__mode-row-desc">{mode.desc}</span>
                            </div>
                            <span className={`training__mode-row-chevron${isExpanded ? ' training__mode-row-chevron--open' : ''}`}>‹</span>
                          </button>
                          <button
                            className={`training__mode-row-play training__mode-row-play--${mode.value}`}
                            onClick={() => handlePickMode(mode.value)}
                            title={`Start ${mode.label}`}
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5.14v14l11-7-11-7z" /></svg>
                          </button>
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              className="training__subskill-list"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            >
                              <motion.button
                                className={`training__subskill training__subskill--all training__subskill--all-${mode.value}`}
                                onClick={() => handlePickMode(mode.value)}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2 }}
                                whileHover={{ x: 3 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <span className="training__subskill-name">Alle emner</span>
                                <span className="training__subskill-all-arrow">→</span>
                              </motion.button>
                              {categorySkills.map((skill, j) => {
                                const skillState = skills.find(s => s.skillId === skill.skillId)
                                const mastery = skillState?.masteryLevel ?? 'NotYetAssessed'
                                const masteryColor = getMasteryColor(mastery)
                                const grade = skillState?.danishGrade ?? (skillState && skillState.totalAttempts > 0 ? meanToGrade(skillState.mean) : null)
                                const gradeColor = grade ? getGradeColor(grade) : 'var(--color-text-tertiary)'
                                return (
                                  <motion.button
                                    key={skill.skillId}
                                    className="training__subskill"
                                    onClick={() => handlePickSkill(skill.skillId, mode.value)}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: (j + 1) * 0.03, duration: 0.2 }}
                                    whileHover={{ x: 3 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <span className="training__subskill-bar" style={{ width: `${(skillState?.mean ?? 0) * 100}%`, background: masteryColor }} />
                                    <span className="training__subskill-name">{skill.name}</span>
                                    {grade ? (
                                      <span className="training__subskill-grade" style={{ color: gradeColor }}>{grade}</span>
                                    ) : (
                                      <span className="training__subskill-grade training__subskill-grade--none">–</span>
                                    )}
                                  </motion.button>
                                )
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showSkillPanel && modeChosen && (
              <motion.aside
                className="training__skills"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <h3 className="training__skills-title">Færdigheder</h3>
                <div className="training__skills-list">
                  {skills.map(skill => (
                    <SkillPill
                      key={skill.skillId}
                      skill={skill}
                      catalog={catalogMap.get(skill.skillId)}
                      isActive={activeTask?.skillId === skill.skillId}
                    />
                  ))}
                </div>
                <button className="training__reset-btn" onClick={async () => {
                  if (backendAvailable) {
                    await resetSkills()
                    const res = await fetchSkills()
                    setSkills(res.skills)
                  }
                  setTasksThisSession(0)
                  setCorrectThisSession(0)
                  generateNext()
                }}>
                  Nulstil alt
                </button>
              </motion.aside>
            )}
          </AnimatePresence>

          {modeChosen && (<div className="training__main">
            {loading && (
              <div className="training__loading">
                <div className="training__spinner" />
                <p>Genererer opgave...</p>
              </div>
            )}

            {error && !loading && (
              <div className="training__error">
                <p>{error}</p>
                <button className="training__btn training__btn--primary" onClick={handleNextTask}>
                  Prøv igen
                </button>
              </div>
            )}

            {!loading && !error && !activeTask && (
              <div className="training__empty">
                <p>Ingen opgave indlæst endnu.</p>
                <button className="training__btn training__btn--primary" onClick={handleNextTask}>
                  Start træning →
                </button>
              </div>
            )}

            {!loading && !error && activeTask && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTask.startedAt}
                  className="training__task-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="training__task-header">
                    <span className={`training__category-badge training__category-badge--${currentCatalog?.category}`}>
                      {categoryLabel}
                    </span>
                    <span className="training__skill-badge">
                      {currentCatalog?.name ?? activeTask.skillId}
                    </span>
                    <span className="training__difficulty-badge">
                      {activeTask.difficulty === 'let' ? 'Let' : activeTask.difficulty === 'svaer' ? 'Svær' : 'Middel'}
                    </span>
                  </div>

                  <h2 className="training__task-title">{activeTask.task.title}</h2>

                  {activeTask.task.intro && (
                    <div
                      className="training__task-intro"
                      dangerouslySetInnerHTML={{ __html: renderLatex(activeTask.task.intro) }}
                    />
                  )}

                  {activeTask.task.figure && (
                    <div className="training__task-figure">
                      <FigureRenderer figure={activeTask.task.figure} />
                    </div>
                  )}

                  <div className="training__questions">
                    {activeTask.task.questions.map((question, i) => (
                      <QuestionRow
                        key={i}
                        index={i}
                        question={question}
                        answer={answers[i] ?? ''}
                        status={taskComplete ? (statuses[i] ?? 'neutral') : undefined}
                        taskComplete={taskComplete}
                        xpDelta={taskComplete ? xpDeltas[i] : undefined}
                        onAnswerChange={handleAnswerChange}
                      />
                    ))}
                  </div>

                  <AnimatePresence>
                    {lastLevelUp && (
                      <motion.div
                        className="training__levelup"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <span className="training__levelup-icon">⬆</span>
                        <span>{lastLevelUp.skillName}: <strong>{getMasteryLabel(lastLevelUp.level)}</strong></span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="training__actions">
                    {!taskComplete ? (
                      <button
                        className="training__btn training__btn--primary"
                        onClick={handleCheckAll}
                        disabled={!Object.values(answers).some(a => a.trim().length > 0)}
                      >
                        Tjek svar
                      </button>
                    ) : (
                      <button
                        className="training__btn training__btn--primary"
                        onClick={handleNextTask}
                      >
                        Næste opgave →
                      </button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>)}
        </div>
      </div>
  )

  if (embedded) return content
  return <PageTransition>{content}</PageTransition>
})

export const TrainingView = observer(() => {
  useDocumentTitle('Træning')
  return <TrainingPanel />
})

// ── Question row component ────────────────────────────────────

function QuestionRow({ index, question, answer, status, taskComplete, xpDelta, onAnswerChange }: {
  index: number
  question: GeneratedQuestion
  answer: string
  status?: AnswerStatus
  taskComplete: boolean
  xpDelta?: number
  onAnswerChange: (idx: number, value: string) => void
}) {
  const isMultipleChoice = question.answer_type === 'multiple_choice'
  const mcData = useMemo(
    () => isMultipleChoice ? parseMultipleChoice(question.text) : null,
    [question.text, isMultipleChoice],
  )
  const textHtml = useMemo(
    () => mcData ? mcData.promptHtml : renderLatex(question.text),
    [question.text, mcData],
  )
  const showCorrectAnswer = taskComplete && status === 'incorrect'
  const effectiveStatus = status && status !== 'neutral' ? status : undefined

  return (
    <div className={`training__question ${effectiveStatus ? `training__question--${effectiveStatus}` : ''}`}>
      <div className="training__question-header">
        <span className="training__question-number">{index + 1}</span>
        <div className="training__question-text" dangerouslySetInnerHTML={{ __html: textHtml }} />
      </div>

      {mcData ? (
        <div className="training__mc-options">
          {mcData.options.map(opt => {
            const isSelected = answer === opt.letter
            const isCorrectOption = opt.letter === question.answer
            let optionClass = 'training__mc-option'
            if (isSelected && !taskComplete) optionClass += ' training__mc-option--selected'
            if (taskComplete && isCorrectOption) optionClass += ' training__mc-option--correct'
            if (taskComplete && isSelected && !isCorrectOption) optionClass += ' training__mc-option--incorrect'

            return (
              <button
                key={opt.letter}
                type="button"
                className={optionClass}
                onClick={() => !taskComplete && onAnswerChange(index, opt.letter)}
                disabled={taskComplete}
              >
                <span className="training__mc-letter">{opt.letter}</span>
                <span className="training__mc-text" dangerouslySetInnerHTML={{ __html: opt.html }} />
              </button>
            )
          })}
          <AnimatePresence>
            {taskComplete && xpDelta !== undefined && (
              <motion.span
                className={`training__xp-delta ${xpDelta >= 0 ? 'training__xp-delta--positive' : 'training__xp-delta--negative'}`}
                initial={{ opacity: 0, scale: 0.5, x: -8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: index * 0.1 }}
              >
                {xpDelta >= 0 ? '+' : ''}{xpDelta} XP
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="training__question-input-row">
          {question.answer_type === 'fraction' ? (
            <FractionInput
              value={answer}
              onChange={(v) => onAnswerChange(index, v)}
              disabled={taskComplete}
              status={effectiveStatus === 'correct' ? 'correct' : effectiveStatus === 'incorrect' ? 'incorrect' : 'neutral'}
            />
          ) : (
            <div className={`training__answer-pill ${effectiveStatus ? `training__answer-pill--${effectiveStatus}` : ''}`}>
              {effectiveStatus && (
                <div className="training__answer-icon">
                  {effectiveStatus === 'correct' ? '✓' : '✗'}
                </div>
              )}
              <input
                type="text"
                className="training__answer-input"
                placeholder="Dit svar"
                value={answer}
                onChange={(e) => onAnswerChange(index, e.target.value)}
                disabled={taskComplete}
              />
            </div>
          )}

          <AnimatePresence>
            {taskComplete && xpDelta !== undefined && (
              <motion.span
                className={`training__xp-delta ${xpDelta >= 0 ? 'training__xp-delta--positive' : 'training__xp-delta--negative'}`}
                initial={{ opacity: 0, scale: 0.5, x: -8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: index * 0.1 }}
              >
                {xpDelta >= 0 ? '+' : ''}{xpDelta} XP
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      )}

      {showCorrectAnswer && !mcData && (
        <motion.div
          className="training__correct-answer"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          Rigtigt svar: <strong dangerouslySetInnerHTML={{ __html: renderLatex(question.answer) }} />
        </motion.div>
      )}
    </div>
  )
}
