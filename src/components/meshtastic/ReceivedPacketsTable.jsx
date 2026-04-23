import { useMeshStore } from '@/hooks/useMeshStore.js';
import { Clock, MessageSquare, MapPin, Zap, Radio } from 'lucide-react';

function getPacketIcon(packet) {
  // Text message (portnum 1)
  if (packet.raw?.decoded?.portnum === 1) return <MessageSquare className="w-3 h-3 text-green-500" />;
  if (packet.raw?.decoded?.text) return <MessageSquare className="w-3 h-3 text-green-500" />;
  
  // Position (portnum 3)
  if (packet.raw?.decoded?.portnum === 3) return <MapPin className="w-3 h-3 text-red-500" />;
  if (packet.raw?.position) return <MapPin className="w-3 h-3 text-red-500" />;
  
  // Telemetry (portnum 67)
  if (packet.raw?.decoded?.portnum === 67) return <Zap className="w-3 h-3 text-yellow-500" />;
  if (packet.raw?.deviceMetrics || packet.raw?.environmentMetrics) return <Zap className="w-3 h-3 text-yellow-500" />;
  
  return <Radio className="w-3 h-3 text-blue-500" />;
}

function getPacketLabel(packet) {
  // Textnachrichten
  if (packet.raw?.decoded?.text) {
    return `Text: ${packet.raw.decoded.text.slice(0, 50)}`;
  }
  
  // GPS/Position
  if (packet.raw?.position) {
    const pos = packet.raw.position;
    return `GPS: ${pos.latitude?.toFixed(4)}, ${pos.longitude?.toFixed(4)}`;
  }
  if (packet.raw?.decoded?.latitude) {
    const { latitude, longitude } = packet.raw.decoded;
    return `GPS: ${latitude?.toFixed(4)}, ${longitude?.toFixed(4)}`;
  }
  
  // Telemetrie/Device Metrics
  if (packet.raw?.deviceMetrics) {
    const dm = packet.raw.deviceMetrics;
    return `Telemetrie: Bat ${dm.batteryLevel}% SNR ${dm.numOnlineNodes || '-'}`;
  }
  if (packet.raw?.decoded?.portnum === 67) {
    return 'Telemetrie';
  }
  
  // Umgebungssensoren
  if (packet.raw?.environmentMetrics) {
    const em = packet.raw.environmentMetrics;
    return `Umgebung: ${em.temperature?.toFixed(1)}°C ${em.relativeHumidity?.toFixed(0)}%`;
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
  
  // Admin Messages
  if (packet.raw?.decoded?.portnum === 160) {
    return 'Admin Message';
  }
  
  // Fallback
  return `Paket (portnum: ${packet.raw?.decoded?.portnum || '?'})`;
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