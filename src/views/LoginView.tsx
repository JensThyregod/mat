import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { useStore } from '../stores/storeProvider'
import { Button } from '../components/Button'
import { Input } from '../components/Input'

export const LoginView = observer(() => {
  const { authStore } = useStore()
  const navigate = useNavigate()
  const [name, setName] = useState(authStore.student?.name ?? '')
  const [code, setCode] = useState(authStore.student?.code ?? '')

  const fillTestUser = () => {
    setName('test')
    setCode('test')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await authStore.login(name, code)
    if (ok) {
      navigate('/tasks')
    }
  }

  return (
    <div className="auth">
      <div className="glass-panel auth__card">
        <div className="auth__header">
          <h1>Velkommen tilbage</h1>
          <p className="text-muted">
            Log ind med dit navn og klassekode for at hente dine opgaver.
          </p>
        </div>
        <form className="auth__form" onSubmit={handleSubmit}>
          <Input
            label="Navn"
            placeholder="Fx Mads eller Aisha"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            requiredMark
          />
          <Input
            label="Klassekode"
            placeholder="Fx 2y-2025"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            requiredMark
          />
          {authStore.error ? (
            <div className="form-error">{authStore.error}</div>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={fillTestUser}
          >
            Brug test bruger (navn: test / kode: test)
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={authStore.loading}
          >
            {authStore.loading ? 'Logger ind...' : 'Log ind'}
          </Button>
        </form>
      </div>
    </div>
  )
})

