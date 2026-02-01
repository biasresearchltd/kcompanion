import { useMemo, useRef } from 'react';
import Fuse from 'fuse.js';
import type { Fish, FishCategories } from '../../types';
import { useSettingsStore } from '../../store/settingsStore';
import { useCaughtFishStore } from '../../store/caughtFishStore';
import { FishCard } from './FishCard';
import { SwipeableFishCard } from './SwipeableFishCard';
import { SearchInput } from '../ui/SearchInput';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
import { SortDropdown } from '../ui/SortDropdown';

interface FishingResultsProps {
  fish: Fish[];
  fishCategories: FishCategories;
  isMobile?: boolean;
}

const SIZE_ORDER: Record<string, number> = {
  small: 0,
  medium: 1,
  large: 2,
  guardian: 3,
};

export function FishingResults({ fish, fishCategories, isMobile = false }: FishingResultsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const { caughtFish } = useCaughtFishStore();
  const {
    fishSeasonFilters,
    toggleFishSeasonFilter,
    fishWeatherFilters,
    toggleFishWeatherFilter,
    fishLocationFilters,
    toggleFishLocationFilter,
    fishSearchQuery,
    setFishSearchQuery,
    fishSortBy,
    setFishSortBy,
    showCaughtOnly,
    setShowCaughtOnly,
    showUncaughtOnly,
    setShowUncaughtOnly,
  } = useSettingsStore();

  // Fuse instance for fish search
  const fuse = useMemo(() => {
    return new Fuse(fish, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'size', weight: 0.5 },
      ],
      threshold: 0.3,
    });
  }, [fish]);

  // Filter and sort fish
  const filteredFish = useMemo(() => {
    let results = fish;

    // Search filter
    if (fishSearchQuery.trim()) {
      const searchResults = fuse.search(fishSearchQuery.trim());
      results = searchResults.map(r => r.item);
    }

    // Season filter (OR logic - fish matches if any of its seasons match any filter)
    if (fishSeasonFilters.length > 0) {
      results = results.filter(f => f.seasons.some(s => fishSeasonFilters.includes(s)));
    }

    // Weather filter (OR logic)
    if (fishWeatherFilters.length > 0) {
      results = results.filter(f => f.weather.some(w => fishWeatherFilters.includes(w)));
    }

    // Location filter (OR logic)
    if (fishLocationFilters.length > 0) {
      results = results.filter(f => f.locations.some(l => fishLocationFilters.includes(l)));
    }

    // Caught/Uncaught filter
    if (showCaughtOnly) {
      results = results.filter(f => caughtFish.includes(f.id));
    } else if (showUncaughtOnly) {
      results = results.filter(f => !caughtFish.includes(f.id));
    }

    // Sort
    const sorted = [...results];
    switch (fishSortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price_desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'price_asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'size':
        sorted.sort((a, b) => {
          const sizeA = SIZE_ORDER[a.size] ?? 0;
          const sizeB = SIZE_ORDER[b.size] ?? 0;
          if (sizeA !== sizeB) return sizeA - sizeB;
          return a.name.localeCompare(b.name);
        });
        break;
    }

    return sorted;
  }, [fish, fishSearchQuery, fishSeasonFilters, fishWeatherFilters, fishLocationFilters, showCaughtOnly, showUncaughtOnly, fishSortBy, fuse, caughtFish]);

  // Group fish by size for collapsible sections
  const groupedFish = useMemo(() => {
    const groups: Record<string, Fish[]> = {};
    for (const f of filteredFish) {
      if (!groups[f.size]) groups[f.size] = [];
      groups[f.size].push(f);
    }
    return groups;
  }, [filteredFish]);

  const hasFilters = fishSeasonFilters.length > 0 ||
    fishWeatherFilters.length > 0 || fishLocationFilters.length > 0 ||
    fishSearchQuery.trim() !== '' || showCaughtOnly || showUncaughtOnly;

  const caughtCount = caughtFish.length;

  const seasonOptions = fishCategories.seasons.map(s => ({ id: s.id, name: s.name }));
  const weatherOptions = fishCategories.weather.map(w => ({ id: w.id, name: w.name }));
  const locationOptions = fishCategories.locations.map(l => ({ id: l.id, name: l.name }));

  // Shared filter controls
  const filterControlsJSX = (
    <>
      {/* Search row */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchInput
            value={fishSearchQuery}
            onChange={setFishSearchQuery}
            placeholder="Search fish..."
          />
        </div>
        <span className="text-sm px-3 py-1.5 rounded-full bg-gray-100 text-[var(--color-text-muted)] flex-shrink-0">
          {filteredFish.length} found
        </span>
      </div>

      {/* Toggle buttons */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <button
          type="button"
          onClick={() => setShowCaughtOnly(!showCaughtOnly)}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors select-none flex items-center gap-1.5 ${
            showCaughtOnly
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
          onClick={() => setShowUncaughtOnly(!showUncaughtOnly)}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors select-none flex items-center gap-1.5 ${
            showUncaughtOnly
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
            options={seasonOptions}
            selected={fishSeasonFilters}
            onToggle={toggleFishSeasonFilter}
            placeholder="Season"
            className="flex-shrink-0"
          />
          <MultiSelectDropdown
            options={weatherOptions}
            selected={fishWeatherFilters}
            onToggle={toggleFishWeatherFilter}
            placeholder="Weather"
            className="flex-shrink-0"
          />
          <MultiSelectDropdown
            options={locationOptions}
            selected={fishLocationFilters}
            onToggle={toggleFishLocationFilter}
            placeholder="Location"
            className="flex-shrink-0"
          />
        </div>
        <SortDropdown
          options={[
            { value: 'name', label: 'Name A-Z' },
            { value: 'price_desc', label: 'Price: High \u2192 Low' },
            { value: 'price_asc', label: 'Price: Low \u2192 High' },
            { value: 'size', label: 'Size' },
          ]}
          value={fishSortBy}
          onChange={(val) => setFishSortBy(val as 'name' | 'price_asc' | 'price_desc' | 'size')}
          placeholder="Sort"
          className="flex-shrink-0"
        />
      </div>
    </>
  );

  // Render fish cards - grouped by size
  const sizeOrder = ['small', 'medium', 'large', 'guardian'];

  // Running index for alternating row colors
  let globalIndex = 0;

  return (
    <div className={`flex flex-col bg-white relative ${isMobile ? 'min-h-full h-full' : 'h-full rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden'}`}>
      {/* Filter header - always visible, fixed at top for both mobile and desktop */}
      <div ref={headerRef} className={`p-4 border-b border-[var(--color-border)] bg-white flex-shrink-0 ${!isMobile ? 'rounded-t-2xl' : ''}`}>
        {!isMobile && (
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Fish</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-[var(--color-text-muted)]">
                {filteredFish.length} found
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
            {filteredFish.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)]">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <p className="text-lg font-medium mb-2">No fish found</p>
                <p className="text-sm text-center">
                  {hasFilters ? 'Try adjusting your filters' : 'Loading fish data...'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {sizeOrder.map(size => {
                  const fishInGroup = groupedFish[size];
                  if (!fishInGroup || fishInGroup.length === 0) return null;

                  const sizeName = fishCategories.sizes.find(s => s.id === size)?.name || size;
                  const startIndex = globalIndex;
                  globalIndex += fishInGroup.length;

                  return (
                    <CollapsibleSection
                      key={size}
                      title={sizeName}
                      count={fishInGroup.length}
                    >
                      <div className="grid grid-cols-1 tablet:grid-cols-2 gap-3">
                        {fishInGroup.map((f, i) => (
                          isMobile ? (
                            <SwipeableFishCard
                              key={f.id}
                              fish={f}
                              fishCategories={fishCategories}
                              index={startIndex + i}
                            />
                          ) : (
                            <FishCard
                              key={f.id}
                              fish={f}
                              fishCategories={fishCategories}
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
