import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../stores/storeProvider'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { PageTransition } from '../components/animation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './LoginView.css'

type AuthMode = 'login' | 'signup'

const formVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

const logoVariants = {
  hidden: { opacity: 0, scale: 0.8, rotate: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

const contentVariants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
}

const MODE_CONFIG = {
  login: {
    title: 'Log ind',
    subtitle: 'Indtast dit brugernavn og kode for at fortsætte.',
    button: 'Log ind',
    loadingButton: 'Logger ind...',
    switchText: 'Har du ikke en konto?',
    switchAction: 'Opret konto',
  },
  signup: {
    title: 'Opret konto',
    subtitle: 'Vælg et brugernavn, kode og email for at komme i gang.',
    button: 'Opret konto',
    loadingButton: 'Opretter...',
    switchText: 'Har du allerede en konto?',
    switchAction: 'Log ind',
  },
} as const

export const LoginView = observer(() => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const config = MODE_CONFIG[mode]

  useDocumentTitle(config.title)
  const { authStore } = useStore()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')

  const switchMode = (newMode: AuthMode) => {
    authStore.error = null
    authStore.successMessage = null
    authStore.emailNotVerified = false
    setMode(newMode)
    setSearchParams(newMode === 'signup' ? { mode: 'signup' } : {})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === 'signup') {
      const ok = await authStore.signup(name, code, email)
      if (ok) {
        // Stay on page — show success message telling them to check email
      }
    } else {
      const ok = await authStore.login(name, code)
      if (ok) {
        navigate('/dashboard')
      }
    }
  }

  const handleResend = async () => {
    await authStore.resendVerification(name, code)
  }

  return (
    <PageTransition className="auth">
      <motion.div
        className="glass-panel auth__card"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
      >
        <motion.div
          className="auth__logo"
          variants={logoVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="auth__logo-dot" />
          <span>Matematik Tutor</span>
        </motion.div>

        {/* Mode toggle */}
        <motion.div
          className="auth__tabs"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <button
            type="button"
            className={`auth__tab ${mode === 'login' ? 'auth__tab--active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Log ind
          </button>
          <button
            type="button"
            className={`auth__tab ${mode === 'signup' ? 'auth__tab--active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Opret konto
          </button>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            variants={contentVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <div className="auth__header">
              <h1>{config.title}</h1>
              <p className="text-muted">{config.subtitle}</p>
            </div>

            {authStore.successMessage ? (
              <motion.div
                className="auth__success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="auth__success-icon">✓</div>
                <p>{authStore.successMessage}</p>
                {mode === 'signup' && (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => switchMode('login')}
                    style={{ marginTop: 16 }}
                  >
                    Gå til log ind
                  </Button>
                )}
              </motion.div>
            ) : (
              <>
                <motion.form
                  className="auth__form"
                  onSubmit={handleSubmit}
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.div variants={itemVariants}>
                    <Input
                      label="Brugernavn"
                      placeholder=""
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      requiredMark
                    />
                  </motion.div>
                  {mode === 'signup' && (
                    <motion.div variants={itemVariants}>
                      <Input
                        label="Email"
                        type="email"
                        placeholder=""
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        requiredMark
                      />
                    </motion.div>
                  )}
                  <motion.div variants={itemVariants}>
                    <Input
                      label="Kode"
                      placeholder=""
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      requiredMark
                    />
                  </motion.div>
                  {authStore.error && (
                    <motion.div
                      className="form-error"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      {authStore.error}
                      {authStore.emailNotVerified && (
                        <button
                          type="button"
                          className="auth__resend-link"
                          onClick={handleResend}
                          disabled={authStore.loading}
                        >
                          Send bekræftelses-email igen
                        </button>
                      )}
                    </motion.div>
                  )}
                  <motion.div variants={itemVariants}>
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      disabled={authStore.loading}
                    >
                      {authStore.loading ? config.loadingButton : config.button}
                    </Button>
                  </motion.div>
                </motion.form>

                <p className="auth__switch">
                  {config.switchText}{' '}
                  <button
                    type="button"
                    className="auth__switch-link"
                    onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                  >
                    {config.switchAction}
                  </button>
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </PageTransition>
  )
})
