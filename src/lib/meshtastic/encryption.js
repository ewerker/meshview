const DEFAULT_PSK = new Uint8Array([
  0xd4, 0xf1, 0xbb, 0x3a, 0x20, 0x29, 0x07, 0x59,
  0xf0, 0xbc, 0xff, 0xab, 0xcf, 0x4e, 0x69, 0x01,
]);

function hexToBytes(hex) {
  const clean = String(hex || '').replace(/[^a-fA-F0-9]/g, '');
  if (!clean) return null;
  return new Uint8Array(clean.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

function base64ToBytes(value) {
  const binary = atob(value);
  return new Uint8Array([...binary].map(char => char.charCodeAt(0)));
}

function normalizePsk(psk) {
  if (!psk) return null;
  let bytes = null;

  if (psk.hex) bytes = hexToBytes(psk.hex);
  else if (typeof psk === 'string') bytes = base64ToBytes(psk);

  if (!bytes?.length) return null;
  if (bytes.length === 1) {
    if (bytes[0] === 0) return new Uint8Array(0);
    const expanded = new Uint8Array(DEFAULT_PSK);
    expanded[expanded.length - 1] = (expanded[expanded.length - 1] + bytes[0] - 1) & 0xff;
    return expanded;
  }
  if (bytes.length < 16) {
    const padded = new Uint8Array(16);
    padded.set(bytes);
    return padded;
  }
  if (bytes.length > 16 && bytes.length < 32) {
    const padded = new Uint8Array(32);
    padded.set(bytes);
    return padded;
  }
  return bytes;
}

function xorHash(value) {
  let hash = 0;
  for (const byte of value) hash ^= byte;
  return hash;
}

function channelNameBytes(channel) {
  return new TextEncoder().encode(channel?.settings?.name || '');
}

function getChannels(deviceConfigs) {
  return (deviceConfigs || [])
    .filter(config => config.category === 'channel')
    .map(config => config.payload)
    .filter(Boolean);
}

function getPrimaryChannel(channels) {
  return channels.find(channel => channel.role === 1) || channels.find(channel => channel.index === 0) || null;
}

export function getChannelKey(channel, primaryChannel) {
  const ownKey = normalizePsk(channel?.settings?.psk);
  if (ownKey?.length || channel?.role !== 2) return ownKey;
  return normalizePsk(primaryChannel?.settings?.psk);
}

export function getChannelHash(channel, primaryChannel) {
  const key = getChannelKey(channel, primaryChannel);
  if (!key) return null;
  return (xorHash(channelNameBytes(channel)) ^ xorHash(key)) & 0xff;
}

export function resolvePacketChannel(deviceConfigs, packetChannelHash = 0) {
  const channels = getChannels(deviceConfigs);
  const primary = getPrimaryChannel(channels);
  const match = channels.find(channel => getChannelHash(channel, primary) === packetChannelHash);

  if (match) {
    return {
      index: match.index ?? 0,
      hash: packetChannelHash,
      name: match.settings?.name || `Channel ${match.index ?? 0}`,
      psk: getChannelKey(match, primary),
    };
  }

  if (packetChannelHash === 0) {
    return {
      index: 0,
      hash: 0,
      name: primary?.settings?.name || 'LongFast',
      psk: getChannelKey(primary, primary) || DEFAULT_PSK,
    };
  }

  return { index: null, hash: packetChannelHash, name: `Hash ${packetChannelHash}`, psk: null };
}

export function getChannelPsk(deviceConfigs, channelIndex = 0) {
  const channels = getChannels(deviceConfigs);
  const primary = getPrimaryChannel(channels);
  const target = channels.find(channel => channel.index === channelIndex);
  return getChannelKey(target, primary) || (channelIndex === 0 ? DEFAULT_PSK : null);
}

export async function decryptMeshtasticPayload(encrypted, psk, from, packetId) {
  if (!encrypted || !psk || typeof from !== 'number' || typeof packetId !== 'number') return null;

  const counter = new Uint8Array(16);
  const view = new DataView(counter.buffer);
  view.setUint32(0, from >>> 0, true);
  view.setUint32(4, packetId >>> 0, true);

  const key = await crypto.subtle.importKey('raw', psk, 'AES-CTR', false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-CTR', counter, length: 64 }, key, encrypted);
  return new Uint8Array(decrypted);
}