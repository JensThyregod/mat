import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary-fallback">
          <h2>Noget gik galt</h2>
          <p className="text-muted">
            {this.state.error?.message ?? 'En uventet fejl opstod.'}
          </p>
          <button className="btn btn--primary" onClick={this.handleReset}>
            Prøv igen
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

interface MathErrorBoundaryProps {
  children: ReactNode
}

interface MathErrorState {
  hasError: boolean
}

export class MathErrorBoundary extends Component<MathErrorBoundaryProps, MathErrorState> {
  state: MathErrorState = { hasError: false }

  static getDerivedStateFromError(): MathErrorState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MathErrorBoundary] Rendering error in math pipeline:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <span className="text-muted" style={{ fontStyle: 'italic' }}>
          Kunne ikke vise matematisk udtryk
        </span>
      )
    }

    return this.props.children
  }
}
