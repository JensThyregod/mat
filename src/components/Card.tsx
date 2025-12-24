import classNames from 'classnames'

type CardProps = {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export const Card = ({ children, className, onClick }: CardProps) => {
  return (
    <div className={classNames('card glass-panel', className)} onClick={onClick}>
      {children}
    </div>
  )
}

