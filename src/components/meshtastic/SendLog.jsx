import { format } from 'date-fns';
import { CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { useState } from 'react';
import { useMeshStore } from '@/hooks/useMeshStore.js';

function formatDest(num) {
  if (num === 0xffffffff) return 'Broadcast';
  return `!${num.toString(16).padStart(8, '0')}`;
}

export default function SendLog() {
  const { sendLog } = useMeshStore();
  const [open, setOpen] = useState(false);

  const pending = sendLog.filter(e => e.status === 'sending').length;
  const errors = sendLog.filter(e => e.status === 'error').length;

  const badgeColor = errors > 0 ? 'text-red-500' : pending > 0 ? 'text-yellow-500' : 'text-green-500';

  return (
    <div className="border-t bg-white shrink-0">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
      >
        <Terminal className="w-3 h-3" />
        <span className="font-medium">Sende-Protokoll</span>
        {sendLog.length > 0 && (
          <span className={`font-mono ${badgeColor}`}>
            ({sendLog.length} Eintr{sendLog.length === 1 ? 'ag' : 'äge'}{errors > 0 ? `, ${errors} Fehler` : ''})
          </span>
        )}
        <span className="ml-auto">{open ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}</span>
      </button>

      {open && (
        <div className="max-h-36 overflow-y-auto border-t bg-slate-950 font-mono text-xs">
          {sendLog.length === 0 ? (
            <div className="px-3 py-2 text-slate-500">Noch keine Sendevorgänge.</div>
          ) : (
            sendLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-1 border-b border-slate-800">
                {entry.status === 'sending' && <Loader2 className="w-3 h-3 text-yellow-400 animate-spin mt-0.5 shrink-0" />}
                {entry.status === 'ok'      && <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />}
                {entry.status === 'error'   && <XCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />}
                <span className="text-slate-500 shrink-0">{format(entry.time, 'HH:mm:ss')}</span>
                <span className="text-slate-300 shrink-0">→ {formatDest(entry.destNum)}</span>
                <span className={`truncate flex-1 ${entry.status === 'error' ? 'text-red-300' : 'text-slate-200'}`}>
                  {entry.status === 'error' ? `FEHLER: ${entry.error}` : `"${entry.text}"`}
                </span>
                {entry.wantAck && <span className="text-blue-400 shrink-0">ACK</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}