import { useState } from 'react'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { GeneratedTaskPreview } from '../../components/GeneratedTaskPreview'
import { GlassCard } from '../../components/GlassCard'
import { exportToLatex } from '../../utils/latexExport'
import type { TaskInstance } from '../../types/taskSchema'

interface TaskPreviewPanelProps {
  batchResults: TaskInstance[]
  rerollingIndex: number | null
  onRerollTask: (index: number) => void
  onNewGeneration: () => void
}

export function TaskPreviewPanel({
  batchResults,
  rerollingIndex,
  onRerollTask,
  onNewGeneration,
}: TaskPreviewPanelProps) {
  const [showAnswers, setShowAnswers] = useState(false)
  const [exportingLatex, setExportingLatex] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <GlassCard padding="md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 24, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="testlab__hero-badge" style={{ marginBottom: 0 }}>
            <span className="testlab__hero-badge-icon">✅</span>
            <span>Resultat</span>
          </div>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{batchResults.length} opgaver genereret</h2>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={showAnswers}
              onChange={e => setShowAnswers(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            Vis svar
          </label>
          <Button
            variant="secondary"
            disabled={exportingLatex}
            onClick={async () => {
              setExportingLatex(true)
              try {
                await exportToLatex(batchResults)
              } finally {
                setExportingLatex(false)
              }
            }}
          >
            {exportingLatex ? '⏳ Eksporterer...' : '📄 LaTeX'}
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>🖨️ Udskriv</Button>
          <Button variant="primary" onClick={onNewGeneration}>Ny generering</Button>
        </div>
      </GlassCard>

      <div className="task-list" style={{ display: 'flex', flexDirection: 'column', gap: 48, paddingBottom: 100 }}>
        {batchResults.map((task, index) => (
          <div key={task.id} style={{ breakInside: 'avoid', opacity: rerollingIndex === index ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--color-border)' }}>
              <span className="testlab__card-number" style={{ background: 'var(--color-text)', color: 'white', borderColor: 'transparent' }}>
                {index + 1}
              </span>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'monospace', flex: 1 }}>{task.type}</span>
              <button
                onClick={() => onRerollTask(index)}
                disabled={rerollingIndex !== null}
                title="Generer ny opgave"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  background: rerollingIndex === index ? 'var(--color-bg-subtle)' : 'var(--color-surface)',
                  color: 'var(--color-text-secondary)',
                  cursor: rerollingIndex !== null ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                className="hover-scale"
              >
                {rerollingIndex === index ? (
                  <>
                    <Spinner />
                    <span>Genererer...</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 16 }}>🔄</span>
                    <span>Ny opgave</span>
                  </>
                )}
              </button>
            </div>
            <GeneratedTaskPreview task={task as TaskInstance} showAnswers={showAnswers} />
          </div>
        ))}
      </div>
    </div>
  )
}
