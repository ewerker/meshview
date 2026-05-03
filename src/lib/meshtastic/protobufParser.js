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

    if (fields[2]) {
      result.type = 'packet';
      result.packet = parseMeshPacket(fields[2]);
    } else if (fields[3]) {
      result.type = 'myInfo';
      result.myInfo = parseMyNodeInfo(fields[3]);
    } else if (fields[4]) {
      result.type = 'nodeInfo';
      result.nodeInfo = parseNodeInfo(fields[4]);
    } else if (fields[5]) {
      result.type = 'config';
      result.config = parseConfig(fields[5]);
    } else if (fields[6]) {
      result.type = 'logRecord';
      result.logRecord = parseLogRecord(fields[6]);
    } else if (fields[7] !== undefined) {
      result.type = 'configComplete';
      result.configCompleteId = fields[7];
    } else if (fields[8] !== undefined) {
      result.type = 'rebooted';
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
    } else if (fields[1]) {
      result.type = 'ack';
    }
    
    if (fields[1] !== undefined) {
      result.id = fields[1];
    }

    return result;
  } catch (e) {
    return { type: 'error', error: e.message };
  }
}

function parseMeshPacket(bytes) {
  // mesh.proto MeshPacket field numbers:
  // 1=from, 2=to, 3=channel, 4=decoded(Data), 5=encrypted, 6=id, 7=rx_time,
  // 8=rx_snr(float), 9=hop_limit, 10=want_ack, 11=priority, 12=rx_rssi,
  // 13=delayed, 14=via_mqtt, 15=hop_start, 16=public_key, 17=pki_encrypted,
  // 18=next_hop, 19=relay_node, 20=tx_after, 21=transport_mechanism
  const fields = parseMessage(bytes);
  const transportMechanism = fields[21] ?? null;
  const transportNames = { 0: 'TRANSPORT_UNKNOWN', 1: 'TRANSPORT_LORA', 2: 'TRANSPORT_MQTT', 3: 'TRANSPORT_HAM' };
  const packet = {
    from: fields[1] || 0,
    to: fields[2] || 0,
    channel: fields[3] || 0,
    id: fields[6] || 0,
    rxTime: fields[7] || 0,
    rxSnr: fields[8] !== undefined ? int32ToFloat(fields[8]) : 0,
    hopLimit: fields[9] ?? 0,
    wantAck: !!fields[10],
    priority: fields[11] ?? null,
    rxRssi: signedInt(fields[12] || 0),
    delayed: fields[13] ?? null,
    viaMqtt: !!fields[14],
    hopStart: fields[15] ?? null,
    publicKey: fields[16] || null,
    pkiEncrypted: !!fields[17],
    nextHop: fields[18] ?? null,
    relayNode: fields[19] ?? null,
    txAfter: fields[20] ?? null,
    transportMechanism,
    transportMechanismName: transportMechanism !== null ? (transportNames[transportMechanism] || `TRANSPORT_${transportMechanism}`) : null,
    decoded: null,
    encrypted: fields[5] || null,
  };

  // hops travelled = hop_start - hop_limit (only meaningful if both present)
  if (typeof packet.hopStart === 'number' && typeof packet.hopLimit === 'number') {
    packet.hopsAway = Math.max(0, packet.hopStart - packet.hopLimit);
  }

  if (fields[4]) {
    packet.decoded = parseData(fields[4]);
  }

  return packet;
}

export function parseData(bytes) {
  const fields = parseMessage(bytes);
  const portnum = fields[1] || 0;
  const payload = fields[2] || new Uint8Array(0);

  const data = {
    portnum,
    portnumName: PortNum[portnum] || `UNKNOWN(${portnum})`,
    payload,
    requestId: fields[6] || 0,   // Data.request_id — set by acks/replies that reference an originating packet id
    replyId: fields[7] || 0,     // Data.reply_id — set by replies to a previous packet
    wantResponse: fields[5] || false,
  };

  try {
    if (portnum === 1) {
      // TEXT_MESSAGE_APP
      data.text = new TextDecoder().decode(payload);
    } else if (portnum === 3) {
      // REMOTE_HARDWARE_APP
      data.hardware = parseRemoteHardware(payload);
    } else if (portnum === 4) {
      // POSITION_APP
      data.position = parsePosition(payload);
    } else if (portnum === 5) {
      // NODEINFO_APP
      data.user = parseUser(payload);
    } else if (portnum === 6) {
      // ROUTING_APP
      data.routing = parseRouting(payload);
    } else if (portnum === 9) {
      // WAYPOINT_APP
      data.waypoint = parseWaypoint(payload);
    } else if (portnum === 34) {
      // PAXCOUNTER_APP
      data.paxcounter = parsePaxcounter(payload);
    } else if (portnum === 64 || portnum === 66) {
      // SERIAL_APP / RANGE_TEST_APP
      data.payloadText = decodePrintableText(payload);
    } else if (portnum === 67) {
      // TELEMETRY_APP
      data.telemetry = parseTelemetry(payload);
    } else if (portnum === 70) {
      // TRACEROUTE_APP
      data.traceroute = parseTraceroute(payload);
    } else if (portnum === 71) {
      // NEIGHBORINFO_APP
      data.neighborInfo = parseNeighborInfo(payload);
    }

    data.analysis = buildAppAnalysis(portnum, data, payload);
  } catch (e) {
    data.parseError = e.message;
  }

  return data;
}

function buildAppAnalysis(portnum, data, payload) {
  const portName = data.portnumName;
  if (data.text) return { app: portName, summary: `Textnachricht: ${data.text}`, decoded: { text: data.text } };
  if (data.position) return { app: portName, summary: `Position: ${data.position.latitude?.toFixed(5)}, ${data.position.longitude?.toFixed(5)}`, decoded: data.position };
  if (data.user) return { app: portName, summary: `NodeInfo: ${data.user.longName || data.user.id || 'unbekannt'}`, decoded: data.user };
  if (data.telemetry) return { app: portName, summary: summarizeTelemetry(data.telemetry), decoded: data.telemetry };
  if (data.hardware) return { app: portName, summary: data.hardware.summary, decoded: data.hardware };
  if (data.routing) return { app: portName, summary: data.routing.summary, decoded: data.routing };
  if (data.waypoint) return { app: portName, summary: data.waypoint.summary, decoded: data.waypoint };
  if (data.paxcounter) return { app: portName, summary: data.paxcounter.summary, decoded: data.paxcounter };
  if (data.traceroute) return { app: portName, summary: data.traceroute.summary, decoded: data.traceroute };
  if (data.neighborInfo) return { app: portName, summary: data.neighborInfo.summary, decoded: data.neighborInfo };
  if (data.payloadText) return { app: portName, summary: `${portName}: ${data.payloadText.slice(0, 80)}`, decoded: { text: data.payloadText } };

  const rawFields = rawFieldSummary(parseMessage(payload));
  return { app: portName, summary: `${portName}: ${payload.length} Bytes Payload`, decoded: rawFields };
}

function summarizeTelemetry(telemetry) {
  if (telemetry.deviceMetrics) return `Telemetrie: Batterie ${telemetry.deviceMetrics.batteryLevel || 0}% · ${telemetry.deviceMetrics.voltage?.toFixed?.(2) || '-'}V`;
  if (telemetry.environmentMetrics) return `Umgebung: ${telemetry.environmentMetrics.temperature?.toFixed?.(1) ?? '-'}°C · ${telemetry.environmentMetrics.relativeHumidity?.toFixed?.(0) ?? '-'}%`;
  if (telemetry.powerMetrics) return 'Power-Telemetrie empfangen';
  return 'Telemetrie empfangen';
}

function parseRemoteHardware(bytes) {
  const fields = parseMessage(bytes);
  const typeNames = { 0: 'Unbekannt', 1: 'GPIO lesen', 2: 'GPIO schreiben', 3: 'GPIO beobachten', 4: 'GPIO geändert' };
  return {
    type: fields[1] ?? null,
    typeName: typeNames[fields[1]] || `Typ ${fields[1] ?? '?'}`,
    gpioMask: fields[2] ?? null,
    gpioValue: fields[3] ?? null,
    rawFields: rawFieldSummary(fields),
    summary: `Hardware: ${typeNames[fields[1]] || `Typ ${fields[1] ?? '?'}`} · Maske ${fields[2] ?? '-'} · Wert ${fields[3] ?? '-'}`,
  };
}

function parseRouting(bytes) {
  const fields = parseMessage(bytes);
  const errorNames = { 0: 'Kein Fehler', 1: 'Kein Interface', 2: 'Max Retransmit', 3: 'Keine Route', 4: 'Kein Kanal', 5: 'Zu groß', 6: 'Kein Antwortweg', 7: 'Duty Cycle Limit', 8: 'Bad Request', 32: 'PKI verschlüsselt', 33: 'PKI Signatur ungültig' };
  return {
    errorReason: fields[1] ?? null,
    errorText: errorNames[fields[1]] || (fields[1] !== undefined ? `Fehler ${fields[1]}` : null),
    rawFields: rawFieldSummary(fields),
    summary: fields[1] !== undefined ? `Routing: ${errorNames[fields[1]] || `Fehler ${fields[1]}`}` : 'Routing: Daten empfangen',
  };
}

function parseWaypoint(bytes) {
  const fields = parseMessage(bytes);
  const waypoint = {
    id: fields[1] ?? null,
    latitudeI: signedInt(fields[2] || 0),
    longitudeI: signedInt(fields[3] || 0),
    expire: fields[4] ?? null,
    lockedTo: fields[5] ?? null,
    name: stringValue(fields[6]),
    description: stringValue(fields[7]),
    icon: fields[8] ?? null,
    rawFields: rawFieldSummary(fields),
  };
  waypoint.latitude = waypoint.latitudeI * 1e-7;
  waypoint.longitude = waypoint.longitudeI * 1e-7;
  waypoint.summary = `Waypoint: ${waypoint.name || waypoint.id || '?'} · ${waypoint.latitude.toFixed(5)}, ${waypoint.longitude.toFixed(5)}`;
  return waypoint;
}

function parsePaxcounter(bytes) {
  const fields = parseMessage(bytes);
  return {
    wifi: fields[1] ?? null,
    ble: fields[2] ?? null,
    uptime: fields[3] ?? null,
    rawFields: rawFieldSummary(fields),
    summary: `Paxcounter: WLAN ${fields[1] ?? '-'} · BLE ${fields[2] ?? '-'}`,
  };
}

function parseTraceroute(bytes) {
  const fields = parseMessage(bytes);
  const route = Array.isArray(fields[1]) ? fields[1] : (fields[1] !== undefined ? [fields[1]] : []);
  const snrTowards = Array.isArray(fields[2]) ? fields[2] : (fields[2] !== undefined ? [fields[2]] : []);
  return {
    route,
    snrTowards,
    rawFields: rawFieldSummary(fields),
    summary: route.length ? `Traceroute: ${route.length} Hop(s)` : 'Traceroute: Daten empfangen',
  };
}

function parseNeighborInfo(bytes) {
  const fields = parseMessage(bytes);
  return {
    nodeBroadcastIntervalSecs: fields[1] ?? null,
    neighbors: fields[2] ? 'vorhanden' : null,
    rawFields: rawFieldSummary(fields),
    summary: `Nachbar-Info: Intervall ${fields[1] ?? '-'}s`,
  };
}

function decodePrintableText(bytes) {
  if (!bytes?.length) return '';
  const text = new TextDecoder().decode(bytes).replace(/\u0000/g, '').trim();
  return /^[\x09\x0a\x0d\x20-\x7eäöüÄÖÜß€§°µ²³\-_:;,.!?/()[\]{}@#%&+=*'"\\|<>\r\n\t]+$/.test(text) ? text : '';
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
    hwModel: fields[5] || 0,
    isLicensed: fields[6] || false,
    role: fields[7] || 0,
    publicKey: fields[8] || null,
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
      const rawFields = parseMessage(fields[fieldNum]);
      return { type: name, raw: fields[fieldNum], fields: rawFields, values: parseConfigValues(name, rawFields) };
    }
  }
  return { type: 'Unknown' };
}

function parseModuleConfig(bytes) {
  const fields = parseMessage(bytes);
  for (const [fieldNum, name] of Object.entries(MODULE_CONFIG_NAMES)) {
    if (fields[fieldNum]) {
      const rawFields = parseMessage(fields[fieldNum]);
      return { type: name, raw: fields[fieldNum], fields: rawFields, values: parseModuleConfigValues(name, rawFields) };
    }
  }
  return { type: 'Unknown' };
}

function parseConfigValues(name, fields) {
  const common = {
    Device: {
      role: fields[1] ?? null,
      serialEnabled: boolValue(fields[2]),
      buttonGpio: fields[3] ?? null,
      buzzerGpio: fields[4] ?? null,
      rebroadcastMode: fields[5] ?? null,
      nodeInfoBroadcastSecs: fields[6] ?? null,
    },
    Position: {
      positionBroadcastSecs: fields[1] ?? null,
      smartPositionEnabled: boolValue(fields[2]),
      fixedPosition: boolValue(fields[3]),
      gpsEnabled: boolValue(fields[4]),
      gpsUpdateInterval: fields[5] ?? null,
      gpsAttemptTime: fields[6] ?? null,
      broadcastSmartMinimumDistance: fields[7] ?? null,
      broadcastSmartMinimumIntervalSecs: fields[8] ?? null,
    },
    Power: {
      waitBluetoothSecs: fields[1] ?? null,
      sdsSecs: fields[2] ?? null,
      lsSecs: fields[3] ?? null,
      minWakeSecs: fields[4] ?? null,
      deviceBatteryInaAddress: fields[5] ?? null,
      powermonEnabled: boolValue(fields[6]),
    },
    Network: {
      wifiEnabled: boolValue(fields[1]),
      wifiSsid: stringValue(fields[3]),
      wifiPsk: stringValue(fields[4]),
      ntpServer: stringValue(fields[5]),
      ethernetEnabled: boolValue(fields[6]),
      rsyslogServer: stringValue(fields[8]),
    },
    Display: {
      screenOnSecs: fields[1] ?? null,
      gpsFormat: fields[2] ?? null,
      autoScreenCarouselSecs: fields[3] ?? null,
      compassNorthTop: boolValue(fields[4]),
      flipScreen: boolValue(fields[5]),
      units: fields[6] ?? null,
    },
    LoRa: {
      usePreset: boolValue(fields[1]),
      modemPreset: fields[2] ?? null,
      region: fields[3] ?? null,
      bandwidth: fields[4] ?? null,
      spreadFactor: fields[5] ?? null,
      codingRate: fields[6] ?? null,
      frequencyOffset: fields[7] ?? null,
      hopLimit: fields[8] ?? null,
      txEnabled: boolValue(fields[9]),
      txPower: fields[10] ?? null,
      channelNum: fields[11] ?? null,
      overrideDutyCycle: boolValue(fields[12]),
      sx126xRxBoostedGain: boolValue(fields[13]),
    },
    Bluetooth: {
      enabled: boolValue(fields[1]),
      mode: bluetoothModeName(fields[2]),
      fixedPin: fields[3] || null,
    },
    Security: {
      publicKey: fields[1] ? 'vorhanden' : '',
      privateKey: fields[2] ? 'vorhanden' : '',
      adminKey: fields[3] ? 'vorhanden' : '',
      serialEnabled: boolValue(fields[4]),
      debugLogApiEnabled: boolValue(fields[5]),
    },
  };

  return common[name] || rawFieldSummary(fields);
}

function parseModuleConfigValues(name, fields) {
  const common = {
    MQTT: {
      enabled: boolValue(fields[1]),
      address: stringValue(fields[2]),
      username: stringValue(fields[3]),
      password: fields[4] ? '••••••••' : '',
      encryptionEnabled: boolValue(fields[5]),
      jsonEnabled: boolValue(fields[6]),
      tlsEnabled: boolValue(fields[7]),
      rootTopic: stringValue(fields[8]),
      proxyToClientEnabled: boolValue(fields[9]),
    },
    Serial: {
      enabled: boolValue(fields[1]),
      echo: boolValue(fields[2]),
      rxd: fields[3] ?? null,
      txd: fields[4] ?? null,
      baud: fields[5] ?? null,
      timeout: fields[6] ?? null,
      mode: fields[7] ?? null,
    },
    StoreForward: {
      enabled: boolValue(fields[1]),
      heartbeat: boolValue(fields[2]),
      records: fields[3] ?? null,
      historyReturnMax: fields[4] ?? null,
      historyReturnWindow: fields[5] ?? null,
    },
    RangeTest: {
      enabled: boolValue(fields[1]),
      sender: fields[2] ?? null,
      save: boolValue(fields[3]),
    },
    Telemetry: {
      deviceUpdateInterval: fields[1] ?? null,
      environmentUpdateInterval: fields[2] ?? null,
      environmentMeasurementEnabled: boolValue(fields[3]),
      environmentScreenEnabled: boolValue(fields[4]),
      powerMeasurementEnabled: boolValue(fields[5]),
      powerUpdateInterval: fields[6] ?? null,
    },
    NeighborInfo: {
      enabled: boolValue(fields[1]),
      updateInterval: fields[2] ?? null,
      transmitOverLora: boolValue(fields[3]),
    },
    Paxcounter: {
      enabled: boolValue(fields[1]),
      paxcounterUpdateInterval: fields[2] ?? null,
    },
  };

  return common[name] || rawFieldSummary(fields);
}

function rawFieldSummary(fields) {
  return Object.fromEntries(Object.keys(fields).map(key => [`Feld ${key}`, formatRawField(fields[key])]));
}

function formatRawField(value) {
  if (value instanceof Uint8Array) return value.length > 0 ? `${value.length} Bytes` : '';
  return value;
}

function stringValue(value) {
  return value instanceof Uint8Array ? new TextDecoder().decode(value) : '';
}

function boolValue(value) {
  if (value === undefined || value === null) return null;
  return value === true || value === 1;
}

function bluetoothModeName(value) {
  const names = { 0: 'Festes PIN', 1: 'Zufälliger PIN', 2: 'Kein PIN' };
  return names[value] || `Modus ${value ?? '?'}`;
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