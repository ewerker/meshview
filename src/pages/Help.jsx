import { Link } from 'react-router-dom';
import { ChevronLeft, Radio, Usb, List, Map, Wifi, Activity, Cpu, AlertTriangle, Moon, Database } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nContext.jsx';

function Section({ icon: Icon, color, title, children }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 overflow-hidden">
      <div className={`flex items-center gap-3 px-4 py-3 border-b dark:border-slate-700 ${color}`}>
        <Icon className="w-5 h-5" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="p-4 text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

const copy = {
  de: {
    title: 'Hilfe & Anleitung', heading: 'Erste Schritte & Hilfe', about: 'Über diese App', legal: 'Impressum', docs: 'Meshtastic Docs ↗',
    sections: [
      { icon: Usb, color: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300', title: '1. Gerät verbinden', body: ['Diese App nutzt die Web Serial API – sie funktioniert nur in Google Chrome, Microsoft Edge oder einem anderen Chromium-basierten Browser auf Desktop.', 'Schritte:', 'Meshtastic-Gerät per USB-Kabel mit dem Computer verbinden.|Auf „Mit Gerät verbinden“ klicken.|Im Browser-Dialog den richtigen seriellen Port auswählen (meist CP210x, CH340 oder direktes USB-Serial).|Das Dashboard lädt automatisch alle bekannten Nodes und Telemetriedaten.', 'Falls kein Port erscheint: USB-Kabel prüfen (Datenkabel, kein reines Ladekabel) oder den passenden Treiber installieren (CP210x, CH340).'] },
      { icon: Activity, color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', title: '2. Statusleiste & Kacheln', body: ['Direkt unter dem Header zeigen vier Kacheln den aktuellen Mesh-Status:', 'Nodes gesamt – alle bekannten Nodes (Klick: alle Filter zurücksetzen).|Aktiv (15min) – Nodes mit Aktivität in den letzten 15 Minuten.|Mit GPS – Nodes, die Positionsdaten gesendet haben.|Nachrichten – Anzahl empfangener Text-Nachrichten in der aktuellen Session.', 'Aktivitäts- und GPS-Kacheln sind klickbar und filtern die Node-Liste entsprechend.'] },
      { icon: List, color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', title: '3. Node-Liste, Suche & Filter', body: ['Die linke Spalte zeigt alle bekannten Nodes im Mesh. Du kannst:', 'Nach Name, Kurzname oder Node-ID suchen.|Sortieren nach: Mein Gerät zuerst, zuletzt gehört, Name (A–Z), SNR, Akku oder Entfernung.|Mehrere Filter kombinieren: aktiv, direkt verbunden, mit GPS/Telemetrie/Umweltsensoren, Akku kritisch/gut, Entfernung (1/5/25 km).|Einen Node anklicken, um ihn auf der Karte zu markieren und Details rechts zu sehen.', 'Dein eigenes Gerät ist mit einem ⭐ Stern und grünem Rahmen markiert.'] },
      { icon: Map, color: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300', title: '4. Karte & Positionen', body: ['Alle Nodes mit GPS-Koordinaten erscheinen auf der OpenStreetMap-Karte.', 'Klick auf einen Marker zeigt Details und wählt den Node aus.|Die Karte zoomt automatisch auf alle sichtbaren Nodes.|In der Node-Detailansicht (Tab „Position“) gibt es eine Mini-Karte und die berechnete Entfernung zu deinem eigenen Gerät.'] },
      { icon: Wifi, color: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300', title: '5. Signal, Telemetrie & Umgebung', body: ['Im Detailbereich (Node auswählen) findest du Tabs für:', 'Info – Hardware, Node-ID, Hops, MQTT-Status, zuletzt gehört.|Signal – aktuelle SNR/RSSI, Verlauf der letzten 15 Minuten und Diagramm der letzten 2 Stunden.|Position – GPS-Koordinaten, Höhe, Satelliten, DOP-Werte und Mini-Karte.|Telemetrie – Gerätemetriken (Akku, Spannung, Uptime, TX/RX, Auslastung) und Verlaufs-Charts.|Umgebung – Temperatur, Luftfeuchtigkeit, Luftdruck, Lux, Wind, Gewicht usw., sofern Sensoren vorhanden.', 'SNR > 0 dB ist gut, RSSI näher an 0 ist besser (z. B. –80 dBm > –120 dBm). Akku > 100 % bedeutet Netzbetrieb (⚡).'] },
      { icon: Cpu, color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300', title: '6. Empfangene Pakete', body: ['Im unteren Bereich der Mitte werden alle empfangenen Pakete in Echtzeit aufgelistet:', 'Spalten: Von, Typ, Details, Zeit – Klick auf den Sender wählt den Node aus.|Klick auf eine Zeile öffnet die Hex- und JSON-Ansicht des Roh-Pakets – ideal zur Analyse.|Es werden die letzten 50 Pakete angezeigt, ältere werden automatisch verworfen.'] },
      { icon: Database, color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', title: '7. Backup, Anmeldung & historischer Verlauf', body: ['Optional kannst du dich anmelden und über „Jetzt sichern“ ein Backup der empfangenen Mesh-Daten erstellen. Nach dem ersten Backup wird AutoSave für die aktuelle Sitzung aktiviert.', 'Empfangene Pakete und Node-Zustände werden beim Backup gespeichert, solange ein Gerät verbunden ist.|Auch ohne USB-Verbindung siehst du dein Dashboard später mit den letzten gespeicherten Daten.|Über die Geräteauswahl oben kannst du zwischen mehreren eigenen Meshtastic-Geräten umschalten.|Gespeicherte Backup-Daten sind pro Benutzer privat – andere sehen sie nicht.', 'Datenschutz: Ohne Anmeldung und ohne Backup bleibt alles lokal im Browser. Wenn Backup/AutoSave genutzt wird, werden die gesicherten Daten zusätzlich in deinem privaten Benutzerkonto gespeichert.'] },
      { icon: Moon, color: 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200', title: '8. Dark Mode & Layout', body: ['Über das Mond-/Sonnen-Symbol im Header wechselst du zwischen hellem und dunklem Design.', 'Die Spalten und Bereiche im Desktop-Layout sind frei verschiebbar – einfach die grauen Trennleisten ziehen, um die Größen anzupassen.', 'Auf mobilen Geräten erscheinen Karte, Nodes und Details als Tabs.'] },
      { icon: AlertTriangle, color: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', title: 'Wichtige Hinweise zur Funkdisziplin', body: ['Beim Einsatz von Meshtastic-Geräten gelten die nationalen Funkvorschriften. In Deutschland gelten die Bestimmungen der Bundesnetzagentur (BNetzA).', 'Einhaltung der zulässigen Sendeleistung (max. 25 mW ERP im 868-MHz-Band).|Duty-Cycle-Begrenzung: max. 1 % Sendedauer pro Stunde im 868-MHz-Band.|Keine missbräuchliche oder störende Nutzung des Frequenzbands.|Für Amateurfunk-Frequenzen gelten abweichende Regeln (Lizenzpflicht).', 'Diese App und ihr Betreiber übernehmen keine Haftung für Verstöße gegen Funkvorschriften durch den Nutzer.'] },
    ],
  },
  en: {
    title: 'Help & guide', heading: 'Getting started & help', about: 'About this app', legal: 'Legal notice', docs: 'Meshtastic Docs ↗',
    sections: [
      { icon: Usb, color: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300', title: '1. Connect device', body: ['This app uses the Web Serial API – it only works in Google Chrome, Microsoft Edge or another Chromium-based desktop browser.', 'Steps:', 'Connect your Meshtastic device to the computer via USB cable.|Click “Connect device”.|Choose the correct serial port in the browser dialog, usually CP210x, CH340 or direct USB serial.|The dashboard automatically loads all known nodes and telemetry data.', 'If no port appears: check the USB cable (data cable, not charge-only) or install the matching driver (CP210x, CH340).'] },
      { icon: Activity, color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', title: '2. Status bar & tiles', body: ['Directly below the header, four tiles show the current mesh status:', 'Total nodes – all known nodes (click: reset all filters).|Active (15 min) – nodes active within the last 15 minutes.|With GPS – nodes that sent position data.|Messages – number of received text messages in the current session.', 'The activity and GPS tiles are clickable and filter the node list accordingly.'] },
      { icon: List, color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', title: '3. Node list, search & filters', body: ['The left column shows all known nodes in the mesh. You can:', 'Search by name, short name or node ID.|Sort by: my device first, last heard, name (A–Z), SNR, battery or distance.|Combine multiple filters: active, directly connected, GPS/telemetry/environmental sensors, critical/good battery, distance (1/5/25 km).|Click a node to highlight it on the map and see details on the right.', 'Your own device is marked with a ⭐ star and green border.'] },
      { icon: Map, color: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300', title: '4. Map & positions', body: ['All nodes with GPS coordinates appear on the OpenStreetMap map.', 'Clicking a marker shows details and selects the node.|The map automatically zooms to all visible nodes.|In the node detail view (Position tab), a mini map and calculated distance to your own device are shown.'] },
      { icon: Wifi, color: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300', title: '5. Signal, telemetry & environment', body: ['In the detail area (select a node), you will find tabs for:', 'Info – hardware, node ID, hops, MQTT status, last heard.|Signal – current SNR/RSSI, last 15 minutes and a 2-hour chart.|Position – GPS coordinates, altitude, satellites, DOP values and mini map.|Telemetry – device metrics (battery, voltage, uptime, TX/RX, utilization) and history charts.|Environment – temperature, humidity, pressure, lux, wind, weight and more if sensors are available.', 'SNR > 0 dB is good, RSSI closer to 0 is better (e.g. –80 dBm > –120 dBm). Battery > 100% means external power (⚡).'] },
      { icon: Cpu, color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300', title: '6. Received packets', body: ['The lower center area lists all received packets in real time:', 'Columns: From, Type, Details, Time – click the sender to select the node.|Click a row to open the hex and JSON view of the raw packet – ideal for analysis.|The latest 50 packets are shown; older packets are discarded automatically.'] },
      { icon: Database, color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', title: '7. Backup, sign-in & history', body: ['Optionally, you can sign in and use “Save now” to back up received mesh data. After the first backup, AutoSave is enabled for the current session.', 'Received packets and node states are saved during backup while a device is connected.|Even without a USB connection, you can later view your dashboard with the last saved data.|Use the device selector at the top to switch between multiple Meshtastic devices.|Saved backup data is private per user – others cannot see it.', 'Privacy: Without signing in and without backup, everything stays local in the browser. When backup/AutoSave is used, the saved data is additionally stored in your private user account.'] },
      { icon: Moon, color: 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200', title: '8. Dark mode & layout', body: ['Use the moon/sun icon in the header to switch between light and dark design.', 'The columns and areas in desktop layout are freely resizable – just drag the gray separators to adjust sizes.', 'On mobile devices, map, nodes and details appear as tabs.'] },
      { icon: AlertTriangle, color: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', title: 'Important radio operation notes', body: ['When using Meshtastic devices, national radio regulations apply. In Germany, the Bundesnetzagentur (BNetzA) rules apply.', 'Comply with permitted transmit power (max. 25 mW ERP in the 868 MHz band).|Duty-cycle limit: max. 1% transmission time per hour in the 868 MHz band.|Do not misuse or interfere with the frequency band.|Amateur radio frequencies have different rules and may require a license.', 'This app and its operator accept no liability for users violating radio regulations.'] },
    ],
  },
};

function renderBody(lines) {
  return lines.map((line, index) => {
    if (line.includes('|')) {
      return <ul key={index} className="list-disc ml-4 space-y-1">{line.split('|').map(item => <li key={item}>{item}</li>)}</ul>;
    }
    return <p key={index} className={index === lines.length - 1 ? 'text-xs text-slate-400' : ''}>{line}</p>;
  });
}

export default function Help() {
  const { t, language } = useI18n();
  const page = copy[language] || copy.de;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-900">
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">{t('dashboard')}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-green-400" />
          <span className="font-bold">{page.title}</span>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-5">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{page.heading}</h1>

        {page.sections.map(section => (
          <Section key={section.title} icon={section.icon} color={section.color} title={section.title}>
            {renderBody(section.body)}
          </Section>
        ))}

        <div className="flex gap-3 text-sm text-center pb-6">
          <Link to="/about" className="flex-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg py-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">{page.about}</Link>
          <Link to="/impressum" className="flex-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg py-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">{page.legal}</Link>
          <a href="https://meshtastic.org/docs" target="_blank" rel="noopener noreferrer" className="flex-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg py-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">{page.docs}</a>
        </div>
      </div>
    </div>
  );
}