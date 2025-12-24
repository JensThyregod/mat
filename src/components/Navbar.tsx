import { Link, useLocation } from 'react-router-dom'
import { Button } from './Button'

type Props = {
  studentName: string
  studentId: string
  onLogout: () => void
}

export const Navbar = ({ studentName, studentId, onLogout }: Props) => {
  const location = useLocation()
  const isTestUser = studentId === 'test'
  const isOnTasks = location.pathname === '/tasks'
  const isOnTestLab = location.pathname === '/test-lab'
  const isOnLigninger = location.pathname === '/ligninger'

  return (
    <header className="navbar glass-panel">
      <div className="navbar-brand">
        <Link to="/tasks" className="brand-mark">
          <span className="brand-dot" />
          <div>
            <div className="brand-name">TaskLab</div>
            <div className="brand-sub">Math edition</div>
          </div>
        </Link>
        
        {/* Navigation tabs */}
        <nav className="navbar-tabs">
          <Link 
            className={`nav-tab ${isOnTasks ? 'active' : ''}`} 
            to="/tasks"
          >
            Opgaver
          </Link>
          <Link 
            className={`nav-tab nav-tab--ligninger ${isOnLigninger ? 'active' : ''}`} 
            to="/ligninger"
          >
            ✨ Ligninger
          </Link>
          {isTestUser && (
            <Link 
              className={`nav-tab nav-tab--test ${isOnTestLab ? 'active' : ''}`} 
              to="/test-lab"
            >
              🧪 Test Lab
            </Link>
          )}
        </nav>
      </div>
      <div className="navbar-actions">
        <div className="pill">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          {studentName}
          {isTestUser && <span className="pill-badge">TEST</span>}
        </div>
        <Button variant="ghost" onClick={onLogout}>
          Log ud
        </Button>
      </div>
    </header>
  )
}

