import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  carryForward,
  createMilestone,
  createRelease,
  createSection,
  createTestCase,
  deleteRelease,
  deleteMilestone,
  deleteSection,
  deleteTestCase,
  getAdminUsers,
  getMilestone,
  getReleases,
  login,
  logout,
  resetMilestone,
  updateAdminUser,
  updateMilestone,
} from '../lib/api'
import type { AdminUserItem } from '../lib/api'
import { useAppStore } from '../lib/store'

// ── Login Panel ───────────────────────────────────────────────────────────────

function LoginPanel() {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => login(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
    onError: () => setError('Invalid token'),
  })

  return (
    <div className="max-w-sm mx-auto mt-24 card space-y-4">
      <h2 className="text-lg font-semibold text-slate-100">Admin Login</h2>
      <form
        className="space-y-3"
        onSubmit={(e) => { e.preventDefault(); setError(''); mutation.mutate() }}
      >
        <input
          type="password"
          className="input w-full"
          placeholder="Admin token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoFocus
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
          {mutation.isPending ? 'Logging in…' : 'Login'}
        </button>
      </form>
    </div>
  )
}

// ── Release form ──────────────────────────────────────────────────────────────

function AddReleaseForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [notes, setNotes] = useState('')
  const mutation = useMutation({
    mutationFn: () => createRelease({ name, version, notes: notes || undefined }),
    onSuccess: () => { onAdded(); setName(''); setVersion(''); setNotes('') },
  })

  return (
    <form
      className="flex flex-wrap gap-2 items-end"
      onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
    >
      <div>
        <label className="block text-xs text-slate-500 mb-1">Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rocky Linux" required />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Version</label>
        <input className="input w-24" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="10.1" required />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Notes</label>
        <input className="input w-48" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
      </div>
      <button type="submit" className="btn-primary" disabled={mutation.isPending}>Add release</button>
    </form>
  )
}

// ── Milestone form ────────────────────────────────────────────────────────────

function AddMilestoneForm({ releaseId, onAdded }: { releaseId: number; onAdded: () => void }) {
  const [name, setName] = useState('rc1')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const mutation = useMutation({
    mutationFn: () => createMilestone(releaseId, {
      name,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      download_url: downloadUrl || undefined,
    }),
    onSuccess: () => { onAdded(); setName('rc1'); setStartDate(''); setEndDate(''); setDownloadUrl('') },
  })
  return (
    <form
      className="flex flex-wrap gap-2 items-center"
      onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
    >
      <select className="input text-xs" value={name} onChange={(e) => setName(e.target.value)}>
        {['lookahead', 'beta', 'rc1', 'rc2'].map((n) => <option key={n}>{n}</option>)}
      </select>
      <div>
        <label className="block text-xs text-slate-500 mb-0.5">Start date</label>
        <input type="date" className="input text-xs" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-0.5">End date</label>
        <input type="date" className="input text-xs" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-0.5">ISO download URL</label>
        <input
          className="input text-xs w-64"
          placeholder="https://dl.rockylinux.org/…"
          value={downloadUrl}
          onChange={(e) => setDownloadUrl(e.target.value)}
        />
      </div>
      <button type="submit" className="btn-outline text-xs self-end" disabled={mutation.isPending}>+ Milestone</button>
    </form>
  )
}

function EditDownloadUrl({ milestoneId, current, onSaved }: {
  milestoneId: number
  current: string | null
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [url, setUrl] = useState(current ?? '')
  const mutation = useMutation({
    mutationFn: () => updateMilestone(milestoneId, { download_url: url || undefined }),
    onSuccess: () => { onSaved(); setEditing(false) },
  })
  if (!editing) {
    return (
      <span className="flex items-center gap-1 text-xs">
        {current
          ? <a href={current} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate max-w-[200px]">{current}</a>
          : <span className="text-slate-600 italic">no ISO URL</span>
        }
        <button type="button" className="text-slate-600 hover:text-slate-300 ml-1" onClick={() => setEditing(true)}>✏️</button>
      </span>
    )
  }
  return (
    <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <input
        className="input text-xs w-52"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…"
        autoFocus
      />
      <button type="submit" className="btn-primary text-xs px-2 py-1" disabled={mutation.isPending}>Save</button>
      <button type="button" className="btn-ghost text-xs px-2 py-1" onClick={() => setEditing(false)}>✕</button>
    </form>
  )
}

// ── Section form ──────────────────────────────────────────────────────────────

function AddSectionForm({ milestoneId, onAdded }: { milestoneId: number; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [arch, setArch] = useState('')
  const mutation = useMutation({
    mutationFn: () => createSection(milestoneId, { name, architecture: arch || undefined }),
    onSuccess: () => { onAdded(); setName(''); setArch('') },
  })
  return (
    <form
      className="flex gap-2 flex-wrap items-end mt-2"
      onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
    >
      <input className="input text-xs" placeholder="Section name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="input text-xs w-24" placeholder="Arch (opt)" value={arch} onChange={(e) => setArch(e.target.value)} />
      <button type="submit" className="btn-outline text-xs" disabled={mutation.isPending}>+ Section</button>
    </form>
  )
}

// ── Test case form ────────────────────────────────────────────────────────────

function AddTestCaseForm({ sectionId, onAdded }: { sectionId: number; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [blocking, setBlocking] = useState('normal')
  const mutation = useMutation({
    mutationFn: () => createTestCase(sectionId, { name, procedure_url: url || undefined, blocking }),
    onSuccess: () => { onAdded(); setName(''); setUrl(''); setBlocking('normal') },
  })
  return (
    <form
      className="flex gap-2 flex-wrap items-end mt-1"
      onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
    >
      <input className="input text-xs flex-1 min-w-[200px]" placeholder="Test case name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="input text-xs w-48" placeholder="Procedure URL (opt)" value={url} onChange={(e) => setUrl(e.target.value)} />
      <select className="input text-xs" value={blocking} onChange={(e) => setBlocking(e.target.value)}>
        <option value="normal">normal</option>
        <option value="blocker">blocker</option>
      </select>
      <button type="submit" className="btn-outline text-xs" disabled={mutation.isPending}>+ Test case</button>
    </form>
  )
}

// ── Carry forward panel ───────────────────────────────────────────────────────

function CarryForwardPanel({ milestoneId, allMilestones }: {
  milestoneId: number
  allMilestones: { id: number; name: string }[]
}) {
  const [sourceId, setSourceId] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () => carryForward(milestoneId, Number(sourceId)),
    onSuccess: (data) => setResult(`Copied ${data.copied} results.`),
    onError: (e) => setResult(`Error: ${e}`),
  })
  const others = allMilestones.filter((m) => m.id !== milestoneId)
  if (others.length === 0) return null
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-slate-500">Carry forward from:</span>
      <select className="input text-xs" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
        <option value="">Select source</option>
        {others.map((m) => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
      </select>
      <button
        className="btn-outline text-xs"
        disabled={!sourceId || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        Carry forward
      </button>
      {result && <span className="text-xs text-slate-400">{result}</span>}
    </div>
  )
}

// ── Reset milestone ──────────────────────────────────────────────────────────

function ResetMilestoneButton({ milestoneId }: { milestoneId: number }) {
  const queryClient = useQueryClient()
  const [result, setResult] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () => resetMilestone(milestoneId),
    onSuccess: (data) => {
      setResult(`Reset ${data.reset} approvals.`)
      queryClient.invalidateQueries({ queryKey: ['milestone', milestoneId] })
    },
    onError: (e) => setResult(`Error: ${e}`),
  })

  return (
    <div className="flex items-center gap-2 mt-2">
      <button
        className="btn-outline text-xs text-amber-500 border-amber-700 hover:bg-amber-900/30"
        disabled={mutation.isPending}
        onClick={() => {
          if (confirm('Reset all approvals for this milestone? Results will be preserved.'))
            mutation.mutate()
        }}
      >
        Reset approvals for new RC
      </button>
      {result && <span className="text-xs text-slate-400">{result}</span>}
    </div>
  )
}

// ── User management ─────────────────────────────────────────────────────────

function UserManagement() {
  const queryClient = useQueryClient()
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getAdminUsers,
  })

  const updateMut = useMutation({
    mutationFn: ({ userId, body }: { userId: number; body: Partial<AdminUserItem> }) =>
      updateAdminUser(userId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  if (isLoading) return <p className="text-sm text-slate-500">Loading users...</p>
  if (!users || users.length === 0) return <p className="text-sm text-slate-600">No registered users yet.</p>

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-2 text-xs text-slate-500 font-semibold uppercase tracking-wide px-2 pb-1 border-b border-slate-700">
        <span>Username</span>
        <span>Display Name</span>
        <span className="text-center">Results</span>
        <span className="text-center">Test Team</span>
        <span className="text-center">Role</span>
        <span className="text-center">Status</span>
      </div>
      {users.map((u) => (
        <div
          key={u.id}
          className={`grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-2 items-center px-2 py-1.5 rounded text-sm ${
            u.disabled ? 'opacity-50' : ''
          }`}
        >
          <span className="text-slate-200 font-medium truncate">@{u.username}</span>
          <span className="text-slate-400 truncate">{u.display_name}</span>
          <span className="text-center text-xs text-slate-500 w-16">{u.result_count}</span>
          <button
            className={`w-20 text-center text-xs rounded px-2 py-1 transition-colors ${
              u.is_test_team
                ? 'bg-blue-900/40 text-blue-300 border border-blue-700'
                : 'bg-slate-800 text-slate-600 border border-slate-700 hover:border-slate-500'
            }`}
            onClick={() => updateMut.mutate({ userId: u.id, body: { is_test_team: !u.is_test_team } })}
            disabled={updateMut.isPending}
          >
            {u.is_test_team ? 'Team' : 'Regular'}
          </button>
          <button
            className={`w-16 text-center text-xs rounded px-2 py-1 transition-colors ${
              u.role === 'admin'
                ? 'bg-purple-900/40 text-purple-300 border border-purple-700'
                : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-500'
            }`}
            onClick={() => {
              const newRole = u.role === 'admin' ? 'tester' : 'admin'
              if (newRole === 'admin' && !confirm(`Promote @${u.username} to admin?`)) return
              updateMut.mutate({ userId: u.id, body: { role: newRole } })
            }}
            disabled={updateMut.isPending}
          >
            {u.role}
          </button>
          <button
            className={`w-20 text-center text-xs rounded px-2 py-1 transition-colors ${
              u.disabled
                ? 'bg-red-900/30 text-red-400 border border-red-800'
                : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-500'
            }`}
            onClick={() => updateMut.mutate({ userId: u.id, body: { disabled: !u.disabled } })}
            disabled={updateMut.isPending}
          >
            {u.disabled ? 'Disabled' : 'Active'}
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Section manager ───────────────────────────────────────────────────────────

function SectionManager({ milestoneId }: { milestoneId: number }) {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['milestone', milestoneId],
    queryFn: () => getMilestone(milestoneId),
  })

  const deleteSectionMut = useMutation({
    mutationFn: deleteSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone', milestoneId] })
      queryClient.invalidateQueries({ queryKey: ['releases'] })
    },
  })
  const deleteTestCaseMut = useMutation({
    mutationFn: deleteTestCase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['milestone', milestoneId] }),
  })

  return (
    <div className="space-y-3">
      <AddSectionForm
        milestoneId={milestoneId}
        onAdded={() => queryClient.invalidateQueries({ queryKey: ['milestone', milestoneId] })}
      />
      {data?.sections.map((sec) => (
        <div key={sec.id} className="rounded border border-slate-700 p-2 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-300">
              {sec.name}{sec.architecture ? ` (${sec.architecture})` : ''}
            </span>
            <button
              className="ml-auto text-xs text-red-600 hover:text-red-400"
              onClick={() => {
                if (confirm(`Delete section "${sec.name}"?`)) deleteSectionMut.mutate(sec.id)
              }}
            >
              Delete section
            </button>
          </div>
          {sec.test_cases.map((tc) => (
            <div key={tc.id} className="flex items-center gap-2 text-xs text-slate-500 pl-2">
              <span className="flex-1 truncate">{tc.name}</span>
              {tc.blocking === 'blocker' && <span className="badge-blocker">release-blocking</span>}
              <button
                className="text-red-700 hover:text-red-500"
                onClick={() => {
                  if (confirm(`Delete test case "${tc.name}"?`)) deleteTestCaseMut.mutate(tc.id)
                }}
              >
                ×
              </button>
            </div>
          ))}
          <AddTestCaseForm
            sectionId={sec.id}
            onAdded={() => queryClient.invalidateQueries({ queryKey: ['milestone', milestoneId] })}
          />
        </div>
      ))}
    </div>
  )
}

// ── Main Admin panel ──────────────────────────────────────────────────────────

type AdminTab = 'releases' | 'users'

export function Component() {
  const isAdmin = useAppStore((s) => s.isAdmin)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [tab, setTab] = useState<AdminTab>('releases')
  const [expandedRelease, setExpandedRelease] = useState<number | null>(null)
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(null)

  const { data: releases, isLoading } = useQuery({
    queryKey: ['releases'],
    queryFn: getReleases,
    enabled: isAdmin,
  })

  const deleteReleaseMut = useMutation({
    mutationFn: deleteRelease,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['releases'] }),
  })
  const deleteMilestoneMut = useMutation({
    mutationFn: deleteMilestone,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['releases'] }),
  })
  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateMilestone(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['releases'] }),
  })

  const handleLogout = async () => {
    await logout()
    queryClient.invalidateQueries({ queryKey: ['me'] })
    navigate('/')
  }

  if (!isAdmin) return <LoginPanel />

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Admin Panel</h1>
        <button onClick={handleLogout} className="btn-ghost text-xs">Sign out</button>
      </div>

      {/* Tab bar */}
      <div className="flex rounded-lg bg-slate-800 p-0.5 w-fit">
        {([['releases', 'Releases'], ['users', 'Users']] as [AdminTab, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
              tab === key ? 'bg-slate-600 text-slate-100' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'users' ? (
        <div className="card space-y-3">
          <h2 className="font-semibold text-slate-200 text-sm">Registered Users</h2>
          <UserManagement />
        </div>
      ) : (
      <>
      <div className="card space-y-3">
        <h2 className="font-semibold text-slate-200 text-sm">Releases</h2>
        <AddReleaseForm onAdded={() => queryClient.invalidateQueries({ queryKey: ['releases'] })} />
      </div>

      {isLoading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : (
        <div className="space-y-3">
          {releases?.map((release) => {
            const allMs = release.milestones.map((m) => ({ id: m.id, name: m.name }))
            return (
              <div key={release.id} className="card space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    className="text-sm font-semibold text-slate-200 hover:text-white"
                    onClick={() => setExpandedRelease(expandedRelease === release.id ? null : release.id)}
                  >
                    {expandedRelease === release.id ? '▼' : '▶'} Rocky Linux {release.version} — {release.name}
                  </button>
                  <button
                    className="ml-auto text-xs text-red-600 hover:text-red-400"
                    onClick={() => {
                      if (confirm(`Delete release ${release.name}?`)) deleteReleaseMut.mutate(release.id)
                    }}
                  >
                    Delete
                  </button>
                </div>

                {expandedRelease === release.id && (
                  <div className="pl-4 space-y-3 border-l border-slate-700">
                    <AddMilestoneForm
                      releaseId={release.id}
                      onAdded={() => queryClient.invalidateQueries({ queryKey: ['releases'] })}
                    />

                    {release.milestones.map((m) => (
                      <div key={m.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <button
                            className="text-sm text-slate-300 hover:text-white font-medium"
                            onClick={() => setExpandedMilestone(expandedMilestone === m.id ? null : m.id)}
                          >
                            {expandedMilestone === m.id ? '▼' : '▶'} {m.name.toUpperCase()}
                          </button>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded cursor-pointer ${
                              m.status === 'open' ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-800 text-slate-500'
                            }`}
                            onClick={() =>
                              toggleStatus.mutate({ id: m.id, status: m.status === 'open' ? 'closed' : 'open' })
                            }
                            title="Click to toggle status"
                          >
                            {m.status}
                          </span>
                          <a href={`/milestones/${m.id}`} className="text-xs text-blue-400 hover:underline">View →</a>
                          <button
                            className="ml-auto text-xs text-red-600 hover:text-red-400"
                            onClick={() => {
                              if (confirm(`Delete milestone ${m.name}?`)) deleteMilestoneMut.mutate(m.id)
                            }}
                          >
                            Delete
                          </button>
                        </div>

                        {expandedMilestone === m.id && (
                          <div className="pl-4 border-l border-slate-700 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">ISO URL:</span>
                              <EditDownloadUrl
                                milestoneId={m.id}
                                current={m.download_url ?? null}
                                onSaved={() => queryClient.invalidateQueries({ queryKey: ['releases'] })}
                              />
                            </div>
                            <CarryForwardPanel milestoneId={m.id} allMilestones={allMs} />
                            <ResetMilestoneButton milestoneId={m.id} />
                            <SectionManager milestoneId={m.id} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      </>
      )}
    </div>
  )
}
