import { Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import Landing from './pages/Landing'
import Leaderboard from './pages/Leaderboard'
import QBDetail from './pages/QBDetail'
import Methodology from './pages/Methodology'

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/qb/:qbId/:season" element={<QBDetail />} />
        <Route path="/methodology" element={<Methodology />} />
      </Routes>
    </>
  )
}

export default App
