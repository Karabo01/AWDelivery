import { BrowserRouter, Route, Routes } from 'react-router-dom'

import Navbar from '@/components/shared/Navbar'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import AdminPage from '@/pages/admin/AdminPage'
import DashboardPage from '@/pages/DashboardPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import NewOrderPage from '@/pages/NewOrderPage'
import RegisterPage from '@/pages/RegisterPage'
import TrackingPage from '@/pages/TrackingPage'

function App() {
  return (
    <BrowserRouter>
      <div className="relative isolate min-h-screen overflow-x-hidden bg-background text-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-primary/10 via-transparent to-transparent"
        />
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
        </Routes>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <Routes>
            <Route path="/" element={null} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/order/new"
              element={
                <ProtectedRoute>
                  <NewOrderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/track/:trackingNumber" element={<TrackingPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>

        <footer className="bg-[#171513] px-6 py-14 text-[#c8c3bf] sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-3xl flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="rounded-2xl bg-white/90 p-5 shadow-lg flex flex-col sm:flex-row items-center gap-4 border border-primary/30 w-full justify-center">
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-base font-semibold text-primary mb-1">Proudly partnered with <span className="text-black">Legodimo Logistics</span></p>
                  <a
                    href="https://www.tiktok.com/@legodimo.logistic?_r=1&_t=ZS-94FUmNH3yXC"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#010101] px-4 py-2 text-white font-semibold hover:bg-[#111] transition mt-2"
                    aria-label="Legodimo Logistics TikTok"
                  >
                    <svg width="22" height="22" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" rx="60" fill="#000"/><path d="M164.5 48c0 7.7 2.7 14.7 8.1 20.9 5.4 6.2 12.1 9.7 20.1 10.5v24.2c-8.7.1-17-1.6-24.9-5.1v54.7c0 17.7-5.1 31.2-15.2 40.5-10.1 9.3-22.2 14-36.3 14-13.7 0-25.2-4.7-34.5-14.1-9.3-9.4-14-20.7-14-33.9 0-13.2 4.7-24.5 14-33.9 9.3-9.4 20.8-14.1 34.5-14.1 2.2 0 4.3.1 6.3.3v25.2c-2-.3-4.1-.5-6.3-.5-7.2 0-13.2 2.4-18.1 7.1-4.9 4.7-7.3 10.5-7.3 17.3 0 6.8 2.4 12.6 7.3 17.3 4.9 4.7 10.9 7.1 18.1 7.1 7.2 0 13.2-2.4 18.1-7.1 4.9-4.7 7.3-10.5 7.3-17.3V48h24.9z" fill="#fff"/></svg>
                    TikTok
                  </a>
                </div>
              </div>
              <div className="mt-4 text-center w-full space-y-1">
                <p className="text-sm text-[#857f7b]">Support: <a href="mailto:support@awdtech.co.za" className="underline hover:text-primary">support@awdtech.co.za</a></p>
                <p className="text-sm text-[#857f7b]">Online stores: Contact us for API integrations at <a href="mailto:info@awdtech.co.za" className="underline hover:text-primary">info@awdtech.co.za</a></p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
