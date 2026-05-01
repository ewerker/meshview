import { Languages } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n/I18nContext.jsx';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="flex items-center gap-1 text-slate-300">
      <Languages className="w-4 h-4" />
      <Select value={language} onValueChange={setLanguage}>
        <SelectTrigger className="h-8 w-[92px] border-slate-700 bg-slate-800 text-xs text-white">
          <SelectValue aria-label={t('language')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="de">DE</SelectItem>
          <SelectItem value="en">EN</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}