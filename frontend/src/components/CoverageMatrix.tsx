import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getCoverageSummary } from '../lib/api'
import type { CategorySummary } from '../lib/api'

const CONFIDENCE_STYLES: Record<string, { dot: string; title: string }> = {
  none: { dot: '', title: '' },
  low: { dot: 'bg-slate-500', title: 'Low confidence (few/anonymous results)' },
  medium: { dot: 'bg-blue-400', title: 'Medium confidence' },
  high: { dot: 'bg-emerald-400', title: 'High confidence (trusted testers / diverse hardware)' },
}

function CellContent({
  covered,
  total,
  confidence,
}: {
  covered: number
  total: number
  confidence?: string
}) {
  if (total === 0) return <span className="text-slate-700">—</span>
  const pct = Math.round((covered / total) * 100)
  const color =
    pct === 100
      ? 'text-emerald-400'
      : pct > 0
      ? 'text-yellow-400'
      : 'text-slate-500'

  const conf = confidence && confidence !== 'none' ? CONFIDENCE_STYLES[confidence] : null

  return (
    <span className={`font-mono text-xs ${color} inline-flex items-center gap-1`}>
      {covered}/{total}
      {conf && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${conf.dot} shrink-0`}
          title={conf.title}
        />
      )}
    </span>
  )
}

function CellBg(covered: number, total: number): string {
  if (total === 0) return ''
  const pct = Math.round((covered / total) * 100)
  if (pct === 100) return 'bg-emerald-950/30'
  if (pct > 0) return 'bg-yellow-950/20'
  return ''
}

function ExpandedSections({
  category,
  arches,
  onSectionClick,
}: {
  category: CategorySummary
  arches: string[]
  onSectionClick: (sectionId: number) => void
}) {
  return (
    <tr>
      <td colSpan={arches.length + 1} className="p-0">
        <div className="border-t border-slate-800 bg-slate-900/40 px-4 py-2 space-y-1">
          {category.sections.map((sec) => (
            <button
              key={sec.section_id}
              type="button"
              className="w-full flex items-center gap-3 text-left px-2 py-1.5 rounded hover:bg-slate-800/60 transition-colors group"
              onClick={() => onSectionClick(sec.section_id)}
            >
              <span className="text-xs text-slate-400 flex-1 min-w-0 truncate">
                {sec.name}
                {sec.arch && (
                  <span className="text-slate-600 ml-1">({sec.arch})</span>
                )}
              </span>
              <span
                className={`text-xs font-mono ${
                  sec.total > 0 && sec.covered === sec.total
                    ? 'text-emerald-400'
                    : sec.covered > 0
                    ? 'text-yellow-400'
                    : 'text-slate-600'
                }`}
              >
                {sec.covered}/{sec.total}
              </span>
              <span className="text-xs text-slate-700 group-hover:text-slate-400 transition-colors">
                view →
              </span>
            </button>
          ))}
        </div>
      </td>
    </tr>
  )
}

export default function CoverageMatrix({
  milestoneId,
  releaseName,
  milestoneName,
  startDate,
  endDate,
  onSectionClick,
}: {
  milestoneId: number
  releaseName: string
  milestoneName: string
  startDate: string | null
  endDate: string | null
  onSectionClick: (sectionId: number) => void
}) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['coverage-summary', milestoneId],
    queryFn: () => getCoverageSummary(milestoneId),
  })

  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  if (isLoading || !summary) {
    return (
      <div className="card animate-pulse h-48 flex items-center justify-center text-slate-600 text-sm">
        Loading coverage...
      </div>
    )
  }

  // Collect all arches that appear across categories
  const archSet = new Set<string>()
  for (const cat of summary.categories) {
    for (const arch of Object.keys(cat.by_arch)) {
      archSet.add(arch)
    }
  }
  // Also include global by_arch keys
  for (const arch of Object.keys(summary.by_arch)) {
    archSet.add(arch)
  }
  const arches = ['x86_64', 'aarch64', 'ppc64le', 's390x'].filter((a) =>
    archSet.has(a),
  )

  const totalPct =
    summary.total_tests > 0
      ? Math.round((summary.total_with_results / summary.total_tests) * 100)
      : 0

  const fmtDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : null

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

        {/* Overall progress bar */}
        <div className="space-y-1">
          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${
                totalPct === 100
                  ? 'bg-emerald-500'
                  : totalPct > 0
                  ? 'bg-emerald-600'
                  : 'bg-slate-700'
              }`}
              style={{ width: `${totalPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>
              {summary.total_with_results} of {summary.total_tests} tests have
              results
            </span>
            {summary.hardware_configs > 0 && (
              <span>
                {summary.hardware_configs} hardware config
                {summary.hardware_configs !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Category
              </th>
              {arches.map((arch) => (
                <th
                  key={arch}
                  className="text-center px-3 py-2.5 text-xs font-mono text-slate-500"
                >
                  {arch}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.categories.map((cat) => {
              const isExpanded = expandedCat === cat.category
              const rowPct =
                cat.total > 0
                  ? Math.round((cat.covered / cat.total) * 100)
                  : 0

              return (
                <>
                  <tr
                    key={cat.category}
                    className={`border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors ${
                      isExpanded ? 'bg-slate-800/40' : ''
                    }`}
                    onClick={() =>
                      setExpandedCat(isExpanded ? null : cat.category)
                    }
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 text-xs w-3">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        <span className="font-semibold text-slate-200 text-sm">
                          {cat.label}
                        </span>
                        <span
                          className={`text-xs font-mono ml-1 ${
                            rowPct === 100
                              ? 'text-emerald-500'
                              : rowPct > 0
                              ? 'text-slate-400'
                              : 'text-slate-600'
                          }`}
                        >
                          {cat.covered}/{cat.total}
                        </span>
                      </div>
                    </td>
                    {arches.map((arch) => {
                      const archData = cat.by_arch[arch]
                      const total = archData?.total ?? 0
                      const covered = archData?.covered ?? 0
                      const confidence = archData?.confidence ?? 'none'
                      return (
                        <td
                          key={arch}
                          className={`text-center px-3 py-2.5 ${CellBg(covered, total)}`}
                        >
                          <CellContent covered={covered} total={total} confidence={confidence} />
                        </td>
                      )
                    })}
                  </tr>
                  {isExpanded && (
                    <ExpandedSections
                      key={`${cat.category}-expanded`}
                      category={cat}
                      arches={arches}
                      onSectionClick={onSectionClick}
                    />
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Confidence legend */}
      <div className="px-5 py-2.5 border-t border-slate-800 flex items-center gap-4 text-xs text-slate-600">
        <span>Confidence:</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> Low
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> High
        </span>
      </div>
    </div>
  )
}
