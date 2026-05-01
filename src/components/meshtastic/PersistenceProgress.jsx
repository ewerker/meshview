import { useEffect, useState } from 'react';
import { Database, Loader2, CheckCircle2 } from 'lucide-react';
import { subscribePersistenceProgress } from '@/lib/meshtastic/persistence.js';

/**
 * Non-blocking indicator showing how many packets/nodes are still pending or being written.
 * - While there is work: animated icon + counts
 * - Briefly shows a check after everything is flushed, then hides itself
 * - Only renders when the user is logged in (= persistence active)
 */
export default function PersistenceProgress({ active }) {
  const [snap, setSnap] = useState({ pendingPackets: 0, pendingNodes: 0, inFlightPackets: 0, inFlightNodes: 0 });
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    const unsub = subscribePersistenceProgress(setSnap);
    return unsub;
  }, [active]);

  const total = snap.pendingPackets + snap.pendingNodes + snap.inFlightPackets + snap.inFlightNodes;
  const busy = total > 0;

  // When work transitions from busy -> idle, briefly show "Done"
  useEffect(() => {
    if (!active) return;
    if (busy) {
      setShowDone(false);
    } else if (showDone === false) {
      // Only show "done" if we recently had work; we approximate by
      // showing it whenever we just transitioned to idle.
      setShowDone(true);
      const t = setTimeout(() => setShowDone(false), 1500);
      return () => clearTimeout(t);
    }
  }, [busy, active]);

  if (!active) return null;
  if (!busy && !showDone) return null;

  const pendingTotal = snap.pendingPackets + snap.pendingNodes;
  const inFlightTotal = snap.inFlightPackets + snap.inFlightNodes;

  return (
    <div
      className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700"
      title={`Pakete wartend: ${snap.pendingPackets} · Pakete schreibend: ${snap.inFlightPackets} · Nodes wartend: ${snap.pendingNodes} · Nodes schreibend: ${snap.inFlightNodes}`}
    >
      {busy ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono">
            {inFlightTotal > 0 && <span>{inFlightTotal} </span>}
            {pendingTotal > 0 && <span className="text-slate-400">+{pendingTotal}</span>}
          </span>
          <span className="hidden md:inline text-slate-400">speichert…</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          <span className="hidden md:inline text-slate-400">gespeichert</span>
        </>
      )}
    </div>
  );
}