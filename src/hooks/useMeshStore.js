import { useState, useEffect } from 'react';
import { meshStore } from '@/lib/meshtastic/meshStore.js';

export function useMeshStore() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsub = meshStore.subscribe(() => forceUpdate(n => n + 1));
    return unsub;
  }, []);

  return {
    connected: meshStore.connected,
    nodes: meshStore.getNodes(),
    messages: meshStore.messages,
    myNodeNum: meshStore.myNodeNum,
    myNode: meshStore.getMyNode(),
    metadata: meshStore.metadata,
    packetLog: meshStore.packetLog,
    sendLog: meshStore.sendLog,
    serialLog: meshStore.serialLog,
    isSupported: meshStore.isSupported(),
    connect: () => meshStore.connect(),
    disconnect: () => meshStore.disconnect(),
  };
}