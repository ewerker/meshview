import { format } from 'date-fns';
import { MessageSquare } from 'lucide-react';

function formatNodeId(num) {
  if (!num) return 'Unbekannt';
  if (num === 0xffffffff) return 'Alle';
  return `!${num.toString(16).padStart(8, '0')}`;
}

export default function MessageLog({ messages, nodes }) {
  const getNodeName = (num) => {
    const node = nodes.find(n => n.num === num);
    return node?.user?.longName || node?.user?.shortName || formatNodeId(num);
  };

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="text-center">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Noch keine Nachrichten</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
      {messages.map((msg, i) => (
        <div key={i} className="bg-white rounded-lg p-3 border shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-600">{getNodeName(msg.from)}</span>
              <span className="text-xs text-slate-400">→</span>
              <span className="text-xs text-slate-500">{getNodeName(msg.to)}</span>
            </div>
            <span className="text-xs text-slate-400">{format(msg.time, 'HH:mm:ss')}</span>
          </div>
          <p className="text-sm">{msg.text}</p>
          {(msg.rxSnr || msg.rxRssi) && (
            <div className="text-xs text-slate-400 mt-1">
              {msg.rxSnr ? `SNR: ${msg.rxSnr.toFixed(1)} dB` : ''}
              {msg.rxRssi ? ` · RSSI: ${msg.rxRssi} dBm` : ''}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}