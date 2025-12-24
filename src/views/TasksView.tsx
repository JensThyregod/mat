import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from '../stores/storeProvider'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { TaskCard } from '../components/TaskCard'

export const TasksView = observer(() => {
  const { taskStore, authStore } = useStore()

  useEffect(() => {
    if (authStore.student) {
      taskStore.loadTasks(authStore.student.id)
    }
  }, [authStore.student, taskStore])

  if (taskStore.loading) {
    return (
      <div className="center">
        <Spinner />
        <p className="text-muted">Henter opgaver...</p>
      </div>
    )
  }

  if (taskStore.error) {
    return (
      <EmptyState
        title="Der skete en fejl"
        description={taskStore.error}
      />
    )
  }

  if (!taskStore.tasks.length) {
    return (
      <EmptyState
        title="Ingen opgaver endnu"
        description="Din lærer har ikke tildelt opgaver endnu."
      />
    )
  }

  return (
    <section className="tasks">
      <div className="tasks__header">
        <div>
          <p className="eyebrow">Dine opgaver</p>
          <h1>Matematik workspace</h1>
          <p className="text-muted">
            Opgaverne er klar med LaTeX-visning og autosave på dine svar.
          </p>
        </div>
      </div>

      <div className="grid columns-2">
        {taskStore.tasks.map((task) => {
          const parts = task.parts ?? [task.latex]
          const answers = taskStore.answers[task.id] ?? []
          const answeredCount = answers.filter(Boolean).length
          const allAnswered = answeredCount === parts.length && parts.length > 0
          const updatedAt = answers
            .filter(Boolean)
            .map((a) => a!.updatedAt)
            .sort()
            .at(-1)
          return (
            <TaskCard
              key={task.id}
              task={task}
              answered={allAnswered}
              updatedAt={updatedAt}
              progress={{ answered: answeredCount, total: parts.length }}
            />
          )
        })}
      </div>
    </section>
  )
})

