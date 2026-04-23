import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getUrgentNeeds } from '../lib/api'

interface Props {
  milestoneId: number
  onScrollTo?: (testCaseId: number) => void
}

export default function UrgentNeedsBanner({ milestoneId, onScrollTo }: Props) {
  const storageKey = `r3p_urgent_dismissed_${milestoneId}`
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(storageKey) === '1')

  const { data: needs } = useQuery({
    queryKey: ['urgent-needs', milestoneId],
    queryFn: () => getUrgentNeeds(milestoneId),
    enabled: !dismissed,
  })

  if (dismissed || !needs || needs.length === 0) return null

  const handleDismiss = () => {
    sessionStorage.setItem(storageKey, '1')
    setDismissed(true)
  }

  return (
    <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-red-300">
          🚨 {needs.length} untested blocker{needs.length !== 1 ? 's' : ''} need attention
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-red-700 hover:text-red-400 text-xs"
        >
          Dismiss
        </button>
      </div>
      <ul className="space-y-0.5">
        {needs.map((n) => (
          <li key={n.test_case_id} className="text-xs text-red-400">
            <span className="text-red-700">{n.section_name} /</span>{' '}
            {onScrollTo ? (
              <button
                type="button"
                className="hover:underline"
                onClick={() => onScrollTo(n.test_case_id)}
              >
                {n.test_case_name}
              </button>
            ) : (
              <span>{n.test_case_name}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
