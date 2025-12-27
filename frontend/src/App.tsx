import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useStore } from './stores/storeProvider'
import { LoginView } from './views/LoginView'
import { DashboardView } from './views/DashboardView'
import { TasksView } from './views/TasksView'
import { GeneratorTestView } from './views/GeneratorTestView'
import { LigningerView } from './views/LigningerView'
import { SkillTreeView } from './views/SkillTreeView'
import { Layout } from './components/Layout'
import { VoxelTaskDemo } from './components/VoxelTaskDemo'

const RequireAuth = ({ children }: { children: React.ReactElement }) => {
  const { authStore } = useStore()
  if (!authStore.student) {
    return <Navigate to="/login" replace />
  }
  return children
}

const RequireTestUser = ({ children }: { children: React.ReactElement }) => {
  const { authStore } = useStore()
  if (!authStore.student) {
    return <Navigate to="/login" replace />
  }
  if (authStore.student.id !== 'test') {
    return <Navigate to="/" replace />
  }
  return children
}

// Get route key for AnimatePresence to avoid unnecessary transitions
function getRouteKey(pathname: string): string {
  if (pathname.startsWith('/tasks')) return '/tasks'
  return pathname
}

const App = observer(() => {
  const { authStore, taskStore } = useStore()
  const location = useLocation()

  useEffect(() => {
    if (authStore.student) {
      taskStore.loadTasks(authStore.student.id)
    } else {
      taskStore.reset()
    }
  }, [authStore.student, taskStore])

  const isAuthenticated = !!authStore.student

  return (
    <Layout
      showNavigation={isAuthenticated}
      studentName={authStore.student?.name}
      studentId={authStore.student?.id}
      onLogout={() => authStore.logout()}
    >
      <AnimatePresence mode="wait">
        <Routes location={location} key={getRouteKey(location.pathname)}>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/" replace /> : <LoginView />
            }
          />
          
          {/* Dashboard - new home */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <DashboardView />
              </RequireAuth>
            }
          />
          
          {/* Tasks */}
          <Route
            path="/tasks"
            element={
              <RequireAuth>
                <TasksView />
              </RequireAuth>
            }
          />
          <Route
            path="/tasks/:taskId"
            element={
              <RequireAuth>
                <TasksView />
              </RequireAuth>
            }
          />
          
          {/* Skills */}
          <Route
            path="/skills"
            element={
              <RequireAuth>
                <SkillTreeView />
              </RequireAuth>
            }
          />
          
          {/* Practice (formerly Ligninger) */}
          <Route
            path="/practice"
            element={
              <RequireAuth>
                <LigningerView />
              </RequireAuth>
            }
          />
          {/* Keep old route for backwards compatibility */}
          <Route
            path="/ligninger"
            element={<Navigate to="/practice" replace />}
          />
          
          {/* Test Lab - dev only */}
          <Route
            path="/test-lab"
            element={
              <RequireTestUser>
                <GeneratorTestView />
              </RequireTestUser>
            }
          />
          
          {/* Voxel demo - public */}
          <Route
            path="/voxel-demo"
            element={<VoxelTaskDemo />}
          />
          
          {/* Catch-all */}
          <Route
            path="*"
            element={
              <Navigate
                to={isAuthenticated ? '/' : '/login'}
                replace
              />
            }
          />
        </Routes>
      </AnimatePresence>
    </Layout>
  )
})

export default App
