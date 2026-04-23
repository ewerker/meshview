import { useState } from 'react';
import { format } from 'date-fns';
import { Terminal, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import { meshStore } from '@/lib/meshtastic/meshStore.js';

export default function SerialLog() {
  const { serialLog } = useMeshStore();
  const [open, setOpen] = useState(false);
  const [showHex, setShowHex] = useState(false);

  const clear = (e) => {
    e.stopPropagation();
    meshStore.serialLog = [];
    meshStore.notify();
  };

  const rxCount = serialLog.filter(e => e.direction === 'rx').length;
  const txCount = serialLog.filter(e => e.direction === 'tx').length;

  return (
    <div className="border-t bg-white shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
      >
        <Terminal className="w-3 h-3 text-purple-500" />
        <span className="font-medium text-purple-700">Serial Log</span>
        <span className="text-slate-400 font-mono">
          ↑{txCount} TX · ↓{rxCount} RX
        </span>
        {serialLog.length > 0 && (
          <button
            onClick={clear}
            className="ml-1 text-slate-400 hover:text-red-500 transition-colors"
            title="Log leeren"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
        <label
          className="ml-auto flex items-center gap-1 cursor-pointer"
          onClick={e => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={showHex}
            onChange={e => setShowHex(e.target.checked)}
            className="w-3 h-3"
          />
          <span className="text-xs">Hex</span>
        </label>
        <span className="ml-1">{open ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}</span>
      </button>

      {open && (
        <div className="max-h-56 overflow-y-auto border-t bg-slate-950 font-mono text-xs">
          {serialLog.length === 0 ? (
            <div className="px-3 py-2 text-slate-500">Keine Daten.</div>
          ) : (
            serialLog.map((entry, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 px-3 py-1 border-b border-slate-800 ${
                  entry.direction === 'rx' ? 'text-green-300' :
                  entry.direction === 'tx' ? 'text-yellow-300' : 'text-blue-300'
                }`}
              >
                <span className="shrink-0 text-slate-500">{format(entry.time, 'HH:mm:ss.SSS')}</span>
                <span className={`shrink-0 font-bold w-8 ${
                  entry.direction === 'rx' ? 'text-green-400' :
                  entry.direction === 'tx' ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {entry.direction === 'rx' ? '← RX' : entry.direction === 'tx' ? '→ TX' : '⚡'}
                </span>
                {entry.label ? (
                  <span>{entry.label}</span>
                ) : (
                  <>
                    <span className="text-slate-400 shrink-0">{entry.byteLen}b</span>
                    {showHex && (
                      <span className="break-all opacity-70">{entry.hex}</span>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}