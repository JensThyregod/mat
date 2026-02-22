import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { motion } from 'framer-motion'
import { useStore } from '../stores/storeProvider'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { PageTransition } from '../components/animation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './LoginView.css'

// Staggered form animation
const formVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
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

export const LoginView = observer(() => {
  useDocumentTitle('Log ind')
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
      navigate('/')
    }
  }

  return (
    <PageTransition className="auth">
      <motion.div 
        className="glass-panel auth__card"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
      >
        {/* Decorative logo/brand */}
        <motion.div 
          className="auth__logo"
          variants={logoVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="auth__logo-dot" />
          <span>TaskLab</span>
        </motion.div>

        <motion.div 
          className="auth__header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <h1>Velkommen tilbage</h1>
          <p className="text-muted">
            Log ind med dit navn og klassekode for at hente dine opgaver.
          </p>
        </motion.div>

        <motion.form 
          className="auth__form" 
          onSubmit={handleSubmit}
          variants={formVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <Input
              label="Navn"
              placeholder="Fx Mads eller Aisha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              requiredMark
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <Input
              label="Klassekode"
              placeholder="Fx 2y-2025"
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
            </motion.div>
          )}
          <motion.div variants={itemVariants}>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={fillTestUser}
            >
              Brug test bruger
            </Button>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={authStore.loading}
            >
              {authStore.loading ? 'Logger ind...' : 'Log ind'}
            </Button>
          </motion.div>
        </motion.form>
      </motion.div>
    </PageTransition>
  )
})
