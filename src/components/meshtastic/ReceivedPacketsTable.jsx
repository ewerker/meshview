import { useMeshStore } from '@/hooks/useMeshStore.js';
import { Clock, MessageSquare, MapPin, Zap, Radio } from 'lucide-react';

function getPacketIcon(packet) {
  // Text message
  if (packet.raw?.packet?.decoded?.text) return <MessageSquare className="w-3 h-3 text-green-500" />;
  
  // Position
  if (packet.raw?.packet?.decoded?.position) return <MapPin className="w-3 h-3 text-red-500" />;
  
  // Telemetry
  if (packet.raw?.packet?.decoded?.telemetry) return <Zap className="w-3 h-3 text-yellow-500" />;
  
  // Node info
  if (packet.raw?.nodeInfo) return <Radio className="w-3 h-3 text-blue-500" />;
  
  // My Info
  if (packet.raw?.myInfo) return <Radio className="w-3 h-3 text-slate-400" />;
  
  return <Radio className="w-3 h-3 text-slate-400" />;
}

function getPacketLabel(packet) {
  console.log('Packet structure:', packet, 'Type:', packet.type, 'Raw:', packet.raw);
  
  // Textnachrichten
  if (packet.raw?.packet?.decoded?.text) {
    const text = packet.raw.packet.decoded.text;
    return `Text: ${text.slice(0, 50)}`;
  }
  
  // GPS/Position
  if (packet.raw?.packet?.decoded?.position) {
    const pos = packet.raw.packet.decoded.position;
    return `GPS: ${pos.latitude?.toFixed(4)}, ${pos.longitude?.toFixed(4)}`;
  }
  
  // Telemetrie
  if (packet.raw?.packet?.decoded?.telemetry) {
    const tel = packet.raw.packet.decoded.telemetry;
    if (tel.deviceMetrics) return `Telemetrie: Bat ${tel.deviceMetrics.batteryLevel}%`;
    if (tel.environmentMetrics) return `Umgebung: ${tel.environmentMetrics.temperature?.toFixed(1)}°C`;
    return 'Telemetrie';
  }
  
  // Node Info
  if (packet.raw?.nodeInfo) {
    const ni = packet.raw.nodeInfo;
    return `Node: ${ni.user?.longName || 'Unbekannt'}`;
  }
  
  // My Info
  if (packet.raw?.myInfo) {
    return `My Info`;
  }
  
  return `Paket (Type: ${packet.type})`;
}

function formatTime(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function ReceivedPacketsTable() {
  const { packetLog } = useMeshStore();

  console.log('ReceivedPacketsTable rendered, packetLog:', packetLog);

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