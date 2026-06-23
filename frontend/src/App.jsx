import { Route, Routes, useLocation } from 'react-router-dom'
import NavBar from './components/NavBar'
import ScrollToTop from './components/ScrollToTop'
import Splash from './pages/Splash'
import Home from './pages/Home'
import Leaderboard from './pages/Leaderboard'
import QBDetail from './pages/QBDetail'
import Methodology from './pages/Methodology'
import Explore from './pages/Explore'

function App() {
  const location = useLocation()
  // The splash screen at "/" is a full-bleed entry point, not a page within the
  // app's normal navigation flow -- it has its own "Enter the App" CTA instead of
  // the persistent nav bar every other route shares.
  const isSplash = location.pathname === '/'

  return (
    <>
      <ScrollToTop />
      {!isSplash && <NavBar />}
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/home" element={<Home />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/qb/:qbId/:season" element={<QBDetail />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/methodology" element={<Methodology />} />
      </Routes>
    </>
  )
}

export default App
