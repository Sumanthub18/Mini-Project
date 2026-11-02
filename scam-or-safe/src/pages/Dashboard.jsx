import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  MessageSquareWarning, Newspaper, Link2, ArrowRight,
  TrendingUp, ShieldCheck, AlertTriangle, Shield, RefreshCw, Cpu
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useScanHistory } from '../hooks/useScanHistory.jsx'
import { getDashboardStats } from '../services/scanDatabaseService.js'
import { SectionHeader, Card, EmptyState } from '../components/ResultComponents.jsx'
import { riskColor, formatDateTime, truncate, scanTypeLabel, scanTypeIcon } from '../utils/helpers.js'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const QUICK_ACTIONS = [
  {
    to: '/scan/scam', icon: MessageSquareWarning, label: 'Scam Scanner',
    color: '#ff006e', bg: '#ff006e08', border: '#ff006e22', tag: 'AI SCAM DETECTION',
  },
  {
    to: '/scan/compare', icon: Cpu, label: 'AI Comparison',
    color: '#00d4ff', bg: '#00d4ff08', border: '#00d4ff22', tag: 'GROQ / GEMINI / MISTRAL',
  },
  {
    to: '/scan/news', icon: Newspaper, label: 'Fake News',
    color: '#bf00ff', bg: '#bf00ff08', border: '#bf00ff22', tag: 'ARTICLES / CLAIMS',
  },
  {
    to: '/scan/url', icon: Link2, label: 'URL Checker',
    color: '#00ff9f', bg: '#00ff9f08', border: '#00ff9f22', tag: 'LINKS / PHISHING',
  },
]

export default function Dashboard() {
  const { user, isConfigured } = useAuth()
  const { history, refreshHistory } = useScanHistory()
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    scamCount: 0,
    newsCount: 0,
    urlCount: 0,
    highRiskCount: 0,
  })
  const [chartData, setChartData] = useState([
    { name: 'Scam', value: 0, color: '#ff006e' },
    { name: 'Fake News', value: 0, color: '#bf00ff' },
    { name: 'URL', value: 0, color: '#00d4ff' },
  ])

  // Load real statistics from Supabase
  const loadStats = async () => {
    if (!user?.id) return
    setLoading(true)

    if (isConfigured) {
      const { stats: dbStats, distribution } = await getDashboardStats(user.id)
      setStats(dbStats)
      setChartData(distribution)
    } else {
      // Calculate from in-memory history when in offline/sandbox mode
      const completed = history.filter(s => s.result)
      const scamCount = completed.filter(s => s.type === 'SCAM').length
      const newsCount = completed.filter(s => s.type === 'NEWS').length
      const urlCount = completed.filter(s => s.type === 'URL').length
      const highRiskCount = completed.filter(s => s.result?.level === 'HIGH').length

      setStats({
        total: completed.length,
        scamCount,
        newsCount,
        urlCount,
        highRiskCount,
      })
      setChartData([
        { name: 'Scam', value: scamCount, color: '#ff006e' },
        { name: 'Fake News', value: newsCount, color: '#bf00ff' },
        { name: 'URL', value: urlCount, color: '#00d4ff' },
      ])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadStats()
  }, [user?.id, isConfigured, history.length])

  const recent = history.slice(0, 5)
  const hasScans = stats.total > 0

  const STAT_CARDS = [
    {
      label: 'Total Completed',
      value: stats.total,
      icon: TrendingUp,
      color: '#00d4ff',
      note: isConfigured ? 'from Supabase scans' : 'session scans',
    },
    {
      label: 'High-Risk Threats',
      value: stats.highRiskCount,
      icon: AlertTriangle,
      color: '#ff006e',
      note: 'score ≥ 70 / high risk',
    },
    {
      label: 'Scam Analyses',
      value: stats.scamCount,
      icon: MessageSquareWarning,
      color: '#ff006e',
      note: 'message & email checks',
    },
    {
      label: 'News Analyses',
      value: stats.newsCount,
      icon: Newspaper,
      color: '#bf00ff',
      note: 'claims & citations',
    },
    {
      label: 'URL Analyses',
      value: stats.urlCount,
      icon: Link2,
      color: '#00d4ff',
      note: 'phishing & safe domains',
    },
    {
      label: 'Clean / Safe',
      value: Math.max(0, stats.total - stats.highRiskCount),
      icon: ShieldCheck,
      color: '#00ff9f',
      note: 'low & medium threat',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex items-start justify-between mb-2 flex-wrap gap-4">
        <SectionHeader
          title="DASHBOARD"
          subtitle="// system status — real-time threat intelligence overview"
        />
        <button
          onClick={() => { refreshHistory(); loadStats() }}
          disabled={loading}
          className="btn-neon px-3 py-2 text-xs font-mono tracking-widest flex items-center gap-2"
          style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> REFRESH STATS
        </button>
      </div>

      {/* Backend connection banner */}
      <div
        className="mb-6 px-4 py-3 text-xs flex items-center justify-between gap-2 font-mono flex-wrap"
        style={{
          background: isConfigured ? '#00ff9f08' : '#00d4ff08',
          border: `1px solid ${isConfigured ? '#00ff9f22' : '#00d4ff22'}`,
          color: '#94a3b8',
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              background: isConfigured ? '#00ff9f' : '#00d4ff',
              boxShadow: `0 0 6px ${isConfigured ? '#00ff9f' : '#00d4ff'}`,
            }}
          />
          <span>
            {isConfigured ? (
              <>
                <strong style={{ color: '#00ff9f' }}>SUPABASE DATABASE ACTIVE</strong> — Displaying real query results isolated to your user ID via Row Level Security.
              </>
            ) : (
              <>
                <strong style={{ color: '#00d4ff' }}>STANDALONE SANDBOX</strong> — Connect Supabase in <code style={{ color: '#00ff9f' }}>.env</code> for persistent multi-device PostgreSQL storage.
              </>
            )}
          </span>
        </div>
        <span className="text-xs" style={{ color: '#4a6080' }}>
          USER: {user?.email || 'authenticated'}
        </span>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {QUICK_ACTIONS.map(a => (
          <Link
            key={a.to}
            to={a.to}
            className="card-hover p-5 flex items-center gap-4 group relative"
            style={{
              background: a.bg,
              border: `1px solid ${a.border}`,
              clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
              boxShadow: `0 0 20px ${a.color}08`,
            }}
          >
            <div
              className="w-12 h-12 flex items-center justify-center flex-shrink-0"
              style={{
                background: a.color + '12',
                border: `1px solid ${a.color}33`,
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
              }}
            >
              <a.icon size={22} style={{ color: a.color, filter: `drop-shadow(0 0 4px ${a.color})` }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm tracking-wide mb-1" style={{ color: a.color, textShadow: `0 0 8px ${a.color}44`, fontSize: '0.75rem' }}>
                {a.label}
              </p>
              <p className="text-xs font-mono" style={{ color: '#4a6080', letterSpacing: '0.06em' }}>{a.tag}</p>
              <p className="text-xs mt-1 font-mono" style={{ color: a.color + '88' }}>[ SCAN → ]</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Real Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {STAT_CARDS.map(s => (
          <Card key={s.label}>
            <div className="flex flex-col justify-between h-full">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-mono tracking-wider truncate" style={{ color: '#4a6080' }}>
                  {s.label.toUpperCase()}
                </span>
                <s.icon size={15} style={{ color: s.color, filter: `drop-shadow(0 0 4px ${s.color})` }} />
              </div>
              <div>
                <p className="font-display font-black text-2xl lg:text-3xl" style={{ color: s.color, textShadow: `0 0 14px ${s.color}66` }}>
                  {s.value}
                </p>
                <p className="text-xs mt-1 font-mono text-slate-500 truncate" style={{ fontSize: '0.65rem' }}>
                  // {s.note}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Real Scan Distribution Chart */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <span style={{ width: 2, height: 16, background: '#bf00ff', display: 'block', boxShadow: '0 0 8px #bf00ff' }} />
            <h2 className="font-display font-bold text-sm tracking-widest" style={{ color: '#e2e8f0', letterSpacing: '0.12em' }}>
              SCAN DISTRIBUTION
            </h2>
            <span className="font-mono text-xs ml-1" style={{ color: '#00ff9f88' }}>
              ({stats.total} total)
            </span>
          </div>

          {!hasScans ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center" style={{ background: '#bf00ff12', border: '1px solid #bf00ff33' }}>
                <Shield size={20} style={{ color: '#bf00ff' }} />
              </div>
              <p className="font-display text-xs tracking-wider" style={{ color: '#e2e8f0' }}>NO SCAN METRICS YET</p>
              <p className="font-mono text-xs text-slate-500 mt-1">// run scans to generate distribution analytics</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={chartData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={48} paddingAngle={4}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      style={{ filter: `drop-shadow(0 0 6px ${entry.color})` }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#090d1a',
                    border: '1px solid #00ff9f22',
                    borderRadius: 0,
                    color: '#e2e8f0',
                    fontSize: 12,
                    fontFamily: 'Share Tech Mono, monospace',
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: '#4a6080', fontSize: 11, fontFamily: 'Share Tech Mono, monospace' }}>
                      {value.toUpperCase()}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Real Recent scans */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span style={{ width: 2, height: 16, background: '#00ff9f', display: 'block', boxShadow: '0 0 8px #00ff9f' }} />
              <h2 className="font-display font-bold text-sm tracking-widest" style={{ color: '#e2e8f0', letterSpacing: '0.12em' }}>
                RECENT SCAN ACTIVITY
              </h2>
            </div>
            <Link
              to="/history"
              className="font-mono text-xs flex items-center gap-1 transition-all"
              style={{ color: '#00ff9f88', letterSpacing: '0.06em' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#00ff9f'; e.currentTarget.style.textShadow = '0 0 8px #00ff9f' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#00ff9f88'; e.currentTarget.style.textShadow = 'none' }}
            >
              VIEW ALL <ArrowRight size={11} />
            </Link>
          </div>

          {recent.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="NO SCANS RECORDED"
              description="// initiate an analysis using the quick action cards above"
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {recent.map(scan => (
                <li
                  key={scan.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                  style={{
                    background: '#050810',
                    border: '1px solid #00ff9f12',
                    clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
                  }}
                >
                  <span className="text-base flex-shrink-0">{scanTypeIcon(scan.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: '#94a3b8' }}>
                      {truncate(scan.input, 50)}
                    </p>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: '#4a6080' }}>
                      {scanTypeLabel(scan.type)} · {formatDateTime(scan.timestamp)}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 flex-shrink-0 font-mono tracking-widest"
                    style={{
                      color: riskColor(scan.result?.level || 'LOW'),
                      background: riskColor(scan.result?.level || 'LOW') + '15',
                      border: `1px solid ${riskColor(scan.result?.level || 'LOW')}33`,
                      textShadow: `0 0 8px ${riskColor(scan.result?.level || 'LOW')}66`,
                      clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
                    }}
                  >
                    {scan.result?.level || 'N/A'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
