import { motion, useInView } from 'framer-motion'
import type { ReactNode, ComponentProps } from 'react'
import { useRef } from 'react'

interface AnimatedListProps extends ComponentProps<typeof motion.div> {
  children: ReactNode
  className?: string
  /** Delay between each child animation in seconds */
  staggerDelay?: number
  /** Initial delay before first child animates in seconds */
  initialDelay?: number
  /** Whether to trigger animation when in view */
  triggerOnView?: boolean
}

// Smooth container variants
const containerVariants = {
  hidden: {
    opacity: 0,
  },
  visible: (custom: { staggerDelay: number; initialDelay: number }) => ({
    opacity: 1,
    transition: {
      staggerChildren: custom.staggerDelay,
      delayChildren: custom.initialDelay,
    },
  }),
}

/**
 * AnimatedList - Beautifully staggered list container
 */
export const AnimatedList = ({
  children,
  className,
  staggerDelay = 0.05,
  initialDelay = 0.1,
  triggerOnView = false,
  ...props
}: AnimatedListProps) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  
  return (
    <motion.div
      ref={ref}
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={triggerOnView ? (isInView ? 'visible' : 'hidden') : 'visible'}
      custom={{ staggerDelay, initialDelay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface AnimatedListItemProps extends ComponentProps<typeof motion.div> {
  children: ReactNode
  className?: string
}

// Silky smooth item variants with subtle 3D effect
const itemVariants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.96,
    rotateX: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

/**
 * AnimatedListItem - Individual item with smooth entrance
 */
export const AnimatedListItem = ({ children, className, ...props }: AnimatedListItemProps) => {
  return (
    <motion.div 
      className={className} 
      variants={itemVariants} 
      style={{ perspective: 1000 }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Special card variant with hover interactions
interface AnimatedCardProps extends AnimatedListItemProps {
  enableHover?: boolean
}

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export const AnimatedCard = ({ 
  children, 
  className, 
  enableHover = true,
  ...props 
}: AnimatedCardProps) => {
  return (
    <motion.div 
      className={className} 
      variants={cardVariants}
      whileHover={enableHover ? { 
        y: -4, 
        scale: 1.01,
        transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
      } : undefined}
      whileTap={enableHover ? { 
        scale: 0.98,
        transition: { duration: 0.1 }
      } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  )
}
