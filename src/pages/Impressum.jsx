import { Link } from 'react-router-dom';
import { ChevronLeft, Radio } from 'lucide-react';

export default function Impressum() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">Dashboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-green-400" />
          <span className="font-bold">Impressum</span>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-8">

        <section>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Impressum</h1>
          <p className="text-slate-500 text-sm">Angaben gemäß § 5 TMG</p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold text-slate-700">DoubleU2 (we-zwei)</h2>
          <p className="text-slate-600"><strong>Inhaber:</strong> Frank Richter</p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold text-slate-700">Anschrift</h2>
          <p className="text-slate-600">Kräuterweg 9<br />04683 Naunhof<br />Deutschland</p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold text-slate-700">Kontakt</h2>
          <p className="text-slate-600">
            Tel: <a href="tel:+493429347057" className="text-blue-600 hover:underline">+49 (0) 34293 470571</a><br />
            Fax: +49 (0) 34293 470572<br />
            E-Mail: <a href="mailto:richter@w-2.de" className="text-blue-600 hover:underline">richter@w-2.de</a><br />
            Web: <a href="https://w-2.de" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://w-2.de</a>
          </p>
        </section>

        <hr className="border-slate-200" />

        <section className="space-y-4">
          <h2 className="font-semibold text-slate-700 text-lg">Haftungsausschluss</h2>

          <div>
            <h3 className="font-semibold text-slate-700 mb-1">Haftung für Inhalte</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Die Inhalte dieser Anwendung wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
              Vollständigkeit und Aktualität der Inhalte kann jedoch keine Gewähr übernommen werden.
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte nach den allgemeinen
              Gesetzen verantwortlich.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-1">Haftung für Links</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen
              Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
              oder Betreiber der Seiten verantwortlich.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-1">Urheberrecht</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
              dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
              der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen
              Zustimmung des jeweiligen Autors bzw. Erstellers.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-1">Datenschutz</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Alle erhobenen Daten werden
              ausschließlich für die Erbringung unserer Dienstleistungen verarbeitet und nicht an Dritte
              weitergegeben. Diese Anwendung speichert Konfigurationsdaten (Autoresponder-Regeln)
              ausschließlich lokal im Browser des Nutzers (localStorage). Es werden keine personenbezogenen
              Daten an Server übermittelt.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-1">Gewährleistung und Haftung</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Wir übernehmen die Gewährleistung im Rahmen der gesetzlichen Bestimmungen. Die Haftung
              für leichte Fahrlässigkeit ist ausgeschlossen, soweit nicht Schäden aus der Verletzung
              des Lebens, des Körpers oder der Gesundheit oder Garantien betroffen sind.
            </p>
          </div>
        </section>

        <hr className="border-slate-200" />

        <section className="space-y-3">
          <h2 className="font-semibold text-slate-700 text-lg">Meshtastic – Besondere Hinweise</h2>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 leading-relaxed space-y-2">
            <p><strong>Keine Haftung für Funkkommunikation:</strong> Diese Anwendung dient ausschließlich
            zur Visualisierung und Steuerung von Meshtastic-LoRa-Geräten. Der Betreiber übernimmt keine
            Haftung für Übertragungsfehler, Verbindungsunterbrechungen oder fehlerhafte Daten, die über
            das Mesh-Netzwerk empfangen werden.</p>

            <p><strong>Funkdisziplin:</strong> Die Nutzung von Meshtastic-Geräten unterliegt den jeweils
            geltenden nationalen Funkvorschriften (in Deutschland: BNetzA). Der Nutzer ist selbst
            verantwortlich für die ordnungsgemäße und rechtskonforme Nutzung seiner Funkgeräte.
            Insbesondere ist die Einhaltung der zulässigen Sendeleistungen, Frequenzbänder und
            Duty-Cycle-Vorgaben zu beachten.</p>

            <p><strong>Autoresponder:</strong> Automatisch versendete Nachrichten über den integrierten
            Autoresponder liegen in der Verantwortung des Nutzers. Der Betreiber dieser Anwendung
            haftet nicht für Inhalte automatisch generierter Nachrichten.</p>
          </div>
        </section>

        <p className="text-xs text-slate-400 pb-6">Stand: April 2026</p>
      </div>
    </div>
  );
}