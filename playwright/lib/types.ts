/**
 * Type definitions for the playwright test utilities
 */

export interface TaskTypeInfo {
  id: string;
  name: string;
  number: number;
  description: string;
  category: 'algebra' | 'geometri' | 'statistik';
}

// All task types in the system
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
];

export interface GeneratedTaskResult {
  taskType: TaskTypeInfo;
  success: boolean;
  title?: string;
  questionCount?: number;
  hasAnswers?: boolean;
  hasFigure?: boolean;
  error?: string;
  generationTime?: number;
}

export interface ValidationResult {
  taskType: TaskTypeInfo;
  iterations: number;
  successCount: number;
  failureCount: number;
  avgGenerationTime: number;
  errors: string[];
  samples: GeneratedTaskResult[];
}

