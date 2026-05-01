import { useEffect, useRef, useState } from 'react';
import { Database, Loader2, CheckCircle2 } from 'lucide-react';
import { subscribePersistenceProgress } from '@/lib/meshtastic/persistence.js';

/**
 * Non-blocking indicator + progress bar.
 * - Tracks a "session" of work: peak total = max items seen since the last idle state.
 * - Shows a percentage bar based on (done / peak).
 * - Briefly shows "gespeichert" after everything drains, then hides.
 */
export default function PersistenceProgress({ active }) {
  const [snap, setSnap] = useState({ pendingPackets: 0, pendingNodes: 0, inFlightPackets: 0, inFlightNodes: 0 });
  const [showDone, setShowDone] = useState(false);
  const peakRef = useRef(0);
  const [peak, setPeak] = useState(0);

  useEffect(() => {
    if (!active) return;
    const unsub = subscribePersistenceProgress(setSnap);
    return unsub;
  }, [active]);

  const total = snap.pendingPackets + snap.pendingNodes + snap.inFlightPackets + snap.inFlightNodes;
  const busy = total > 0;

  // Track peak for the current "session"
  useEffect(() => {
    if (total > peakRef.current) {
      peakRef.current = total;
      setPeak(total);
    }
    if (total === 0) {
      // reset peak when fully drained
      peakRef.current = 0;
      setPeak(0);
    }
  }, [total]);

  // Show "done" briefly after busy -> idle
  useEffect(() => {
    if (!active) return;
    if (busy) {
      setShowDone(false);
    } else {
      setShowDone(true);
      const t = setTimeout(() => setShowDone(false), 2000);
      return () => clearTimeout(t);
    }
  }, [busy, active]);

  if (!active) return null;
  if (!busy && !showDone) return null;

  const done = Math.max(0, peak - total);
  const percent = peak > 0 ? Math.round((done / peak) * 100) : 100;

  return (
    <div
      className="flex items-center gap-2 text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700 min-w-[180px]"
      title={`Pakete: ${snap.pendingPackets} wartend, ${snap.inFlightPackets} schreibend\nNodes: ${snap.pendingNodes} wartend, ${snap.inFlightNodes} schreibend`}
    >
      {busy ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
      ) : (
        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
      )}
      <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2 leading-none">
          <span className="text-slate-300">
            {busy ? `Speichert ${total}` : 'Gespeichert'}
          </span>
          {busy && peak > 0 && <span className="text-slate-400 font-mono">{percent}%</span>}
        </div>
        <div className="h-1 w-full bg-slate-700 rounded overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${busy ? 'bg-blue-500' : 'bg-green-500'}`}
            style={{ width: `${busy ? percent : 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}