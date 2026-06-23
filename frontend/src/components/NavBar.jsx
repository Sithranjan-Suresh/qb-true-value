import { Link, useLocation } from 'react-router-dom'

const LINKS = [
  { to: '/home', label: 'Home' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/explore', label: 'Explore' },
  { to: '/methodology', label: 'Methodology' },
]

export default function NavBar() {
  const location = useLocation()

  return (
    <nav
      className="sticky top-0 z-10 h-16 border-b border-(--color-border)"
      style={{ background: 'rgba(10, 10, 15, 0.85)', backdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-[1200px] mx-auto h-full flex items-center gap-8 px-6">
        {LINKS.map((link) => {
          const isActive = location.pathname === link.to
          return (
            <Link
              key={link.to}
              to={link.to}
              className={
                isActive
                  ? 'font-(family-name:--font-body) text-sm font-medium text-(--color-qb) h-16 flex items-center'
                  : 'font-(family-name:--font-body) text-sm font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) h-16 flex items-center'
              }
            >
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
