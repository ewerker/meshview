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
          // Log raw RX bytes before parsing
          if (this.onRawRx) this.onRawRx(value);
          for (const byte of value) {
            this.buffer.push(byte);
          }
          this.processBuffer();
        }
      }
    } catch (e) {
      if (this.running) {
        if (this.onError) this.onError('Read error: ' + e.message);
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
        // Keep last 3 bytes in case START sequence is split across reads
        if (this.buffer.length > 3) {
          this.buffer = this.buffer.slice(-3);
        }
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
        // Invalid length, skip this START2 and continue
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
    if (!this.writer) {
      console.error('[Serial] sendToRadio: no writer!');
      return;
    }
    const header = new Uint8Array([
      START1,
      START2,
      (data.length >> 8) & 0xff,
      data.length & 0xff,
    ]);
    const packet = new Uint8Array(header.length + data.length);
    packet.set(header, 0);
    packet.set(data, header.length);
    console.log('[Serial TX]', Array.from(packet).map(b => b.toString(16).padStart(2,'0')).join(' '));
    await this.writer.write(packet);
    if (this.onSent) this.onSent(packet);
  }

  async sendTextMessage(text, destination = 0xffffffff, channel = 0, wantAck = false) {
    console.log('[sendTextMessage] dest=0x' + destination.toString(16) + ' ch=' + channel + ' wantAck=' + wantAck);
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    const packet = buildTextPacket(textBytes, destination, channel, wantAck);
    console.log('[sendTextMessage] dest=0x' + destination.toString(16) + ' ch=' + channel + ' wantAck=' + wantAck + ' textLen=' + textBytes.length);
    await this.sendToRadio(packet);
  }
}

// ToRadio { want_config_id (field 3): tag 0x18, varint }
function ToRadio_encode_wantConfigId(id) {
  const bytes = [0x18, ...encodeVarint(id >>> 0)];
  return new Uint8Array(bytes);
}

function encodeVarint(value) {
  value = value >>> 0; // treat as unsigned 32-bit
  const bytes = [];
  do {
    let byte = value & 0x7f;
    value >>>= 7;
    if (value !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (value !== 0);
  return bytes;
}

function buildTextPacket(textBytes, destination, channel, wantAck = false) {
  // Data { portnum=1 (TEXT_MESSAGE_APP), payload=textBytes }
  const dataBytes = [
    0x08, 0x01,                                           // field 1 (portnum) = 1 (TEXT_MESSAGE_APP)
    0x12, ...encodeVarint(textBytes.length), ...textBytes // field 2 (payload)
  ];

  const packetId = (Math.random() * 0xffffffff) >>> 0;
  const meshBytes = [
    0x08, ...encodeVarint(destination >>> 0),              // field 1  (to)
    0x1a, ...encodeVarint(dataBytes.length), ...dataBytes, // field 3  (decoded)
    0x30, ...encodeVarint(packetId),                       // field 6  (id) — varint
    0x48, 0x03,                                            // field 9  (hop_limit = 3)
    0x50, ...encodeVarint(wantAck ? 1 : 0),               // field 10 (want_ack)
    0x70, ...encodeVarint(channel),                        // field 14 (channel) — varint
  ];

  // ToRadio { field 1 (packet): MeshPacket }
  const toRadioBytes = [0x0a, ...encodeVarint(meshBytes.length), ...meshBytes];
  return new Uint8Array(toRadioBytes);
}