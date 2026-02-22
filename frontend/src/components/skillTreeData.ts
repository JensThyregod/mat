export interface Skill {
  id: string
  name: string
  description: string
  level: string
  category: 'tal' | 'geometri' | 'statistik'
  x: number
  y: number
  prerequisites: string[]
  status: 'locked' | 'available' | 'unlocked' | 'mastered'
  xp?: number
  icon: string
}

// Y-positions mapped to school zones:
// Indskoling (1.-3. kl.): y = 0-5
// Mellemtrin (4.-6. kl.): y = 6-9
// Udskoling (7.-9. kl.): y = 10-14
export const skillData: Skill[] = [
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

export const connections: { from: string; to: string }[] = skillData.flatMap(skill =>
  skill.prerequisites.map(prereqId => ({ from: prereqId, to: skill.id }))
)

export const PADDING = 30
export const LABEL_WIDTH = 110
export const NODE_WIDTH = 70
export const NODE_HEIGHT = 80
export const RANK_SEP = 65
export const NODE_SEP = 45
export const ZONE_PADDING = 30

export const SCHOOL_LEVEL_RANGES = {
  indskoling: { label: 'Indskoling', sublabel: '1.-3. klasse', color: 'rgba(99, 102, 241, 0.04)' },
  mellemtrin: { label: 'Mellemtrin', sublabel: '4.-6. klasse', color: 'rgba(16, 185, 129, 0.04)' },
  udskoling: { label: 'Udskoling', sublabel: '7.-9. klasse', color: 'rgba(245, 158, 11, 0.04)' },
} as const

export type SchoolLevel = 'indskoling' | 'mellemtrin' | 'udskoling'

export const getSchoolLevel = (level: string): SchoolLevel => {
  if (level.includes('Indskoling')) return 'indskoling'
  if (level.includes('Mellemtrin')) return 'mellemtrin'
  return 'udskoling'
}

export const getCategoryColor = (category: Skill['category']) => {
  switch (category) {
    case 'tal': return '#6366F1'
    case 'geometri': return '#10B981'
    case 'statistik': return '#F59E0B'
  }
}

export const getStatusGlow = (status: Skill['status'], category: Skill['category']) => {
  const color = getCategoryColor(category)
  switch (status) {
    case 'mastered': return `0 0 30px ${color}, 0 0 60px ${color}40`
    case 'unlocked': return `0 0 20px ${color}80`
    case 'available': return `0 0 15px ${color}50`
    default: return 'none'
  }
}

export interface SchoolZone {
  id: string
  label: string
  sublabel: string
  startY: number
  endY: number
  color: string
}
