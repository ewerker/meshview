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

    const result = { type: 'unknown', raw: fields };

    if (fields[1]) {
      result.type = 'packet';
      result.packet = parseMeshPacket(fields[1]);
    } else if (fields[3]) {
      result.type = 'myInfo';
      result.myInfo = parseMyNodeInfo(fields[3]);
    } else if (fields[4]) {
      result.type = 'nodeInfo';
      result.nodeInfo = parseNodeInfo(fields[4]);
    } else if (fields[6]) {
      result.type = 'config';
      result.config = parseConfig(fields[6]);
    } else if (fields[7]) {
      result.type = 'logRecord';
      result.logRecord = parseLogRecord(fields[7]);
    } else if (fields[8] !== undefined) {
      result.type = 'configComplete';
      result.configCompleteId = fields[8];
    } else if (fields[9]) {
      result.type = 'moduleConfig';
      result.moduleConfig = parseModuleConfig(fields[9]);
    } else if (fields[10]) {
      result.type = 'channel';
      result.channel = parseChannel(fields[10]);
    } else if (fields[11]) {
      result.type = 'queueStatus';
      result.queueStatus = parseQueueStatus(fields[11]);
    } else if (fields[12]) {
      result.type = 'xmodemPacket';
    } else if (fields[13]) {
      result.type = 'metadata';
      result.metadata = parseDeviceMetadata(fields[13]);
    } else if (fields[14]) {
      result.type = 'mqttClientProxyMessage';
    } else if (fields[15]) {
      result.type = 'fileInfo';
    } else if (fields[16]) {
      result.type = 'clientNotification';
    }

    return result;
  } catch (e) {
    return { type: 'error', error: e.message };
  }
}

function parseMeshPacket(bytes) {
  const fields = parseMessage(bytes);
  const packet = {
    from: fields[1] || 0,
    to: fields[2] || 0,
    id: fields[6] || 0,
    rxTime: fields[9] || 0,
    rxSnr: fields[13] ? int32ToFloat(fields[13]) : 0,
    hopLimit: fields[10] || 0,
    rxRssi: signedInt(fields[14] || 0),
    viaMqtt: fields[15] || false,
    decoded: null,
  };

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

// Config names for display
const CONFIG_NAMES = {
  1: 'Device', 2: 'Position', 3: 'Power', 4: 'Network',
  5: 'Display', 6: 'LoRa', 7: 'Bluetooth', 8: 'Security',
  9: 'SessionKey',
};

const MODULE_CONFIG_NAMES = {
  1: 'MQTT', 2: 'Serial', 3: 'ExternalNotification', 4: 'StoreForward',
  5: 'RangeTest', 6: 'Telemetry', 7: 'CannedMessage', 8: 'Audio',
  9: 'RemoteHardware', 10: 'NeighborInfo', 11: 'AmbientLighting',
  12: 'DetectionSensor', 13: 'Paxcounter',
};

function parseConfig(bytes) {
  const fields = parseMessage(bytes);
  // Config is a oneof - find which config type is present
  for (const [fieldNum, name] of Object.entries(CONFIG_NAMES)) {
    if (fields[fieldNum]) {
      return { type: name, raw: fields[fieldNum] };
    }
  }
  return { type: 'Unknown' };
}

function parseModuleConfig(bytes) {
  const fields = parseMessage(bytes);
  for (const [fieldNum, name] of Object.entries(MODULE_CONFIG_NAMES)) {
    if (fields[fieldNum]) {
      return { type: name, raw: fields[fieldNum] };
    }
  }
  return { type: 'Unknown' };
}

function parseChannel(bytes) {
  const fields = parseMessage(bytes);
  return {
    index: fields[1] || 0,
    settings: fields[2] ? parseChannelSettings(fields[2]) : null,
    role: fields[3] || 0, // 0=DISABLED, 1=PRIMARY, 2=SECONDARY
  };
}

function parseChannelSettings(bytes) {
  const fields = parseMessage(bytes);
  return {
    channelNum: fields[1] || 0,
    psk: fields[2] || null,
    name: fields[3] ? new TextDecoder().decode(fields[3]) : '',
    id: fields[4] || 0,
    uplinkEnabled: fields[5] || false,
    downlinkEnabled: fields[6] || false,
  };
}

function parseQueueStatus(bytes) {
  const fields = parseMessage(bytes);
  return {
    res: fields[1] || 0,
    free: fields[2] || 0,
    maxlen: fields[3] || 0,
    meshPacketId: fields[4] || 0,
  };
}

function parseLogRecord(bytes) {
  const fields = parseMessage(bytes);
  return {
    message: fields[1] ? new TextDecoder().decode(fields[1]) : '',
    time: fields[2] || 0,
    source: fields[3] ? new TextDecoder().decode(fields[3]) : '',
    level: fields[4] || 0, // 0=UNSET, 1=CRITICAL, 5=DEBUG, 10=TRACE, 50=INFO, 100=WARNING, 200=ERROR
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