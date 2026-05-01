import { Link } from 'react-router-dom';
import { Menu, Home, HelpCircle, Info, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n/I18nContext.jsx';

export default function AppNavigationMenu({ className = '' }) {
  const { t, language } = useI18n();
  const legalLabel = language === 'en' ? 'Legal notice' : 'Impressum';

  const items = [
    { to: '/', label: t('dashboard'), icon: Home },
    { to: '/help', label: t('help'), icon: HelpCircle },
    { to: '/about', label: t('aboutApp'), icon: Info },
    { to: '/impressum', label: legalLabel, icon: FileText },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className={`text-slate-300 hover:text-white px-2 ${className}`} aria-label="Menü öffnen">
          <Menu className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {items.map(item => (
          <DropdownMenuItem key={item.to} asChild>
            <Link to={item.to} className="flex items-center gap-2 cursor-pointer">
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}