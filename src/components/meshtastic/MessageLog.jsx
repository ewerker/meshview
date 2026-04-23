import { useState } from 'react';
import { format } from 'date-fns';
import { MessageSquare, MapPin, Activity, User, Filter } from 'lucide-react';

function formatNodeId(num) {
  if (!num) return '?';
  if (num === 0xffffffff) return 'Alle';
  return `!${num.toString(16).padStart(8, '0')}`;
}

function NodeLabel({ num, nodes }) {
  const node = nodes.find(n => n.num === num);
  const name = node?.user?.longName || node?.user?.shortName || formatNodeId(num);
  return <span className="font-semibold text-blue-700">{name}</span>;
}

function TextEntry({ msg, nodes, isOwn }) {
  const toAll = msg.to === 0xffffffff;
  return (
    <div className={`rounded-lg p-3 border shadow-sm ${isOwn ? 'bg-blue-50 border-blue-200 ml-6' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs">
          <MessageSquare className="w-3 h-3 text-slate-400" />
          {isOwn ? (
            <span className="font-semibold text-blue-600">Ich</span>
          ) : (
            <NodeLabel num={msg.from} nodes={nodes} />
          )}
          <span className="text-slate-400">→</span>
          {toAll ? <span className="text-slate-500">Broadcast</span> : <NodeLabel num={msg.to} nodes={nodes} />}
          {msg.channel !== undefined && msg.channel !== null && (
            <span className="text-slate-400 ml-1">Kanal {msg.channel}</span>
          )}
        </div>
        <span className="text-xs text-slate-400 shrink-0">{format(msg.time, 'HH:mm:ss')}</span>
      </div>
      <p className="text-sm">{msg.text}</p>
      {(msg.rxSnr || msg.rxRssi) && (
        <div className="text-xs text-slate-400 mt-1">
          {msg.rxSnr ? `SNR: ${msg.rxSnr.toFixed(1)} dB` : ''}
          {msg.rxRssi ? ` · RSSI: ${msg.rxRssi} dBm` : ''}
        </div>
      )}
    </div>
  );
}

function PositionEntry({ msg, nodes }) {
  const pos = msg.position;
  return (
    <div className="rounded-lg p-2.5 border border-green-100 bg-green-50 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs">
          <MapPin className="w-3 h-3 text-green-600" />
          <NodeLabel num={msg.from} nodes={nodes} />
          <span className="text-slate-500 font-mono ml-1">
            {pos.latitude?.toFixed(5)}, {pos.longitude?.toFixed(5)}
            {pos.altitude ? ` · ${pos.altitude}m` : ''}
            {pos.numSatellites > 0 ? ` · ${pos.numSatellites} Sat.` : ''}
          </span>
        </div>
        <span className="text-xs text-slate-400 shrink-0">{format(msg.time, 'HH:mm:ss')}</span>
      </div>
    </div>
  );
}

function TelemetryEntry({ msg, nodes }) {
  const dm = msg.telemetry?.deviceMetrics;
  const em = msg.telemetry?.environmentMetrics;
  const parts = [];
  if (dm?.batteryLevel > 0) parts.push(`🔋 ${dm.batteryLevel}%`);
  if (dm?.voltage > 0) parts.push(`${dm.voltage.toFixed(2)}V`);
  if (dm?.channelUtilization > 0) parts.push(`CH: ${dm.channelUtilization.toFixed(1)}%`);
  if (em?.temperature != null) parts.push(`🌡️ ${em.temperature.toFixed(1)}°C`);
  if (em?.relativeHumidity != null) parts.push(`💧 ${em.relativeHumidity.toFixed(0)}%`);
  if (em?.barometricPressure != null) parts.push(`${em.barometricPressure.toFixed(0)} hPa`);

  return (
    <div className="rounded-lg p-2.5 border border-orange-100 bg-orange-50 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs">
          <Activity className="w-3 h-3 text-orange-500" />
          <NodeLabel num={msg.from} nodes={nodes} />
          <span className="text-slate-500 ml-1">{parts.join(' · ') || 'Telemetrie'}</span>
        </div>
        <span className="text-xs text-slate-400 shrink-0">{format(msg.time, 'HH:mm:ss')}</span>
      </div>
    </div>
  );
}

function UserInfoEntry({ msg, nodes }) {
  const u = msg.userInfo;
  return (
    <div className="rounded-lg p-2.5 border border-purple-100 bg-purple-50 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs">
          <User className="w-3 h-3 text-purple-500" />
          <span className="text-slate-600">Node-Info: <span className="font-semibold">{u?.longName || u?.shortName || formatNodeId(msg.from)}</span></span>
          {u?.id && <span className="text-slate-400 font-mono">{u.id}</span>}
        </div>
        <span className="text-xs text-slate-400 shrink-0">{format(msg.time, 'HH:mm:ss')}</span>
      </div>
    </div>
  );
}

const FILTER_TABS = [
  { key: 'all', label: 'Alle' },
  { key: 'text', label: '💬 Nachrichten' },
  { key: 'position', label: '📍 Position' },
  { key: 'telemetry', label: '📊 Telemetrie' },
  { key: 'user', label: '👤 Node-Info' },
];

export default function MessageLog({ messages, nodes, myNodeNum }) {
  const [filter, setFilter] = useState('all');

  const filtered = messages.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'text') return !!m.text;
    if (filter === 'position') return !!m.position;
    if (filter === 'telemetry') return !!m.telemetry;
    if (filter === 'user') return !!m.userInfo;
    return true;
  });

  // Sort chronologically descending (newest first – messages.unshift keeps this order already)
  // but ensure it's really sorted
  const sorted = [...filtered].sort((a, b) => b.time - a.time);

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="flex gap-1 px-3 py-2 border-b bg-white overflow-x-auto shrink-0">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              filter === tab.key
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
            {tab.key === 'all' && (
              <span className="ml-1 text-slate-400 font-normal">({messages.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <Filter className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Keine Einträge</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 p-3">
            {sorted.map((msg, i) => {
              const isOwn = msg.isSent || msg.from === myNodeNum;
              if (msg.text) return <TextEntry key={i} msg={msg} nodes={nodes} isOwn={isOwn} />;
              if (msg.position) return <PositionEntry key={i} msg={msg} nodes={nodes} />;
              if (msg.telemetry) return <TelemetryEntry key={i} msg={msg} nodes={nodes} />;
              if (msg.userInfo) return <UserInfoEntry key={i} msg={msg} nodes={nodes} />;
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}