import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { useAuth } from 'react-oidc-context'
import { AnimatePresence } from 'framer-motion'
import { useStore } from './stores/storeProvider'
import { LandingView } from './views/LandingView'
import { DashboardView } from './views/DashboardView'
import { TasksView } from './views/TasksView'
import { GeneratorTestView } from './views/GeneratorTestView'
import { LigningerView } from './views/LigningerView'
import { SkillTreeView } from './views/SkillTreeView'
import { TerminsproveGeneratorView } from './views/TerminsproveGeneratorView'
import { SettingsView } from './views/SettingsView'
import { Layout } from './components/Layout'
import { VoxelTaskDemo } from './components/VoxelTaskDemo'
import { ErrorBoundary } from './components/ErrorBoundary'
import { setTrainingApiToken } from './practice/trainingApi'
import { setCurrentAccessToken } from './auth/tokenAccessor'

const RequireAuth = ({ children }: { children: React.ReactElement }) => {
  const auth = useAuth()
  const { authStore } = useStore()

  if (auth.isLoading) return null

  if (!auth.isAuthenticated || !authStore.student) {
    return <Navigate to="/" replace />
  }
  return children
}

const RequireTestUser = ({ children }: { children: React.ReactElement }) => {
  const auth = useAuth()
  const { authStore } = useStore()

  if (auth.isLoading) return null

  if (!auth.isAuthenticated || !authStore.student) {
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

const OidcSync = observer(({ children }: { children: React.ReactNode }) => {
  const auth = useAuth()
  const { authStore, api, taskStore } = useStore()

  useEffect(() => {
    authStore.setOidcUser(auth.user)

    if (auth.user && !auth.user.expired) {
      const token = auth.user.access_token
      api.setAccessToken(token)
      setTrainingApiToken(token)
      setCurrentAccessToken(token)
    } else {
      api.setAccessToken(null)
      setTrainingApiToken(null)
      setCurrentAccessToken(null)
    }
  }, [auth.user, authStore, api])

  useEffect(() => {
    if (authStore.student) {
      taskStore.loadTasks()
    } else {
      taskStore.reset()
    }
  }, [authStore.student, taskStore])

  return <>{children}</>
})

const App = observer(() => {
  const auth = useAuth()
  const { authStore } = useStore()
  const location = useLocation()

  const isAuthenticated = auth.isAuthenticated && !!authStore.student

  const handleLogout = () => {
    authStore.logout()
    auth.removeUser()
    auth.signoutRedirect()
  }

  if (auth.isLoading) {
    return null
  }

  return (
    <OidcSync>
      <Layout
        showNavigation={isAuthenticated}
        studentName={authStore.student?.name}
        studentId={authStore.student?.id}
        onLogout={handleLogout}
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
                  isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingView />
                }
              />

              <Route
                path="/callback"
                element={
                  isAuthenticated ? <Navigate to="/dashboard" replace /> : null
                }
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
                path="/training"
                element={<Navigate to="/tasks?tab=training" replace />}
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
                path="/settings"
                element={
                  <RequireAuth>
                    <SettingsView />
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
    </OidcSync>
  )
})

export default App
