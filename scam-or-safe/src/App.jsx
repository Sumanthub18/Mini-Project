import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './hooks/useToast.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ScanHistoryProvider } from './hooks/useScanHistory.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import MainLayout from './layouts/MainLayout.jsx'
import LandingPage from './pages/LandingPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ScamScanner from './pages/ScamScanner.jsx'
import FakeNewsChecker from './pages/FakeNewsChecker.jsx'
import URLChecker from './pages/URLChecker.jsx'
import MultimodalAnalyzer from './pages/MultimodalAnalyzer.jsx'
import TrustLensChatbot from './pages/TrustLensChatbot.jsx'
import ModelComparison from './pages/ModelComparison.jsx'
import ScanHistory from './pages/ScanHistory.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Settings from './pages/Settings.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ScanHistoryProvider>
          <Routes>
            {/* Public routes without sidebar layout */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Authenticated routes protected by ProtectedRoute */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/scan/multimodal" element={<MultimodalAnalyzer />} />
              <Route path="/chat" element={<TrustLensChatbot />} />
              <Route path="/scan/scam" element={<ScamScanner />} />
              <Route path="/scan/news" element={<FakeNewsChecker />} />
              <Route path="/scan/url" element={<URLChecker />} />
              <Route path="/scan/compare" element={<ModelComparison />} />
              <Route path="/history" element={<ScanHistory />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </ScanHistoryProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
