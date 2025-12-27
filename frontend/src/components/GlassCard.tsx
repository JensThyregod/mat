import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { motion, type MotionProps } from 'framer-motion'
import classNames from 'classnames'
import './GlassCard.css'

export type GlassCardVariant = 
  | 'default'      // Standard frosted glass
  | 'elevated'     // Floating with more prominence
  | 'floating'     // Heavy blur, modal-like
  | 'surface'      // Solid white, minimal
  | 'interactive'  // Clickable with hover effects
  | 'accent'       // With accent color tint

export type GlassCardProps = ComponentPropsWithoutRef<'div'> & MotionProps & {
  variant?: GlassCardVariant
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  radius?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  glow?: boolean
  hoverable?: boolean
  children: React.ReactNode
}

const paddingMap = {
  none: '0',
  sm: 'var(--space-3)',
  md: 'var(--space-4)',
  lg: 'var(--space-6)',
  xl: 'var(--space-8)',
}

const radiusMap = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  '2xl': 'var(--radius-2xl)',
  '3xl': 'var(--radius-3xl)',
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(({
  variant = 'default',
  padding = 'lg',
  radius = 'xl',
  glow = false,
  hoverable = false,
  className,
  style,
  children,
  ...motionProps
}, ref) => {
  const isInteractive = variant === 'interactive' || hoverable

  return (
    <motion.div
      ref={ref}
      className={classNames(
        'glass-card',
        `glass-card--${variant}`,
        {
          'glass-card--hoverable': isInteractive,
          'glass-card--glow': glow,
        },
        className
      )}
      style={{
        padding: paddingMap[padding],
        borderRadius: radiusMap[radius],
        ...style,
      }}
      whileHover={isInteractive ? { 
        y: -3,
        transition: { type: 'spring', stiffness: 400, damping: 25 }
      } : undefined}
      whileTap={isInteractive ? { 
        scale: 0.98,
        transition: { duration: 0.1 }
      } : undefined}
      {...motionProps}
    >
      {/* Gradient border overlay for premium effect */}
      <div className="glass-card__border" aria-hidden="true" />
      
      {/* Glow effect */}
      {glow && <div className="glass-card__glow" aria-hidden="true" />}
      
      {/* Content */}
      <div className="glass-card__content">
        {children}
      </div>
    </motion.div>
  )
})

GlassCard.displayName = 'GlassCard'

// Preset components for common use cases
export const SurfaceCard = forwardRef<HTMLDivElement, Omit<GlassCardProps, 'variant'>>((props, ref) => (
  <GlassCard ref={ref} variant="surface" {...props} />
))

export const InteractiveCard = forwardRef<HTMLDivElement, Omit<GlassCardProps, 'variant'>>((props, ref) => (
  <GlassCard ref={ref} variant="interactive" {...props} />
))

export const FloatingCard = forwardRef<HTMLDivElement, Omit<GlassCardProps, 'variant'>>((props, ref) => (
  <GlassCard ref={ref} variant="floating" {...props} />
))

SurfaceCard.displayName = 'SurfaceCard'
InteractiveCard.displayName = 'InteractiveCard'
FloatingCard.displayName = 'FloatingCard'

