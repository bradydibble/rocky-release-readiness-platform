import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getReleases } from '../lib/api'
import type { MilestoneStub } from '../lib/api'
import { useAppStore } from '../lib/store'

const MILESTONE_ORDER = ['lookahead', 'beta', 'rc1', 'rc2']

function formatDate(d: string | null): string | null {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function MilestoneCard({ m }: { m: MilestoneStub }) {
  const pct = m.test_case_count > 0
    ? Math.round((m.result_count / m.test_case_count) * 100)
    : 0
  const startFmt = formatDate(m.start_date)
  const endFmt = formatDate(m.end_date)
  const isOpen = m.status === 'open'

  return (
    <Link
      to={`/milestones/${m.id}`}
      className={`block rounded border px-3 py-2.5 transition-colors space-y-1.5 ${
        isOpen
          ? 'border-emerald-800/60 hover:border-emerald-600 hover:bg-slate-800'
          : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm text-slate-200 font-medium">
          <span className={`w-2 h-2 rounded-full inline-block ${isOpen ? 'bg-emerald-500' : 'bg-slate-600'}`} />
          {m.name.toUpperCase()}
        </span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
            isOpen ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-800 text-slate-500'
          }`}
        >
          {isOpen ? 'Active' : 'Closed'}
        </span>
      </div>

      {/* Progress bar */}
      {m.test_case_count > 0 && (
        <div className="space-y-0.5">
          <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>{m.result_count} result{m.result_count !== 1 ? 's' : ''}</span>
            <span>{m.test_case_count} test{m.test_case_count !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Date range */}
      {startFmt && (
        <p className="text-xs text-slate-600">
          {startFmt}{endFmt ? ` – ${endFmt}` : ' – open'}
        </p>
      )}
    </Link>
  )
}

// Export as named so react-router lazy() works
export function Component() {
  const { data: releases, isLoading, isError } = useQuery({
    queryKey: ['releases'],
    queryFn: getReleases,
  })

  const visited = useAppStore((s) => s.visited)
  const [showHowTo, setShowHowTo] = useState(!visited)

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
        <p className="text-slate-400 text-lg">No test runs open yet.</p>
        <p className="text-slate-500 text-sm">
          Check back when the next RC opens, or{' '}
          <a
            href="https://chat.rockylinux.org/rocky-linux/channels/testing"
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:underline"
          >
            watch #testing on Mattermost ↗
          </a>{' '}
          for announcements.
        </p>
        {/* Admin accesses /admin directly */}
      </div>
    )
  }

  // Find the first open milestone for the hero band
  const heroMilestone = releases
    .flatMap((r) =>
      r.milestones
        .filter((m) => m.status === 'open')
        .map((m) => ({ ...m, releaseName: `${r.name} ${r.version}` }))
    )[0]

  const untestedPct = heroMilestone && heroMilestone.test_case_count > 0
    ? heroMilestone.test_case_count - heroMilestone.result_count
    : null

  return (
    <div className="space-y-6">
      {/* Hero band — only when an active milestone exists */}
      {heroMilestone && (
        <div className="rounded-xl border border-emerald-800 bg-emerald-950/20 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs text-emerald-600 uppercase tracking-widest font-semibold">
              Community testing open
            </p>
            <h1 className="text-xl font-bold text-slate-100">
              {heroMilestone.releaseName} — {heroMilestone.name.toUpperCase()}
            </h1>
            <p className="text-sm text-slate-400 max-w-lg">
              Community members install this pre-release build and report whether basic things work.
              Their results help the team decide if it's ready to ship.
              {' '}<span className="text-slate-500">No account needed.</span>
            </p>
            {untestedPct !== null && untestedPct > 0 && (
              <p className="text-xs text-slate-500">
                <span className="text-red-400 font-semibold">{untestedPct}</span> test{untestedPct !== 1 ? 's' : ''} still need results
              </p>
            )}
            {untestedPct === 0 && (
              <p className="text-xs text-emerald-600">All tests have at least one result — thank you!</p>
            )}
          </div>
          <Link
            to={`/milestones/${heroMilestone.id}`}
            className="btn-primary shrink-0"
          >
            Start Testing →
          </Link>
        </div>
      )}

      {/* How it works — shown on first visit, collapsible after */}
      {!visited && (
        <div className="card space-y-3">
          <button
            className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-slate-100 w-full"
            onClick={() => setShowHowTo(!showHowTo)}
          >
            <span className="text-base">{showHowTo ? '▼' : '▶'}</span>
            How to help test Rocky Linux
          </button>
          {showHowTo && (
            <div className="grid gap-4 sm:grid-cols-3 pt-1">
              {[
                {
                  num: '1',
                  title: 'Get the pre-release build',
                  body: 'Download the beta ISO and install it on a machine or VM, or upgrade an existing Rocky install to the beta repo. The test page has a download link.',
                },
                {
                  num: '2',
                  title: 'Run a few checks',
                  body: 'Pick tests for your architecture. Each one shows the exact commands to run and what to look for. Most take under 5 minutes.',
                },
                {
                  num: '3',
                  title: 'Report what you see',
                  body: 'Works, Has issues, or Broken — that\'s it. No account needed. Your results go directly to the release team.',
                },
              ].map((step) => (
                <div key={step.num} className="flex gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-900 text-emerald-300 text-sm font-bold shrink-0">
                    {step.num}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{step.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Release grid */}
      {!heroMilestone && (
        <h2 className="text-lg font-semibold text-slate-400">Past test runs</h2>
      )}
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
                    <MilestoneCard key={m.id} m={m} />
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
