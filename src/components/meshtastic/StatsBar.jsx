import { Radio, MapPin, MessageSquare, Activity, ChevronDown, BarChart3 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nContext.jsx';
import { useLocalStorage } from '@/hooks/useLocalStorage.js';

export default function StatsBar({ nodes, messages, connected, filters, onFiltersChange }) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useLocalStorage('dashboard.stats.open', false);

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

  const handleStatClick = (s, e) => {
    e.stopPropagation();
    if (!onFiltersChange) return;
    if (s.action === 'clear') {
      onFiltersChange({ active: false, direct: false, withGps: false, withTelemetry: false, withEnv: false, lowBattery: false, highBattery: false });
    } else if (s.filterKey) {
      onFiltersChange({ ...filters, [s.filterKey]: !filters[s.filterKey] });
    }
  };

  return (
    <div className="border-b bg-card dark:bg-slate-800">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
          <BarChart3 className="w-3.5 h-3.5" />
          {t('statsTotalNodes').replace(/.*/, 'Statistik')}
        </div>

        {/* Inline compact summary - clickable filter chips */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap justify-end text-xs">
          {stats.map(s => {
            const isActive = s.filterKey && filters?.[s.filterKey];
            const interactive = s.filterKey || s.action;
            return (
              <span
                key={s.label}
                onClick={interactive ? (e) => handleStatClick(s, e) : undefined}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${interactive ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700' : ''} ${isActive ? 'ring-1 ring-blue-500 bg-blue-50 dark:bg-blue-950/40' : ''}`}
                title={s.label}
              >
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                <span className="font-semibold text-slate-700 dark:text-slate-200">{s.value}</span>
                <span className="hidden md:inline text-slate-500 dark:text-slate-400">{s.label}</span>
              </span>
            );
          })}
        </div>
      </button>

      {isOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 pb-4 pt-1">
          {stats.map(s => {
            const isActive = s.filterKey && filters?.[s.filterKey];
            const interactive = s.filterKey || s.action;
            return (
              <div
                key={s.label}
                onClick={interactive ? (e) => handleStatClick(s, e) : undefined}
                className={`flex items-center gap-3 bg-slate-50 dark:bg-slate-700 rounded-lg p-3 ${interactive ? 'cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-600' : ''} ${isActive ? 'ring-2 ring-blue-500' : ''}`}
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
      )}
    </div>
  );
}