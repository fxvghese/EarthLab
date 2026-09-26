import { useRef, useState, type ReactNode, type MouseEvent } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * cursor-card — shadcn registry pattern: a card whose highlight and border
 * glow track the cursor. Used for mission selection and info tiles.
 */
export function CursorCard({
  children,
  className,
  onClick,
  active = false,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  active?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: -999, y: -999 })
  const [hover, setHover] = useState(false)

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-cyan-glow/15 bg-abyss-800/40 p-3',
        'transition-colors duration-200',
        onClick && 'cursor-pointer hover:border-cyan-glow/40',
        active && 'border-cyan-glow/50 bg-abyss-700/40',
        className,
      )}
      style={
        {
          '--mx': `${pos.x}px`,
          '--my': `${pos.y}px`,
        } as React.CSSProperties
      }
    >
      {/* cursor-tracked highlight */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(220px circle at var(--mx) var(--my), rgba(53,224,210,0.13), transparent 65%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(160px circle at var(--mx) var(--my), rgba(53,224,210,0.25), transparent 60%)`,
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '1px',
        }}
      />
      <motion.div
        animate={{ opacity: hover ? 1 : 0.85 }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  )
}
