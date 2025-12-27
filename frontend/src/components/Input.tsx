import classNames from 'classnames'
import React from 'react'
import './Input.css'

type FieldProps = {
  label?: string
  hint?: string
  error?: string | null
  requiredMark?: boolean
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & FieldProps
type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  FieldProps

export const Input = ({
  label,
  hint,
  error,
  requiredMark,
  className,
  ...rest
}: InputProps) => (
  <label className="field">
    {label ? (
      <span className="field-label">
        {label}
        {requiredMark ? <span className="field-required">*</span> : null}
      </span>
    ) : null}
    <input
      className={classNames('field-input', className, { error: Boolean(error) })}
      {...rest}
    />
    {hint && !error ? <span className="field-hint">{hint}</span> : null}
    {error ? <span className="field-error">{error}</span> : null}
  </label>
)

export const TextArea = ({
  label,
  hint,
  error,
  requiredMark,
  className,
  ...rest
}: TextAreaProps) => (
  <label className="field">
    {label ? (
      <span className="field-label">
        {label}
        {requiredMark ? <span className="field-required">*</span> : null}
      </span>
    ) : null}
    <textarea
      className={classNames('field-input', 'field-textarea', className, {
        error: Boolean(error),
      })}
      {...rest}
    />
    {hint && !error ? <span className="field-hint">{hint}</span> : null}
    {error ? <span className="field-error">{error}</span> : null}
  </label>
)

