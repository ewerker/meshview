import { useMemo, useState } from 'react';
import { ChevronDown, AlertTriangle, FileCode2 } from 'lucide-react';
import { inspectTextPacket } from '@/lib/meshtastic/serialConnection.js';

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

// Live preview of the exact bytes that would be sent to the device for the
// current text + options. Used to verify the packet is well-formed before sending.
export default function OutgoingPacketPreview({ text, channelIndex, sendOpts }) {
  const [open, setOpen] = useState(false);

  const inspection = useMemo(() => {
    const destination = sendOpts.kind === 'direct' ? sendOpts.destination : 0xffffffff;
    if (sendOpts.kind === 'direct' && !destination) return null;
    return inspectTextPacket(text, destination ?? 0xffffffff, Number(channelIndex), {
      hopLimit: sendOpts.hopLimit,
      wantAck: sendOpts.wantAck,
    });
  }, [text, channelIndex, sendOpts]);

  if (!inspection) return null;

  const hasIssues = inspection.issues.length > 0;

  return (
    <div className={`rounded-md border text-[11px] ${hasIssues ? 'border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-950/30' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40'}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-2 py-1.5"
      >
        <span className="flex items-center gap-1.5">
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? '' : '-rotate-90'}`} />
          {hasIssues ? <AlertTriangle className="w-3 h-3 text-red-600" /> : <FileCode2 className="w-3 h-3 text-slate-500" />}
          <span className={hasIssues ? 'text-red-700 dark:text-red-300 font-semibold' : 'text-slate-600 dark:text-slate-300'}>
            {hasIssues ? `Paket-Vorschau · ${inspection.issues.length} Problem${inspection.issues.length === 1 ? '' : 'e'}` : 'Paket-Vorschau (vor Senden)'}
          </span>
        </span>
        <span className="text-slate-400 font-mono">
          ToRadio: {inspection.bytes.length} B · id 0x{inspection.packetId.toString(16).padStart(8, '0')}
        </span>
      </button>

      {open && (
        <div className="px-2 pb-2 space-y-2">
          {hasIssues && (
            <ul className="space-y-0.5 text-red-700 dark:text-red-300">
              {inspection.issues.map((msg, i) => (
                <li key={i}>• {msg}</li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
            {Object.entries(inspection.fields).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-slate-100 dark:border-slate-800 py-0.5">
                <span className="text-slate-500 dark:text-slate-400 truncate" title={k}>{k}</span>
                <span className="font-mono text-slate-700 dark:text-slate-200 text-right">{v}</span>
              </div>
            ))}
          </div>

          <div>
            <div className="text-slate-500 dark:text-slate-400 mb-0.5">ToRadio-Bytes (ohne START1/START2/length-Header):</div>
            <pre className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-1.5 overflow-x-auto text-[10px] font-mono leading-snug whitespace-pre-wrap break-all">
              {bytesToHex(inspection.bytes)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}