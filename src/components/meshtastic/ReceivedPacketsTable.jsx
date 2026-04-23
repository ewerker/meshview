import { useMeshStore } from '@/hooks/useMeshStore.js';
import { Clock, MessageSquare, MapPin, Zap, Radio } from 'lucide-react';

function getDecoded(packet) {
  return packet.raw?.packet?.decoded || null;
}

function getPacketIcon(packet) {
  const decoded = getDecoded(packet);
  if (decoded?.text) return <MessageSquare className="w-3 h-3 text-green-500" />;
  if (decoded?.position) return <MapPin className="w-3 h-3 text-red-500" />;
  if (decoded?.telemetry) return <Zap className="w-3 h-3 text-yellow-500" />;
  if (decoded?.user) return <Radio className="w-3 h-3 text-blue-500" />;
  if (packet.type === 'nodeInfo') return <Radio className="w-3 h-3 text-blue-500" />;
  if (packet.type === 'myInfo') return <Radio className="w-3 h-3 text-green-400" />;
  if (packet.type === 'metadata') return <Radio className="w-3 h-3 text-purple-500" />;
  if (packet.type === 'configComplete') return <Radio className="w-3 h-3 text-slate-400" />;
  if (decoded?.portnum) return <Radio className="w-3 h-3 text-orange-400" />;
  return <Radio className="w-3 h-3 text-slate-400" />;
}

function getPacketLabel(packet) {
  const decoded = getDecoded(packet);
  
  if (decoded?.text) return `Text: ${decoded.text.slice(0, 50)}`;
  if (decoded?.position) return `GPS: ${decoded.position.latitude?.toFixed(4)}, ${decoded.position.longitude?.toFixed(4)}`;
  if (decoded?.telemetry?.deviceMetrics) return `Telemetrie: Bat ${decoded.telemetry.deviceMetrics.batteryLevel}%`;
  if (decoded?.telemetry?.environmentMetrics) return `Umgebung: ${decoded.telemetry.environmentMetrics.temperature?.toFixed(1)}°C`;
  if (decoded?.telemetry) return 'Telemetrie';
  if (decoded?.user) return `Node: ${decoded.user.longName || 'Unbekannt'}`;
  if (packet.type === 'nodeInfo') return `Node: ${packet.raw?.nodeInfo?.user?.longName || 'Unbekannt'}`;
  if (packet.type === 'myInfo') return `My Info: #${packet.raw?.myInfo?.myNodeNum}`;
  if (packet.type === 'metadata') return `Metadata: FW ${packet.raw?.metadata?.firmwareVersion || '?'}`;
  if (packet.type === 'configComplete') return 'Config komplett';
  if (decoded?.portnumName) return `${decoded.portnumName}`;
  return `${packet.type || 'unbekannt'}`;
}

function formatTime(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function ReceivedPacketsTable() {
  const { packetLog } = useMeshStore();



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
        <thead className="bg-slate-700 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left">Von</th>
            <th className="px-3 py-2 text-left">Typ</th>
            <th className="px-3 py-2 text-left">Details</th>
            <th className="px-3 py-2 text-left">Zeit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {packetLog.slice().reverse().slice(0, 30).map((packet, idx) => (
            <tr key={idx} className="hover:bg-slate-750">
              <td className="px-3 py-2 font-mono text-slate-300">
                {packet.from?.toString(16).toUpperCase() || '-'}
              </td>
              <td className="px-3 py-2 flex items-center gap-2">
                {getPacketIcon(packet)}
                <span>{getPacketLabel(packet).split(':')[0]}</span>
              </td>
              <td className="px-3 py-2 text-slate-400 truncate max-w-xs">
                {getPacketLabel(packet).split(':')[1] || '-'}
              </td>
              <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                {formatTime(packet.time)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}