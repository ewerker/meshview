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
    deviceConfigs: meshStore.deviceConfigs,
    configSaveStatus: meshStore.configSaveStatus,
    isLoading: meshStore.isLoading,
    isSupported: meshStore.isSupported(),
    connect: () => meshStore.connect(),
    requestDeviceConfig: () => meshStore.requestDeviceConfig(),
    sendChannelMessage: (text, channelIndex) => meshStore.sendChannelMessage(text, channelIndex),
    disconnect: () => meshStore.disconnect(),
  };
}