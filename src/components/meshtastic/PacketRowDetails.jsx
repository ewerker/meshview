import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

function bytesToHex(bytes) {
  if (!bytes) return '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

// Format hex with 16 bytes per line and offset
function formatHexDump(bytes) {
  if (!bytes) return '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const lines = [];
  for (let i = 0; i < arr.length; i += 16) {
    const chunk = arr.slice(i, i + 16);
    const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = Array.from(chunk).map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('');
    const offset = i.toString(16).padStart(4, '0');
    lines.push(`${offset}  ${hex.padEnd(48, ' ')}  ${ascii}`);
  }
  return lines.join('\n');
}

// JSON replacer to handle Uint8Array nicely
function jsonReplacer(key, value) {
  if (value instanceof Uint8Array) {
    return `[Bytes: ${bytesToHex(value)}]`;
  }
  return value;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Kopiert' : 'Kopieren'}
    </button>
  );
}

export default function PacketRowDetails({ packet }) {
  const json = JSON.stringify(packet.raw, jsonReplacer, 2);
  const hex = formatHexDump(packet.rawBytes);

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-3 space-y-3 border-l-2 border-blue-400">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            JSON (geparst)
          </div>
          <CopyButton text={json} />
        </div>
        <pre className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre">
          {json}
        </pre>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            HEX (Original, {packet.rawBytes?.length || 0} Bytes)
          </div>
          <CopyButton text={hex} />
        </div>
        <pre className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre">
          {hex || '(keine Rohdaten verfügbar)'}
        </pre>
      </div>
    </div>
  );
}