export interface Filters {
  untestedOnly: boolean
  blockersOnly: boolean
}

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
}

export default function FiltersBar({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-3 border-b border-slate-800">
      <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Filter</span>

      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
        <input
          type="checkbox"
          className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
          checked={filters.untestedOnly}
          onChange={(e) => onChange({ ...filters, untestedOnly: e.target.checked })}
        />
        <span className="text-slate-300">Untested only</span>
      </label>

      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
        <input
          type="checkbox"
          className="rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500"
          checked={filters.blockersOnly}
          onChange={(e) => onChange({ ...filters, blockersOnly: e.target.checked })}
        />
        <span className="text-slate-300">Blockers only</span>
      </label>
    </div>
  )
}
