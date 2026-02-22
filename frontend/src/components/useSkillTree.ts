import { useState, useCallback, useMemo } from 'react'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import {
  type Skill,
  type SchoolZone,
  skillData,
  connections,
  PADDING,
  LABEL_WIDTH,
  NODE_WIDTH,
  NODE_HEIGHT,
  RANK_SEP,
  NODE_SEP,
  ZONE_PADDING,
  SCHOOL_LEVEL_RANGES,
  getSchoolLevel,
} from './skillTreeData'

export interface SkillTreeLayout {
  nodePositions: Record<string, { x: number; y: number }>
  graphWidth: number
  graphHeight: number
  schoolZones: SchoolZone[]
  edgeRoutes: Record<string, Array<{ x: number; y: number }>>
}

export function useSkillTree() {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [hoveredSkillId, setHoveredSkillId] = useState<string | null>(null)

  const ancestorsMap = useMemo(() => {
    const parentsOf: Record<string, string[]> = {}
    skillData.forEach(skill => {
      parentsOf[skill.id] = skill.prerequisites
    })

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

    const ancestors: Record<string, Set<string>> = {}
    skillData.forEach(skill => {
      ancestors[skill.id] = getAncestors(skill.id)
    })
    return ancestors
  }, [])

  const highlightedSkillIds = useMemo(() => {
    if (!hoveredSkillId) return new Set<string>()
    const highlighted = new Set<string>()
    highlighted.add(hoveredSkillId)
    ancestorsMap[hoveredSkillId]?.forEach(id => highlighted.add(id))
    return highlighted
  }, [hoveredSkillId, ancestorsMap])

  const isConnectionHighlighted = useCallback((from: string, to: string) => {
    if (!hoveredSkillId) return false
    return highlightedSkillIds.has(from) && highlightedSkillIds.has(to)
  }, [hoveredSkillId, highlightedSkillIds])

  useKeyboardShortcut('Escape', () => setSelectedSkill(null), !!selectedSkill)

  const layout = useMemo<SkillTreeLayout>(() => {
    const GRID_X = NODE_WIDTH + NODE_SEP
    const GRID_Y = NODE_HEIGHT + RANK_SEP

    const skillsByLevel: Record<'indskoling' | 'mellemtrin' | 'udskoling', Skill[]> = {
      indskoling: [],
      mellemtrin: [],
      udskoling: []
    }

    skillData.forEach(skill => {
      const level = getSchoolLevel(skill.level)
      skillsByLevel[level].push(skill)
    })

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

    const positions: Record<string, { x: number; y: number }> = {}
    skillData.forEach(skill => {
      positions[skill.id] = {
        x: PADDING + LABEL_WIDTH + skill.x * GRID_X,
        y: PADDING + skill.y * GRID_Y,
      }
    })

    const allX = skillData.map(s => s.x)
    const allY = skillData.map(s => s.y)
    const maxGridX = Math.max(...allX)
    const maxGridY = Math.max(...allY)

    const width = PADDING + LABEL_WIDTH + maxGridX * GRID_X + NODE_WIDTH / 2 + PADDING
    const height = PADDING + maxGridY * GRID_Y + NODE_HEIGHT / 2 + PADDING

    const zoneOrder: Array<'indskoling' | 'mellemtrin' | 'udskoling'> = ['indskoling', 'mellemtrin', 'udskoling']
    const zones: SchoolZone[] = []

    zoneOrder.forEach((level, index) => {
      const range = levelRanges[level]
      const info = SCHOOL_LEVEL_RANGES[level]

      let startY = PADDING + range.min * GRID_Y - NODE_HEIGHT / 2 - ZONE_PADDING
      let endY = PADDING + range.max * GRID_Y + NODE_HEIGHT / 2 + ZONE_PADDING

      if (index === 0) startY = 0
      if (index === zoneOrder.length - 1) endY = height
      if (index > 0 && zones[index - 1]) startY = zones[index - 1].endY

      zones.push({
        id: level,
        label: info.label,
        sublabel: info.sublabel,
        startY,
        endY,
        color: info.color
      })
    })

    const edgeRoutes: Record<string, Array<{ x: number; y: number }>> = {}
    connections.forEach(conn => {
      const fromPos = positions[conn.from]
      const toPos = positions[conn.to]
      if (fromPos && toPos) {
        const key = `${conn.from}->${conn.to}`
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

  const getSkillById = useCallback((id: string) => skillData.find(s => s.id === id), [])

  const getNodeCenter = useCallback((skill: Skill) => {
    const pos = layout.nodePositions[skill.id]
    return pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 }
  }, [layout.nodePositions])

  const masteredCount = useMemo(() => skillData.filter(s => s.status === 'mastered').length, [])
  const unlockedCount = useMemo(() => skillData.filter(s => s.status === 'unlocked').length, [])
  const totalSkills = skillData.length
  const progressPercent = Math.round((masteredCount / totalSkills) * 100)

  return {
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
  }
}
