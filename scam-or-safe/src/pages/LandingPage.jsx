import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ArrowRight, ChevronRight, ArrowDown, ShieldCheck, Sparkles,
  Bot, Lock, Mail, CheckCircle2, X, Cpu, Database, Globe, Layers
} from 'lucide-react'
import Navbar, { TrustLensLogo } from '../components/Navbar.jsx'
import CyberBackgroundScene from '../components/CyberBackgroundScene.jsx'
import HeroRippleOverlay from '../components/HeroRippleOverlay.jsx'
import {
  FeatureSketchScam,
  FeatureSketchNews,
  FeatureSketchUrl,
  StepSketch,
  CTAShieldSketch,
} from '../components/CyberSketches.jsx'
import { checkBackendHealth } from '../services/scamService.js'
import { getUrlEngineHealth } from '../services/urlService.js'

const CAPABILITIES = [
  {
    id: 'scam',
    title: 'SCAM DETECTION',
    desc: 'Analyze suspicious SMS messages, WhatsApp conversations, emails, banking messages and fraudulent offers.',
    to: '/scan/scam',
    accent: '#FF5B78',
    Sketch: FeatureSketchScam,
    tag: 'SMS · WhatsApp · Email · Banking',
  },
  {
    id: 'news',
    title: 'FAKE NEWS VERIFICATION',
    desc: 'Extract claims, retrieve fact-checking evidence and compare supporting and contradicting sources.',
    to: '/scan/news',
    accent: '#A78BFA',
    Sketch: FeatureSketchNews,
    tag: 'Claims · Fact Check · Sources',
  },
  {
    id: 'url',
    title: 'URL SAFETY ANALYSIS',
    desc: 'Analyze URL structure, suspicious domains and known threat intelligence.',
    to: '/scan/url',
    accent: '#00E5FF',
    Sketch: FeatureSketchUrl,
    tag: 'RDAP · Safe Browsing · VirusTotal',
  },
]

const HOW_STEPS = [
  {
    num: '01',
    title: 'SUBMIT',
    desc: 'Submit a message, screenshot, article, audio file, video or URL.',
  },
  {
    num: '02',
    title: 'ANALYZE',
    desc: 'AI examines suspicious patterns, available threat intelligence and supporting evidence.',
  },
  {
    num: '03',
    title: 'UNDERSTAND',
    desc: 'Receive a risk assessment, explanations, evidence and recommended actions.',
  },
]

const HERO_SKETCH_CHIPS = [
  { label: 'Phishing Message', tag: 'OTP / KYC Lure', pos: 'top-6 left-4 md:left-0', accent: '#FF5B78' },
  { label: 'Suspicious URL', tag: 'Typosquatting Check', pos: 'top-16 right-2 md:right-0', accent: '#00E5FF' },
  { label: 'Fake News Article', tag: 'Claim Cross-Check', pos: 'bottom-20 left-2 md:left-4', accent: '#A78BFA' },
  { label: 'Security Lock', tag: 'Zero-Trust Inspection', pos: 'bottom-8 right-4 md:right-2', accent: '#5EE6A8' },
]

export default function LandingPage() {
  const prefersReduced = useReducedMotion()
  const [hoveredCap, setHoveredCap] = useState(null)
  const [modalDoc, setModalDoc] = useState(null) // 'privacy' | 'terms' | 'contact' | null
  const [health, setHealth] = useState({ ai: null, url: null })

  useEffect(() => {
    let active = true
    Promise.all([checkBackendHealth(), getUrlEngineHealth()])
      .then(([ai, url]) => {
        if (active) setHealth({ ai, url })
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const scrollToSection = (selector) => {
    const el = document.querySelector(selector)
    if (el) el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' })
  }

  const fadeUp = {
    hidden: prefersReduced ? { opacity: 1 } : { opacity: 0, y: 26 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
    },
  }

  return (
    <div className="min-h-screen relative text-[#F4F2FF] overflow-x-hidden">
      {/* 4-Layer Fixed Background Scene + 3D Crystal Shield */}
      <CyberBackgroundScene mode="landing" />

      {/* Fixed Translucent Glass Navbar */}
      <Navbar />

      {/* Foreground Content */}
      <main className="relative z-10">
        {/* ── 5. HERO SECTION ── */}
        <section
          id="hero"
          className="relative min-h-screen flex items-center pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
        >
          {/* Interactive WebGL / Canvas2D Mouse Ripple on Hero */}
          <HeroRippleOverlay active={!prefersReduced} />

          <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-10 items-center relative z-10">
            {/* Left Copy & CTAs */}
            <div className="lg:col-span-7 space-y-7">
              <motion.div
                initial={prefersReduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full tl-glass text-xs font-mono tracking-wider text-[#00E5FF]"
              >
                <span className="w-2 h-2 rounded-full bg-[#00E5FF] scan-pulse" />
                TRUSTLENS AI // CYBER INTELLIGENCE PLATFORM
              </motion.div>

              <div className="space-y-2 overflow-hidden">
                <motion.h1
                  initial={prefersReduced ? false : { opacity: 0, y: 34 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="font-display font-bold text-4xl sm:text-5xl md:text-6xl lg:text-[4.15rem] leading-[1.06] tracking-tight text-[#F4F2FF]"
                >
                  THE INTERNET IS FULL OF TRAPS.
                </motion.h1>
                <motion.p
                  initial={prefersReduced ? false : { opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.72, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                  className="font-display font-bold text-3xl sm:text-5xl md:text-6xl lg:text-[4.15rem] leading-[1.08] tracking-tight tl-violet-cyan-text"
                >
                  SEE THROUGH THEM.
                </motion.p>
              </div>

              <motion.p
                initial={prefersReduced ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.26 }}
                className="text-base sm:text-lg md:text-xl text-[rgba(236,232,255,0.78)] max-w-2xl leading-relaxed"
              >
                One intelligent platform to detect scams, verify information and protect your digital world.
              </motion.p>

              <motion.div
                initial={prefersReduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.36 }}
                className="flex flex-wrap items-center gap-4 pt-2"
              >
                <Link to="/dashboard" className="tl-btn-primary px-7 py-3.5 text-sm sm:text-base font-display">
                  Start Scanning <ArrowRight size={18} />
                </Link>
                <button
                  type="button"
                  onClick={() => scrollToSection('#features')}
                  className="tl-btn-ghost px-7 py-3.5 text-sm sm:text-base font-display"
                >
                  Explore Platform
                </button>
              </motion.div>

              {/* Quick Suite Pills */}
              <motion.div
                initial={prefersReduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.48 }}
                className="flex flex-wrap items-center gap-3 pt-2 text-xs text-[rgba(236,232,255,0.72)]"
              >
                <Link
                  to="/scan/multimodal"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full tl-glass hover:border-[#00E5FF]/50 transition-colors"
                >
                  <Sparkles size={13} className="text-[#00E5FF]" /> Multimodal Analyzer
                </Link>
                <Link
                  to="/chat"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full tl-glass hover:border-[#A78BFA]/50 transition-colors"
                >
                  <Bot size={13} className="text-[#A78BFA]" /> TrustLens AI Assistant
                </Link>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#17113D]/40 border border-[rgba(196,178,255,0.12)]">
                  <Lock size={12} className="text-[#5EE6A8]" /> English · ಕನ್ನಡ · हिंदी
                </span>
              </motion.div>
            </div>

            {/* Right: Visual Frame Around the Live 3D Crystal Shield + Sketch Annotations */}
            <div className="lg:col-span-5 relative h-[320px] sm:h-[400px] lg:h-[460px] flex items-center justify-center pointer-events-none">
              {/* Subtle radial aura behind the 3D shield */}
              <div
                className="w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-45"
                style={{
                  background:
                    'radial-gradient(circle, rgba(0,229,255,0.28) 0%, rgba(111,120,255,0.22) 48%, transparent 74%)',
                }}
              />

              {/* Hand-drawn floating security sketch callouts around the 3D shield */}
              {HERO_SKETCH_CHIPS.map((chip, idx) => (
                <motion.div
                  key={chip.label}
                  initial={prefersReduced ? false : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 + idx * 0.1, duration: 0.45 }}
                  className={`absolute ${chip.pos} px-3.5 py-2 rounded-xl tl-glass hidden sm:flex items-center gap-2.5`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: chip.accent, boxShadow: `0 0 10px ${chip.accent}` }}
                  />
                  <div>
                    <p className="font-display text-xs font-semibold text-[#F4F2FF]">{chip.label}</p>
                    <p className="font-mono text-[10px] text-[rgba(236,232,255,0.65)]">{chip.tag}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Floating Scroll Card at Bottom-Right */}
          <motion.button
            type="button"
            onClick={() => scrollToSection('#intro')}
            initial={prefersReduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            whileHover={prefersReduced ? undefined : { y: -3 }}
            className="hidden sm:flex items-center gap-3 px-4 py-3 rounded-2xl tl-glass absolute bottom-8 right-6 lg:right-10 cursor-pointer group z-20"
          >
            <div className="text-left">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#00E5FF]">Scroll Down</p>
              <p className="text-xs font-medium text-[#F4F2FF]">Explore the future of digital trust</p>
            </div>
            <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#6F78FF]/20 border border-[rgba(196,178,255,0.25)] group-hover:border-[#00E5FF]/60 transition-colors">
              <ArrowDown size={15} className="text-[#00E5FF]" />
            </span>
          </motion.button>
        </section>

        {/* ── 6. INTRODUCTION SECTION ── */}
        <section id="intro" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            className="grid lg:grid-cols-12 gap-12 items-start"
          >
            <div className="lg:col-span-6 space-y-5">
              <p className="font-mono text-xs tracking-[0.2em] uppercase text-[#00E5FF]">
                // DIGITAL TRUST REIMAGINED
              </p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl leading-tight text-[#F4F2FF]">
                Trust should never be a guessing game.
              </h2>
              <p className="text-base sm:text-lg text-[rgba(236,232,255,0.74)] leading-relaxed">
                Digital threats are becoming harder to recognize. TrustLens AI brings intelligent detection,
                evidence-based verification and cybersecurity guidance into one unified experience.
              </p>
            </div>

            <div className="lg:col-span-6 space-y-4">
              {[
                { num: '01', text: 'Detect suspicious messages.', color: '#FF5B78' },
                { num: '02', text: 'Verify information with evidence.', color: '#A78BFA' },
                { num: '03', text: 'Analyze potentially dangerous URLs.', color: '#00E5FF' },
              ].map((item, idx) => (
                <motion.div
                  key={item.num}
                  initial={prefersReduced ? false : { opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: idx * 0.12, duration: 0.5 }}
                  className="tl-glass-card p-5 sm:p-6 flex items-center gap-5 card-hover"
                >
                  <span
                    className="font-display font-bold text-2xl sm:text-3xl tracking-tight flex-shrink-0"
                    style={{ color: item.color }}
                  >
                    {item.num}
                  </span>
                  <div className="h-8 w-px bg-[rgba(196,178,255,0.16)]" />
                  <p className="font-display font-semibold text-lg sm:text-xl text-[#F4F2FF]">
                    {item.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── 7. PRODUCT CAPABILITIES ── */}
        <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="text-center max-w-2xl mx-auto mb-14 space-y-3"
          >
            <p className="font-mono text-xs tracking-[0.2em] uppercase text-[#00E5FF]">
              // CORE CAPABILITIES
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-[#F4F2FF]">
              Three Core Defense Engines
            </h2>
            <p className="text-sm sm:text-base text-[rgba(236,232,255,0.72)]">
              Purpose-built intelligence modules working alongside multimodal consensus and live threat feeds.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-7">
            {CAPABILITIES.map((cap, i) => {
              const Sketch = cap.Sketch
              const isHovered = hoveredCap === cap.id
              return (
                <motion.div
                  key={cap.id}
                  initial={prefersReduced ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: i * 0.1, duration: 0.55 }}
                  onMouseEnter={() => setHoveredCap(cap.id)}
                  onMouseLeave={() => setHoveredCap(null)}
                  className="tl-glass-card p-6 sm:p-7 flex flex-col gap-5 card-hover group"
                >
                  <div
                    className="rounded-2xl p-4 flex items-center justify-center relative overflow-hidden"
                    style={{
                      background: 'rgba(13, 8, 48, 0.55)',
                      border: '1px solid rgba(196, 178, 255, 0.14)',
                    }}
                  >
                    <Sketch hovered={isHovered} />
                  </div>

                  <div className="space-y-2.5 flex-1">
                    <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: cap.accent }}>
                      {cap.tag}
                    </span>
                    <h3 className="font-display font-bold text-xl text-[#F4F2FF] tracking-wide">
                      {cap.title}
                    </h3>
                    <p className="text-sm text-[rgba(236,232,255,0.74)] leading-relaxed">
                      {cap.desc}
                    </p>
                  </div>

                  <Link
                    to={cap.to}
                    className="inline-flex items-center gap-2 text-sm font-display font-semibold pt-2 transition-colors"
                    style={{ color: cap.accent }}
                  >
                    Launch Analyzer
                    <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              )
            })}
          </div>

          {/* Secondary Suite Bar: Multimodal + Assistant + Community */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-8 grid sm:grid-cols-3 gap-4"
          >
            {[
              {
                to: '/scan/multimodal',
                title: 'Multimodal AI Analyzer',
                desc: 'Inspect text, screenshots, QR codes, audio voice notes, and MP4 videos.',
                color: '#00E5FF',
              },
              {
                to: '/chat',
                title: 'TrustLens AI Assistant',
                desc: '24/7 cyber triage in English, Kannada & Hindi with scan history context.',
                color: '#A78BFA',
              },
              {
                to: '/community',
                title: 'Community Intelligence',
                desc: 'Explore verified user scam reports and submit new threat alerts.',
                color: '#5EE6A8',
              },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="tl-glass rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-[rgba(0,229,255,0.38)] transition-all group"
              >
                <div>
                  <h4 className="font-display font-semibold text-sm text-[#F4F2FF] mb-1">{item.title}</h4>
                  <p className="text-xs text-[rgba(236,232,255,0.68)] leading-relaxed">{item.desc}</p>
                </div>
                <ArrowRight
                  size={16}
                  style={{ color: item.color }}
                  className="flex-shrink-0 transition-transform group-hover:translate-x-1"
                />
              </Link>
            ))}
          </motion.div>
        </section>

        {/* ── 8. HOW IT WORKS ── */}
        <section id="how-it-works" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="text-center max-w-2xl mx-auto mb-16 space-y-3"
          >
            <p className="font-mono text-xs tracking-[0.2em] uppercase text-[#00E5FF]">
              // WORKFLOW ARCHITECTURE
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-[#F4F2FF]">
              How TrustLens Works
            </h2>
            <p className="text-sm sm:text-base text-[rgba(236,232,255,0.72)]">
              Transparent multi-layered threat reasoning in three deliberate steps.
            </p>
          </motion.div>

          <div className="relative grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Animated connecting line on desktop */}
            <svg
              viewBox="0 0 900 40"
              fill="none"
              className="hidden md:block absolute top-14 left-[16%] w-[68%] h-10 pointer-events-none"
              aria-hidden="true"
            >
              <motion.path
                d="M10 20 H890"
                stroke="url(#howLineGrad)"
                strokeWidth="2"
                strokeDasharray="6 6"
                initial={prefersReduced ? false : { pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
              />
              <defs>
                <linearGradient id="howLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6F78FF" />
                  <stop offset="50%" stopColor="#A78BFA" />
                  <stop offset="100%" stopColor="#00E5FF" />
                </linearGradient>
              </defs>
            </svg>

            {HOW_STEPS.map((s, idx) => (
              <motion.div
                key={s.num}
                initial={prefersReduced ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ delay: idx * 0.14, duration: 0.5 }}
                className="tl-glass-card p-6 sm:p-7 relative z-10 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs px-3 py-1 rounded-full bg-[#6F78FF]/18 border border-[rgba(196,178,255,0.22)] text-[#8D94FF]">
                    STEP {s.num}
                  </span>
                  <StepSketch step={idx + 1} />
                </div>
                <h3 className="font-display font-bold text-xl text-[#F4F2FF] tracking-wide">
                  {s.num} — {s.title}
                </h3>
                <p className="text-sm text-[rgba(236,232,255,0.74)] leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── 16. PACKAGES & TECHNOLOGY SECTION ── */}
        <section id="technology" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="text-center max-w-3xl mx-auto mb-14 space-y-3"
          >
            <p className="font-mono text-xs tracking-[0.2em] uppercase text-[#00E5FF]">
              // SYSTEM ARCHITECTURE
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl text-[#F4F2FF]">
              Built on Transparent Cyber Stack
            </h2>
            <p className="text-sm sm:text-base text-[rgba(236,232,255,0.72)]">
              Every prediction is grounded in live API checks, deterministic rules, and multi-provider consensus.
              Unavailable or unconfigured providers are always labeled transparently.
            </p>
          </motion.div>

          {/* Architecture Flow Pipeline */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="tl-glass-card p-6 sm:p-8 mb-8 overflow-x-auto"
          >
            <p className="font-mono text-[11px] uppercase tracking-widest text-[#A78BFA] mb-5">
              LIVE REQUEST TELEMETRY PIPELINE
            </p>
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {[
                { label: 'User Input', sub: 'Text / URL / Media' },
                { label: 'Frontend', sub: 'React + Vite + Tailwind' },
                { label: 'Flask API', sub: 'Python Orchestrator' },
                { label: 'AI & Threat Intel', sub: 'Gemini · Groq · Mistral · GSB · VT' },
                { label: 'Supabase', sub: 'PostgreSQL + RLS' },
                { label: 'Results', sub: 'Evidence & Risk Gauge' },
              ].map((node, idx, arr) => (
                <div key={node.label} className="flex flex-col lg:flex-row items-center gap-3 flex-1">
                  <div className="w-full lg:w-auto flex-1 px-4 py-3 rounded-xl bg-[#0D0830]/75 border border-[rgba(196,178,255,0.18)] text-center">
                    <p className="font-display font-semibold text-sm text-[#F4F2FF]">{node.label}</p>
                    <p className="font-mono text-[10px] text-[#00E5FF] mt-0.5">{node.sub}</p>
                  </div>
                  {idx < arr.length - 1 && (
                    <ArrowRight size={16} className="text-[#8D94FF] rotate-90 lg:rotate-0 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Stack Cards with Honest Live Provider Status */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                icon: Layers,
                layer: 'Frontend',
                stack: 'React, Vite, Tailwind CSS',
                status: 'Active',
                ok: true,
              },
              {
                icon: Cpu,
                layer: 'Backend',
                stack: 'Python, Flask',
                status: health.ai?.status === 'offline' ? 'Offline' : health.ai ? 'Connected' : 'Checking…',
                ok: health.ai && health.ai.status !== 'offline',
              },
              {
                icon: Database,
                layer: 'Database & Auth',
                stack: 'Supabase, PostgreSQL',
                status: health.url?.supabase_connected ? 'RLS Active' : 'Configured via Env',
                ok: Boolean(health.url?.supabase_connected),
              },
              {
                icon: Sparkles,
                layer: 'AI Consensus',
                stack: 'Google Gemini, Groq, Mistral',
                status: health.ai?.any_ai_configured ? 'Providers Ready' : 'Check Backend .env',
                ok: Boolean(health.ai?.any_ai_configured),
              },
              {
                icon: Globe,
                layer: 'Threat Intelligence',
                stack: 'Safe Browsing & VirusTotal',
                status:
                  health.url?.providers?.google_safe_browsing?.configured ||
                  health.url?.providers?.virustotal?.configured
                    ? 'APIs Configured'
                    : 'Check Backend .env',
                ok: Boolean(
                  health.url?.providers?.google_safe_browsing?.configured ||
                    health.url?.providers?.virustotal?.configured
                ),
              },
            ].map((card) => (
              <div key={card.layer} className="tl-glass-card p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <card.icon size={18} className="text-[#00E5FF]" />
                  <span
                    className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      color: card.ok ? '#5EE6A8' : '#FFBF69',
                      background: card.ok ? 'rgba(94,230,168,0.12)' : 'rgba(255,191,105,0.12)',
                      border: `1px solid ${card.ok ? 'rgba(94,230,168,0.3)' : 'rgba(255,191,105,0.3)'}`,
                    }}
                  >
                    {card.status}
                  </span>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-[rgba(236,232,255,0.6)]">
                    {card.layer}
                  </p>
                  <h3 className="font-display font-semibold text-sm text-[#F4F2FF] mt-1">{card.stack}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── ABOUT TRUSTLENS SECTION ── */}
        <section id="about" className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            className="tl-glass-card p-7 sm:p-10 text-center space-y-5"
          >
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-[#6F78FF]/18 border border-[rgba(196,178,255,0.28)]">
              <ShieldCheck size={26} className="text-[#00E5FF]" />
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#F4F2FF]">
              Privacy-First Cyber Intelligence
            </h2>
            <p className="text-sm sm:text-base text-[rgba(236,232,255,0.74)] max-w-2xl mx-auto leading-relaxed">
              TrustLens AI treats every submitted message, file, and link as untrusted data. API keys stay strictly
              on the Flask backend, URL redirects are inspected under SSRF protection without auto-opening targets,
              and your scan records are isolated to your account through Supabase Row Level Security.
            </p>
            <div className="flex flex-wrap justify-center gap-6 pt-2 text-xs font-mono text-[rgba(236,232,255,0.78)]">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#5EE6A8]" /> Server-Side Secret Isolation
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#5EE6A8]" /> SSRF Redirect Guard
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-[#5EE6A8]" /> Honest Evidence Boundaries
              </span>
            </div>
          </motion.div>
        </section>

        {/* ── 17. CALL TO ACTION ── */}
        <section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Large Translucent Shield Behind CTA */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <CTAShieldSketch className="w-[340px] sm:w-[460px] h-auto opacity-75" />
          </div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            className="max-w-4xl mx-auto text-center relative z-10 space-y-6"
          >
            <p className="font-mono text-xs tracking-[0.22em] uppercase text-[#00E5FF]">
              // READY FOR VERIFICATION
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-5xl md:text-6xl tracking-tight text-[#F4F2FF] leading-[1.08]">
              MAKE EVERY CLICK A SMARTER DECISION.
            </h2>
            <p className="text-base sm:text-lg text-[rgba(236,232,255,0.78)] max-w-xl mx-auto">
              Understand what you trust. Protect what matters.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-3">
              <Link to="/register" className="tl-btn-primary px-8 py-4 text-sm sm:text-base font-display">
                Start Protecting Yourself <ArrowRight size={18} />
              </Link>
              <Link to="/dashboard" className="tl-btn-ghost px-8 py-4 text-sm sm:text-base font-display">
                Explore TrustLens AI
              </Link>
            </div>
          </motion.div>
        </section>

        {/* ── 18. FOOTER ── */}
        <footer className="relative border-t border-[rgba(196,178,255,0.14)] pt-14 pb-8 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#08041E]/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-12 gap-10 pb-12 border-b border-[rgba(196,178,255,0.12)]">
              <div className="md:col-span-5 space-y-3">
                <TrustLensLogo />
                <p className="text-sm text-[rgba(236,232,255,0.74)] font-medium">
                  See Beyond. Verify Everything. Stay Safe.
                </p>
                <p className="text-xs text-[rgba(236,232,255,0.55)] max-w-sm leading-relaxed">
                  Unified multimodal digital trust and cyber intelligence platform for scam defense,
                  evidence-grounded fact checking, and URL threat inspection.
                </p>
              </div>

              <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
                <div className="space-y-2.5">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-[#00E5FF]">Platform</p>
                  <ul className="space-y-2 text-xs text-[rgba(236,232,255,0.72)]">
                    <li><a href="#hero" className="hover:text-[#F4F2FF] transition-colors">Home</a></li>
                    <li><a href="#features" className="hover:text-[#F4F2FF] transition-colors">Features</a></li>
                    <li><a href="#about" className="hover:text-[#F4F2FF] transition-colors">About</a></li>
                  </ul>
                </div>
                <div className="space-y-2.5">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-[#00E5FF]">Analyzers</p>
                  <ul className="space-y-2 text-xs text-[rgba(236,232,255,0.72)]">
                    <li><Link to="/scan/scam" className="hover:text-[#F4F2FF] transition-colors">Scam Detection</Link></li>
                    <li><Link to="/scan/news" className="hover:text-[#F4F2FF] transition-colors">Fake News Verification</Link></li>
                    <li><Link to="/scan/url" className="hover:text-[#F4F2FF] transition-colors">URL Safety</Link></li>
                    <li><Link to="/chat" className="hover:text-[#F4F2FF] transition-colors">AI Assistant</Link></li>
                  </ul>
                </div>
                <div className="space-y-2.5">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-[#00E5FF]">Legal & Help</p>
                  <ul className="space-y-2 text-xs text-[rgba(236,232,255,0.72)]">
                    <li>
                      <button type="button" onClick={() => setModalDoc('contact')} className="hover:text-[#F4F2FF] transition-colors cursor-pointer">
                        Contact
                      </button>
                    </li>
                    <li>
                      <button type="button" onClick={() => setModalDoc('privacy')} className="hover:text-[#F4F2FF] transition-colors cursor-pointer">
                        Privacy Policy
                      </button>
                    </li>
                    <li>
                      <button type="button" onClick={() => setModalDoc('terms')} className="hover:text-[#F4F2FF] transition-colors cursor-pointer">
                        Terms
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[rgba(236,232,255,0.52)]">
              <span>© {new Date().getFullYear()} TrustLens AI. All security checks are advisory assessments.</span>
              <span className="font-mono">See Beyond. Verify Everything. Stay Safe.</span>
            </div>

            {/* Large Ghosted TRUSTLENS Wordmark */}
            <div className="mt-8 select-none pointer-events-none text-center overflow-hidden" aria-hidden="true">
              <p
                className="font-display font-bold tracking-[0.14em] leading-none text-[3.4rem] sm:text-[6.2rem] md:text-[8.8rem] lg:text-[11rem]"
                style={{
                  background: 'linear-gradient(180deg, rgba(141,148,255,0.2) 0%, rgba(13,8,48,0) 88%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                TRUSTLENS
              </p>
            </div>
          </div>
        </footer>
      </main>

      {/* Lightweight Info Modal for Contact / Privacy Policy / Terms */}
      <AnimatePresence>
        {modalDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setModalDoc(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="tl-glass-strong rounded-2xl max-w-lg w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[rgba(196,178,255,0.15)] pb-3">
                <h3 className="font-display font-bold text-lg text-[#F4F2FF] capitalize">
                  {modalDoc === 'privacy' ? 'Privacy Policy' : modalDoc === 'terms' ? 'Terms of Use' : 'Contact TrustLens AI'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalDoc(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-[rgba(236,232,255,0.72)] cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {modalDoc === 'privacy' && (
                <p className="text-sm text-[rgba(236,232,255,0.78)] leading-relaxed">
                  TrustLens AI stores authenticated user scan records strictly under your Supabase user ID using
                  PostgreSQL Row Level Security (RLS). Uploaded media is processed ephemerally for analysis, and
                  TrustLens never requests or stores OTPs, passwords, or banking credentials.
                </p>
              )}
              {modalDoc === 'terms' && (
                <p className="text-sm text-[rgba(236,232,255,0.78)] leading-relaxed">
                  Risk scores (0–100) and verdicts provided by TrustLens AI are explainable threat assessments, not
                  scientifically validated probabilities or guarantees. Always verify financial transactions through
                  official institutional channels before acting.
                </p>
              )}
              {modalDoc === 'contact' && (
                <div className="space-y-3 text-sm text-[rgba(236,232,255,0.78)]">
                  <p className="flex items-center gap-2">
                    <Mail size={16} className="text-[#00E5FF]" />
                    Security & Research Inquiries: <span className="font-mono text-[#F4F2FF]">security@trustlens.ai</span>
                  </p>
                  <p className="text-xs text-[rgba(236,232,255,0.62)]">
                    For active Indian cyber financial fraud emergencies, dial <strong>1930</strong> or report at{' '}
                    <span className="text-[#00E5FF]">cybercrime.gov.in</span> immediately.
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
