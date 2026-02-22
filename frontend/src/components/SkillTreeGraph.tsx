import { useCallback } from 'react'
import {
  type Skill,
  type SchoolZone,
  skillData,
  connections,
  PADDING,
  getCategoryColor,
} from './skillTreeData'

interface SkillTreeGraphProps {
  nodePositions: Record<string, { x: number; y: number }>
  graphWidth: number
  graphHeight: number
  schoolZones: SchoolZone[]
  edgeRoutes: Record<string, Array<{ x: number; y: number }>>
  nodeSize: number
  hoveredSkillId: string | null
  highlightedSkillIds: Set<string>
  isConnectionHighlighted: (from: string, to: string) => boolean
  getSkillById: (id: string) => Skill | undefined
  getNodeCenter: (skill: Skill) => { x: number; y: number }
  onNodeClick: (skill: Skill) => void
  onNodeHover: (skillId: string | null) => void
}

export const SkillTreeGraph = ({
  graphWidth,
  graphHeight,
  schoolZones,
  edgeRoutes,
  nodeSize,
  hoveredSkillId,
  highlightedSkillIds,
  isConnectionHighlighted,
  getSkillById,
  getNodeCenter,
  onNodeClick,
  onNodeHover,
}: SkillTreeGraphProps) => {
  const treeHeight = graphHeight

  const renderConnection = useCallback((conn: { from: string; to: string }, index: number) => {
    const fromSkill = getSkillById(conn.from)
    const toSkill = getSkillById(conn.to)
    if (!fromSkill || !toSkill) return null

    const isUnlocked = fromSkill.status === 'mastered' || fromSkill.status === 'unlocked'
    const toIsActive = toSkill.status !== 'locked'
    const isActive = isUnlocked && toIsActive

    const isHighlighted = isConnectionHighlighted(conn.from, conn.to)
    const isDimmed = hoveredSkillId !== null && !isHighlighted

    const color = getCategoryColor(toSkill.category)

    const routeKey = `${conn.from}->${conn.to}`
    const points = edgeRoutes[routeKey]

    let path: string
    if (points && points.length >= 2) {
      if (points.length === 2) {
        const midY = (points[0].y + points[1].y) / 2
        path = `M ${points[0].x} ${points[0].y} C ${points[0].x} ${midY}, ${points[1].x} ${midY}, ${points[1].x} ${points[1].y}`
      } else {
        path = `M ${points[0].x} ${points[0].y}`
        for (let i = 1; i < points.length - 1; i++) {
          const curr = points[i]
          const next = points[i + 1]
          const cpX = curr.x
          const cpY = curr.y
          const endX = (curr.x + next.x) / 2
          const endY = (curr.y + next.y) / 2
          if (i === 1) {
            path += ` Q ${cpX} ${cpY}, ${endX} ${endY}`
          } else {
            path += ` T ${endX} ${endY}`
          }
        }
        const last = points[points.length - 1]
        path += ` T ${last.x} ${last.y}`
      }
    } else {
      const from = getNodeCenter(fromSkill)
      const to = getNodeCenter(toSkill)
      const midY = (from.y + to.y) / 2
      path = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`
    }

    const connClassNames = [
      'skill-connection',
      isHighlighted && 'skill-connection--highlighted',
      isDimmed && 'skill-connection--dimmed'
    ].filter(Boolean).join(' ')

    const strokeColor = isHighlighted ? color : (isActive ? color : '#E7E5E4')
    const strokeWidth = isHighlighted ? 3 : 2
    const strokeOpacity = isDimmed ? 0.12 : (isHighlighted ? 1 : (isActive ? 0.8 : 0.5))
    const showGlow = isHighlighted || (isActive && !isDimmed)
    const glowWidth = isHighlighted ? 8 : 4
    const glowOpacity = isHighlighted ? 0.5 : 0.2

    return (
      <g key={`conn-${index}`} className={connClassNames}>
        {showGlow && (
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={glowWidth}
            strokeLinecap="round"
            opacity={glowOpacity}
            filter="url(#glow)"
            className="skill-connection-glow"
          />
        )}
        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={isActive || isHighlighted ? 'none' : '6 4'}
          opacity={strokeOpacity}
          className="skill-connection-line"
        />
        {isActive && !isDimmed && (
          <circle r="3" fill={color} opacity={0.7}>
            <animateMotion dur="3s" repeatCount="indefinite" path={path} />
          </circle>
        )}
      </g>
    )
  }, [getSkillById, getNodeCenter, edgeRoutes, hoveredSkillId, isConnectionHighlighted])

  const renderSkillNode = useCallback((skill: Skill) => {
    const { x, y } = getNodeCenter(skill)
    const color = getCategoryColor(skill.category)
    const isLocked = skill.status === 'locked'
    const isMastered = skill.status === 'mastered'
    const isUnlocked = skill.status === 'unlocked'
    const r = nodeSize / 2

    const isHovered = hoveredSkillId === skill.id
    const isHighlighted = highlightedSkillIds.has(skill.id)
    const isDimmed = hoveredSkillId !== null && !isHighlighted

    const gradientId = `node-glass-${skill.id}`
    const highlightGradId = `node-highlight-${skill.id}`
    const shadowId = `node-shadow-${skill.id}`

    const classNames = [
      'skill-node',
      `skill-node--${skill.status}`,
      isHovered && 'skill-node--hovered',
      isHighlighted && !isHovered && 'skill-node--in-lineage',
      isDimmed && 'skill-node--dimmed'
    ].filter(Boolean).join(' ')

    return (
      <g
        key={skill.id}
        transform={`translate(${x}, ${y})`}
        className={classNames}
        onClick={(e) => {
          e.stopPropagation()
          onNodeClick(skill)
        }}
        onMouseEnter={() => onNodeHover(skill.id)}
        onMouseLeave={() => onNodeHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            {isLocked ? (
              <>
                <stop offset="0%" stopColor="#F5F3F0" />
                <stop offset="100%" stopColor="#E8E5E0" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
                <stop offset="50%" stopColor="rgba(255, 255, 255, 0.85)" />
                <stop offset="100%" stopColor="rgba(248, 247, 244, 0.9)" />
              </>
            )}
          </linearGradient>

          <linearGradient id={highlightGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
            <stop offset="50%" stopColor="rgba(255, 255, 255, 0.1)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </linearGradient>

          <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={isLocked ? '#00000010' : `${color}30`} />
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#00000008" />
          </filter>
        </defs>

        <circle
          r={r + 15}
          fill="transparent"
          className="skill-node-hitarea"
        />

        {(isMastered || isUnlocked) && (
          <circle
            r={r + 4}
            fill="none"
            stroke={color}
            strokeWidth={2}
            opacity={0.2}
            className="skill-node-glow"
          />
        )}

        <circle
          r={r}
          fill={`url(#${gradientId})`}
          stroke={isLocked ? 'rgba(0,0,0,0.06)' : color}
          strokeWidth={isMastered ? 2.5 : 1.5}
          className="skill-node-bg"
          filter={`url(#${shadowId})`}
        />

        <circle
          r={r - 1}
          fill="none"
          stroke="rgba(255, 255, 255, 0.6)"
          strokeWidth={1}
          className="skill-node-inner-border"
        />

        <path
          d={`M ${-r * 0.7} ${-r * 0.3} A ${r * 0.85} ${r * 0.85} 0 0 1 ${r * 0.7} ${-r * 0.3}`}
          fill="none"
          stroke={`url(#${highlightGradId})`}
          strokeWidth={r * 0.4}
          strokeLinecap="round"
          opacity={isLocked ? 0.3 : 0.7}
          className="skill-node-shine"
        />

        {!isLocked && skill.xp !== undefined && skill.xp > 0 && (
          <circle
            r={r - 4}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeDasharray={`${(skill.xp / 100) * (Math.PI * 2 * (r - 4))} ${Math.PI * 2 * (r - 4)}`}
            strokeLinecap="round"
            transform="rotate(-90)"
            opacity={0.8}
            className="skill-node-progress"
          />
        )}

        <text
          y={1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={Math.max(r * 0.85, 18)}
          className="skill-icon"
          style={{
            filter: isLocked ? 'grayscale(100%) opacity(0.25)' : 'none'
          }}
        >
          {skill.icon}
        </text>

        {isLocked && (
          <g className="skill-node-lock">
            <circle r={r * 0.35} fill="rgba(0,0,0,0.5)" cy={r * 0.1} />
            <text
              y={r * 0.15}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={r * 0.4}
            >
              🔒
            </text>
          </g>
        )}

        {isMastered && (
          <g transform={`translate(${r * 0.7}, ${-r * 0.7})`} className="skill-node-badge">
            <circle r={10} fill="#C2725A" stroke="white" strokeWidth={2} />
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              y={0.5}
            >
              ⭐
            </text>
          </g>
        )}

        <text
          y={r + 16}
          textAnchor="middle"
          fill={isLocked ? '#A8A29E' : '#3F3F46'}
          fontSize={10}
          fontWeight={600}
          className="skill-label"
        >
          {skill.name.length > 15 ? skill.name.substring(0, 13) + '...' : skill.name}
        </text>
      </g>
    )
  }, [getNodeCenter, nodeSize, hoveredSkillId, highlightedSkillIds, onNodeClick, onNodeHover])

  return (
    <div className="skills__canvas">
      <div className="skills__zones">
        {schoolZones.map((zone, index) => {
          const topPercent = (zone.startY / treeHeight) * 100
          const heightPercent = ((zone.endY - zone.startY) / treeHeight) * 100

          return (
            <div
              key={zone.id}
              className={`skills__zone skills__zone--${zone.id}`}
              style={{
                top: `${topPercent}%`,
                height: `${heightPercent}%`,
              }}
            >
              <div className="skills__zone-label">
                <span className="skills__zone-label-main">{zone.label}</span>
                <span className="skills__zone-label-sub">{zone.sublabel}</span>
              </div>
              {index > 0 && <div className="skills__zone-divider" />}
            </div>
          )
        })}
      </div>

      <svg
        width="100%"
        height={treeHeight}
        className="skills__svg"
        viewBox={`0 0 ${graphWidth + PADDING} ${treeHeight}`}
        preserveAspectRatio="xMidYMin meet"
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <radialGradient id="grad-tal" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="grad-geometri" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#34D399" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="grad-statistik" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className="connections-layer">
          {connections.map((conn, i) => renderConnection(conn, i))}
        </g>

        <g className="nodes-layer">
          {skillData.map(skill => renderSkillNode(skill))}
        </g>
      </svg>
    </div>
  )
}
