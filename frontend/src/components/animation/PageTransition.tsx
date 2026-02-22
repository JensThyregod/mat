/* eslint-disable react-refresh/only-export-components */
import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

// Define page positions for 3D-like spatial navigation
const PAGE_POSITIONS: Record<string, { x: number; y: number; z: number }> = {
  '/login': { x: 0, y: 0, z: -1 },
  '/tasks': { x: 0, y: 0, z: 0 },
  '/skills': { x: 0, y: -1, z: 0 },
  '/ligninger': { x: 0, y: 1, z: 0 },
  '/test-lab': { x: 1, y: 0, z: 0 },
}

function getBasePath(pathname: string): string {
  if (pathname.startsWith('/tasks')) return '/tasks'
  return pathname
}

function getDirection(from: string, to: string): { x: number; y: number; z: number } {
  const fromPos = PAGE_POSITIONS[from] ?? { x: 0, y: 0, z: 0 }
  const toPos = PAGE_POSITIONS[to] ?? { x: 0, y: 0, z: 0 }
  
  return {
    x: toPos.x - fromPos.x,
    y: toPos.y - fromPos.y,
    z: toPos.z - fromPos.z,
  }
}

export const PageTransition = ({ children, className }: PageTransitionProps) => {
  const location = useLocation()
  const currentPath = getBasePath(location.pathname)
  const [prevPath, setPrevPath] = useState('/tasks')
  
  useEffect(() => {
    setPrevPath(currentPath)
  }, [currentPath])
  
  const direction = getDirection(prevPath, currentPath)
  
  // More dramatic movement distances
  const slideX = direction.x * 100
  const slideY = direction.y * 60
  const scaleStart = direction.z < 0 ? 1.1 : direction.z > 0 ? 0.9 : 1
  const scaleEnd = direction.z < 0 ? 0.95 : direction.z > 0 ? 1.05 : 1
  
  // Determine if we have a specific direction or default
  const hasDirection = direction.x !== 0 || direction.y !== 0 || direction.z !== 0
  
  const variants = {
    initial: {
      opacity: 0,
      x: hasDirection ? slideX : 0,
      y: hasDirection ? slideY : 30,
      scale: hasDirection ? scaleStart : 0.98,
      filter: 'blur(4px)',
    },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1] as const, // Custom easing - very smooth
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      x: hasDirection ? -slideX * 0.5 : 0,
      y: hasDirection ? -slideY * 0.5 : -20,
      scale: hasDirection ? scaleEnd : 1.02,
      filter: 'blur(4px)',
      transition: {
        duration: 0.35,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  }

  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      style={{ willChange: 'transform, opacity, filter' }}
    >
      {children}
    </motion.div>
  )
}

// Enhanced staggered children variants
export const pageContentVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.15,
    },
  },
}

export const pageItemVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.97,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

// Hero element variant - for main headings that should be more prominent
export const heroVariants = {
  initial: {
    opacity: 0,
    y: 40,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}
