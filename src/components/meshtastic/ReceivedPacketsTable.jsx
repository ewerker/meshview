import { useState } from 'react';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import { Clock, MessageSquare, MapPin, Zap, Radio, Settings, FileText, Hash, List, AlertTriangle, ChevronRight } from 'lucide-react';

function getDecoded(logEntry) {
  return logEntry.raw?.packet?.decoded || null;
}

const TYPE_ICONS = {
  nodeInfo: <Radio className="w-3 h-3 text-blue-500" />,
  myInfo: <Radio className="w-3 h-3 text-green-400" />,
  metadata: <Radio className="w-3 h-3 text-purple-500" />,
  configComplete: <Settings className="w-3 h-3 text-slate-400" />,
  config: <Settings className="w-3 h-3 text-cyan-500" />,
  moduleConfig: <Settings className="w-3 h-3 text-indigo-500" />,
  channel: <Hash className="w-3 h-3 text-amber-500" />,
  queueStatus: <List className="w-3 h-3 text-slate-400" />,
  logRecord: <FileText className="w-3 h-3 text-orange-400" />,
  xmodemPacket: <FileText className="w-3 h-3 text-slate-400" />,
  mqttClientProxyMessage: <Radio className="w-3 h-3 text-teal-500" />,
  fileInfo: <FileText className="w-3 h-3 text-slate-400" />,
  clientNotification: <AlertTriangle className="w-3 h-3 text-yellow-500" />,
  rebooted: <Radio className="w-3 h-3 text-red-500" />,
  tx: <Radio className="w-3 h-3 text-pink-500" />,
  ack: <Radio className="w-3 h-3 text-green-300" />,
  error: <AlertTriangle className="w-3 h-3 text-red-500" />,
};

function getPacketIcon(packet) {
  const decoded = getDecoded(packet);
  if (decoded?.text) return <MessageSquare className="w-3 h-3 text-green-500" />;
  if (decoded?.position) return <MapPin className="w-3 h-3 text-red-500" />;
  if (decoded?.telemetry) return <Zap className="w-3 h-3 text-yellow-500" />;
  if (decoded?.user) return <Radio className="w-3 h-3 text-blue-500" />;
  if (TYPE_ICONS[packet.type]) return TYPE_ICONS[packet.type];
  if (decoded?.portnum) return <Radio className="w-3 h-3 text-orange-400" />;
  return <Radio className="w-3 h-3 text-slate-400" />;
}

function getPacketLabel(packet) {
  const decoded = getDecoded(packet);

  if (decoded?.text) return `Text: ${decoded.text.slice(0, 50)}`;
  if (decoded?.position) return `GPS: ${decoded.position.latitude?.toFixed(4)}, ${decoded.position.longitude?.toFixed(4)}`;
  if (decoded?.telemetry?.deviceMetrics) return `Telemetrie: Bat ${decoded.telemetry.deviceMetrics.batteryLevel}%`;
  if (decoded?.telemetry?.environmentMetrics) return `Umgebung: ${decoded.telemetry.environmentMetrics.temperature?.toFixed(1)}°C`;
  if (decoded?.telemetry) return 'Telemetrie: -';
  if (decoded?.user) return `Node: ${decoded.user.longName || 'Unbekannt'}`;
  if (packet.type === 'nodeInfo') return `Node: ${packet.raw?.nodeInfo?.user?.longName || 'Unbekannt'}`;
  if (packet.type === 'myInfo') return `My Info: #${packet.raw?.myInfo?.myNodeNum}`;
  if (packet.type === 'metadata') return `Metadata: FW ${packet.raw?.metadata?.firmwareVersion || '?'}`;
  if (packet.type === 'configComplete') return 'Config: komplett';
  if (packet.type === 'config') return `Config: ${packet.raw?.config?.type || '?'}`;
  if (packet.type === 'moduleConfig') return `Modul-Config: ${packet.raw?.moduleConfig?.type || '?'}`;
  if (packet.type === 'channel') {
    const ch = packet.raw?.channel;
    const name = ch?.settings?.name || `Kanal ${ch?.index ?? '?'}`;
    const roles = ['Deaktiviert', 'Primär', 'Sekundär'];
    return `Kanal: ${name} (${roles[ch?.role] || '?'})`;
  }
  if (packet.type === 'queueStatus') {
    const qs = packet.raw?.queueStatus;
    return `Queue: ${qs?.free ?? '?'} frei, max ${qs?.maxlen ?? '?'}`;
  }
  if (packet.type === 'logRecord') {
    const lr = packet.raw?.logRecord;
    return `Log: ${lr?.message?.slice(0, 60) || '?'}`;
  }
  if (packet.type === 'xmodemPacket') return 'XModem: Paket';
  if (packet.type === 'mqttClientProxyMessage') return 'MQTT: Proxy';
  if (packet.type === 'fileInfo') return 'Datei: Info';
  if (packet.type === 'clientNotification') return 'Benachrichtigung: -';
  if (packet.type === 'rebooted') return 'Neustart: Reboot';
  if (packet.type === 'tx') {
    const tx = packet.raw?.tx;
    return `TX ${tx?.kind || ''}: ${tx?.bytes || 0}B → ${tx?.to?.toString(16).toUpperCase() || '?'}`;
  }
  if (packet.type === 'ack') return `ACK: ID ${packet.id}`;
  if (packet.type === 'error') return `Fehler: ${packet.raw?.error || 'Parse-Fehler'}`;
  if (packet.type === 'packet' && packet.raw?.packet?.encrypted) return 'Paket: Verschlüsselt';
  if (decoded?.portnumName) return `App: ${decoded.portnumName}`;
  return `${packet.type || 'Unbekannt'}: -`;
}

function formatTime(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  const hms = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${hms}.${ms}`;
}

// Convert Uint8Array / array-like fields to hex strings recursively for display.
function normalizeForDisplay(obj, depth = 0) {
  if (depth > 6) return '…';
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Uint8Array) {
    return `0x${Array.from(obj).map(b => b.toString(16).padStart(2, '0')).join('')}`;
  }
  if (Array.isArray(obj)) return obj.map(v => normalizeForDisplay(v, depth + 1));
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = normalizeForDisplay(v, depth + 1);
    }
    return out;
  }
  if (typeof obj === 'bigint') return obj.toString();
  return obj;
}

function PacketDetailRow({ packet }) {
  const normalized = normalizeForDisplay(packet.raw);
  const json = JSON.stringify(normalized, null, 2);
  const txHex = packet.raw?.tx?.hex;

  return (
    <tr className="bg-slate-50 dark:bg-slate-900/40">
      <td colSpan={4} className="px-3 py-2">
        {txHex && (
          <div className="mb-2">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Hex (TX)</div>
            <pre className="text-[10px] font-mono bg-slate-900 text-green-300 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
              {txHex}
            </pre>
          </div>
        )}
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Roh-Nachricht ({packet.type})
        </div>
        <pre className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all max-h-80">
          {json}
        </pre>
      </td>
    </tr>
  );
}

export default function ReceivedPacketsTable() {
  const { packetLog } = useMeshStore();
  const [expanded, setExpanded] = useState(new Set());

  const toggle = (seq) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(seq)) next.delete(seq);
      else next.add(seq);
      return next;
    });
  };

  if (packetLog.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        Keine Pakete empfangen
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 text-slate-600 dark:text-slate-300 shadow-sm">
          <tr>
            <th className="px-3 py-2 text-left font-semibold w-6"></th>
            <th className="px-3 py-2 text-left font-semibold">Von</th>
            <th className="px-3 py-2 text-left font-semibold">Typ</th>
            <th className="px-3 py-2 text-left font-semibold">Details</th>
            <th className="px-3 py-2 text-left font-semibold">Zeit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 border-t border-slate-200 dark:border-slate-700">
          {packetLog.slice(-50).reverse().map((packet) => {
            const labelParts = getPacketLabel(packet).split(':');
            const typ = labelParts[0];
            const details = labelParts.slice(1).join(':').trim() || '-';
            const isOpen = expanded.has(packet.seq);
            return (
              <>
                <tr
                  key={packet.seq}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  onClick={() => toggle(packet.seq)}
                >
                  <td className="px-2 py-2 text-slate-400">
                    <ChevronRight className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">
                    {packet.from?.toString(16).toUpperCase() || '-'}
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      {getPacketIcon(packet)}
                      <span>{typ}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-xs" title={details !== '-' ? details : undefined}>
                    {details}
                  </td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatTime(packet.time)}
                  </td>
                </tr>
                {isOpen && <PacketDetailRow key={`${packet.seq}-detail`} packet={packet} />}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}