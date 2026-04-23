// Autoresponder Engine for Meshtastic
// Handles rule matching, template rendering, and sending replies

const STORAGE_KEY = 'meshtastic_autoresponder';

export function loadRules() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveRules(rules) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function defaultRule() {
  return {
    id: Date.now().toString(),
    name: 'Neue Regel',
    enabled: true,
    template: 'Hallo {{sender.longName}}! Hier ist {{my.longName}}. SNR: {{msg.snr}} dB, RSSI: {{msg.rssi}} dBm.',
    cooldownSeconds: 60,
    filters: {
      // Text filter
      textContains: '',
      textMatchMode: 'any', // 'any' | 'contains' | 'startsWith' | 'regex'
      // Sender filter
      senderNameContains: '',
      senderNodeIds: '', // comma separated node IDs like !abcdef01,!12345678
      // Signal filter
      minSnr: '',
      maxSnr: '',
      minRssi: '',
      maxRssi: '',
      // Distance filter (requires GPS on both ends)
      maxDistanceKm: '',
      // Hops filter
      maxHops: '',
      // Reply target
      replyTo: 'sender', // 'sender' | 'broadcast'
    },
    _lastTriggered: {}, // nodeNum -> timestamp
  };
}

/**
 * Render a template string with context variables.
 *
 * Available variables:
 * Sender node:
 *   {{sender.longName}}  {{sender.shortName}}  {{sender.id}}
 *   {{sender.hwModel}}   {{sender.lat}}         {{sender.lon}}
 *   {{sender.alt}}       {{sender.battery}}     {{sender.voltage}}
 *   {{sender.temp}}      {{sender.humidity}}    {{sender.pressure}}
 *   {{sender.uptime}}    {{sender.channelUtil}} {{sender.txAirUtil}}
 *
 * My node:
 *   {{my.longName}}  {{my.shortName}}  {{my.id}}
 *   {{my.lat}}       {{my.lon}}        {{my.alt}}
 *   {{my.battery}}   {{my.voltage}}    {{my.uptime}}
 *
 * Message:
 *   {{msg.text}}   {{msg.snr}}  {{msg.rssi}}  {{msg.hops}}
 *   {{msg.time}}   {{msg.distKm}}
 */
export function renderTemplate(template, { senderNode, myNode, message, distKm }) {
  const fmt = (v, digits = 1) => (v !== null && v !== undefined && !isNaN(v)) ? Number(v).toFixed(digits) : '–';

  const vars = {
    // Sender
    'sender.longName': senderNode?.user?.longName || senderNode?.user?.id || '–',
    'sender.shortName': senderNode?.user?.shortName || '–',
    'sender.id': senderNode?.user?.id || (senderNode?.num ? `!${senderNode.num.toString(16).padStart(8,'0')}` : '–'),
    'sender.hwModel': senderNode?.user?.hwModel ?? '–',
    'sender.lat': fmt(senderNode?.position?.latitude, 5),
    'sender.lon': fmt(senderNode?.position?.longitude, 5),
    'sender.alt': fmt(senderNode?.position?.altitude, 0),
    'sender.battery': senderNode?.deviceMetrics?.batteryLevel ?? '–',
    'sender.voltage': fmt(senderNode?.deviceMetrics?.voltage, 2),
    'sender.temp': fmt(senderNode?.environmentMetrics?.temperature, 1),
    'sender.humidity': fmt(senderNode?.environmentMetrics?.relativeHumidity, 0),
    'sender.pressure': fmt(senderNode?.environmentMetrics?.barometricPressure, 0),
    'sender.uptime': formatUptime(senderNode?.deviceMetrics?.uptimeSeconds),
    'sender.channelUtil': fmt(senderNode?.deviceMetrics?.channelUtilization, 1),
    'sender.txAirUtil': fmt(senderNode?.deviceMetrics?.airUtilTx, 1),
    // My node
    'my.longName': myNode?.user?.longName || myNode?.user?.id || '–',
    'my.shortName': myNode?.user?.shortName || '–',
    'my.id': myNode?.user?.id || (myNode?.num ? `!${myNode.num.toString(16).padStart(8,'0')}` : '–'),
    'my.lat': fmt(myNode?.position?.latitude, 5),
    'my.lon': fmt(myNode?.position?.longitude, 5),
    'my.alt': fmt(myNode?.position?.altitude, 0),
    'my.battery': myNode?.deviceMetrics?.batteryLevel ?? '–',
    'my.voltage': fmt(myNode?.deviceMetrics?.voltage, 2),
    'my.uptime': formatUptime(myNode?.deviceMetrics?.uptimeSeconds),
    // Message
    'msg.text': message?.text || '',
    'msg.snr': fmt(message?.rxSnr, 1),
    'msg.rssi': message?.rxRssi ?? '–',
    'msg.hops': message?.hopsAway ?? '–',
    'msg.time': message?.time ? new Date(message.time).toLocaleTimeString('de-DE') : '–',
    'msg.distKm': distKm !== null && distKm !== undefined ? fmt(distKm, 2) : '–',
  };

  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const k = key.trim();
    return k in vars ? vars[k] : `{{${k}}}`;
  });
}

function formatUptime(seconds) {
  if (!seconds) return '–';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}min`;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function matchesRule(rule, message, senderNode, myNode) {
  const f = rule.filters;

  // --- Text filter ---
  if (f.textContains?.trim()) {
    const needle = f.textContains.trim();
    const haystack = message.text || '';
    if (f.textMatchMode === 'contains' && !haystack.toLowerCase().includes(needle.toLowerCase())) return false;
    if (f.textMatchMode === 'startsWith' && !haystack.toLowerCase().startsWith(needle.toLowerCase())) return false;
    if (f.textMatchMode === 'regex') {
      try { if (!new RegExp(needle, 'i').test(haystack)) return false; } catch { return false; }
    }
    // 'any' = no text filter if set to any, but if textContains is set, default to contains
    if (f.textMatchMode === 'any' && !haystack.toLowerCase().includes(needle.toLowerCase())) return false;
  }

  // --- Sender name filter ---
  if (f.senderNameContains?.trim()) {
    const name = (senderNode?.user?.longName || '') + ' ' + (senderNode?.user?.shortName || '');
    if (!name.toLowerCase().includes(f.senderNameContains.toLowerCase())) return false;
  }

  // --- Sender Node ID filter ---
  if (f.senderNodeIds?.trim()) {
    const ids = f.senderNodeIds.split(',').map(s => s.trim().toLowerCase().replace(/^!/, ''));
    const senderHex = senderNode?.num?.toString(16).padStart(8, '0') || '';
    const senderId = senderNode?.user?.id?.replace(/^!/, '') || '';
    if (!ids.some(id => senderHex.includes(id) || senderId.includes(id))) return false;
  }

  // --- Signal filters ---
  if (f.minSnr !== '' && f.minSnr !== undefined) {
    if ((message.rxSnr ?? -999) < parseFloat(f.minSnr)) return false;
  }
  if (f.maxSnr !== '' && f.maxSnr !== undefined) {
    if ((message.rxSnr ?? 999) > parseFloat(f.maxSnr)) return false;
  }
  if (f.minRssi !== '' && f.minRssi !== undefined) {
    if ((message.rxRssi ?? -999) < parseFloat(f.minRssi)) return false;
  }
  if (f.maxRssi !== '' && f.maxRssi !== undefined) {
    if ((message.rxRssi ?? 999) > parseFloat(f.maxRssi)) return false;
  }

  // --- Hops filter ---
  if (f.maxHops !== '' && f.maxHops !== undefined) {
    if ((senderNode?.hopsAway ?? 999) > parseInt(f.maxHops)) return false;
  }

  // --- Distance filter ---
  if (f.maxDistanceKm !== '' && f.maxDistanceKm !== undefined) {
    const dist = haversineKm(
      myNode?.position?.latitude, myNode?.position?.longitude,
      senderNode?.position?.latitude, senderNode?.position?.longitude
    );
    if (dist === null || dist > parseFloat(f.maxDistanceKm)) return false;
  }

  return true;
}

export function checkCooldown(rule, senderNum) {
  const last = rule._lastTriggered?.[senderNum];
  if (!last) return true;
  const elapsed = (Date.now() - last) / 1000;
  return elapsed >= (rule.cooldownSeconds || 60);
}

export function updateCooldown(rule, senderNum) {
  if (!rule._lastTriggered) rule._lastTriggered = {};
  rule._lastTriggered[senderNum] = Date.now();
}