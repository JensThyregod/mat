import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GlassCard } from '../components/GlassCard'
import { Button } from '../components/Button'
import { MathParticles } from '../components/MathParticles'
import { PageTransition } from '../components/animation'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './LandingView.css'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

const floatVariants = {
  animate: {
    y: [-8, 8, -8],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

const FEATURES = [
  {
    icon: '♾️',
    title: 'Uendelige opgaver',
    description: 'Nye opgaver hver gang du øver — du løber aldrig tør for træning.',
    color: 'var(--color-algebra)',
  },
  {
    icon: '📊',
    title: 'Følg din udvikling',
    description: 'Se præcis hvor du er stærk og svag. Detaljeret statistik over alle dine resultater.',
    color: 'var(--color-accent)',
  },
  {
    icon: '📝',
    title: 'Terminsprøver',
    description: 'Øv dig på realistiske terminsprøver — så mange gange du vil, helt gratis.',
    color: 'var(--color-statistik)',
  },
  {
    icon: '⭐',
    title: 'Færdighedstræ',
    description: 'Lås nye emner op efterhånden som du mestrer dem. Algebra, geometri, funktioner og mere.',
    color: 'var(--color-geometri)',
  },
]


export const LandingView = () => {
  useDocumentTitle('Matematik Tutor — Træning til 9. klasses afgangsprøve')
  const navigate = useNavigate()

  return (
    <PageTransition className="landing">
      <motion.div
        className="landing__content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <MathParticles count={25} />
        {/* ─── Navbar ─── */}
        <motion.nav className="landing__nav" variants={itemVariants}>
          <div className="landing__nav-brand">
            <div className="landing__nav-dot" />
            <span className="landing__nav-name">Matematik Tutor</span>
          </div>
          <div className="landing__nav-actions">
            <button
              className="landing__nav-link"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Funktioner
            </button>
            <Button variant="primary" onClick={() => navigate('/login?mode=signup')}>
              Kom i gang
            </Button>
          </div>
        </motion.nav>

        {/* ─── Hero ─── */}
        <motion.section className="landing__hero" variants={itemVariants}>
          <div className="landing__hero-content">
            <motion.div className="landing__hero-badge" variants={itemVariants}>
              <span className="landing__hero-badge-icon">🎓</span>
              9. klasse · 100% gratis
            </motion.div>

            <motion.h1 className="landing__hero-title" variants={itemVariants}>
              Bliv klar til
              <br />
              <span className="landing__hero-title-accent">afgangsprøven i matematik</span>
            </motion.h1>

            <motion.p className="landing__hero-subtitle" variants={itemVariants}>
              Træningsplatform til udskolingen — med uendelige opgaver,
              terminsprøver og statistik målrettet 9. klasses pensum.
            </motion.p>

            <motion.div className="landing__hero-actions" variants={itemVariants}>
              <Button variant="primary" className="btn-lg" onClick={() => navigate('/login?mode=signup')}>
                Start gratis
              </Button>
            </motion.div>

          </div>

          <motion.div
            className="landing__hero-visual"
            variants={floatVariants}
            animate="animate"
          >
            <div className="landing__hero-card-stack">
              <GlassCard variant="elevated" padding="lg" radius="2xl" className="landing__preview-card landing__preview-card--back">
                <div className="landing__preview-equation">
                  <span className="landing__preview-label">Algebra</span>
                  <span className="landing__preview-math">2x + 5 = 17</span>
                  <span className="landing__preview-status landing__preview-status--correct">✓ Korrekt</span>
                </div>
              </GlassCard>
              <GlassCard variant="elevated" padding="lg" radius="2xl" className="landing__preview-card landing__preview-card--mid">
                <div className="landing__preview-equation">
                  <span className="landing__preview-label">Funktioner</span>
                  <span className="landing__preview-math">f(x) = 2 · 1,5ˣ</span>
                  <span className="landing__preview-status">Næste →</span>
                </div>
              </GlassCard>
              <GlassCard variant="floating" padding="lg" radius="2xl" className="landing__preview-card landing__preview-card--front">
                <div className="landing__preview-equation">
                  <span className="landing__preview-label">Geometri</span>
                  <span className="landing__preview-math">A = π · r²</span>
                  <div className="landing__preview-progress">
                    <div className="landing__preview-progress-bar">
                      <div className="landing__preview-progress-fill" style={{ width: '72%' }} />
                    </div>
                    <span className="landing__preview-progress-text">72%</span>
                  </div>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        </motion.section>

        {/* ─── Features ─── */}
        <motion.section className="landing__features" id="features" variants={itemVariants}>
          <div className="landing__section-header">
            <span className="landing__section-eyebrow">Funktioner</span>
            <h2 className="landing__section-title">Alt du behøver for at øve dig</h2>
            <p className="landing__section-subtitle">
              Uendelige opgaver, detaljeret statistik og terminsprøver
              — målrettet 9. klasses pensum, så du altid kan træne mere.
            </p>
          </div>

          <div className="landing__features-grid">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                custom={index}
              >
                <GlassCard
                  variant="surface"
                  padding="lg"
                  radius="xl"
                  hoverable
                  className="landing__feature-card"
                >
                  <div
                    className="landing__feature-icon"
                    style={{ '--feature-color': feature.color } as React.CSSProperties}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="landing__feature-title">{feature.title}</h3>
                  <p className="landing__feature-desc">{feature.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ─── CTA ─── */}
        <motion.section className="landing__cta" variants={itemVariants}>
          <GlassCard variant="elevated" padding="xl" radius="3xl" className="landing__cta-card">
            <h2 className="landing__cta-title">Klar til afgangsprøven?</h2>
            <p className="landing__cta-subtitle">
              Opret en profil og begynd at træne 9. klasses pensum — det tager under et minut.
            </p>
            <Button variant="primary" className="btn-lg" onClick={() => navigate('/login?mode=signup')}>
              Kom i gang
            </Button>
          </GlassCard>
        </motion.section>

        {/* ─── Footer ─── */}
        <motion.footer className="landing__footer" variants={itemVariants}>
          <div className="landing__footer-brand">
            <div className="landing__nav-dot" />
            <span>Matematik Tutor</span>
          </div>
          <p className="landing__footer-text">
            Lavet til 9. klasses elever der vil blive bedre.
          </p>
        </motion.footer>
      </motion.div>
    </PageTransition>
  )
}
