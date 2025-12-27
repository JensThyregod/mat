import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import './ProgressRing.css'

export type ProgressRingProps = {
  value: number // 0-100
  size?: 'sm' | 'md' | 'lg' | 'xl'
  strokeWidth?: number
  showValue?: boolean
  label?: string
  color?: 'accent' | 'success' | 'algebra' | 'geometri' | 'statistik'
  animated?: boolean
  children?: React.ReactNode
}

const sizeMap = {
  sm: 48,
  md: 80,
  lg: 120,
  xl: 160,
}

const strokeWidthMap = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
}

const colorMap = {
  accent: 'var(--color-accent)',
  success: 'var(--color-success)',
  algebra: 'var(--color-algebra)',
  geometri: 'var(--color-geometri)',
  statistik: 'var(--color-statistik)',
}

export const ProgressRing = ({
  value,
  size = 'md',
  strokeWidth: customStrokeWidth,
  showValue = true,
  label,
  color = 'accent',
  animated = true,
  children,
}: ProgressRingProps) => {
  const diameter = sizeMap[size]
  const strokeWidth = customStrokeWidth ?? strokeWidthMap[size]
  const radius = (diameter - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  
  // Animated value using spring physics
  const springValue = useSpring(0, {
    stiffness: 60,
    damping: 15,
  })
  
  const strokeDashoffset = useTransform(
    springValue,
    [0, 100],
    [circumference, 0]
  )
  
  useEffect(() => {
    if (animated) {
      springValue.set(Math.min(100, Math.max(0, value)))
    }
  }, [value, animated, springValue])
  
  const staticOffset = circumference - (value / 100) * circumference
  const strokeColor = colorMap[color]
  
  return (
    <div 
      className="progress-ring"
      style={{ 
        width: diameter, 
        height: diameter,
        '--ring-color': strokeColor,
      } as React.CSSProperties}
    >
      <svg 
        className="progress-ring__svg"
        width={diameter} 
        height={diameter}
        viewBox={`0 0 ${diameter} ${diameter}`}
      >
        {/* Background track */}
        <circle
          className="progress-ring__track"
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress arc */}
        <motion.circle
          className="progress-ring__progress"
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={animated ? { 
            strokeDashoffset,
            stroke: strokeColor,
          } : {
            strokeDashoffset: staticOffset,
            stroke: strokeColor,
          }}
          transform={`rotate(-90 ${diameter / 2} ${diameter / 2})`}
        />
        
        {/* Glow effect */}
        <motion.circle
          className="progress-ring__glow"
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          strokeWidth={strokeWidth + 4}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={animated ? { 
            strokeDashoffset,
            stroke: strokeColor,
          } : {
            strokeDashoffset: staticOffset,
            stroke: strokeColor,
          }}
          transform={`rotate(-90 ${diameter / 2} ${diameter / 2})`}
        />
      </svg>
      
      {/* Center content */}
      <div className="progress-ring__center">
        {children ?? (
          <>
            {showValue && (
              <span className="progress-ring__value">
                {Math.round(value)}
                <span className="progress-ring__percent">%</span>
              </span>
            )}
            {label && (
              <span className="progress-ring__label">{label}</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

