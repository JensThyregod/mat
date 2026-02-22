export interface TaskTypeInfo {
  id: string
  name: string
  number: number
  description: string
  category: 'algebra' | 'geometri' | 'statistik'
}

export const TASK_TYPES: TaskTypeInfo[] = [
  // TAL OG ALGEBRA (1-10)
  { id: 'tal_pris_rabat_procent', number: 1, name: 'Hverdagsregning', description: 'Priser, rabatter og tilbud', category: 'algebra' },
  { id: 'tal_forholdstalsregning', number: 2, name: 'Proportionalitet', description: 'Opskrifter og forhold', category: 'algebra' },
  { id: 'tal_hastighed_tid', number: 3, name: 'Hastighed & tid', description: 'Distance og fart', category: 'algebra' },
  { id: 'tal_broeker_og_antal', number: 4, name: 'Brøker & procent', description: 'Brøker i kontekst', category: 'algebra' },
  { id: 'tal_regnearter', number: 5, name: 'Regnearter', description: 'Plus, minus, gange', category: 'algebra' },
  { id: 'tal_regnehierarki', number: 6, name: 'Regnehierarki', description: 'Parenteser', category: 'algebra' },
  { id: 'tal_ligninger', number: 7, name: 'Ligninger', description: 'Simple ligninger', category: 'algebra' },
  { id: 'tal_overslag', number: 8, name: 'Overslag', description: 'Estimering', category: 'algebra' },
  { id: 'tal_algebraiske_udtryk', number: 9, name: 'Algebra', description: 'Udtryk og variable', category: 'algebra' },
  { id: 'tal_lineaere_funktioner', number: 10, name: 'Funktioner', description: 'Lineære funktioner', category: 'algebra' },

  // GEOMETRI OG MÅLING (11-18)
  { id: 'geo_enhedsomregning', number: 11, name: 'Enheder', description: 'Omregning', category: 'geometri' },
  { id: 'geo_trekant_elementer', number: 12, name: 'Trekanter', description: 'Elementer', category: 'geometri' },
  { id: 'geo_ligedannethed', number: 13, name: 'Målestok', description: 'Ligedannethed', category: 'geometri' },
  { id: 'geo_sammensat_figur', number: 14, name: 'Areal', description: 'Sammensatte figurer', category: 'geometri' },
  { id: 'geo_rumfang', number: 15, name: 'Rumfang', description: 'Prismer og cylindre', category: 'geometri' },
  { id: 'geo_vinkelsum', number: 16, name: 'Vinkler', description: 'Vinkelregler', category: 'geometri' },
  { id: 'geo_transformationer', number: 17, name: 'Transformationer', description: 'Spejling, rotation', category: 'geometri' },
  { id: 'geo_projektioner', number: 18, name: '3D-figurer', description: 'Projektioner', category: 'geometri' },

  // STATISTIK OG SANDSYNLIGHED (19-22)
  { id: 'stat_soejlediagram', number: 19, name: 'Diagrammer', description: 'Aflæsning', category: 'statistik' },
  { id: 'stat_statistiske_maal', number: 20, name: 'Statistik', description: 'Median, typetal', category: 'statistik' },
  { id: 'stat_boksplot', number: 21, name: 'Boksplot', description: 'Kvartiler', category: 'statistik' },
  { id: 'stat_sandsynlighed', number: 22, name: 'Sandsynlighed', description: 'Beregning', category: 'statistik' },
]

export const CATEGORY_INFO = {
  algebra: {
    name: 'Tal og Algebra',
    icon: '🔢',
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    count: 10,
  },
  geometri: {
    name: 'Geometri og Måling',
    icon: '📐',
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    count: 8,
  },
  statistik: {
    name: 'Statistik og Sandsynlighed',
    icon: '📊',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
    count: 4,
  },
} as const

export const CATEGORY_ORDER: ('algebra' | 'geometri' | 'statistik')[] = ['algebra', 'geometri', 'statistik']
