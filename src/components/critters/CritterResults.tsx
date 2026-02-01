import { useMemo, useRef } from 'react';
import Fuse from 'fuse.js';
import type { Critter, CritterCategories } from '../../types';
import { useSettingsStore } from '../../store/settingsStore';
import { useCaughtCritterStore } from '../../store/caughtCritterStore';
import { CritterCard } from './CritterCard';
import { SwipeableCritterCard } from './SwipeableCritterCard';
import { SearchInput } from '../ui/SearchInput';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
import { SortDropdown } from '../ui/SortDropdown';

interface CritterResultsProps {
  critters: Critter[];
  critterCategories: CritterCategories;
  isMobile?: boolean;
}

export function CritterResults({ critters, critterCategories, isMobile = false }: CritterResultsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const { caughtCritters } = useCaughtCritterStore();
  const {
    critterTypeFilters,
    toggleCritterTypeFilter,
    critterSeasonFilters,
    toggleCritterSeasonFilter,
    critterWeatherFilters,
    toggleCritterWeatherFilter,
    critterLocationFilters,
    toggleCritterLocationFilter,
    critterSearchQuery,
    setCritterSearchQuery,
    critterSortBy,
    setCritterSortBy,
    showCritterCaughtOnly,
    setShowCritterCaughtOnly,
    showCritterUncaughtOnly,
    setShowCritterUncaughtOnly,
  } = useSettingsStore();

  // Fuse instance for critter search
  const fuse = useMemo(() => {
    return new Fuse(critters, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'type', weight: 0.5 },
      ],
      threshold: 0.3,
    });
  }, [critters]);

  // Filter and sort critters
  const filteredCritters = useMemo(() => {
    let results = critters;

    // Search filter
    if (critterSearchQuery.trim()) {
      const searchResults = fuse.search(critterSearchQuery.trim());
      results = searchResults.map(r => r.item);
    }

    // Type filter (OR logic)
    if (critterTypeFilters.length > 0) {
      results = results.filter(c => critterTypeFilters.includes(c.type));
    }

    // Season filter (OR logic)
    if (critterSeasonFilters.length > 0) {
      results = results.filter(c => c.seasons.some(s => critterSeasonFilters.includes(s)));
    }

    // Weather filter (OR logic)
    if (critterWeatherFilters.length > 0) {
      results = results.filter(c => c.weather.some(w => critterWeatherFilters.includes(w)));
    }

    // Location filter (OR logic)
    if (critterLocationFilters.length > 0) {
      results = results.filter(c => c.locations.some(l => critterLocationFilters.includes(l)));
    }

    // Caught/Uncaught filter
    if (showCritterCaughtOnly) {
      results = results.filter(c => caughtCritters.includes(c.id));
    } else if (showCritterUncaughtOnly) {
      results = results.filter(c => !caughtCritters.includes(c.id));
    }

    // Sort
    const sorted = [...results];
    switch (critterSortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price_desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'price_asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
    }

    return sorted;
  }, [critters, critterSearchQuery, critterTypeFilters, critterSeasonFilters, critterWeatherFilters, critterLocationFilters, showCritterCaughtOnly, showCritterUncaughtOnly, critterSortBy, fuse, caughtCritters]);

  // Group critters by rarity for collapsible sections
  const groupedCritters = useMemo(() => {
    const groups: Record<string, Critter[]> = {};
    for (const c of filteredCritters) {
      if (!groups[c.rarity]) groups[c.rarity] = [];
      groups[c.rarity].push(c);
    }
    return groups;
  }, [filteredCritters]);

  const hasFilters = critterTypeFilters.length > 0 ||
    critterSeasonFilters.length > 0 ||
    critterWeatherFilters.length > 0 || critterLocationFilters.length > 0 ||
    critterSearchQuery.trim() !== '' || showCritterCaughtOnly || showCritterUncaughtOnly;

  const caughtCount = caughtCritters.length;

  const typeOptions = critterCategories.types.map(t => ({ id: t.id, name: t.name }));
  const seasonOptions = critterCategories.seasons.map(s => ({ id: s.id, name: s.name }));
  const weatherOptions = critterCategories.weather.map(w => ({ id: w.id, name: w.name }));
  const locationOptions = critterCategories.locations.map(l => ({ id: l.id, name: l.name }));

  // Shared filter controls
  const filterControlsJSX = (
    <>
      {/* Search row */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchInput
            value={critterSearchQuery}
            onChange={setCritterSearchQuery}
            placeholder="Search critters..."
          />
        </div>
        <span className="text-sm px-3 py-1.5 rounded-full bg-gray-100 text-[var(--color-text-muted)] flex-shrink-0">
          {filteredCritters.length} found
        </span>
      </div>

      {/* Toggle buttons */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <button
          type="button"
          onClick={() => setShowCritterCaughtOnly(!showCritterCaughtOnly)}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors select-none flex items-center gap-1.5 ${
            showCritterCaughtOnly
              ? 'bg-green-500 border-green-500 text-white'
              : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-gray-50'
          }`}
          style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
              clipRule="evenodd"
            />
          </svg>
          Caught{caughtCount > 0 ? ` (${caughtCount})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setShowCritterUncaughtOnly(!showCritterUncaughtOnly)}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors select-none flex items-center gap-1.5 ${
            showCritterUncaughtOnly
              ? 'bg-red-500 border-red-500 text-white'
              : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-gray-50'
          }`}
          style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9.75" />
            <path strokeLinecap="round" d="M8 8l8 8M16 8l-8 8" />
          </svg>
          Uncaught
        </button>
      </div>

      {/* Dropdown filters */}
      <div className="flex gap-1.5 mt-3 flex-wrap items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          <MultiSelectDropdown
            options={typeOptions}
            selected={critterTypeFilters}
            onToggle={toggleCritterTypeFilter}
            placeholder="Type"
            className="flex-shrink-0"
          />
          <MultiSelectDropdown
            options={seasonOptions}
            selected={critterSeasonFilters}
            onToggle={toggleCritterSeasonFilter}
            placeholder="Season"
            className="flex-shrink-0"
          />
          <MultiSelectDropdown
            options={weatherOptions}
            selected={critterWeatherFilters}
            onToggle={toggleCritterWeatherFilter}
            placeholder="Weather"
            className="flex-shrink-0"
          />
          <MultiSelectDropdown
            options={locationOptions}
            selected={critterLocationFilters}
            onToggle={toggleCritterLocationFilter}
            placeholder="Location"
            className="flex-shrink-0"
          />
        </div>
        <SortDropdown
          options={[
            { value: 'name', label: 'Name A-Z' },
            { value: 'price_desc', label: 'Price: High \u2192 Low' },
            { value: 'price_asc', label: 'Price: Low \u2192 High' },
          ]}
          value={critterSortBy}
          onChange={(val) => setCritterSortBy(val as 'name' | 'price_asc' | 'price_desc')}
          placeholder="Sort"
          className="flex-shrink-0"
        />
      </div>
    </>
  );

  // Render critter cards - grouped by rarity
  const rarityOrder = ['common', 'uncommon', 'rare'];

  // Running index for alternating row colors
  let globalIndex = 0;

  return (
    <div className={`flex flex-col bg-white relative ${isMobile ? 'min-h-full h-full' : 'h-full rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden'}`}>
      {/* Filter header - always visible */}
      <div ref={headerRef} className={`p-4 border-b border-[var(--color-border)] bg-white flex-shrink-0 ${!isMobile ? 'rounded-t-2xl' : ''}`}>
        {!isMobile && (
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Critters</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-[var(--color-text-muted)]">
                {filteredCritters.length} found
              </span>
              {caughtCount > 0 && (
                <span className="text-sm px-3 py-1 rounded-full bg-green-100 text-green-700">
                  {caughtCount} caught
                </span>
              )}
            </div>
          </div>
        )}
        {filterControlsJSX}
      </div>

      {/* Scroll container */}
      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} className="overflow-y-auto h-full">
          <div className={isMobile ? 'p-4' : 'p-4 pr-5'} style={isMobile ? { paddingBottom: '300px' } : undefined}>
            {filteredCritters.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)]">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <p className="text-lg font-medium mb-2">No critters found</p>
                <p className="text-sm text-center">
                  {hasFilters ? 'Try adjusting your filters' : 'Loading critter data...'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {rarityOrder.map(rarity => {
                  const crittersInGroup = groupedCritters[rarity];
                  if (!crittersInGroup || crittersInGroup.length === 0) return null;

                  const rarityName = critterCategories.rarities.find(r => r.id === rarity)?.name || rarity;
                  const startIndex = globalIndex;
                  globalIndex += crittersInGroup.length;

                  return (
                    <CollapsibleSection
                      key={rarity}
                      title={rarityName}
                      count={crittersInGroup.length}
                    >
                      <div className="grid grid-cols-1 tablet:grid-cols-2 gap-3">
                        {crittersInGroup.map((c, i) => (
                          isMobile ? (
                            <SwipeableCritterCard
                              key={c.id}
                              critter={c}
                              critterCategories={critterCategories}
                              index={startIndex + i}
                            />
                          ) : (
                            <CritterCard
                              key={c.id}
                              critter={c}
                              critterCategories={critterCategories}
                              index={startIndex + i}
                            />
                          )
                        ))}
                      </div>
                    </CollapsibleSection>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
