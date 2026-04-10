import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CoverageGrid from '../components/CoverageGrid'
import FiltersBar, { type Filters } from '../components/FiltersBar'
import TestCaseRow from '../components/TestCaseRow'
import { getCoverage, getMilestone } from '../lib/api'
import type { Section, TestCase } from '../lib/api'

function isUntested(tc: TestCase, archFilter: string): boolean {
  if (archFilter) {
    const c = tc.counts_by_arch[archFilter]
    if (!c) return true
    return c.pass_count + c.fail_count + c.partial_count + c.skip_count === 0
  }
  return Object.keys(tc.counts_by_arch).length === 0
}

function filterTestCases(tcs: TestCase[], filters: Filters): TestCase[] {
  return tcs.filter((tc) => {
    if (filters.blockersOnly && tc.blocking !== 'blocker') return false
    if (filters.untestedOnly && !isUntested(tc, filters.arch)) return false
    return true
  })
}

export function Component() {
  const { id } = useParams<{ id: string }>()
  const milestoneId = Number(id)

  const [filters, setFilters] = useState<Filters>({
    untestedOnly: false,
    blockersOnly: false,
    arch: '',
  })
  const [showGrid, setShowGrid] = useState(true)

  const { data: milestone, isLoading } = useQuery({
    queryKey: ['milestone', milestoneId],
    queryFn: () => getMilestone(milestoneId),
  })

  const { data: coverage } = useQuery({
    queryKey: ['coverage', milestoneId],
    queryFn: () => getCoverage(milestoneId),
    enabled: showGrid,
  })

  if (isLoading || !milestone) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        Loading…
      </div>
    )
  }

  // Visible sections after filtering
  const visibleSections: (Section & { filtered_test_cases: TestCase[] })[] = milestone.sections
    .map((sec) => ({
      ...sec,
      filtered_test_cases: filterTestCases(sec.test_cases, filters),
    }))
    .filter((sec) => sec.filtered_test_cases.length > 0)

  const totalTc = milestone.sections.reduce((s, sec) => s + sec.test_cases.length, 0)
  const testedTc = milestone.sections.reduce((s, sec) => {
    return (
      s +
      sec.test_cases.filter(
        (tc) => Object.values(tc.counts_by_arch).some(
          (c) => c.pass_count + c.fail_count + c.partial_count > 0,
        ),
      ).length
    )
  }, 0)

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div className="space-y-1">
        <nav className="text-xs text-slate-500">
          <Link to="/" className="hover:text-slate-300">Releases</Link>
          {' / '}
          <span>Rocky Linux {milestone.release_version}</span>
        </nav>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-100">
            {milestone.name.toUpperCase()} Test Run
          </h1>
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold ${
              milestone.status === 'open'
                ? 'bg-emerald-900 text-emerald-300'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            {milestone.status.toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-slate-400">
          {testedTc} / {totalTc} test cases have results
        </p>
      </div>

      {/* Coverage grid */}
      <div className="card space-y-3">
        <button
          className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-slate-100"
          onClick={() => setShowGrid(!showGrid)}
        >
          <span>{showGrid ? '▼' : '▶'}</span>
          Coverage Grid
        </button>
        {showGrid && coverage && <CoverageGrid data={coverage} />}
      </div>

      {/* Filters */}
      <FiltersBar filters={filters} onChange={setFilters} />

      {/* Test case list by section */}
      {visibleSections.length === 0 ? (
        <div className="card text-center text-slate-500 py-8 text-sm">
          No test cases match the current filters.
        </div>
      ) : (
        <div className="space-y-4">
          {visibleSections.map((sec) => (
            <div key={sec.id} className="card p-0 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
                <span className="font-semibold text-slate-200 text-sm">{sec.name}</span>
                {sec.architecture && (
                  <span className="text-xs text-slate-500">{sec.architecture}</span>
                )}
                <span className="ml-auto text-xs text-slate-600">
                  {sec.filtered_test_cases.length} test{sec.filtered_test_cases.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="px-3">
                {sec.filtered_test_cases.map((tc) => (
                  <TestCaseRow
                    key={tc.id}
                    tc={tc}
                    milestoneId={milestoneId}
                    archFilter={filters.arch}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
