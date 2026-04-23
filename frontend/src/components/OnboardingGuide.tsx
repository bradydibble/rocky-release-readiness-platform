import { useAppStore } from '../lib/store'

interface Props {
  releaseName?: string
  onDismiss: () => void
}

export default function OnboardingGuide({ releaseName, onDismiss }: Props) {
  const { setMode, markVisited } = useAppStore()

  const goToFullList = () => {
    markVisited()
    setMode('standard')
    onDismiss()
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5 space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs text-emerald-500 uppercase tracking-widest font-semibold">
          {releaseName ? `${releaseName} testing open` : 'Testing open'}
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">
          Rocky Linux needs community volunteers to install this pre-release build and report
          whether basic things work. <strong className="text-slate-200">You don't need to be an expert.</strong>{' '}
          No account required. Takes 15–30 minutes.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="rounded-lg border border-emerald-700 bg-emerald-900/30 hover:bg-emerald-900/50 transition-colors px-4 py-3 text-left space-y-0.5"
          onClick={onDismiss}
        >
          <p className="text-sm font-semibold text-emerald-300">Walk me through it →</p>
          <p className="text-xs text-slate-400">
            Step-by-step guide from setup to first test result.
          </p>
        </button>

        <button
          type="button"
          className="rounded-lg border border-slate-700 bg-slate-800/40 hover:bg-slate-800 transition-colors px-4 py-3 text-left space-y-0.5"
          onClick={goToFullList}
        >
          <p className="text-sm font-semibold text-slate-300">Show me all the tests</p>
          <p className="text-xs text-slate-500">
            Skip the intro and browse the full test list.
          </p>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-800 text-xs text-slate-600">
        <span>Other testing tools:</span>
        <a
          href="https://openqa.rockylinux.org"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:text-blue-400"
        >
          OpenQA (automated) ↗
        </a>
        <span>·</span>
        <a
          href="https://git.resf.org/testing/Sparky_Getting_Started"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:text-blue-400"
        >
          Sparky (scripted) ↗
        </a>
        <span>·</span>
        <a
          href="https://chat.rockylinux.org/rocky-linux/channels/testing"
          target="_blank"
          rel="noreferrer"
          className="text-emerald-700 hover:text-emerald-500"
        >
          #testing on Mattermost ↗
        </a>
      </div>
    </div>
  )
}
