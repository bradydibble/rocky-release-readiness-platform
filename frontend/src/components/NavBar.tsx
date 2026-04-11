import { useState } from 'react'
import { Link } from 'react-router-dom'
import { logout } from '../lib/api'
import { useAppStore } from '../lib/store'

export default function NavBar() {
  const { isAdmin, username, setUsername } = useAppStore()
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(username)

  const handleLogout = async () => {
    await logout()
    window.location.reload()
  }

  const saveName = () => {
    setUsername(nameInput.trim())
    setEditingName(false)
  }

  return (
    <header className="border-b border-slate-800 bg-slate-900">
      <div className="container mx-auto flex items-center justify-between px-4 py-3 max-w-7xl">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-emerald-400 hover:text-emerald-300">
          <span className="text-2xl">⛰</span>
          R3P
          <span className="text-xs font-normal text-slate-500">Rocky Release Readiness Platform</span>
        </Link>

        <div className="flex items-center gap-3">
          {editingName ? (
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => { e.preventDefault(); saveName() }}
            >
              <input
                className="input w-32 text-xs"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name"
                autoFocus
              />
              <button type="submit" className="btn-primary text-xs px-2 py-1">Save</button>
              <button type="button" className="btn-ghost text-xs px-2 py-1" onClick={() => setEditingName(false)}>Cancel</button>
            </form>
          ) : (
            <button
              className="text-xs text-slate-400 hover:text-slate-200"
              onClick={() => { setNameInput(username); setEditingName(true) }}
            >
              {username ? `Submitting as ${username}` : 'Set your name (optional)'}
            </button>
          )}

          {isAdmin ? (
            <>
              <Link to="/admin" className="btn-outline text-xs">Admin</Link>
              <button onClick={handleLogout} className="btn-ghost text-xs">Sign out</button>
            </>
          ) : (
            <Link to="/admin" className="btn-ghost text-xs">Admin login</Link>
          )}
        </div>
      </div>
    </header>
  )
}
