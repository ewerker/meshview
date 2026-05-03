import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/I18nContext.jsx';
import DeviceFreshness from './DeviceFreshness.jsx';

export default function DeviceSelector({ devices, selected, onSelect, onReload, loading }) {
  const { t } = useI18n();

  if (!devices || devices.length === 0) {
    return (
      <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
        <Database className="w-4 h-4" />
        {t('noSavedData')}
      </div>
    );
  }

  const selectedDevice = devices.find(d => d.my_node_num === selected);

  return (
    <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-200">
        <Database className="w-4 h-4" />
        <span className="font-medium">{t('historicalData')}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">{t('device')}</span>
        <Select value={selected ? String(selected) : ''} onValueChange={(v) => onSelect(Number(v))}>
          <SelectTrigger className="h-8 text-xs min-w-[220px] bg-white dark:bg-slate-800">
            <SelectValue placeholder={t('chooseDevice')} />
          </SelectTrigger>
          <SelectContent>
            {devices.map(d => (
              <SelectItem key={d.my_node_num} value={String(d.my_node_num)}>
                <div className="flex flex-col">
                  <span>
                    {d.long_name || d.short_name || d.my_node_id || `#${d.my_node_num.toString(16).toUpperCase()}`}
                    {d.short_name && d.long_name ? ` (${d.short_name})` : ''}
                  </span>
                  <DeviceFreshness lastSave={d.last_save} lastPacketTime={d.last_packet_time} />
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedDevice && (
        <DeviceFreshness lastSave={selectedDevice.last_save} lastPacketTime={selectedDevice.last_packet_time} compact />
      )}
      <Button size="sm" variant="ghost" onClick={onReload} disabled={loading} className="h-8 gap-1.5 ml-auto">
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        <span className="text-xs">{t('refresh')}</span>
      </Button>
    </div>
  );
}