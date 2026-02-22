import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { GeneratedTaskPreview } from '../../components/GeneratedTaskPreview'
import { CATEGORY_INFO, type TaskTypeInfo } from './constants'
import type { GeneratedTask } from '../../generators'

interface TaskModalProps {
  loading: boolean
  error: string | null
  generatedTask: GeneratedTask | null
  selectedType: TaskTypeInfo | null
  onClose: () => void
  onRetry: () => void
}

export function TaskModal({
  loading,
  error,
  generatedTask,
  selectedType,
  onClose,
  onRetry,
}: TaskModalProps) {
  return (
    <div className="testlab__modal-overlay" onClick={onClose}>
      <div className="testlab__modal" onClick={e => e.stopPropagation()}>
        <button className="testlab__modal-close" onClick={onClose}>
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
            <Button variant="primary" onClick={onRetry}>
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
              <Button variant="primary" onClick={onRetry}>
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
  )
}
