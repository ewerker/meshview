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

// Buffer for packets that arrive before we know our own device ID
let preAuthBuffer = [];

// Local cache: my_node_num + ':' + num -> existing MeshNode entity id.
// Avoids one filter() call per node per flush (was ~200 reads each cycle).
const nodeIdCache = new Map();
let nodeCacheLoadedFor = null; // my_node_num the cache was loaded for

// --- Progress tracking (non-blocking UI indicator) ---
let inFlightPackets = 0;
let inFlightNodes = 0;
let currentActivity = null; // human-readable description of what's currently being saved
const progressListeners = new Set();
function snapshot() {
  return {
    pendingPackets: packetBuffer.length,
    pendingNodes: nodeBuffer.size,
    inFlightPackets,
    inFlightNodes,
    activity: currentActivity,
  };
}
function emitProgress() {
  const snap = snapshot();
  progressListeners.forEach(l => { try { l(snap); } catch {} });
}
function setActivity(text) {
  currentActivity = text;
  emitProgress();
}
export function subscribePersistenceProgress(listener) {
  progressListeners.add(listener);
  try { listener(snapshot()); } catch {}
  return () => progressListeners.delete(listener);
}

async function flushPackets() {
  packetTimer = null;
  if (flushPacketsRunning || packetBuffer.length === 0) return;
  flushPacketsRunning = true;
  // Drain everything currently in the buffer in chunks (bulkCreate has practical limits)
  while (packetBuffer.length > 0) {
    const batch = packetBuffer.splice(0, 50);
    inFlightPackets += batch.length;
    setActivity(`📦 Pakete schreiben (${batch.length})`);
    try {
      await base44.entities.MeshPacket.bulkCreate(batch);
      if (packetBuffer.length > 0) await new Promise(r => setTimeout(r, 400));
    } catch (e) {
      console.warn('MeshPacket bulkCreate failed', e);
    } finally {
      inFlightPackets -= batch.length;
      emitProgress();
    }
  }
  flushPacketsRunning = false;
  if (inFlightNodes === 0 && nodeBuffer.size === 0) setActivity(null);
}

async function ensureNodeCache(myNodeNum) {
  if (nodeCacheLoadedFor === myNodeNum) return;
  nodeIdCache.clear();
  try {
    setActivity('🔄 Lade bestehende Nodes…');
    // Load ALL existing nodes for this device using pagination to bypass backend limits
    let existing = [];
    let skip = 0;
    const pageSize = 100;
    while (true) {
      const batch = await base44.entities.MeshNode.filter({ my_node_num: myNodeNum }, '-updated_date', pageSize, skip);
      if (!batch || batch.length === 0) break;
      existing = existing.concat(batch);
      if (batch.length < pageSize) break;
      skip += pageSize;
    }
    // Group by `num` so we can detect & clean up legacy duplicates from earlier sessions
    const groups = new Map();
    for (const n of existing) {
      if (!groups.has(n.num)) groups.set(n.num, []);
      groups.get(n.num).push(n);
    }
    const dupesToDelete = [];
    for (const [num, rows] of groups.entries()) {
      // newest first (already sorted by -updated_date, but be safe)
      rows.sort((a, b) => (b.updated_date || '').localeCompare(a.updated_date || ''));
      const keep = rows[0];
      nodeIdCache.set(myNodeNum + ':' + num, keep.id);
      for (let i = 1; i < rows.length; i++) dupesToDelete.push(rows[i].id);
    }
    nodeCacheLoadedFor = myNodeNum;
    // Best-effort cleanup of legacy duplicates so the DB shows the real node count
    if (dupesToDelete.length > 0) {
      setActivity(`🧹 Bereinige ${dupesToDelete.length} doppelte Node-Einträge…`);
      console.info(`Cleaning up ${dupesToDelete.length} duplicate MeshNode rows`);
      for (const id of dupesToDelete) {
        try { await base44.entities.MeshNode.delete(id); } catch (e) { /* ignore */ }
      }
    }
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
      const names = toCreate.slice(0, 3).map(c => c.data.long_name || c.data.short_name || ('!' + c.data.num?.toString(16))).join(', ');
      const updatesStr = toUpdate.length > 0 ? ` (+${toUpdate.length} Updates)` : '';
      setActivity(`🆕 ${toCreate.length} neue Node(s)${updatesStr}: ${names}${toCreate.length > 3 ? '…' : ''}`);
      
      // Batch bulkCreate to prevent "Payload Too Large" errors and backend rate limits
      for (let i = 0; i < toCreate.length; i += 10) {
        const batch = toCreate.slice(i, i + 10);
        try {
          const created = await base44.entities.MeshNode.bulkCreate(batch.map(c => c.data));
          if (Array.isArray(created)) {
            created.forEach((row, idx) => {
              if (row?.id) nodeIdCache.set(batch[idx].key, row.id);
            });
          }
        } catch (e) {
          console.warn('MeshNode bulkCreate failed for batch', e);
          nodeCacheLoadedFor = null; // Reset cache so next round re-syncs
        }
        inFlightNodes -= batch.length;
        emitProgress();
        if (i + 10 < toCreate.length) {
          await new Promise(r => setTimeout(r, 600)); // 600ms delay between batches
        }
      }
    }

    // Updates must still be one-by-one (no bulkUpdate available), but they're fast
    let updatedCount = 0;
    for (const u of toUpdate) {
      updatedCount++;
      const name = u.data.long_name || u.data.short_name || ('!' + u.data.num?.toString(16));
      setActivity(`✏️ Node ${updatedCount}/${toUpdate.length}: ${name}`);
      try {
        await base44.entities.MeshNode.update(u.id, u.data);
        await new Promise(r => setTimeout(r, 100)); // kleine Pause, um Spam-Filter zu vermeiden
      } catch (e) {
        console.warn('MeshNode update failed', e);
      } finally {
        inFlightNodes -= 1;
        emitProgress();
      }
    }
  }

  flushNodesRunning = false;
  if (inFlightPackets === 0 && packetBuffer.length === 0) setActivity(null);
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
    
    // If we don't know our own device ID yet, queue packets up.
    // They will be flushed as soon as the first packet with myNodeNum arrives.
    if (!myNodeNum) {
      preAuthBuffer.push({ logEntry, parsed });
      return;
    }

    // If this is the first time we have myNodeNum, flush the queued packets first
    if (preAuthBuffer.length > 0) {
      const queued = [...preAuthBuffer];
      preAuthBuffer = [];
      queued.forEach(q => persist(q.logEntry, q.parsed));
    }

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
  preAuthBuffer = [];
}

export function isPersistenceBusy() {
  return (
    packetBuffer.length > 0 ||
    nodeBuffer.size > 0 ||
    inFlightPackets > 0 ||
    inFlightNodes > 0
  );
}