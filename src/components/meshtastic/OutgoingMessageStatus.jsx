import { Clock, Send, CheckCircle2, XCircle, AlertTriangle, MessageSquareReply, Loader2, Cpu, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const STATUS_META = {
  queued: {
    label: 'In Warteschlange', icon: Loader2, spin: true,
    className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    description: 'Vorbereitet, noch nicht an die serielle Schnittstelle geschrieben.',
  },
  written_to_serial: {
    label: 'An Serial geschrieben', icon: Send,
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900',
    description: 'Browser → serieller Port erfolgreich. Noch keine Bestätigung vom Funkgerät.',
  },
  accepted_by_device: {
    label: 'Vom Gerät angenommen', icon: Cpu,
    className: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-900',
    description: 'Lokales Funkgerät hat das Paket bestätigt/eingereiht (queueStatus / Top-Level-ACK). Noch keine Mesh-Bestätigung.',
  },
  ack: {
    label: 'Mesh ACK', icon: CheckCircle2,
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-200 dark:border-green-900',
    description: 'Routing-ACK aus dem Mesh empfangen — mind. ein Node hat es weitergeleitet/empfangen.',
  },
  nak: {
    label: 'Mesh NAK', icon: XCircle,
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900',
    description: 'Routing-Fehler vom Mesh empfangen.',
  },
  timeout: {
    label: 'Timeout', icon: AlertTriangle,
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900',
    description: 'Keine ACK/NAK innerhalb des Zeitfensters. Nicht zwingend „nicht angekommen", aber unbestätigt.',
  },
  reply_received: {
    label: 'Antwort erhalten', icon: MessageSquareReply,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900',
    description: 'Echte Textantwort vom Empfänger-Node empfangen.',
  },
  error: {
    label: 'Sende-Fehler', icon: XCircle,
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900',
    description: 'Übergabe an Gerät fehlgeschlagen.',
  },
};

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `vor ${diff}s`;
  if (diff < 3600) return `vor ${Math.floor(diff / 60)}min`;
  return `vor ${Math.floor(diff / 3600)}h`;
}

function formatDest(msg) {
  if (msg.kind === 'direct' && msg.to) {
    return <><User className="w-3 h-3" /> DM <span className="font-mono">!{msg.to.toString(16).padStart(8, '0')}</span></>;
  }
  return <>Broadcast</>;
}

function getStatusMeta(msg) {
  // Broadcasts have no routing-ACK by protocol; accepted_by_device is the terminal "success" state.
  if (msg.kind === 'channel' && msg.status === 'accepted_by_device') {
    return {
      label: 'Gesendet (Broadcast)', icon: CheckCircle2,
      className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-200 dark:border-green-900',
      description: 'Broadcasts erhalten kein Routing-ACK. Das Gerät hat das Paket akzeptiert und ausgesendet.',
    };
  }
  return STATUS_META[msg.status] || STATUS_META.queued;
}

export default function OutgoingMessageStatus({ outgoing }) {
  if (!outgoing?.length) return null;

  const recent = outgoing.slice(0, 5);

  return (
    <div className="border-t border-emerald-100 dark:border-emerald-900 pt-2 mt-2 space-y-1.5">
      <div className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-100 px-0.5">
        Letzte gesendete Nachrichten
      </div>
      {recent.map(msg => {
        const meta = getStatusMeta(msg);
        const Icon = meta.icon;
        return (
          <div key={msg.tempId} className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-800 dark:text-slate-100 truncate" title={msg.text}>
                  {msg.text}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
                  <span className="flex items-center gap-1">{formatDest(msg)}</span>
                  <span>· Ch {msg.channel}</span>
                  <span>· hop {msg.hopLimit ?? '?'}</span>
                  <span>· {msg.wantAck === false ? 'no-ack' : 'want-ack'}</span>
                  <span>· {timeAgo(msg.sentAt)}</span>
                  {msg.id != null && <span className="font-mono">· #{msg.id.toString(16).toUpperCase()}</span>}
                </div>
              </div>
              <Badge variant="outline" className={`text-[10px] gap-1 ${meta.className}`} title={meta.description}>
                <Icon className={`w-3 h-3 ${meta.spin ? 'animate-spin' : ''}`} />
                {meta.label}
              </Badge>
            </div>
            {msg.error && (
              <div className="mt-1 text-[11px] text-red-600 dark:text-red-300">{msg.error}</div>
            )}
            {msg.replyText && (
              <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-start gap-1">
                <MessageSquareReply className="w-3 h-3 mt-0.5 shrink-0" />
                <span className="break-words"><span className="font-mono">#{msg.replyFrom?.toString(16).toUpperCase()}</span>: {msg.replyText}</span>
              </div>
            )}
          </div>
        );
      })}
      <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug px-0.5 pt-1 flex items-start gap-1">
        <Clock className="w-3 h-3 mt-0.5 shrink-0" />
        <span>Broadcasts haben protokollbedingt kein Routing-ACK — Endstufe ist „Gesendet (Broadcast)". Nur Direkt-Nachrichten mit want-ack liefern Mesh-ACK/NAK; „Antwort erhalten" zeigt eine echte Textantwort.</span>
      </div>
    </div>
  );
}