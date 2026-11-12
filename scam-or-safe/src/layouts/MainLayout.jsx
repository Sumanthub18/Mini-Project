import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import MobileNav from '../components/MobileNav.jsx'
import CyberBackgroundScene from '../components/CyberBackgroundScene.jsx'
import FloatingAssistant from '../components/FloatingAssistant.jsx'

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen relative overflow-x-clip" style={{ background: '#0D0830', color: '#F4F2FF' }}>
      <CyberBackgroundScene mode="ambient" />
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <MobileNav />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <FloatingAssistant />
    </div>
  )
}
