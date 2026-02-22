import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import classNames from 'classnames'
import './Sidebar.css'

export type NavItem = {
  path: string
  label: string
  icon: string
  badge?: string | number
  testOnly?: boolean
}

export type SidebarProps = {
  items: NavItem[]
  studentName?: string
  studentId?: string
  onLogout?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export const Sidebar = ({
  items,
  studentName,
  studentId,
  onLogout,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) => {
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
    <motion.aside
      role="navigation"
      aria-label="Hovednavigation"
      className={classNames('sidebar glass-panel', {
        'sidebar--collapsed': collapsed,
      })}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Brand */}
      <div className="sidebar__header">
        <Link to="/" className="sidebar__brand">
          <motion.div 
            className="sidebar__brand-dot"
            animate={{ 
              scale: [1, 1.1, 1],
              boxShadow: [
                '0 0 0 0 rgba(194, 114, 90, 0)',
                '0 0 12px 4px rgba(194, 114, 90, 0.3)',
                '0 0 0 0 rgba(194, 114, 90, 0)',
              ]
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity, 
              ease: 'easeInOut' 
            }}
          />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                className="sidebar__brand-text"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <span className="sidebar__brand-name">TaskLab</span>
                <span className="sidebar__brand-sub">Math edition</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        {onToggleCollapse && (
          <button 
            className="sidebar__collapse-btn btn-icon btn-ghost"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <motion.span
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              ‹
            </motion.span>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        <LayoutGroup>
          {visibleItems.map((item, index) => {
            const active = isActive(item.path)
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index, duration: 0.3 }}
              >
                <Link
                  to={item.path}
                  className={classNames('sidebar__nav-item', {
                    'sidebar__nav-item--active': active,
                  })}
                >
                  {active && (
                    <motion.div
                      className="sidebar__nav-indicator"
                      layoutId="sidebar-indicator"
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="sidebar__nav-icon">{item.icon}</span>
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span
                        className="sidebar__nav-label"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {item.badge && !collapsed && (
                    <span className="sidebar__nav-badge">{item.badge}</span>
                  )}
                </Link>
              </motion.div>
            )
          })}
        </LayoutGroup>
      </nav>

      {/* User section */}
      {studentName && (
        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__user-avatar">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  className="sidebar__user-info"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="sidebar__user-name">{studentName}</span>
                  {isTestUser && <span className="sidebar__user-badge">DEV</span>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {onLogout && !collapsed && (
            <motion.button
              className="sidebar__logout btn btn-ghost btn-sm"
              onClick={onLogout}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Log ud
            </motion.button>
          )}
        </div>
      )}
    </motion.aside>
  )
}

