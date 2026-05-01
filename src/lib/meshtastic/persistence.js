// Persistence layer for Meshtastic data
// Writes incoming packets to MeshPacket entity and node states to MeshNode entity.
// All writes are batched & throttled to avoid spamming the DB.

import { base44 } from '@/api/base44Client';

const PACKET_FLUSH_MS = 1500;
const NODE_FLUSH_MS = 5000;

let packetBuffer = [];
let nodeBuffer = new Map(); // key: my_node_num + ':' + num -> latest payload
let packetTimer = null;
let nodeTimer = null;

async function flushPackets() {
  packetTimer = null;
  if (packetBuffer.length === 0) return;
  const batch = packetBuffer;
  packetBuffer = [];
  try {
    await base44.entities.MeshPacket.bulkCreate(batch);
  } catch (e) {
    console.warn('MeshPacket bulkCreate failed', e);
  }
}

async function flushNodes() {
  nodeTimer = null;
  if (nodeBuffer.size === 0) return;
  const entries = Array.from(nodeBuffer.values());
  nodeBuffer = new Map();
  for (const data of entries) {
    try {
      const existing = await base44.entities.MeshNode.filter({
        my_node_num: data.my_node_num,
        num: data.num,
      });
      if (existing.length > 0) {
        await base44.entities.MeshNode.update(existing[0].id, data);
      } else {
        await base44.entities.MeshNode.create(data);
      }
    } catch (e) {
      console.warn('MeshNode upsert failed', e);
    }
  }
}

function scheduleFlush() {
  if (!packetTimer) packetTimer = setTimeout(flushPackets, PACKET_FLUSH_MS);
  if (!nodeTimer) nodeTimer = setTimeout(flushNodes, NODE_FLUSH_MS);
}

function nodeIdString(num) {
  if (typeof num !== 'number') return null;
  return '!' + num.toString(16).padStart(8, '0');
}

export function createPersistFn(getMyNodeNum, getMyNode) {
  return function persist(logEntry, parsed) {
    const myNodeNum = getMyNodeNum();
    if (!myNodeNum) return; // wait until we know our own device
    const myNodeId = nodeIdString(myNodeNum);

    // ---- 1) Save raw packet ----
    const decoded = parsed?.packet?.decoded;
    const packetRow = {
      my_node_num: myNodeNum,
      my_node_id: myNodeId,
      seq: logEntry.seq,
      time: logEntry.time,
      type: logEntry.type || 'unknown',
      from_num: logEntry.from ?? null,
      to_num: logEntry.to ?? null,
      portnum: decoded?.portnumName || null,
      rx_snr: parsed?.packet?.rxSnr ?? null,
      rx_rssi: parsed?.packet?.rxRssi ?? null,
      hop_limit: parsed?.packet?.hopLimit ?? null,
      channel: parsed?.packet?.channel ?? null,
      text: decoded?.text || null,
      raw: parsed,
    };
    packetBuffer.push(packetRow);

    // ---- 2) Update MeshNode state ----
    const updateNode = (num, patch) => {
      if (typeof num !== 'number') return;
      const key = myNodeNum + ':' + num;
      const prev = nodeBuffer.get(key) || { my_node_num: myNodeNum, my_node_id: myNodeId, num, node_id: nodeIdString(num) };
      nodeBuffer.set(key, { ...prev, ...patch });
    };

    if (parsed.type === 'nodeInfo' && parsed.nodeInfo) {
      const ni = parsed.nodeInfo;
      updateNode(ni.num, {
        long_name: ni.user?.longName || null,
        short_name: ni.user?.shortName || null,
        hw_model: ni.user?.hwModel ?? null,
        is_licensed: ni.user?.isLicensed ?? null,
        channel: ni.channel ?? null,
        hops_away: ni.hopsAway ?? null,
        via_mqtt: ni.viaMqtt ?? null,
        snr: ni.snr ?? null,
        last_heard: ni.lastHeard ?? null,
        user: ni.user || null,
        position: ni.position || null,
        device_metrics: ni.deviceMetrics || null,
      });
    } else if (parsed.type === 'packet' && parsed.packet?.decoded) {
      const p = parsed.packet;
      const d = p.decoded;
      const patch = {
        snr: p.rxSnr ?? null,
        rssi: p.rxRssi ?? null,
        last_heard: p.rxTime || Math.floor(Date.now() / 1000),
        channel: p.channel ?? null,
        hops_away: p.hopLimit !== undefined ? null : null, // not reliable here
      };
      if (d.user) {
        patch.user = d.user;
        patch.long_name = d.user.longName || null;
        patch.short_name = d.user.shortName || null;
        patch.hw_model = d.user.hwModel ?? null;
      }
      if (d.position) patch.position = d.position;
      if (d.telemetry?.deviceMetrics) patch.device_metrics = d.telemetry.deviceMetrics;
      if (d.telemetry?.environmentMetrics) patch.environment_metrics = d.telemetry.environmentMetrics;
      updateNode(p.from, patch);
    }

    scheduleFlush();
  };
}

export async function flushNow() {
  await Promise.all([flushPackets(), flushNodes()]);
}