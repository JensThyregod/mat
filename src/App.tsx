import { Navigate, Route, Routes } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { useStore } from './stores/storeProvider'
import { LoginView } from './views/LoginView'
import { TasksView } from './views/TasksView'
import { TaskDetailView } from './views/TaskDetailView'
import { GeneratorTestView } from './views/GeneratorTestView'
import { LigningerView } from './views/LigningerView'
import { Layout } from './components/Layout'
import { Navbar } from './components/Navbar'
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
    return <Navigate to="/tasks" replace />
  }
  return children
}

const App = observer(() => {
  const { authStore, taskStore } = useStore()

  useEffect(() => {
    if (authStore.student) {
      taskStore.loadTasks(authStore.student.id)
    } else {
      taskStore.reset()
    }
  }, [authStore.student, taskStore])

  return (
    <Layout>
      {authStore.student ? (
        <Navbar
          studentName={authStore.student.name}
          studentId={authStore.student.id}
          onLogout={() => authStore.logout()}
        />
      ) : null}

      <Routes>
        <Route
          path="/login"
          element={
            authStore.student ? <Navigate to="/tasks" replace /> : <LoginView />
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
              <TaskDetailView />
            </RequireAuth>
          }
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
          path="/voxel-demo"
          element={<VoxelTaskDemo />}
        />
        <Route
          path="/ligninger"
          element={<LigningerView />}
        />
        <Route
          path="*"
          element={
            <Navigate
              to={authStore.student ? '/tasks' : '/login'}
              replace
            />
          }
        />
      </Routes>
    </Layout>
  )
})

export default App
