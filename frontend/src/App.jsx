import { Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import ScrollToTop from './components/ScrollToTop'
import Landing from './pages/Landing'
import Leaderboard from './pages/Leaderboard'
import QBDetail from './pages/QBDetail'
import Methodology from './pages/Methodology'
import Explore from './pages/Explore'

function App() {
  return (
    <>
      <ScrollToTop />
      <NavBar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/qb/:qbId/:season" element={<QBDetail />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/methodology" element={<Methodology />} />
      </Routes>
    </>
  )
}

export default App
