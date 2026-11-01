import { useI18n } from '@/lib/i18n/I18nContext.jsx';

export const CONTACT = {
  phone: '+49 34293 470571',
  phoneHref: 'tel:+4934293470571',
  fax: '+49 34293 470572',
  faxHref: 'tel:+4934293470572',
  emergency: '+491778337468',
  emergencyHref: 'tel:+491778337468',
  email: 'richter@w-2.de',
  website: 'https://w-2.de',
};

const labels = {
  de: { phone: 'Telefon', fax: 'Fax', emergency: 'Hotline', email: 'E-Mail', website: 'Website' },
  en: { phone: 'Phone', fax: 'Fax', emergency: 'Hotline', email: 'E-mail', website: 'Website' },
};

export default function ContactBlock({ textClass = 'text-slate-600 dark:text-slate-300', className = '' }) {
  const { language } = useI18n();
  const c = labels[language] || labels.de;
  const linkClass = 'text-blue-600 dark:text-blue-400 hover:underline';

  return (
    <p className={`${textClass} ${className}`.trim()}>
      {c.phone}: <a href={CONTACT.phoneHref} className={linkClass}>{CONTACT.phone}</a><br />
      {c.fax}: <a href={CONTACT.faxHref} className={linkClass}>{CONTACT.fax}</a><br />
      {c.emergency}: <a href={CONTACT.emergencyHref} className={linkClass}>{CONTACT.emergency}</a><br />
      {c.email}: <a href={`mailto:${CONTACT.email}`} className={linkClass}>{CONTACT.email}</a><br />
      {c.website}: <a href={CONTACT.website} target="_blank" rel="noopener noreferrer" className={linkClass}>{CONTACT.website}</a>
    </p>
  );
}