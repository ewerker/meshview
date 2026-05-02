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

      // Listen for USB disconnect
      this._onPortDisconnect = (event) => {
        // Nur trennen, wenn genau dieser Port entfernt wird
        if (event.target === this.port || !event.target) {
          console.warn('USB device physically disconnected');
          this.running = false;
          if (this.onDisconnect) this.onDisconnect();
        }
      };
      navigator.serial.addEventListener('disconnect', this._onPortDisconnect);

      this.running = true;
      this.buffer = [];
      
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

    // Remove USB disconnect listener
    if (this._onPortDisconnect) {
      navigator.serial.removeEventListener('disconnect', this._onPortDisconnect);
      this._onPortDisconnect = null;
    }

    try {
      if (this.reader) {
        await this.reader.cancel().catch(() => {});
        this.reader = null;
      }
    } catch (_) {}

    this.writer = null;

    // Wait for read loop to finish
    if (this.readLoopPromise) {
      await this.readLoopPromise.catch(() => {});
      this.readLoopPromise = null;
    }

    try {
      if (this.port) {
        await this.port.close().catch(() => {});
      }
    } catch (_) {}

    this.port = null;
    this.buffer = [];
    if (this.onDisconnect) this.onDisconnect();
  }

  async readLoop() {
    try {
      while (this.running && this.port?.readable) {
        let reader;
        try {
          reader = this.port.readable.getReader();
        } catch (e) {
          console.warn('Failed to get reader, port might be dead:', e.message);
          break; // Exit the loop if we can't get a reader
        }
        
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
          console.warn('Serial read error, attempting recovery:', e.message);
        } finally {
          try { reader.releaseLock(); } catch (_) {}
          this.reader = null;
        }

        // If still running, wait briefly and retry the read loop
        if (this.running && this.port?.readable) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    } catch (e) {
      console.warn('Fatal error in readLoop:', e.message);
    } finally {
      // If we exited the loop unexpectedly while running, trigger disconnect
      if (this.running) {
        this.running = false;
        if (this.onDisconnect) this.onDisconnect();
      }
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
    if (!this.port || !this.port.writable) {
      throw new Error('Kein Meshtastic-Gerät verbunden.');
    }
    const writer = this.port.writable.getWriter();
    try {
      const header = new Uint8Array([
        START1,
        START2,
        (data.length >> 8) & 0xff,
        data.length & 0xff,
      ]);
      const packet = new Uint8Array(header.length + data.length);
      packet.set(header, 0);
      packet.set(data, header.length);
      await writer.write(packet);
    } finally {
      writer.releaseLock();
    }
  }

  async sendTextMessage(text, destination = 0xffffffff, channel = 0, options = {}) {
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    // Build a minimal MeshPacket for text message
    const { bytes, packetId } = buildTextPacket(textBytes, destination, channel, options);
    await this.sendToRadio(bytes);
    return { packetId };
  }

  setMyNodeNum(num) {
    this.myNodeNum = num >>> 0;
  }
}

// Minimal protobuf encoding for ToRadio { want_config_id: uint32 }
function ToRadio_encode_wantConfigId(id) {
  // Field 3 (want_config_id), wire type 0 (varint)
  // Tag = (3 << 3) | 0 = 24 = 0x18
  const bytes = [0x18, ...encodeVarint(id)];
  return new Uint8Array(bytes);
}


function encodeMessage(fields) {
  const bytes = [];
  fields.forEach(([fieldNumber, wireType, value]) => {
    bytes.push(...encodeVarint((fieldNumber << 3) | wireType));
    if (wireType === 0) {
      bytes.push(...encodeVarint(value));
    } else if (wireType === 2) {
      bytes.push(...encodeVarint(value.length), ...value);
    } else if (wireType === 5) {
      // fixed32 little-endian (used for MeshPacket.from/to/id)
      const v = value >>> 0;
      bytes.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
    }
  });
  return bytes;
}

function encodeVarint(value) {
  // Use BigInt to safely handle full uint32/uint64 range (e.g. 0xffffffff broadcast).
  // The previous `value >>>= 7` was a 32-bit signed shift in JS and corrupted large values.
  let v = BigInt(value);
  if (v < 0n) v &= 0xffffffffffffffffn; // treat negatives as unsigned 64-bit
  const bytes = [];
  while (v > 0x7fn) {
    bytes.push(Number((v & 0x7fn) | 0x80n));
    v >>= 7n;
  }
  bytes.push(Number(v & 0x7fn));
  return bytes;
}

export function inspectTextPacket(text, destination = 0xffffffff, channel = 0, options = {}) {
  // Build the same packet structure that sendTextMessage would, but without sending.
  // Returns a structured description so the UI can show what the wire bytes will look like.
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(String(text ?? ''));
  const hopLimit = Number.isFinite(options.hopLimit) ? options.hopLimit : 3;
  const wantAck = options.wantAck === false ? false : true;
  const dest = (destination >>> 0);

  const issues = [];
  if (!textBytes.length) issues.push('Leerer Text — Data.payload wäre 0 Bytes.');
  if (textBytes.length > 200) issues.push(`Text zu lang (${textBytes.length} Bytes, max 200 für Meshtastic-Textnachrichten).`);
  if (!Number.isFinite(hopLimit) || hopLimit < 1 || hopLimit > 7) issues.push(`hop_limit außerhalb 1..7 (=${hopLimit}).`);
  if (!Number.isFinite(channel) || channel < 0 || channel > 7) issues.push(`channel außerhalb 0..7 (=${channel}).`);

  const fromNum = Number.isFinite(options.from) ? (options.from >>> 0) : 0;
  const { bytes, packetId } = buildTextPacket(textBytes, dest, channel, { hopLimit, wantAck, from: fromNum });

  return {
    issues,
    packetId,
    fields: {
      'ToRadio.packet (field 2, length-delim)': `${bytes.length} Bytes ToRadio-Wrapper`,
      'MeshPacket.from (field 1, fixed32)': `0x${fromNum.toString(16).padStart(8, '0')}${fromNum === 0 ? ' (auto/Gerät)' : ''}`,
      'MeshPacket.to (field 2, fixed32)': `0x${dest.toString(16).padStart(8, '0')}${dest === 0xffffffff ? ' (Broadcast)' : ''}`,
      'MeshPacket.channel (field 3)': String(channel),
      'MeshPacket.id (field 6, fixed32)': `0x${packetId.toString(16).padStart(8, '0')}`,
      'MeshPacket.hop_limit (field 9)': String(hopLimit),
      'MeshPacket.want_ack (field 10)': String(wantAck ? 1 : 0),
      'Data.portnum (field 1)': '1 (TEXT_MESSAGE_APP)',
      'Data.payload (field 2)': `${textBytes.length} Bytes UTF-8`,
    },
    textBytes,
    bytes, // raw ToRadio bytes (without START1/START2/length header)
  };
}

function buildTextPacket(textBytes, destination, channel, options = {}) {
  const hopLimit = Number.isFinite(options.hopLimit) ? options.hopLimit : 3;
  const wantAck = options.wantAck === false ? 0 : 1;
  const from = Number.isFinite(options.from) ? (options.from >>> 0) : 0;

  const data = encodeMessage([
    [1, 0, 1],          // Data.portnum = TEXT_MESSAGE_APP
    [2, 2, textBytes],  // Data.payload = UTF-8 message
  ]);

  const packetId = Math.floor(Math.random() * 0xffffffff) >>> 0;
  // Field order matches the official Python/JS clients: from, to, channel, decoded, id, hop_limit, want_ack
  const meshPacket = encodeMessage([
    [1, 5, from],                    // MeshPacket.from (fixed32) — required by firmware for ack routing
    [2, 5, destination],             // MeshPacket.to (fixed32)
    [3, 0, channel],                 // MeshPacket.channel
    [4, 2, new Uint8Array(data)],    // MeshPacket.decoded
    [6, 5, packetId],                // MeshPacket.id (fixed32)
    [9, 0, hopLimit],                // MeshPacket.hop_limit
    [10, 0, wantAck],                // MeshPacket.want_ack
  ]);

  const bytes = new Uint8Array(encodeMessage([
    [2, 2, new Uint8Array(meshPacket)], // ToRadio.packet
  ]));
  return { bytes, packetId };
}