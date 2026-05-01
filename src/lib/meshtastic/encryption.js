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

const MODEM_PRESET_NAMES = {
  0: 'LongFast', 1: 'LongSlow', 2: 'VeryLongSlow', 3: 'MediumSlow', 4: 'MediumFast',
  5: 'ShortSlow', 6: 'ShortFast', 7: 'LongModerate', 8: 'ShortTurbo',
};

function getLoraPresetName(deviceConfigs) {
  const lora = (deviceConfigs || []).find(config => config.category === 'config' && config.section === 'LoRa')?.payload?.values;
  if (lora && lora.usePreset === false) return 'Custom';
  return MODEM_PRESET_NAMES[lora?.modemPreset ?? 0] || 'LongFast';
}

function channelNameBytes(channel, deviceConfigs) {
  const name = channel?.settings?.name || '';
  // Firmware: empty/"Default" name expands to current modem preset name (e.g. "LongFast")
  const effective = name && name !== 'Default' ? name : getLoraPresetName(deviceConfigs);
  return new TextEncoder().encode(effective);
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

export function getChannelHash(channel, primaryChannel, deviceConfigs) {
  const key = getChannelKey(channel, primaryChannel);
  if (!key) return null;
  return (xorHash(channelNameBytes(channel, deviceConfigs)) ^ xorHash(key)) & 0xff;
}

export function getChannelCandidates(deviceConfigs) {
  const channels = getChannels(deviceConfigs);
  const primary = getPrimaryChannel(channels);
  const presetName = getLoraPresetName(deviceConfigs);
  const configured = channels
    .map(channel => ({
      index: channel.index ?? 0,
      name: channel.settings?.name || presetName,
      hash: getChannelHash(channel, primary, deviceConfigs),
      psk: getChannelKey(channel, primary),
    }))
    .filter(channel => channel.psk);

  if (configured.length > 0) return configured;

  return [{ index: 0, name: presetName, hash: xorHash(new TextEncoder().encode(presetName)) ^ xorHash(DEFAULT_PSK) & 0xff, psk: DEFAULT_PSK }];
}

export function resolvePacketChannel(deviceConfigs, packetChannelHash = 0) {
  const match = getChannelCandidates(deviceConfigs).find(channel => channel.hash === packetChannelHash);
  if (match) return { ...match, hash: packetChannelHash };
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