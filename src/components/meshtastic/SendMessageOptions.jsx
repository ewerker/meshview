import { User, Radio } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Lightweight controls for destination kind, target node, hop limit, and want-ack.
export default function SendMessageOptions({ value, onChange, nodes = [], myNodeNum }) {
  const { kind, destination, hopLimit, wantAck } = value;

  const directNodes = nodes
    .filter(n => n.num && n.num !== myNodeNum)
    .map(n => {
      const id = `!${n.num.toString(16).padStart(8, '0')}`;
      const name = n.user?.longName || n.user?.shortName || id;
      return { ...n, _label: name, _id: id };
    })
    .sort((a, b) => a._label.localeCompare(b._label, undefined, { sensitivity: 'base' }));

  const update = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Select value={kind} onValueChange={k => update({ kind: k, destination: k === 'broadcast' ? null : destination })}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="broadcast"><span className="flex items-center gap-1.5"><Radio className="w-3 h-3" /> Broadcast</span></SelectItem>
          <SelectItem value="direct"><span className="flex items-center gap-1.5"><User className="w-3 h-3" /> Direkt (DM)</span></SelectItem>
        </SelectContent>
      </Select>

      {kind === 'direct' && (
        <Select
          value={destination ? String(destination) : ''}
          onValueChange={v => update({ destination: Number(v) })}
        >
          <SelectTrigger className="h-8 w-56 text-xs">
            <SelectValue placeholder="Empfänger wählen…" />
          </SelectTrigger>
          <SelectContent>
            {directNodes.length === 0 && <div className="px-2 py-1 text-[11px] text-slate-400">Keine Nodes bekannt</div>}
            {directNodes.map(n => (
              <SelectItem key={n.num} value={String(n.num)}>
                {n._label} <span className="text-slate-400 font-mono">· {n._id}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <label className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
        Hop
        <Input
          type="number" min={1} max={7}
          value={hopLimit}
          onChange={e => update({ hopLimit: Math.max(1, Math.min(7, Number(e.target.value) || 1)) })}
          className="h-8 w-14 text-xs"
        />
      </label>

      <label className="flex items-center gap-1 text-slate-600 dark:text-slate-300 cursor-pointer">
        <input type="checkbox" checked={wantAck} onChange={e => update({ wantAck: e.target.checked })} />
        want-ack
      </label>
    </div>
  );
}