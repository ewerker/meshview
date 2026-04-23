// Meshtastic Serial Connection Handler
// Implements the Meshtastic serial framing protocol directly via Web Serial API

import { START1, START2, MESHTASTIC_BAUD_RATE } from './constants.js';

export class MeshtasticSerial {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.running = false;
    this.onPacket = null;
    this.onConnect = null;
    this.onDisconnect = null;
    this.buffer = [];
    this.readLoopPromise = null;
  }

  isSupported() {
    return 'serial' in navigator;
  }

  async connect() {
    if (!this.isSupported()) {
      throw new Error('Web Serial API wird von diesem Browser nicht unterstützt. Bitte Chrome oder Edge verwenden.');
    }

    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: MESHTASTIC_BAUD_RATE });

      this.running = true;
      this.writer = this.port.writable.getWriter();

      if (this.onConnect) this.onConnect();

      // Start read loop
      this.readLoopPromise = this.readLoop();

      // Request config from device
      await this.sendWantConfig();

      return true;
    } catch (err) {
      this.running = false;
      throw err;
    }
  }

  async disconnect() {
    this.running = false;
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
      }
      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }
      if (this.port && this.port.readable === null && this.port.writable === null) {
        // already closed
      } else if (this.port) {
        await this.port.close();
      }
    } catch (e) {
      // ignore close errors
    }
    this.port = null;
    if (this.onDisconnect) this.onDisconnect();
  }

  async readLoop() {
    const reader = this.port.readable.getReader();
    this.reader = reader;
    try {
      while (this.running) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          for (const byte of value) {
            this.buffer.push(byte);
          }
          this.processBuffer();
        }
      }
    } catch (e) {
      if (this.running) {
        console.error('Serial read error:', e);
        if (this.onDisconnect) this.onDisconnect();
      }
    } finally {
      reader.releaseLock();
    }
  }

  processBuffer() {
    while (this.buffer.length >= 4) {
      // Find START1 START2 sequence
      const s1 = this.buffer.indexOf(START1);
      if (s1 === -1) {
        this.buffer = [];
        return;
      }
      if (s1 > 0) {
        this.buffer = this.buffer.slice(s1);
      }
      if (this.buffer.length < 2) return;
      if (this.buffer[1] !== START2) {
        this.buffer = this.buffer.slice(1);
        continue;
      }
      if (this.buffer.length < 4) return;

      // MSB first for length
      const msb = this.buffer[2];
      const lsb = this.buffer[3];
      const packetLen = (msb << 8) | lsb;

      if (packetLen > 512) {
        // Invalid length, skip
        this.buffer = this.buffer.slice(2);
        continue;
      }

      if (this.buffer.length < 4 + packetLen) return;

      const packetData = this.buffer.slice(4, 4 + packetLen);
      this.buffer = this.buffer.slice(4 + packetLen);

      if (this.onPacket) {
        this.onPacket(new Uint8Array(packetData));
      }
    }
  }

  async sendWantConfig() {
    // Send want_config_id to trigger device to send all config
    const wantConfigId = Math.floor(Math.random() * 0xffffffff);
    await this.sendToRadio(ToRadio_encode_wantConfigId(wantConfigId));
  }

  async sendToRadio(data) {
    if (!this.writer) return;
    const header = new Uint8Array([
      START1,
      START2,
      (data.length >> 8) & 0xff,
      data.length & 0xff,
    ]);
    const packet = new Uint8Array(header.length + data.length);
    packet.set(header, 0);
    packet.set(data, header.length);
    await this.writer.write(packet);
  }

  async sendTextMessage(text, destination = 0xffffffff, channel = 0) {
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    // Build a minimal MeshPacket for text message
    const packet = buildTextPacket(textBytes, destination, channel);
    await this.sendToRadio(packet);
  }
}

// Minimal protobuf encoding for ToRadio { want_config_id: uint32 }
function ToRadio_encode_wantConfigId(id) {
  // Field 3 (want_config_id), wire type 0 (varint)
  // Tag = (3 << 3) | 0 = 24 = 0x18
  const bytes = [0x18, ...encodeVarint(id)];
  return new Uint8Array(bytes);
}

function encodeVarint(value) {
  const bytes = [];
  while (value > 0x7f) {
    bytes.push((value & 0x7f) | 0x80);
    value >>>= 7;
  }
  bytes.push(value & 0x7f);
  return bytes;
}

function buildTextPacket(textBytes, destination, channel) {
  // Minimal protobuf: MeshPacket with to, decoded.payload, decoded.portnum=1
  // This is a simplified placeholder - full implementation would need complete protobuf
  return new Uint8Array([0x08, ...encodeVarint(destination), 0x1a, textBytes.length, ...textBytes]);
}