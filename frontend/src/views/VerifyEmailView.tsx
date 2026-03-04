import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { motion } from 'framer-motion'
import { useStore } from '../stores/storeProvider'
import { Button } from '../components/Button'
import { PageTransition } from '../components/animation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './VerifyEmailView.css'

export const VerifyEmailView = observer(() => {
  useDocumentTitle('Bekræft email')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { authStore } = useStore()
  const [verified, setVerified] = useState(false)
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) return
    authStore.verifyEmail(token).then((ok) => {
      if (ok) setVerified(true)
    })
  }, [token, authStore])

  return (
    <PageTransition className="verify-email">
      <motion.div
        className="glass-panel verify-email__card"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
      >
        {authStore.loading ? (
          <div className="verify-email__loading">
            <div className="verify-email__spinner" />
            <p>Bekræfter din email...</p>
          </div>
        ) : verified ? (
          <motion.div
            className="verify-email__success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="verify-email__icon verify-email__icon--success">✓</div>
            <h1>Email bekræftet!</h1>
            <p>Din konto er nu aktiv. Du er automatisk logget ind.</p>
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate('/dashboard')}
              style={{ marginTop: 20 }}
            >
              Gå til dashboard
            </Button>
          </motion.div>
        ) : (
          <motion.div
            className="verify-email__error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="verify-email__icon verify-email__icon--error">✕</div>
            <h1>Noget gik galt</h1>
            <p>{authStore.error || 'Bekræftelses-linket er ugyldigt eller udløbet.'}</p>
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate('/login')}
              style={{ marginTop: 20 }}
            >
              Gå til log ind
            </Button>
          </motion.div>
        )}
      </motion.div>
    </PageTransition>
  )
})
