import { BrowserRouter, Route, Routes } from 'react-router-dom'

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
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <Routes>
            <Route path="/" element={<LandingPage />} />
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
      </div>
    </BrowserRouter>
  )
}

export default App
