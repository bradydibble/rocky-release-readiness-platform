import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { loginUser, registerUser } from '../lib/api'
import { useAppStore } from '../lib/store'

interface Props {
  onClose: () => void
}

export default function AuthModal({ onClose }: Props) {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const setUser = useAppStore((s) => s.setUser)
  const queryClient = useQueryClient()

  const loginMutation = useMutation({
    mutationFn: () => loginUser({ username: username.trim(), password }),
    onSuccess: (data) => {
      setUser(data.user)
      queryClient.invalidateQueries({ queryKey: ['me'] })
      onClose()
    },
    onError: (err) => setError(String(err)),
  })

  const registerMutation = useMutation({
    mutationFn: () =>
      registerUser({
        username: username.trim(),
        display_name: displayName.trim(),
        password,
      }),
    onSuccess: (data) => {
      setUser(data.user)
      queryClient.invalidateQueries({ queryKey: ['me'] })
      onClose()
    },
    onError: (err) => setError(String(err)),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (tab === 'register') {
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (username.trim().length < 3) {
        setError('Username must be at least 3 characters')
        return
      }
      if (!displayName.trim()) {
        setError('Display name is required')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      registerMutation.mutate()
    } else {
      loginMutation.mutate()
    }
  }

  const isPending = loginMutation.isPending || registerMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">
            {tab === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 text-lg leading-none"
          >
            x
          </button>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-lg bg-slate-800 p-0.5">
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(null) }}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t
                  ? 'bg-slate-600 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Username</label>
            <input
              className="input w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="rocky_tester"
              autoComplete="username"
              autoFocus
            />
          </div>

          {tab === 'register' && (
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Display Name</label>
              <input
                className="input w-full"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-slate-500">Password</label>
            <input
              type="password"
              className="input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="******"
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {tab === 'register' && (
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Confirm Password</label>
              <input
                type="password"
                className="input w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="******"
                autoComplete="new-password"
              />
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isPending}
          >
            {isPending
              ? 'Loading...'
              : tab === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>

        <p className="text-xs text-slate-600 text-center">
          {tab === 'login'
            ? "Signing in links your test results to your account."
            : "No email required. Your account is active immediately."}
        </p>
      </div>
    </div>
  )
}
