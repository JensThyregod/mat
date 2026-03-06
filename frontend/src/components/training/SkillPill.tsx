import type { SkillStateDto, SkillCatalogEntry } from '../../practice'
import { getMasteryLabel, getMasteryColor } from '../../utils/masteryHelpers'

export function SkillPill({ skill, catalog, isActive }: {
  skill: SkillStateDto
  catalog: SkillCatalogEntry | undefined
  isActive: boolean
}) {
  const color = getMasteryColor(skill.masteryLevel)
  return (
    <div className={`skill-pill ${isActive ? 'skill-pill--active' : ''}`}>
      <div className="skill-pill__bar" style={{ width: `${skill.mean * 100}%`, backgroundColor: color }} />
      <span className="skill-pill__name">{catalog?.name ?? skill.skillId}</span>
      <span className="skill-pill__level" style={{ color }}>{getMasteryLabel(skill.masteryLevel)}</span>
    </div>
  )
}
