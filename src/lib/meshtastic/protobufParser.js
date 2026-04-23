// Minimal Protobuf Parser for Meshtastic packets
// Parses FromRadio messages from the device

import { PortNum } from './constants.js';

// Protobuf wire types
const WIRE_VARINT = 0;
const WIRE_64BIT = 1;
const WIRE_LEN = 2;
const WIRE_32BIT = 5;

export function parseFromRadio(bytes) {
  try {
    const fields = parseMessage(bytes);
    console.log('[Parser] FromRadio fields:', JSON.stringify(Object.fromEntries(Object.entries(fields).map(([k,v]) => [k, v instanceof Uint8Array ? `bytes(${v.length})` : v]))), '| first byte hex:', (bytes[0]||0).toString(16));
    // FromRadio oneof packet field
    // field 1 = packet (MeshPacket)
    // field 3 = my_info
    // field 4 = node_info
    // field 6 = config
    // field 7 = log_record
    // field 8 = config_complete_id
    // field 10 = channel
    // field 11 = queueStatus
    // field 13 = metadata

    // FromRadio field numbers (Meshtastic protobuf):
    // field 1 (0x0a) = packet (MeshPacket)
    // field 2 (0x12) = my_info (MyNodeInfo)
    // field 4 (0x22) = node_info (NodeInfo)
    // field 8 (0x42) = config_complete_id (uint32)
    // field 13 (0x6a) = metadata (DeviceMetadata)
    // A single FromRadio message can contain multiple fields — emit one result per field.
    const results = [];

    // Log all parsed fields for debugging
    console.log('[FromRadio] field keys:', Object.keys(fields).join(','), '| types:', Object.entries(fields).map(([k,v]) => `${k}:${v instanceof Uint8Array ? 'bytes('+v.length+')' : v}`).join(' '));

    if (fields[2]) results.push({ type: 'packet', packet: parseMeshPacket(fields[2]) });
    if (fields[3]) results.push({ type: 'myInfo', myInfo: parseMyNodeInfo(fields[3]) });
    if (fields[4]) results.push({ type: 'nodeInfo', nodeInfo: parseNodeInfo(fields[4]) });
    if (fields[6]) results.push({ type: 'configComplete', configCompleteId: fields[6] });
    if (fields[11]) results.push({ type: 'metadata', metadata: parseDeviceMetadata(fields[11]) });

    if (results.length === 0) return [{ type: 'unknown', raw: fields }];
    return results;
  } catch (e) {
    return { type: 'error', error: e.message };
  }
}

function parseMeshPacket(bytes) {
  const fields = parseMessage(bytes);
  // MeshPacket fields (mesh.proto):
  // 1=to, 2=from, 3=decoded, 4=encrypted, 6=id, 7=rx_time, 8=rx_snr(float32), 9=hop_limit,
  // 10=want_ack, 11=rx_rssi, 12=delayed, 14=channel, 15=public_key, 16=pki_encrypted, 19=next_hop, 20=relay_node
  const packet = {
    from: fields[2] || 0,
    to: fields[1] || 0,
    id: fields[6] || 0,
    rxTime: fields[7] || 0,
    rxSnr: fields[8] ? int32ToFloat(fields[8]) : 0,
    hopLimit: fields[9] || 0,
    channel: fields[14] || 0,
    rxRssi: signedInt(fields[11] || 0),
    viaMqtt: fields[16] || false,
    decoded: null,
  };

  // field 3 = decoded Data (unencrypted), field 4 = encrypted (skip)
  if (fields[3]) {
    packet.decoded = parseData(fields[3]);
  }

  return packet;
}

function parseData(bytes) {
  const fields = parseMessage(bytes);
  const portnum = fields[1] || 0;
  const payload = fields[2] || new Uint8Array(0);

  const data = {
    portnum,
    portnumName: PortNum[portnum] || `UNKNOWN(${portnum})`,
    payload,
  };

  try {
    if (portnum === 1) {
      // TEXT_MESSAGE_APP
      data.text = new TextDecoder().decode(payload);
    } else if (portnum === 4) {
      // POSITION_APP
      data.position = parsePosition(payload);
    } else if (portnum === 5) {
      // NODEINFO_APP
      data.user = parseUser(payload);
    } else if (portnum === 67) {
      // TELEMETRY_APP
      data.telemetry = parseTelemetry(payload);
    }
  } catch (e) {
    data.parseError = e.message;
  }

  return data;
}

function parseMyNodeInfo(bytes) {
  const fields = parseMessage(bytes);
  return {
    myNodeNum: fields[1] || 0,
    rebootCount: fields[8] || 0,
  };
}

function parseNodeInfo(bytes) {
  const fields = parseMessage(bytes);
  return {
    num: fields[1] || 0,
    user: fields[2] ? parseUser(fields[2]) : null,
    position: fields[3] ? parsePosition(fields[3]) : null,
    snr: fields[4] ? int32ToFloat(fields[4]) : 0,
    lastHeard: fields[5] || 0,
    deviceMetrics: fields[6] ? parseDeviceMetrics(fields[6]) : null,
    channel: fields[7] || 0,
    viaMqtt: fields[8] || false,
    hopsAway: fields[9] || 0,
    isFavorite: fields[10] || false,
  };
}

function parseUser(bytes) {
  const fields = parseMessage(bytes);
  return {
    id: fields[1] ? new TextDecoder().decode(fields[1]) : '',
    longName: fields[2] ? new TextDecoder().decode(fields[2]) : '',
    shortName: fields[3] ? new TextDecoder().decode(fields[3]) : '',
    macaddr: fields[4] ? bytesToHex(fields[4]) : '',
    hwModel: fields[6] || 0,
    isLicensed: fields[7] || false,
    role: fields[8] || 0,
  };
}

function parsePosition(bytes) {
  const fields = parseMessage(bytes);
  return {
    latitudeI: signedInt(fields[1] || 0),
    longitudeI: signedInt(fields[2] || 0),
    altitude: signedInt(fields[3] || 0),
    time: fields[4] || 0,
    locationSource: fields[5] || 0,
    altitudeSource: fields[6] || 0,
    timestamp: fields[7] || 0,
    timestampMillisAdj: fields[8] || 0,
    altitudeHae: signedInt(fields[9] || 0),
    altitudeGeoidal: signedInt(fields[10] || 0),
    pdop: fields[11] || 0,
    hdop: fields[12] || 0,
    vdop: fields[13] || 0,
    gpsAccuracy: fields[14] || 0,
    groundSpeed: fields[15] || 0,
    groundTrack: fields[16] || 0,
    fixQuality: fields[17] || 0,
    numSatellites: fields[18] || 0,
    fixType: fields[19] || 0,
    precisionBits: fields[20] || 0,
    latitude: (signedInt(fields[1] || 0)) * 1e-7,
    longitude: (signedInt(fields[2] || 0)) * 1e-7,
  };
}

function parseTelemetry(bytes) {
  const fields = parseMessage(bytes);
  const telemetry = {
    time: fields[1] || 0,
  };

  if (fields[2]) {
    // DeviceMetrics
    telemetry.deviceMetrics = parseDeviceMetrics(fields[2]);
  }
  if (fields[3]) {
    // EnvironmentMetrics
    telemetry.environmentMetrics = parseEnvironmentMetrics(fields[3]);
  }
  if (fields[5]) {
    // PowerMetrics
    telemetry.powerMetrics = parsePowerMetrics(fields[5]);
  }

  return telemetry;
}

function parseDeviceMetrics(bytes) {
  const fields = parseMessage(bytes);
  return {
    batteryLevel: fields[1] || 0,
    voltage: fields[2] ? int32ToFloat(fields[2]) : 0,
    channelUtilization: fields[3] ? int32ToFloat(fields[3]) : 0,
    airUtilTx: fields[4] ? int32ToFloat(fields[4]) : 0,
    uptimeSeconds: fields[5] || 0,
    numPacketsTx: fields[6] || 0,
    numPacketsRx: fields[7] || 0,
    numOnlineNodes: fields[8] || 0,
    numTotalNodes: fields[9] || 0,
  };
}

function parseEnvironmentMetrics(bytes) {
  const fields = parseMessage(bytes);
  return {
    temperature: fields[1] ? int32ToFloat(fields[1]) : null,
    relativeHumidity: fields[2] ? int32ToFloat(fields[2]) : null,
    barometricPressure: fields[3] ? int32ToFloat(fields[3]) : null,
    gasResistance: fields[4] ? int32ToFloat(fields[4]) : null,
    voltage: fields[5] ? int32ToFloat(fields[5]) : null,
    current: fields[6] ? int32ToFloat(fields[6]) : null,
    iaq: fields[7] || null,
    distance: fields[8] ? int32ToFloat(fields[8]) : null,
    lux: fields[9] ? int32ToFloat(fields[9]) : null,
    windDirection: fields[10] ? int32ToFloat(fields[10]) : null,
    windSpeed: fields[11] ? int32ToFloat(fields[11]) : null,
    weight: fields[12] ? int32ToFloat(fields[12]) : null,
    windGust: fields[13] ? int32ToFloat(fields[13]) : null,
    windLull: fields[14] ? int32ToFloat(fields[14]) : null,
  };
}

function parsePowerMetrics(bytes) {
  const fields = parseMessage(bytes);
  return {
    ch1Voltage: fields[1] ? int32ToFloat(fields[1]) : null,
    ch1Current: fields[2] ? int32ToFloat(fields[2]) : null,
    ch2Voltage: fields[3] ? int32ToFloat(fields[3]) : null,
    ch2Current: fields[4] ? int32ToFloat(fields[4]) : null,
    ch3Voltage: fields[5] ? int32ToFloat(fields[5]) : null,
    ch3Current: fields[6] ? int32ToFloat(fields[6]) : null,
  };
}

function parseDeviceMetadata(bytes) {
  const fields = parseMessage(bytes);
  return {
    firmwareVersion: fields[1] ? new TextDecoder().decode(fields[1]) : '',
    deviceStateVersion: fields[2] || 0,
    canShutdown: fields[3] || false,
    hasWifi: fields[4] || false,
    hasBluetooth: fields[5] || false,
    hasEthernet: fields[6] || false,
    role: fields[7] || 0,
    positionFlags: fields[8] || 0,
    hwModel: fields[9] || 0,
    hasRemoteHardware: fields[10] || false,
  };
}

// Core protobuf parser
function parseMessage(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    bytes = new Uint8Array(bytes);
  }
  const fields = {};
  let pos = 0;

  while (pos < bytes.length) {
    const tagByte = readVarint(bytes, pos);
    if (tagByte === null) break;
    pos += tagByte.len;

    const fieldNumber = tagByte.value >>> 3;
    const wireType = tagByte.value & 0x7;

    if (wireType === WIRE_VARINT) {
      const val = readVarint(bytes, pos);
      if (!val) break;
      pos += val.len;
      fields[fieldNumber] = val.value;
    } else if (wireType === WIRE_LEN) {
      const lenVal = readVarint(bytes, pos);
      if (!lenVal) break;
      pos += lenVal.len;
      const len = lenVal.value;
      if (pos + len > bytes.length) break;
      fields[fieldNumber] = bytes.slice(pos, pos + len);
      pos += len;
    } else if (wireType === WIRE_32BIT) {
      if (pos + 4 > bytes.length) break;
      const view = new DataView(bytes.buffer, bytes.byteOffset + pos, 4);
      fields[fieldNumber] = view.getUint32(0, true);
      pos += 4;
    } else if (wireType === WIRE_64BIT) {
      pos += 8; // skip 64-bit fields for now
    } else {
      break; // unknown wire type, stop parsing
    }
  }

  return fields;
}

function readVarint(bytes, pos) {
  let result = 0;
  let shift = 0;
  let len = 0;

  while (pos + len < bytes.length) {
    const byte = bytes[pos + len];
    result |= (byte & 0x7f) << shift;
    len++;
    shift += 7;
    if ((byte & 0x80) === 0) {
      return { value: result >>> 0, len };
    }
    if (shift >= 32) {
      // Handle large varints (use only lower 32 bits)
      while (pos + len < bytes.length && (bytes[pos + len] & 0x80) !== 0) {
        len++;
      }
      len++;
      return { value: result >>> 0, len };
    }
  }
  return null;
}

function signedInt(value) {
  return value | 0; // Convert to signed 32-bit int
}

function int32ToFloat(value) {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setUint32(0, value, true);
  return new DataView(buf).getFloat32(0, true);
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(':');
}