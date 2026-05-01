import { Settings, User, Cpu, Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMeshStore } from '@/hooks/useMeshStore.js';
import { HardwareModel } from '@/lib/meshtastic/constants.js';

function nodeIdString(num) {
  if (typeof num !== 'number' || !num) return 'Unbekannt';
  return '!' + num.toString(16).padStart(8, '0');
}

function SettingRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-white/70 dark:bg-slate-900/50 border border-blue-100 dark:border-blue-900 px-2.5 py-1.5">
      <Icon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300 shrink-0" />
      <span className="text-[11px] text-blue-700 dark:text-blue-300">{label}</span>
      <span className="text-xs font-semibold text-blue-950 dark:text-blue-50 truncate">{value || 'Unbekannt'}</span>
    </div>
  );
}

export default function DeviceSettingsPanel() {
  const { connected, myNode, myNodeNum, metadata } = useMeshStore();

  if (!connected || !myNodeNum) return null;

  const user = myNode?.user || {};
  const nodeId = user.id?.startsWith('!') ? user.id : nodeIdString(myNodeNum);
  const hardware = HardwareModel[user.hwModel ?? metadata?.hwModel] || 'Unbekannt';

  return (
    <div className="border-b bg-blue-50/80 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900 px-3 py-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Settings className="w-4 h-4 text-blue-600 dark:text-blue-300 shrink-0" />
          <div>
            <div className="font-semibold text-xs text-blue-900 dark:text-blue-100">Eigene Geräteeinstellungen</div>
            <div className="text-[11px] text-blue-700 dark:text-blue-300 leading-tight">
              Aus dem eigenen NodeInfo/Metadata-Profil ausgelesen.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <SettingRow icon={User} label="Langname" value={user.longName} />
          <SettingRow icon={User} label="Kurzname" value={user.shortName} />
          <SettingRow icon={Radio} label="Node-ID" value={nodeId} />
          <SettingRow icon={Cpu} label="Hardware" value={hardware} />
          {metadata?.firmwareVersion && <Badge variant="outline" className="bg-white/70 dark:bg-slate-900/50 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800">FW {metadata.firmwareVersion}</Badge>}
        </div>
      </div>
    </div>
  );
}