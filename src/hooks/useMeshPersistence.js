// Runs snapshot-based autosave after the user enabled saving in this session.
import { useEffect, useRef, useState } from 'react';
import { saveMeshSnapshot, isSaveLocked } from '@/lib/meshtastic/persistence.js';

export function useMeshPersistence({ enabled, myNodeNum, nodes, packetLog }) {
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);
  const lastFingerprintRef = useRef('');
  const savingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !myNodeNum) return;

    const fingerprint = `${myNodeNum}:${nodes.length}:${packetLog.length}:${packetLog.at(-1)?.seq || 0}:${packetLog.at(-1)?.time || 0}`;
    if (fingerprint === lastFingerprintRef.current || savingRef.current) return;

    const timer = setTimeout(async () => {
      // Falls währenddessen ein manueller Save (oder anderer Flush) läuft: nicht starten,
      // beim nächsten Render-Tick versucht der Hook es erneut.
      if (isSaveLocked() || savingRef.current) return;

      savingRef.current = true;
      setAutoSaveStatus({ status: 'saving' });

      try {
        const result = await saveMeshSnapshot({ myNodeNum, nodes, packetLog });
        lastFingerprintRef.current = fingerprint;
        setAutoSaveStatus({ status: 'saved', ...result });
      } catch (e) {
        setAutoSaveStatus({ status: 'error', message: e.message || 'AutoSave fehlgeschlagen' });
      }

      savingRef.current = false;
    }, 5000);

    return () => clearTimeout(timer);
  }, [enabled, myNodeNum, nodes, packetLog]);

  return autoSaveStatus;
}