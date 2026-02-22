import { motion, AnimatePresence } from 'framer-motion'
import { type Skill, getCategoryColor, getStatusGlow } from './skillTreeData'

interface SkillNodeModalProps {
  selectedSkill: Skill | null
  ancestorsMap: Record<string, Set<string>>
  getSkillById: (id: string) => Skill | undefined
  onClose: () => void
  onSelectSkill: (skill: Skill) => void
}

export const SkillNodeModal = ({
  selectedSkill,
  ancestorsMap,
  getSkillById,
  onClose,
  onSelectSkill,
}: SkillNodeModalProps) => {
  return (
    <AnimatePresence>
      {selectedSkill && (() => {
        const lineage: Skill[] = []
        const ancestors = ancestorsMap[selectedSkill.id]
        if (ancestors && ancestors.size > 0) {
          const ancestorSkills = Array.from(ancestors)
            .map(id => getSkillById(id))
            .filter(Boolean) as Skill[]
          ancestorSkills.sort((a, b) => a.y - b.y)
          lineage.push(...ancestorSkills)
        }
        lineage.push(selectedSkill)

        const masteredInLineage = lineage.filter(s => s.status === 'mastered').length
        const lineageProgress = Math.round((masteredInLineage / lineage.length) * 100)

        return (
          <motion.div
            className="skill-modal__backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="skill-modal"
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, y: 50, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            >
              <div className="skill-modal__handle" />

              <button className="skill-modal__close" onClick={onClose}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>

              <ModalHeader skill={selectedSkill} />
              <ModalDescription skill={selectedSkill} />
              <ModalProgress skill={selectedSkill} />
              <ModalLineage
                lineage={lineage}
                selectedSkill={selectedSkill}
                masteredInLineage={masteredInLineage}
                lineageProgress={lineageProgress}
                onSelectSkill={onSelectSkill}
              />
              <ModalActions skill={selectedSkill} />
            </motion.div>
          </motion.div>
        )
      })()}
    </AnimatePresence>
  )
}

const ModalHeader = ({ skill }: { skill: Skill }) => (
  <motion.div
    className="skill-modal__header"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
  >
    <div
      className="skill-modal__icon"
      style={{
        boxShadow: getStatusGlow(skill.status, skill.category),
        borderColor: getCategoryColor(skill.category)
      }}
    >
      <span>{skill.icon}</span>
      {skill.status === 'mastered' && (
        <div className="skill-modal__badge">⭐</div>
      )}
    </div>
    <div className="skill-modal__title-area">
      <span
        className="skill-modal__category"
        style={{ color: getCategoryColor(skill.category) }}
      >
        {skill.category === 'tal' && 'Tal og Algebra'}
        {skill.category === 'geometri' && 'Geometri'}
        {skill.category === 'statistik' && 'Statistik'}
      </span>
      <h2 className="skill-modal__name">{skill.name}</h2>
      <span className="skill-modal__level">{skill.level}</span>
    </div>
  </motion.div>
)

const ModalDescription = ({ skill }: { skill: Skill }) => (
  <motion.p
    className="skill-modal__description"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.15, duration: 0.3 }}
  >
    {skill.description}
  </motion.p>
)

const ModalProgress = ({ skill }: { skill: Skill }) => {
  if (skill.status === 'locked') return null

  return (
    <motion.div
      className="skill-modal__progress"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
    >
      <div className="skill-modal__progress-header">
        <span>Din fremgang</span>
        <span className="skill-modal__progress-value">{skill.xp}%</span>
      </div>
      <div className="skill-modal__progress-bar">
        <motion.div
          className="skill-modal__progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${skill.xp}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const, delay: 0.3 }}
          style={{ background: getCategoryColor(skill.category) }}
        />
      </div>
    </motion.div>
  )
}

interface ModalLineageProps {
  lineage: Skill[]
  selectedSkill: Skill
  masteredInLineage: number
  lineageProgress: number
  onSelectSkill: (skill: Skill) => void
}

const ModalLineage = ({
  lineage,
  selectedSkill,
  masteredInLineage,
  lineageProgress,
  onSelectSkill,
}: ModalLineageProps) => {
  if (lineage.length <= 1) return null

  return (
    <motion.div
      className="skill-modal__lineage"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.25, duration: 0.3 }}
    >
      <div className="skill-modal__lineage-header">
        <div className="skill-modal__lineage-title">
          <span className="skill-modal__lineage-icon">🌳</span>
          <div>
            <h4>Færdighedssti</h4>
            <p>{masteredInLineage} af {lineage.length} mestret</p>
          </div>
        </div>
        <div className="skill-modal__lineage-progress">
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle
              cx="22" cy="22" r="18"
              fill="none"
              stroke="rgba(0,0,0,0.06)"
              strokeWidth="4"
            />
            <motion.circle
              cx="22" cy="22" r="18"
              fill="none"
              stroke={getCategoryColor(selectedSkill.category)}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${lineageProgress * 1.13} 113`}
              transform="rotate(-90 22 22)"
              initial={{ strokeDasharray: '0 113' }}
              animate={{ strokeDasharray: `${lineageProgress * 1.13} 113` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const, delay: 0.4 }}
            />
          </svg>
          <span className="skill-modal__lineage-percent">{lineageProgress}%</span>
        </div>
      </div>

      <div className="skill-modal__lineage-path">
        {lineage.map((skill, index) => {
          const isCurrentSkill = skill.id === selectedSkill.id
          const color = getCategoryColor(skill.category)
          const progress = skill.xp || 0

          return (
            <motion.div
              key={skill.id}
              className={`skill-modal__lineage-node ${isCurrentSkill ? 'skill-modal__lineage-node--current' : ''} skill-modal__lineage-node--${skill.status}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.3 + index * 0.08,
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1] as const
              }}
              onClick={() => !isCurrentSkill && onSelectSkill(skill)}
            >
              {index < lineage.length - 1 && (
                <motion.div
                  className="skill-modal__lineage-connector"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{
                    delay: 0.4 + index * 0.08,
                    duration: 0.3,
                    ease: [0.22, 1, 0.36, 1] as const
                  }}
                  style={{
                    background: skill.status === 'mastered' ? color : 'rgba(0,0,0,0.1)'
                  }}
                />
              )}

              <div
                className="skill-modal__lineage-circle"
                style={{ borderColor: color }}
              >
                {skill.status !== 'locked' && progress > 0 && (
                  <svg className="skill-modal__lineage-ring" viewBox="0 0 40 40">
                    <motion.circle
                      cx="20" cy="20" r="17"
                      fill="none"
                      stroke={color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${progress * 1.07} 107`}
                      transform="rotate(-90 20 20)"
                      initial={{ strokeDasharray: '0 107' }}
                      animate={{ strokeDasharray: `${progress * 1.07} 107` }}
                      transition={{
                        duration: 0.6,
                        ease: [0.22, 1, 0.36, 1] as const,
                        delay: 0.5 + index * 0.08
                      }}
                    />
                  </svg>
                )}
                <span className="skill-modal__lineage-emoji">{skill.icon}</span>
                {skill.status === 'mastered' && (
                  <span className="skill-modal__lineage-check">✓</span>
                )}
                {skill.status === 'locked' && (
                  <span className="skill-modal__lineage-lock">🔒</span>
                )}
              </div>

              <div className="skill-modal__lineage-info">
                <span className="skill-modal__lineage-name">{skill.name}</span>
                <span className="skill-modal__lineage-status">
                  {skill.status === 'mastered' && 'Mestret ⭐'}
                  {skill.status === 'unlocked' && `${progress}% fremgang`}
                  {skill.status === 'available' && 'Klar til start'}
                  {skill.status === 'locked' && 'Låst'}
                </span>
              </div>

              {!isCurrentSkill && (
                <span className="skill-modal__lineage-arrow">›</span>
              )}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

const ModalActions = ({ skill }: { skill: Skill }) => (
  <motion.div
    className="skill-modal__actions"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.4, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
  >
    {skill.status === 'locked' && (
      <button className="skill-modal__btn skill-modal__btn--locked" disabled>
        🔒 Låst – mestr forudsætningerne først
      </button>
    )}
    {skill.status === 'available' && (
      <motion.button
        className="skill-modal__btn skill-modal__btn--primary"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        ▶️ Start Træning
      </motion.button>
    )}
    {skill.status === 'unlocked' && (
      <motion.button
        className="skill-modal__btn skill-modal__btn--success"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        ⚡ Fortsæt Træning
      </motion.button>
    )}
    {skill.status === 'mastered' && (
      <button className="skill-modal__btn skill-modal__btn--mastered">
        ⭐ Mestret!
      </button>
    )}
  </motion.div>
)
