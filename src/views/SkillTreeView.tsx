import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { PageTransition } from '../components/animation'
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
    name: 'Proportionalitet',
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
const PADDING = 30
const LABEL_WIDTH = 110 // Width for school level labels on the left
const NODE_WIDTH = 70
const NODE_HEIGHT = 80
const RANK_SEP = 65 // Vertical spacing between ranks
const NODE_SEP = 45 // Horizontal spacing between nodes
const ZONE_PADDING = 30 // Extra padding around nodes within zones

// School level zones - will be calculated dynamically based on dagre layout
const SCHOOL_LEVEL_RANGES = {
  indskoling: { label: 'Indskoling', sublabel: '1.-3. klasse', color: 'rgba(99, 102, 241, 0.04)' },
  mellemtrin: { label: 'Mellemtrin', sublabel: '4.-6. klasse', color: 'rgba(16, 185, 129, 0.04)' },
  udskoling: { label: 'Udskoling', sublabel: '7.-9. klasse', color: 'rgba(245, 158, 11, 0.04)' },
}

// Helper to determine school level from skill level string
const getSchoolLevel = (level: string): 'indskoling' | 'mellemtrin' | 'udskoling' => {
  if (level.includes('Indskoling')) return 'indskoling'
  if (level.includes('Mellemtrin')) return 'mellemtrin'
  return 'udskoling'
}

// Animation variants
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
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [hoveredSkillId, setHoveredSkillId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Build adjacency map for finding ancestors (prerequisites)
  const ancestorsMap = useMemo(() => {
    // Build parent map
    const parentsOf: Record<string, string[]> = {}
    
    skillData.forEach(skill => {
      parentsOf[skill.id] = skill.prerequisites
    })
    
    // Get all ancestors (recursive)
    const getAncestors = (id: string, visited = new Set<string>()): Set<string> => {
      const result = new Set<string>()
      const parents = parentsOf[id] || []
      for (const parent of parents) {
        if (!visited.has(parent)) {
          visited.add(parent)
          result.add(parent)
          getAncestors(parent, visited).forEach(a => result.add(a))
        }
      }
      return result
    }
    
    // Pre-compute ancestors for all skills
    const ancestors: Record<string, Set<string>> = {}
    skillData.forEach(skill => {
      ancestors[skill.id] = getAncestors(skill.id)
    })
    
    return ancestors
  }, [])
  
  // Get the set of highlighted skill IDs based on hover (only ancestors, not descendants)
  const highlightedSkillIds = useMemo(() => {
    if (!hoveredSkillId) return new Set<string>()
    
    const highlighted = new Set<string>()
    highlighted.add(hoveredSkillId)
    ancestorsMap[hoveredSkillId]?.forEach(id => highlighted.add(id))
    
    return highlighted
  }, [hoveredSkillId, ancestorsMap])
  
  // Check if a connection should be highlighted
  const isConnectionHighlighted = useCallback((from: string, to: string) => {
    if (!hoveredSkillId) return false
    return highlightedSkillIds.has(from) && highlightedSkillIds.has(to)
  }, [hoveredSkillId, highlightedSkillIds])
  
  // Handle escape key to close skill panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedSkill) {
        setSelectedSkill(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedSkill])
  
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
      let startY = PADDING + range.min * GRID_Y - NODE_HEIGHT / 2 - ZONE_PADDING
      let endY = PADDING + range.max * GRID_Y + NODE_HEIGHT / 2 + ZONE_PADDING
      
      // First zone starts at 0
      if (index === 0) {
        startY = 0
      }
      
      // Last zone extends to bottom
      if (index === zoneOrder.length - 1) {
        endY = height
      }
      
      // Adjust boundaries to meet neighboring zones seamlessly
      if (index > 0 && zones[index - 1]) {
        startY = zones[index - 1].endY
      }
      
      zones.push({
        id: level,
        label: info.label,
        sublabel: info.sublabel,
        startY,
        endY,
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

  const renderConnection = useCallback((conn: { from: string; to: string }, index: number) => {
    const fromSkill = getSkillById(conn.from)
    const toSkill = getSkillById(conn.to)
    if (!fromSkill || !toSkill) return null
    
    // Determine if connection should glow
    const isUnlocked = fromSkill.status === 'mastered' || fromSkill.status === 'unlocked'
    const toIsActive = toSkill.status !== 'locked'
    const isActive = isUnlocked && toIsActive
    
    // Determine hover highlight state
    const isHighlighted = isConnectionHighlighted(conn.from, conn.to)
    const isDimmed = hoveredSkillId !== null && !isHighlighted
    
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
    
    // Build class names
    const connClassNames = [
      'skill-connection',
      isHighlighted && 'skill-connection--highlighted',
      isDimmed && 'skill-connection--dimmed'
    ].filter(Boolean).join(' ')

    // Calculate visual properties based on state
    const strokeColor = isHighlighted ? color : (isActive ? color : '#E7E5E4')
    const strokeWidth = isHighlighted ? 3 : 2
    const strokeOpacity = isDimmed ? 0.12 : (isHighlighted ? 1 : (isActive ? 0.8 : 0.5))
    const showGlow = isHighlighted || (isActive && !isDimmed)
    const glowWidth = isHighlighted ? 8 : 4
    const glowOpacity = isHighlighted ? 0.5 : 0.2

    return (
      <g key={`conn-${index}`} className={connClassNames}>
        {/* Glow effect for active/highlighted connections */}
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
        {/* Animated particles along active connections */}
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
    
    // Determine highlight state
    const isHovered = hoveredSkillId === skill.id
    const isHighlighted = highlightedSkillIds.has(skill.id)
    const isDimmed = hoveredSkillId !== null && !isHighlighted
    
    // Create unique gradient IDs for this node
    const gradientId = `node-glass-${skill.id}`
    const highlightGradId = `node-highlight-${skill.id}`
    const shadowId = `node-shadow-${skill.id}`
    
    // Build class names
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
          setSelectedSkill(skill)
        }}
        onMouseEnter={() => setHoveredSkillId(skill.id)}
        onMouseLeave={() => setHoveredSkillId(null)}
      >
        {/* Node-specific gradients */}
        <defs>
          {/* Glass gradient - main fill */}
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
          
          {/* Top highlight - glass shine */}
          <linearGradient id={highlightGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
            <stop offset="50%" stopColor="rgba(255, 255, 255, 0.1)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </linearGradient>
          
          {/* Inner shadow filter */}
          <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={isLocked ? '#00000010' : `${color}30`} />
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#00000008" />
          </filter>
        </defs>
        
        {/* Invisible hit area */}
        <circle
          r={r + 15}
          fill="transparent"
          className="skill-node-hitarea"
        />
        
        {/* Outer glow for active nodes */}
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
        
        {/* Main glass background */}
        <circle
          r={r}
          fill={`url(#${gradientId})`}
          stroke={isLocked ? 'rgba(0,0,0,0.06)' : color}
          strokeWidth={isMastered ? 2.5 : 1.5}
          className="skill-node-bg"
          filter={`url(#${shadowId})`}
        />
        
        {/* Inner border - glass edge */}
        <circle
          r={r - 1}
          fill="none"
          stroke="rgba(255, 255, 255, 0.6)"
          strokeWidth={1}
          className="skill-node-inner-border"
        />
        
        {/* Top highlight arc - glass shine */}
        <path
          d={`M ${-r * 0.7} ${-r * 0.3} A ${r * 0.85} ${r * 0.85} 0 0 1 ${r * 0.7} ${-r * 0.3}`}
          fill="none"
          stroke={`url(#${highlightGradId})`}
          strokeWidth={r * 0.4}
          strokeLinecap="round"
          opacity={isLocked ? 0.3 : 0.7}
          className="skill-node-shine"
        />
        
        {/* XP progress ring */}
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
        
        {/* Icon */}
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
        
        {/* Lock overlay for locked skills */}
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
        
        {/* Mastered badge */}
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
        
        {/* Skill name label */}
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
  }, [getNodeCenter, nodeSize, hoveredSkillId, highlightedSkillIds])

  const masteredCount = useMemo(() => skillData.filter(s => s.status === 'mastered').length, [])
  const unlockedCount = useMemo(() => skillData.filter(s => s.status === 'unlocked').length, [])
  const totalSkills = skillData.length
  const progressPercent = Math.round((masteredCount / totalSkills) * 100)

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
            <span className="skills__eyebrow">🎮 Skill Tree</span>
            <h1 className="skills__title">Matematik Færdigheder</h1>
            <p className="skills__subtitle">
              Oplås nye færdigheder og bliv en matematik-mester
            </p>
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
        <motion.div className="skills__card" variants={itemVariants}>
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
          <div className="skills__canvas" ref={containerRef}>
            {/* Zone backgrounds - HTML elements for edge-to-edge coverage */}
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
                    {/* Zone label */}
                    <div className="skills__zone-label">
                      <span className="skills__zone-label-main">{zone.label}</span>
                      <span className="skills__zone-label-sub">{zone.sublabel}</span>
                    </div>
                    {/* Divider line (not for first zone) */}
                    {index > 0 && <div className="skills__zone-divider" />}
                  </div>
                )
              })}
            </div>
            
            <LayoutGroup>
              <svg
                width="100%"
                height={treeHeight}
                className="skills__svg"
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

                {/* Render connections first (behind nodes) */}
                <g className="connections-layer">
                  {connections.map((conn, i) => renderConnection(conn, i))}
                </g>

                {/* Render skill nodes */}
                <g className="nodes-layer">
                  {skillData.map(skill => renderSkillNode(skill))}
                </g>
              </svg>
              
              {/* HTML Node Overlay for layout animations */}
              <div className="skills__node-overlay">
                {skillData.map(skill => {
                  const pos = nodePositions[skill.id]
                  if (!pos) return null
                  
                  const color = getCategoryColor(skill.category)
                  const isInLineage = selectedSkill && (
                    skill.id === selectedSkill.id || 
                    ancestorsMap[selectedSkill.id]?.has(skill.id)
                  )
                  
                  // Only render overlay nodes for lineage when modal is open
                  if (!selectedSkill || !isInLineage) return null
                  
                  return (
                    <motion.div
                      key={`overlay-${skill.id}`}
                      layoutId={`skill-node-${skill.id}`}
                      className={`skills__overlay-node skills__overlay-node--${skill.status}`}
                      style={{
                        '--node-color': color,
                        left: `${(pos.x / (graphWidth + PADDING)) * 100}%`,
                        top: `${(pos.y / treeHeight) * 100}%`,
                      } as React.CSSProperties}
                      transition={{
                        type: 'spring',
                        stiffness: 350,
                        damping: 30
                      }}
                    >
                      <span>{skill.icon}</span>
                      {skill.status === 'mastered' && <span className="skills__overlay-check">✓</span>}
                    </motion.div>
                  )
                })}
              </div>
            </LayoutGroup>
          </div>
        </motion.div>

        {/* Skill Detail Modal with Shared Element Transition */}
        <AnimatePresence>
          {selectedSkill && (() => {
            // Build the lineage (ancestors + current skill)
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
            
            const masteredCount = lineage.filter(s => s.status === 'mastered').length
            const lineageProgress = Math.round((masteredCount / lineage.length) * 100)
            
            // Calculate mini-DAG layout
            const levels: Map<number, Skill[]> = new Map()
            lineage.forEach(skill => {
              if (!levels.has(skill.y)) levels.set(skill.y, [])
              levels.get(skill.y)!.push(skill)
            })
            const sortedLevels = Array.from(levels.keys()).sort((a, b) => a - b)
            
            const MINI_NODE = 56
            const ROW_H = 80
            const COL_W = 74
            const DAG_W = 340
            
            const dagPositions: Map<string, { x: number; y: number }> = new Map()
            sortedLevels.forEach((level, row) => {
              const nodes = levels.get(level)!
              const startX = (DAG_W - nodes.length * COL_W) / 2 + COL_W / 2
              nodes.forEach((skill, col) => {
                dagPositions.set(skill.id, { x: startX + col * COL_W, y: 24 + row * ROW_H })
              })
            })
            
            const dagHeight = sortedLevels.length * ROW_H + 10
            
            // Build lineage connections
            const lineageConns: Array<{ from: Skill; to: Skill }> = []
            lineage.forEach(skill => {
              skill.prerequisites.forEach(prereqId => {
                const prereq = lineage.find(s => s.id === prereqId)
                if (prereq) lineageConns.push({ from: prereq, to: skill })
              })
            })
            
            return (
              <motion.div 
                className="skill-modal__backdrop" 
                onClick={() => setSelectedSkill(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <motion.div 
                  className="skill-modal skill-modal--with-dag"
                  onClick={e => e.stopPropagation()}
                  initial={{ opacity: 0, y: 60 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 60 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 32 }}
                >
                  <div className="skill-modal__handle" />
                  
                  <button className="skill-modal__close" onClick={() => setSelectedSkill(null)}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                  
                  {/* Mini DAG with shared element nodes */}
                  {lineage.length > 1 && (
                    <div className="skill-modal__dag-section">
                      <div className="skill-modal__dag-header">
                        <span className="skill-modal__dag-label">Færdighedssti</span>
                        <span className="skill-modal__dag-progress-text">{masteredCount}/{lineage.length} mestret</span>
                      </div>
                      
                      <LayoutGroup>
                        <div className="skill-modal__dag-area" style={{ height: dagHeight }}>
                          {/* SVG connections */}
                          <svg className="skill-modal__dag-connections" viewBox={`0 0 ${DAG_W} ${dagHeight}`}>
                            {lineageConns.map((conn, i) => {
                              const from = dagPositions.get(conn.from.id)
                              const to = dagPositions.get(conn.to.id)
                              if (!from || !to) return null
                              
                              const isMastered = conn.from.status === 'mastered'
                              const color = getCategoryColor(conn.to.category)
                              const midY = (from.y + to.y) / 2
                              const path = `M${from.x},${from.y + MINI_NODE/2 - 4} C${from.x},${midY} ${to.x},${midY} ${to.x},${to.y - MINI_NODE/2 + 4}`
                              
                              return (
                                <g key={i}>
                                  {isMastered && (
                                    <motion.path
                                      d={path}
                                      fill="none"
                                      stroke={color}
                                      strokeWidth={5}
                                      strokeLinecap="round"
                                      opacity={0.25}
                                      initial={{ pathLength: 0 }}
                                      animate={{ pathLength: 1 }}
                                      transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                    />
                                  )}
                                  <motion.path
                                    d={path}
                                    fill="none"
                                    stroke={isMastered ? color : 'rgba(0,0,0,0.12)'}
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeDasharray={isMastered ? 'none' : '5 4'}
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ delay: 0.25 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                  />
                                </g>
                              )
                            })}
                          </svg>
                          
                          {/* Shared element nodes */}
                          {lineage.map((skill) => {
                            const pos = dagPositions.get(skill.id)
                            if (!pos) return null
                            
                            const isCurrent = skill.id === selectedSkill.id
                            const color = getCategoryColor(skill.category)
                            const progress = skill.xp || 0
                            
                            return (
                              <motion.div
                                key={skill.id}
                                layoutId={`skill-node-${skill.id}`}
                                className={`skill-modal__dag-node ${isCurrent ? 'skill-modal__dag-node--current' : ''} skill-modal__dag-node--${skill.status}`}
                                style={{
                                  '--node-color': color,
                                  left: pos.x - MINI_NODE / 2,
                                  top: pos.y - MINI_NODE / 2,
                                  width: MINI_NODE,
                                  height: MINI_NODE,
                                } as React.CSSProperties}
                                onClick={() => !isCurrent && setSelectedSkill(skill)}
                                whileHover={!isCurrent ? { scale: 1.08 } : undefined}
                                whileTap={!isCurrent ? { scale: 0.95 } : undefined}
                                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                              >
                                {/* Progress ring */}
                                {skill.status !== 'locked' && progress > 0 && (
                                  <svg className="skill-modal__dag-ring" viewBox="0 0 56 56">
                                    <circle cx="28" cy="28" r="25" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="3" />
                                    <motion.circle
                                      cx="28" cy="28" r="25"
                                      fill="none"
                                      stroke={color}
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      transform="rotate(-90 28 28)"
                                      initial={{ strokeDasharray: '0 157' }}
                                      animate={{ strokeDasharray: `${progress * 1.57} 157` }}
                                      transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                                    />
                                  </svg>
                                )}
                                
                                <div className="skill-modal__dag-node-inner">
                                  <span>{skill.icon}</span>
                                </div>
                                
                                {skill.status === 'mastered' && (
                                  <motion.span 
                                    className="skill-modal__dag-check"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.5, type: 'spring', stiffness: 500 }}
                                  >
                                    ✓
                                  </motion.span>
                                )}
                                
                                {!isCurrent && (
                                  <div className="skill-modal__dag-tooltip">{skill.name}</div>
                                )}
                              </motion.div>
                            )
                          })}
                        </div>
                      </LayoutGroup>
                      
                      {/* Progress bar */}
                      <div className="skill-modal__dag-bar">
                        <motion.div 
                          className="skill-modal__dag-bar-fill"
                          style={{ background: getCategoryColor(selectedSkill.category) }}
                          initial={{ width: 0 }}
                          animate={{ width: `${lineageProgress}%` }}
                          transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Skill Info */}
                  <motion.div 
                    className="skill-modal__info"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="skill-modal__info-header">
                      <span 
                        className="skill-modal__category-tag"
                        style={{ background: `${getCategoryColor(selectedSkill.category)}15`, color: getCategoryColor(selectedSkill.category) }}
                      >
                        {selectedSkill.category === 'tal' && 'Tal og Algebra'}
                        {selectedSkill.category === 'geometri' && 'Geometri'}
                        {selectedSkill.category === 'statistik' && 'Statistik'}
                      </span>
                      <span className="skill-modal__level-tag">{selectedSkill.level}</span>
                    </div>
                    
                    <h2 className="skill-modal__title">{selectedSkill.name}</h2>
                    <p className="skill-modal__desc">{selectedSkill.description}</p>
                    
                    {/* Progress */}
                    {selectedSkill.status !== 'locked' && (
                      <div className="skill-modal__progress-section">
                        <div className="skill-modal__progress-label">
                          <span>Fremgang</span>
                          <span>{selectedSkill.xp}%</span>
                        </div>
                        <div className="skill-modal__progress-track">
                          <motion.div 
                            className="skill-modal__progress-fill"
                            style={{ background: getCategoryColor(selectedSkill.category) }}
                            initial={{ width: 0 }}
                            animate={{ width: `${selectedSkill.xp}%` }}
                            transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                  
                  {/* Action */}
                  <motion.div 
                    className="skill-modal__action"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {selectedSkill.status === 'locked' && (
                      <button className="skill-modal__btn skill-modal__btn--locked" disabled>
                        🔒 Mestr forudsætningerne først
                      </button>
                    )}
                    {selectedSkill.status === 'available' && (
                      <motion.button className="skill-modal__btn skill-modal__btn--primary" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        ▶️ Start Træning
                      </motion.button>
                    )}
                    {selectedSkill.status === 'unlocked' && (
                      <motion.button className="skill-modal__btn skill-modal__btn--success" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        ⚡ Fortsæt Træning
                      </motion.button>
                    )}
                    {selectedSkill.status === 'mastered' && (
                      <button className="skill-modal__btn skill-modal__btn--gold">⭐ Mestret!</button>
                    )}
                  </motion.div>
                </motion.div>
              </motion.div>
            )
          })()}
        </AnimatePresence>
      </motion.div>
    </PageTransition>
  )
}
