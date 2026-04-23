import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export const DEFAULT_FILTERS = {
  hasGps: false,
  hasTelemetry: false,
  hasEnvironment: false,
  maxHops: '',       // '' = any
  minBattery: '',    // '' = any
  minSnr: '',        // '' = any
  maxDistKm: '',     // '' = any
};

export default function NodeListControls({ search, onSearch, sort, onSort, filters, onFilters, myNode }) {
  const [expanded, setExpanded] = useState(false);

  const activeCount = [
    filters.hasGps,
    filters.hasTelemetry,
    filters.hasEnvironment,
    filters.maxHops !== '',
    filters.minBattery !== '',
    filters.minSnr !== '',
    filters.maxDistKm !== '',
  ].filter(Boolean).length;

  const reset = () => onFilters(DEFAULT_FILTERS);

  return (
    <div className="px-3 py-2 border-b bg-white space-y-2 shrink-0">
      {/* Search + filter toggle */}
      <div className="flex gap-1.5 items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            className="pl-7 h-7 text-xs"
            placeholder="Name, ID, Kurzname suchen…"
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setExpanded(o => !o)}
          className={`flex-shrink-0 flex items-center gap-1 px-2 h-7 rounded-md border text-xs transition-colors ${
            expanded || activeCount > 0
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
          title="Filter"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {activeCount > 0 && (
            <span className="font-bold">{activeCount}</span>
          )}
        </button>
      </div>

      {/* Sort */}
      <Select value={sort} onValueChange={onSort}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="myFirst">Mein Gerät zuerst</SelectItem>
          <SelectItem value="lastHeard">Zuletzt gehört</SelectItem>
          <SelectItem value="name">Name (A–Z)</SelectItem>
          <SelectItem value="snr">SNR (beste zuerst)</SelectItem>
          <SelectItem value="battery">Akku (höchste zuerst)</SelectItem>
          <SelectItem value="hops">Hops (direkt zuerst)</SelectItem>
        </SelectContent>
      </Select>

      {/* Extended filters */}
      {expanded && (
        <div className="space-y-2.5 pt-1 border-t border-slate-100">
          {/* Toggle filters */}
          <div className="space-y-1.5">
            <ToggleFilter
              id="f-gps" label="Nur mit GPS-Position"
              checked={filters.hasGps}
              onChange={v => onFilters({ ...filters, hasGps: v })}
            />
            <ToggleFilter
              id="f-telem" label="Nur mit Gerätemetriken"
              checked={filters.hasTelemetry}
              onChange={v => onFilters({ ...filters, hasTelemetry: v })}
            />
            <ToggleFilter
              id="f-env" label="Nur mit Umgebungssensor"
              checked={filters.hasEnvironment}
              onChange={v => onFilters({ ...filters, hasEnvironment: v })}
            />
          </div>

          {/* Numeric filters */}
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Max. Hops"
              placeholder="z.B. 2"
              value={filters.maxHops}
              onChange={v => onFilters({ ...filters, maxHops: v })}
            />
            <NumberField
              label="Min. Akku (%)"
              placeholder="z.B. 20"
              value={filters.minBattery}
              onChange={v => onFilters({ ...filters, minBattery: v })}
            />
            <NumberField
              label="Min. SNR (dB)"
              placeholder="z.B. -10"
              value={filters.minSnr}
              onChange={v => onFilters({ ...filters, minSnr: v })}
            />
            <NumberField
              label="Max. Entf. (km)"
              placeholder={myNode?.position?.latitude ? 'z.B. 10' : '(kein GPS)'}
              value={filters.maxDistKm}
              onChange={v => onFilters({ ...filters, maxDistKm: v })}
              disabled={!myNode?.position?.latitude}
            />
          </div>

          {activeCount > 0 && (
            <button
              onClick={reset}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              <X className="w-3 h-3" />
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ToggleFilter({ id, label, checked, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="scale-75 origin-left"
      />
      <Label htmlFor={id} className="text-xs text-slate-600 cursor-pointer select-none leading-tight">
        {label}
      </Label>
    </div>
  );
}

function NumberField({ label, placeholder, value, onChange, disabled }) {
  return (
    <div>
      <div className="text-[10px] text-slate-400 mb-0.5">{label}</div>
      <Input
        type="number"
        className="h-6 text-xs px-2"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}