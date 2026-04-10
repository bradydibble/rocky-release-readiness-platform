import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { deleteResult, getResults, removeSignoff, signoffTestCase } from '../lib/api'
import type { TestCase } from '../lib/api'
import { useAppStore } from '../lib/store'
import ResultForm from './ResultForm'

const outcomeColor: Record<string, string> = {
  PASS: 'text-emerald-400',
  FAIL: 'text-red-400',
  PARTIAL: 'text-yellow-400',
  SKIP: 'text-slate-500',
}

interface Props {
  tc: TestCase
  milestoneId: number
  archFilter: string
}

export default function TestCaseRow({ tc, milestoneId, archFilter }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const isAdmin = useAppStore((s) => s.isAdmin)
  const queryClient = useQueryClient()

  const { data: results } = useQuery({
    queryKey: ['results', tc.id],
    queryFn: () => getResults(tc.id),
    enabled: expanded,
  })

  const signoffMutation = useMutation({
    mutationFn: () => (tc.admin_signoff ? removeSignoff(tc.id) : signoffTestCase(tc.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['milestone', milestoneId] }),
  })

  const deleteResultMutation = useMutation({
    mutationFn: (id: number) => deleteResult(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results', tc.id] })
      queryClient.invalidateQueries({ queryKey: ['milestone', milestoneId] })
      queryClient.invalidateQueries({ queryKey: ['coverage', milestoneId] })
    },
  })

  // Summary counts (filtered by arch if set)
  const relevantArches = archFilter
    ? [archFilter]
    : Object.keys(tc.counts_by_arch)

  const totals = relevantArches.reduce(
    (acc, a) => {
      const c = tc.counts_by_arch[a]
      if (!c) return acc
      return {
        pass: acc.pass + c.pass_count,
        fail: acc.fail + c.fail_count,
        partial: acc.partial + c.partial_count,
        skip: acc.skip + c.skip_count,
      }
    },
    { pass: 0, fail: 0, partial: 0, skip: 0 },
  )
  const hasResults = totals.pass + totals.fail + totals.partial + totals.skip > 0

  return (
    <div className="border-b border-slate-800 last:border-0">
      <div
        className="flex items-start gap-3 py-2.5 px-1 hover:bg-slate-800/30 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Expand arrow */}
        <span className="mt-0.5 text-slate-600 text-xs w-3 shrink-0">
          {expanded ? '▼' : '▶'}
        </span>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {tc.blocking === 'blocker' && (
              <span className="badge-blocker">BLOCKER</span>
            )}
            {tc.admin_signoff && (
              <span className="badge-signoff">✓ SIGNED OFF</span>
            )}
            <span className="text-sm text-slate-200">{tc.name}</span>
            {tc.procedure_url && (
              <a
                href={tc.procedure_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Procedure ↗
              </a>
            )}
          </div>
        </div>

        {/* Result counts */}
        <div className="flex items-center gap-2 text-xs shrink-0">
          {hasResults ? (
            <>
              {totals.pass > 0 && <span className="text-emerald-400">{totals.pass}P</span>}
              {totals.fail > 0 && <span className="text-red-400">{totals.fail}F</span>}
              {totals.partial > 0 && <span className="text-yellow-400">{totals.partial}~</span>}
              {totals.skip > 0 && <span className="text-slate-500">{totals.skip}S</span>}
            </>
          ) : (
            <span className="text-slate-600">untested</span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="pl-6 pb-3 space-y-2">
          {/* Admin actions */}
          {isAdmin && (
            <div className="flex gap-2">
              <button
                className={tc.admin_signoff ? 'btn-ghost text-xs' : 'btn-outline text-xs'}
                onClick={() => signoffMutation.mutate()}
                disabled={signoffMutation.isPending}
              >
                {tc.admin_signoff ? 'Remove sign-off' : 'Sign off'}
              </button>
            </div>
          )}

          {/* Results list */}
          {results && results.length > 0 && (
            <div className="space-y-1">
              {results
                .filter((r) => !archFilter || r.arch === archFilter)
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 rounded bg-slate-800/50 px-2 py-1.5 text-xs"
                  >
                    <span className={`font-semibold w-12 ${outcomeColor[r.outcome]}`}>
                      {r.outcome}
                    </span>
                    <span className="text-slate-400 font-mono">{r.arch}</span>
                    <span className="text-slate-500">{r.deploy_type}</span>
                    {r.hardware_notes && (
                      <span className="text-slate-600 truncate max-w-[200px]" title={r.hardware_notes}>
                        {r.hardware_notes}
                      </span>
                    )}
                    <span className="text-slate-600 ml-auto">
                      {r.submitter_name || 'anonymous'}
                    </span>
                    {r.carried_from_milestone_id && (
                      <span className="text-blue-600 text-xs" title="Carried forward">↩</span>
                    )}
                    {isAdmin && (
                      <button
                        className="text-slate-600 hover:text-red-400 ml-1"
                        onClick={() => deleteResultMutation.mutate(r.id)}
                        title="Delete result"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Submit result form */}
          {showForm ? (
            <ResultForm
              testCaseId={tc.id}
              milestoneId={milestoneId}
              onClose={() => setShowForm(false)}
            />
          ) : (
            <button className="btn-outline text-xs" onClick={() => setShowForm(true)}>
              + Submit result
            </button>
          )}
        </div>
      )}
    </div>
  )
}
