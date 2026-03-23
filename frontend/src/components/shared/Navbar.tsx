import { Link, NavLink, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import useAuth from '@/hooks/useAuth'
import logoImage from '@/assets/brand/logo.png'

function Navbar() {
  const navigate = useNavigate()
  const { isAuthenticated, logoutUser } = useAuth()

  const handleLogout = async () => {
    await logoutUser()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-[5.5rem] w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="inline-flex items-center" aria-label="AWDelivery home">
          <img src={logoImage} alt="AWDelivery" className="h-[7rem] w-auto sm:h-[8rem]" />
        </Link>

        <nav className="hidden items-center gap-2 rounded-full border border-border/80 bg-card/70 p-1.5 text-sm sm:flex">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `rounded-full px-3 py-1.5 transition ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/order/new"
            className={({ isActive }) =>
              `rounded-full px-3 py-1.5 transition ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
              }`
            }
          >
            New Order
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `rounded-full px-3 py-1.5 transition ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
              }`
            }
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
