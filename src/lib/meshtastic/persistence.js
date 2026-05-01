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
let flushNodesRunning = false;
let flushPacketsRunning = false;

// Local cache: my_node_num + ':' + num -> existing MeshNode entity id.
// Avoids one filter() call per node per flush (was ~200 reads each cycle).
const nodeIdCache = new Map();
let nodeCacheLoadedFor = null; // my_node_num the cache was loaded for

// --- Progress tracking (non-blocking UI indicator) ---
let inFlightPackets = 0;
let inFlightNodes = 0;
const progressListeners = new Set();
function emitProgress() {
  const snap = {
    pendingPackets: packetBuffer.length,
    pendingNodes: nodeBuffer.size,
    inFlightPackets,
    inFlightNodes,
  };
  progressListeners.forEach(l => { try { l(snap); } catch {} });
}
export function subscribePersistenceProgress(listener) {
  progressListeners.add(listener);
  // Immediately emit current state so subscriber gets the initial snapshot
  try {
    listener({
      pendingPackets: packetBuffer.length,
      pendingNodes: nodeBuffer.size,
      inFlightPackets,
      inFlightNodes,
    });
  } catch {}
  return () => progressListeners.delete(listener);
}

async function flushPackets() {
  packetTimer = null;
  if (flushPacketsRunning || packetBuffer.length === 0) return;
  flushPacketsRunning = true;
  // Drain everything currently in the buffer in chunks (bulkCreate has practical limits)
  while (packetBuffer.length > 0) {
    const batch = packetBuffer.splice(0, 100);
    inFlightPackets += batch.length;
    emitProgress();
    try {
      await base44.entities.MeshPacket.bulkCreate(batch);
    } catch (e) {
      console.warn('MeshPacket bulkCreate failed', e);
    } finally {
      inFlightPackets -= batch.length;
      emitProgress();
    }
  }
  flushPacketsRunning = false;
}

async function ensureNodeCache(myNodeNum) {
  if (nodeCacheLoadedFor === myNodeNum) return;
  nodeIdCache.clear();
  try {
    const existing = await base44.entities.MeshNode.filter({ my_node_num: myNodeNum });
    for (const n of existing) {
      nodeIdCache.set(myNodeNum + ':' + n.num, n.id);
    }
    nodeCacheLoadedFor = myNodeNum;
  } catch (e) {
    console.warn('MeshNode cache load failed', e);
  }
}

async function flushNodes() {
  nodeTimer = null;
  if (flushNodesRunning || nodeBuffer.size === 0) return;
  flushNodesRunning = true;

  // Drain in a loop so newly arrived nodes during writes are handled too
  while (nodeBuffer.size > 0) {
    const entries = Array.from(nodeBuffer.entries());
    nodeBuffer = new Map();

    // Make sure we have an up-to-date id-cache for the current device
    const firstMyNum = entries[0][1].my_node_num;
    await ensureNodeCache(firstMyNum);

    inFlightNodes += entries.length;
    emitProgress();

    // Split into existing (update) and new (create)
    const toCreate = [];
    const toUpdate = [];
    for (const [key, data] of entries) {
      const id = nodeIdCache.get(key);
      if (id) toUpdate.push({ id, data });
      else toCreate.push({ key, data });
    }

    // Bulk-create new nodes, then update local cache with returned ids
    if (toCreate.length > 0) {
      try {
        const created = await base44.entities.MeshNode.bulkCreate(toCreate.map(c => c.data));
        // Returned items may or may not include ids; reload cache to be safe
        if (Array.isArray(created)) {
          created.forEach((row, i) => {
            if (row?.id) nodeIdCache.set(toCreate[i].key, row.id);
          });
        }
      } catch (e) {
        console.warn('MeshNode bulkCreate failed', e);
        // Reset cache so next round re-syncs
        nodeCacheLoadedFor = null;
      } finally {
        inFlightNodes -= toCreate.length;
        emitProgress();
      }
    }

    // Updates must still be one-by-one (no bulkUpdate available), but they're fast
    for (const u of toUpdate) {
      try {
        await base44.entities.MeshNode.update(u.id, u.data);
      } catch (e) {
        console.warn('MeshNode update failed', e);
      } finally {
        inFlightNodes -= 1;
        emitProgress();
      }
    }
  }

  flushNodesRunning = false;
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
    emitProgress();

    // ---- 2) Update MeshNode state ----
    const updateNode = (num, patch) => {
      if (typeof num !== 'number') return;
      const key = myNodeNum + ':' + num;
      const prev = nodeBuffer.get(key) || { my_node_num: myNodeNum, my_node_id: myNodeId, num, node_id: nodeIdString(num) };
      nodeBuffer.set(key, { ...prev, ...patch });
      emitProgress();
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

export function resetPersistenceCache() {
  nodeIdCache.clear();
  nodeCacheLoadedFor = null;
}

export function isPersistenceBusy() {
  return (
    packetBuffer.length > 0 ||
    nodeBuffer.size > 0 ||
    inFlightPackets > 0 ||
    inFlightNodes > 0
  );
}