import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, Search, Sparkles, SlidersHorizontal, Trash2, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  displayValue: string;
}

interface AdvancedFilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: Array<{
    key: string;
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    icon?: any;
    searchable?: boolean;
  }>;
  dateRange?: {
    from: string;
    to: string;
    onFromChange: (value: string) => void;
    onToChange: (value: string) => void;
    label?: string;
  };
  activeFilters?: ActiveFilter[];
  onClearFilter?: (key: string) => void;
  onClearAll?: () => void;
  additionalFilters?: React.ReactNode;
  resultCount?: number;
  resultLabel?: string;
  premium?: boolean;
}

export function AdvancedFilterBar({
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  filters = [],
  dateRange,
  activeFilters = [],
  onClearFilter,
  onClearAll,
  additionalFilters,
  resultCount,
  resultLabel = 'results',
  premium = true,
}: AdvancedFilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasActiveFilters = activeFilters.length > 0 || searchValue || dateRange?.from || dateRange?.to || filters.some((f) => f.value && f.value !== '__all__' && f.value !== 'ALL');

  return (
    <div className="space-y-3">
      {/* Main bar */}
      <div className={`rounded-2xl border ${premium ? 'border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'} overflow-hidden`}>
        <div className="p-3 sm:p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder={searchPlaceholder} className="pl-9 h-9 rounded-full bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 text-sm text-slate-900 dark:text-white" value={searchValue} onChange={(e) => onSearchChange(e.target.value)} />
              {searchValue && (
                <button onClick={() => onSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Quick filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {filters.slice(0, 3).map((filter) => {
                if (filter.searchable) {
                  // Custom searchable filter dropdown using React state for the search input query
                  return (
                    <SearchableFilterDropdown key={filter.key} filter={filter} />
                  );
                }
                return (
                  <Select key={filter.key} value={filter.value} onValueChange={filter.onChange}>
                    <SelectTrigger className="h-9 rounded-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm text-xs font-medium w-36 text-slate-800 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        {filter.icon && <filter.icon className="h-3.5 w-3.5 text-slate-400" />}
                        <SelectValue placeholder={filter.placeholder || filter.label} />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl dark:bg-slate-850 dark:border-slate-800">
                      {filter.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs dark:text-slate-200 dark:focus:bg-slate-800">
                          <div className="flex items-center justify-between w-full">
                            <span>{opt.label}</span>
                            {opt.count !== undefined && <span className="ml-2 text-[11px] text-slate-400">({opt.count})</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })}

              {(filters.length > 3 || dateRange || additionalFilters) && (
                <Button variant={showAdvanced ? 'brand' : 'outline'} size="sm" className="h-9 rounded-full gap-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-750" onClick={() => setShowAdvanced(!showAdvanced)}>
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {showAdvanced ? 'Less' : 'More'}
                  <motion.span animate={{ rotate: showAdvanced ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-3 w-3" />
                  </motion.span>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {resultCount !== undefined && (
              <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2.5 py-1 font-medium">
                {resultCount} {resultLabel}
              </span>
            )}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs gap-1 text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={onClearAll}>
                <Trash2 className="h-3 w-3" /> Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Advanced section */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/40">
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 {filters.slice(3).map((filter) => {
                  if (filter.searchable) {
                    return (
                      <div key={filter.key} className="space-y-1.5 flex flex-col">
                        <label className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">{filter.label}</label>
                        <SearchableFilterDropdown filter={filter} />
                      </div>
                    );
                  }
                  return (
                    <div key={filter.key} className="space-y-1.5">
                      <label className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">{filter.label}</label>
                      <Select value={filter.value} onValueChange={filter.onChange}>
                        <SelectTrigger className="h-9 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white">
                          <SelectValue placeholder={filter.placeholder || filter.label} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl dark:bg-slate-850 dark:border-slate-800">
                          {filter.options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs dark:text-slate-200 dark:focus:bg-slate-800">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}

                {dateRange && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">{dateRange.label || 'From'} Date</label>
                      <Input type="date" value={dateRange.from} onChange={(e) => dateRange.onFromChange(e.target.value)} className="h-9 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white [&::-webkit-calendar-picker-indicator]:dark:invert" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">To Date</label>
                      <Input type="date" value={dateRange.to} onChange={(e) => dateRange.onToChange(e.target.value)} className="h-9 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white [&::-webkit-calendar-picker-indicator]:dark:invert" />
                    </div>
                  </>
                )}

                {additionalFilters && <div className="sm:col-span-2 lg:col-span-4">{additionalFilters}</div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Active:
          </span>
          {activeFilters.map((filter) => (
            <Badge key={`${filter.key}-${filter.value}`} variant="secondary" className="rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm pl-2.5 pr-1 py-1 text-xs font-medium flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">{filter.label}:</span>
              <span className="font-semibold text-slate-800 dark:text-white">{filter.displayValue}</span>
              <button onClick={() => onClearFilter?.(filter.key)} className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 text-slate-400 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// Premium filter stats card
export function FilterStatsCard({ icon: Icon, label, value, active, onClick }: { icon: any; label: string; value: number | string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all text-left w-full sm:w-auto ${
        active
          ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-900 dark:border-slate-700 shadow-md'
          : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
      }`}
    >
      <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${active ? 'bg-white/10 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <p className="leading-tight font-semibold">{label}</p>
        <p className={`text-[11px] leading-tight ${active ? 'text-white/60' : 'text-slate-400'}`}>{value}</p>
      </div>
      {active && <Check className="ml-auto h-3.5 w-3.5" />}
    </button>
  );
}

function SearchableFilterDropdown({ filter }: { filter: any }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    return filter.options.filter((opt: any) =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [filter.options, search]);

  const selectedOption = filter.options.find((opt: any) => opt.value === filter.value);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm text-xs font-medium w-full sm:w-40 justify-between text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-750"
        >
          <div className="flex items-center gap-1.5 overflow-hidden">
            {filter.icon && <filter.icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
            <span className="truncate">{selectedOption?.label || filter.placeholder || filter.label}</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-2 rounded-xl dark:bg-slate-850 dark:border-slate-800" align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <div className="relative mb-2 px-1 pt-1">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus-visible:ring-1"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1 px-1 scrollbar-thin">
          {filteredOptions.length === 0 ? (
            <div className="text-center py-3 text-xs text-slate-400">No results found</div>
          ) : (
            filteredOptions.map((opt: any) => {
              const isSelected = opt.value === filter.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    filter.onChange(opt.value);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center justify-between text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                    isSelected ? 'bg-slate-900 dark:bg-slate-700 text-white font-semibold' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="truncate mr-2">{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
