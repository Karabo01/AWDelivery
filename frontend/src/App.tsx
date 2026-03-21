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
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
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
