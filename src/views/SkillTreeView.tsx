import { useState, useCallback, useRef, useMemo } from 'react'
import './SkillTreeView.css'

// Skill data structure
interface Skill {
  id: string
  name: string
  description: string
  level: string // e.g., "Indskoling · 1. kl."
  category: 'tal' | 'geometri' | 'statistik'
  x: number // Grid position
  y: number
  prerequisites: string[]
  status: 'locked' | 'available' | 'unlocked' | 'mastered'
  xp?: number // Experience points in this skill
  icon: string
}

// The skill tree data based on the DAG
// Y-positions mapped to school zones:
// Indskoling (1.-3. kl.): y = 0-5
// Mellemtrin (4.-6. kl.): y = 6-9
// Udskoling (7.-9. kl.): y = 10-14
const skillData: Skill[] = [
  // ======= ROOT (Indskoling) =======
  {
    id: 'start',
    name: 'Talforståelse & titalssystem',
    description: 'Grundlæggende forståelse af tal og titalssystemet',
    level: 'Indskoling · 1. kl.',
    category: 'tal',
    x: 5,
    y: 0,
    prerequisites: [],
    status: 'mastered',
    xp: 100,
    icon: '🔢'
  },

  // ======= KERNE-STI (main route) =======
  // Basic operations side by side, all leading to fractions
  {
    id: 'addsub',
    name: 'Addition & subtraktion',
    description: 'Lær at lægge tal sammen og trække dem fra hinanden',
    level: 'Indskoling · 1. kl.',
    category: 'tal',
    x: 4,
    y: 1,
    prerequisites: ['start'],
    status: 'mastered',
    xp: 100,
    icon: '➕'
  },
  {
    id: 'mul',
    name: 'Multiplikation',
    description: 'Gangetabeller og multiplikation af tal',
    level: 'Indskoling · 2. kl.',
    category: 'tal',
    x: 6,
    y: 1,
    prerequisites: ['start'],
    status: 'mastered',
    xp: 85,
    icon: '✖️'
  },
  {
    id: 'div',
    name: 'Division',
    description: 'Del tal op i mindre dele',
    level: 'Indskoling · 2. kl.',
    category: 'tal',
    x: 5,
    y: 1,
    prerequisites: ['start'],
    status: 'mastered',
    xp: 100,
    icon: '➗'
  },
  {
    id: 'frac',
    name: 'Brøker',
    description: 'Forstå og arbejde med brøker',
    level: 'Indskoling · 3. kl.',
    category: 'tal',
    x: 5,
    y: 2,
    prerequisites: ['addsub', 'mul', 'div'],
    status: 'mastered',
    xp: 100,
    icon: '½'
  },
  {
    id: 'dec',
    name: 'Decimaltal',
    description: 'Tal med decimaler og komma',
    level: 'Indskoling · 3. kl.',
    category: 'tal',
    x: 4,
    y: 3,
    prerequisites: ['frac'],
    status: 'mastered',
    xp: 100,
    icon: '🔣'
  },
  // ======= MELLEMTRIN (4.-6. kl.) =======
  {
    id: 'place',
    name: 'Pladsværdi & afrunding',
    description: 'Forstå pladsværdi, afrunding og store tal',
    level: 'Mellemtrin · 4. kl.',
    category: 'tal',
    x: 5,
    y: 4,
    prerequisites: ['dec'],
    status: 'mastered',
    xp: 100,
    icon: '📐'
  },
  {
    id: 'pct',
    name: 'Procent',
    description: 'Beregn procenter og procentdele',
    level: 'Mellemtrin · 6. kl.',
    category: 'tal',
    x: 5,
    y: 5,
    prerequisites: ['place'],
    status: 'mastered',
    xp: 100,
    icon: '%'
  },
  // ======= UDSKOLING (7.-9. kl.) =======
  {
    id: 'ratio',
    name: 'Forhold (ratio/enhedsrate)',
    description: 'Forstå forhold mellem tal og enheder',
    level: 'Udskoling · 7. kl.',
    category: 'tal',
    x: 5,
    y: 6,
    prerequisites: ['pct'],
    status: 'mastered',
    xp: 100,
    icon: '⚖️'
  },
  {
    id: 'prop',
    name: 'Proportionalitet (y=kx)',
    description: 'Lineær proportionalitet og konstanter',
    level: 'Udskoling · 7. kl.',
    category: 'tal',
    x: 5,
    y: 7,
    prerequisites: ['ratio'],
    status: 'mastered',
    xp: 100,
    icon: '📈'
  },
  {
    id: 'alg',
    name: 'Algebra: variable & udtryk',
    description: 'Brug af variable og algebraiske udtryk',
    level: 'Udskoling · 7. kl.',
    category: 'tal',
    x: 5,
    y: 8,
    prerequisites: ['prop'],
    status: 'mastered',
    xp: 100,
    icon: '𝑥'
  },
  {
    id: 'eq',
    name: 'Ligninger',
    description: 'Løs ligninger med én ubekendt',
    level: 'Udskoling · 7. kl.',
    category: 'tal',
    x: 5,
    y: 9,
    prerequisites: ['alg'],
    status: 'mastered',
    xp: 100,
    icon: '='
  },
  {
    id: 'func',
    name: 'Funktioner & grafer',
    description: 'Lineære funktioner og grafisk fremstilling',
    level: 'Udskoling · 8. kl.',
    category: 'tal',
    x: 3,
    y: 10,
    prerequisites: ['eq', 'coord'],
    status: 'mastered',
    xp: 100,
    icon: '📊'
  },
  {
    id: 'sys',
    name: 'Ligningssystemer',
    description: 'To ligninger med to ubekendte',
    level: 'Udskoling · 9. kl.',
    category: 'tal',
    x: 5,
    y: 10,
    prerequisites: ['eq'],
    status: 'mastered',
    xp: 100,
    icon: '🔀'
  },

  // ======= GEOMETRI - INDSKOLING =======
  {
    id: 'shapes2d',
    name: '2D-figurer',
    description: 'Lær om firkanter, trekanter og cirkler',
    level: 'Indskoling · 1. kl.',
    category: 'geometri',
    x: 1,
    y: 1,
    prerequisites: ['start'],
    status: 'mastered',
    xp: 100,
    icon: '🔷'
  },
  {
    id: 'measure',
    name: 'Måling & enheder',
    description: 'Mål længde, vægt og tid',
    level: 'Indskoling · 2.–3. kl.',
    category: 'geometri',
    x: 1,
    y: 2,
    prerequisites: ['shapes2d'],
    status: 'mastered',
    xp: 90,
    icon: '📏'
  },
  // ======= GEOMETRI - MELLEMTRIN =======
  {
    id: 'peri',
    name: 'Omkreds',
    description: 'Beregn omkredsen af figurer',
    level: 'Mellemtrin · 4. kl.',
    category: 'geometri',
    x: 0,
    y: 4,
    prerequisites: ['measure'],
    status: 'mastered',
    xp: 100,
    icon: '⭕'
  },
  {
    id: 'area',
    name: 'Areal',
    description: 'Beregn arealet af forskellige figurer',
    level: 'Mellemtrin · 4. kl.',
    category: 'geometri',
    x: 0,
    y: 5,
    prerequisites: ['peri'],
    status: 'mastered',
    xp: 100,
    icon: '🔲'
  },
  {
    id: 'volume',
    name: 'Rumfang/volumen',
    description: 'Beregn rumfang af 3D-figurer',
    level: 'Mellemtrin · 5. kl.',
    category: 'geometri',
    x: 0,
    y: 6,
    prerequisites: ['area'],
    status: 'mastered',
    xp: 100,
    icon: '📦'
  },
  {
    id: 'angles',
    name: 'Vinkler (grader)',
    description: 'Mål og beregn vinkler',
    level: 'Mellemtrin · 5. kl.',
    category: 'geometri',
    x: 2,
    y: 4,
    prerequisites: ['measure'],
    status: 'mastered',
    xp: 100,
    icon: '📐'
  },
  {
    id: 'lines',
    name: 'Parallel/vinkelret',
    description: 'Parallelle og vinkelrette linjer',
    level: 'Mellemtrin · 6. kl.',
    category: 'geometri',
    x: 2,
    y: 5,
    prerequisites: ['angles'],
    status: 'mastered',
    xp: 100,
    icon: '⊥'
  },
  {
    id: 'construct',
    name: 'Konstruktion',
    description: 'Konstruer figurer med passer og lineal',
    level: 'Mellemtrin · 6. kl.',
    category: 'geometri',
    x: 2,
    y: 6,
    prerequisites: ['lines'],
    status: 'mastered',
    xp: 100,
    icon: '✏️'
  },
  {
    id: 'coord',
    name: 'Koordinatsystem',
    description: 'Arbejd med x- og y-akser',
    level: 'Mellemtrin · 5. kl.',
    category: 'geometri',
    x: 3,
    y: 6,
    prerequisites: ['lines'],
    status: 'mastered',
    xp: 100,
    icon: '🎯'
  },
  // ======= GEOMETRI - UDSKOLING =======
  {
    id: 'scale',
    name: 'Målestok',
    description: 'Forstå og brug målestoksforhold',
    level: 'Udskoling · 7. kl.',
    category: 'geometri',
    x: 4,
    y: 7,
    prerequisites: ['ratio', 'coord'],
    status: 'mastered',
    xp: 100,
    icon: '🗺️'
  },
  {
    id: 'similar',
    name: 'Ligedannethed',
    description: 'Ligedannede figurer og forstørrelse',
    level: 'Udskoling · 8. kl.',
    category: 'geometri',
    x: 2,
    y: 8,
    prerequisites: ['scale', 'angles'],
    status: 'mastered',
    xp: 100,
    icon: '🔍'
  },
  {
    id: 'pyth',
    name: 'Pythagoras',
    description: 'Pythagoras\' sætning for retvinklede trekanter',
    level: 'Udskoling · 8. kl.',
    category: 'geometri',
    x: 0,
    y: 7,
    prerequisites: ['volume', 'area'],
    status: 'mastered',
    xp: 100,
    icon: '📐'
  },
  {
    id: 'trig',
    name: 'Trigonometri',
    description: 'Sinus, cosinus og tangens',
    level: 'Udskoling · 9. kl.',
    category: 'geometri',
    x: 1,
    y: 10,
    prerequisites: ['similar', 'pyth'],
    status: 'mastered',
    xp: 100,
    icon: '📉'
  },

  // ======= STATISTIK - INDSKOLING =======
  {
    id: 'data',
    name: 'Dataindsamling & sortering',
    description: 'Indsaml og organiser data',
    level: 'Indskoling · 2. kl.',
    category: 'statistik',
    x: 9,
    y: 1,
    prerequisites: ['start'],
    status: 'mastered',
    xp: 100,
    icon: '📋'
  },
  {
    id: 'charts',
    name: 'Tabeller & diagrammer',
    description: 'Lav og aflæs diagrammer',
    level: 'Indskoling · 3. kl.',
    category: 'statistik',
    x: 9,
    y: 2,
    prerequisites: ['data'],
    status: 'mastered',
    xp: 80,
    icon: '📊'
  },
  // ======= STATISTIK - MELLEMTRIN =======
  {
    id: 'avg',
    name: 'Gennemsnit',
    description: 'Beregn gennemsnit af datasæt',
    level: 'Mellemtrin · 5. kl.',
    category: 'statistik',
    x: 9,
    y: 4,
    prerequisites: ['charts'],
    status: 'mastered',
    xp: 100,
    icon: '📈'
  },
  {
    id: 'medmode',
    name: 'Median & typetal',
    description: 'Find median og typetal',
    level: 'Mellemtrin · 6. kl.',
    category: 'statistik',
    x: 9,
    y: 5,
    prerequisites: ['avg'],
    status: 'mastered',
    xp: 100,
    icon: '🎯'
  },
  {
    id: 'prob',
    name: 'Sandsynlighed',
    description: 'Brøk som chance og grundlæggende sandsynlighed',
    level: 'Mellemtrin · 6. kl.',
    category: 'statistik',
    x: 7,
    y: 6,
    prerequisites: ['frac', 'pct'],
    status: 'mastered',
    xp: 100,
    icon: '🎲'
  },
  // ======= STATISTIK - UDSKOLING =======
  {
    id: 'comb',
    name: 'Kombinatorik',
    description: 'Tæl muligheder systematisk',
    level: 'Udskoling · 7. kl.',
    category: 'statistik',
    x: 8,
    y: 7,
    prerequisites: ['prob'],
    status: 'mastered',
    xp: 100,
    icon: '🔢'
  },
  {
    id: 'comp',
    name: 'Sammensatte hændelser',
    description: 'Sandsynlighed for flere hændelser',
    level: 'Udskoling · 8. kl.',
    category: 'statistik',
    x: 7,
    y: 10,
    prerequisites: ['comb', 'prob'],
    status: 'mastered',
    xp: 100,
    icon: '🎰'
  }
]

// Generate connections from prerequisites - each prerequisite creates an edge from prereq -> skill
const connections: { from: string; to: string }[] = skillData.flatMap(skill =>
  skill.prerequisites.map(prereqId => ({ from: prereqId, to: skill.id }))
)

// Layout configuration
const PADDING = 60
const LABEL_WIDTH = 100 // Width for school level labels on the left
const NODE_WIDTH = 80
const NODE_HEIGHT = 90
const RANK_SEP = 80 // Vertical spacing between ranks
const NODE_SEP = 50 // Horizontal spacing between nodes
const ZONE_PADDING = 40 // Extra padding around nodes within zones

// School level zones - will be calculated dynamically based on dagre layout
const SCHOOL_LEVEL_RANGES = {
  indskoling: { label: 'Indskoling', sublabel: '1.-3. klasse', color: 'rgba(99, 102, 241, 0.05)' },
  mellemtrin: { label: 'Mellemtrin', sublabel: '4.-6. klasse', color: 'rgba(16, 185, 129, 0.05)' },
  udskoling: { label: 'Udskoling', sublabel: '7.-9. klasse', color: 'rgba(245, 158, 11, 0.05)' },
}

// Helper to determine school level from skill level string
const getSchoolLevel = (level: string): 'indskoling' | 'mellemtrin' | 'udskoling' => {
  if (level.includes('Indskoling')) return 'indskoling'
  if (level.includes('Mellemtrin')) return 'mellemtrin'
  return 'udskoling'
}

export const SkillTreeView = () => {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Use the designed grid positions from skillData, scaled to pixel coordinates
  const { nodePositions, graphWidth, graphHeight, schoolZones, edgeRoutes } = useMemo(() => {
    // Grid spacing for the designed layout
    const GRID_X = NODE_WIDTH + NODE_SEP  // Horizontal spacing between grid units
    const GRID_Y = NODE_HEIGHT + RANK_SEP // Vertical spacing between grid units
    
    // Group skills by school level to calculate zone boundaries
    const skillsByLevel: Record<'indskoling' | 'mellemtrin' | 'udskoling', Skill[]> = {
      indskoling: [],
      mellemtrin: [],
      udskoling: []
    }
    
    skillData.forEach(skill => {
      const level = getSchoolLevel(skill.level)
      skillsByLevel[level].push(skill)
    })
    
    // Calculate the y-range for each school level based on the designed y-positions
    const getYRange = (skills: Skill[]) => {
      if (skills.length === 0) return { min: 0, max: 0 }
      const ys = skills.map(s => s.y)
      return { min: Math.min(...ys), max: Math.max(...ys) }
    }
    
    const levelRanges = {
      indskoling: getYRange(skillsByLevel.indskoling),
      mellemtrin: getYRange(skillsByLevel.mellemtrin),
      udskoling: getYRange(skillsByLevel.udskoling)
    }
    
    // Convert grid positions to pixel positions
    const positions: Record<string, { x: number; y: number }> = {}
    
    skillData.forEach(skill => {
      const pixelX = PADDING + LABEL_WIDTH + skill.x * GRID_X
      const pixelY = PADDING + skill.y * GRID_Y
      positions[skill.id] = { x: pixelX, y: pixelY }
    })
    
    // Calculate graph dimensions based on the max positions
    const allX = skillData.map(s => s.x)
    const allY = skillData.map(s => s.y)
    const maxGridX = Math.max(...allX)
    const maxGridY = Math.max(...allY)
    
    const width = PADDING + LABEL_WIDTH + maxGridX * GRID_X + NODE_WIDTH / 2 + PADDING
    const height = PADDING + maxGridY * GRID_Y + NODE_HEIGHT / 2 + PADDING
    
    // Build zones based on the actual y-ranges of nodes in each level
    const zoneOrder: Array<'indskoling' | 'mellemtrin' | 'udskoling'> = ['indskoling', 'mellemtrin', 'udskoling']
    const zones: Array<{ id: string; label: string; sublabel: string; startY: number; endY: number; color: string }> = []
    
    zoneOrder.forEach((level, index) => {
      const range = levelRanges[level]
      const info = SCHOOL_LEVEL_RANGES[level]
      
      // Calculate pixel boundaries for this zone
      const startY = PADDING + range.min * GRID_Y - NODE_HEIGHT / 2 - ZONE_PADDING
      const endY = PADDING + range.max * GRID_Y + NODE_HEIGHT / 2 + ZONE_PADDING
      
      // Adjust boundaries to meet neighboring zones seamlessly
      let adjustedStartY = startY
      if (index > 0 && zones[index - 1]) {
        // Make this zone start where the previous one ended
        adjustedStartY = zones[index - 1].endY
      }
      
      zones.push({
        id: level,
        label: info.label,
        sublabel: info.sublabel,
        startY: adjustedStartY,
        endY: endY,
        color: info.color
      })
    })
    
    // Create smooth edge routes
    const edgeRoutes: Record<string, Array<{ x: number; y: number }>> = {}
    connections.forEach(conn => {
      const fromPos = positions[conn.from]
      const toPos = positions[conn.to]
      if (fromPos && toPos) {
        const key = `${conn.from}->${conn.to}`
        // Simple smooth curve - vertical then horizontal
        const midY = (fromPos.y + toPos.y) / 2
        edgeRoutes[key] = [
          { x: fromPos.x, y: fromPos.y },
          { x: fromPos.x, y: midY },
          { x: toPos.x, y: midY },
          { x: toPos.x, y: toPos.y }
        ]
      }
    })
    
    return { 
      nodePositions: positions, 
      graphWidth: width, 
      graphHeight: height,
      schoolZones: zones,
      edgeRoutes
    }
  }, [])
  
  const nodeSize = Math.min(NODE_WIDTH * 0.75, 60)
  const treeHeight = graphHeight
  
  const getSkillById = useCallback((id: string) => skillData.find(s => s.id === id), [])
  
  const getNodeCenter = useCallback((skill: Skill) => {
    const pos = nodePositions[skill.id]
    return pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 }
  }, [nodePositions])

  const getCategoryColor = (category: Skill['category']) => {
    switch (category) {
      case 'tal': return '#6366F1' // Indigo
      case 'geometri': return '#10B981' // Emerald
      case 'statistik': return '#F59E0B' // Amber
    }
  }

  const getStatusGlow = (status: Skill['status'], category: Skill['category']) => {
    const color = getCategoryColor(category)
    switch (status) {
      case 'mastered': return `0 0 30px ${color}, 0 0 60px ${color}40`
      case 'unlocked': return `0 0 20px ${color}80`
      case 'available': return `0 0 15px ${color}50`
      default: return 'none'
    }
  }


  const renderConnection = useCallback((conn: { from: string; to: string }, index: number) => {
    const fromSkill = getSkillById(conn.from)
    const toSkill = getSkillById(conn.to)
    if (!fromSkill || !toSkill) return null
    
    // Determine if connection should glow
    const isUnlocked = fromSkill.status === 'mastered' || fromSkill.status === 'unlocked'
    const toIsActive = toSkill.status !== 'locked'
    const isActive = isUnlocked && toIsActive
    
    const color = getCategoryColor(toSkill.category)
    
    // Get edge route from dagre (avoids crossing nodes)
    const routeKey = `${conn.from}->${conn.to}`
    const points = edgeRoutes[routeKey]
    
    let path: string
    if (points && points.length >= 2) {
      // Use dagre's routed points - create a smooth bezier curve through them
      if (points.length === 2) {
        // Simple case: straight line (but make it curved)
        const midY = (points[0].y + points[1].y) / 2
        path = `M ${points[0].x} ${points[0].y} C ${points[0].x} ${midY}, ${points[1].x} ${midY}, ${points[1].x} ${points[1].y}`
      } else {
        // Multiple points: create smooth curve through all points
        path = `M ${points[0].x} ${points[0].y}`
        for (let i = 1; i < points.length - 1; i++) {
          const curr = points[i]
          const next = points[i + 1]
          // Use quadratic bezier for intermediate points
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
        // Final segment to last point
        const last = points[points.length - 1]
        path += ` T ${last.x} ${last.y}`
      }
    } else {
      // Fallback: simple bezier
      const from = getNodeCenter(fromSkill)
      const to = getNodeCenter(toSkill)
      const midY = (from.y + to.y) / 2
      path = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`
    }

    return (
      <g key={`conn-${index}`}>
        {/* Glow effect for active connections */}
        {isActive && (
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.2}
            filter="url(#glow)"
            className="skill-connection-glow"
          />
        )}
        <path
          d={path}
          fill="none"
          stroke={isActive ? color : '#E7E5E4'}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={isActive ? 'none' : '6 4'}
          opacity={isActive ? 0.8 : 0.6}
          className="skill-connection"
        />
        {/* Animated particles along active connections */}
        {isActive && (
          <circle r="3" fill={color} opacity={0.7}>
            <animateMotion dur="3s" repeatCount="indefinite" path={path} />
          </circle>
        )}
      </g>
    )
  }, [getSkillById, getNodeCenter, edgeRoutes])

  const renderSkillNode = useCallback((skill: Skill) => {
    const { x, y } = getNodeCenter(skill)
    const color = getCategoryColor(skill.category)
    
    const statusClass = `skill-node--${skill.status}`
    
    return (
      <g
        key={skill.id}
        transform={`translate(${x}, ${y})`}
        className={`skill-node ${statusClass}`}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedSkill(skill)
        }}
        style={{ cursor: 'pointer' }}
      >
        {/* Invisible hit area - larger than visible node */}
        <circle
          r={nodeSize / 2 + 15}
          fill="transparent"
          className="skill-node-hitarea"
        />
        
        {/* Outer glow ring for mastered/unlocked */}
        {(skill.status === 'mastered' || skill.status === 'unlocked') && (
          <>
            <circle
              r={nodeSize / 2 + 6}
              fill="none"
              stroke={color}
              strokeWidth={2}
              opacity={0.3}
              className="skill-node-ring"
            />
            <circle
              r={nodeSize / 2 + 3}
              fill="none"
              stroke={color}
              strokeWidth={1}
              opacity={0.5}
              className="skill-node-ring"
            />
          </>
        )}
        
        {/* Background circle */}
        <circle
          r={nodeSize / 2}
          fill={skill.status === 'locked' ? '#F5F2ED' : '#FFFFFF'}
          stroke={skill.status === 'locked' ? '#E7E5E4' : color}
          strokeWidth={skill.status === 'mastered' ? 3 : 2}
          className="skill-node-bg"
          style={{
            filter: skill.status !== 'locked' ? `drop-shadow(0 0 8px ${color}30)` : 'none'
          }}
        />
        
        {/* XP progress ring */}
        {skill.status !== 'locked' && skill.xp !== undefined && skill.xp > 0 && (
          <circle
            r={nodeSize / 2 - 3}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeDasharray={`${(skill.xp / 100) * (Math.PI * (nodeSize - 6))} ${Math.PI * (nodeSize - 6)}`}
            strokeLinecap="round"
            transform="rotate(-90)"
            opacity={0.7}
          />
        )}
        
        {/* Icon */}
        <text
          y={2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={Math.max(nodeSize * 0.4, 16)}
          className="skill-icon"
          style={{
            filter: skill.status === 'locked' ? 'grayscale(100%) opacity(0.3)' : 'none'
          }}
        >
          {skill.icon}
        </text>
        
        {/* Lock icon overlay for locked skills */}
        {skill.status === 'locked' && (
          <text
            y={2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.max(nodeSize * 0.28, 12)}
            opacity={0.7}
          >
            🔒
          </text>
        )}
        
        {/* Mastered star */}
        {skill.status === 'mastered' && (
          <g transform={`translate(${nodeSize / 2 - 6}, ${-nodeSize / 2 + 6})`}>
            <circle r={Math.max(nodeSize * 0.18, 10)} fill="#C2725A" />
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={Math.max(nodeSize * 0.16, 9)}
              y={1}
            >
              ⭐
            </text>
          </g>
        )}
        
        {/* Skill name label */}
        <text
          y={nodeSize / 2 + 14}
          textAnchor="middle"
          fill={skill.status === 'locked' ? '#A8A29E' : '#1C1917'}
          fontSize={Math.max(nodeSize * 0.16, 9)}
          fontWeight={600}
          className="skill-label"
        >
          {skill.name.length > 16 ? skill.name.substring(0, 14) + '...' : skill.name}
        </text>
      </g>
    )
  }, [getNodeCenter, selectedSkill, nodeSize])

  const masteredCount = useMemo(() => skillData.filter(s => s.status === 'mastered').length, [])
  const unlockedCount = useMemo(() => skillData.filter(s => s.status === 'unlocked').length, [])
  const totalSkills = skillData.length
  const progressPercent = Math.round((masteredCount / totalSkills) * 100)

  return (
    <div className="skill-tree-page">
      {/* Header */}
      <header className="skill-tree-header">
        <div className="skill-tree-header__content">
          <div className="skill-tree-header__badge">
            <span>🎮</span>
            <span>SKILL TREE</span>
          </div>
          <h1 className="skill-tree-header__title">Matematik Færdigheder</h1>
          <p className="skill-tree-header__subtitle">
            Oplås nye færdigheder og bliv en matematik-mester
          </p>
        </div>
        
        <div className="skill-tree-stats">
          <div className="skill-tree-stat skill-tree-stat--mastered">
            <div className="skill-tree-stat__icon">⭐</div>
            <div className="skill-tree-stat__value">{masteredCount}</div>
            <div className="skill-tree-stat__label">Mestret</div>
          </div>
          <div className="skill-tree-stat skill-tree-stat--unlocked">
            <div className="skill-tree-stat__icon">🔓</div>
            <div className="skill-tree-stat__value">{unlockedCount}</div>
            <div className="skill-tree-stat__label">Aktive</div>
          </div>
          <div className="skill-tree-stat skill-tree-stat--progress">
            <div className="skill-tree-stat__icon">📊</div>
            <div className="skill-tree-stat__value">{progressPercent}%</div>
            <div className="skill-tree-stat__label">Fremgang</div>
          </div>
        </div>
      </header>

      {/* Legend */}
      <div className="skill-tree-legend">
        <div className="skill-tree-legend__item">
          <span className="skill-tree-legend__dot skill-tree-legend__dot--tal"></span>
          <span>Tal og Algebra</span>
        </div>
        <div className="skill-tree-legend__item">
          <span className="skill-tree-legend__dot skill-tree-legend__dot--geometri"></span>
          <span>Geometri</span>
        </div>
        <div className="skill-tree-legend__item">
          <span className="skill-tree-legend__dot skill-tree-legend__dot--statistik"></span>
          <span>Statistik</span>
        </div>
        <div className="skill-tree-legend__separator"></div>
        <div className="skill-tree-legend__item">
          <span className="skill-tree-legend__status skill-tree-legend__status--mastered">⭐</span>
          <span>Mestret</span>
        </div>
        <div className="skill-tree-legend__item">
          <span className="skill-tree-legend__status skill-tree-legend__status--unlocked">◉</span>
          <span>Aktiv</span>
        </div>
        <div className="skill-tree-legend__item">
          <span className="skill-tree-legend__status skill-tree-legend__status--available">○</span>
          <span>Tilgængelig</span>
        </div>
        <div className="skill-tree-legend__item">
<span className="skill-tree-legend__status skill-tree-legend__status--locked">🔒</span>
            <span>Låst</span>
        </div>
      </div>

      {/* Tree container - simple scroll */}
      <div 
        className="skill-tree-container" 
        ref={containerRef}
      >
        <div 
          className="skill-tree-canvas"
          style={{
            width: '100%',
            height: treeHeight,
          }}
        >
          <svg
            width="100%"
            height={treeHeight}
            className="skill-tree-svg"
            viewBox={`0 0 ${graphWidth + PADDING} ${treeHeight}`}
            preserveAspectRatio="xMidYMin meet"
          >
            <defs>
              {/* Glow filter */}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              
              {/* Gradients for each category */}
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

            {/* Background grid pattern */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E7E5E4" strokeWidth="0.5" opacity="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* School level zones */}
            <g className="school-zones-layer">
              {schoolZones.map((zone, index) => {
                const zoneHeight = zone.endY - zone.startY
                const labelY = zone.startY + zoneHeight / 2
                
                return (
                  <g key={zone.id}>
                    {/* Zone background */}
                    <rect
                      x={LABEL_WIDTH}
                      y={zone.startY}
                      width={graphWidth - LABEL_WIDTH + PADDING}
                      height={zoneHeight}
                      fill={zone.color}
                    />
                    
                    {/* Top dashed line (not for first zone) */}
                    {index > 0 && (
                      <line
                        x1={LABEL_WIDTH}
                        y1={zone.startY}
                        x2={graphWidth + PADDING}
                        y2={zone.startY}
                        stroke="#A8A29E"
                        strokeWidth={1.5}
                        strokeDasharray="8 6"
                        opacity={0.6}
                      />
                    )}
                    
                    {/* Zone label on the left */}
                    <g className="zone-label" transform={`translate(${LABEL_WIDTH / 2}, ${labelY})`}>
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="zone-label-main"
                        fill="#57534E"
                        fontSize={14}
                        fontWeight={600}
                        y={-8}
                      >
                        {zone.label}
                      </text>
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="zone-label-sub"
                        fill="#A8A29E"
                        fontSize={11}
                        y={8}
                      >
                        {zone.sublabel}
                      </text>
                    </g>
                  </g>
                )
              })}
            </g>

            {/* Render connections first (behind nodes) */}
            <g className="connections-layer">
              {connections.map((conn, i) => renderConnection(conn, i))}
            </g>

            {/* Render skill nodes */}
            <g className="nodes-layer">
              {skillData.map(skill => renderSkillNode(skill))}
            </g>
          </svg>
        </div>
      </div>

      {/* Skill detail panel */}
      {selectedSkill && (
        <div className="skill-detail-overlay" onClick={() => setSelectedSkill(null)}>
          <div 
            className="skill-detail-panel"
            onClick={e => e.stopPropagation()}
            style={{ '--category-color': getCategoryColor(selectedSkill.category) } as React.CSSProperties}
          >
            <button className="skill-detail-close" onClick={() => setSelectedSkill(null)}>
              ✕
            </button>
            
            <div className="skill-detail-header">
              <div 
                className="skill-detail-icon"
                style={{ 
                  boxShadow: getStatusGlow(selectedSkill.status, selectedSkill.category),
                  borderColor: getCategoryColor(selectedSkill.category)
                }}
              >
                <span>{selectedSkill.icon}</span>
                {selectedSkill.status === 'mastered' && (
                  <div className="skill-detail-mastered-badge">⭐</div>
                )}
              </div>
              <div className="skill-detail-title-area">
                <div className="skill-detail-category">
                  {selectedSkill.category === 'tal' && '📐 Tal og Algebra'}
                  {selectedSkill.category === 'geometri' && '📏 Geometri'}
                  {selectedSkill.category === 'statistik' && '📊 Statistik'}
                </div>
                <h2 className="skill-detail-name">{selectedSkill.name}</h2>
                <div className="skill-detail-level">{selectedSkill.level}</div>
              </div>
            </div>
            
            <p className="skill-detail-description">{selectedSkill.description}</p>
            
            {/* XP Progress - only for non-locked skills */}
            {selectedSkill.status !== 'locked' && (
              <div className="skill-detail-progress">
                <div className="skill-detail-progress-header">
                  <span>Fremgang</span>
                  <span>{selectedSkill.xp}%</span>
                </div>
                <div className="skill-detail-progress-bar">
                  <div 
                    className="skill-detail-progress-fill"
                    style={{ 
                      width: `${selectedSkill.xp}%`,
                      background: `linear-gradient(90deg, ${getCategoryColor(selectedSkill.category)}, ${getCategoryColor(selectedSkill.category)}cc)`
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Unlock requirements - for locked skills */}
            {selectedSkill.status === 'locked' && selectedSkill.prerequisites.length > 0 && (() => {
              const prereqs = selectedSkill.prerequisites.map(id => getSkillById(id)).filter(Boolean) as Skill[]
              const masteredCount = prereqs.filter(p => p.status === 'mastered').length
              const totalCount = prereqs.length
              
              return (
                <div className="skill-detail-unlock">
                  <div className="skill-detail-unlock-header">
                    <span className="skill-detail-unlock-icon">🔓</span>
                    <div className="skill-detail-unlock-info">
                      <h4>Sådan låser du op</h4>
                      <p>Mestr alle forudsætninger for at låse denne færdighed op</p>
                    </div>
                  </div>
                  
                  <div className="skill-detail-unlock-progress">
                    <div className="skill-detail-unlock-progress-text">
                      <span>{masteredCount} af {totalCount} mestret</span>
                      <span>{Math.round((masteredCount / totalCount) * 100)}%</span>
                    </div>
                    <div className="skill-detail-unlock-progress-bar">
                      <div 
                        className="skill-detail-unlock-progress-fill"
                        style={{ width: `${(masteredCount / totalCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="skill-detail-prereq-list">
                    {prereqs.map(prereq => (
                      <div 
                        key={prereq.id}
                        className={`skill-detail-prereq skill-detail-prereq--${prereq.status}`}
                        onClick={() => setSelectedSkill(prereq)}
                      >
                        <span className="skill-detail-prereq-icon">{prereq.icon}</span>
                        <div className="skill-detail-prereq-info">
                          <span className="skill-detail-prereq-name">{prereq.name}</span>
                          <span className="skill-detail-prereq-status">
                            {prereq.status === 'mastered' && '✓ Mestret'}
                            {prereq.status === 'unlocked' && `${prereq.xp}% fremgang`}
                            {prereq.status === 'available' && 'Klar til start'}
                            {prereq.status === 'locked' && '🔒 Låst'}
                          </span>
                        </div>
                        {prereq.status === 'mastered' && <span className="prereq-check">✓</span>}
                        {prereq.status !== 'mastered' && <span className="prereq-arrow">→</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
            
            {/* Prerequisites - for non-locked skills */}
            {selectedSkill.status !== 'locked' && selectedSkill.prerequisites.length > 0 && (
              <div className="skill-detail-prereqs">
                <h4>Forudsætninger</h4>
                <div className="skill-detail-prereq-list">
                  {selectedSkill.prerequisites.map(prereqId => {
                    const prereq = getSkillById(prereqId)
                    if (!prereq) return null
                    return (
                      <div 
                        key={prereqId}
                        className={`skill-detail-prereq skill-detail-prereq--${prereq.status}`}
                        onClick={() => setSelectedSkill(prereq)}
                      >
                        <span>{prereq.icon}</span>
                        <span>{prereq.name}</span>
                        {prereq.status === 'mastered' && <span className="prereq-check">✓</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* Action button */}
            <div className="skill-detail-actions">
              {selectedSkill.status === 'locked' && (
                <button className="skill-detail-btn skill-detail-btn--locked" disabled>
                  🔒 Låst – mestr forudsætningerne først
                </button>
              )}
              {selectedSkill.status === 'available' && (
                <button className="skill-detail-btn skill-detail-btn--start">
                  ▶️ Start Træning
                </button>
              )}
              {selectedSkill.status === 'unlocked' && (
                <button className="skill-detail-btn skill-detail-btn--continue">
                  ⚡ Fortsæt Træning
                </button>
              )}
              {selectedSkill.status === 'mastered' && (
                <button className="skill-detail-btn skill-detail-btn--mastered">
                  ⭐ Mestret!
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
