// Activates DB persistence for incoming Meshtastic packets when a user is logged in.
import { useEffect } from 'react';
import { meshStore } from '@/lib/meshtastic/meshStore.js';
import { createPersistFn, flushNow } from '@/lib/meshtastic/persistence.js';
import { useAuth } from '@/lib/AuthContext';

export function useMeshPersistence() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      meshStore.setPersistFn(null);
      return;
    }
    const fn = createPersistFn(
      () => meshStore.myNodeNum,
      () => meshStore.getMyNode(),
    );
    meshStore.setPersistFn(fn);
    return () => {
      meshStore.setPersistFn(null);
      flushNow().catch(() => {});
    };
  }, [isAuthenticated]);
}