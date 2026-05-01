// Loads historical Meshtastic data from the DB for the current user, filtered by my_node_num.
import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

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
      // Pull recent nodes; group by my_node_num
      const rows = await base44.entities.MeshNode.list('-updated_date', 10000);
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
            last_seen: r.updated_date,
          });
        } else if (r.num === r.my_node_num) {
          const e = map.get(r.my_node_num);
          if (!e.long_name && r.long_name) e.long_name = r.long_name;
          if (!e.short_name && r.short_name) e.short_name = r.short_name;
        }
      }
      setDevices(Array.from(map.values()).sort((a, b) =>
        (b.last_seen || '').localeCompare(a.last_seen || '')
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
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled || !myNodeNum) {
      setNodes([]);
      setPackets([]);
      setMessages([]);
      return;
    }
    setLoading(true);
    try {
      const [nodeRowsRaw, packetRows] = await Promise.all([
        base44.entities.MeshNode.filter({ my_node_num: myNodeNum }, '-last_heard', 10000),
        base44.entities.MeshPacket.filter({ my_node_num: myNodeNum }, '-time', 200),
      ]);

      // Deduplicate by `num`: keep the most recently heard row per remote node
      const byNum = new Map();
      for (const r of nodeRowsRaw) {
        const existing = byNum.get(r.num);
        if (!existing || (r.last_heard || 0) > (existing.last_heard || 0)) {
          byNum.set(r.num, r);
        }
      }
      const nodeRows = Array.from(byNum.values());

      // Map MeshNode rows -> shape used by NodeCard / NodeMap / NodeDetail
      const mapped = nodeRows.map(r => ({
        num: r.num,
        user: r.user || { longName: r.long_name, shortName: r.short_name, id: r.node_id, hwModel: r.hw_model, isLicensed: r.is_licensed },
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
      }));
      setPackets(mappedPackets);

      const msgs = packetRows
        .filter(r => r.text)
        .map(r => ({
          id: r.seq,
          from: r.from_num,
          to: r.to_num,
          text: r.text,
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

  return { nodes, packets, messages, loading, reload };
}