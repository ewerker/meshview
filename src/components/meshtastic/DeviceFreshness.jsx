import { Clock, UploadCloud, Radio } from 'lucide-react';

function timeAgo(value) {
  if (!value) return null;
  const ts = typeof value === 'number' ? value : new Date(value).getTime();
  if (!ts || Number.isNaN(ts)) return null;
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 0) return 'gerade eben';
  if (diff < 60) return `vor ${diff}s`;
  if (diff < 3600) return `vor ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)}h`;
  return `vor ${Math.floor(diff / 86400)}d`;
}

function absolute(value) {
  if (!value) return null;
  const ts = typeof value === 'number' ? value : new Date(value).getTime();
  if (!ts || Number.isNaN(ts)) return null;
  return new Date(ts).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

export default function DeviceFreshness({ lastSave, lastPacketTime, compact = false }) {
  const saveAgo = timeAgo(lastSave);
  const packetAgo = timeAgo(lastPacketTime);

  if (!saveAgo && !packetAgo) return null;

  return (
    <div className={`flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 ${compact ? 'flex-wrap' : ''}`}>
      {packetAgo && (
        <span className="inline-flex items-center gap-1" title={`Letztes empfangenes Paket: ${absolute(lastPacketTime)}`}>
          <Radio className="w-3 h-3" />
          Paket {packetAgo}
        </span>
      )}
      {saveAgo && (
        <span className="inline-flex items-center gap-1" title={`Letzte Speicherung in DB: ${absolute(lastSave)}`}>
          <UploadCloud className="w-3 h-3" />
          Speicherung {saveAgo}
        </span>
      )}
    </div>
  );
}