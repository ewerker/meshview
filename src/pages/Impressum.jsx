import { Link } from 'react-router-dom';
import { ChevronLeft, Radio } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nContext.jsx';

const content = {
  de: {
    title: 'Impressum',
    subtitle: 'Angaben gemäß § 5 TMG',
    owner: 'Inhaber:',
    address: 'Anschrift',
    contact: 'Kontakt',
    disclaimer: 'Haftungsausschluss',
    contentLiability: 'Haftung für Inhalte',
    contentLiabilityText: 'Die Inhalte dieser Anwendung wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte kann jedoch keine Gewähr übernommen werden. Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte nach den allgemeinen Gesetzen verantwortlich.',
    linkLiability: 'Haftung für Links',
    linkLiabilityText: 'Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.',
    copyright: 'Urheberrecht',
    copyrightText: 'Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.',
    privacy: 'Datenschutz',
    privacyText: 'Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Ohne Anmeldung und ohne Nutzung der Backup-Funktion bleiben die Meshtastic-Daten lokal im Browser. Wenn Backup oder AutoSave genutzt wird, werden empfangene Pakete und Node-Zustände privat im jeweiligen Benutzerkonto gespeichert. Die Daten werden nicht an Dritte weitergegeben.',
    warranty: 'Gewährleistung und Haftung',
    warrantyText: 'Wir übernehmen die Gewährleistung im Rahmen der gesetzlichen Bestimmungen. Die Haftung für leichte Fahrlässigkeit ist ausgeschlossen, soweit nicht Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit oder Garantien betroffen sind.',
    meshtasticNotes: 'Meshtastic – Besondere Hinweise',
    radioLiabilityTitle: 'Keine Haftung für Funkkommunikation:',
    radioLiabilityText: 'Diese Anwendung dient ausschließlich zur Visualisierung und Auswertung von Meshtastic-LoRa-Geräten. Der Betreiber übernimmt keine Haftung für Übertragungsfehler, Verbindungsunterbrechungen oder fehlerhafte Daten, die über das Mesh-Netzwerk empfangen werden.',
    radioDisciplineTitle: 'Funkdisziplin:',
    radioDisciplineText: 'Die Nutzung von Meshtastic-Geräten unterliegt den jeweils geltenden nationalen Funkvorschriften (in Deutschland: BNetzA). Der Nutzer ist selbst verantwortlich für die ordnungsgemäße und rechtskonforme Nutzung seiner Funkgeräte. Insbesondere ist die Einhaltung der zulässigen Sendeleistungen, Frequenzbänder und Duty-Cycle-Vorgaben zu beachten.',
    backupTitle: 'Backup:',
    backupText: 'Die Backup-Funktion ist optional und setzt eine Anmeldung voraus. Gespeicherte Daten sind benutzerbezogen privat und dienen ausschließlich der späteren Anzeige des eigenen Meshtastic-Verlaufs.',
    date: 'Stand: Mai 2026',
  },
  en: {
    title: 'Legal notice',
    subtitle: 'Information according to German § 5 TMG',
    owner: 'Owner:',
    address: 'Address',
    contact: 'Contact',
    disclaimer: 'Disclaimer',
    contentLiability: 'Liability for content',
    contentLiabilityText: 'The contents of this application have been created with great care. However, no guarantee can be given for accuracy, completeness or timeliness. As a service provider, we are responsible for our own content under general law.',
    linkLiability: 'Liability for links',
    linkLiabilityText: 'This application contains links to external third-party websites over whose content we have no influence. The respective provider or operator is always responsible for the content of linked pages.',
    copyright: 'Copyright',
    copyrightText: 'The content and works created by the site operators are subject to German copyright law. Reproduction, editing, distribution or any use beyond the limits of copyright law requires written consent from the respective author or creator.',
    privacy: 'Privacy',
    privacyText: 'We take the protection of your personal data seriously. Without signing in and without using the backup function, Meshtastic data stays local in the browser. If backup or AutoSave is used, received packets and node states are stored privately in the respective user account. The data is not shared with third parties.',
    warranty: 'Warranty and liability',
    warrantyText: 'Warranty is provided within the scope of statutory provisions. Liability for slight negligence is excluded unless damages affect life, body or health, or guarantees are involved.',
    meshtasticNotes: 'Meshtastic – special notes',
    radioLiabilityTitle: 'No liability for radio communication:',
    radioLiabilityText: 'This application is intended solely for visualizing and evaluating Meshtastic LoRa devices. The operator accepts no liability for transmission errors, connection interruptions or incorrect data received via the mesh network.',
    radioDisciplineTitle: 'Radio discipline:',
    radioDisciplineText: 'Use of Meshtastic devices is subject to applicable national radio regulations (in Germany: BNetzA). Users are responsible for proper and legally compliant use of their radio devices, including compliance with permitted transmit power, frequency bands and duty-cycle limits.',
    backupTitle: 'Backup:',
    backupText: 'The backup function is optional and requires sign-in. Saved data is private per user and is used only to display the user’s own Meshtastic history later.',
    date: 'Last updated: May 2026',
  },
};

export default function Impressum() {
  const { t, language } = useI18n();
  const c = content[language] || content.de;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-900">
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">{t('dashboard')}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-green-400" />
          <span className="font-bold">{c.title}</span>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-8">
        <section>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">{c.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{c.subtitle}</p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200">DoubleU2 (we-zwei)</h2>
          <p className="text-slate-600 dark:text-slate-300"><strong>{c.owner}</strong> Frank Richter</p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200">{c.address}</h2>
          <p className="text-slate-600 dark:text-slate-300">Kräuterweg 9<br />04683 Naunhof<br />Deutschland</p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200">{c.contact}</h2>
          <p className="text-slate-600 dark:text-slate-300">
            Tel: <a href="tel:+493429347057" className="text-blue-600 dark:text-blue-400 hover:underline">+49 (0) 34293 470571</a><br />
            Fax: +49 (0) 34293 470572<br />
            E-Mail: <a href="mailto:richter@w-2.de" className="text-blue-600 dark:text-blue-400 hover:underline">richter@w-2.de</a><br />
            Web: <a href="https://w-2.de" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">https://w-2.de</a>
          </p>
        </section>

        <hr className="border-slate-200 dark:border-slate-700" />

        <section className="space-y-4">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-lg">{c.disclaimer}</h2>
          {[
            [c.contentLiability, c.contentLiabilityText],
            [c.linkLiability, c.linkLiabilityText],
            [c.copyright, c.copyrightText],
            [c.privacy, c.privacyText],
            [c.warranty, c.warrantyText],
          ].map(([title, text]) => (
            <div key={title}>
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{title}</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </section>

        <hr className="border-slate-200 dark:border-slate-700" />

        <section className="space-y-3">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-lg">{c.meshtasticNotes}</h2>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-sm text-yellow-800 dark:text-yellow-200 leading-relaxed space-y-2">
            <p><strong>{c.radioLiabilityTitle}</strong> {c.radioLiabilityText}</p>
            <p><strong>{c.radioDisciplineTitle}</strong> {c.radioDisciplineText}</p>
            <p><strong>{c.backupTitle}</strong> {c.backupText}</p>
          </div>
        </section>

        <p className="text-xs text-slate-400 pb-6">{c.date}</p>
      </div>
    </div>
  );
}