// Runs snapshot-based autosave after the user enabled saving in this session.
import { useEffect, useRef, useState } from 'react';
import { saveMeshSnapshot, isSaveLocked, getLastSaveCompletedAt } from '@/lib/meshtastic/persistence.js';

const AUTOSAVE_COOLDOWN_MS = 60_000; // 1 Minute Sichtbarkeit für vorheriges Ergebnis

export function useMeshPersistence({ enabled, myNodeNum, nodes, packetLog }) {
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);
  const lastFingerprintRef = useRef('');
  const savingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !myNodeNum) return;

    const fingerprint = `${myNodeNum}:${nodes.length}:${packetLog.length}:${packetLog.at(-1)?.seq || 0}:${packetLog.at(-1)?.time || 0}`;
    if (fingerprint === lastFingerprintRef.current || savingRef.current) return;

    // Cooldown nach letzter abgeschlossener Sicherung respektieren
    const sinceLastSave = Date.now() - getLastSaveCompletedAt();
    const delay = Math.max(5000, AUTOSAVE_COOLDOWN_MS - sinceLastSave);

    const timer = setTimeout(async () => {
      // Falls währenddessen ein manueller Save (oder anderer Flush) läuft: nicht starten,
      // beim nächsten Render-Tick versucht der Hook es erneut.
      if (isSaveLocked() || savingRef.current) return;
      // Cooldown erneut prüfen, falls inzwischen gespeichert wurde
      if (Date.now() - getLastSaveCompletedAt() < AUTOSAVE_COOLDOWN_MS) return;

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
    }, delay);

    return () => clearTimeout(timer);
  }, [enabled, myNodeNum, nodes, packetLog]);

  return autoSaveStatus;
}