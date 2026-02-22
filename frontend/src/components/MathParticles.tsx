import { useEffect, useState, useMemo } from 'react'
import './MathParticles.css'

// Simple math symbols appropriate for 9th grade level
const MATH_SYMBOLS = [
  // Basic operations
  '+', '−', '×', '÷', '=',
  // Numbers
  '1', '2', '3', '4', '5', '7', '8', '9',
  // Simple variables
  'x', 'y',
  // Fractions
  '½', '¼', '¾',
  // Geometry
  '△', '□', '○',
  // Other basics
  '%', 'π',
]

interface Particle {
  id: number
  symbol: string
  x: number
  size: number
  duration: number
  delay: number
  opacity: number
  rotate: number
  rotateSpeed: number
}

function createParticle(id: number): Particle {
  return {
    id,
    symbol: MATH_SYMBOLS[Math.floor(Math.random() * MATH_SYMBOLS.length)],
    x: 5 + Math.random() * 90, // 5-95% - keep away from edges
    size: 18 + Math.random() * 16, // 18-34px
    duration: 12 + Math.random() * 8, // 12-20s to float up
    delay: Math.random() * -12, // stagger start times (negative = already in progress)
    opacity: 0.2 + Math.random() * 0.15, // 0.2-0.35 opacity
    rotate: Math.random() * 360,
    rotateSpeed: (Math.random() - 0.5) * 40, // -20 to 20 degrees rotation during animation
  }
}

interface MathParticlesProps {
  count?: number
}

export function MathParticles({ count = 25 }: MathParticlesProps) {
  const [mounted, setMounted] = useState(false)
  
  // Generate particles only once using useMemo
  const particles = useMemo(() => {
    const arr: Particle[] = []
    for (let i = 0; i < count; i++) {
      arr.push(createParticle(i))
    }
    return arr
  }, [count])

  // Trigger mount to start animations (deferred render for CSS transitions)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  return (
    <div className="math-particles" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="math-particle"
          style={{
            '--x': `${particle.x}%`,
            '--size': `${particle.size}px`,
            '--duration': `${particle.duration}s`,
            '--delay': `${particle.delay}s`,
            '--opacity': particle.opacity,
            '--rotate-start': `${particle.rotate}deg`,
            '--rotate-end': `${particle.rotate + particle.rotateSpeed}deg`,
          } as React.CSSProperties}
        >
          {particle.symbol}
        </span>
      ))}
    </div>
  )
}
