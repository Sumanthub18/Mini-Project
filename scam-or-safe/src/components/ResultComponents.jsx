import { motion } from 'framer-motion'
import { riskColor, riskBg, riskBorder } from '../utils/helpers.js'

/** Circular risk gauge SVG — neon cyberpunk style with Framer Motion */
export function RiskGauge({ score = 0, level = 'LOW' }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = riskColor(level)

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative" style={{ filter: `drop-shadow(0 0 10px ${color}88)` }}>
        <svg width="110" height="110" viewBox="0 0 110 110" aria-label={`Risk score: ${score} out of 100`}>
          {/* Outer ring */}
          <circle cx="55" cy="55" r="48" fill="none" stroke={color + '15'} strokeWidth="1" />
          {/* Track */}
          <circle cx="55" cy="55" r={radius} fill="none" stroke="#0f2040" strokeWidth="10" />
          {/* Fill with smooth SVG stroke animation */}
          <motion.circle
            cx="55" cy="55" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="butt"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            transform="rotate(-90 55 55)"
          />
          {/* Inner ring accent */}
          <circle cx="55" cy="55" r="28" fill="none" stroke={color + '20'} strokeWidth="1" strokeDasharray="4 4" />
          {/* Score text */}
          <text
            x="55" y="51" textAnchor="middle" fill={color} fontSize="22" fontWeight="800" fontFamily="Orbitron,monospace"
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          >
            {score}
          </text>
          <text x="55" y="66" textAnchor="middle" fill="#4a6080" fontSize="9" fontFamily="Share Tech Mono,monospace" letterSpacing="1">
            / 100
          </text>
        </svg>
      </div>
      <RiskBadge level={level} />
    </motion.div>
  )
}

/** Inline risk level badge */
export function RiskBadge({ level }) {
  const color = riskColor(level)
  const bg = riskBg(level)
  const border = riskBorder(level)
  const label = level === 'HIGH' ? '▲ HIGH RISK' : level === 'MEDIUM' ? '◆ MEDIUM' : '▼ LOW RISK'

  return (
    <motion.span
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="inline-flex items-center px-3 py-1 text-xs font-bold tracking-widest"
      style={{
        color,
        background: bg,
        border: `1px solid ${border}`,
        textShadow: `0 0 8px ${color}88`,
        fontFamily: 'Orbitron, monospace',
        clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
      }}
    >
      {label}
    </motion.span>
  )
}

/** Demo result disclaimer banner */
export function DemoBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 px-4 py-3 text-sm relative"
      style={{
        background: '#00d4ff08',
        border: '1px solid #00d4ff22',
        color: '#4a6080',
        clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
      }}
      role="note"
      aria-label="Demo result disclaimer"
    >
      <span className="text-base flex-shrink-0" style={{ filter: 'drop-shadow(0 0 4px #00d4ff)' }}>🔬</span>
      <span>
        <strong style={{ color: '#00d4ff', textShadow: '0 0 8px #00d4ff88' }}>[ DEMO RESULT ]</strong>
        {' '}— Analysis based on local pattern matching. No real AI or external API was used.
      </span>
    </motion.div>
  )
}

/** Result summary card */
export function ResultSummary({ result }) {
  const color = riskColor(result.level)
  const bg = riskBg(result.level)
  const border = riskBorder(result.level)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="px-5 py-4"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: `0 0 20px ${color}12`,
        clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
      }}
    >
      <p className="text-sm leading-relaxed" style={{ color: '#e2e8f0' }}>{result.summary}</p>
    </motion.div>
  )
}

/** List of warning signs */
export function WarningList({ warnings }) {
  if (!warnings || warnings.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-sm px-4 py-3"
        style={{
          background: '#00ff9f08',
          border: '1px solid #00ff9f22',
          color: '#00ff9f',
          textShadow: '0 0 8px #00ff9f44',
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
        }}
      >
        <span>✓</span> No warning signs detected.
      </motion.div>
    )
  }
  return (
    <ul className="flex flex-col gap-2" role="list">
      {warnings.map((w, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.25 }}
          className="flex items-start gap-3 px-4 py-3"
          style={{
            background: '#ff006e08',
            border: '1px solid #ff006e22',
            clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
          }}
        >
          <span className="text-sm flex-shrink-0 mt-0.5" style={{ color: '#ff006e', textShadow: '0 0 8px #ff006e' }}>⚠</span>
          <div>
            {w.phrase && (
              <p className="text-xs font-bold mb-1 font-mono" style={{ color: '#ff006e', letterSpacing: '0.04em' }}>
                PHRASE: "<em>{w.phrase}</em>"
              </p>
            )}
            <p className="text-sm" style={{ color: '#94a3b8' }}>{w.reason}</p>
          </div>
        </motion.li>
      ))}
    </ul>
  )
}

/** Recommended actions list */
export function RecommendationList({ recommendations }) {
  if (!recommendations || recommendations.length === 0) return null
  return (
    <ul className="flex flex-col gap-2" role="list">
      {recommendations.map((r, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.25 }}
          className="flex items-start gap-3 text-sm px-4 py-3"
          style={{
            background: '#00ff9f06',
            border: '1px solid #00ff9f18',
            color: '#e2e8f0',
            clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
          }}
        >
          <span className="flex-shrink-0 font-mono" style={{ color: '#00ff9f', textShadow: '0 0 6px #00ff9f' }}>→</span>
          <span>{r}</span>
        </motion.li>
      ))}
    </ul>
  )
}

/** Loading spinner */
export function Spinner({ size = 24, color = '#00ff9f' }) {
  return (
    <svg
      className="spinner"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
      role="status"
      style={{ filter: `drop-shadow(0 0 4px ${color})` }}
    >
      <circle cx="12" cy="12" r="10" stroke={color} strokeOpacity="0.15" strokeWidth="2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Section header — HUD style */
export function SectionHeader({ title, subtitle, icon: Icon, badge }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-7"
    >
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <div style={{ width: 3, height: 28, background: 'linear-gradient(180deg, #00ff9f, #00d4ff)', boxShadow: '0 0 8px #00ff9f' }} />
        {Icon && <Icon size={24} className="text-emerald-400" />}
        <h1
          className="font-display font-bold text-2xl md:text-3xl tracking-wide"
          style={{ color: '#00ff9f', textShadow: '0 0 20px #00ff9f44', letterSpacing: '0.08em' }}
        >
          {title}
        </h1>
        {badge && (
          <span className="font-mono text-[10px] px-2.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            {badge}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-sm font-mono pl-6" style={{ color: '#4a6080', letterSpacing: '0.04em' }}>
          {subtitle}
        </p>
      )}
    </motion.div>
  )
}

/** Card wrapper — cyberpunk */
export function Card({ children, className = '', style = {}, hoverEffect = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={hoverEffect ? { y: -2, boxShadow: '0 8px 30px rgba(0, 255, 159, 0.12)' } : undefined}
      className={`p-5 relative ${className}`}
      style={{
        background: 'linear-gradient(135deg, #0d1424 0%, #090d1a 100%)',
        border: '1px solid #00ff9f18',
        boxShadow: 'inset 0 0 30px #00ff9f05, 0 4px 20px #00000060',
        clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
        ...style
      }}
    >
      {/* Corner accents */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', top: 4, left: 4,
          width: 10, height: 10,
          borderTop: '1px solid #00ff9f44',
          borderLeft: '1px solid #00ff9f44',
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: 4, right: 4,
          width: 10, height: 10,
          borderBottom: '1px solid #00ff9f44',
          borderRight: '1px solid #00ff9f44',
        }}
      />
      {children}
    </motion.div>
  )
}

/** Empty state */
export function EmptyState({ icon = '📭', title, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center gap-4"
    >
      <div
        className="w-20 h-20 flex items-center justify-center"
        style={{
          background: '#0d1424',
          border: '1px solid #00ff9f18',
          clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
        }}
      >
        <span className="text-4xl" style={{ filter: 'grayscale(0.3)' }}>{icon}</span>
      </div>
      <div>
        <h3 className="font-display font-bold text-base mb-2" style={{ color: '#e2e8f0', letterSpacing: '0.08em' }}>{title}</h3>
        <p className="text-sm max-w-xs font-mono" style={{ color: '#4a6080', letterSpacing: '0.04em' }}>{description}</p>
      </div>
    </motion.div>
  )
}
