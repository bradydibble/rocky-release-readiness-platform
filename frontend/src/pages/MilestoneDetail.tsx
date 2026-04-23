import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BulkUploadModal from '../components/BulkUploadModal'
import CoverageMatrix from '../components/CoverageMatrix'
import FiltersBar, { type Filters } from '../components/FiltersBar'
import GuidedJourney from '../components/GuidedJourney'
import OnboardingGuide from '../components/OnboardingGuide'
import TestCaseRow from '../components/TestCaseRow'
import {
  exportMilestoneJson,
  exportMilestoneMarkdown,
  getHardwareCoverage,
  getMilestone,
  getUrgentNeeds,
} from '../lib/api'
import type { HardwareEntry, Section, TestCase } from '../lib/api'
import { useAppStore } from '../lib/store'

const ARCHES = ['x86_64', 'aarch64', 'ppc64le', 's390x'] as const

const DEPLOY_ICONS: Record<string, string> = {
  'bare-metal': '🖥',
  'bare metal': '🖥',
  'vm-kvm': '⚙️',
  'vm-vmware': '☁️',
  'vm-virtualbox': '📦',
  'vm-hyperv': '🪟',
  'cloud-aws': '☁️',
  'cloud-azure': '☁️',
  'cloud-gcp': '☁️',
  container: '🐳',
}

// ── helpers ───────────────────────────────────────────────────────────────────

function isUntested(tc: TestCase, arch: string): boolean {
  if (arch) {
    const c = tc.counts_by_arch[arch]
    if (!c) return true
    return c.pass_count + c.fail_count + c.partial_count + c.skip_count === 0
  }
  return Object.keys(tc.counts_by_arch).length === 0
}

function filterTestCases(tcs: TestCase[], filters: Filters, arch: string): TestCase[] {
  return tcs.filter((tc) => {
    if (filters.blockersOnly && tc.blocking !== 'blocker') return false
    if (filters.untestedOnly && !isUntested(tc, arch)) return false
    return true
  })
}

function tcHasResults(tc: TestCase): boolean {
  return Object.values(tc.counts_by_arch).some(
    (c) => c.pass_count + c.fail_count + c.partial_count + c.skip_count > 0,
  )
}

function formatDate(d: string | null): string {
  if (!d) return 'open'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Hardware Coverage ─────────────────────────────────────────────────────────

function HardwareCoverageSection({ entries }: { entries: HardwareEntry[] }) {
  const [open, setOpen] = useState(false)

  const byArch = entries.reduce<Record<string, HardwareEntry[]>>((acc, e) => {
    if (!acc[e.arch]) acc[e.arch] = []
    acc[e.arch].push(e)
    return acc
  }, {})

  return (
    <div className="card space-y-0 p-0 overflow-hidden">
      <button
        className="flex items-center gap-1.5 w-full px-4 py-3 text-sm font-medium text-slate-300 hover:text-slate-100"
        onClick={() => setOpen(!open)}
      >
        <span>{open ? '▼' : '▶'}</span>
        Hardware Tested
        <span className="text-xs text-slate-600 font-normal ml-1">
          {entries.length} unique configuration{entries.length !== 1 ? 's' : ''}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-800">
          {entries.length === 0 ? (
            <p className="text-xs text-slate-600 pt-3 italic">
              No hardware notes recorded yet. Include hardware details when submitting results.
            </p>
          ) : (
            Object.entries(byArch).map(([arch, items]) => (
              <div key={arch} className="space-y-2 pt-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{arch}</h4>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((e, i) => (
                    <div
                      key={i}
                      className="rounded border border-slate-700 bg-slate-800/40 px-3 py-2 space-y-0.5"
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <span>{DEPLOY_ICONS[e.deploy_type] ?? '💻'}</span>
                        <span className="text-slate-400 font-mono">{e.deploy_type}</span>
                        <span className="ml-auto text-slate-600">{e.result_count} result{e.result_count !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-xs text-slate-300 truncate" title={e.hardware_notes}>
                        {e.hardware_notes}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function Component() {
  const { id } = useParams<{ id: string }>()
  const milestoneId = Number(id)

  const { isAdmin, preferredArch, setPreferredArch, mode, setMode, visited } = useAppStore()

  const [filters, setFilters] = useState<Filters>({ untestedOnly: false, blockersOnly: false })
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  // sections are collapsed by default; expandedSections tracks which are open
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())

  const { data: milestone, isLoading } = useQuery({
    queryKey: ['milestone', milestoneId],
    queryFn: () => getMilestone(milestoneId),
  })

  const { data: urgentNeeds } = useQuery({
    queryKey: ['urgent-needs', milestoneId],
    queryFn: () => getUrgentNeeds(milestoneId),
  })

  const { data: hardwareCoverage } = useQuery({
    queryKey: ['hardware-coverage', milestoneId],
    queryFn: () => getHardwareCoverage(milestoneId),
  })

  if (isLoading || !milestone) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        Loading…
      </div>
    )
  }

  const isOpen = milestone.status === 'open'

  // Arch-filtered visible sections
  const visibleSections: (Section & { filtered_test_cases: TestCase[]; all_count: number; tested_count: number; blocker_count: number })[] =
    milestone.sections
      .filter((sec) => !preferredArch || !sec.architecture || sec.architecture === preferredArch)
      .map((sec) => {
        const filtered = filterTestCases(sec.test_cases, filters, preferredArch)
        const allCount = sec.test_cases.length
        const testedCount = sec.test_cases.filter(tcHasResults).length
        const blockerCount = sec.test_cases.filter((tc) => tc.blocking === 'blocker' && !tcHasResults(tc)).length
        return { ...sec, filtered_test_cases: filtered, all_count: allCount, tested_count: testedCount, blocker_count: blockerCount }
      })
      .filter((sec) => sec.filtered_test_cases.length > 0)

  const toggleSection = (id: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const expandAll = () => setExpandedSections(new Set(visibleSections.map((s) => s.id)))
  const collapseAll = () => setExpandedSections(new Set())

  const switchToGuided = () => {
    setMode('guided')
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div className="space-y-1">
        <nav className="text-xs text-slate-500">
          <Link to="/" className="hover:text-slate-300">Releases</Link>
          {' / '}
          <span>Rocky Linux {milestone.release_version}</span>
        </nav>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-100">
            {milestone.name.toUpperCase()} Test Run
          </h1>
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold ${
              isOpen ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-800 text-slate-500'
            }`}
          >
            {milestone.status.toUpperCase()}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {isOpen && (
              <button className="btn-outline text-xs" onClick={() => setShowBulkUpload(true)}>
                Upload report
              </button>
            )}
            {isAdmin && (
              <div className="relative">
                <button className="btn-ghost text-xs" onClick={() => setShowExportMenu(!showExportMenu)}>
                  Export ▾
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 z-10 rounded-lg border border-slate-700 bg-slate-900 shadow-lg py-1 min-w-[160px]">
                    <a href={exportMilestoneJson(milestoneId)} download className="block px-4 py-2 text-xs text-slate-300 hover:bg-slate-800" onClick={() => setShowExportMenu(false)}>
                      Export JSON
                    </a>
                    <a href={exportMilestoneMarkdown(milestoneId)} download className="block px-4 py-2 text-xs text-slate-300 hover:bg-slate-800" onClick={() => setShowExportMenu(false)}>
                      Export Markdown
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {milestone.start_date && (
          <p className="text-xs text-slate-500">
            Testing window: {formatDate(milestone.start_date)} – {formatDate(milestone.end_date)}
          </p>
        )}

        <p className="text-xs text-slate-500">{milestone.release_version}</p>
      </div>

      {/* Coverage matrix — visible to all modes */}
      <CoverageMatrix
        milestoneId={milestoneId}
        releaseName={`Rocky Linux ${milestone.release_version}`}
        milestoneName={milestone.name}
        startDate={milestone.start_date}
        endDate={milestone.end_date}
        onSectionClick={(sectionId) => {
          setMode('standard')
          setExpandedSections((prev) => new Set([...prev, sectionId]))
          setTimeout(() => {
            document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 100)
        }}
      />

      {/* ISO download link — set by admin, shown to everyone */}
      {milestone.download_url && (
        <div className="rounded-lg border border-blue-900/50 bg-blue-950/20 px-4 py-3 flex items-center gap-3">
          <span className="text-blue-400 text-lg">⬇</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide">Get the build</p>
            <a
              href={milestone.download_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-300 hover:text-blue-200 hover:underline truncate block"
            >
              {milestone.download_url}
            </a>
          </div>
          <a
            href={milestone.download_url}
            target="_blank"
            rel="noreferrer"
            className="btn-outline text-xs shrink-0"
          >
            Download ↗
          </a>
        </div>
      )}

      {/* Arch picker */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 font-medium">Architecture:</span>
        {(['', ...ARCHES] as string[]).map((arch) => (
          <button
            key={arch}
            type="button"
            onClick={() => setPreferredArch(arch)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              preferredArch === arch
                ? 'bg-emerald-800 text-emerald-200 border border-emerald-700'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            {arch || 'All'}
          </button>
        ))}
      </div>

      {/* Guided mode: onboarding welcome → journey wizard */}
      {mode === 'guided' && isOpen && (
        <div className="space-y-4">
          {!visited && (
            <OnboardingGuide
              releaseName={`${milestone.release_version} ${milestone.name.toUpperCase()}`}
              onDismiss={() => { /* GuidedJourney is already below */ }}
            />
          )}
          {urgentNeeds !== undefined && (
            <GuidedJourney milestone={milestone} needs={urgentNeeds} />
          )}
          <div className="text-center">
            <button
              type="button"
              className="text-xs text-slate-600 hover:text-slate-400"
              onClick={() => setMode('standard')}
            >
              See full test list →
            </button>
          </div>
        </div>
      )}

      {/* Standard mode only: hardware coverage, full test list */}
      {mode === 'standard' && (
        <>
          {/* Hardware coverage */}
          {hardwareCoverage !== undefined && (
            <HardwareCoverageSection entries={hardwareCoverage} />
          )}

          {/* Filters + test list */}
          <FiltersBar filters={filters} onChange={setFilters} />

          {/* Section expand/collapse controls */}
          {visibleSections.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600">
                {visibleSections.length} section{visibleSections.length !== 1 ? 's' : ''}
                {preferredArch && <span className="ml-1">for {preferredArch}</span>}
              </span>
              <button type="button" className="text-xs text-slate-500 hover:text-slate-300" onClick={expandAll}>
                Expand all
              </button>
              <span className="text-slate-700 text-xs">·</span>
              <button type="button" className="text-xs text-slate-500 hover:text-slate-300" onClick={collapseAll}>
                Collapse all
              </button>
              {isOpen && (
                <>
                  <span className="text-slate-700 text-xs ml-auto">·</span>
                  <button
                    type="button"
                    className="text-xs text-emerald-600 hover:text-emerald-400"
                    onClick={switchToGuided}
                  >
                    Need guidance? Try Guided mode →
                  </button>
                </>
              )}
            </div>
          )}

          {visibleSections.length === 0 ? (
            <div className="card text-center text-slate-500 py-8 text-sm">
              No test cases match the current filters.
            </div>
          ) : (
            <div className="space-y-2">
              {visibleSections.map((sec) => {
                const isExpanded = expandedSections.has(sec.id)
                const pct = sec.all_count > 0 ? Math.round((sec.tested_count / sec.all_count) * 100) : 0
                const complete = sec.tested_count === sec.all_count
                const started = sec.tested_count > 0 && !complete

                return (
                  <div key={sec.id} id={`section-${sec.id}`} className="card p-0 overflow-hidden">
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
                      onClick={() => toggleSection(sec.id)}
                    >
                      <span className="text-slate-500 text-xs w-3 shrink-0">{isExpanded ? '▼' : '▶'}</span>

                      <span className="font-semibold text-slate-200 text-sm flex-1 min-w-0 truncate">
                        {sec.name}
                        {sec.architecture && (
                          <span className="ml-2 text-xs font-normal text-slate-500">{sec.architecture}</span>
                        )}
                      </span>

                      <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <div className="w-16 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-500' : started ? 'bg-yellow-500' : 'bg-slate-600'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-xs font-mono w-12 text-right ${complete ? 'text-emerald-400' : started ? 'text-yellow-400' : 'text-slate-600'}`}>
                          {sec.tested_count}/{sec.all_count}
                        </span>
                      </div>

                      {sec.blocker_count > 0 && (
                        <span className="text-xs text-red-500 shrink-0">
                          {sec.blocker_count} critical
                        </span>
                      )}
                      {complete && sec.all_count > 0 && (
                        <span className="text-xs text-emerald-500 shrink-0">✓ done</span>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-3">
                        {sec.filtered_test_cases.map((tc) => (
                          <TestCaseRow
                            key={tc.id}
                            tc={tc}
                            milestoneId={milestoneId}
                            archFilter={preferredArch}
                            sectionName={sec.name}
                          />
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

      {showBulkUpload && (
        <BulkUploadModal milestoneId={milestoneId} onClose={() => setShowBulkUpload(false)} />
      )}
    </div>
  )
}
