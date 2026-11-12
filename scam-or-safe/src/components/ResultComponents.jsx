import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, Sparkles } from 'lucide-react'
import { riskColor, riskBg, riskBorder } from '../utils/helpers.js'

/** Circular risk gauge SVG — TrustLens AI holographic violet & cyan style */
export function RiskGauge({ score = 0, level = 'LOW', size = 122 }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, Number(score) || 0))
  const offset = circumference - (clamped / 100) * circumference
  const color = riskColor(level)

  return (
    <motion.div
      initial={{ scale: 0.88, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 250, damping: 22 }}
      className="flex flex-col items-center gap-2.5 flex-shrink-0"
    >
      <div className="relative" style={{ filter: `drop-shadow(0 0 14px ${color}55)` }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 116 116"
          aria-label={`Risk assessment indicator: ${clamped} out of 100`}
        >
          {/* Outer faint halo ring */}
          <circle cx="58" cy="58" r="52" fill="none" stroke="rgba(196,178,255,0.14)" strokeWidth="1" />
          {/* Track */}
          <circle cx="58" cy="58" r={radius} fill="none" stroke="rgba(141,148,255,0.14)" strokeWidth="9" />
          {/* Animated arc */}
          <motion.circle
            cx="58"
            cy="58"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
            transform="rotate(-90 58 58)"
          />
          {/* Inner reticle */}
          <circle
            cx="58"
            cy="58"
            r="31"
            fill="rgba(13, 8, 48, 0.5)"
            stroke="rgba(196,178,255,0.14)"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          <text
            x="58"
            y="55"
            textAnchor="middle"
            fill={color}
            fontSize="23"
            fontWeight="700"
            fontFamily="Space Grotesk, sans-serif"
          >
            {clamped}
          </text>
          <text
            x="58"
            y="71"
            textAnchor="middle"
            fill="rgba(236,232,255,0.55)"
            fontSize="9"
            fontFamily="JetBrains Mono, monospace"
            letterSpacing="1"
          >
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
  const norm = (level || 'LOW').toUpperCase()
  const color = riskColor(norm)
  const bg = riskBg(norm)
  const border = riskBorder(norm)
  const label = norm === 'HIGH' ? 'HIGH RISK' : norm === 'MEDIUM' ? 'MEDIUM RISK' : 'LOW RISK'

  return (
    <motion.span
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold tracking-wider"
      style={{
        color,
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: `0 0 16px ${color}20`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </motion.span>
  )
}

/** Fallback / offline heuristic disclaimer banner */
export function DemoBanner({ text }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 px-4 py-3 rounded-2xl text-xs"
      style={{
        background: 'rgba(111, 120, 255, 0.10)',
        border: '1px solid rgba(196, 178, 255, 0.22)',
        color: 'rgba(236, 232, 255, 0.78)',
      }}
      role="note"
      aria-label="Fallback mode disclaimer"
    >
      <Info size={16} className="text-[#00E5FF] flex-shrink-0 mt-0.5" />
      <span>
        <strong className="text-[#00E5FF]">Local Heuristic Mode:</strong>{' '}
        {text || 'Analysis is using deterministic local pattern checks because the live backend engine is offline.'}
      </span>
    </motion.div>
  )
}

/** Result summary banner */
export function ResultSummary({ result }) {
  const color = riskColor(result?.level)
  const bg = riskBg(result?.level)
  const border = riskBorder(result?.level)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="px-5 py-4 rounded-2xl"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: `0 8px 24px ${color}14`,
      }}
    >
      <p className="text-sm leading-relaxed text-[#F4F2FF]">{result?.summary}</p>
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
        className="flex items-center gap-2.5 text-sm px-4 py-3.5 rounded-2xl"
        style={{
          background: 'rgba(94, 230, 168, 0.08)',
          border: '1px solid rgba(94, 230, 168, 0.28)',
          color: '#5EE6A8',
        }}
      >
        <CheckCircle2 size={16} className="flex-shrink-0" />
        <span>No obvious warning signs detected.</span>
      </motion.div>
    )
  }

  return (
    <ul className="flex flex-col gap-2.5" role="list">
      {warnings.map((w, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.25 }}
          className="flex items-start gap-3 px-4 py-3.5 rounded-2xl"
          style={{
            background: 'rgba(255, 91, 120, 0.08)',
            border: '1px solid rgba(255, 91, 120, 0.25)',
          }}
        >
          <AlertTriangle size={16} className="text-[#FF5B78] flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            {w.phrase && (
              <p className="text-xs font-mono font-semibold text-[#FF5B78] mb-1">
                Detected Phrase: &ldquo;<em>{w.phrase}</em>&rdquo;
              </p>
            )}
            <p className="text-sm text-[rgba(236,232,255,0.82)] leading-relaxed">{w.reason}</p>
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
    <ul className="flex flex-col gap-2.5" role="list">
      {recommendations.map((r, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.25 }}
          className="flex items-start gap-3 text-sm px-4 py-3 rounded-2xl"
          style={{
            background: 'rgba(94, 230, 168, 0.06)',
            border: '1px solid rgba(94, 230, 168, 0.22)',
            color: '#F4F2FF',
          }}
        >
          <span className="flex-shrink-0 font-mono text-[#5EE6A8] font-bold">→</span>
          <span className="leading-relaxed">{r}</span>
        </motion.li>
      ))}
    </ul>
  )
}

/** Loading spinner */
export function Spinner({ size = 24, color = '#00E5FF' }) {
  return (
    <svg
      className="spinner"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
      role="status"
      style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
    >
      <circle cx="12" cy="12" r="10" stroke={color} strokeOpacity="0.18" strokeWidth="2.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

/** Section header — TrustLens AI Cyber Intelligence style */
export function SectionHeader({ title, subtitle, icon: Icon, badge }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-7"
    >
      <div className="flex flex-wrap items-center gap-3 mb-1.5">
        <div
          className="w-1 h-7 rounded-full"
          style={{ background: 'linear-gradient(180deg, #00E5FF, #6F78FF)' }}
        />
        {Icon && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#6F78FF]/15 border border-[rgba(196,178,255,0.22)]">
            <Icon size={18} className="text-[#00E5FF]" />
          </div>
        )}
        <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight text-[#F4F2FF]">
          {title}
        </h1>
        {badge && (
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded-full border border-[rgba(0,229,255,0.3)] bg-[rgba(0,229,255,0.08)] text-[#00E5FF]">
            <Sparkles size={11} />
            {badge}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-sm text-[rgba(236,232,255,0.72)] pl-4 max-w-3xl leading-relaxed">
          {subtitle}
        </p>
      )}
    </motion.div>
  )
}

/** Glassmorphism Card wrapper */
export function Card({ children, className = '', style = {}, hoverEffect = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      whileHover={
        hoverEffect
          ? {
              y: -3,
              boxShadow: '0 18px 42px rgba(111, 120, 255, 0.22), 0 0 0 1px rgba(0, 229, 255, 0.25)',
            }
          : undefined
      }
      className={`p-5 sm:p-6 relative tl-glass-card ${className}`}
      style={style}
    >
      {children}
    </motion.div>
  )
}

/** Empty state */
export function EmptyState({ icon = '🛡️', title, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-14 text-center gap-4"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: 'rgba(111, 120, 255, 0.14)',
          border: '1px solid rgba(196, 178, 255, 0.22)',
          boxShadow: '0 0 24px rgba(111, 120, 255, 0.18)',
        }}
      >
        <span className="text-3xl">{icon}</span>
      </div>
      <div>
        <h3 className="font-display font-semibold text-base mb-1.5 text-[#F4F2FF]">{title}</h3>
        <p className="text-sm max-w-sm text-[rgba(236,232,255,0.68)]">{description}</p>
      </div>
    </motion.div>
  )
}
