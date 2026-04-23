import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { submitResult } from '../lib/api'
import { useAppStore } from '../lib/store'

const ARCHES = ['x86_64', 'aarch64', 'ppc64le', 's390x']
const DEPLOY_TYPES = ['bare metal', 'vm-kvm', 'vm-virtualbox', 'vm-vmware', 'container', 'cloud-aws', 'cloud-azure', 'cloud-gcp', 'other']
const OUTCOMES = ['PASS', 'FAIL', 'PARTIAL', 'SKIP'] as const

type FormMode = 'quick' | 'detailed'
type QuickOutcome = 'works' | 'issues' | 'broken'

interface Props {
  testCaseId: number
  milestoneId: number
  onClose: () => void
}

export default function ResultForm({ testCaseId, milestoneId, onClose }: Props) {
  const { username, user, mode: appMode, preferredArch } = useAppStore()
  const isGuided = appMode === 'guided'
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<FormMode>('quick')
  const [showDetails, setShowDetails] = useState(false)

  // Quick mode state
  const [quickOutcome, setQuickOutcome] = useState<QuickOutcome | null>(null)

  // Detailed mode state
  const [outcome, setOutcome] = useState<string>('PASS')
  const [bugUrl, setBugUrl] = useState('')
  const [hardwareNotes, setHardwareNotes] = useState('')

  // Shared state
  const [arch, setArch] = useState(preferredArch || ARCHES[0])
  const [deployType, setDeployType] = useState(DEPLOY_TYPES[0])
  const [comment, setComment] = useState('')
  const [submitterName, setSubmitterName] = useState(username)

  const mutation = useMutation({
    mutationFn: () => {
      if (mode === 'quick') {
        return submitResult(testCaseId, {
          outcome: 'PASS',
          arch,
          deploy_type: deployType,
          comment: comment || undefined,
          submitter_name: submitterName || undefined,
          submission_method: 'quick',
          quick_outcome: quickOutcome!,
        })
      }
      return submitResult(testCaseId, {
        outcome,
        arch,
        deploy_type: deployType,
        hardware_notes: hardwareNotes || undefined,
        comment: comment || undefined,
        submitter_name: submitterName || undefined,
        submission_method: 'detailed',
        bug_url: bugUrl || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone', milestoneId] })
      queryClient.invalidateQueries({ queryKey: ['coverage', milestoneId] })
      queryClient.invalidateQueries({ queryKey: ['urgent-needs', milestoneId] })
      onClose()
    },
  })

  const outcomeColors: Record<string, string> = {
    PASS: 'border-emerald-600 bg-emerald-900/30 text-emerald-300',
    FAIL: 'border-red-600 bg-red-900/30 text-red-300',
    PARTIAL: 'border-yellow-600 bg-yellow-900/30 text-yellow-300',
    SKIP: 'border-slate-600 bg-slate-800 text-slate-400',
  }

  const canSubmit = mode === 'quick' ? quickOutcome !== null : true

  return (
    <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/80 p-4 space-y-3">
      {/* Mode toggle — hidden in guided mode */}
      {!isGuided && (
        <div className="flex items-center gap-1 rounded-lg bg-slate-800 p-0.5 w-fit">
          {(['quick', 'detailed'] as FormMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                mode === m ? 'bg-slate-600 text-slate-100' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {m === 'quick' ? 'Quick' : 'Detailed'}
            </button>
          ))}
        </div>
      )}

      {mode === 'quick' ? (
        <>
          <p className="text-xs text-slate-500">How did testing go?</p>
          <div className="flex gap-2">
            {([
              { key: 'works' as QuickOutcome, icon: '👍', label: 'Works', active: 'border-emerald-500 bg-emerald-900/40 text-emerald-300' },
              { key: 'issues' as QuickOutcome, icon: '⚠️', label: 'Issues', active: 'border-yellow-500 bg-yellow-900/40 text-yellow-300' },
              { key: 'broken' as QuickOutcome, icon: '❌', label: 'Broken', active: 'border-red-500 bg-red-900/40 text-red-300' },
            ]).map(({ key, icon, label, active }) => (
              <button
                key={key}
                type="button"
                onClick={() => setQuickOutcome(key)}
                className={`flex-1 rounded-lg border-2 py-3 text-center cursor-pointer transition-all ${
                  quickOutcome === key ? active : 'border-slate-700 text-slate-500 hover:border-slate-500'
                }`}
              >
                <div className="text-2xl">{icon}</div>
                <div className="text-xs font-semibold mt-1">{label}</div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Outcome</p>
          <div className="flex gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOutcome(o)}
                className={`rounded border px-3 py-1 text-xs font-semibold transition-colors ${
                  outcome === o ? outcomeColors[o] : 'border-slate-700 bg-slate-800 text-slate-500 hover:border-slate-500'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Shared fields */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Architecture</label>
          <select className="input w-full" value={arch} onChange={(e) => setArch(e.target.value)}>
            {ARCHES.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Deploy type</label>
          <select className="input w-full" value={deployType} onChange={(e) => setDeployType(e.target.value)}>
            {DEPLOY_TYPES.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">
            Your name {user ? '' : '(optional)'}
          </label>
          <input
            className="input w-full"
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
            placeholder="anonymous"
            disabled={!!user}
          />
          {user && (
            <p className="text-xs text-slate-600 mt-0.5">Signed in as @{user.username}</p>
          )}
        </div>
      </div>

      {/* In guided mode: "Add details ▸" expander instead of always-visible fields */}
      {isGuided && mode === 'quick' && !showDetails && (
        <button
          type="button"
          className="text-xs text-slate-600 hover:text-slate-400"
          onClick={() => setShowDetails(true)}
        >
          Add details ▸
        </button>
      )}

      {/* Comment field — always visible in detailed mode, conditionally in guided */}
      {(mode === 'detailed' || !isGuided || showDetails) && (
        <div>
          <label className="block text-xs text-slate-500 mb-1">Comment (optional)</label>
          <textarea
            className="input w-full h-16 resize-none"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. Failed on step 3 — kernel panic during install"
          />
        </div>
      )}

      {mode === 'detailed' && (
        <>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Hardware notes (optional)</label>
            <textarea
              className="input w-full h-16 resize-none"
              value={hardwareNotes}
              onChange={(e) => setHardwareNotes(e.target.value)}
              placeholder="e.g. ThinkPad X1 Carbon, 32GB RAM, SSD"
            />
          </div>
          {(outcome === 'FAIL' || outcome === 'PARTIAL') && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Bug URL (optional)</label>
              <input
                className="input w-full"
                value={bugUrl}
                onChange={(e) => setBugUrl(e.target.value)}
                placeholder="https://bugs.rockylinux.org/..."
              />
            </div>
          )}
        </>
      )}

      {mutation.isError && (
        <p className="text-xs text-red-400">{String(mutation.error)}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={mutation.isPending || !canSubmit}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Submitting…' : 'Submit'}
        </button>
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}
