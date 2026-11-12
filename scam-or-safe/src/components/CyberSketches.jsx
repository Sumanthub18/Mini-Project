import { motion } from 'framer-motion'

/**
 * Hand-Drawn Technical Blueprint SVG Illustrations for TrustLens AI.
 * Strictly vector line art (violet #8D94FF, cyan #00E5FF, purple #A78BFA).
 */

export function SketchShieldOutline({ className = '', stroke = '#8D94FF', accent = '#00E5FF' }) {
  return (
    <svg viewBox="0 0 180 200" fill="none" className={className} aria-hidden="true">
      <path
        d="M90 14 L154 40 V96 C154 142 126 172 90 188 C54 172 26 142 26 96 V40 Z"
        stroke={stroke}
        strokeWidth="1.4"
        strokeDasharray="5 4"
        strokeLinecap="round"
      />
      <path
        d="M90 28 L140 49 V94 C140 131 118 156 90 170 C62 156 40 131 40 94 V49 Z"
        stroke={accent}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <circle cx="90" cy="94" r="22" stroke={accent} strokeWidth="1.2" strokeDasharray="3 3" />
      <path d="M78 94 L87 103 L104 84" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M90 14 V28 M26 70 H40 M140 70 H154 M90 170 V188" stroke={stroke} strokeWidth="1" opacity="0.6" />
    </svg>
  )
}

export function SketchBrowserWindow({ className = '', stroke = '#8D94FF', accent = '#00E5FF' }) {
  return (
    <svg viewBox="0 0 240 160" fill="none" className={className} aria-hidden="true">
      <rect x="12" y="14" width="216" height="132" rx="10" stroke={stroke} strokeWidth="1.3" />
      <path d="M12 42 H228" stroke={stroke} strokeWidth="1.1" />
      <circle cx="28" cy="28" r="3" stroke={accent} strokeWidth="1.2" />
      <circle cx="40" cy="28" r="3" stroke={stroke} strokeWidth="1.2" />
      <circle cx="52" cy="28" r="3" stroke={stroke} strokeWidth="1.2" />
      <rect x="68" y="21" width="144" height="14" rx="4" stroke={accent} strokeWidth="1" strokeDasharray="4 3" />
      <path d="M30 64 H136 M30 82 H188 M30 100 H112 M30 118 H154" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
      <rect x="166" y="96" width="46" height="34" rx="6" stroke={accent} strokeWidth="1.2" />
      <path d="M180 96 V89 C180 83 198 83 198 89 V96" stroke={accent} strokeWidth="1.2" />
    </svg>
  )
}

export function SketchMagnifyingGlass({ className = '', stroke = '#8D94FF', accent = '#00E5FF' }) {
  return (
    <svg viewBox="0 0 180 180" fill="none" className={className} aria-hidden="true">
      <circle cx="78" cy="76" r="46" stroke={stroke} strokeWidth="1.4" />
      <circle cx="78" cy="76" r="36" stroke={accent} strokeWidth="1" strokeDasharray="4 4" />
      <path d="M111 109 L154 152" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <path d="M117 103 L160 146" stroke={accent} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <path d="M56 70 H98 M56 82 H88" stroke={accent} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="78" cy="76" r="6" stroke={accent} strokeWidth="1.1" />
    </svg>
  )
}

export function SketchLockKey({ className = '', stroke = '#8D94FF', accent = '#00E5FF' }) {
  return (
    <svg viewBox="0 0 200 160" fill="none" className={className} aria-hidden="true">
      {/* Padlock */}
      <rect x="26" y="64" width="68" height="58" rx="8" stroke={stroke} strokeWidth="1.3" />
      <path d="M40 64 V46 C40 31 80 31 80 46 V64" stroke={accent} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="60" cy="89" r="6" stroke={accent} strokeWidth="1.3" />
      <path d="M60 95 V107" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
      {/* Key */}
      <circle cx="152" cy="78" r="18" stroke={stroke} strokeWidth="1.3" />
      <circle cx="152" cy="78" r="7" stroke={accent} strokeWidth="1.1" />
      <path d="M134 78 H106 M114 78 V88 M124 78 V85" stroke={accent} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function SketchCircuitBoard({ className = '', stroke = '#8D94FF', accent = '#00E5FF' }) {
  return (
    <svg viewBox="0 0 260 180" fill="none" className={className} aria-hidden="true">
      <path d="M18 36 H82 L106 60 H164" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M18 92 H64 L88 116 H196 L218 94 H244" stroke={accent} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M42 146 H118 L142 122 H214" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" strokeDasharray="4 4" />
      <rect x="96" y="42" width="44" height="44" rx="6" stroke={accent} strokeWidth="1.2" />
      <rect x="106" y="52" width="24" height="24" rx="3" stroke={stroke} strokeWidth="1" />
      <circle cx="18" cy="36" r="4" stroke={stroke} strokeWidth="1.2" />
      <circle cx="164" cy="60" r="4" stroke={accent} strokeWidth="1.2" />
      <circle cx="244" cy="94" r="4" stroke={accent} strokeWidth="1.2" />
      <circle cx="214" cy="122" r="4" stroke={stroke} strokeWidth="1.2" />
    </svg>
  )
}

export function SketchAIBrain({ className = '', stroke = '#8D94FF', accent = '#00E5FF' }) {
  return (
    <svg viewBox="0 0 200 180" fill="none" className={className} aria-hidden="true">
      <path
        d="M98 34 C72 34 54 50 52 72 C38 78 32 94 38 110 C42 124 54 132 68 134 C74 146 86 150 98 148"
        stroke={stroke}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M102 34 C128 34 146 50 148 72 C162 78 168 94 162 110 C158 124 146 132 132 134 C126 146 114 150 102 148"
        stroke={accent}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path d="M100 34 V148" stroke={stroke} strokeWidth="1" strokeDasharray="3 4" />
      <circle cx="72" cy="74" r="4" stroke={accent} strokeWidth="1.2" />
      <circle cx="128" cy="74" r="4" stroke={accent} strokeWidth="1.2" />
      <circle cx="66" cy="108" r="4" stroke={stroke} strokeWidth="1.2" />
      <circle cx="134" cy="108" r="4" stroke={stroke} strokeWidth="1.2" />
      <path d="M76 74 L124 74 M72 78 L66 104 M128 78 L134 104 M70 108 L130 108" stroke={accent} strokeWidth="0.9" opacity="0.7" />
    </svg>
  )
}

export function SketchMessageFlow({ className = '', stroke = '#8D94FF', accent = '#00E5FF' }) {
  return (
    <svg viewBox="0 0 280 120" fill="none" className={className} aria-hidden="true">
      <rect x="12" y="34" width="66" height="44" rx="8" stroke={stroke} strokeWidth="1.2" />
      <path d="M22 49 H66 M22 61 H54" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M78 56 H112" stroke={accent} strokeWidth="1.2" strokeDasharray="4 3" />
      <polygon points="108,51 116,56 108,61" stroke={accent} strokeWidth="1.1" fill="none" />
      <circle cx="144" cy="56" r="24" stroke={accent} strokeWidth="1.2" />
      <path d="M135 56 L142 63 L155 48" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M168 56 H200" stroke={stroke} strokeWidth="1.2" strokeDasharray="4 3" />
      <rect x="202" y="34" width="66" height="44" rx="8" stroke={stroke} strokeWidth="1.2" />
      <path d="M214 50 H256 M214 62 H242" stroke={accent} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Capability Card 1: Scam Detection Illustration (Suspicious message + glowing shield)
 */
export function FeatureSketchScam({ hovered = false }) {
  return (
    <svg viewBox="0 0 260 150" fill="none" className="w-full h-36" aria-hidden="true">
      {/* Message bubble blueprint */}
      <motion.rect
        x="18" y="24" width="154" height="96" rx="14"
        stroke="#8D94FF" strokeWidth="1.4" strokeDasharray="5 3"
        animate={{ strokeDashoffset: hovered ? -18 : 0 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      />
      <path d="M36 48 H128" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 66 H148" stroke="rgba(236,232,255,0.45)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M36 82 H112" stroke="rgba(236,232,255,0.45)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Warning tag inside message */}
      <motion.rect
        x="36" y="94" width="66" height="14" rx="4"
        stroke="#FF5B78" strokeWidth="1.2"
        animate={{ opacity: hovered ? [0.6, 1, 0.7] : 0.75 }}
        transition={{ duration: 1.2, repeat: hovered ? Infinity : 0 }}
      />
      {/* Overlapping Protective Shield */}
      <motion.g
        animate={{ y: hovered ? -4 : 0, scale: hovered ? 1.04 : 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        style={{ transformOrigin: '202px 84px' }}
      >
        <path
          d="M202 36 L240 52 V82 C240 109 224 126 202 136 C180 126 164 109 164 82 V52 Z"
          fill="rgba(23,17,61,0.85)"
          stroke="#00E5FF"
          strokeWidth="1.8"
        />
        <path d="M191 84 L199 92 L215 74" stroke="#5EE6A8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
    </svg>
  )
}

/**
 * Capability Card 2: Fake News Illustration (Newspaper + Magnifying glass + evidence links)
 */
export function FeatureSketchNews({ hovered = false }) {
  return (
    <svg viewBox="0 0 260 150" fill="none" className="w-full h-36" aria-hidden="true">
      {/* Newspaper outline */}
      <rect x="20" y="22" width="142" height="106" rx="10" stroke="#8D94FF" strokeWidth="1.4" />
      <rect x="34" y="36" width="64" height="14" rx="3" stroke="#A78BFA" strokeWidth="1.2" />
      <rect x="34" y="60" width="52" height="44" rx="4" stroke="rgba(236,232,255,0.4)" strokeWidth="1.1" />
      <path d="M96 64 H146 M96 78 H146 M96 92 H136 M34 114 H142" stroke="rgba(236,232,255,0.45)" strokeWidth="1.4" strokeLinecap="round" />
      {/* Evidence Network Nodes */}
      <motion.g
        animate={{ opacity: hovered ? 1 : 0.65 }}
        transition={{ duration: 0.4 }}
      >
        <path d="M162 50 L204 34 M162 78 L216 78 M162 104 L204 120" stroke="#00E5FF" strokeWidth="1.1" strokeDasharray="3 3" />
        <circle cx="212" cy="34" r="9" stroke="#5EE6A8" strokeWidth="1.4" />
        <circle cx="226" cy="78" r="11" stroke="#00E5FF" strokeWidth="1.5" />
        <circle cx="212" cy="120" r="9" stroke="#FFBF69" strokeWidth="1.4" />
      </motion.g>
      {/* Magnifying glass */}
      <motion.g
        animate={{ x: hovered ? 5 : 0, y: hovered ? -3 : 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 18 }}
      >
        <circle cx="144" cy="84" r="24" fill="rgba(13,8,48,0.85)" stroke="#00E5FF" strokeWidth="1.8" />
        <path d="M162 102 L182 122" stroke="#00E5FF" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M134 84 H154 M144 74 V94" stroke="#8D94FF" strokeWidth="1.4" strokeLinecap="round" />
      </motion.g>
    </svg>
  )
}

/**
 * Capability Card 3: URL Safety Illustration (Browser window + link + security lock)
 */
export function FeatureSketchUrl({ hovered = false }) {
  return (
    <svg viewBox="0 0 260 150" fill="none" className="w-full h-36" aria-hidden="true">
      <rect x="20" y="20" width="188" height="112" rx="12" stroke="#8D94FF" strokeWidth="1.4" />
      <path d="M20 46 H208" stroke="rgba(196,178,255,0.28)" strokeWidth="1.2" />
      <circle cx="34" cy="33" r="3" fill="#FF5B78" />
      <circle cx="46" cy="33" r="3" fill="#FFBF69" />
      <circle cx="58" cy="33" r="3" fill="#5EE6A8" />
      {/* Address bar */}
      <rect x="72" y="25" width="122" height="16" rx="6" stroke="#00E5FF" strokeWidth="1.2" />
      <path d="M82 33 H156" stroke="#00E5FF" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="3 3" />
      {/* Link Chain */}
      <motion.g
        animate={{ x: hovered ? 4 : 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 18 }}
      >
        <rect x="38" y="68" width="46" height="22" rx="11" stroke="#A78BFA" strokeWidth="1.6" />
        <rect x="72" y="68" width="46" height="22" rx="11" stroke="#00E5FF" strokeWidth="1.6" />
        <path d="M38 106 H134" stroke="rgba(236,232,255,0.4)" strokeWidth="1.4" strokeLinecap="round" />
      </motion.g>
      {/* Padlock */}
      <motion.g
        animate={{ y: hovered ? -5 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        <rect x="174" y="72" width="60" height="52" rx="10" fill="rgba(23,17,61,0.9)" stroke="#00E5FF" strokeWidth="1.7" />
        <path d="M188 72 V57 C188 45 220 45 220 57 V72" stroke="#5EE6A8" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="204" cy="95" r="5" stroke="#00E5FF" strokeWidth="1.6" />
        <path d="M204 100 V110" stroke="#00E5FF" strokeWidth="1.6" strokeLinecap="round" />
      </motion.g>
    </svg>
  )
}

/**
 * How-it-works step sketch illustrations (01 Submit, 02 Analyze, 03 Understand)
 */
export function StepSketch({ step = 1 }) {
  if (step === 1) {
    return (
      <svg viewBox="0 0 120 84" fill="none" className="w-28 h-20" aria-hidden="true">
        <rect x="14" y="12" width="70" height="58" rx="8" stroke="#8D94FF" strokeWidth="1.4" />
        <path d="M26 28 H68 M26 40 H60 M26 52 H50" stroke="rgba(236,232,255,0.5)" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="90" cy="52" r="18" fill="rgba(23,17,61,0.9)" stroke="#00E5FF" strokeWidth="1.5" />
        <path d="M90 59 V45 M84 51 L90 45 L96 51" stroke="#00E5FF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (step === 2) {
    return (
      <svg viewBox="0 0 120 84" fill="none" className="w-28 h-20" aria-hidden="true">
        <circle cx="60" cy="42" r="28" stroke="#8D94FF" strokeWidth="1.3" strokeDasharray="4 3" />
        <circle cx="60" cy="42" r="16" stroke="#00E5FF" strokeWidth="1.5" />
        <circle cx="60" cy="42" r="5" fill="#00E5FF" />
        <path d="M20 42 H32 M88 42 H100 M60 6 V14 M60 70 V78" stroke="#A78BFA" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 120 84" fill="none" className="w-28 h-20" aria-hidden="true">
      <path d="M60 10 L96 24 V44 C96 63 80 74 60 80 C40 74 24 63 24 44 V24 Z" stroke="#5EE6A8" strokeWidth="1.5" />
      <path d="M46 44 L56 54 L76 34" stroke="#00E5FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Large translucent shield watermark for the CTA section
 */
export function CTAShieldSketch({ className = '' }) {
  return (
    <svg viewBox="0 0 400 440" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ctaShieldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6F78FF" stopOpacity="0.35" />
          <stop offset="55%" stopColor="#A78BFA" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.32" />
        </linearGradient>
      </defs>
      <path
        d="M200 22 L352 84 V206 C352 308 286 376 200 416 C114 376 48 308 48 206 V84 Z"
        stroke="url(#ctaShieldGrad)"
        strokeWidth="2"
        fill="rgba(111,120,255,0.03)"
      />
      <path
        d="M200 54 L322 104 V204 C322 288 268 344 200 378 C132 344 78 288 78 204 V104 Z"
        stroke="rgba(0,229,255,0.22)"
        strokeWidth="1.2"
        strokeDasharray="6 6"
      />
      <circle cx="200" cy="206" r="68" stroke="rgba(167,139,250,0.22)" strokeWidth="1.2" />
      <circle cx="200" cy="206" r="38" stroke="rgba(0,229,255,0.28)" strokeWidth="1.4" strokeDasharray="4 4" />
    </svg>
  )
}

/**
 * Hand-drawn technical illustrations for the 5 Multimodal input categories
 */
export function MediaSketch({ type = 'text', active = false }) {
  const stroke = active ? '#00E5FF' : '#8D94FF'
  if (type === 'text') {
    return (
      <svg viewBox="0 0 64 48" fill="none" className="w-12 h-9" aria-hidden="true">
        <rect x="6" y="6" width="52" height="36" rx="7" stroke={stroke} strokeWidth="1.4" />
        <path d="M14 17 H50 M14 25 H42 M14 33 H32" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  }
  if (type === 'image') {
    return (
      <svg viewBox="0 0 64 48" fill="none" className="w-12 h-9" aria-hidden="true">
        <rect x="8" y="6" width="48" height="36" rx="6" stroke={stroke} strokeWidth="1.4" />
        <circle cx="22" cy="18" r="4" stroke={stroke} strokeWidth="1.3" />
        <path d="M12 36 L26 24 L36 32 L44 22 L52 36" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (type === 'screenshot') {
    return (
      <svg viewBox="0 0 64 48" fill="none" className="w-12 h-9" aria-hidden="true">
        <rect x="14" y="4" width="36" height="40" rx="6" stroke={stroke} strokeWidth="1.4" />
        <path d="M22 14 H42 M22 22 H38 M24 34 L30 34" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        <rect x="22" y="27" width="20" height="10" rx="2" stroke="#A78BFA" strokeWidth="1.1" strokeDasharray="3 2" />
      </svg>
    )
  }
  if (type === 'audio') {
    return (
      <svg viewBox="0 0 64 48" fill="none" className="w-12 h-9" aria-hidden="true">
        <path d="M10 24 H16 L20 14 L26 36 L32 10 L38 38 L44 18 L48 24 H54" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 64 48" fill="none" className="w-12 h-9" aria-hidden="true">
      <rect x="6" y="8" width="52" height="32" rx="6" stroke={stroke} strokeWidth="1.4" />
      <polygon points="27,17 42,24 27,31" stroke={stroke} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
    </svg>
  )
}

