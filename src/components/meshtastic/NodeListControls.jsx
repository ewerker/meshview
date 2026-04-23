import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

export default function NodeListControls({ search, onSearch, sort, onSort, filter, onFilter }) {
  return (
    <div className="px-3 py-2 border-b bg-white space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input
          className="pl-7 h-7 text-xs"
          placeholder="Suchen…"
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Select value={sort} onValueChange={onSort}>
          <SelectTrigger className="flex-1 h-7 text-xs">
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

        <Select value={filter} onValueChange={onFilter}>
          <SelectTrigger className="flex-1 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Nodes</SelectItem>
            <SelectItem value="active">Aktiv (15 min)</SelectItem>
            <SelectItem value="direct">Direkt erreichbar</SelectItem>
            <SelectItem value="lowBattery">Akku kritisch (&lt;20%)</SelectItem>
            <SelectItem value="gps">Mit GPS</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}