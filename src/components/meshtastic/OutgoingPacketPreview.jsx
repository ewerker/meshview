import { useMemo } from 'react';
import { AlertTriangle, FileCode2, Send, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { inspectTextPacket } from '@/lib/meshtastic/serialConnection.js';

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

// Modal preview of the exact bytes that will be sent. Forces explicit confirmation
// so the user can verify the packet is well-formed before it goes to serial.
export default function OutgoingPacketPreview({ open, onOpenChange, text, channelIndex, sendOpts, onConfirm, sending }) {
  const inspection = useMemo(() => {
    if (!open) return null;
    const destination = sendOpts.kind === 'direct' ? sendOpts.destination : 0xffffffff;
    return inspectTextPacket(text, destination ?? 0xffffffff, Number(channelIndex), {
      hopLimit: sendOpts.hopLimit,
      wantAck: sendOpts.wantAck,
    });
  }, [open, text, channelIndex, sendOpts]);

  const hasIssues = inspection?.issues?.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-emerald-600" />
            Paket-Vorschau vor dem Senden
          </DialogTitle>
          <DialogDescription>
            Genau diese Bytes werden auf den seriellen Port geschrieben. Prüfe Felder und Payload, bevor du bestätigst.
          </DialogDescription>
        </DialogHeader>

        {inspection && (
          <div className="space-y-3 text-xs">
            {hasIssues && (
              <div className="rounded-md border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-2 text-red-700 dark:text-red-300">
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  {inspection.issues.length} Problem{inspection.issues.length === 1 ? '' : 'e'} erkannt
                </div>
                <ul className="space-y-0.5 ml-5 list-disc">
                  {inspection.issues.map((msg, i) => <li key={i}>{msg}</li>)}
                </ul>
              </div>
            )}

            <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2">
              <div className="font-semibold text-slate-700 dark:text-slate-200 mb-1.5">MeshPacket / Data Felder</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
                {Object.entries(inspection.fields).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 border-b border-slate-200 dark:border-slate-800 py-0.5">
                    <span className="text-slate-500 dark:text-slate-400 truncate" title={k}>{k}</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200 text-right break-all">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-200">ToRadio-Bytes (Hex)</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {inspection.bytes.length} B · packet_id 0x{inspection.packetId.toString(16).padStart(8, '0')}
                </span>
              </div>
              <pre className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 max-h-48 overflow-auto text-[10px] font-mono leading-snug whitespace-pre-wrap break-all">
                {bytesToHex(inspection.bytes)}
              </pre>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Hinweis: Dem werden auf der Leitung START1 (0x94), START2 (0xC3) und 2 Byte Length-Header vorangestellt.
              </div>
            </div>

            {inspection.textBytes?.length > 0 && (
              <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2">
                <div className="font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Data.payload (UTF-8)</div>
                <pre className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 max-h-24 overflow-auto text-[11px] font-mono whitespace-pre-wrap break-all">
                  {bytesToHex(inspection.textBytes)}
                </pre>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending} className="gap-1.5">
            <X className="w-4 h-4" /> Abbrechen
          </Button>
          <Button onClick={onConfirm} disabled={sending || hasIssues} className="gap-1.5">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {hasIssues ? 'Probleme beheben' : 'Senden bestätigen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}