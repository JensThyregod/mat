import { useCallback, useMemo, useRef } from 'react'
import './FractionInput.css'

type Props = {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  status?: 'neutral' | 'correct' | 'incorrect'
}

function parseFraction(value: string): { numerator: string; denominator: string } {
  if (!value) return { numerator: '', denominator: '' }
  const parts = value.split('/')
  if (parts.length === 2) {
    return { numerator: parts[0].trim(), denominator: parts[1].trim() }
  }
  return { numerator: value.trim(), denominator: '' }
}

export function FractionInput({
  value,
  onChange,
  onBlur,
  disabled = false,
  status = 'neutral',
}: Props) {
  const { numerator, denominator } = useMemo(() => parseFraction(value), [value])
  const denominatorRef = useRef<HTMLInputElement>(null)
  const numeratorRef = useRef<HTMLInputElement>(null)

  const handleNumeratorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      onChange(val || denominator ? `${val}/${denominator}` : '')
    },
    [denominator, onChange]
  )

  const handleDenominatorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      onChange(numerator || val ? `${numerator}/${val}` : '')
    },
    [numerator, onChange]
  )

  // Move to denominator on Enter in numerator field
  const handleNumeratorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault()
      denominatorRef.current?.focus()
    }
  }

  // Move to numerator on ArrowUp in denominator field
  const handleDenominatorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      numeratorRef.current?.focus()
    }
  }

  const statusClass = status !== 'neutral' ? `fraction-input--${status}` : ''

  const handleContainerClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName !== 'INPUT') {
      numeratorRef.current?.focus()
    }
  }

  return (
    <div className={`fraction-input ${statusClass}`} onClick={handleContainerClick}>
      {status !== 'neutral' && (
        <span className="fraction-input__icon" aria-hidden="true">
          {status === 'correct' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          )}
        </span>
      )}

      <div className="fraction-input__stack">
        <input
          ref={numeratorRef}
          type="text"
          inputMode="numeric"
          className="fraction-input__field"
          placeholder=""
          value={numerator}
          onChange={handleNumeratorChange}
          onKeyDown={handleNumeratorKeyDown}
          onBlur={onBlur}
          disabled={disabled}
          aria-label="Tæller"
          autoComplete="off"
        />
        <div className="fraction-input__line" />
        <input
          ref={denominatorRef}
          type="text"
          inputMode="numeric"
          className="fraction-input__field"
          placeholder=""
          value={denominator}
          onChange={handleDenominatorChange}
          onKeyDown={handleDenominatorKeyDown}
          onBlur={onBlur}
          disabled={disabled}
          aria-label="Nævner"
          autoComplete="off"
        />
      </div>
    </div>
  )
}
