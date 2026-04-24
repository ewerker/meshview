import { Radio, MapPin, MessageSquare, Activity, Wifi } from 'lucide-react';

export default function StatsBar({ nodes, messages, connected, filters, onFiltersChange }) {
  const nodesWithPos = nodes.filter(n => n.position?.latitude && n.position.latitude !== 0);
  const nodesWithBattery = nodes.filter(n => n.deviceMetrics?.batteryLevel > 0);
  const avgBattery = nodesWithBattery.length > 0
    ? Math.round(nodesWithBattery.reduce((s, n) => s + n.deviceMetrics.batteryLevel, 0) / nodesWithBattery.length)
    : null;

  const recentNodes = nodes.filter(n => {
    if (!n.lastHeard) return false;
    return (Math.floor(Date.now() / 1000) - n.lastHeard) < 900; // 15 min
  });

  const stats = [
    { label: 'Nodes gesamt', value: nodes.length, icon: Radio, color: 'text-blue-600', action: 'clear' },
    { label: 'Aktiv (15min)', value: recentNodes.length, icon: Activity, color: 'text-green-600', filterKey: 'active' },
    { label: 'Mit GPS', value: nodesWithPos.length, icon: MapPin, color: 'text-red-600', filterKey: 'withGps' },
    { label: 'Nachrichten', value: messages.length, icon: MessageSquare, color: 'text-purple-600' },
    ...(avgBattery !== null ? [{ label: 'Ø Akku', value: `${avgBattery}%`, icon: Wifi, color: 'text-yellow-600' }] : []),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 p-4 bg-card dark:bg-slate-800 border-b">
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