import { motion } from 'framer-motion'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  padding?: 'sm' | 'md' | 'lg'
}

const paddingMap = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export default function Card({ children, className = '', hover = false, onClick, padding = 'lg' }: CardProps) {
  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}
        transition={{ duration: 0.15 }}
        onClick={onClick}
        className={`
          bg-white rounded-[14px] shadow-[var(--shadow-sm)]
          ${paddingMap[padding]}
          ${onClick ? 'cursor-pointer' : ''}
          ${className}
        `}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-[14px] shadow-[var(--shadow-sm)]
        ${paddingMap[padding]}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
