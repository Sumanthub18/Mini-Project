/** Shared utility helpers — TrustLens AI Cyber Intelligence Palette */

export function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val))
}

export function normalizeRiskLevel(level) {
  const norm = String(level || 'low').toLowerCase().trim()
  if (norm === 'high' || norm === 'critical' || norm === 'dangerous') return 'high'
  if (norm === 'medium' || norm === 'moderate' || norm === 'suspicious') return 'medium'
  return 'low'
}

export async function copyToClipboard(text) {
  if (!text) return false
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(String(text))
      return true
    }
  } catch {
    // Fallback below
  }
  return false
}

export function formatDate(iso) {
  if (!iso) return 'N/A'
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso) {
  if (!iso) return 'N/A'
  return `${formatDate(iso)}, ${formatTime(iso)}`
}

export function truncate(str, max = 80) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

/** Risk level helpers — TrustLens AI Violet & Cyan Palette */
export function riskColor(level) {
  const norm = (level || 'LOW').toUpperCase()
  return norm === 'HIGH' ? '#FF5B78' : norm === 'MEDIUM' ? '#FFBF69' : '#5EE6A8'
}

export function riskBg(level) {
  const norm = (level || 'LOW').toUpperCase()
  return norm === 'HIGH'
    ? 'rgba(255, 91, 120, 0.10)'
    : norm === 'MEDIUM'
      ? 'rgba(255, 191, 105, 0.10)'
      : 'rgba(94, 230, 168, 0.10)'
}

export function riskBorder(level) {
  const norm = (level || 'LOW').toUpperCase()
  return norm === 'HIGH'
    ? 'rgba(255, 91, 120, 0.34)'
    : norm === 'MEDIUM'
      ? 'rgba(255, 191, 105, 0.34)'
      : 'rgba(94, 230, 168, 0.34)'
}

export function verdictColor(verdict) {
  const map = {
    SUPPORTED: '#5EE6A8',
    CONTRADICTED: '#FF5B78',
    MIXED: '#FFBF69',
    UNVERIFIED: '#00E5FF',
    INSUFFICIENT: '#A78BFA',
    'INSUFFICIENT EVIDENCE': '#A78BFA',
  }
  return map[(verdict || '').toUpperCase()] || '#8D94FF'
}

export function verdictLabel(verdict) {
  const map = {
    SUPPORTED: 'Supported by Available Evidence',
    CONTRADICTED: 'Contradicted by Available Evidence',
    MIXED: 'Mixed or Potentially Misleading',
    UNVERIFIED: 'Unverified',
    INSUFFICIENT: 'Insufficient Evidence',
    'INSUFFICIENT EVIDENCE': 'Insufficient Evidence',
  }
  return map[verdict] || verdict
}

export function scanTypeLabel(type) {
  const t = (type || '').toUpperCase()
  if (t === 'SCAM') return 'Scam Detection'
  if (t === 'NEWS') return 'Fake News'
  if (t === 'URL') return 'URL Safety'
  if (t === 'MULTIMODAL') return 'Multimodal AI'
  return t || 'Scan'
}

export function scanTypeIcon(type) {
  const t = (type || '').toUpperCase()
  if (t === 'SCAM') return '🛡️'
  if (t === 'NEWS') return '📰'
  if (t === 'URL') return '🔗'
  if (t === 'MULTIMODAL') return '✨'
  return '🔍'
}
