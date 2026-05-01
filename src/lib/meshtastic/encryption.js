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
  if (bytes.length === 1 && bytes[0] === 1) return DEFAULT_PSK;
  return bytes;
}

export function getChannelPsk(deviceConfigs, channelIndex = 0) {
  const channels = (deviceConfigs || [])
    .filter(config => config.category === 'channel')
    .map(config => config.payload)
    .filter(Boolean);

  const target = channels.find(channel => channel.index === channelIndex);
  const primary = channels.find(channel => channel.role === 1 || channel.index === 0);
  return normalizePsk(target?.settings?.psk) || normalizePsk(primary?.settings?.psk) || (channelIndex === 0 ? DEFAULT_PSK : null);
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