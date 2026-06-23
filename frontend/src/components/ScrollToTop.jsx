import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// React Router doesn't reset scroll position on navigation by default -- without
// this, clicking "Leaderboard" while scrolled down on another page lands you at the
// same scroll offset on the new page instead of its top.
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
