import { useState } from 'react';
import type { Fish, FishCategories } from '../../types';
import { useCaughtFishStore } from '../../store/caughtFishStore';

interface FishCardProps {
  fish: Fish;
  fishCategories: FishCategories;
  index?: number;
}

const SIZE_COLORS: Record<string, string> = {
  small: 'bg-green-100 text-green-700',
  medium: 'bg-blue-100 text-blue-700',
  large: 'bg-purple-100 text-purple-700',
  guardian: 'bg-yellow-100 text-yellow-700',
};

const SIZE_BORDER: Record<string, string> = {
  small: 'border-green-200',
  medium: 'border-blue-200',
  large: 'border-purple-200',
  guardian: 'border-yellow-200',
};

const SIZE_BG: Record<string, string> = {
  small: 'bg-green-50',
  medium: 'bg-blue-50',
  large: 'bg-purple-50',
  guardian: 'bg-yellow-50',
};

const SIZE_ICON_BG: Record<string, string> = {
  small: 'bg-green-100',
  medium: 'bg-blue-100',
  large: 'bg-purple-100',
  guardian: 'bg-yellow-100',
};

const SEASON_COLORS: Record<string, string> = {
  spring: 'bg-pink-100 text-pink-700',
  summer: 'bg-yellow-100 text-yellow-700',
  autumn: 'bg-orange-100 text-orange-700',
  winter: 'bg-cyan-100 text-cyan-700',
};

const WEATHER_COLORS: Record<string, string> = {
  sunny: 'bg-amber-100 text-amber-700',
  cloudy: 'bg-gray-100 text-gray-600',
  rainy: 'bg-blue-100 text-blue-700',
  stormy: 'bg-indigo-100 text-indigo-700',
};

function getLabelFromCategories(categories: { id: string; name: string }[], id: string): string {
  return categories.find(c => c.id === id)?.name || id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function FishCard({ fish, fishCategories }: FishCardProps) {
  const { caughtFish, toggleCaught } = useCaughtFishStore();
  const isCaught = caughtFish.includes(fish.id);
  const [isHovered, setIsHovered] = useState(false);

  const sizeName = getLabelFromCategories(fishCategories.sizes, fish.size);
  const rodName = getLabelFromCategories(fishCategories.rodLevels, fish.rodLevel);

  return (
    <div
      className={`relative ${isHovered ? 'z-20' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Desktop action button - caught toggle tab */}
      <div className={`hidden tablet:flex flex-row gap-0.5 absolute -top-9 right-4 transition-all duration-200 ease-out ${
        isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}>
        <button
          onClick={(e) => { e.stopPropagation(); toggleCaught(fish.id); }}
          className={`px-2 pt-2 pb-3 rounded-t-lg border border-b-0 transition-colors ${
            isCaught
              ? 'bg-green-500 text-white border-green-400 hover:bg-green-600'
              : 'bg-white text-gray-400 border-gray-300 hover:text-green-500 hover:bg-green-50 hover:border-green-400'
          }`}
          title={isCaught ? 'Mark as not caught' : 'Mark as caught'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isCaught ? 3 : 2}
                  d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>

      {/* Card content */}
      <div className={`relative z-10 rounded-xl border p-3 transition-shadow hover:shadow-md ${SIZE_BORDER[fish.size]} ${SIZE_BG[fish.size]}`}>
        {/* Header row */}
        <div className="relative flex items-start gap-3 mb-3">
          {/* Fish icon */}
          <div className="w-16 h-16 flex-shrink-0 relative">
            <div className={`w-full h-full rounded-xl flex items-center justify-center overflow-hidden ${SIZE_ICON_BG[fish.size]}`}>
              <img
                src={`/images/fish/${fish.icon}`}
                alt={fish.name}
                className="w-14 h-14 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/placeholder.svg';
                }}
              />
            </div>
          </div>
          {/* Name and details */}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <h3 className="font-semibold text-sm text-[var(--color-text)] flex items-center gap-1.5">
              {isCaught && (
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white flex items-center justify-center" style={{ boxShadow: '0 1px 0 rgba(0,0,0,1)' }}>
                  <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </span>
              )}
              <span className="truncate">{fish.name}</span>
            </h3>
            <div className="text-xs font-medium text-[var(--color-text-muted)]">
              {rodName}
            </div>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium w-fit ${SIZE_COLORS[fish.size]}`}>
              {sizeName}
            </span>
          </div>
          {/* Price - top right */}
          <div className="absolute top-0 right-0 flex flex-col items-end gap-1">
            <span
              className="text-sm bg-amber-100 px-2 py-0.5 rounded-full leading-none"
              style={{ fontFamily: "'Eurostile Round Pro', system-ui, sans-serif", color: '#fc6800' }}
            >
              {fish.price} G
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className={`border-t mb-3 ${SIZE_BORDER[fish.size]}`}></div>

        {/* Details */}
        <div className="flex flex-col gap-2">
          {/* Seasons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-medium text-[var(--color-text-muted)] w-14 flex-shrink-0">Season</span>
            {fish.seasons.map(s => (
              <span key={s} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${SEASON_COLORS[s] || 'bg-gray-100 text-gray-600'}`}>
                {getLabelFromCategories(fishCategories.seasons, s)}
              </span>
            ))}
          </div>

          {/* Weather */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-medium text-[var(--color-text-muted)] w-14 flex-shrink-0">Weather</span>
            {fish.weather.map(w => (
              <span key={w} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${WEATHER_COLORS[w] || 'bg-gray-100 text-gray-600'}`}>
                {getLabelFromCategories(fishCategories.weather, w)}
              </span>
            ))}
          </div>

          {/* Locations */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-medium text-[var(--color-text-muted)] w-14 flex-shrink-0">Location</span>
            {fish.locations.map(l => (
              <span key={l} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                {getLabelFromCategories(fishCategories.locations, l)}
              </span>
            ))}
          </div>

          {/* Notes */}
          {fish.notes && (
            <div className="flex items-start gap-1.5">
              <span className="text-[10px] font-medium text-[var(--color-text-muted)] w-14 flex-shrink-0">Notes</span>
              <span className="text-[10px] text-[var(--color-text-muted)] italic">{fish.notes}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
