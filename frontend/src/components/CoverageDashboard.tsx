import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getCoverageSummary } from '../lib/api'
import type { CategorySummary, CategorySectionSummary } from '../lib/api'

function ProgressBar({
  covered,
  total,
  size = 'md',
}: {
  covered: number
  total: number
  size?: 'sm' | 'md'
}) {
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0
  const h = size === 'sm' ? 'h-1.5' : 'h-2'

  return (
    <div className={`w-full bg-slate-700 rounded-full ${h} overflow-hidden`}>
      <div
        className={`${h} rounded-full transition-all ${
          pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-emerald-600' : 'bg-slate-700'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function SectionRow({ section }: { section: CategorySectionSummary }) {
  const pct = section.total > 0 ? Math.round((section.covered / section.total) * 100) : 0

  return (
    <div className="flex items-center gap-3 py-1.5 px-2">
      <span className="text-xs text-slate-400 flex-1 min-w-0 truncate">
        {section.name}
        {section.arch && (
          <span className="text-slate-600 ml-1">({section.arch})</span>
        )}
      </span>
      <div className="w-24 shrink-0">
        <ProgressBar covered={section.covered} total={section.total} size="sm" />
      </div>
      <span
        className={`text-xs font-mono w-12 text-right shrink-0 ${
          pct === 100 ? 'text-emerald-400' : pct > 0 ? 'text-slate-400' : 'text-slate-600'
        }`}
      >
        {section.covered}/{section.total}
      </span>
    </div>
  )
}

function CategoryRow({ category }: { category: CategorySummary }) {
  const [expanded, setExpanded] = useState(false)
  const pct = category.total > 0 ? Math.round((category.covered / category.total) * 100) : 0

  return (
    <div className="border-b border-slate-800 last:border-0">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/40 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-slate-600 text-xs w-3 shrink-0">
          {expanded ? '▼' : '▶'}
        </span>
        <span className="text-sm font-semibold text-slate-200 w-40 shrink-0 truncate">
          {category.label}
        </span>
        <span
          className={`text-xs font-mono w-12 shrink-0 ${
            pct === 100 ? 'text-emerald-400' : pct > 0 ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          {category.covered}/{category.total}
        </span>
        <div className="flex-1 min-w-0">
          <ProgressBar covered={category.covered} total={category.total} />
        </div>
      </button>
      {expanded && category.sections.length > 0 && (
        <div className="pb-2 pl-7">
          {category.sections.map((sec) => (
            <SectionRow key={sec.section_id} section={sec} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CoverageDashboard({
  milestoneId,
  releaseName,
  milestoneName,
  startDate,
  endDate,
}: {
  milestoneId: number
  releaseName: string
  milestoneName: string
  startDate: string | null
  endDate: string | null
}) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['coverage-summary', milestoneId],
    queryFn: () => getCoverageSummary(milestoneId),
  })

  if (isLoading || !summary) {
    return (
      <div className="card animate-pulse h-48 flex items-center justify-center text-slate-600 text-sm">
        Loading coverage...
      </div>
    )
  }

  const totalPct = summary.total_tests > 0
    ? Math.round((summary.total_with_results / summary.total_tests) * 100)
    : 0

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null

  const start = fmtDate(startDate)
  const end = fmtDate(endDate)

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/30 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 space-y-3 border-b border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-100">
              {releaseName} {milestoneName.toUpperCase()}
            </h2>
            {start && (
              <p className="text-xs text-slate-500">
                Testing window: {start} – {end ?? 'open'}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-slate-100">{totalPct}%</p>
            <p className="text-xs text-slate-500">coverage</p>
          </div>
        </div>

        {/* Overall progress */}
        <div className="space-y-1">
          <ProgressBar covered={summary.total_with_results} total={summary.total_tests} />
          <div className="flex justify-between text-xs text-slate-500">
            <span>{summary.total_with_results} of {summary.total_tests} tests have results</span>
            {summary.hardware_configs > 0 && (
              <span>{summary.hardware_configs} hardware config{summary.hardware_configs !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {/* Architecture breakdown */}
        {Object.keys(summary.by_arch).length > 0 && (
          <div className="flex flex-wrap gap-3 pt-1">
            {Object.entries(summary.by_arch).map(([arch, data]) => {
              const archPct = data.total > 0 ? Math.round((data.covered / data.total) * 100) : 0
              return (
                <div key={arch} className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-slate-400">{arch}</span>
                  <div className="w-12">
                    <ProgressBar covered={data.covered} total={data.total} size="sm" />
                  </div>
                  <span className="text-xs text-slate-600">{archPct}%</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Categories */}
      <div>
        {summary.categories.map((cat) => (
          <CategoryRow key={cat.category} category={cat} />
        ))}
      </div>
    </div>
  )
}
