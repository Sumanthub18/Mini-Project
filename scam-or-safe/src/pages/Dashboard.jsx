import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import {
  ShieldCheck,
  AlertTriangle,
  Newspaper,
  Link2,
  Search,
  Bell,
  ArrowUpRight,
  Sparkles,
  Bot,
  MessageSquareWarning,
  Users,
  Clock,
  Activity,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useScanHistory } from '../hooks/useScanHistory.jsx'
import { getDashboardStats } from '../services/scanDatabaseService.js'
import { RiskBadge } from '../components/ResultComponents.jsx'
import {
  formatDate,
  truncate,
  riskColor,
  scanTypeLabel,
  scanTypeIcon,
  normalizeRiskLevel,
} from '../utils/helpers.js'

const GLASS_TOOLTIP = {
  background: 'rgba(13, 8, 48, 0.94)',
  border: '1px solid rgba(196, 178, 255, 0.22)',
  borderRadius: '12px',
  color: '#F4F2FF',
  fontSize: '12px',
  fontFamily: 'JetBrains Mono, monospace',
}

function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const target = Number(value) || 0
    if (target === 0) {
      setDisplay(0)
      return
    }
    let frame = 0
    const totalFrames = 22
    const step = () => {
      frame += 1
      const progress = frame / totalFrames
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(target * eased))
      if (frame < totalFrames) {
        requestAnimationFrame(step)
      } else {
        setDisplay(target)
      }
    }
    const raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <span>{display}</span>
}

export default function Dashboard() {
  const { user } = useAuth()
  const { history, loading: historyLoading } = useScanHistory()

  const [dbStats, setDbStats] = useState(null)
  const [loadingDb, setLoadingDb] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      if (!user?.id) {
        setLoadingDb(false)
        return
      }
      setLoadingDb(true)
      try {
        const res = await getDashboardStats(user.id)
        if (active && res) setDbStats(res)
      } finally {
        if (active) setLoadingDb(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [user?.id, history.length])

  const displayName =
    user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Security Analyst'
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((s) => s[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'TL'

  // Compute strict metrics from real history + database stats
  const metrics = useMemo(() => {
    const scans = history || []
    const suspiciousCount = scans.filter((s) => {
      const lvl = normalizeRiskLevel(s.riskLevel || s.risk_level)
      return lvl === 'high' || lvl === 'medium'
    }).length

    const verifiedNewsCount = scans.filter((s) => {
      if (s.type !== 'news' && s.scan_type !== 'news') return false
      const verdict = (s.verdict || s.result?.verdict || '').toUpperCase()
      return verdict === 'SUPPORTED' || verdict === 'TRUE' || verdict === 'CONTRADICTED' || !s.verdict
    }).length

    const total = Math.max(scans.length, dbStats?.stats?.total || 0)
    const urlChecks = Math.max(
      scans.filter((s) => s.type === 'url' || s.scan_type === 'url').length,
      dbStats?.stats?.urlCount || 0
    )
    const scamChecks = Math.max(
      scans.filter((s) => s.type === 'scam' || s.scan_type === 'scam').length,
      dbStats?.stats?.scamCount || 0
    )
    const newsChecks = Math.max(
      scans.filter((s) => s.type === 'news' || s.scan_type === 'news').length,
      dbStats?.stats?.newsCount || 0
    )
    const multimodalChecks = scans.filter(
      (s) => s.type === 'multimodal' || s.scan_type === 'multimodal'
    ).length

    return {
      total,
      suspicious: Math.max(suspiciousCount, dbStats?.stats?.highRiskCount || 0),
      verifiedClaims: Math.max(verifiedNewsCount, newsChecks),
      urlChecks,
      scamChecks,
      newsChecks,
      multimodalChecks,
    }
  }, [history, dbStats])

  // Real time-series chart across the last 7 days with activity
  const activityOverTime = useMemo(() => {
    const days = []
    const now = new Date()
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push({
        key,
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        scans: 0,
        suspicious: 0,
      })
    }

    const byKey = Object.fromEntries(days.map((d) => [d.key, d]))
    ;(history || []).forEach((s) => {
      const ts = s.timestamp || s.created_at
      if (!ts) return
      const key = new Date(ts).toISOString().slice(0, 10)
      if (byKey[key]) {
        byKey[key].scans += 1
        const lvl = normalizeRiskLevel(s.riskLevel || s.risk_level)
        if (lvl === 'high' || lvl === 'medium') {
          byKey[key].suspicious += 1
        }
      }
    })
    return days
  }, [history])

  // Real module / category breakdown
  const categoryBreakdown = useMemo(() => {
    const items = [
      { name: 'Scam', count: metrics.scamChecks, color: '#6F78FF' },
      { name: 'News', count: metrics.newsChecks, color: '#A78BFA' },
      { name: 'URL', count: metrics.urlChecks, color: '#00E5FF' },
      { name: 'Multimodal', count: metrics.multimodalChecks, color: '#5EE6A8' },
    ]
    return items
  }, [metrics])

  // Real risk level distribution
  const riskDistribution = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0 }
    ;(history || []).forEach((s) => {
      const lvl = normalizeRiskLevel(s.riskLevel || s.risk_level)
      if (lvl === 'high') counts.high += 1
      else if (lvl === 'medium') counts.medium += 1
      else counts.low += 1
    })
    return [
      { name: 'Low Risk', value: counts.low, color: '#5EE6A8' },
      { name: 'Medium Risk', value: counts.medium, color: '#FFBF69' },
      { name: 'High Risk', value: counts.high, color: '#FF5B78' },
    ]
  }, [history])

  const highRiskAlerts = useMemo(
    () =>
      (history || [])
        .filter((s) => normalizeRiskLevel(s.riskLevel || s.risk_level) === 'high')
        .slice(0, 5),
    [history]
  )

  const recentFindings = useMemo(() => {
    const findings = []
    ;(history || []).slice(0, 12).forEach((s) => {
      const typeLabel = scanTypeLabel(s.type || s.scan_type)
      const lvl = normalizeRiskLevel(s.riskLevel || s.risk_level)
      const summary = s.summary || s.target || 'Scan completed'
      findings.push({
        id: s.id,
        type: s.type || s.scan_type || 'scam',
        typeLabel,
        level: lvl,
        score: s.riskScore ?? s.risk_score ?? 0,
        summary,
        date: s.timestamp || s.created_at,
      })
    })
    return findings.slice(0, 4)
  }, [history])

  const filteredActivity = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const list = history || []
    if (!q) return list.slice(0, 8)
    return list
      .filter(
        (s) =>
          (s.target || '').toLowerCase().includes(q) ||
          (s.summary || '').toLowerCase().includes(q) ||
          scanTypeLabel(s.type || s.scan_type).toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [history, searchQuery])

  const isLoading = loadingDb && historyLoading

  const kpiCards = [
    {
      label: 'Total Scans',
      value: metrics.total,
      icon: ShieldCheck,
      accent: '#6F78FF',
      sub: 'Authenticated checks recorded',
    },
    {
      label: 'Suspicious Results',
      value: metrics.suspicious,
      icon: AlertTriangle,
      accent: '#FF5B78',
      sub: 'Medium & high risk detections',
    },
    {
      label: 'Verified Claims',
      value: metrics.verifiedClaims,
      icon: Newspaper,
      accent: '#A78BFA',
      sub: 'News & misinformation checks',
    },
    {
      label: 'URL Checks',
      value: metrics.urlChecks,
      icon: Link2,
      accent: '#00E5FF',
      sub: 'Link & domain inspections',
    },
  ]

  const quickActions = [
    { to: '/scan/scam', icon: MessageSquareWarning, title: 'Scam Detection', desc: 'Analyze SMS, WhatsApp, UPI & job offers', accent: '#6F78FF' },
    { to: '/scan/news', icon: Newspaper, title: 'Fake News', desc: 'Cross-check viral claims with fact sources', accent: '#A78BFA' },
    { to: '/scan/url', icon: Link2, title: 'URL Safety', desc: 'Safe Browsing, VirusTotal & RDAP intel', accent: '#00E5FF' },
    { to: '/scan/multimodal', icon: Sparkles, title: 'Multimodal AI', desc: 'Scan images, screenshots, audio & video', accent: '#5EE6A8' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Cyber Intelligence Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="tl-glass rounded-2xl px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#00E5FF]">
            TrustLens Cyber Intelligence
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F4F2FF] mt-0.5">
            Digital Security Overview
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <Search className="w-4 h-4 text-[rgba(236,232,255,0.45)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter recent scans..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs text-[#F4F2FF] placeholder-[rgba(236,232,255,0.45)] focus:outline-none focus:border-[#00E5FF]/50 transition-colors"
              style={{
                background: 'rgba(13,8,48,0.65)',
                border: '1px solid rgba(196,178,255,0.16)',
              }}
            />
          </div>

          {/* Notification bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((o) => !o)}
              aria-label="Security alerts"
              className="relative p-2.5 rounded-xl text-[rgba(236,232,255,0.82)] hover:text-[#00E5FF] transition-colors"
              style={{
                background: 'rgba(13,8,48,0.65)',
                border: '1px solid rgba(196,178,255,0.16)',
              }}
            >
              <Bell className="w-4 h-4" />
              {highRiskAlerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF5B78]" />
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  className="absolute right-0 mt-2 w-72 rounded-2xl p-3 tl-glass-strong shadow-2xl z-30"
                  style={{ border: '1px solid rgba(196,178,255,0.22)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-semibold text-[#F4F2FF]">
                      High-Risk Alerts ({highRiskAlerts.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-[11px] text-[rgba(236,232,255,0.55)] hover:text-[#F4F2FF]"
                    >
                      Close
                    </button>
                  </div>
                  {highRiskAlerts.length === 0 ? (
                    <p className="text-xs text-[rgba(236,232,255,0.6)] py-3 text-center">
                      No high-risk scans recorded in your history yet.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {highRiskAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="p-2 rounded-xl text-xs"
                          style={{
                            background: 'rgba(255,91,120,0.08)',
                            border: '1px solid rgba(255,91,120,0.24)',
                          }}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono text-[#FF5B78]">
                            <span>{scanTypeLabel(alert.type)}</span>
                            <span>{alert.riskScore}/100</span>
                          </div>
                          <p className="text-[rgba(236,232,255,0.85)] truncate mt-0.5">
                            {truncate(alert.target || alert.summary, 48)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Authenticated user profile pill */}
          <Link
            to="/settings"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:border-[#8D94FF]/40 transition-colors"
            style={{
              background: 'rgba(13,8,48,0.65)',
              border: '1px solid rgba(196,178,255,0.16)',
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-bold"
              style={{
                background: 'linear-gradient(135deg, rgba(111,120,255,0.38), rgba(0,229,255,0.25))',
                color: '#00E5FF',
              }}
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-medium text-[#F4F2FF]">{displayName}</p>
              <p className="text-[10px] font-mono text-[rgba(236,232,255,0.52)]">Authenticated</p>
            </div>
          </Link>
        </div>
      </motion.div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, accent, sub }, idx) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="tl-glass-card p-5 relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[rgba(236,232,255,0.6)]">
                  {label}
                </p>
                <p className="font-display text-3xl font-bold text-[#F4F2FF] mt-2">
                  {isLoading ? '—' : <AnimatedCounter value={value} />}
                </p>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: `${accent}1A`,
                  border: `1px solid ${accent}44`,
                  boxShadow: `0 0 18px ${accent}22`,
                }}
              >
                <Icon className="w-5 h-5" style={{ color: accent }} />
              </div>
            </div>
            <p className="text-[11px] text-[rgba(236,232,255,0.58)] mt-3">{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Launch Security Scanners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {quickActions.map(({ to, icon: Icon, title, desc, accent }) => (
          <Link
            key={to}
            to={to}
            className="tl-glass-card p-4 group flex items-start gap-3"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
              style={{
                background: `${accent}18`,
                border: `1px solid ${accent}40`,
              }}
            >
              <Icon className="w-4 h-4" style={{ color: accent }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h2 className="text-sm font-display font-semibold text-[#F4F2FF] truncate">
                  {title}
                </h2>
                <ArrowUpRight className="w-3.5 h-3.5 text-[rgba(236,232,255,0.45)] group-hover:text-[#00E5FF] transition-colors flex-shrink-0" />
              </div>
              <p className="text-xs text-[rgba(236,232,255,0.62)] mt-0.5 line-clamp-2">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Data Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. Scan Activity Over Time */}
        <div className="lg:col-span-6 tl-glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[#F4F2FF] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00E5FF]" />
                Scan Activity Over Time
              </h2>
              <p className="text-xs text-[rgba(236,232,255,0.58)]">
                Last 7 days from your recorded verification history
              </p>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityOverTime} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="tlScanArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6F78FF" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#6F78FF" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="tlSuspiciousArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF5B78" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#FF5B78" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(196,178,255,0.08)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'rgba(236,232,255,0.55)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(196,178,255,0.14)' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'rgba(236,232,255,0.55)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={GLASS_TOOLTIP} />
                <Area
                  type="monotone"
                  dataKey="scans"
                  name="Total Scans"
                  stroke="#6F78FF"
                  strokeWidth={2}
                  fill="url(#tlScanArea)"
                />
                <Area
                  type="monotone"
                  dataKey="suspicious"
                  name="Suspicious"
                  stroke="#FF5B78"
                  strokeWidth={2}
                  fill="url(#tlSuspiciousArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Category / Module Distribution */}
        <div className="lg:col-span-3 tl-glass-card p-5">
          <h2 className="font-display text-base font-semibold text-[#F4F2FF]">
            Scans by Category
          </h2>
          <p className="text-xs text-[rgba(236,232,255,0.58)] mb-4">
            Distribution across analyzers
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown} margin={{ top: 8, right: 8, left: -26, bottom: 0 }}>
                <CartesianGrid stroke="rgba(196,178,255,0.08)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'rgba(236,232,255,0.62)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(196,178,255,0.14)' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'rgba(236,232,255,0.55)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={GLASS_TOOLTIP} cursor={{ fill: 'rgba(111,120,255,0.08)' }} />
                <Bar dataKey="count" name="Checks" radius={[8, 8, 0, 0]}>
                  {categoryBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Risk Level Distribution */}
        <div className="lg:col-span-3 tl-glass-card p-5 flex flex-col">
          <h2 className="font-display text-base font-semibold text-[#F4F2FF]">
            Risk Distribution
          </h2>
          <p className="text-xs text-[rgba(236,232,255,0.58)] mb-2">
            Observed scan risk levels
          </p>
          {history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <ShieldCheck className="w-8 h-8 text-[#8D94FF]/50 mb-2" />
              <p className="text-xs text-[rgba(236,232,255,0.58)]">
                Run a scan to populate your risk chart.
              </p>
            </div>
          ) : (
            <>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={60}
                      paddingAngle={3}
                    >
                      {riskDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={GLASS_TOOLTIP} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-2 text-center">
                {riskDistribution.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-xl py-1.5 px-1"
                    style={{ background: 'rgba(13,8,48,0.55)', border: '1px solid rgba(196,178,255,0.1)' }}
                  >
                    <p className="text-xs font-mono font-bold" style={{ color: item.color }}>
                      {item.value}
                    </p>
                    <p className="text-[10px] text-[rgba(236,232,255,0.6)] truncate">
                      {item.name.replace(' Risk', '')}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Row: Recent Security Findings + Recent Activity Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Security Findings */}
        <div className="lg:col-span-4 tl-glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[#F4F2FF]">
              Recent Security Findings
            </h2>
            <Link to="/community" className="text-xs font-mono text-[#00E5FF] hover:underline flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Community
            </Link>
          </div>

          {recentFindings.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Bot className="w-8 h-8 text-[#00E5FF]/60 mx-auto" />
              <p className="text-xs text-[rgba(236,232,255,0.68)]">
                No security findings yet. Launch any analyzer or ask TrustLens AI to evaluate a suspicious message.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentFindings.map((f) => {
                const col = riskColor(f.level)
                return (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl space-y-1.5"
                    style={{
                      background: 'rgba(13,8,48,0.6)',
                      border: '1px solid rgba(196,178,255,0.12)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-[#A78BFA]">
                        {scanTypeIcon(f.type)} {f.typeLabel}
                      </span>
                      <span
                        className="text-[11px] font-mono font-semibold"
                        style={{ color: col }}
                      >
                        {f.score}/100
                      </span>
                    </div>
                    <p className="text-xs text-[rgba(236,232,255,0.82)] line-clamp-2">
                      {f.summary}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Activity Table */}
        <div className="lg:col-span-8 tl-glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[#F4F2FF]">
                Recent Activity
              </h2>
              <p className="text-xs text-[rgba(236,232,255,0.58)]">
                Your latest scam, misinformation, URL, and multimodal checks
              </p>
            </div>
            <Link to="/history" className="text-xs font-mono text-[#00E5FF] hover:underline">
              View All →
            </Link>
          </div>

          {filteredActivity.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <Clock className="w-8 h-8 text-[#8D94FF]/60 mx-auto" />
              <p className="text-sm text-[rgba(236,232,255,0.72)]">
                {searchQuery
                  ? 'No scans matched your filter.'
                  : 'No scans recorded yet. Run your first check to populate your activity log.'}
              </p>
              {!searchQuery && (
                <Link to="/scan/scam" className="tl-btn-primary inline-flex text-xs">
                  Run First Scan
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className="border-b text-[11px] font-mono uppercase tracking-wider text-[rgba(236,232,255,0.52)]"
                    style={{ borderColor: 'rgba(196,178,255,0.14)' }}
                  >
                    <th className="py-2.5 pr-3">Analysis Type</th>
                    <th className="py-2.5 pr-3">Submitted Item</th>
                    <th className="py-2.5 pr-3">Risk Level</th>
                    <th className="py-2.5 pr-3">Date</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs" style={{ borderColor: 'rgba(196,178,255,0.08)' }}>
                  {filteredActivity.map((item) => {
                    const type = item.type || item.scan_type || 'scam'
                    const level = item.riskLevel || item.risk_level || 'low'
                    const ts = item.timestamp || item.created_at
                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-3 font-mono text-[#F4F2FF] whitespace-nowrap">
                          {scanTypeIcon(type)} {scanTypeLabel(type)}
                        </td>
                        <td className="py-3 pr-3 text-[rgba(236,232,255,0.82)] max-w-[240px] truncate">
                          {truncate(item.target || item.summary || '—', 55)}
                        </td>
                        <td className="py-3 pr-3 whitespace-nowrap">
                          <RiskBadge level={level} />
                        </td>
                        <td className="py-3 pr-3 font-mono text-[rgba(236,232,255,0.58)] whitespace-nowrap">
                          {formatDate(ts)}
                        </td>
                        <td className="py-3 text-right font-mono text-[#5EE6A8] whitespace-nowrap">
                          Completed
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
