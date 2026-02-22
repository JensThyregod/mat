import { Link, useLocation } from 'react-router-dom'
import { motion, LayoutGroup } from 'framer-motion'
import classNames from 'classnames'
import './TabBar.css'

export type TabBarItem = {
  path: string
  label: string
  icon: string
  testOnly?: boolean
}

export type TabBarProps = {
  items: TabBarItem[]
  studentId?: string
}

export const TabBar = ({ items, studentId }: TabBarProps) => {
  const location = useLocation()
  const isTestUser = studentId === 'test'

  // Filter items based on test user status
  const visibleItems = items.filter(item => !item.testOnly || isTestUser)

  // Check if path is active
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <motion.nav
      className="tabbar glass-panel"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ 
        duration: 0.5, 
        ease: [0.22, 1, 0.36, 1] as const,
        delay: 0.1
      }}
    >
      <LayoutGroup>
        <div className="tabbar__items">
          {visibleItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={classNames('tabbar__item', {
                  'tabbar__item--active': active,
                })}
              >
                {active && (
                  <motion.div
                    className="tabbar__indicator"
                    layoutId="tabbar-indicator"
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 35,
                    }}
                  />
                )}
                <motion.span 
                  className="tabbar__icon"
                  animate={active ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {item.icon}
                </motion.span>
                <span className="tabbar__label">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </LayoutGroup>
    </motion.nav>
  )
}

