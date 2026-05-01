// Central state store for Meshtastic data
import { MeshtasticSerial } from './serialConnection.js';
import { parseFromRadio } from './protobufParser.js';

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
    this.persistFn = null; // optional async (logEntry, parsed) => void

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

  handlePacket(rawBytes) {
    // Show loading indicator while actively receiving packets
    this.isLoading = true;
    
    // Auto-hide loading after 5s of inactivity
    if (this.loadingTimeout) clearTimeout(this.loadingTimeout);
    this.loadingTimeout = setTimeout(() => {
      this.isLoading = false;
      this.notify();
    }, 5000);

    const parsed = parseFromRadio(rawBytes);

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
    } else if (parsed.type === 'nodeInfo' && parsed.nodeInfo) {
      logEntry.from = parsed.nodeInfo.num;
    } else if (parsed.type === 'myInfo' && parsed.myInfo) {
      logEntry.from = parsed.myInfo.myNodeNum;
    }
    this.packetLog.push(logEntry);
    if (this.packetLog.length > 200) this.packetLog.shift();

    // Persist to DB if a persist function was injected (only when user is logged in)
    if (this.persistFn) {
      try { this.persistFn(logEntry, parsed); } catch (e) { console.warn('persist failed', e); }
    }

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
    }

    this.notify();
  }

  handleDecodedPacket(packet) {
    const decoded = packet.decoded;
    const fromNum = packet.from;

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

  async disconnect() {
    await this.serial.disconnect();
    this.nodes.clear();
    this.messages = [];
    this.myNodeNum = null;
    this.metadata = null;
    this.packetLog = [];
    this.packetSeq = 0;
    this.isLoading = false;
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

// Singleton
export const meshStore = new MeshStore();