import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getReleases } from '../lib/api'

const MILESTONE_ORDER = ['lookahead', 'beta', 'rc1', 'rc2']

function statusDot(status: string) {
  return status === 'open'
    ? 'w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1.5'
    : 'w-2 h-2 rounded-full bg-slate-600 inline-block mr-1.5'
}

// Export as named so react-router lazy() works
export function Component() {
  const { data: releases, isLoading, isError } = useQuery({
    queryKey: ['releases'],
    queryFn: getReleases,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        Loading releases…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="card border-red-900 text-red-400 text-sm py-6 text-center">
        Failed to load releases.
      </div>
    )
  }

  if (!releases || releases.length === 0) {
    return (
      <div className="text-center py-24 space-y-3">
        <p className="text-5xl">⛰</p>
        <p className="text-slate-400 text-lg">No test runs yet.</p>
        <p className="text-slate-600 text-sm">
          An admin can create releases and milestones via the{' '}
          <Link to="/admin" className="text-emerald-400 hover:underline">Admin panel</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Rocky Linux Test Runs</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {releases.map((release) => {
          const sorted = [...release.milestones].sort(
            (a, b) =>
              MILESTONE_ORDER.indexOf(a.name.toLowerCase()) -
              MILESTONE_ORDER.indexOf(b.name.toLowerCase()),
          )
          return (
            <div key={release.id} className="card space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Rocky Linux {release.version}
                </h2>
                {release.notes && (
                  <p className="text-xs text-slate-500 mt-0.5">{release.notes}</p>
                )}
              </div>

              {sorted.length === 0 ? (
                <p className="text-xs text-slate-600">No milestones yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {sorted.map((m) => (
                    <Link
                      key={m.id}
                      to={`/milestones/${m.id}`}
                      className="flex items-center justify-between rounded border border-slate-700 px-3 py-2 hover:border-emerald-700 hover:bg-slate-800 transition-colors"
                    >
                      <span className="flex items-center text-sm text-slate-200">
                        <span className={statusDot(m.status)} />
                        {m.name.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-500">
                        {m.status === 'open' ? 'Active' : 'Closed'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
