type Props = {
  title: string
  description?: string
  action?: React.ReactNode
}

export const EmptyState = ({ title, description, action }: Props) => (
  <div className="empty glass-panel">
    <h3>{title}</h3>
    {description ? <p className="text-muted">{description}</p> : null}
    {action}
  </div>
)

