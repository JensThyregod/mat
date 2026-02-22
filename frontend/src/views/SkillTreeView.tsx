import { useRef } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '../components/animation'
import { SkillTreeGraph } from '../components/SkillTreeGraph'
import { SkillNodeModal } from '../components/SkillNodeModal'
import { useSkillTree } from '../components/useSkillTree'
import './SkillTreeView.css'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
}

const itemVariants = {
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

export const SkillTreeView = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    selectedSkill,
    setSelectedSkill,
    hoveredSkillId,
    setHoveredSkillId,
    ancestorsMap,
    highlightedSkillIds,
    isConnectionHighlighted,
    layout,
    nodeSize,
    getSkillById,
    getNodeCenter,
    masteredCount,
    unlockedCount,
    progressPercent,
  } = useSkillTree()

  return (
    <PageTransition>
      <motion.div
        className="skills"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Header */}
        <motion.header className="skills__hero" variants={itemVariants}>
          <div className="skills__hero-content">
            <span className="skills__eyebrow">⭐ Færdigheder</span>
            <h1 className="skills__title">Matematik Færdigheder</h1>
          </div>

          <div className="skills__stats">
            <motion.div
              className="skills__stat skills__stat--accent"
              whileHover={{ y: -2, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <span className="skills__stat-value">{masteredCount}</span>
              <span className="skills__stat-label">Mestret</span>
            </motion.div>
            <motion.div
              className="skills__stat"
              whileHover={{ y: -2, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <span className="skills__stat-value">{unlockedCount}</span>
              <span className="skills__stat-label">Aktive</span>
            </motion.div>
            <motion.div
              className="skills__stat"
              whileHover={{ y: -2, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <span className="skills__stat-value">{progressPercent}%</span>
              <span className="skills__stat-label">Total</span>
            </motion.div>
          </div>
        </motion.header>

        {/* Glass Card Container */}
        <motion.div className="skills__card" variants={itemVariants} ref={containerRef}>
          {/* Floating Legend */}
          <div className="skills__legend">
            <div className="skills__legend-categories">
              <span className="skills__legend-item">
                <span className="skills__legend-dot skills__legend-dot--tal" />
                Tal
              </span>
              <span className="skills__legend-item">
                <span className="skills__legend-dot skills__legend-dot--geometri" />
                Geometri
              </span>
              <span className="skills__legend-item">
                <span className="skills__legend-dot skills__legend-dot--statistik" />
                Statistik
              </span>
            </div>
            <div className="skills__legend-divider" />
            <div className="skills__legend-statuses">
              <span className="skills__legend-status">⭐ Mestret</span>
              <span className="skills__legend-status">◉ Aktiv</span>
              <span className="skills__legend-status">🔒 Låst</span>
            </div>
          </div>

          {/* Tree Canvas */}
          <SkillTreeGraph
            nodePositions={layout.nodePositions}
            graphWidth={layout.graphWidth}
            graphHeight={layout.graphHeight}
            schoolZones={layout.schoolZones}
            edgeRoutes={layout.edgeRoutes}
            nodeSize={nodeSize}
            hoveredSkillId={hoveredSkillId}
            highlightedSkillIds={highlightedSkillIds}
            isConnectionHighlighted={isConnectionHighlighted}
            getSkillById={getSkillById}
            getNodeCenter={getNodeCenter}
            onNodeClick={setSelectedSkill}
            onNodeHover={setHoveredSkillId}
          />
        </motion.div>

        {/* Skill Detail Modal */}
        <SkillNodeModal
          selectedSkill={selectedSkill}
          ancestorsMap={ancestorsMap}
          getSkillById={getSkillById}
          onClose={() => setSelectedSkill(null)}
          onSelectSkill={setSelectedSkill}
        />
      </motion.div>
    </PageTransition>
  )
}
