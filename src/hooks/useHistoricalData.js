// Loads historical Meshtastic data from the DB for the current user, filtered by my_node_num.
import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

function uniqueLatestNodes(rows) {
  const byNum = new Map();
  for (const row of rows) {
    if (typeof row.num !== 'number') continue;
    const existing = byNum.get(row.num);
    const rowTime = row.updated_date || row.last_heard || '';
    const existingTime = existing?.updated_date || existing?.last_heard || '';
    if (!existing || String(rowTime).localeCompare(String(existingTime)) > 0) {
      byNum.set(row.num, row);
    }
  }
  return Array.from(byNum.values());
}

// Lists all "my devices" (distinct my_node_num) the user has previously used.
export function useMyDevices(isAuthenticated) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!isAuthenticated) {
      setDevices([]);
      return;
    }
    setLoading(true);
    try {
      // Pull enough rows to include complete saved node lists; group by my_node_num
      const [rows, lastPackets, lastPacketsByUpdate] = await Promise.all([
        base44.entities.MeshNode.list('-updated_date', 1000),
        base44.entities.MeshPacket.list('-time', 500),
        base44.entities.MeshPacket.list('-updated_date', 200),
      ]);
      const lastPacketByDevice = new Map();
      for (const p of lastPackets) {
        if (!p.my_node_num) continue;
        if (!lastPacketByDevice.has(p.my_node_num)) {
          lastPacketByDevice.set(p.my_node_num, p.time);
        }
      }
      // Jüngste DB-Schreibzeit pro Gerät — egal ob Node- oder Paket-Schreibvorgang
      const lastPacketSaveByDevice = new Map();
      for (const p of lastPacketsByUpdate) {
        if (!p.my_node_num) continue;
        if (!lastPacketSaveByDevice.has(p.my_node_num)) {
          lastPacketSaveByDevice.set(p.my_node_num, p.updated_date);
        }
      }
      const newer = (a, b) => (String(a || '').localeCompare(String(b || '')) >= 0 ? a : b);
      const map = new Map();
      for (const r of rows) {
        if (!r.my_node_num) continue;
        if (!map.has(r.my_node_num)) {
          map.set(r.my_node_num, {
            my_node_num: r.my_node_num,
            my_node_id: r.my_node_id,
            // try to find the self-node (where num === my_node_num)
            long_name: r.num === r.my_node_num ? r.long_name : null,
            short_name: r.num === r.my_node_num ? r.short_name : null,
            last_save: newer(r.updated_date, lastPacketSaveByDevice.get(r.my_node_num)),
            last_packet_time: lastPacketByDevice.get(r.my_node_num) || null,
          });
        } else if (r.num === r.my_node_num) {
          const e = map.get(r.my_node_num);
          if (!e.long_name && r.long_name) e.long_name = r.long_name;
          if (!e.short_name && r.short_name) e.short_name = r.short_name;
        }
      }
      // Geräte berücksichtigen, die nur Pakete (keine MeshNode-Änderung) gespeichert haben
      for (const [deviceNum, savedAt] of lastPacketSaveByDevice.entries()) {
        if (!map.has(deviceNum)) {
          map.set(deviceNum, {
            my_node_num: deviceNum,
            my_node_id: null,
            long_name: null,
            short_name: null,
            last_save: savedAt,
            last_packet_time: lastPacketByDevice.get(deviceNum) || null,
          });
        }
      }
      setDevices(Array.from(map.values()).sort((a, b) =>
        (b.last_save || '').localeCompare(a.last_save || '')
      ));
    } catch (e) {
      console.error('Failed to load devices', e);
      setDevices([]);
    }
    setLoading(false);
  }, [isAuthenticated]);

  useEffect(() => { reload(); }, [reload]);

  return { devices, loading, reload };
}

// Loads nodes + recent packets for a specific my_node_num.
export function useHistoricalData(myNodeNum, enabled) {
  const [nodes, setNodes] = useState([]);
  const [packets, setPackets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [deviceConfigs, setDeviceConfigs] = useState([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled || !myNodeNum) {
      setNodes([]);
      setPackets([]);
      setMessages([]);
      setDeviceConfigs([]);
      return;
    }
    setLoading(true);
    try {
      const [nodeRows, packetRows, configRows] = await Promise.all([
        base44.entities.MeshNode.filter({ my_node_num: myNodeNum }, '-last_heard', 1000),
        base44.entities.MeshPacket.filter({ my_node_num: myNodeNum }, '-time', 50),
        base44.entities.MeshDeviceConfig.filter({ my_node_num: myNodeNum }, '-received_at', 200),
      ]);
      setDeviceConfigs(configRows);

      // Map MeshNode rows -> shape used by NodeCard / NodeMap / NodeDetail
      const mapped = uniqueLatestNodes(nodeRows).map(r => ({ 
        num: r.num,
        user: { ...(r.user || {}), longName: r.user?.longName || r.long_name, shortName: r.user?.shortName || r.short_name, id: r.node_id, hwModel: r.user?.hwModel ?? r.hw_model, isLicensed: r.user?.isLicensed ?? r.is_licensed },
        position: r.position,
        deviceMetrics: r.device_metrics,
        environmentMetrics: r.environment_metrics,
        snr: r.snr,
        rssi: r.rssi,
        lastHeard: r.last_heard,
        channel: r.channel,
        hopsAway: r.hops_away,
        viaMqtt: r.via_mqtt,
      }));
      setNodes(mapped);

      // Map MeshPacket rows -> shape used by ReceivedPacketsTable
      const mappedPackets = packetRows.map(r => ({
        seq: r.seq || r.id,
        time: r.time,
        type: r.type,
        from: r.from_num,
        to: r.to_num,
        raw: r.raw,
        channel: r.channel ?? r.raw?.packet?.channelInfo?.index ?? r.raw?.packet?.channel ?? 0,
      }));
      setPackets(mappedPackets);

      const msgs = packetRows
        .filter(r => r.text)
        .map(r => ({
          id: r.seq,
          from: r.from_num,
          to: r.to_num,
          text: r.text,
          channel: r.channel ?? r.raw?.packet?.channelInfo?.index ?? r.raw?.packet?.channel ?? 0,
          time: new Date(r.time),
          rxSnr: r.rx_snr,
          rxRssi: r.rx_rssi,
        }));
      setMessages(msgs);
    } catch (e) {
      console.error('Failed to load historical data', e);
    }
    setLoading(false);
  }, [enabled, myNodeNum]);

  useEffect(() => { reload(); }, [reload]);

  return { nodes, packets, messages, deviceConfigs, loading, reload };
}