import { motion, AnimatePresence } from 'framer-motion'
import { TRAINING_MODES, type TrainingMode } from './trainingConstants'
import { SKILL_GENERATOR_MAP } from '../../practice/skillMap'
import { getMasteryColor, meanToGrade, getGradeColor } from '../../utils/masteryHelpers'
import type { SkillStateDto } from '../../practice'

export function TrainingModePicker({ skills, expandedCategory, onExpandCategory, onPickMode, onPickSkill }: {
  skills: SkillStateDto[]
  expandedCategory: TrainingMode | null
  onExpandCategory: (cat: TrainingMode | null) => void
  onPickMode: (mode: TrainingMode) => void
  onPickSkill: (skillId: string, category: TrainingMode) => void
}) {
  const mixed = TRAINING_MODES[0]

  return (
    <motion.div
      key="picker"
      className="training__mode-picker"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
    >
      <motion.button
        className="training__mode-hero"
        onClick={() => onPickMode(mixed.value)}
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
                  onClick={() => onExpandCategory(isExpanded ? null : mode.value)}
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
                  onClick={() => onPickMode(mode.value)}
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
                      onClick={() => onPickMode(mode.value)}
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
                          onClick={() => onPickSkill(skill.skillId, mode.value)}
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
  )
}
