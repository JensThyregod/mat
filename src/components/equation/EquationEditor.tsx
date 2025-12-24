import { useState, useCallback } from 'react'
import { EquationSide } from './EquationSide'
import './EquationEditor.css'

export type ExpressionPart = {
  numerator: string
  denominator?: string
}

type Props = {
  leftSide: ExpressionPart
  rightSide: ExpressionPart
  onOperation: (operation: string, isDivision?: boolean) => void
}

type ActiveState = {
  side: 'left' | 'right'
  zone: 'inline' | 'below'
} | null

export const EquationEditor = ({ leftSide, rightSide, onOperation }: Props) => {
  const [active, setActive] = useState<ActiveState>(null)

  const handleSideHover = useCallback((side: 'left' | 'right', zone: 'inline' | 'below' | null) => {
    setActive(zone ? { side, zone } : null)
  }, [])

  const handleOperationSubmit = useCallback((operation: string, isDivision?: boolean) => {
    if (operation.trim()) {
      onOperation(operation, isDivision)
      setActive(null)
    }
  }, [onOperation])

  return (
    <div className="eq-editor">
      <div className="eq-editor__equation">
        <EquationSide
          side="left"
          expression={leftSide}
          activeZone={active?.side === 'left' ? active.zone : null}
          onHover={(zone) => handleSideHover('left', zone)}
          onSubmit={handleOperationSubmit}
        />

        <div className="eq-editor__equals">
          <span className="eq-editor__equals-symbol">=</span>
        </div>

        <EquationSide
          side="right"
          expression={rightSide}
          activeZone={active?.side === 'right' ? active.zone : null}
          onHover={(zone) => handleSideHover('right', zone)}
          onSubmit={handleOperationSubmit}
        />
      </div>

      <p className="eq-editor__hint">
        Hover on a side for operations • Hover <strong>below</strong> for division
      </p>
    </div>
  )
}
