import { Link } from 'react-router-dom'
import { Shield, MessageSquareWarning, Newspaper, Link2, ChevronRight, Lock, Zap, Eye, ArrowRight } from 'lucide-react'
import Navbar from '../components/Navbar.jsx'

const FEATURES = [
  {
    icon: MessageSquareWarning,
    title: 'Scam Detection',
    desc: 'Analyse suspicious SMS, WhatsApp messages, emails, and job offers for scam indicators.',
    color: '#F87171',
    bg: '#2B1616',
    border: '#F8717133',
    to: '/scan/scam',
  },
  {
    icon: Newspaper,
    title: 'Fake News Verification',
    desc: 'Check headlines, viral claims, and articles against known misinformation patterns.',
    color: '#818CF8',
    bg: '#1A1B2E',
    border: '#818CF833',
    to: '/scan/news',
  },
  {
    icon: Link2,
    title: 'URL Safety Check',
    desc: 'Inspect suspicious links for phishing patterns, typosquatting, and malicious indicators.',
    color: '#22D3EE',
    bg: '#0D2026',
    border: '#22D3EE33',
    to: '/scan/url',
  },
]

const STEPS = [
  { num: '01', title: 'Paste Content', desc: 'Enter a message, claim, or URL into the relevant scanner.' },
  { num: '02', title: 'AI Analysis', desc: 'The platform analyses the content for known risk patterns and indicators.' },
  { num: '03', title: 'Get Results', desc: 'Receive a risk score, warning signs, and actionable safety recommendations.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0B1020' }}>
      <Navbar />

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 md:py-32">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8"
          style={{ background: '#22D3EE15', border: '1px solid #22D3EE33', color: '#22D3EE' }}
        >
          <span className="w-1.5 h-1.5 rounded-full scan-pulse" style={{ background: '#22D3EE' }} />
          AI-Powered Threat Detection Platform
        </div>

        <h1 className="font-display font-bold text-5xl md:text-7xl leading-tight mb-6 max-w-3xl" style={{ color: '#F8FAFC' }}>
          Scam or{' '}
          <span style={{ background: 'linear-gradient(90deg,#22D3EE,#818CF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Safe?
          </span>
        </h1>

        <p className="text-lg md:text-xl font-medium mb-4 max-w-xl" style={{ color: '#94A3B8' }}>
          Think Before You Click. Verify Before You Believe.
        </p>
        <p className="text-sm md:text-base mb-10 max-w-2xl leading-relaxed" style={{ color: '#64748B' }}>
          Protect yourself from online scams, fake news, and dangerous URLs with AI-powered analysis.
          Instantly check messages, claims, and links before you act on them.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-all"
            style={{ background: 'linear-gradient(135deg,#22D3EE,#818CF8)', color: '#0B1020' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            Start Analyzing <ArrowRight size={18} />
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-all"
            style={{ background: '#182338', border: '1px solid #1E2D45', color: '#F8FAFC' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#22D3EE44'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1E2D45'}
          >
            Create Free Account
          </Link>
        </div>

        {/* Mini stats */}
        <div className="flex flex-wrap justify-center gap-8 mt-16">
          {[
            { val: '3', label: 'Detection Types' },
            { val: '100%', label: 'Privacy First' },
            { val: 'Day 1', label: 'Frontend Demo' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="font-display font-bold text-2xl" style={{ color: '#22D3EE' }}>{s.val}</div>
              <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Cards */}
      <section className="px-4 pb-20 max-w-6xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl md:text-4xl mb-3" style={{ color: '#F8FAFC' }}>Three Layers of Protection</h2>
          <p className="text-sm" style={{ color: '#94A3B8' }}>Choose a scanner or start with the dashboard to explore all tools.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <Link
              key={f.title}
              to={f.to}
              className="card-hover rounded-2xl p-6 flex flex-col gap-4 group"
              style={{ background: f.bg, border: `1px solid ${f.border}` }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: f.color + '22', border: `1px solid ${f.color}44` }}>
                <f.icon size={22} style={{ color: f.color }} />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg mb-2" style={{ color: '#F8FAFC' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{f.desc}</p>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium mt-auto" style={{ color: f.color }}>
                Try it now <ChevronRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-20 max-w-5xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl md:text-4xl mb-3" style={{ color: '#F8FAFC' }}>How It Works</h2>
          <p className="text-sm" style={{ color: '#94A3B8' }}>Three simple steps to protect yourself.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex flex-col gap-3">
              <div className="font-display font-bold text-5xl" style={{ color: '#22D3EE18' }}>{s.num}</div>
              <h3 className="font-semibold text-base" style={{ color: '#F8FAFC' }}>{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{s.desc}</p>
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Privacy section */}
      <section className="px-4 py-16 max-w-4xl mx-auto w-full">
        <div className="rounded-2xl p-8 text-center" style={{ background: '#182338', border: '1px solid #1E2D45' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: '#22D3EE18', border: '1px solid #22D3EE33' }}>
            <Lock size={24} style={{ color: '#22D3EE' }} />
          </div>
          <h2 className="font-display font-bold text-2xl mb-3" style={{ color: '#F8FAFC' }}>Your Privacy Matters</h2>
          <p className="text-sm leading-relaxed max-w-xl mx-auto" style={{ color: '#94A3B8' }}>
            Content you submit for analysis is processed locally or through secure channels.
            We do not store, sell, or share your messages. Your data stays yours.
            Full privacy and security policies will be published before the platform goes live.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mt-8">
            {[
              { icon: Lock, label: 'No Data Stored' },
              { icon: Eye, label: 'No Tracking' },
              { icon: Zap, label: 'Fast Analysis' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm" style={{ color: '#94A3B8' }}>
                <Icon size={16} style={{ color: '#22D3EE' }} /> {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 mt-auto" style={{ borderTop: '1px solid #1E2D45' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#22D3EE,#818CF8)' }}>
              <Shield size={13} className="text-white" />
            </div>
            <span className="font-display font-bold text-sm" style={{ color: '#F8FAFC' }}>
              Scam<span style={{ color: '#22D3EE' }}>or</span>Safe
            </span>
          </div>
          <p className="text-xs text-center" style={{ color: '#64748B' }}>
            Day 1 — Frontend Demo. No real AI analysis. Not for production use yet.
          </p>
          <div className="flex gap-6 text-xs" style={{ color: '#64748B' }}>
            <Link to="/dashboard" className="hover:text-[#94A3B8] transition-colors">Dashboard</Link>
            <Link to="/login" className="hover:text-[#94A3B8] transition-colors">Login</Link>
            <Link to="/settings" className="hover:text-[#94A3B8] transition-colors">Settings</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
