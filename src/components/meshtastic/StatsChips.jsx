import { Radio, MapPin, MessageSquare, Activity } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nContext.jsx';

export default function StatsChips({ nodes, messages, filters, onFiltersChange }) {
  const { t } = useI18n();

  const nodesWithPos = nodes.filter(n => n.position?.latitude && n.position.latitude !== 0);
  const recentNodes = nodes.filter(n => {
    if (!n.lastHeard) return false;
    return (Math.floor(Date.now() / 1000) - n.lastHeard) < 900; // 15 min
  });

  const stats = [
    { label: t('statsTotalNodes'), value: nodes.length, icon: Radio, color: 'text-blue-400', action: 'clear' },
    { label: t('statsActive'), value: recentNodes.length, icon: Activity, color: 'text-green-400', filterKey: 'active' },
    { label: t('statsWithGps'), value: nodesWithPos.length, icon: MapPin, color: 'text-red-400', filterKey: 'withGps' },
    { label: t('statsMessages'), value: messages.length, icon: MessageSquare, color: 'text-purple-400', filterKey: messages.length > 0 ? 'messagesOnly' : null },
  ];

  const handleClick = (s) => {
    if (!onFiltersChange) return;
    if (s.action === 'clear') {
      onFiltersChange({ active: false, direct: false, withGps: false, withTelemetry: false, withEnv: false, lowBattery: false, highBattery: false });
    } else if (s.filterKey) {
      onFiltersChange({ ...filters, [s.filterKey]: !filters[s.filterKey] });
    }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stats.map(s => {
        const isActive = s.filterKey && filters?.[s.filterKey];
        const interactive = s.filterKey || s.action;
        return (
          <button
            key={s.label}
            type="button"
            onClick={interactive ? () => handleClick(s) : undefined}
            title={s.label}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors ${interactive ? 'cursor-pointer hover:bg-slate-700' : 'cursor-default'} ${isActive ? 'ring-1 ring-blue-400 bg-slate-700' : ''}`}
          >
            <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
            <span className="font-semibold text-slate-100">{s.value}</span>
          </button>
        );
      })}
    </div>
  );
}