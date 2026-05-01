import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Database, Hash, Clock } from 'lucide-react';

function flattenPayload(payload, prefix = '') {
  if (!payload || typeof payload !== 'object') return [];

  return Object.entries(payload).flatMap(([key, value]) => {
    const label = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('hex' in value && 'length' in value) {
        return [{ label, value: `${value.length} Bytes · ${value.hex}` }];
      }
      return flattenPayload(value, label);
    }

    if (Array.isArray(value)) {
      return [{ label, value: `${value.length} Einträge` }];
    }

    return [{ label, value: String(value ?? '—') }];
  });
}

function formatTime(ms) {
  if (!ms) return 'Unbekannt';
  return new Date(ms).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'medium' });
}

export default function DeviceConfigDetailsDialog({ config, open, onOpenChange }) {
  const rows = flattenPayload(config?.payload).filter(row => row.value !== '—');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            {config?.section || 'Konfiguration'}
          </DialogTitle>
        </DialogHeader>

        {config && (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{config.category}</Badge>
              {config.my_node_id && <Badge variant="outline" className="font-mono"><Hash className="w-3 h-3 mr-1" />{config.my_node_id}</Badge>}
              <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{formatTime(config.received_at)}</Badge>
            </div>

            <section>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Ausgewertete Felder</h3>
              {rows.length > 0 ? (
                <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
                  {rows.slice(0, 80).map(row => (
                    <div key={row.label} className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-3 px-3 py-2 border-b last:border-b-0 dark:border-slate-700 text-sm">
                      <div className="font-mono text-xs text-slate-500 break-all">{row.label}</div>
                      <div className="text-slate-800 dark:text-slate-200 break-all">{row.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500">Keine auswertbaren Felder gefunden.</div>
              )}
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Rohdaten</h3>
              <pre className="text-xs bg-slate-950 text-slate-100 rounded-lg p-3 overflow-auto max-h-72">
                {JSON.stringify(config.payload, null, 2)}
              </pre>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}