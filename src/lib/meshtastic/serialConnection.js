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
    this.onTx = null;
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

      this._onPortDisconnect = (event) => {
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

      this.readLoopPromise = this.readLoop();

      await this.sendWantConfig();

      return true;
    } catch (err) {
      this.running = false;
      throw err;
    }
  }

  async disconnect() {
    this.running = false;

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
          console.warn('Failed to get reader:', e.message);
          break;
        }

        this.reader = reader;
        try {
          while (this.running) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              for (const byte of value) this.buffer.push(byte);
              this.processBuffer();
            }
          }
        } catch (e) {
          console.warn('Serial read error:', e.message);
        } finally {
          try { reader.releaseLock(); } catch (_) {}
          this.reader = null;
        }

        if (this.running && this.port?.readable) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    } catch (e) {
      console.warn('Fatal error in readLoop:', e.message);
    } finally {
      if (this.running) {
        this.running = false;
        if (this.onDisconnect) this.onDisconnect();
      }
    }
  }

  processBuffer() {
    while (this.buffer.length >= 4) {
      const s1 = this.buffer.indexOf(START1);
      if (s1 === -1) {
        this.buffer = [];
        return;
      }
      if (s1 > 0) this.buffer = this.buffer.slice(s1);
      if (this.buffer.length < 2) return;
      if (this.buffer[1] !== START2) {
        this.buffer = this.buffer.slice(1);
        continue;
      }
      if (this.buffer.length < 4) return;

      const msb = this.buffer[2];
      const lsb = this.buffer[3];
      const packetLen = (msb << 8) | lsb;

      if (packetLen > 512) {
        this.buffer = this.buffer.slice(2);
        continue;
      }

      if (this.buffer.length < 4 + packetLen) return;

      const packetData = this.buffer.slice(4, 4 + packetLen);
      this.buffer = this.buffer.slice(4 + packetLen);

      if (this.onPacket) this.onPacket(new Uint8Array(packetData));
    }
  }

  async sendWantConfig() {
    const wantConfigId = Math.floor(Math.random() * 0xffffffff);
    await this.sendToRadio(ToRadio_encode_wantConfigId(wantConfigId));
  }

  async sendToRadio(data) {
    if (!this.port || !this.port.writable) return;
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

  /**
   * Send a text message via the mesh.
   * @param {string} text - Message content (UTF-8).
   * @param {number} destination - Target node number (0xFFFFFFFF for broadcast).
   * @param {number} channel - Channel index (default 0).
   */
  async sendTextMessage(text, destination = 0xffffffff, channel = 0) {
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    const packetId = (Math.floor(Math.random() * 0xfffffffe) + 1) >>> 0;
    const packet = buildTextMeshPacket(textBytes, destination, channel, packetId);

    const hex = Array.from(packet).map(b => b.toString(16).padStart(2, '0')).join(' ');
    if (this.onTx) this.onTx({ kind: 'text', to: destination, channel, text, id: packetId, bytes: packet.length, hex });

    await this.sendToRadio(packet);
    return packetId;
  }
}

// ---------- Protobuf encoding helpers ----------

function encodeTag(fieldNumber, wireType) {
  return encodeVarint((fieldNumber << 3) | wireType);
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

function fixed32(value) {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, value >>> 0, true);
  return buf;
}

// Minimal protobuf encoding for ToRadio { want_config_id: uint32 }
function ToRadio_encode_wantConfigId(id) {
  // Field 3 (want_config_id), wire type 0 (varint), tag = 0x18
  return new Uint8Array([0x18, ...encodeVarint(id)]);
}

// Build ToRadio frame containing a MeshPacket with TEXT_MESSAGE_APP payload.
function buildTextMeshPacket(textBytes, destination, channel, packetId) {
  // Data (decoded) = { portnum=1 (TEXT_MESSAGE_APP), payload=textBytes }
  const dataBytes = [
    ...encodeTag(1, 0), ...encodeVarint(1),                                  // portnum = 1
    ...encodeTag(2, 2), ...encodeVarint(textBytes.length), ...textBytes,     // payload
  ];

  // MeshPacket fields:
  //   2 (to, fixed32)
  //   3 (channel, varint)
  //   4 (decoded, Data, length-delim)
  //   6 (id, fixed32)
  //   7 (rx_time) - not set for TX
  //   8 (want_ack, bool)
  //  10 (hop_limit, varint)
  const meshPacket = [
    ...encodeTag(2, 5), ...fixed32(destination),                               // to
    ...encodeTag(3, 0), ...encodeVarint(channel),                              // channel
    ...encodeTag(4, 2), ...encodeVarint(dataBytes.length), ...dataBytes,       // decoded
    ...encodeTag(6, 5), ...fixed32(packetId),                                  // id
    ...encodeTag(8, 0), 0x01,                                                  // want_ack = true
    ...encodeTag(10, 0), ...encodeVarint(3),                                   // hop_limit = 3
  ];

  // ToRadio.packet = field 2, length-delim
  const toRadio = [...encodeTag(2, 2), ...encodeVarint(meshPacket.length), ...meshPacket];
  return new Uint8Array(toRadio);
}