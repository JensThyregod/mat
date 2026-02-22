import { motion, type Variants } from 'framer-motion'
import { GlassCard } from '../../components/GlassCard'

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

interface TerminsproveFormProps {
  taskCount: number
  examPart: string
  onTaskCountChange: (count: number) => void
  onExamPartChange: (part: string) => void
  onGenerate: () => void
}

export function TerminsproveForm({
  taskCount,
  examPart,
  onTaskCountChange,
  onExamPartChange,
  onGenerate,
}: TerminsproveFormProps) {
  return (
    <motion.div
      key="setup"
      className="terminsprove__setup"
      initial={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40, scale: 0.97 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }}
    >
      {/* Hero Section */}
      <motion.section className="terminsprove__hero" variants={itemVariants}>
        <div className="terminsprove__hero-content">
          <div className="terminsprove__hero-badge">
            <span className="terminsprove__hero-badge-icon">🤖</span>
            <span>AI Agent Orchestration</span>
          </div>
          <h1 className="terminsprove__hero-title">Terminsprøve Generator</h1>
          <p className="terminsprove__hero-subtitle">
            Generer automatisk en komplet terminsprøve med AI-drevne agenter.
            Brainstorm, formatering, validering og visualisering - alt sammen automatisk.
          </p>
        </div>

        <div className="terminsprove__agent-flow">
          {['💡', '📝', '✅', '🎨'].map((icon, i) => (
            <motion.div
              key={i}
              className="terminsprove__agent-node"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1, type: 'spring' }}
            >
              <span>{icon}</span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Configuration Form */}
      <motion.section className="terminsprove__config" variants={itemVariants}>
        <GlassCard variant="elevated" padding="lg" radius="2xl">
          <h2 className="terminsprove__section-title">Konfiguration</h2>

          <div className="terminsprove__form-grid">
            {/* Task Count */}
            <div className="terminsprove__form-group">
              <label className="terminsprove__label">Antal opgaver</label>
              <div className="terminsprove__slider-row">
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={taskCount}
                  onChange={(e) => onTaskCountChange(Number(e.target.value))}
                  className="terminsprove__slider"
                />
                <span className="terminsprove__slider-value">{taskCount}</span>
              </div>
            </div>

            {/* Exam Part */}
            <div className="terminsprove__form-group">
              <label className="terminsprove__label">Prøvedel</label>
              <div className="terminsprove__radio-group">
                <button
                  className={`terminsprove__radio-btn ${examPart === 'uden_hjaelpemidler' ? 'active' : ''}`}
                  onClick={() => onExamPartChange('uden_hjaelpemidler')}
                >
                  <span>📵</span>
                  Uden hjælpemidler
                </button>
                <button
                  className={`terminsprove__radio-btn ${examPart === 'med_hjaelpemidler' ? 'active' : ''}`}
                  onClick={() => onExamPartChange('med_hjaelpemidler')}
                >
                  <span>🧮</span>
                  Med hjælpemidler
                </button>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="terminsprove__actions">
            <motion.button
              className="terminsprove__generate-btn"
              onClick={onGenerate}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="terminsprove__generate-icon">✨</span>
              Generer Terminsprøve
            </motion.button>
          </div>
        </GlassCard>
      </motion.section>
    </motion.div>
  )
}
