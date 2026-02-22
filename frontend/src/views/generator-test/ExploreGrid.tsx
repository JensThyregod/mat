import { GlassCard } from '../../components/GlassCard'
import { requiresLLM } from '../../generators'
import { CATEGORY_INFO, type TaskTypeInfo } from './constants'

interface ExploreGridProps {
  groupedTypes: Record<'algebra' | 'geometri' | 'statistik', TaskTypeInfo[]>
  supportedTypes: Set<string>
  expandedCategories: Set<string>
  searchQuery: string
  onSearchChange: (query: string) => void
  onToggleCategory: (category: string) => void
  onGenerate: (typeInfo: TaskTypeInfo) => void
  selectedDifficulty: 'let' | 'middel' | 'svaer'
  onDifficultyChange: (d: 'let' | 'middel' | 'svaer') => void
}

const DifficultySelector = ({
  value,
  onChange,
  disabled = false
}: {
  value: 'let' | 'middel' | 'svaer'
  onChange: (v: 'let' | 'middel' | 'svaer') => void
  disabled?: boolean
}) => (
  <div style={{ display: 'flex', background: 'var(--color-bg-subtle)', padding: 4, borderRadius: 10, border: '1px solid var(--color-border)' }}>
    {(['let', 'middel', 'svaer'] as const).map(diff => (
      <button
        key={diff}
        onClick={() => onChange(diff)}
        disabled={disabled}
        className="hover-scale"
        style={{
          flex: 1,
          padding: '6px 12px',
          borderRadius: 8,
          border: 'none',
          background: value === diff ? 'var(--color-surface)' : 'transparent',
          color: value === diff ? 'var(--color-text)' : 'var(--color-text-muted)',
          boxShadow: value === diff ? 'var(--shadow-sm)' : 'none',
          fontWeight: 600,
          fontSize: 13,
          cursor: disabled ? 'not-allowed' : 'pointer',
          textTransform: 'capitalize',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s ease'
        }}
      >
        {diff}
      </button>
    ))}
  </div>
)

export function ExploreGrid({
  groupedTypes,
  supportedTypes,
  expandedCategories,
  searchQuery,
  onSearchChange,
  onToggleCategory,
  onGenerate,
  selectedDifficulty,
  onDifficultyChange,
}: ExploreGridProps) {
  return (
    <>
      {/* Difficulty selector */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <GlassCard padding="sm" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Sværhedsgrad:</span>
          <DifficultySelector value={selectedDifficulty} onChange={onDifficultyChange} />
        </GlassCard>
      </div>

      {/* Search */}
      <div className="testlab__search">
        <div className="testlab__search-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <input
          type="text"
          className="testlab__search-input"
          placeholder="Søg efter opgavetype..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button className="testlab__search-clear" onClick={() => onSearchChange('')}>
            ✕
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="testlab__categories">
        {(['algebra', 'geometri', 'statistik'] as const).map(category => {
          const info = CATEGORY_INFO[category]
          const types = groupedTypes[category]
          const isExpanded = expandedCategories.has(category)
          if (types.length === 0) return null

          return (
            <div key={category} className={`testlab__category ${isExpanded ? 'expanded' : ''}`}>
              <button
                className="testlab__category-header"
                onClick={() => onToggleCategory(category)}
                style={{ '--category-color': info.color, '--category-gradient': info.gradient } as React.CSSProperties}
              >
                <div className="testlab__category-icon">{info.icon}</div>
                <div className="testlab__category-info">
                  <h2 className="testlab__category-name">{info.name}</h2>
                  <span className="testlab__category-count">{types.length} opgavetyper</span>
                </div>
                <div className={`testlab__category-arrow ${isExpanded ? 'expanded' : ''}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </button>

              <div className={`testlab__category-content ${isExpanded ? 'expanded' : ''}`}>
                <div className="testlab__grid">
                  {types.map(typeInfo => {
                    const isSupported = supportedTypes.has(typeInfo.id)
                    const isLLM = requiresLLM(typeInfo.id)

                    return (
                      <button
                        key={typeInfo.id}
                        className={`testlab__card ${!isSupported ? 'disabled' : ''}`}
                        onClick={() => isSupported && onGenerate(typeInfo)}
                        disabled={!isSupported}
                        style={{ '--category-color': info.color } as React.CSSProperties}
                      >
                        <div className="testlab__card-number">{typeInfo.number}</div>
                        <div className="testlab__card-content">
                          <h3 className="testlab__card-title">{typeInfo.name}</h3>
                          <p className="testlab__card-desc">{typeInfo.description}</p>
                        </div>
                        <div className="testlab__card-badge">
                          {!isSupported ? (
                            <span className="testlab__badge testlab__badge--disabled">🚧</span>
                          ) : isLLM ? (
                            <span className="testlab__badge testlab__badge--ai">🤖 AI</span>
                          ) : (
                            <span className="testlab__badge testlab__badge--logic">⚡</span>
                          )}
                        </div>
                        <div className="testlab__card-arrow">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
