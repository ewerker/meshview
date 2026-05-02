import { useState } from 'react';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import { Clock, MessageSquare, MapPin, Zap, Radio, Settings, FileText, Hash, List, AlertTriangle, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import PacketRowDetails from './PacketRowDetails.jsx';
import { useI18n } from '@/lib/i18n/I18nContext.jsx';

function getDecoded(logEntry) {
  // raw is the parsed FromRadio object: { type, packet: { from, to, decoded: {...} }, ... }
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

function getPacketChannel(packet) {
  const index = packet.channel ?? packet.raw?.packet?.channelInfo?.index ?? packet.raw?.packet?.channel;
  const hash = packet.channelHash ?? packet.raw?.packet?.channelHash;
  if (index !== null && index !== undefined) return index;
  // Hash 0 = Primary-Channel (Index 0), nicht ein unaufgeloester Hash
  if (hash === 0) return 0;
  return hash !== undefined ? `Hash ${hash}` : '-';
}

function getPacketChannelTitle(packet) {
  const hash = packet.channelHash ?? packet.raw?.packet?.channelHash;
  const index = packet.channel ?? packet.raw?.packet?.channelInfo?.index;
  const name = packet.raw?.packet?.channelInfo?.name;
  const effectiveIndex = (index !== null && index !== undefined) ? index : (hash === 0 ? 0 : null);
  if (effectiveIndex === null) return hash !== undefined ? `Unaufgelöster Channel-Hash ${hash}` : 'Channel unbekannt';
  return `${name || `Channel ${effectiveIndex}`}${hash !== undefined ? ` · Hash ${hash}` : ''}`;
}

function getPacketLabel(packet) {
  const decoded = getDecoded(packet);
  
  if (decoded?.analysis?.summary) return `${decoded.analysis.app}: ${decoded.analysis.summary.replace(`${decoded.analysis.app}: `, '')}`;
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
  if (packet.type === 'ack') return `ACK: ID ${packet.id}`;
  if (packet.type === 'error') return `Fehler: ${packet.raw?.error || 'Parse-Fehler'}`;
  if (packet.type === 'packet' && packet.raw?.packet?.encrypted) return packet.raw?.packet?.decryptError ? `Verschlüsselt: nicht dekodiert` : 'Paket: Verschlüsselt';
  if (decoded?.portnumName) return `App: ${decoded.portnumName}`;
  return `${packet.type || 'Unbekannt'}: -`;
}

function formatTime(timestamp) {
  if (!timestamp) return '-';
  // timestamp is now in ms (Date.now())
  const date = new Date(timestamp);
  const hms = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${hms}.${ms}`;
}

export default function ReceivedPacketsTable({ onSelectNode, messagesOnly = false, packets }) {
  const { t } = useI18n();
  const store = useMeshStore();
  const packetLog = packets ?? store.packetLog;
  const nodes = store.nodes || [];
  const [expandedSeq, setExpandedSeq] = useState(null);
  const [packetSearch, setPacketSearch] = useState('');

  const getNodeDisplayName = (nodeNum) => {
    const node = nodes.find(item => item.num === nodeNum);
    const nodeId = typeof nodeNum === 'number' ? `!${nodeNum.toString(16).padStart(8, '0')}` : null;
    const longName = node?.user?.longName || node?.long_name;
    const shortName = node?.user?.shortName || node?.short_name;
    return longName
      ? `${longName}${shortName ? ` (${shortName})` : ''}`
      : nodeId || '-';
  };

  const baseVisiblePackets = messagesOnly
    ? packetLog.filter(p => p.raw?.packet?.decoded?.text)
    : packetLog;

  const searchTerm = packetSearch.trim().toLowerCase();
  const visiblePackets = searchTerm
    ? baseVisiblePackets.filter(packet => {
      const label = getPacketLabel(packet);
      const nodeName = getNodeDisplayName(packet.from);
      const rawJson = JSON.stringify(packet.raw || {}).toLowerCase();
      return `${nodeName} ${label} ${packet.type || ''}`.toLowerCase().includes(searchTerm) || rawJson.includes(searchTerm);
    })
    : baseVisiblePackets;

  const searchPlaceholder = messagesOnly ? 'Nachrichten durchsuchen…' : 'Pakete durchsuchen…';

  if (visiblePackets.length === 0) {
    return (
      <div className="space-y-2">
        <div className="px-2 pt-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={packetSearch}
              onChange={(e) => setPacketSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 pl-8 text-xs bg-white dark:bg-slate-950"
            />
          </div>
        </div>
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
          {messagesOnly ? t('noMessagesReceived') : t('noPacketsReceived')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="px-2 pt-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            value={packetSearch}
            onChange={(e) => setPacketSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-8 text-xs bg-white dark:bg-slate-950"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 text-slate-600 dark:text-slate-300 shadow-sm">
          <tr>
            <th className="px-2 py-2 w-6"></th>
            <th className="px-3 py-2 text-left font-semibold">{t('packetFrom')}</th>
            <th className="px-3 py-2 text-left font-semibold">{t('packetType')}</th>
            <th className="px-3 py-2 text-left font-semibold">{t('packetDetails')}</th>
            <th className="px-3 py-2 text-left font-semibold">Channel</th>
            <th className="px-3 py-2 text-left font-semibold">{t('packetTime')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 border-t border-slate-200 dark:border-slate-700">
          {visiblePackets.slice(-50).reverse().map((packet) => {
            const labelParts = getPacketLabel(packet).split(':');
            const typ = labelParts[0];
            const details = labelParts.slice(1).join(':').trim() || '-';
            const nodeName = getNodeDisplayName(packet.from);
            const isExpanded = expandedSeq === packet.seq;
            const toggle = () => setExpandedSeq(isExpanded ? null : packet.seq);
            return [
              <tr
                key={`${packet.seq}-row`}
                onClick={toggle}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <td className="px-2 py-2 text-slate-400 dark:text-slate-500 w-6">
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </td>
                <td
                  className={`px-3 py-2 font-mono text-slate-500 dark:text-slate-400 ${packet.from && onSelectNode ? 'hover:text-blue-600 dark:hover:text-blue-400 hover:underline' : ''}`}
                  onClick={(e) => {
                    if (packet.from && onSelectNode) {
                      e.stopPropagation();
                      onSelectNode(packet.from);
                    }
                  }}
                >
                  {nodeName}
                </td>
                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    {getPacketIcon(packet)}
                    <span>{typ}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-500 dark:text-slate-400 max-w-[200px] sm:max-w-xs" title={details !== '-' ? details : undefined}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{details}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">
                  <span title={getPacketChannelTitle(packet)}>{typeof getPacketChannel(packet) === 'number' ? `Ch ${getPacketChannel(packet)}` : getPacketChannel(packet)}</span>
                </td>
                <td className="px-3 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {formatTime(packet.time)}
                </td>
              </tr>,
              isExpanded && (
                <tr key={`${packet.seq}-details`}>
                  <td colSpan={6} className="p-0">
                    <PacketRowDetails packet={packet} />
                  </td>
                </tr>
              )
            ];
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}