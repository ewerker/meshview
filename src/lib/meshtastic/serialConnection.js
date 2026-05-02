// Meshtastic Serial Connection Handler
// Implements the Meshtastic serial framing protocol directly via Web Serial API

import { START1, START2, MESHTASTIC_BAUD_RATE } from './constants.js';

export class MeshtasticSerial {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;        // persistent writer, held open for the connection lifetime
    this._writeLock = false;   // serialise concurrent writes
    this._writeQueue = [];
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

      // Acquire a persistent writer for the connection lifetime
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

    try {
      if (this.writer) {
        await this.writer.close().catch(() => {});
        this.writer = null;
      }
    } catch (_) { this.writer = null; }

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
    if (!this.writer) {
      throw new Error('Kein Meshtastic-Gerät verbunden.');
    }
    // Queue writes to prevent concurrent access
    return new Promise((resolve, reject) => {
      this._writeQueue.push({ data, resolve, reject });
      this._flushWriteQueue();
    });
  }

  async _flushWriteQueue() {
    if (this._writeLock || this._writeQueue.length === 0) return;
    this._writeLock = true;
    while (this._writeQueue.length > 0) {
      const { data, resolve, reject } = this._writeQueue.shift();
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
        await this.writer.write(packet);
        resolve();
      } catch (e) {
        reject(e);
      }
    }
    this._writeLock = false;
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


function encodeMessage(fields) {
  const bytes = [];
  fields.forEach(([fieldNumber, wireType, value]) => {
    bytes.push(...encodeVarint((fieldNumber << 3) | wireType));
    if (wireType === 0) {
      bytes.push(...encodeVarint(value));
    } else if (wireType === 2) {
      bytes.push(...encodeVarint(value.length), ...value);
    }
  });
  return bytes;
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
  const data = encodeMessage([
    [1, 0, 1],          // Data.portnum = TEXT_MESSAGE_APP
    [2, 2, textBytes],  // Data.payload = UTF-8 message
  ]);

  const packetId = Math.floor(Math.random() * 0xffffffff) >>> 0;
  const meshPacket = encodeMessage([
    [2, 0, destination],             // MeshPacket.to
    [3, 0, channel],                 // MeshPacket.channel
    [4, 2, new Uint8Array(data)],    // MeshPacket.decoded
    [6, 0, packetId],                // MeshPacket.id
    [9, 0, 3],                       // MeshPacket.hop_limit
    [10, 0, 1],                      // MeshPacket.want_ack
  ]);

  return new Uint8Array(encodeMessage([
    [2, 2, new Uint8Array(meshPacket)], // ToRadio.packet
  ]));
}