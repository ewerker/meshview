// Central state store for Meshtastic data
import { MeshtasticSerial } from './serialConnection.js';
import { parseFromRadio } from './protobufParser.js';
import { loadRules, matchesRule, checkCooldown, updateCooldown, renderTemplate, haversineKm } from './autoresponder.js';

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
    const parsed = parseFromRadio(rawBytes);

    // Log all packets
    this.packetLog.unshift({
      time: new Date(),
      type: parsed.type,
      raw: parsed,
    });
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

  runAutoresponder(message, senderNode) {
    const rules = loadRules().filter(r => r.enabled);
    const myNode = this.getMyNode();

    for (const rule of rules) {
      if (!matchesRule(rule, message, senderNode, myNode)) continue;
      if (!checkCooldown(rule, senderNode.num)) continue;

      const dist = haversineKm(
        myNode?.position?.latitude, myNode?.position?.longitude,
        senderNode?.position?.latitude, senderNode?.position?.longitude
      );

      const text = renderTemplate(rule.template, {
        senderNode,
        myNode,
        message,
        distKm: dist,
      });

      const destination = rule.filters.replyTo === 'broadcast' ? 0xffffffff : senderNode.num;

      updateCooldown(rule, senderNode.num);

      // Delay reply slightly to avoid flooding
      setTimeout(() => {
        this.serial.sendTextMessage(text, destination).catch(e => console.error('Autoresponder send error:', e));
      }, 500);

      // Only first matching rule fires (break)
      break;
    }
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

  async sendTextMessage(text, destNum, channel = 0, wantAck = false) {
    const entry = {
      time: new Date(),
      text,
      destNum,
      wantAck,
      status: 'sending',
      error: null,
    };
    this.sendLog.unshift(entry);
    if (this.sendLog.length > 50) this.sendLog.pop();
    this.notify();
    try {
      await this.serial.sendTextMessage(text, destNum, channel, wantAck);
      entry.status = 'ok';

      // Add sent message to the feed as "own" message
      const feedEntry = {
        id: Date.now(),
        from: this.myNodeNum,
        to: destNum,
        time: new Date(),
        type: 'TEXT_MESSAGE_APP',
        text,
        channel,
        isSent: true,
      };
      this.messages.unshift(feedEntry);
      if (this.messages.length > 200) this.messages.pop();
    } catch (e) {
      entry.status = 'error';
      entry.error = e.message;
      throw e;
    } finally {
      this.notify();
    }
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
    this.notify();
  }

  isSupported() {
    return this.serial.isSupported();
  }
}

// Singleton
export const meshStore = new MeshStore();