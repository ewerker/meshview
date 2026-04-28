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

  async sendTextMessage(text, destination = 0xffffffff, channel = 0) {
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    // Build a minimal MeshPacket for text message
    const packet = buildTextPacket(textBytes, destination, channel);
    await this.sendToRadio(packet);
  }

  /**
   * Send an Admin command to reboot the connected device.
   * @param {number} myNodeNum - The node number of the connected device (target).
   * @param {number} seconds - Delay in seconds before reboot (default 5).
   */
  async sendReboot(myNodeNum, seconds = 5) {
    if (!myNodeNum) throw new Error('Eigene Node-Nummer unbekannt');
    const packet = buildAdminRebootPacket(myNodeNum, seconds);
    const hex = Array.from(packet).map(b => b.toString(16).padStart(2, '0')).join(' ');
    if (this.onTx) this.onTx({ kind: 'reboot', to: myNodeNum, seconds, bytes: packet.length, hex });
    await this.sendToRadio(packet);
  }
}

// Encodes a protobuf field tag.
function encodeTag(fieldNumber, wireType) {
  return encodeVarint((fieldNumber << 3) | wireType);
}

// Builds an AdminMessage protobuf with reboot_seconds set.
// AdminMessage.reboot_seconds is field 97 (int32 varint).
function buildAdminMessageReboot(seconds) {
  // Field 97, wire type 0 (varint). Tag varint = (97 << 3) | 0 = 776 -> [0x88, 0x06]
  return new Uint8Array([...encodeTag(97, 0), ...encodeVarint(seconds)]);
}

// Builds a ToRadio packet containing a MeshPacket addressed to our own node
// with decoded.payload = AdminMessage(reboot_seconds=seconds), portnum=ADMIN_APP(7).
function buildAdminRebootPacket(myNodeNum, seconds) {
  const adminPayload = buildAdminMessageReboot(seconds);

  // Data message (mesh.proto):
  //   field 1 (portnum, varint) = 7 (ADMIN_APP)
  //   field 2 (payload, bytes) = adminPayload
  //   field 6 (want_response, bool) = true
  const dataBytes = [
    ...encodeTag(1, 0), ...encodeVarint(7),                                  // portnum = 7
    ...encodeTag(2, 2), ...encodeVarint(adminPayload.length), ...adminPayload, // payload
    ...encodeTag(6, 0), 0x01,                                                 // want_response = true
  ];

  // MeshPacket (mesh.proto):
  //   field 1 (from, fixed32) — omit, radio fills it in
  //   field 2 (to, fixed32) = myNodeNum
  //   field 3 (channel, varint) = 0 (admin uses primary channel)
  //   field 4 (decoded, Data, length-delim)
  //   field 6 (id, fixed32) = random non-zero packet id
  //   field 8 (want_ack, bool) = true
  const toBytes = new Uint8Array(4);
  new DataView(toBytes.buffer).setUint32(0, myNodeNum >>> 0, true);

  const packetId = (Math.floor(Math.random() * 0xfffffffe) + 1) >>> 0;
  const idBytes = new Uint8Array(4);
  new DataView(idBytes.buffer).setUint32(0, packetId, true);

  const meshPacket = [
    ...encodeTag(2, 5), ...toBytes,                                       // to (fixed32)
    ...encodeTag(4, 2), ...encodeVarint(dataBytes.length), ...dataBytes,  // decoded
    ...encodeTag(6, 5), ...idBytes,                                       // id (fixed32)
    ...encodeTag(8, 0), 0x01,                                             // want_ack
  ];

  // ToRadio.packet is field 2, length-delim. Tag = (2<<3)|2 = 0x12
  const toRadio = [...encodeTag(2, 2), ...encodeVarint(meshPacket.length), ...meshPacket];
  return new Uint8Array(toRadio);
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