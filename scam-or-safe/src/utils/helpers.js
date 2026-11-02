/** Shared utility helpers */

export function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val))
}

export function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso) {
  return `${formatDate(iso)}, ${formatTime(iso)}`
}

export function truncate(str, max = 80) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

/** Risk level helpers — neon cyberpunk palette */
export function riskColor(level) {
  return level === 'HIGH' ? '#ff006e' : level === 'MEDIUM' ? '#ffb800' : '#00ff9f'
}

export function riskBg(level) {
  return level === 'HIGH' ? '#ff006e0c' : level === 'MEDIUM' ? '#ffb8000c' : '#00ff9f0c'
}

export function riskBorder(level) {
  return level === 'HIGH' ? '#ff006e33' : level === 'MEDIUM' ? '#ffb80033' : '#00ff9f33'
}

export function verdictColor(verdict) {
  const map = {
    SUPPORTED: '#00ff9f',
    CONTRADICTED: '#ff006e',
    MIXED: '#ffb800',
    UNVERIFIED: '#4a6080',
    INSUFFICIENT: '#bf00ff',
  }
  return map[verdict] || '#4a6080'
}

export function verdictLabel(verdict) {
  const map = {
    SUPPORTED: 'Supported by Available Evidence',
    CONTRADICTED: 'Contradicted by Available Evidence',
    MIXED: 'Mixed or Potentially Misleading',
    UNVERIFIED: 'Unverified',
    INSUFFICIENT: 'Insufficient Evidence',
  }
  return map[verdict] || verdict
}

export function scanTypeLabel(type) {
  return type === 'SCAM' ? 'Scam Message' : type === 'NEWS' ? 'Fake News' : 'URL Safety'
}

export function scanTypeIcon(type) {
  return type === 'SCAM' ? '💬' : type === 'NEWS' ? '📰' : '🔗'
}
