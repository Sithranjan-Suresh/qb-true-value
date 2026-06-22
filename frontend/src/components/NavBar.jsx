import { Link, useLocation } from 'react-router-dom'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/methodology', label: 'Methodology' },
]

export default function NavBar() {
  const location = useLocation()

  return (
    <nav className="h-16 flex items-center gap-8 px-6 border-b border-(--color-border) bg-(--color-surface)">
      {LINKS.map((link) => {
        const isActive = location.pathname === link.to
        return (
          <Link
            key={link.to}
            to={link.to}
            className={
              isActive
                ? 'text-(--color-qb) border-b-2 border-(--color-qb) h-16 flex items-center'
                : 'text-gray-300 hover:text-white h-16 flex items-center'
            }
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
