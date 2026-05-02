// Central state store for Meshtastic data
import { base44 } from '@/api/base44Client';
import { MeshtasticSerial } from './serialConnection.js';
import { parseFromRadio, parseData } from './protobufParser.js';
import { decryptMeshtasticPayload, getChannelCandidates, resolvePacketChannel } from './encryption.js';

class MeshStore {
  constructor() {
    this.serial = new MeshtasticSerial();
    this.nodes = new Map(); // nodeNum -> nodeData
    this.messages = [];
    this.myNodeNum = null;
    this.metadata = null;
    this.packets = [];
    this.listeners = new Set();
    this.connected = false;
    this.packetLog = [];
    this.packetSeq = 0;
    this.isLoading = false;
    this.persistFn = null;
    this.deviceConfigs = [];
    this.configSaveStatus = null;
    this.currentConfigId = null;
    this.outgoing = []; // [{ id, tempId, text, to, channel, kind, hopLimit, wantAck, status, sentAt, updatedAt, error, replyText, replyFrom, replyAt, ackFrom, acceptedAt }]
    this.outgoingTimeouts = new Map(); // id -> timeoutHandle
    this.OUTGOING_ACK_TIMEOUT_MS = 60_000;
    this.OUTGOING_REPLY_WINDOW_MS = 10 * 60_000;
    this.BROADCAST_ADDR = 0xffffffff;

    this.serial.onPacket = (data) => this.handlePacket(data);
    this.serial.onConnect = () => {
      this.connected = true;
      this.notify();
    };
    this.serial.onDisconnect = () => {
      this.connected = false;
      this.notify();
    };
  }

  async handlePacket(rawBytes) {
    // Show loading indicator while actively receiving packets
    this.isLoading = true;
    
    // Auto-hide loading after 5s of inactivity
    if (this.loadingTimeout) clearTimeout(this.loadingTimeout);
    this.loadingTimeout = setTimeout(() => {
      this.isLoading = false;
      this.notify();
    }, 5000);

    const parsed = parseFromRadio(rawBytes);

    if (parsed.type === 'packet' && parsed.packet) {
      parsed.packet.channelHash = parsed.packet.channel || 0;
      parsed.packet.channelInfo = resolvePacketChannel(this.deviceConfigs, parsed.packet.channelHash);
      parsed.packet.channel = parsed.packet.channelInfo.index;
    }

    if (parsed.type === 'packet' && parsed.packet?.encrypted && !parsed.packet.decoded) {
      const candidates = parsed.packet.channelInfo?.psk
        ? [parsed.packet.channelInfo]
        : getChannelCandidates(this.deviceConfigs);

      for (const candidate of candidates) {
        try {
          const decrypted = await decryptMeshtasticPayload(parsed.packet.encrypted, candidate.psk, parsed.packet.from, parsed.packet.id);
          const decoded = decrypted ? parseData(decrypted) : null;
          if (isUsefulDecodedData(decoded)) {
            parsed.packet.decoded = decoded;
            parsed.packet.decrypted = true;
            parsed.packet.channelInfo = candidate;
            parsed.packet.channel = candidate.index;
            break;
          }
        } catch (e) {
          parsed.packet.decryptError = e.message;
        }
      }
    }

    // Log all packets - extract from/to based on type
    const logEntry = {
      seq: ++this.packetSeq,
      time: Date.now(),
      type: parsed.type,
      from: null,
      to: null,
      raw: parsed,
      rawBytes: rawBytes,
    };
    if (parsed.type === 'packet' && parsed.packet) {
      logEntry.from = parsed.packet.from;
      logEntry.to = parsed.packet.to;
      logEntry.channel = parsed.packet.channel;
      logEntry.channelHash = parsed.packet.channelHash;
    } else if (parsed.type === 'nodeInfo' && parsed.nodeInfo) {
      logEntry.from = parsed.nodeInfo.num;
    } else if (parsed.type === 'myInfo' && parsed.myInfo) {
      logEntry.from = parsed.myInfo.myNodeNum;
    }
    this.packetLog.push(logEntry);
    if (this.packetLog.length > 200) this.packetLog.shift();

    if (parsed.type === 'myInfo') {
      this.myNodeNum = parsed.myInfo.myNodeNum;
    } else if (parsed.type === 'nodeInfo') {
      const ni = parsed.nodeInfo;
      this.mergeNode(ni.num, {
        num: ni.num,
        user: ni.user,
        position: ni.position,
        snr: ni.snr,
        lastHeard: ni.lastHeard,
        deviceMetrics: ni.deviceMetrics,
        channel: ni.channel,
        hopsAway: ni.hopsAway,
        isFavorite: ni.isFavorite,
        viaMqtt: ni.viaMqtt,
      });
    } else if (parsed.type === 'packet' && parsed.packet?.decoded) {
      this.handleDecodedPacket(parsed.packet);
    } else if (parsed.type === 'metadata') {
      this.metadata = parsed.metadata;
    } else if (parsed.type === 'config' || parsed.type === 'moduleConfig' || parsed.type === 'channel') {
      this.captureDeviceConfig(parsed);
    } else if (parsed.type === 'configComplete') {
      this.currentConfigId = parsed.configCompleteId;
    } else if (parsed.type === 'queueStatus' && parsed.queueStatus) {
      // Device-side feedback: device confirms it has queued/handled this packet id
      const qs = parsed.queueStatus;
      if (qs.meshPacketId) {
        console.debug('[outgoing] queueStatus for packetId', qs.meshPacketId, qs);
        this.updateOutgoingStatus(qs.meshPacketId, 'accepted_by_device', { acceptedAt: Date.now() });
      }
    } else if (parsed.type === 'ack' && parsed.id) {
      // Top-level FromRadio.ack — protocol-level confirmation, NOT end-to-end mesh ack
      console.debug('[outgoing] top-level ack for packetId', parsed.id);
      this.updateOutgoingStatus(parsed.id, 'accepted_by_device', { acceptedAt: Date.now() });
    }

    this.notify();
  }

  handleDecodedPacket(packet) {
    const decoded = packet.decoded;
    const fromNum = packet.from;

    // ACK/NAK correlation: routing packets carry request_id of the originating packet
    if (decoded?.routing && decoded.requestId) {
      const isError = decoded.routing.errorReason && decoded.routing.errorReason !== 0;
      console.debug('[outgoing] routing', isError ? 'NAK' : 'ACK', 'for requestId', decoded.requestId, 'from', fromNum, decoded.routing);
      this.updateOutgoingStatus(decoded.requestId, isError ? 'nak' : 'ack', {
        ackFrom: fromNum,
        error: isError ? (decoded.routing.errorText || `Fehler ${decoded.routing.errorReason}`) : null,
      });
    }

    // Reply correlation: text response from the destination of one of our outgoing messages
    if (decoded?.text && fromNum && fromNum !== this.myNodeNum) {
      const now = Date.now();
      const match = [...this.outgoing].reverse().find(o =>
        o.to === fromNum && (now - o.sentAt) <= this.OUTGOING_REPLY_WINDOW_MS
      );
      if (match) {
        this.updateOutgoingStatus(match.id, match.status === 'ack' ? 'reply_received' : match.status, {
          replyText: decoded.text, replyFrom: fromNum, replyAt: now, replyReceived: true,
        });
      }
    }

    // Update node with packet info
    const existingNode = this.nodes.get(fromNum) || { num: fromNum };
    existingNode.lastHeard = packet.rxTime || Math.floor(Date.now() / 1000);
    existingNode.snr = packet.rxSnr;
    existingNode.rssi = packet.rxRssi;

    if (decoded.user) {
      existingNode.user = decoded.user;
    }
    if (decoded.position) {
      existingNode.position = decoded.position;
    }
    if (decoded.telemetry) {
      if (!existingNode.telemetryHistory) existingNode.telemetryHistory = [];
      existingNode.telemetryHistory.unshift({
        time: decoded.telemetry.time || Math.floor(Date.now() / 1000),
        ...decoded.telemetry,
      });
      if (existingNode.telemetryHistory.length > 50) existingNode.telemetryHistory.pop();

      if (decoded.telemetry.deviceMetrics) {
        existingNode.deviceMetrics = decoded.telemetry.deviceMetrics;
      }
      if (decoded.telemetry.environmentMetrics) {
        existingNode.environmentMetrics = decoded.telemetry.environmentMetrics;
      }
    }
    if (decoded.text) {
      const msg = {
        id: packet.id,
        from: fromNum,
        to: packet.to,
        text: decoded.text,
        channel: packet.channel || 0,
        time: packet.rxTime ? new Date(packet.rxTime * 1000) : new Date(),
        rxSnr: packet.rxSnr,
        rxRssi: packet.rxRssi,
      };
      this.messages.unshift(msg);
      if (this.messages.length > 100) this.messages.pop();
    }

    this.nodes.set(fromNum, existingNode);
  }

  mergeNode(num, data) {
    const existing = this.nodes.get(num) || {};
    this.nodes.set(num, { ...existing, ...data });
  }

  captureDeviceConfig(parsed) {
    const entry = buildDeviceConfigEntry(parsed, this.myNodeNum, this.currentConfigId);
    if (!entry) return;

    this.deviceConfigs = [
      ...this.deviceConfigs.filter(item => !(item.category === entry.category && item.section === entry.section)),
      entry,
    ];

    this.saveDeviceConfig(entry);
  }

  async saveDeviceConfig(entry) {
    if (!entry.my_node_num) return;
    this.configSaveStatus = 'saving';
    this.notify();

    const existing = await base44.entities.MeshDeviceConfig.filter({
      my_node_num: entry.my_node_num,
      category: entry.category,
      section: entry.section,
    });

    if (existing.length > 0) {
      await base44.entities.MeshDeviceConfig.update(existing[0].id, entry);
    } else {
      await base44.entities.MeshDeviceConfig.create(entry);
    }

    this.configSaveStatus = 'saved';
    this.notify();
  }

  getNodes() {
    return Array.from(this.nodes.values());
  }

  getNodeByNum(num) {
    return this.nodes.get(num);
  }

  getMyNode() {
    if (!this.myNodeNum) return null;
    return this.nodes.get(this.myNodeNum);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(l => l());
  }

  async connect() {
    await this.serial.connect();
  }

  async requestDeviceConfig() {
    if (!this.connected) return;
    this.configSaveStatus = 'requesting';
    this.notify();
    await this.serial.sendWantConfig();
  }

  // Send a text message. Supports broadcast (default) and direct messages.
  // Encryption is handled by the device based on its channel config — no per-message PSK in the browser.
  //
  // params:
  //   text          : string
  //   channelIndex  : number (channel index used for encryption context)
  //   options       : { destination?: number, hopLimit?: number, wantAck?: boolean }
  //                   - destination: omit or 0xffffffff for broadcast; node num for DM
  //                   - hopLimit: defaults to 3
  //                   - wantAck: defaults to true
  async sendChannelMessage(text, channelIndex = 0, options = {}) {
    if (!this.connected) throw new Error('Kein Gerät verbunden.');
    if (!text?.trim()) throw new Error('Leerer Text.');

    const trimmed = text.trim();
    const destination = Number.isFinite(options.destination) ? options.destination >>> 0 : this.BROADCAST_ADDR;
    const hopLimit = Number.isFinite(options.hopLimit) ? options.hopLimit : 3;
    const wantAck = options.wantAck === false ? false : true;
    const isBroadcast = destination === this.BROADCAST_ADDR;
    const kind = isBroadcast ? 'channel' : 'direct';
    const now = Date.now();

    // Track as queued before talking to the device
    const tracked = {
      id: null, // filled after serial returns the packetId
      tempId: now + Math.random(),
      text: trimmed,
      to: destination,
      channel: channelIndex,
      kind,
      hopLimit,
      wantAck,
      status: 'queued',
      sentAt: now,
      updatedAt: now,
      error: null,
      replyReceived: false, replyText: null, replyFrom: null, replyAt: null,
      ackFrom: null, acceptedAt: null,
    };
    this.outgoing.unshift(tracked);
    if (this.outgoing.length > 50) this.outgoing.pop();
    this.notify();

    try {
      const { packetId } = await this.serial.sendTextMessage(trimmed, destination, channelIndex, { hopLimit, wantAck });
      tracked.id = packetId;
      tracked.status = 'written_to_serial'; // bytes left the browser; device acceptance not yet proven
      tracked.updatedAt = Date.now();
      console.debug('[outgoing] written_to_serial', { packetId, destination, channelIndex, hopLimit, wantAck, kind });

      // Local echo so the UI shows the sent message immediately
      this.messages.unshift({
        id: packetId,
        from: this.myNodeNum,
        to: destination,
        text: trimmed,
        channel: channelIndex,
        time: new Date(),
        kind,
        sent: true,
      });
      if (this.messages.length > 100) this.messages.pop();

      // Start ACK/NAK timeout watcher (only meaningful when wantAck is true)
      if (wantAck) {
        const handle = setTimeout(() => {
          const entry = this.outgoing.find(o => o.id === packetId);
          if (entry && (entry.status === 'written_to_serial' || entry.status === 'accepted_by_device')) {
            console.debug('[outgoing] timeout for packetId', packetId, 'last status', entry.status);
            entry.status = 'timeout';
            entry.updatedAt = Date.now();
            this.notify();
          }
          this.outgoingTimeouts.delete(packetId);
        }, this.OUTGOING_ACK_TIMEOUT_MS);
        this.outgoingTimeouts.set(packetId, handle);
      }

      this.notify();
      return { packetId };
    } catch (e) {
      tracked.status = 'error';
      tracked.error = e.message;
      tracked.updatedAt = Date.now();
      console.debug('[outgoing] error', e.message);
      this.notify();
      throw e;
    }
  }

  updateOutgoingStatus(packetId, newStatus, extra = {}) {
    const entry = this.outgoing.find(o => o.id === packetId);
    if (!entry) return;
    // State machine ordering. nak and reply_received may always overwrite.
    const rank = {
      queued: 0,
      written_to_serial: 1,
      accepted_by_device: 2,
      timeout: 3,
      nak: 4,
      ack: 5,
      reply_received: 6,
      error: 7,
    };
    const allowOverride = newStatus === 'nak' || newStatus === 'reply_received';
    if (!allowOverride && (rank[newStatus] ?? 0) < (rank[entry.status] ?? 0)) return;
    const prev = entry.status;
    entry.status = newStatus;
    entry.updatedAt = Date.now();
    Object.assign(entry, extra);
    console.debug('[outgoing] status', packetId, prev, '->', newStatus);
    // Cancel timeout once we got any definitive mesh-level response
    if (newStatus === 'ack' || newStatus === 'nak' || newStatus === 'reply_received') {
      const handle = this.outgoingTimeouts.get(packetId);
      if (handle) { clearTimeout(handle); this.outgoingTimeouts.delete(packetId); }
    }
    this.notify();
  }


  async disconnect() {
    await this.serial.disconnect();
    this.nodes.clear();
    this.messages = [];
    this.myNodeNum = null;
    this.metadata = null;
    this.packetLog = [];
    this.packetSeq = 0;
    this.isLoading = false;
    this.deviceConfigs = [];
    this.configSaveStatus = null;
    this.currentConfigId = null;
    this.outgoingTimeouts.forEach(handle => clearTimeout(handle));
    this.outgoingTimeouts.clear();
    this.outgoing = [];
    if (this.loadingTimeout) clearTimeout(this.loadingTimeout);
    this.notify();
  }

  isSupported() {
    return this.serial.isSupported();
  }

  setPersistFn(fn) {
    this.persistFn = fn;
  }
}

function nodeIdString(num) {
  if (typeof num !== 'number' || !num) return null;
  return '!' + num.toString(16).padStart(8, '0');
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function toPlainJson(value) {
  if (value instanceof Uint8Array) return { hex: bytesToHex(value), length: value.length };
  if (Array.isArray(value)) return value.map(toPlainJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toPlainJson(item)]));
  }
  return value;
}

function isUsefulDecodedData(decoded) {
  if (!decoded) return false;
  if (decoded.text || decoded.position || decoded.user || decoded.telemetry || decoded.routing) return true;
  return [1, 3, 4, 5, 6, 9, 34, 64, 66, 67, 70, 71].includes(decoded.portnum);
}

function buildDeviceConfigEntry(parsed, myNodeNum, configId) {
  if (!myNodeNum) return null;

  const configMap = {
    config: { section: parsed.config?.type || 'Config', payload: parsed.config },
    moduleConfig: { section: parsed.moduleConfig?.type || 'ModuleConfig', payload: parsed.moduleConfig },
    channel: { section: `Channel ${parsed.channel?.index ?? 0}`, payload: parsed.channel },
  };

  const data = configMap[parsed.type];
  if (!data) return null;

  return {
    my_node_num: myNodeNum,
    my_node_id: nodeIdString(myNodeNum),
    category: parsed.type,
    section: data.section,
    config_id: configId,
    payload: toPlainJson(data.payload || {}),
    received_at: Date.now(),
  };
}

// Singleton
export const meshStore = new MeshStore();