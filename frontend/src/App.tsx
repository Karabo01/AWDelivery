import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Truck } from 'lucide-react'

import Navbar from '@/components/shared/Navbar'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import AdminPage from '@/pages/admin/AdminPage'
import DashboardPage from '@/pages/DashboardPage'
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
          <div className="mx-auto w-full max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[1.45fr_1fr_1fr_1fr]">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Truck className="h-6 w-6" />
                  </div>
                  <p className="font-display text-xl font-normal leading-none text-[#f1efec] sm:text-2xl">AWDelivery</p>
                </div>
                <p className="max-w-md text-sm leading-relaxed text-[#857f7b] sm:text-base">
                  Fast, reliable deliveries for every person and every business across South Africa.
                </p>
              </div>

              <div className="space-y-7">
                <p className="text-sm font-normal uppercase tracking-[0.08em] text-[#d4d0cc]">Services</p>
                <ul className="space-y-4 text-xs text-[#857f7b] sm:text-sm">
                  <li>Same-Day Express</li>
                  <li>Scheduled Delivery</li>
                  <li>Business Bulk</li>
                  <li>Secure Documents</li>
                </ul>
              </div>

              <div className="space-y-7">
                <p className="text-sm font-normal uppercase tracking-[0.08em] text-[#d4d0cc]">Company</p>
                <ul className="space-y-4 text-xs text-[#857f7b] sm:text-sm">
                  <li>About us</li>
                  <li>Careers</li>
                  <li>Press</li>
                  <li>Partners</li>
                </ul>
              </div>

              <div className="space-y-7">
                <p className="text-sm font-normal uppercase tracking-[0.08em] text-[#d4d0cc]">Support</p>
                <ul className="space-y-4 text-xs text-[#857f7b] sm:text-sm">
                  <li>Help centre</li>
                  <li>Track a package</li>
                  <li>Contact us</li>
                  <li>Driver app</li>
                </ul>
              </div>
            </div>

            <div className="mt-16 border-t border-[#332f2d] pt-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-xs font-normal text-[#79736f] sm:text-sm">© 2026 AWDelivery (Pty) Ltd. All rights reserved.</p>
                <div className="flex items-center gap-4">
                  {['f', 'in', 'tw', 'ig'].map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-[#403b38] text-lg font-normal text-[#8b8580] transition hover:text-[#d4d0cc]"
                      aria-label={`AWDelivery ${item} social link`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
