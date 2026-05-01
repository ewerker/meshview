import { Radio, MapPin, MessageSquare, Activity, Wifi } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nContext.jsx';

export default function StatsBar({ nodes, messages, connected, filters, onFiltersChange }) {
  const { t } = useI18n();
  const nodesWithPos = nodes.filter(n => n.position?.latitude && n.position.latitude !== 0);

  const recentNodes = nodes.filter(n => {
    if (!n.lastHeard) return false;
    return (Math.floor(Date.now() / 1000) - n.lastHeard) < 900; // 15 min
  });

  const stats = [
    { label: t('statsTotalNodes'), value: nodes.length, icon: Radio, color: 'text-blue-600', action: 'clear' },
    { label: t('statsActive'), value: recentNodes.length, icon: Activity, color: 'text-green-600', filterKey: 'active' },
    { label: t('statsWithGps'), value: nodesWithPos.length, icon: MapPin, color: 'text-red-600', filterKey: 'withGps' },
    { label: t('statsMessages'), value: messages.length, icon: MessageSquare, color: 'text-purple-600', filterKey: messages.length > 0 ? 'messagesOnly' : null },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-card dark:bg-slate-800 border-b">
      {stats.map(s => {
        const isActive = s.filterKey && filters?.[s.filterKey];
        return (
          <div 
            key={s.label} 
            onClick={() => {
              if (!onFiltersChange) return;
              if (s.action === 'clear') {
                onFiltersChange({ active: false, direct: false, withGps: false, withTelemetry: false, withEnv: false, lowBattery: false, highBattery: false });
              } else if (s.filterKey) {
                onFiltersChange({ ...filters, [s.filterKey]: !filters[s.filterKey] });
              }
            }}
            className={`flex items-center gap-3 bg-slate-50 dark:bg-slate-700 rounded-lg p-3 ${s.filterKey || s.action ? 'cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-600' : ''} ${isActive ? 'ring-2 ring-blue-500' : ''}`}
          >
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <div>
              <div className="text-lg font-bold leading-none">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}