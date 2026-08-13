import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import logo from '../../../docs/octofitapp-small.png'
import './App.css'

const CHECK_IN_KEY = 'octofit:lastWorkoutCheckIn'
const WORKOUT_SESSIONS_KEY = 'octofit:workoutSessions'
const ACTIVE_SESSION_KEY = 'octofit:activeWorkoutSession'

function App() {
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    const savedSessions = localStorage.getItem(WORKOUT_SESSIONS_KEY)
    if (savedSessions) {
      try {
        const parsedSessions = JSON.parse(savedSessions)
        if (Array.isArray(parsedSessions)) {
          setSessions(parsedSessions)
        }
      } catch {
        setSessions([])
      }
    }

    const legacyCheckIn = localStorage.getItem(CHECK_IN_KEY)
    if (legacyCheckIn && !savedSessions) {
      const legacySession = {
        id: `legacy-${legacyCheckIn}`,
        userName: 'Anonymous',
        checkInAt: legacyCheckIn,
        checkOutAt: legacyCheckIn,
      }
      setSessions([legacySession])
      localStorage.setItem(WORKOUT_SESSIONS_KEY, JSON.stringify([legacySession]))
      localStorage.removeItem(CHECK_IN_KEY)
    }
  }, [])

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
          <Route
            path="/home"
            element={<HomePage sessions={sessions} setSessions={setSessions} />}
          />
          <Route path="/activities" element={<SectionPage title="Activity Stream" subtitle="Track sessions, pace, and training streaks." />} />
          <Route path="/teams" element={<SectionPage title="Team Rooms" subtitle="Create squads, invite members, and coordinate goals." />} />
          <Route path="/leaderboard" element={<LeaderboardPage sessions={sessions} />} />
          <Route path="/workouts" element={<SectionPage title="Workout Suggestions" subtitle="Get personalized sessions based on your progress." />} />
        </Routes>
      </main>
    </div>
  )
}

function HomePage({ sessions, setSessions }) {
  const [activeSessions, setActiveSessions] = useState([])
  const [checkInName, setCheckInName] = useState('')
  const [showWorkoutLog, setShowWorkoutLog] = useState(false)
  const [logFilter, setLogFilter] = useState('week')
  const [timerNowMs, setTimerNowMs] = useState(Date.now())

  useEffect(() => {
    const savedActiveSession = localStorage.getItem(ACTIVE_SESSION_KEY)
    if (savedActiveSession) {
      try {
        const parsedActiveSession = JSON.parse(savedActiveSession)
        if (Array.isArray(parsedActiveSession)) {
          const normalizedSessions = parsedActiveSession.filter(
            (session) => session?.id && session?.checkInAt,
          ).map((session) => ({
            ...session,
            pausedAt: session.pausedAt || null,
            pausedDurationMs: session.pausedDurationMs || 0,
          }))
          setActiveSessions(normalizedSessions)
        } else if (parsedActiveSession?.checkInAt) {
          const migratedSession = {
            id: crypto.randomUUID(),
            checkInAt: parsedActiveSession.checkInAt,
            userName: parsedActiveSession.userName || 'Anonymous',
              pausedAt: null,
              pausedDurationMs: 0,
          }
          setActiveSessions([migratedSession])
          localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify([migratedSession]))
        }
      } catch {
        const migratedSession = {
          id: crypto.randomUUID(),
          checkInAt: savedActiveSession,
          userName: 'Anonymous',
            pausedAt: null,
            pausedDurationMs: 0,
        }
        setActiveSessions([migratedSession])
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify([migratedSession]))
      }
    }

  }, [])

  useEffect(() => {
    if (activeSessions.length === 0) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setTimerNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [activeSessions])

  const activeSessionDetails = useMemo(
    () =>
      [...activeSessions]
        .sort(
          (firstSession, secondSession) =>
            new Date(firstSession.checkInAt).getTime() -
            new Date(secondSession.checkInAt).getTime(),
        )
        .map((session) => {
          const startMs = new Date(session.checkInAt).getTime()
          const endIso = session.pausedAt || new Date(timerNowMs).toISOString()
          const elapsedMs = getEffectiveDurationMs(
            session.checkInAt,
            endIso,
            session.pausedDurationMs || 0,
          )
          return {
            ...session,
            label: new Date(session.checkInAt).toLocaleString(),
            elapsed: formatElapsedDuration(startMs, startMs + elapsedMs),
            isPaused: Boolean(session.pausedAt),
          }
        }),
    [activeSessions, timerNowMs],
  )

  const weeklySessions = useMemo(
    () => sessions.filter((session) => isThisWeek(session.checkInAt)),
    [sessions],
  )

  const completedWorkoutCount = weeklySessions.length
  const weeklyProgressPercent = Math.min((completedWorkoutCount / 5) * 100, 100)

  const filteredSessions = useMemo(() => {
    if (logFilter === 'today') {
      return sessions.filter((session) => isToday(session.checkInAt))
    }

    return sessions.filter((session) => isThisWeek(session.checkInAt))
  }, [sessions, logFilter])

  function handleWorkoutCheckIn() {
    const userName = checkInName.trim()
    if (!userName) {
      window.alert('Enter your name before starting check-in.')
      return
    }

    const hasActiveCheckInForUser = activeSessions.some(
      (session) => session.userName.toLowerCase() === userName.toLowerCase(),
    )
    if (hasActiveCheckInForUser) {
      window.alert('This athlete is already checked in.')
      return
    }

    const now = new Date().toISOString()
    const nextActiveSession = {
      id: crypto.randomUUID(),
      checkInAt: now,
      userName,
      pausedAt: null,
      pausedDurationMs: 0,
    }

    const nextActiveSessions = [nextActiveSession, ...activeSessions]
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(nextActiveSessions))
    setActiveSessions(nextActiveSessions)
    setCheckInName('')
  }

  function handleWorkoutCheckOut(sessionId) {
    const selectedSession = activeSessions.find((session) => session.id === sessionId)
    if (!selectedSession) {
      return
    }

    const checkOutAt = selectedSession.pausedAt || new Date().toISOString()
    const effectiveDurationMs = getEffectiveDurationMs(
      selectedSession.checkInAt,
      checkOutAt,
      selectedSession.pausedDurationMs || 0,
    )

    const completedSession = {
      id: crypto.randomUUID(),
      userName: selectedSession.userName,
      checkInAt: selectedSession.checkInAt,
      checkOutAt,
      activeDurationMs: effectiveDurationMs,
    }

    const nextSessions = [completedSession, ...sessions]
    setSessions(nextSessions)
    localStorage.setItem(WORKOUT_SESSIONS_KEY, JSON.stringify(nextSessions))

    const nextActiveSessions = activeSessions.filter(
      (session) => session.id !== selectedSession.id,
    )
    if (nextActiveSessions.length > 0) {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(nextActiveSessions))
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY)
    }
    setActiveSessions(nextActiveSessions)
  }

  function handlePauseToggle(sessionId) {
    const now = new Date().toISOString()
    const nextActiveSessions = activeSessions.map((session) => {
      if (session.id !== sessionId) {
        return session
      }

      if (session.pausedAt) {
        const pausedForMs = Math.max(
          0,
          new Date(now).getTime() - new Date(session.pausedAt).getTime(),
        )
        return {
          ...session,
          pausedAt: null,
          pausedDurationMs: (session.pausedDurationMs || 0) + pausedForMs,
        }
      }

      return {
        ...session,
        pausedAt: now,
      }
    })

    setActiveSessions(nextActiveSessions)
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(nextActiveSessions))
  }

  function handleDeleteSession(sessionId) {
    const shouldDelete = window.confirm('Delete this checked-in session?')
    if (!shouldDelete) {
      return
    }

    const nextSessions = sessions.filter((session) => session.id !== sessionId)
    setSessions(nextSessions)
    localStorage.setItem(WORKOUT_SESSIONS_KEY, JSON.stringify(nextSessions))
  }

  return (
    <section className="home-grid">
      <article className="hero-card reveal delay-1">
        <p className="tag">Today</p>
        <h2>Next Session: Full-Body Intervals</h2>
        <p>
          Your team challenge starts in 90 minutes. Warm up now to boost your
          leaderboard consistency score.
        </p>
        <button
          type="button"
          className="action-btn"
          onClick={handleWorkoutCheckIn}
        >
          Start Check-in
        </button>
        <div className="check-in-row">
          <label htmlFor="check-in-name" className="check-in-label">
            Athlete Name
          </label>
          <input
            id="check-in-name"
            className="check-in-input"
            type="text"
            value={checkInName}
            onChange={(event) => setCheckInName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleWorkoutCheckIn()
              }
            }}
            placeholder="Enter your name"
          />
        </div>
        {activeSessionDetails.map((session) => (
          <div key={session.id} className="active-session-row">
            <p className="check-in-status timer-status" role="status">
              {session.userName} checked in at {session.label} · Active timer: {session.elapsed}
              {session.isPaused ? ' (paused)' : ''}
            </p>
            <div className="active-session-actions">
              <button
                type="button"
                className="pause-inline-btn"
                onClick={() => handlePauseToggle(session.id)}
              >
                {session.isPaused ? `Resume ${session.userName}` : `Pause ${session.userName}`}
              </button>
              <button
                type="button"
                className="check-out-inline-btn"
                onClick={() => handleWorkoutCheckOut(session.id)}
              >
                Check out {session.userName}
              </button>
            </div>
          </div>
        ))}
      </article>

      <article
        className="metric-card reveal delay-2 progress-card"
        onClick={() => setShowWorkoutLog((currentState) => !currentState)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setShowWorkoutLog((currentState) => !currentState)
          }
        }}
      >
        <p className="tag">Weekly Progress</p>
        <h3>{Math.min(completedWorkoutCount, 5)} / 5 Workouts Completed</h3>
        <p className="progress-hint">Click to {showWorkoutLog ? 'hide' : 'view'} logged sessions</p>
        <div className="bar-track" role="presentation">
          <span className="bar-fill" style={{ width: `${weeklyProgressPercent}%` }}></span>
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

      {showWorkoutLog ? (
        <article className="section-card reveal delay-2 session-log-card">
          <p className="tag">Logged Workouts</p>
          <h2>{logFilter === 'today' ? 'Today' : 'This Week'}</h2>
          <div className="log-filters" role="group" aria-label="Workout log filter">
            <button
              type="button"
              className={logFilter === 'today' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setLogFilter('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={logFilter === 'week' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setLogFilter('week')}
            >
              This Week
            </button>
          </div>
          {filteredSessions.length === 0 ? (
            <p>
              No completed sessions for this filter yet. Check in, then check out
              to log one.
            </p>
          ) : (
            <ul className="session-list">
              {filteredSessions.map((session) => (
                <li key={session.id} className="session-item">
                  <div>
                    <p className="session-title">
                      {session.userName || 'Anonymous'} · {new Date(session.checkInAt).toLocaleString()}
                    </p>
                    <p>
                      Duration:{' '}
                      {formatSessionDuration(
                        session.checkInAt,
                        session.checkOutAt,
                        session.activeDurationMs,
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => handleDeleteSession(session.id)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      ) : null}
    </section>
  )
}

function LeaderboardPage({ sessions }) {
  const rankedUsers = useMemo(() => {
    const usersByName = new Map()

    sessions.forEach((session) => {
      const userName = (session.userName || 'Anonymous').trim() || 'Anonymous'
      const sessionMinutes = getSessionDurationMinutes(
        session.checkInAt,
        session.checkOutAt,
        session.activeDurationMs,
      )

      if (!usersByName.has(userName)) {
        usersByName.set(userName, {
          userName,
          activities: [],
          totalMinutes: 0,
        })
      }

      const user = usersByName.get(userName)
      user.activities.push({
        id: session.id,
        checkInAt: session.checkInAt,
        checkOutAt: session.checkOutAt,
        minutes: sessionMinutes,
      })
      user.totalMinutes += sessionMinutes
    })

    return Array.from(usersByName.values())
      .map((user) => ({
        ...user,
        activityCount: user.activities.length,
      }))
      .sort((firstUser, secondUser) => {
        if (secondUser.activityCount !== firstUser.activityCount) {
          return secondUser.activityCount - firstUser.activityCount
        }

        if (secondUser.totalMinutes !== firstUser.totalMinutes) {
          return secondUser.totalMinutes - firstUser.totalMinutes
        }

        return firstUser.userName.localeCompare(secondUser.userName)
      })
  }, [sessions])

  return (
    <section className="section-card reveal delay-2 leaderboard-card">
      <p className="tag">Competition</p>
      <h2>Leaderboard</h2>
      <p>Ranked by completed activities, then total workout length.</p>

      {rankedUsers.length === 0 ? (
        <p>No workout activity logged yet.</p>
      ) : (
        <ol className="leaderboard-list">
          {rankedUsers.map((user, index) => (
            <li key={user.userName} className="leaderboard-item">
              <div className="leaderboard-header">
                <h3>
                  #{index + 1} {user.userName}
                </h3>
                <p>
                  {user.activityCount} activities · {formatMinutes(user.totalMinutes)} total
                </p>
              </div>
              <ul className="activity-list">
                {user.activities.map((activity) => (
                  <li key={activity.id}>
                    {new Date(activity.checkInAt).toLocaleString()} · {formatMinutes(activity.minutes)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function formatSessionDuration(checkInAt, checkOutAt, activeDurationMs) {
  const totalMinutes = getSessionDurationMinutes(checkInAt, checkOutAt, activeDurationMs)

  return formatMinutes(totalMinutes)
}

function getSessionDurationMinutes(checkInAt, checkOutAt, activeDurationMs) {
  if (typeof activeDurationMs === 'number' && Number.isFinite(activeDurationMs)) {
    return Math.max(1, Math.round(activeDurationMs / 60000))
  }

  const startTime = new Date(checkInAt).getTime()
  const endTime = new Date(checkOutAt).getTime()
  return Math.max(1, Math.round((endTime - startTime) / 60000))
}

function getEffectiveDurationMs(checkInAt, checkOutAt, pausedDurationMs) {
  const startTime = new Date(checkInAt).getTime()
  const endTime = new Date(checkOutAt).getTime()
  return Math.max(0, endTime - startTime - (pausedDurationMs || 0))
}

function formatMinutes(totalMinutes) {
  if (totalMinutes < 60) {
    return `${totalMinutes} min`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (minutes === 0) {
    return `${hours} hr`
  }

  return `${hours} hr ${minutes} min`
}

function formatElapsedDuration(startMs, currentMs) {
  const totalSeconds = Math.max(0, Math.floor((currentMs - startMs) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const hourText = String(hours).padStart(2, '0')
  const minuteText = String(minutes).padStart(2, '0')
  const secondText = String(seconds).padStart(2, '0')

  return `${hourText}:${minuteText}:${secondText}`
}

function isToday(isoDateText) {
  const date = new Date(isoDateText)
  const now = new Date()

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function isThisWeek(isoDateText) {
  const date = new Date(isoDateText)
  const now = new Date()
  const startOfWeek = new Date(now)
  const day = startOfWeek.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1

  startOfWeek.setHours(0, 0, 0, 0)
  startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday)

  return date >= startOfWeek
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
