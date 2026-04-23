import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthModal from './AuthModal'
import { getReleases, logout } from '../lib/api'
import { useAppStore, type Mode } from '../lib/store'

export default function NavBar() {
  const { isAdmin, username, setUsername, user, setUser, setIsAdmin, mode, setMode } = useAppStore()
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(username)
  const [showAuth, setShowAuth] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const location = useLocation()
  const queryClient = useQueryClient()

  const { data: releases } = useQuery({
    queryKey: ['releases'],
    queryFn: getReleases,
    staleTime: 60_000,
  })

  const activeMilestone = releases?.flatMap((r) =>
    r.milestones
      .filter((m) => m.status === 'open')
      .map((m) => ({ ...m, releaseName: r.name, releaseVersion: r.version }))
  )[0]

  const onMilestonePage =
    activeMilestone && location.pathname === `/milestones/${activeMilestone.id}`

  const handleLogout = async () => {
    await logout()
    setUser(null)
    setIsAdmin(false)
    queryClient.invalidateQueries({ queryKey: ['me'] })
    setShowUserMenu(false)
  }

  const saveName = () => {
    setUsername(nameInput.trim())
    setEditingName(false)
  }

  return (
    <header className="border-b border-slate-800 bg-slate-900">
      <div className="container mx-auto flex items-center justify-between px-4 py-3 max-w-7xl gap-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-emerald-400 hover:text-emerald-300 shrink-0">
          <span className="text-2xl">&#9968;</span>
          R3P
          <span className="hidden sm:inline text-xs font-normal text-slate-500">Rocky Release Readiness Platform</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          {/* Active milestone CTA */}
          {activeMilestone && !onMilestonePage && (
            <Link
              to={`/milestones/${activeMilestone.id}`}
              className="flex items-center gap-1 rounded-full bg-red-950/60 border border-red-800 px-2.5 py-1 text-xs text-red-300 hover:bg-red-950 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />
              Help test {activeMilestone.releaseVersion} {activeMilestone.name.toUpperCase()}
            </Link>
          )}

          {/* Mode toggle */}
          <div className="hidden sm:flex items-center gap-0.5 rounded-lg bg-slate-800 p-0.5">
            {(['guided', 'standard'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  mode === m
                    ? m === 'guided'
                      ? 'bg-emerald-800 text-emerald-200'
                      : 'bg-slate-600 text-slate-100'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {m === 'guided' ? 'Guided' : 'Standard'}
              </button>
            ))}
          </div>

          {/* Auth state */}
          {user ? (
            <div className="relative">
              <button
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-slate-100"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${user.is_test_team ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                {user.display_name}
                <span className="text-slate-600">&#9662;</span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 rounded-lg border border-slate-700 bg-slate-900 shadow-lg py-1 min-w-[160px]">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-xs text-slate-400">@{user.username}</p>
                    {user.is_test_team && (
                      <span className="text-xs text-emerald-400 font-medium">RESF Test Team</span>
                    )}
                  </div>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="block px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Anonymous name editor */}
              {editingName ? (
                <form
                  className="flex items-center gap-1"
                  onSubmit={(e) => { e.preventDefault(); saveName() }}
                >
                  <input
                    className="input w-28 text-xs"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Your name"
                    autoFocus
                  />
                  <button type="submit" className="btn-primary text-xs px-2 py-1">Save</button>
                  <button type="button" className="btn-ghost text-xs px-2 py-1" onClick={() => setEditingName(false)}>&#10005;</button>
                </form>
              ) : (
                <button
                  className="text-xs text-slate-500 hover:text-slate-300"
                  onClick={() => { setNameInput(username); setEditingName(true) }}
                >
                  {username ? username : 'Set name'}
                </button>
              )}

              <button
                className="btn-outline text-xs"
                onClick={() => setShowAuth(true)}
              >
                Sign in
              </button>

              {isAdmin && (
                <>
                  <Link to="/admin" className="btn-outline text-xs">Admin</Link>
                  <button onClick={handleLogout} className="btn-ghost text-xs">Sign out</button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </header>
  )
}
