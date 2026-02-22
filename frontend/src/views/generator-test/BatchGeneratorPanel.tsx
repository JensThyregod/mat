import { Button } from '../../components/Button'
import { GlassCard, SurfaceCard } from '../../components/GlassCard'
import { requiresLLM } from '../../generators'
import { CATEGORY_INFO, type TaskTypeInfo } from './constants'

export interface BatchConfig {
  [typeId: string]: { count: number; difficulty: 'let' | 'middel' | 'svaer' }
}

interface BatchGeneratorPanelProps {
  groupedTypes: Record<'algebra' | 'geometri' | 'statistik', TaskTypeInfo[]>
  supportedTypes: Set<string>
  batchConfig: BatchConfig
  totalTasks: number
  loading: boolean
  error: string | null
  onUpdateBatchCount: (typeId: string, delta: number) => void
  onSetBatchCount: (typeId: string, count: number) => void
  onSetBatchDifficulty: (typeId: string, difficulty: 'let' | 'middel' | 'svaer') => void
  onDistributeTotal: (total: number) => void
  onSelectAll: () => void
  onResetSelection: () => void
  onGenerate: () => void
  onClear: () => void
}

export function BatchGeneratorPanel({
  groupedTypes,
  supportedTypes,
  batchConfig,
  totalTasks,
  loading,
  error,
  onUpdateBatchCount,
  onSetBatchCount,
  onSetBatchDifficulty,
  onDistributeTotal,
  onSelectAll,
  onResetSelection,
  onGenerate,
  onClear,
}: BatchGeneratorPanelProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>

      {/* Sticky Controls */}
      <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <GlassCard padding="md">
          <h3 style={{ marginBottom: 16 }}>Indstillinger</h3>

          <div className="field" style={{ marginBottom: 20 }}>
            <label className="field-label">Total Antal</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number"
                className="field-input"
                value={totalTasks}
                onChange={e => onDistributeTotal(parseInt(e.target.value) || 0)}
                min={0}
                max={100}
              />
              <Button variant="secondary" onClick={() => onDistributeTotal(totalTasks)}>Fordel</Button>
            </div>
            <p className="field-hint" style={{ marginTop: 8 }}>
              Vælg opgavetyper først, eller brug 'Fordel' til at sprede antallet jævnt over alle typer.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <Button variant="secondary" className="btn-sm" onClick={onSelectAll}>Vælg alle</Button>
            <Button variant="ghost" className="btn-sm" onClick={onResetSelection}>Nulstil valg</Button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="primary"
              className="btn-block"
              onClick={onGenerate}
              disabled={loading || totalTasks === 0}
            >
              {loading ? 'Genererer...' : `Generer ${totalTasks} opgaver`}
            </Button>
            <Button variant="ghost" className="btn-icon" onClick={onClear} title="Nulstil">
              ✕
            </Button>
          </div>
        </GlassCard>

        {error && (
          <div className="testlab__modal-error" style={{ padding: 16, minHeight: 'auto', background: 'rgba(255,59,48,0.1)', borderRadius: 12 }}>
            <p style={{ color: 'var(--color-error)', margin: 0 }}>{error}</p>
          </div>
        )}
      </div>

      {/* Type Selection Grid */}
      <div className="testlab__categories">
        {(['algebra', 'geometri', 'statistik'] as const).map(category => {
          const info = CATEGORY_INFO[category]
          const types = groupedTypes[category]
          if (types.length === 0) return null

          return (
            <div key={category} className="testlab__category expanded" style={{ overflow: 'visible' }}>
              <div
                className="testlab__category-header"
                style={{ '--category-color': info.color, '--category-gradient': info.gradient, cursor: 'default' } as React.CSSProperties}
              >
                <div className="testlab__category-icon" style={{ width: 40, height: 40, fontSize: 20 }}>{info.icon}</div>
                <div className="testlab__category-info">
                  <h2 className="testlab__category-name" style={{ fontSize: '1.1rem' }}>{info.name}</h2>
                </div>
              </div>

              <div className="testlab__grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                {types.map(typeInfo => {
                  const isSupported = supportedTypes.has(typeInfo.id)
                  const config = batchConfig[typeInfo.id]
                  const count = config?.count || 0

                  return (
                    <SurfaceCard
                      key={typeInfo.id}
                      padding="sm"
                      className={!isSupported ? 'disabled' : ''}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        border: count > 0 ? `2px solid ${info.color}` : undefined,
                        opacity: !isSupported ? 0.6 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                        <div className="testlab__card-number" style={{ width: 32, height: 32, fontSize: 13, borderColor: info.color, color: info.color }}>
                          {typeInfo.number}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {typeInfo.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                            {requiresLLM(typeInfo.id) ? '🤖 AI' : '⚡ Logic'}
                          </div>
                        </div>

                        {isSupported && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--color-bg-subtle)', borderRadius: 8, padding: 2 }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ width: 24, height: 24, padding: 0 }}
                              onClick={() => onUpdateBatchCount(typeInfo.id, -1)}
                            >
                              -
                            </button>
                            <input
                              type="text"
                              value={count}
                              onChange={(e) => onSetBatchCount(typeInfo.id, parseInt(e.target.value) || 0)}
                              style={{ width: 32, textAlign: 'center', background: 'transparent', border: 'none', fontWeight: 600 }}
                            />
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ width: 24, height: 24, padding: 0 }}
                              onClick={() => onUpdateBatchCount(typeInfo.id, 1)}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>

                      {isSupported && count > 0 && (
                        <div style={{ width: '100%', paddingTop: 8, borderTop: '1px solid var(--color-border-subtle)' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {(['let', 'middel', 'svaer'] as const).map(d => (
                              <button
                                key={d}
                                onClick={() => onSetBatchDifficulty(typeInfo.id, d)}
                                style={{
                                  flex: 1,
                                  fontSize: 11,
                                  padding: '4px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: config.difficulty === d ? info.color : 'transparent',
                                  color: config.difficulty === d ? 'white' : 'var(--color-text-muted)',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  textTransform: 'capitalize'
                                }}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </SurfaceCard>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
