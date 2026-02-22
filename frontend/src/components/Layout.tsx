import { useEffect, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Sidebar, type NavItem } from './Sidebar'
import { TabBar, type TabBarItem } from './TabBar'
import { MathParticles } from './MathParticles'

type LayoutProps = {
  children: React.ReactNode
  showNavigation?: boolean
  studentName?: string
  studentId?: string
  onLogout?: () => void
}

// Navigation items - shared between Sidebar and TabBar
const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Hjem', icon: '🏠' },
  { path: '/tasks', label: 'Opgaver', icon: '📚' },
  { path: '/skills', label: 'Færdigheder', icon: '⭐' },
  { path: '/practice', label: 'Øvelse', icon: '✏️' },
  { path: '/terminsprove', label: 'Terminsprøve', icon: '🤖', testOnly: true },
  { path: '/test-lab', label: 'Test Lab', icon: '🧪', testOnly: true },
]

// Convert NavItem to TabBarItem (same structure, just for type safety)
const TAB_ITEMS: TabBarItem[] = NAV_ITEMS.map(item => ({
  path: item.path,
  label: item.label,
  icon: item.icon,
  testOnly: item.testOnly,
}))

// Page color themes for ambient background
const PAGE_THEMES: Record<string, { primary: string; secondary: string; accent: string }> = {
  '/': { primary: '#C2725A', secondary: '#6366F1', accent: '#10B981' },
  '/login': { primary: '#C2725A', secondary: '#D4A574', accent: '#C2725A' },
  '/tasks': { primary: '#5856D6', secondary: '#34C759', accent: '#C2725A' },
  '/skills': { primary: '#8B5CF6', secondary: '#EC4899', accent: '#5856D6' },
  '/practice': { primary: '#00C8C8', secondary: '#10FFAA', accent: '#00D4FF' },
  '/ligninger': { primary: '#00C8C8', secondary: '#10FFAA', accent: '#00D4FF' },
  '/terminsprove': { primary: '#8B5CF6', secondary: '#EC4899', accent: '#10B981' },
  '/test-lab': { primary: '#8B5CF6', secondary: '#EC4899', accent: '#FF9500' },
}

function getBasePath(pathname: string): string {
  if (pathname.startsWith('/tasks')) return '/tasks'
  if (pathname.startsWith('/practice')) return '/practice'
  if (pathname === '/ligninger') return '/practice'
  return pathname
}

export const Layout = ({ 
  children, 
  showNavigation = false,
  studentName,
  studentId,
  onLogout,
}: LayoutProps) => {
  const location = useLocation()
  const basePath = getBasePath(location.pathname)
  const theme = PAGE_THEMES[basePath] ?? PAGE_THEMES['/']
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Mouse position for subtle parallax on ambient orbs
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  // Smooth spring physics for mouse tracking
  const springConfig = { damping: 50, stiffness: 100 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)
  
  // Transform mouse position to subtle movement
  const orb1X = useTransform(smoothX, [0, 1], [-20, 20])
  const orb1Y = useTransform(smoothY, [0, 1], [-20, 20])
  const orb2X = useTransform(smoothX, [0, 1], [15, -15])
  const orb2Y = useTransform(smoothY, [0, 1], [10, -10])
  const orb3X = useTransform(smoothX, [0, 1], [-10, 10])
  const orb3Y = useTransform(smoothY, [0, 1], [15, -15])

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth
      const y = e.clientY / window.innerHeight
      mouseX.set(x)
      mouseY.set(y)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed(prev => !prev)
  }, [])

  return (
    <div className={`app-shell ${showNavigation ? 'app-shell--with-sidebar' : ''}`}>
      <a href="#main-content" className="skip-to-content">
        Gå til indhold
      </a>

      <MathParticles count={25} />
      
      <div className="ambient-layer" aria-hidden="true">
        {/* Gradient orbs that follow mouse subtly and change color with page */}
        <motion.div
          className="ambient-orb ambient-orb--1"
          style={{
            x: orb1X,
            y: orb1Y,
            background: `radial-gradient(circle, ${theme.primary}15 0%, transparent 70%)`,
          }}
          animate={{
            background: `radial-gradient(circle, ${theme.primary}15 0%, transparent 70%)`,
          }}
          transition={{ duration: 0.8 }}
        />
        <motion.div
          className="ambient-orb ambient-orb--2"
          style={{
            x: orb2X,
            y: orb2Y,
            background: `radial-gradient(circle, ${theme.secondary}12 0%, transparent 70%)`,
          }}
          animate={{
            background: `radial-gradient(circle, ${theme.secondary}12 0%, transparent 70%)`,
          }}
          transition={{ duration: 0.8 }}
        />
        <motion.div
          className="ambient-orb ambient-orb--3"
          style={{
            x: orb3X,
            y: orb3Y,
            background: `radial-gradient(circle, ${theme.accent}10 0%, transparent 70%)`,
          }}
          animate={{
            background: `radial-gradient(circle, ${theme.accent}10 0%, transparent 70%)`,
          }}
          transition={{ duration: 0.8 }}
        />
        
        {/* Subtle grid pattern */}
        <div className="ambient-grid" />
        
        {/* Noise texture overlay */}
        <div className="ambient-noise" />
      </div>
      
      {showNavigation && (
        <Sidebar
          items={NAV_ITEMS}
          studentName={studentName}
          studentId={studentId}
          onLogout={onLogout}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      )}
      
      <main id="main-content" className="main-content">
        <div className="page">{children}</div>
      </main>
      
      {showNavigation && (
        <TabBar 
          items={TAB_ITEMS}
          studentId={studentId}
        />
      )}
    </div>
  )
}
