// Persistence layer for Meshtastic data
// Writes incoming packets to MeshPacket entity and node states to MeshNode entity.
// All writes are batched & throttled to avoid spamming the DB.

import { base44 } from '@/api/base44Client';

const PACKET_FLUSH_MS = 1500;
const NODE_FLUSH_MS = 5000;
const SAVE_BATCH_SIZE = 100;
const SAVE_BATCH_PAUSE_MS = 2000;

let packetBuffer = [];
let nodeBuffer = new Map(); // key: my_node_num + ':' + num -> latest payload
let packetTimer = null;
let nodeTimer = null;
let autoSaveCallback = null;

async function flushPackets() {
  packetTimer = null;
  if (packetBuffer.length === 0) return;
  const batch = packetBuffer;
  packetBuffer = [];
  try {
    autoSaveCallback?.({ status: 'saving', packets: batch.length, createdNodes: [], updatedNodes: [] });
    await base44.entities.MeshPacket.bulkCreate(batch);
    autoSaveCallback?.({ status: 'saved', packets: batch.length, createdNodes: [], updatedNodes: [] });
  } catch (e) {
    autoSaveCallback?.({ status: 'error', message: 'Pakete konnten nicht automatisch gespeichert werden.' });
    console.warn('MeshPacket bulkCreate failed', e);
  }
}

async function flushNodes() {
  nodeTimer = null;
  if (nodeBuffer.size === 0) return;
  const entries = Array.from(nodeBuffer.values());
  const createdNodes = [];
  const updatedNodes = [];
  nodeBuffer = new Map();
  autoSaveCallback?.({ status: 'saving', packets: 0, createdNodes: [], updatedNodes: [] });
  for (const data of entries) {
    try {
      const existing = await base44.entities.MeshNode.filter({
        my_node_num: data.my_node_num,
        num: data.num,
      });
      if (existing.length > 0) {
        const latest = newestRecord(existing);
        await base44.entities.MeshNode.update(latest.id, data);
        if (existing.length > 1) await deleteDuplicateRecords(base44.entities.MeshNode, existing, latest.id);
        updatedNodes.push(data);
      } else {
        await base44.entities.MeshNode.create(data);
        createdNodes.push(data);
      }
    } catch (e) {
      autoSaveCallback?.({ status: 'error', message: 'Nodes konnten nicht automatisch gespeichert werden.' });
      console.warn('MeshNode upsert failed', e);
    }
  }
  autoSaveCallback?.({ status: 'saved', packets: 0, createdNodes, updatedNodes });
}

function scheduleFlush() {
  if (!packetTimer) packetTimer = setTimeout(flushPackets, PACKET_FLUSH_MS);
  if (!nodeTimer) nodeTimer = setTimeout(flushNodes, NODE_FLUSH_MS);
}

function nodeIdString(num) {
  if (typeof num !== 'number') return null;
  return '!' + num.toString(16).padStart(8, '0');
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return null;
}

function newestRecord(records) {
  return [...records].sort((a, b) => String(b.updated_date || '').localeCompare(String(a.updated_date || '')))[0];
}

async function deleteDuplicateRecords(entity, records, keepId) {
  const duplicates = records.filter(record => record.id !== keepId);
  for (const duplicate of duplicates) {
    await entity.delete(duplicate.id);
  }
}

export function createPersistFn(getMyNodeNum, getMyNode, onAutoSave) {
  autoSaveCallback = onAutoSave;
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
      channel: parsed?.packet?.channelInfo?.index ?? parsed?.packet?.channel ?? logEntry.channel ?? null,
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
        is_licensed: normalizeBoolean(ni.user?.isLicensed),
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

function normalizeNodeForSave(node, myNodeNum, myNodeId) {
  return {
    my_node_num: myNodeNum,
    my_node_id: myNodeId,
    num: node.num,
    node_id: nodeIdString(node.num),
    long_name: node.user?.longName || null,
    short_name: node.user?.shortName || null,
    hw_model: node.user?.hwModel ?? null,
    is_licensed: normalizeBoolean(node.user?.isLicensed),
    channel: node.channel ?? null,
    hops_away: node.hopsAway ?? null,
    via_mqtt: node.viaMqtt ?? null,
    snr: node.snr ?? null,
    rssi: node.rssi ?? null,
    last_heard: node.lastHeard ?? null,
    user: node.user || null,
    position: node.position || null,
    device_metrics: node.deviceMetrics || null,
    environment_metrics: node.environmentMetrics || null,
  };
}

function normalizePacketForSave(logEntry, myNodeNum, myNodeId) {
  const parsed = logEntry.raw;
  const decoded = parsed?.packet?.decoded;
  return {
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
    channel: parsed?.packet?.channel ?? logEntry.channel ?? null,
    text: decoded?.text || null,
    raw: parsed,
  };
}

function hasNodeChanged(existing, next) {
  return [
    'my_node_id', 'node_id', 'long_name', 'short_name', 'hw_model', 'is_licensed',
    'channel', 'hops_away', 'via_mqtt', 'snr', 'rssi', 'last_heard',
    'user', 'position', 'device_metrics', 'environment_metrics'
  ].some(key => JSON.stringify(existing[key] ?? null) !== JSON.stringify(next[key] ?? null));
}

function getNodeChangeReasons(existing, next) {
  const changed = (key) => JSON.stringify(existing[key] ?? null) !== JSON.stringify(next[key] ?? null);
  const reasons = [];

  if (changed('position')) reasons.push('Entfernung');
  if (changed('last_heard')) reasons.push('aktiv');
  if (changed('environment_metrics')) reasons.push('Umwelt');
  if (changed('long_name') || changed('short_name') || changed('user')) reasons.push('Name');
  if (changed('channel') || changed('hops_away') || changed('via_mqtt')) reasons.push('Route');

  return reasons;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function bulkCreateInBatches(entity, rows, onProgress, getProgressText) {
  let saved = 0;
  const totalBatches = Math.ceil(rows.length / SAVE_BATCH_SIZE);

  for (let i = 0; i < rows.length; i += SAVE_BATCH_SIZE) {
    const batch = rows.slice(i, i + SAVE_BATCH_SIZE);
    const batchNumber = Math.floor(i / SAVE_BATCH_SIZE) + 1;
    onProgress?.(getProgressText(saved, rows.length, batchNumber, totalBatches));
    await entity.bulkCreate(batch);
    saved += batch.length;
    onProgress?.(getProgressText(saved, rows.length, batchNumber, totalBatches));
    if (batchNumber < totalBatches) await wait(SAVE_BATCH_PAUSE_MS);
  }

  return saved;
}

export async function saveMeshSnapshot({ myNodeNum, nodes, packetLog, onProgress }) {
  if (!myNodeNum) throw new Error('Eigenes Gerät wurde noch nicht erkannt.');

  const myNodeId = nodeIdString(myNodeNum);
  const nodeRows = nodes
    .filter(node => typeof node.num === 'number')
    .map(node => normalizeNodeForSave(node, myNodeNum, myNodeId));
  const allPacketRows = [...packetLog].map(packet => normalizePacketForSave(packet, myNodeNum, myNodeId));

  const createdNodes = [];
  const updatedNodes = [];
  const [existingNodes, existingPackets] = await Promise.all([
    base44.entities.MeshNode.filter({ my_node_num: myNodeNum }, '-last_heard', 1000),
    base44.entities.MeshPacket.filter({ my_node_num: myNodeNum }, '-time', 1000),
  ]);
  const existingByNum = new Map();
  const existingGroups = new Map();
  for (const node of existingNodes) {
    if (!existingGroups.has(node.num)) existingGroups.set(node.num, []);
    existingGroups.get(node.num).push(node);
  }
  for (const [num, records] of existingGroups.entries()) {
    const latest = newestRecord(records);
    existingByNum.set(num, latest);
    if (records.length > 1) await deleteDuplicateRecords(base44.entities.MeshNode, records, latest.id);
  }
  const existingPacketKeys = new Set(existingPackets.map(packet => `${packet.seq}:${packet.time}:${packet.type}`));
  const packetRows = allPacketRows.filter(packet => !existingPacketKeys.has(`${packet.seq}:${packet.time}:${packet.type}`));

  onProgress?.({ text: `Prüfe ${nodeRows.length} Nodes…`, current: 0, total: nodeRows.length, created: 0, updated: 0 });
  for (const [index, nodeRow] of nodeRows.entries()) {
    const existing = existingByNum.get(nodeRow.num);

    if (existing) {
      if (hasNodeChanged(existing, nodeRow)) {
        await base44.entities.MeshNode.update(existing.id, nodeRow);
        updatedNodes.push({ ...nodeRow, change_reasons: getNodeChangeReasons(existing, nodeRow) });
        if (updatedNodes.length % 20 === 0) await wait(SAVE_BATCH_PAUSE_MS);
      }
    } else {
      createdNodes.push(nodeRow);
    }

    onProgress?.({
      text: `${index + 1}/${nodeRows.length} Nodes gesichert · ${createdNodes.length} neu · ${updatedNodes.length} updated`,
      current: index + 1,
      total: nodeRows.length,
      created: createdNodes.length,
      updated: updatedNodes.length,
    });
  }

  let savedNodeCreates = 0;
  if (createdNodes.length > 0) {
    savedNodeCreates = await bulkCreateInBatches(
      base44.entities.MeshNode,
      createdNodes,
      onProgress,
      (saved, total, batchNumber, totalBatches) => ({
        text: `Speichere neue Nodes Block ${batchNumber}/${totalBatches} · ${saved}/${total}…`,
        current: nodeRows.length,
        total: nodeRows.length,
        created: saved,
        updated: updatedNodes.length,
      })
    );
  }

  const savedPackets = packetRows.length > 0
    ? await bulkCreateInBatches(
        base44.entities.MeshPacket,
        packetRows,
        onProgress,
        (saved, total, batchNumber, totalBatches) => ({
          text: `Übertrage Pakete Block ${batchNumber}/${totalBatches} · ${saved}/${total}…`,
          current: nodeRows.length,
          total: nodeRows.length,
          created: savedNodeCreates,
          updated: updatedNodes.length,
        })
      )
    : 0;

  return {
    createdNodes,
    updatedNodes,
    savedPackets,
    totalPackets: packetRows.length,
  };
}