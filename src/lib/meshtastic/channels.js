// Helpers to expose configured device channels for the UI (send targets).
// We do NOT invent channels — we only read what the connected device reported.

import { getChannelKey } from './encryption.js';

const ROLE_LABELS = { 0: 'disabled', 1: 'primary', 2: 'secondary' };

// Default Meshtastic PSK (length=1, value=1) means "use default key" → still encrypted, but public/default.
function isDefaultPskMarker(psk) {
  if (!psk) return false;
  if (psk.hex) {
    const clean = String(psk.hex).replace(/[^a-fA-F0-9]/g, '');
    return clean === '01';
  }
  if (typeof psk === 'string') {
    try { return atob(psk).length === 1 && atob(psk).charCodeAt(0) === 1; } catch { return false; }
  }
  return false;
}

function isEmptyPsk(psk) {
  if (!psk) return true;
  if (psk.hex) return !String(psk.hex).replace(/[^a-fA-F0-9]/g, '').length;
  if (typeof psk === 'string') {
    try { return atob(psk).length === 0; } catch { return false; }
  }
  return false;
}

// Returns a list of channels usable as send targets:
//   { index, name, role: 'primary'|'secondary', isEncrypted, isDefault }
// "isDefault" = uses the well-known Meshtastic default PSK (channel is technically encrypted,
// but anyone with a default-config device can decrypt it).
export function getSendableChannels(deviceConfigs) {
  const channels = (deviceConfigs || [])
    .filter(c => c.category === 'channel')
    .map(c => c.payload)
    .filter(Boolean);

  const primary = channels.find(c => c.role === 1) || channels.find(c => c.index === 0);

  return channels
    .filter(c => c.role === 1 || c.role === 2) // skip disabled
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map(c => {
      const psk = c.settings?.psk;
      const isDefault = isDefaultPskMarker(psk);
      const isEmpty = isEmptyPsk(psk);
      // A channel is "encrypted" if it has a non-empty, non-default key.
      // (Default PSK is technically encryption but treated as "public/default" in UX.)
      const effectiveKey = getChannelKey(c, primary);
      const isEncrypted = !!effectiveKey && effectiveKey.length > 0 && !isDefault;
      return {
        index: c.index ?? 0,
        name: c.settings?.name || (c.index === 0 ? 'Default' : `Channel ${c.index ?? '?'}`),
        role: ROLE_LABELS[c.role] || 'primary',
        isEncrypted,
        isDefault: isDefault || isEmpty,
      };
    });
}