import { useEffect, useRef } from 'react'
import HoloShield3D from './HoloShield3D.jsx'
import {
  SketchShieldOutline,
  SketchBrowserWindow,
  SketchMagnifyingGlass,
  SketchLockKey,
  SketchCircuitBoard,
  SketchAIBrain,
  SketchMessageFlow,
} from './CyberSketches.jsx'

/**
 * Global 4-Layer Fixed Background Scene:
 * - Layer 1: Hero cyber blueprint sketch environment (#0D0830 -> #100B35)
 * - Layer 2: Scroll-activated violet transition gradient
 * - Layer 3: Night cyber starfield & network connections near CTA/footer
 * - Layer 4: 3D Holographic Crystal Shield (Three.js + WebGL/SVG fallback)
 */
export default function CyberBackgroundScene({ mode = 'landing' }) {
  const scrollProgressRef = useRef(0)
  const layer1Ref = useRef(null)
  const layer2Ref = useRef(null)
  const layer3Ref = useRef(null)
  const sketchWrapRef = useRef(null)

  useEffect(() => {
    let rafId = null

    const updateScrollLayers = () => {
      rafId = null
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const p = Math.min(1, Math.max(0, window.scrollY / maxScroll))
      scrollProgressRef.current = p

      // Smooth crossfades and gentle background zoom/parallax (Nectarline choreography)
      if (layer2Ref.current) {
        const violetAlpha = mode === 'landing'
          ? Math.min(1, Math.max(0, (p - 0.08) / 0.25))
          : 0.72
        layer2Ref.current.style.opacity = String(violetAlpha)
      }

      if (layer3Ref.current) {
        const nightAlpha = mode === 'landing'
          ? Math.min(1, Math.max(0, (p - 0.62) / 0.28))
          : 0.22
        layer3Ref.current.style.opacity = String(nightAlpha)
      }

      if (sketchWrapRef.current && mode === 'landing') {
        const zoom = 1 + p * 0.06
        const shiftY = -p * 36
        sketchWrapRef.current.style.transform = `translate3d(0, ${shiftY}px, 0) scale(${zoom})`
        sketchWrapRef.current.style.opacity = String(Math.max(0.28, 1 - p * 0.55))
      }
    }

    const onScroll = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(updateScrollLayers)
      }
    }

    updateScrollLayers()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [mode])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Layer 1 — Hero Base Cyber Environment */}
      <div
        ref={layer1Ref}
        className="absolute inset-0 tl-blueprint-grid"
        style={{
          backgroundColor: '#0D0830',
          backgroundImage:
            'radial-gradient(ellipse 75% 55% at 72% 24%, rgba(111, 120, 255, 0.16), transparent 70%), radial-gradient(ellipse 60% 50% at 18% 72%, rgba(0, 229, 255, 0.09), transparent 70%)',
        }}
      />

      {/* Layer 1B — Hand-Drawn Technical Blueprint Sketches */}
      <div
        ref={sketchWrapRef}
        className="absolute inset-0 transition-opacity duration-300 will-change-transform"
      >
        {/* Top-left AI Brain & Circuit */}
        <div className="absolute top-16 left-4 md:left-12 w-40 md:w-52 opacity-[0.11] tl-float-slow">
          <SketchAIBrain className="w-full h-auto" />
        </div>

        {/* Mid-left Browser Window */}
        <div className="hidden md:block absolute top-[38%] left-6 w-60 opacity-[0.09] tl-float-alt">
          <SketchBrowserWindow className="w-full h-auto" />
        </div>

        {/* Bottom-left Message Flow */}
        <div className="hidden lg:block absolute bottom-14 left-12 w-72 opacity-[0.10] tl-float-slow">
          <SketchMessageFlow className="w-full h-auto" />
        </div>

        {/* Top-center/right Circuit Board */}
        <div className="hidden md:block absolute top-20 right-[34%] w-64 opacity-[0.09] tl-float-alt">
          <SketchCircuitBoard className="w-full h-auto" />
        </div>

        {/* Right Lock & Key */}
        <div className="hidden sm:block absolute bottom-[22%] right-8 md:right-16 w-44 md:w-52 opacity-[0.10] tl-float-slow">
          <SketchLockKey className="w-full h-auto" />
        </div>

        {/* Subtle Shield & Magnifying Glass */}
        <div className="hidden lg:block absolute top-[55%] right-[36%] w-40 opacity-[0.08] tl-float-alt">
          <SketchMagnifyingGlass className="w-full h-auto" />
        </div>
        <div className="absolute top-[12%] right-6 w-32 md:w-44 opacity-[0.08] tl-float-slow">
          <SketchShieldOutline className="w-full h-auto" />
        </div>

        {/* Subtle hand-drawn network connecting lines */}
        <svg viewBox="0 0 1440 900" fill="none" className="w-full h-full opacity-[0.07]">
          <path d="M120 180 L480 240 L860 150 L1240 290" stroke="#8D94FF" strokeWidth="1" strokeDasharray="6 8" />
          <path d="M220 620 L610 540 L980 680 L1320 510" stroke="#00E5FF" strokeWidth="1" strokeDasharray="4 8" />
          <circle cx="480" cy="240" r="4" stroke="#00E5FF" strokeWidth="1.2" />
          <circle cx="860" cy="150" r="4" stroke="#8D94FF" strokeWidth="1.2" />
          <circle cx="610" cy="540" r="4" stroke="#A78BFA" strokeWidth="1.2" />
          <circle cx="980" cy="680" r="4" stroke="#00E5FF" strokeWidth="1.2" />
        </svg>
      </div>

      {/* Layer 2 — Violet Scroll Transition Gradient */}
      <div
        ref={layer2Ref}
        className="absolute inset-0 will-change-[opacity]"
        style={{
          opacity: mode === 'landing' ? 0 : 0.72,
          background: 'linear-gradient(180deg, #160C40 0%, #0F0832 50%, #0B0626 100%)',
        }}
      />

      {/* Layer 3 — Night Cyber Scene (CTA & Footer Crossfade) */}
      <div
        ref={layer3Ref}
        className="absolute inset-0 will-change-[opacity]"
        style={{
          opacity: mode === 'landing' ? 0 : 0.22,
          background:
            'radial-gradient(ellipse 80% 60% at 50% 80%, rgba(111, 120, 255, 0.14), rgba(7, 4, 24, 0.96) 72%)',
        }}
      >
        {/* Subtle cyber starfield & constellation network */}
        <svg viewBox="0 0 1440 900" fill="none" className="w-full h-full opacity-55">
          {[
            [140, 140, 1.5], [320, 260, 1], [540, 110, 1.8], [760, 210, 1.2],
            [1020, 160, 1.6], [1260, 240, 1.2], [240, 520, 1.4], [480, 660, 1.1],
            [820, 590, 1.8], [1160, 690, 1.5], [1340, 480, 1.2], [650, 420, 1.4],
          ].map(([cx, cy, r], idx) => (
            <circle key={idx} cx={cx} cy={cy} r={r} fill={idx % 2 === 0 ? '#00E5FF' : '#C4B2FF'} opacity="0.6" />
          ))}
          <path
            d="M140 140 L320 260 L540 110 L760 210 L1020 160 L1260 240 M240 520 L480 660 L820 590 L1160 690 L1340 480"
            stroke="rgba(141, 148, 255, 0.2)"
            strokeWidth="0.9"
            strokeDasharray="4 6"
          />
        </svg>
      </div>

      {/* Layer 4 — 3D Holographic Crystal Security Shield */}
      <HoloShield3D
        scrollProgressRef={scrollProgressRef}
        variant={mode === 'landing' ? 'hero' : 'ambient'}
      />
    </div>
  )
}

