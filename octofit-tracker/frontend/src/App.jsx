import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import logo from '../../../docs/octofitapp-small.png'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand">
          <img src={logo} alt="OctoFit Tracker logo" />
          <div>
            <p className="eyebrow">OCTOFIT TRACKER</p>
            <h1>Train Smarter, Together</h1>
          </div>
        </div>

        <nav>
          <NavLink to="/home">Home</NavLink>
          <NavLink to="/activities">Activities</NavLink>
          <NavLink to="/teams">Teams</NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <NavLink to="/workouts">Workouts</NavLink>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/activities" element={<SectionPage title="Activity Stream" subtitle="Track sessions, pace, and training streaks." />} />
          <Route path="/teams" element={<SectionPage title="Team Rooms" subtitle="Create squads, invite members, and coordinate goals." />} />
          <Route path="/leaderboard" element={<SectionPage title="Leaderboard" subtitle="Compete on consistency, volume, and personal records." />} />
          <Route path="/workouts" element={<SectionPage title="Workout Suggestions" subtitle="Get personalized sessions based on your progress." />} />
        </Routes>
      </main>
    </div>
  )
}

function HomePage() {
  return (
    <section className="home-grid">
      <article className="hero-card reveal delay-1">
        <p className="tag">Today</p>
        <h2>Next Session: Full-Body Intervals</h2>
        <p>
          Your team challenge starts in 90 minutes. Warm up now to boost your
          leaderboard consistency score.
        </p>
        <button type="button" className="action-btn">
          Start Check-in
        </button>
      </article>

      <article className="metric-card reveal delay-2">
        <p className="tag">Weekly Progress</p>
        <h3>4 / 5 Workouts Completed</h3>
        <div className="bar-track" role="presentation">
          <span className="bar-fill" style={{ width: '80%' }}></span>
        </div>
      </article>

      <article className="metric-card reveal delay-3">
        <p className="tag">Team Position</p>
        <h3>#3 in Iron Octos</h3>
        <p>+142 points this week from cardio minutes and strength sets.</p>
      </article>

      <article className="metric-card reveal delay-4">
        <p className="tag">Streak</p>
        <h3>9-Day Consistency Run</h3>
        <p>One more logged activity unlocks a new training badge.</p>
      </article>
    </section>
  )
}

function SectionPage({ title, subtitle }) {
  return (
    <section className="section-card reveal delay-2">
      <p className="tag">OctoFit Module</p>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </section>
  )
}

export default App
