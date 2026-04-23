import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { bulkImport, type BulkResultItem } from '../lib/api'
import { HELPER_CHECK_MAP } from '../lib/testGuidance'
import { useAppStore } from '../lib/store'

interface HelperOutput {
  arch: string
  deploy_type: string
  hardware_notes?: string
  submitter_name?: string
  kernel?: string
  checks: Record<string, boolean | number | string>
}

function parseHelperOutput(text: string): { items: BulkResultItem[]; meta: HelperOutput } | null {
  try {
    const data: HelperOutput = JSON.parse(text)
    if (!data.checks || !data.arch) return null

    const items: BulkResultItem[] = []

    for (const [checkKey, mapping] of Object.entries(HELPER_CHECK_MAP)) {
      const val = data.checks[checkKey]
      if (val === undefined) continue

      let outcome: string
      if (typeof val === 'boolean') {
        outcome = val ? mapping.outcomeIfTrue : mapping.outcomeIfFalse
      } else if (typeof val === 'number') {
        // failed_services / boot_errors — 0 is good
        outcome = val === 0 ? 'PASS' : 'FAIL'
      } else {
        continue
      }

      const comment =
        checkKey === 'failed_services' && typeof val === 'number' && val > 0
          ? `${val} failed service(s) detected`
          : checkKey === 'boot_errors' && typeof val === 'number' && val > 0
          ? `${val} error-level journal entries on boot`
          : undefined

      items.push({
        section_name: mapping.sectionName,
        test_case_name: mapping.testCasePattern,
        outcome,
        ...(comment ? { comment } : {}),
      })
    }

    return { items, meta: data }
  } catch {
    return null
  }
}

const OUTCOME_COLOR: Record<string, string> = {
  PASS: 'text-emerald-400',
  FAIL: 'text-red-400',
}

interface Props {
  milestoneId: number
  onClose: () => void
}

export default function BulkUploadModal({ milestoneId, onClose }: Props) {
  const username = useAppStore((s) => s.username)
  const queryClient = useQueryClient()

  const [step, setStep] = useState<'intro' | 'paste' | 'preview'>('intro')
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<{ items: BulkResultItem[]; meta: HelperOutput } | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [submitterName, setSubmitterName] = useState(username)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mutation = useMutation({
    mutationFn: () => {
      if (!parsed) throw new Error('Nothing to submit')
      return bulkImport(milestoneId, {
        submitter_name: submitterName || undefined,
        arch: parsed.meta.arch,
        deploy_type: parsed.meta.deploy_type || 'bare-metal',
        hardware_notes: parsed.meta.hardware_notes,
        results: parsed.items,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone', milestoneId] })
      queryClient.invalidateQueries({ queryKey: ['coverage', milestoneId] })
      queryClient.invalidateQueries({ queryKey: ['urgent-needs', milestoneId] })
      onClose()
    },
  })

  const handleParse = () => {
    setParseError(null)
    const result = parseHelperOutput(rawText.trim())
    if (!result) {
      setParseError('Could not parse — make sure you pasted the full JSON output from r3p-helper.sh')
      setParsed(null)
    } else if (result.items.length === 0) {
      setParseError('Parsed successfully but no matching test cases found for this milestone.')
      setParsed(null)
    } else {
      setParsed(result)
      setStep('preview')
    }
  }

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setRawText(text)
    }
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl space-y-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Upload Helper Report</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 text-lg leading-none"
          >
            ×
          </button>
        </div>

        {step === 'intro' ? (
          <>
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                <strong>r3p-helper.sh</strong> is a small bash script that runs <strong>8 read-only checks</strong> on your Rocky Linux system and outputs a JSON report you can paste here.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {[
                  'SELinux enforcing',
                  'Firewall active',
                  'SSH daemon running',
                  'NTP synchronized',
                  'Boot target correct',
                  'DNF healthy',
                  'No failed services',
                  'No boot errors',
                ].map((check) => (
                  <div key={check} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="text-emerald-500">&#10003;</span>
                    {check}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Run on your Rocky system</p>
                <div className="relative">
                  <pre className="bg-slate-800 rounded-lg px-4 py-3 text-xs text-emerald-300 font-mono overflow-x-auto select-all">
                    curl -sSL r3p.bradydibble.com/r3p-helper.sh | bash
                  </pre>
                </div>
                <p className="text-xs text-slate-600">
                  Or download first to inspect:{' '}
                  <code className="text-slate-400">wget r3p.bradydibble.com/r3p-helper.sh && less r3p-helper.sh && bash r3p-helper.sh</code>
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <a
                  href="/r3p-helper.sh"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  View full script source
                </a>
                <a
                  href="/r3p-helper.sh"
                  download
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Download script
                </a>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setStep('paste')}
              >
                I have the output — paste it
              </button>
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        ) : step === 'paste' ? (
          <>
            <p className="text-sm text-slate-400">
              Paste the JSON output from <code className="bg-slate-800 px-1 rounded text-emerald-300">r3p-helper.sh</code> below.
            </p>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-500">JSON output</label>
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-300"
                  onClick={() => fileInputRef.current?.click()}
                >
                  or load file
                </button>
              </div>
              <textarea
                className="input w-full h-48 resize-none font-mono text-xs"
                placeholder={'{\n  "arch": "x86_64",\n  "deploy_type": "bare-metal",\n  "checks": { ... }\n}'}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.txt"
                className="hidden"
                onChange={handleFileLoad}
              />
            </div>

            {parseError && (
              <p className="text-xs text-red-400">{parseError}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={handleParse}
                disabled={!rawText.trim()}
              >
                Preview results
              </button>
              <button type="button" className="btn-ghost" onClick={() => setStep('intro')}>
                Back
              </button>
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        ) : parsed ? (
          <>
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 space-y-1 text-sm">
              <div className="flex gap-4 text-slate-400">
                <span>Arch: <strong className="text-slate-200">{parsed.meta.arch}</strong></span>
                <span>Deploy: <strong className="text-slate-200">{parsed.meta.deploy_type}</strong></span>
                {parsed.meta.hardware_notes && (
                  <span className="truncate">HW: <strong className="text-slate-200">{parsed.meta.hardware_notes}</strong></span>
                )}
              </div>
              {parsed.meta.kernel && (
                <p className="text-xs text-slate-600">Kernel: {parsed.meta.kernel}</p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                {parsed.items.length} result{parsed.items.length !== 1 ? 's' : ''} to submit
              </p>
              {parsed.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded bg-slate-800/50 px-3 py-1.5 text-xs"
                >
                  <span className={`font-semibold w-10 ${OUTCOME_COLOR[item.outcome] ?? 'text-slate-400'}`}>
                    {item.outcome}
                  </span>
                  <span className="text-slate-300 truncate">{item.test_case_name}</span>
                  {item.comment && (
                    <span className="text-slate-600 ml-auto shrink-0">{item.comment}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-500">Your name (optional)</label>
              <input
                className="input w-full"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                placeholder="anonymous"
              />
            </div>

            {mutation.isError && (
              <p className="text-xs text-red-400">{String(mutation.error)}</p>
            )}

            {mutation.isSuccess && (() => {
              const data = mutation.data
              return (
                <div className="rounded bg-emerald-950/40 border border-emerald-800 px-3 py-2 text-xs text-emerald-300">
                  ✓ Submitted {data.imported} result{data.imported !== 1 ? 's' : ''}
                  {data.skipped > 0 && ` · ${data.skipped} skipped`}
                  {data.unmatched.length > 0 && ` · ${data.unmatched.length} unmatched`}
                </div>
              )
            })()}

            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || mutation.isSuccess}
              >
                {mutation.isPending ? 'Submitting…' : mutation.isSuccess ? 'Submitted ✓' : `Submit ${parsed.items.length} results`}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => { setParsed(null); setStep('paste') }}
                disabled={mutation.isPending}
              >
                Back
              </button>
              <button type="button" className="btn-ghost ml-auto" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
