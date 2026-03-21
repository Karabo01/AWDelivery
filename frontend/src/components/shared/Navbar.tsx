import { Link, NavLink, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import useAuth from '@/hooks/useAuth'

function Navbar() {
  const navigate = useNavigate()
  const { isAuthenticated, logoutUser } = useAuth()

  const handleLogout = async () => {
    await logoutUser()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="text-lg font-bold tracking-tight">
          AWDelivery
        </Link>

        <nav className="hidden items-center gap-6 text-sm sm:flex">
          <NavLink to="/" className="text-muted-foreground hover:text-foreground">
            Home
          </NavLink>
          <NavLink
            to="/order/new"
            className="text-muted-foreground hover:text-foreground"
          >
            New Order
          </NavLink>
          <NavLink
            to="/dashboard"
            className="text-muted-foreground hover:text-foreground"
          >
            Dashboard
          </NavLink>
        </nav>

        {isAuthenticated ? (
          <Button size="sm" variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        ) : (
          <Button size="sm" onClick={() => navigate('/login')}>
            Login
          </Button>
        )}
      </div>
    </header>
  )
}

export default Navbar
