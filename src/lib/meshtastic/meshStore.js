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
    this.sendLog = [];

    this.serialLog = []; // raw byte log for debugging

    this.serial.onPacket = (data) => {
      this._logSerial('rx', data);
      this.handlePacket(data);
    };
    this.serial.onRawRx = (data) => {
      this._logSerial('raw', data, `RAW ${data.length}b`);
      this.notify();
    };
    this.serial.onSent = (data) => {
      this._logSerial('tx', data);
      this.notify();
    };
    this.serial.onError = (msg) => {
      this._logSerial('event', null, '❌ ' + msg);
      this.notify();
    };
    this.serial.onConnect = () => {
      this.connected = true;
      this._logSerial('event', null, '✅ CONNECTED');
      this.notify();
    };
    this.serial.onDisconnect = () => {
      this.connected = false;
      this._logSerial('event', null, '🔌 DISCONNECTED');
      this.notify();
    };
  }

  handlePacket(rawBytes) {
    const parsedList = parseFromRadio(rawBytes);

    for (const parsed of parsedList) {
      this.packetLog.unshift({ time: new Date(), type: parsed.type, raw: parsed });
      if (this.packetLog.length > 200) this.packetLog.pop();

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
    // Build a unified feed entry for all packet types
    const feedEntry = {
      id: packet.id || Math.random(),
      from: fromNum,
      to: packet.to,
      time: packet.rxTime ? new Date(packet.rxTime * 1000) : new Date(),
      rxSnr: packet.rxSnr,
      rxRssi: packet.rxRssi,
      channel: packet.channel,
      type: decoded.portnumName || 'UNKNOWN',
    };

    if (decoded.text) {
      feedEntry.text = decoded.text;
      this.messages.unshift(feedEntry);
      if (this.messages.length > 200) this.messages.pop();

      // Autoresponder: only reply to messages not from myself
      if (fromNum !== this.myNodeNum) {
        this.runAutoresponder(feedEntry, existingNode);
      }
    } else if (decoded.position) {
      feedEntry.position = decoded.position;
      this.messages.unshift(feedEntry);
      if (this.messages.length > 200) this.messages.pop();
    } else if (decoded.telemetry) {
      feedEntry.telemetry = decoded.telemetry;
      this.messages.unshift(feedEntry);
      if (this.messages.length > 200) this.messages.pop();
    } else if (decoded.user) {
      feedEntry.userInfo = decoded.user;
      this.messages.unshift(feedEntry);
      if (this.messages.length > 200) this.messages.pop();
    }

    this.nodes.set(fromNum, existingNode);
  }



  _logSerial(direction, bytes, label = null) {
    const hex = bytes ? Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ') : '';
    const entry = {
      time: new Date(),
      direction, // 'rx' | 'tx' | 'event'
      hex,
      label,
      byteLen: bytes ? bytes.length : 0,
    };
    this.serialLog.unshift(entry);
    if (this.serialLog.length > 100) this.serialLog.pop();
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
    this.sendLog = [];
    this.serialLog = [];
    this.notify();
  }

  isSupported() {
    return this.serial.isSupported();
  }
}

// Singleton
export const meshStore = new MeshStore();