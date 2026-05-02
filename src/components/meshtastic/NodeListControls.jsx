import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Search, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n/I18nContext.jsx';

export default function NodeListControls({ search, onSearch, sort, onSort, filters, onFiltersChange }) {
  const [showFilters, setShowFilters] = useState(false);
  const { t } = useI18n();

  const handleFilterChange = (key) => {
    onFiltersChange({
      ...filters,
      [key]: !filters[key]
    });
  };

  const activeCount = Object.values(filters).filter(Boolean).length;

  const filterOptions = [
    { key: 'active', label: t('filterActive') },
    { key: 'direct', label: t('filterDirect') },
    { key: 'withGps', label: t('filterWithGps') },
    { key: 'withTelemetry', label: t('filterWithTelemetry') },
    { key: 'withEnv', label: t('filterWithEnv') },
    { key: 'lowBattery', label: t('filterLowBattery') },
    { key: 'highBattery', label: t('filterHighBattery') },
    { key: 'near1km', label: t('filterNear1') },
    { key: 'near5km', label: t('filterNear5') },
    { key: 'near25km', label: t('filterNear25') },
  ];

  const maxAgeOptions = [
    { value: 'any', label: t('maxAgeAny') },
    { value: '1d', label: t('maxAge1d') },
    { value: '3d', label: t('maxAge3d') },
    { value: '7d', label: t('maxAge7d') },
    { value: '30d', label: t('maxAge30d') },
    { value: '90d', label: t('maxAge90d') },
  ];

  const maxAge = filters.maxAge || 'any';

  return (
    <div className="px-3 py-2 border-b bg-card dark:bg-slate-800 space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input
          className="pl-7 h-7 text-xs"
          placeholder={t('search')}
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Select value={sort} onValueChange={onSort}>
          <SelectTrigger className="flex-1 h-7 text-xs">
            <SelectValue placeholder={t('sort')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="myFirst">{t('myDeviceFirst')}</SelectItem>
            <SelectItem value="lastHeard">{t('lastHeard')}</SelectItem>
            <SelectItem value="name">{t('nameAz')}</SelectItem>
            <SelectItem value="snr">{t('bestSnrFirst')}</SelectItem>
            <SelectItem value="battery">{t('highestBatteryFirst')}</SelectItem>
            <SelectItem value="distance">{t('nearestFirst')}</SelectItem>
          </SelectContent>
        </Select>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 px-2 h-7 text-xs bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          {t('filter')} {activeCount > 0 && <span className="bg-blue-600 text-white px-1.5 rounded-full text-[10px] leading-none">{activeCount}</span>}
          <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 gap-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-normal text-slate-500 shrink-0">{t('filterMaxAge')}</Label>
            <Select value={maxAge} onValueChange={(value) => onFiltersChange({ ...filters, maxAge: value })}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {maxAgeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filterOptions.map(option => (
            <div key={option.key} className="flex items-center gap-2">
              <Checkbox
                id={`filter-${option.key}`}
                checked={filters[option.key] || false}
                onCheckedChange={() => handleFilterChange(option.key)}
              />
              <Label htmlFor={`filter-${option.key}`} className="text-xs cursor-pointer font-normal">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}