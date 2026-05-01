// Activates DB persistence for incoming Meshtastic packets when a user is logged in.
import { useEffect, useState } from 'react';
import { meshStore } from '@/lib/meshtastic/meshStore.js';
import { createPersistFn, flushNow } from '@/lib/meshtastic/persistence.js';
import { useAuth } from '@/lib/AuthContext';

export function useMeshPersistence() {
  const { isAuthenticated } = useAuth();
  const [autoSaveStatus, setAutoSaveStatus] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      meshStore.setPersistFn(null);
      return;
    }

    meshStore.setPersistFn(createPersistFn(
      () => meshStore.myNodeNum,
      () => meshStore.getMyNode(),
      setAutoSaveStatus
    ));

    return () => {
      flushNow();
      meshStore.setPersistFn(null);
    };
  }, [isAuthenticated]);

  return autoSaveStatus;
}