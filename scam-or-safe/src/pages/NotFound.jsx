import { Link } from 'react-router-dom'
import { Shield, Home, LayoutDashboard } from 'lucide-react'
import CyberBackgroundScene from '../components/CyberBackgroundScene.jsx'

export default function NotFound() {
  return (
    <div
      className="min-h-screen relative flex flex-col items-center justify-center px-4 text-center overflow-hidden"
      style={{ background: '#0D0830' }}
    >
      <CyberBackgroundScene mode="ambient" />

      <div className="relative z-10 tl-glass-strong rounded-3xl p-8 sm:p-10 max-w-md w-full flex flex-col items-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: 'rgba(111, 120, 255, 0.16)',
            border: '1px solid rgba(0, 229, 255, 0.35)',
          }}
        >
          <Shield size={30} className="text-[#00E5FF]" />
        </div>
        <h1 className="font-display font-bold text-5xl text-[#00E5FF] mb-2">404</h1>
        <h2 className="font-display font-bold text-xl text-[#F4F2FF] mb-2">Route Not Found</h2>
        <p className="text-sm text-[rgba(236,232,255,0.68)] mb-6">
          The page you requested does not exist or has been relocated within TrustLens AI.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/" className="tl-btn-primary text-xs px-5 py-2.5">
            <Home size={15} /> Go Home
          </Link>
          <Link to="/dashboard" className="tl-btn-ghost text-xs px-5 py-2.5">
            <LayoutDashboard size={15} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
