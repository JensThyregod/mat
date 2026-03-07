import { useState, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from 'react-oidc-context'
import { GlassCard } from '../components/GlassCard'
import { PageTransition } from '../components/animation'
import { useStore } from '../stores/storeProvider'
import './SettingsView.css'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export const SettingsView = observer(() => {
  const { authStore, api } = useStore()
  const auth = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isTestUser = authStore.student?.isTestUser === true

  const handleDeleteUser = useCallback(async () => {
    setIsDeleting(true)
    setError(null)
    try {
      await api.deleteUser()
      authStore.logout()
      auth.removeUser()
      auth.signoutRedirect()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke slette brugeren')
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }, [api, authStore, auth])

  return (
    <PageTransition>
      <motion.div
        className="settings"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="settings__header" variants={itemVariants}>
          <h1 className="settings__title">
            <span className="settings__title-icon">⚙️</span>
            Indstillinger
          </h1>
          <p className="settings__subtitle">
            Administrer din konto
          </p>
        </motion.div>

        {isTestUser ? (
          <motion.div className="settings__section" variants={itemVariants}>
            <GlassCard variant="surface" padding="lg" radius="xl">
              <div className="settings__test-badge">
                <span className="settings__test-badge-dot" />
                Testbruger
              </div>

              <div className="settings__danger-zone">
                <h3 className="settings__danger-title">Slet konto</h3>
                <p className="settings__danger-description">
                  Din konto er oprettet i et udviklingsmiljø. Du kan permanent
                  slette alle data knyttet til din bruger, inklusiv
                  din identitet.
                </p>

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      className="settings__error"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <span className="settings__error-icon">⚠️</span>
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {!showConfirm ? (
                    <motion.button
                      key="delete-btn"
                      className="settings__delete-btn"
                      onClick={() => setShowConfirm(true)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Slet bruger
                    </motion.button>
                  ) : (
                    <motion.div
                      key="confirm-panel"
                      className="settings__confirm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                    >
                      <p className="settings__confirm-text">
                        Er du sikker? Denne handling kan ikke fortrydes.
                      </p>
                      <div className="settings__confirm-actions">
                        <motion.button
                          className="settings__confirm-btn settings__confirm-btn--cancel"
                          onClick={() => setShowConfirm(false)}
                          disabled={isDeleting}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Annuller
                        </motion.button>
                        <motion.button
                          className="settings__confirm-btn settings__confirm-btn--delete"
                          onClick={handleDeleteUser}
                          disabled={isDeleting}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {isDeleting ? (
                            <span className="settings__spinner" />
                          ) : (
                            'Ja, slet min konto'
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div className="settings__empty" variants={itemVariants}>
            <GlassCard variant="surface" padding="lg" radius="xl">
              <div className="settings__empty-content">
                <span className="settings__empty-icon">⚙️</span>
                <p className="settings__empty-text">
                  Ingen indstillinger tilgængelige
                </p>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </motion.div>
    </PageTransition>
  )
})
