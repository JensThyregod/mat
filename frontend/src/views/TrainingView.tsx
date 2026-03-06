import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageTransition } from '../components/animation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useStore } from '../stores/storeProvider'
import { observer } from 'mobx-react-lite'
import { checkAnswer, type AnswerStatus } from '../utils/answerChecker'
import { initGenerators, generateTask } from '../generators'
import {
  fetchSkills,
  recordTrainingResult,
  recommendNextSkill,
  resetSkills,
  type SkillStateDto,
  type SkillCatalogEntry,
} from '../practice'
import { SKILL_GENERATOR_MAP } from '../practice/skillMap'
import { type TrainingMode, type ActiveTask } from '../components/training/trainingConstants'
import { SkillPill } from '../components/training/SkillPill'
import { TrainingSessionBar } from '../components/training/TrainingSessionBar'
import { TrainingModePicker } from '../components/training/TrainingModePicker'
import { TrainingTaskCard } from '../components/training/TrainingTaskCard'
import './TrainingView.css'

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
  const [xpDeltas, setXpDeltas] = useState<Record<number, number>>({})
  const [, setPrevMean] = useState<number | null>(null)

  const catalogMap = useMemo(() => {
    const map = new Map<string, SkillCatalogEntry>()
    catalog.forEach(c => map.set(c.skillId, c))
    return map
  }, [catalog])

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
        const rec = await recommendNextSkill(categoryFilter)
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

      const task = await generateTask(generatorType, {
        difficulty: difficulty as 'let' | 'middel' | 'svaer',
      })

      setActiveTask({ skillId, generatorType, task, difficulty, startedAt: Date.now() })
    } catch (err) {
      console.error('[Training] Failed to generate task:', err)
      setError(err instanceof Error ? err.message : 'Kunne ikke generere opgave')
    } finally {
      setLoading(false)
    }
  }, [backendAvailable, catalogMap, catalog, trainingMode, specificSkillId, skills])

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
  }, [activeTask, answers, skills, backendAvailable, catalogMap])

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
          <TrainingSessionBar
            trainingMode={trainingMode}
            specificSkillId={specificSkillId}
            catalogMap={catalogMap}
            onExit={handleExitMode}
            tasksThisSession={tasksThisSession}
            correctThisSession={correctThisSession}
            showSkillPanel={showSkillPanel}
            onToggleSkillPanel={() => setShowSkillPanel(p => !p)}
          />
        )}

        <div className="training__body">
          <AnimatePresence mode="wait">
            {!modeChosen && (
              <TrainingModePicker
                skills={skills}
                expandedCategory={expandedCategory}
                onExpandCategory={setExpandedCategory}
                onPickMode={handlePickMode}
                onPickSkill={handlePickSkill}
              />
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
              <TrainingTaskCard
                activeTask={activeTask}
                currentCatalog={currentCatalog ?? undefined}
                categoryLabel={categoryLabel}
                answers={answers}
                statuses={statuses}
                taskComplete={taskComplete}
                xpDeltas={xpDeltas}
                lastLevelUp={lastLevelUp}
                onAnswerChange={handleAnswerChange}
                onCheckAll={handleCheckAll}
                onNextTask={handleNextTask}
                checkDisabled={!Object.values(answers).some(a => a.trim().length > 0)}
              />
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
