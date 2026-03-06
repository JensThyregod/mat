import { motion, AnimatePresence } from 'framer-motion'
import { TRAINING_MODES, type TrainingMode } from './trainingConstants'
import { SKILL_GENERATOR_MAP } from '../../practice/skillMap'
import type { SkillCatalogEntry } from '../../practice'

export function TrainingSessionBar({ trainingMode, specificSkillId, catalogMap, onExit, tasksThisSession, correctThisSession, showSkillPanel, onToggleSkillPanel }: {
  trainingMode: TrainingMode
  specificSkillId: string | null
  catalogMap: Map<string, SkillCatalogEntry>
  onExit: () => void
  tasksThisSession: number
  correctThisSession: number
  showSkillPanel: boolean
  onToggleSkillPanel: () => void
}) {
  const activeMode = TRAINING_MODES.find(m => m.value === trainingMode)!

  return (
    <div className="training__session-bar">
      <AnimatePresence>
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
            onClick={onExit}
            aria-label="Skift emne"
          >
            ✕
          </button>
        </motion.div>
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
          onClick={onToggleSkillPanel}
        >
          {showSkillPanel ? 'Skjul' : 'Vis'} færdigheder
        </button>
      </div>
    </div>
  )
}
