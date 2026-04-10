import type { CoverageGrid as CoverageGridData } from '../lib/api'

function cellColor(cell: CoverageGridData['grid'][string]): string {
  if (cell.total === 0) return 'bg-slate-800 text-slate-600'
  if (cell.fail_count > 0) return 'bg-red-900/60 text-red-300'
  if (cell.pass_count > 0 && cell.fail_count === 0) return 'bg-emerald-900/60 text-emerald-300'
  if (cell.partial_count > 0) return 'bg-yellow-900/60 text-yellow-300'
  return 'bg-slate-700 text-slate-400'
}

function cellLabel(cell: CoverageGridData['grid'][string]): string {
  if (cell.total === 0) return '—'
  const parts: string[] = []
  if (cell.pass_count) parts.push(`${cell.pass_count}P`)
  if (cell.fail_count) parts.push(`${cell.fail_count}F`)
  if (cell.partial_count) parts.push(`${cell.partial_count}~`)
  if (cell.skip_count) parts.push(`${cell.skip_count}S`)
  return parts.join(' ')
}

interface Props {
  data: CoverageGridData
}

export default function CoverageGrid({ data }: Props) {
  if (data.arches.length === 0) {
    return (
      <div className="card text-sm text-slate-500 text-center py-6">
        No results submitted yet. Coverage grid will appear once results are recorded.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="text-left p-2 text-slate-400 font-medium border-b border-slate-800 min-w-[160px]">
              Section
            </th>
            {data.arches.map((arch) => (
              <th
                key={arch}
                className="text-center p-2 text-slate-400 font-medium border-b border-slate-800 min-w-[80px]"
              >
                {arch}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.sections.map((sec) => (
            <tr key={sec.id} className="border-b border-slate-800/50">
              <td className="p-2 text-slate-300 text-xs">
                {sec.name}
                {sec.architecture && (
                  <span className="ml-1 text-slate-500">({sec.architecture})</span>
                )}
              </td>
              {data.arches.map((arch) => {
                const cell = data.grid[`${sec.id}_${arch}`] ?? {
                  pass_count: 0,
                  fail_count: 0,
                  partial_count: 0,
                  skip_count: 0,
                  total: 0,
                }
                return (
                  <td key={arch} className="p-1 text-center">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-xs font-mono ${cellColor(cell)}`}
                      title={`PASS:${cell.pass_count} FAIL:${cell.fail_count} PARTIAL:${cell.partial_count} SKIP:${cell.skip_count}`}
                    >
                      {cellLabel(cell)}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-600">P = pass · F = fail · ~ = partial · S = skip · — = untested</p>
    </div>
  )
}
