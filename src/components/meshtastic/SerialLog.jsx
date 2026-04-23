import { useMeshStore } from '@/hooks/useMeshStore.js';
import { useEffect, useRef } from 'react';

export default function SerialLog() {
  const { packetLog } = useMeshStore();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [packetLog]);

  return (
    <div className="border rounded-lg bg-slate-900 p-3 h-24 overflow-hidden flex flex-col">
      <div className="text-xs font-mono text-slate-400 mb-1">RX/TX Serial Log</div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto text-[10px] font-mono space-y-0.5"
      >
        {packetLog.length === 0 ? (
          <div className="text-slate-500">Warte auf Pakete...</div>
        ) : (
          packetLog.slice(0, 20).map((packet, idx) => (
            <div key={idx} className="text-slate-400">
              <span className="text-green-500">[RX]</span> {packet.type}
              {packet.raw?.myInfo && ' myInfo'}
              {packet.raw?.nodeInfo && ' nodeInfo'}
              {packet.raw?.packet && ' packet'}
            </div>
          ))
        )}
      </div>
    </div>
  );
}