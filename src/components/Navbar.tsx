import { Link, useLocation } from 'react-router-dom'
import { motion, LayoutGroup } from 'framer-motion'
import { Button } from './Button'

type Props = {
  studentName: string
  studentId: string
  onLogout: () => void
}

type NavTab = {
  path: string
  label: string
  icon: string
  variant?: 'default' | 'ligninger' | 'skills' | 'test'
  testOnly?: boolean
}

export const Navbar = ({ studentName, studentId, onLogout }: Props) => {
  const location = useLocation()
  const isTestUser = studentId === 'test'

  const tabs: NavTab[] = [
    { path: '/tasks', label: 'Opgaver', icon: '📚', variant: 'default' },
    { path: '/ligninger', label: 'Ligninger', icon: '✨', variant: 'ligninger' },
    { path: '/skills', label: 'Skills', icon: '🎮', variant: 'skills' },
    { path: '/test-lab', label: 'Test Lab', icon: '🧪', variant: 'test', testOnly: true },
  ]

  const visibleTabs = tabs.filter(tab => !tab.testOnly || isTestUser)
  
  // Check if current path matches tab (including sub-paths)
  const isActiveTab = (tabPath: string) => {
    if (tabPath === '/tasks') {
      return location.pathname === '/tasks' || location.pathname.startsWith('/tasks/')
    }
    return location.pathname === tabPath
  }

  return (
    <motion.header 
      className="navbar glass-panel"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="navbar-brand">
        <Link to="/tasks" className="brand-mark">
          <motion.span 
            className="brand-dot"
            animate={{ 
              scale: [1, 1.1, 1],
              boxShadow: [
                '0 0 0 0 rgba(194, 114, 90, 0)',
                '0 0 12px 4px rgba(194, 114, 90, 0.4)',
                '0 0 0 0 rgba(194, 114, 90, 0)',
              ]
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity, 
              ease: 'easeInOut' 
            }}
          />
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="brand-name">TaskLab</div>
            <div className="brand-sub">Math edition</div>
          </motion.div>
        </Link>
        
        {/* Navigation tabs with floating indicator */}
        <LayoutGroup>
          <nav className="navbar-tabs">
            {visibleTabs.map((tab, index) => {
              const isActive = isActiveTab(tab.path)
              return (
                <motion.div
                  key={tab.path}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: 0.1 + index * 0.05, 
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                >
                  <Link
                    className={`nav-tab nav-tab--${tab.variant} ${isActive ? 'active' : ''}`}
                    to={tab.path}
                  >
                    {/* Floating glass indicator */}
                    {isActive && (
                      <motion.span
                        className="nav-tab-indicator"
                        layoutId="nav-indicator"
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                    <span className="nav-tab-icon">{tab.icon}</span>
                    <span className="nav-tab-label">{tab.label}</span>
                  </Link>
                </motion.div>
              )
            })}
          </nav>
        </LayoutGroup>
      </div>
      
      <motion.div 
        className="navbar-actions"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <motion.div 
          className="pill user-pill"
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div className="user-avatar">
            {studentName.charAt(0).toUpperCase()}
          </div>
          <span className="user-name">{studentName}</span>
          {isTestUser && <span className="pill-badge">DEV</span>}
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button variant="ghost" onClick={onLogout}>
            Log ud
          </Button>
        </motion.div>
      </motion.div>
    </motion.header>
  )
}
