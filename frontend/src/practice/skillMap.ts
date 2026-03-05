/**
 * Maps skill IDs to task generator types.
 * Each skill can map to one or more generators that test it.
 * Difficulty is mapped from the Bayesian mean to generator difficulty.
 */

export interface SkillGeneratorMapping {
  skillId: string
  name: string
  category: 'tal' | 'geometri' | 'statistik'
  generators: string[]
}

export const SKILL_GENERATOR_MAP: SkillGeneratorMapping[] = [
  // ── Tal og Algebra ──────────────────────────────────────────
  { skillId: 'regnearter', name: 'Regnearter', category: 'tal', generators: ['tal_regnearter'] },
  { skillId: 'regnehierarki', name: 'Regnehierarki', category: 'tal', generators: ['tal_regnehierarki'] },
  { skillId: 'broeker', name: 'Brøker', category: 'tal', generators: ['tal_broeker_og_antal'] },
  { skillId: 'overslag', name: 'Overslag', category: 'tal', generators: ['tal_overslag'] },
  { skillId: 'ligninger', name: 'Ligninger', category: 'tal', generators: ['tal_ligninger'] },
  { skillId: 'algebraiske_udtryk', name: 'Algebraiske udtryk', category: 'tal', generators: ['tal_algebraiske_udtryk'] },
  { skillId: 'lineaere_funktioner', name: 'Lineære funktioner', category: 'tal', generators: ['tal_lineaere_funktioner'] },
  { skillId: 'pris_rabat', name: 'Pris, rabat & procent', category: 'tal', generators: ['tal_pris_rabat_procent'] },
  { skillId: 'forholdstalsregning', name: 'Forholdstalsregning', category: 'tal', generators: ['tal_forholdstalsregning'] },
  { skillId: 'hastighed_tid', name: 'Hastighed & tid', category: 'tal', generators: ['tal_hastighed_tid'] },

  // ── Geometri og Måling ──────────────────────────────────────
  { skillId: 'enhedsomregning', name: 'Enhedsomregning', category: 'geometri', generators: ['geo_enhedsomregning'] },
  { skillId: 'vinkelsum', name: 'Vinkelsum', category: 'geometri', generators: ['geo_vinkelsum'] },
  { skillId: 'trekant_elementer', name: 'Trekant-elementer', category: 'geometri', generators: ['geo_trekant_elementer'] },
  { skillId: 'ligedannethed', name: 'Ligedannethed', category: 'geometri', generators: ['geo_ligedannethed'] },
  { skillId: 'sammensat_figur', name: 'Sammensat figur', category: 'geometri', generators: ['geo_sammensat_figur'] },
  { skillId: 'rumfang', name: 'Rumfang', category: 'geometri', generators: ['geo_rumfang'] },
  { skillId: 'transformationer', name: 'Transformationer', category: 'geometri', generators: ['geo_transformationer'] },
  { skillId: 'projektioner', name: 'Projektioner', category: 'geometri', generators: ['geo_projektioner'] },

  // ── Statistik og Sandsynlighed ──────────────────────────────
  { skillId: 'soejlediagram', name: 'Søjlediagram', category: 'statistik', generators: ['stat_soejlediagram'] },
  { skillId: 'statistiske_maal', name: 'Statistiske mål', category: 'statistik', generators: ['stat_statistiske_maal'] },
  { skillId: 'boksplot', name: 'Boksplot', category: 'statistik', generators: ['stat_boksplot'] },
  { skillId: 'sandsynlighed', name: 'Sandsynlighed', category: 'statistik', generators: ['stat_sandsynlighed'] },
]

export function getSkillById(skillId: string): SkillGeneratorMapping | undefined {
  return SKILL_GENERATOR_MAP.find(s => s.skillId === skillId)
}

export function getSkillsByCategory(category: 'tal' | 'geometri' | 'statistik'): SkillGeneratorMapping[] {
  return SKILL_GENERATOR_MAP.filter(s => s.category === category)
}
