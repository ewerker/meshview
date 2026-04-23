import { useMeshStore } from '@/hooks/useMeshStore.js';
import { Clock, MessageSquare, MapPin, Zap, Radio } from 'lucide-react';

function getPacketIcon(packet) {
  if (packet.raw?.decoded) {
    const portnum = packet.raw.decoded.portnum;
    if (portnum === 1) return <MessageSquare className="w-3 h-3 text-green-500" />;
    if (portnum === 3) return <MapPin className="w-3 h-3 text-red-500" />;
    if (portnum === 67) return <Zap className="w-3 h-3 text-yellow-500" />;
  }
  return <Radio className="w-3 h-3 text-blue-500" />;
}

function getPacketLabel(packet) {
  if (packet.raw?.decoded) {
    const { portnum, text, latitude, longitude } = packet.raw.decoded;
    if (portnum === 1) return `Text: ${text?.slice(0, 40) || ''}`;
    if (portnum === 3) return `GPS: ${latitude?.toFixed(4)}, ${longitude?.toFixed(4)}`;
    if (portnum === 67) return 'Telemetrie';
  }
  if (packet.raw?.nodeInfo) return 'Node Info';
  if (packet.raw?.myInfo) return 'My Info';
  return 'Paket';
}

function timeAgo(timestamp) {
  if (!timestamp) return '-';
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return `vor ${diff}s`;
  if (diff < 3600) return `vor ${Math.floor(diff / 60)}min`;
  return `vor ${Math.floor(diff / 3600)}h`;
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
              <td className="px-3 py-2 text-slate-500">
                {timeAgo(packet.time)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}