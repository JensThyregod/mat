import { useState, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '../components/GlassCard'
import { PageTransition } from '../components/animation'
import { useStreamingGeneration } from '../hooks/useStreamingGeneration'
import { TerminsproveForm } from './terminsprove/TerminsproveForm'
import { ExamCanvas, ResultsSection } from './terminsprove/TerminsprovePreview'
import type { TerminsproveRequest } from './terminsprove/types'
import './TerminsproveGeneratorView.css'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

export const TerminsproveGeneratorView = observer(() => {
  const [taskCount, setTaskCount] = useState(10)
  const [examPart, setExamPart] = useState('uden_hjaelpemidler')
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  const {
    isGenerating,
    result,
    error,
    canvasTasks,
    showCanvas,
    generationSpeed,
    canvasRef,
    startGeneration,
    cancelGeneration,
    resetGeneration,
  } = useStreamingGeneration()

  const handleGenerate = useCallback(() => {
    const request: TerminsproveRequest = {
      level: 'fp9',
      examPart,
      taskCount,
      focusCategories: [],
      difficulty: { easy: 0.3, medium: 0.5, hard: 0.2 },
    }
    startGeneration(request)
  }, [examPart, taskCount, startGeneration])

  const handleToggleTask = useCallback((taskId: string) => {
    setExpandedTask(prev => prev === taskId ? null : taskId)
  }, [])

  const showSetup = !showCanvas

  return (
    <PageTransition>
      <motion.div
        className="terminsprove"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero + Config: visible only before generation starts */}
        <AnimatePresence mode="wait">
          {showSetup && (
            <TerminsproveForm
              taskCount={taskCount}
              examPart={examPart}
              onTaskCountChange={setTaskCount}
              onExamPartChange={setExamPart}
              onGenerate={handleGenerate}
            />
          )}
        </AnimatePresence>

        {/* Exam Document Canvas */}
        <AnimatePresence>
          {showCanvas && canvasTasks.length > 0 && (
            <ExamCanvas
              canvasTasks={canvasTasks}
              canvasRef={canvasRef}
              examPart={examPart}
              isGenerating={isGenerating}
              generationSpeed={generationSpeed}
              onCancel={cancelGeneration}
              onReset={resetGeneration}
            />
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.section
              className="terminsprove__error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GlassCard variant="surface" padding="lg" radius="xl">
                <div className="terminsprove__error-content">
                  <span className="terminsprove__error-icon">⚠️</span>
                  <div>
                    <h3>Der opstod en fejl</h3>
                    <p>{error}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence>
          {result && result.tasks.length > 0 && (
            <ResultsSection
              result={result}
              expandedTask={expandedTask}
              onToggleTask={handleToggleTask}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </PageTransition>
  )
})
