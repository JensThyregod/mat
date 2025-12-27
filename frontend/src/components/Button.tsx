import classNames from 'classnames'
import React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  fullWidth?: boolean
}

export const Button = ({
  variant = 'primary',
  fullWidth,
  className,
  children,
  ...rest
}: ButtonProps) => {
  return (
    <button
      className={classNames(
        'btn',
        `btn-${variant}`,
        { 'btn-block': fullWidth },
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

