import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { submitResult } from '../lib/api'
import { useAppStore } from '../lib/store'

const ARCHES = ['x86_64', 'aarch64', 'ppc64le', 's390x']
const DEPLOY_TYPES = ['bare metal', 'vm-kvm', 'vm-virtualbox', 'vm-vmware', 'container', 'cloud-aws', 'cloud-azure', 'cloud-gcp', 'other']
const OUTCOMES = ['PASS', 'FAIL', 'PARTIAL', 'SKIP'] as const

interface Props {
  testCaseId: number
  milestoneId: number
  onClose: () => void
}

export default function ResultForm({ testCaseId, milestoneId, onClose }: Props) {
  const username = useAppStore((s) => s.username)
  const queryClient = useQueryClient()

  const [outcome, setOutcome] = useState<string>('PASS')
  const [arch, setArch] = useState(ARCHES[0])
  const [deployType, setDeployType] = useState(DEPLOY_TYPES[0])
  const [hardwareNotes, setHardwareNotes] = useState('')
  const [submitterName, setSubmitterName] = useState(username)

  const mutation = useMutation({
    mutationFn: () =>
      submitResult(testCaseId, {
        outcome,
        arch,
        deploy_type: deployType,
        hardware_notes: hardwareNotes || undefined,
        submitter_name: submitterName || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone', milestoneId] })
      queryClient.invalidateQueries({ queryKey: ['coverage', milestoneId] })
      onClose()
    },
  })

  const outcomeColors: Record<string, string> = {
    PASS: 'border-emerald-600 bg-emerald-900/30 text-emerald-300',
    FAIL: 'border-red-600 bg-red-900/30 text-red-300',
    PARTIAL: 'border-yellow-600 bg-yellow-900/30 text-yellow-300',
    SKIP: 'border-slate-600 bg-slate-800 text-slate-400',
  }

  return (
    <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/80 p-4 space-y-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Submit Result</p>

      {/* Outcome */}
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
          <label className="block text-xs text-slate-500 mb-1">Your name (optional)</label>
          <input
            className="input w-full"
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
            placeholder="anonymous"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">Hardware notes (optional)</label>
        <textarea
          className="input w-full h-16 resize-none"
          value={hardwareNotes}
          onChange={(e) => setHardwareNotes(e.target.value)}
          placeholder="e.g. ThinkPad X1 Carbon, 32GB RAM, SSD"
        />
      </div>

      {mutation.isError && (
        <p className="text-xs text-red-400">{String(mutation.error)}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={mutation.isPending}
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
