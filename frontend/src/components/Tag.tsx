import classNames from 'classnames'

type Props = {
  label: string
  tone?: 'info' | 'success' | 'warning'
}

export const Tag = ({ label, tone = 'info' }: Props) => {
  return <span className={classNames('tag', `tag-${tone}`)}>{label}</span>
}

