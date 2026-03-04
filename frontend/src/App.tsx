import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useStore } from './stores/storeProvider'
import { LandingView } from './views/LandingView'
import { LoginView } from './views/LoginView'
import { VerifyEmailView } from './views/VerifyEmailView'
import { DashboardView } from './views/DashboardView'
import { TasksView } from './views/TasksView'
import { GeneratorTestView } from './views/GeneratorTestView'
import { LigningerView } from './views/LigningerView'
import { SkillTreeView } from './views/SkillTreeView'
import { TerminsproveGeneratorView } from './views/TerminsproveGeneratorView'
import { Layout } from './components/Layout'
import { VoxelTaskDemo } from './components/VoxelTaskDemo'
import { ErrorBoundary } from './components/ErrorBoundary'

const RequireAuth = ({ children }: { children: React.ReactElement }) => {
  const { authStore } = useStore()
  if (!authStore.student) {
    return <Navigate to="/" replace />
  }
  return children
}

const RequireTestUser = ({ children }: { children: React.ReactElement }) => {
  const { authStore } = useStore()
  if (!authStore.student) {
    return <Navigate to="/" replace />
  }
  if (authStore.student.id !== 'test') {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

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
      <ErrorBoundary>
        <AnimatePresence mode="wait">
          <Routes location={location} key={getRouteKey(location.pathname)}>
            <Route
              path="/"
              element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingView />
              }
            />
            
            <Route
              path="/login"
              element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginView />
              }
            />
            
            <Route
              path="/verify-email"
              element={<VerifyEmailView />}
            />
            
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardView />
                </RequireAuth>
              }
            />
            
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
            
            <Route
              path="/skills"
              element={
                <RequireTestUser>
                  <SkillTreeView />
                </RequireTestUser>
              }
            />
            
            <Route
              path="/practice"
              element={
                <RequireTestUser>
                  <LigningerView />
                </RequireTestUser>
              }
            />
            <Route
              path="/ligninger"
              element={<Navigate to="/practice" replace />}
            />
            
            <Route
              path="/test-lab"
              element={
                <RequireTestUser>
                  <GeneratorTestView />
                </RequireTestUser>
              }
            />
            
            <Route
              path="/terminsprove"
              element={
                <RequireAuth>
                  <TerminsproveGeneratorView />
                </RequireAuth>
              }
            />
            
            <Route
              path="/voxel-demo"
              element={<VoxelTaskDemo />}
            />
            
            <Route
              path="*"
              element={
                <Navigate
                  to={isAuthenticated ? '/dashboard' : '/'}
                  replace
                />
              }
            />
          </Routes>
        </AnimatePresence>
      </ErrorBoundary>
    </Layout>
  )
})

export default App
