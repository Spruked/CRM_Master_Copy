import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthDialog } from '@/components/AuthDialog'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Sidebar } from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'
import SplashScreen from '@/components/layout/SplashScreen'
import Activities from '@/pages/Activities'
import Calendar from '@/pages/Calendar'
import Contacts from '@/pages/Contacts'
import Dashboard from '@/pages/Dashboard'
import Email from '@/pages/Email'
import OrbAssistant from '@/pages/OrbAssistant'
import Pipeline from '@/pages/Pipeline'
import { CRMProvider } from '@/providers/CRMProvider'

function App() {
  const [authOpen, setAuthOpen] = useState(false)
  const [showSplash, setShowSplash] = useState(() => sessionStorage.getItem('cali_splash_seen') !== '1')

  function completeSplash() {
    sessionStorage.setItem('cali_splash_seen', '1')
    setShowSplash(false)
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <CRMProvider>
          <AnimatePresence mode="wait">
            {showSplash ? <SplashScreen onComplete={completeSplash} /> : null}
          </AnimatePresence>
          <div className="flex h-screen overflow-hidden bg-[#0b0f2a] text-zinc-100">
            <Sidebar onTokenClick={() => setAuthOpen(true)} />
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar onTokenClick={() => setAuthOpen(true)} />
              <main className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#17306d_0%,#122757_38%,#0b0f2a_100%)] p-5">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/pipeline" element={<Pipeline />} />
                  <Route path="/email" element={<Email />} />
                  <Route path="/activities" element={<Activities />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/orb" element={<OrbAssistant />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </div>
          <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
        </CRMProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
