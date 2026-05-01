import { Database, Settings, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMeshStore } from '@/hooks/useMeshStore.js';

export default function DeviceConfigPanel() {
  const { connected, deviceConfigs, configSaveStatus } = useMeshStore();

  if (!connected || deviceConfigs.length === 0) return null;

  const latest = deviceConfigs.slice(-4).reverse();

  return (
    <div className="border-b bg-blue-50/80 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900 px-3 py-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Settings className="w-4 h-4 text-blue-600 dark:text-blue-300 shrink-0" />
          <div>
            <div className="font-semibold text-xs text-blue-900 dark:text-blue-100">Gerätekonfiguration ausgelesen</div>
            <div className="text-[11px] text-blue-700 dark:text-blue-300 leading-tight">
              {deviceConfigs.length} Abschnitte vom Gerät empfangen und zur Speicherung vorbereitet.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {latest.map((item, index) => (
            <Badge key={`${item.category}-${item.section}-${index}`} variant="outline" className="bg-white/70 dark:bg-slate-900/50 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800">
              {item.section}
            </Badge>
          ))}
          {configSaveStatus === 'saved' && (
            <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100">
              <CheckCircle2 className="w-3 h-3 mr-1" /> gespeichert
            </Badge>
          )}
          {configSaveStatus === 'saving' && (
            <Badge className="bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-100">
              <Database className="w-3 h-3 mr-1" /> speichert…
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}