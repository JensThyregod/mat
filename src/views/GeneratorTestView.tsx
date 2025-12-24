/**
 * Generator Test View
 * 
 * A beautiful testing interface for all task generators.
 * Only visible to test users.
 */

import { useState, useCallback, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import { Button } from '../components/Button'
import { Spinner } from '../components/Spinner'
import { GeneratedTaskPreview } from '../components/GeneratedTaskPreview'
import { 
  initGenerators, 
  getSupportedTypes, 
  requiresLLM,
  generateTask,
  type GeneratedTask 
} from '../generators'

// ════════════════════════════════════════════════════════════════
// TASK TYPE METADATA
// ════════════════════════════════════════════════════════════════

interface TaskTypeInfo {
  id: string
  name: string
  number: number
  description: string
  category: 'algebra' | 'geometri' | 'statistik'
}

const TASK_TYPES: TaskTypeInfo[] = [
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

const CATEGORY_INFO = {
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
}

// Initialize on first render
let initialized = false

export const GeneratorTestView = observer(() => {
  const [selectedType, setSelectedType] = useState<TaskTypeInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedTask, setGeneratedTask] = useState<GeneratedTask | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['algebra', 'geometri', 'statistik']))
  const [showModal, setShowModal] = useState(false)
  
  // Initialize generators on first render
  if (!initialized) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY || ''
    initGenerators(apiKey)
    initialized = true
  }
  
  const supportedTypes = new Set(getSupportedTypes())
  
  // Filter task types based on search
  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) return TASK_TYPES
    const q = searchQuery.toLowerCase()
    return TASK_TYPES.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.description.toLowerCase().includes(q) ||
      t.id.includes(q) ||
      String(t.number).includes(q)
    )
  }, [searchQuery])
  
  // Group filtered types by category
  const groupedTypes = useMemo(() => ({
    algebra: filteredTypes.filter(t => t.category === 'algebra'),
    geometri: filteredTypes.filter(t => t.category === 'geometri'),
    statistik: filteredTypes.filter(t => t.category === 'statistik'),
  }), [filteredTypes])
  
  const handleGenerate = useCallback(async (typeInfo: TaskTypeInfo) => {
    setSelectedType(typeInfo)
    setLoading(true)
    setError(null)
    setShowModal(true)
    
    try {
      const task = await generateTask(typeInfo.id)
      setGeneratedTask(task)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setGeneratedTask(null)
    } finally {
      setLoading(false)
    }
  }, [])
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }
  
  const closeModal = () => {
    setShowModal(false)
    setGeneratedTask(null)
    setError(null)
    setSelectedType(null)
  }

  return (
    <section className="testlab">
      {/* Hero Header */}
      <header className="testlab__hero">
        <div className="testlab__hero-content">
          <div className="testlab__hero-badge">
            <span className="testlab__hero-badge-icon">🧪</span>
            <span>Developer Preview</span>
          </div>
          <h1 className="testlab__hero-title">Generator Test Lab</h1>
          <p className="testlab__hero-subtitle">
            Test og udforsk alle 22 opgavegeneratorer. Klik på en type for at generere unikke opgaver.
          </p>
        </div>
        
        {/* Stats */}
        <div className="testlab__stats">
          <div className="testlab__stat">
            <div className="testlab__stat-value">{TASK_TYPES.length}</div>
            <div className="testlab__stat-label">Opgavetyper</div>
          </div>
          <div className="testlab__stat testlab__stat--accent">
            <div className="testlab__stat-value">{TASK_TYPES.filter(t => !requiresLLM(t.id)).length}</div>
            <div className="testlab__stat-label">Logic-baseret</div>
          </div>
          <div className="testlab__stat">
            <div className="testlab__stat-value">{TASK_TYPES.filter(t => requiresLLM(t.id)).length}</div>
            <div className="testlab__stat-label">AI-powered</div>
          </div>
        </div>
      </header>
      
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
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="testlab__search-clear" onClick={() => setSearchQuery('')}>
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
                onClick={() => toggleCategory(category)}
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
                        onClick={() => isSupported && handleGenerate(typeInfo)}
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
      
      {/* Legend */}
      <div className="testlab__legend">
        <div className="testlab__legend-item">
          <span className="testlab__badge testlab__badge--logic">⚡</span>
          <span>Instant (logic-baseret)</span>
        </div>
        <div className="testlab__legend-item">
          <span className="testlab__badge testlab__badge--ai">🤖 AI</span>
          <span>OpenAI-powered</span>
        </div>
      </div>
      
      {/* Modal */}
      {showModal && (
        <div className="testlab__modal-overlay" onClick={closeModal}>
          <div className="testlab__modal" onClick={e => e.stopPropagation()}>
            <button className="testlab__modal-close" onClick={closeModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            
            {loading && (
              <div className="testlab__modal-loading">
                <Spinner />
                <p>Genererer opgave...</p>
              </div>
            )}
            
            {error && (
              <div className="testlab__modal-error">
                <div className="testlab__modal-error-icon">❌</div>
                <h3>Der opstod en fejl</h3>
                <p>{error}</p>
                <Button variant="primary" onClick={() => selectedType && handleGenerate(selectedType)}>
                  Prøv igen
                </Button>
              </div>
            )}
            
            {!loading && !error && generatedTask && selectedType && (
              <>
                <div className="testlab__modal-header">
                  <div 
                    className="testlab__modal-category-badge"
                    style={{ '--category-color': CATEGORY_INFO[selectedType.category].color } as React.CSSProperties}
                  >
                    <span>{CATEGORY_INFO[selectedType.category].icon}</span>
                    <span>{CATEGORY_INFO[selectedType.category].name}</span>
                  </div>
                  <div className="testlab__modal-title-row">
                    <span className="testlab__modal-number">#{selectedType.number}</span>
                    <h2 className="testlab__modal-title">{selectedType.name}</h2>
                  </div>
                  <Button 
                    variant="primary" 
                    onClick={() => handleGenerate(selectedType)}
                  >
                    🔄 Ny opgave
                  </Button>
                </div>
                
                <div className="testlab__modal-content">
                  <GeneratedTaskPreview task={generatedTask} showAnswers={true} />
                </div>
                
                {generatedTask.variables && (
                  <details className="testlab__modal-debug">
                    <summary>🔧 Debug: Genererings-variabler</summary>
                    <pre>{JSON.stringify(generatedTask.variables, null, 2)}</pre>
                  </details>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
})
