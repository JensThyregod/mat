export function getMasteryLabel(level: string): string {
  const labels: Record<string, string> = {
    NotYetAssessed: 'Ikke vurderet',
    NotStarted: 'Ikke startet',
    Beginning: 'Begynder',
    Developing: 'Udvikler sig',
    Competent: 'Kompetent',
    Proficient: 'Dygtig',
    Mastered: 'Mestret',
  }
  return labels[level] ?? level
}

export function getMasteryColor(level: string): string {
  const colors: Record<string, string> = {
    NotYetAssessed: 'var(--color-text-tertiary, #888)',
    NotStarted: '#ef4444',
    Beginning: '#f97316',
    Developing: '#eab308',
    Competent: '#22c55e',
    Proficient: '#3b82f6',
    Mastered: '#8b5cf6',
  }
  return colors[level] ?? '#888'
}

export const GRADE_THRESHOLDS: [number, string][] = [
  [0.90, '12'], [0.80, '10'], [0.65, '7'], [0.50, '4'],
  [0.35, '02'], [0.20, '00'], [0, '-3'],
]

export function meanToGrade(mean: number): string {
  for (const [threshold, grade] of GRADE_THRESHOLDS) {
    if (mean >= threshold) return grade
  }
  return '-3'
}

export function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    '12': '#8b5cf6', '10': '#3b82f6', '7': '#22c55e', '4': '#eab308',
    '02': '#f97316', '00': '#ef4444', '-3': '#dc2626',
  }
  return colors[grade] ?? 'var(--color-text-tertiary)'
}
