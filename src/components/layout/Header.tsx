import { useState } from 'react';
import { useBookmarkStore } from '../../store/bookmarkStore';
import { useSettingsStore } from '../../store/settingsStore';

const pages = [
  { id: 'kitchen', icon: '/icons/kitchen.png', label: 'Kitchen Companion' },
  { id: 'fishing', icon: '/icons/fishing-rod.png', label: 'Fishing Companion' },
  { id: 'critters', icon: '/icons/critters.png', label: 'Critter Companion' },
] as const;

interface HeaderProps {
  onStatusBarTap?: () => void;
}

export function Header({ onStatusBarTap }: HeaderProps) {
  const { bookmarkedRecipes } = useBookmarkStore();
  const { activePage, setActivePage, showBookmarksView, setShowBookmarksView, showBookmarksDrawer, setShowBookmarksDrawer, showSettingsModal, setShowSettingsModal } = useSettingsStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const bookmarkCount = bookmarkedRecipes.length;
  const activePageData = pages.find(p => p.id === activePage)!;

  const handleIconClick = (pageId: typeof activePage) => {
    if (pageId === activePage) {
      // Tapping active icon toggles drawer
      setDrawerOpen(prev => !prev);
    } else {
      // Tapping inactive icon switches page and closes drawer
      setActivePage(pageId);
      setDrawerOpen(false);
    }
  };

  return (
    <header
      className="bg-[var(--color-primary)] text-white shadow-lg relative"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* iOS-style status bar tap target */}
      {onStatusBarTap && (
        <button
          onClick={onStatusBarTap}
          className="absolute top-0 left-0 right-0 z-50 sm:hidden"
          style={{
            height: 'calc(env(safe-area-inset-top, 0px) + 20px)',
            minHeight: '20px',
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label="Scroll to top"
        />
      )}
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Main header row */}
        <div className="flex items-center justify-between">
          {/* Logo/Title with page navigation drawer */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Icon drawer container */}
            <div className="flex items-center">
              {pages.map((page, index) => {
                const isActive = page.id === activePage;
                const showIcon = drawerOpen || isActive;
                // First visible icon when collapsed is always the active one (no margin).
                // When expanded, the first icon in the list (index 0) gets no margin,
                // all others get margin.
                const needsMargin = showIcon && drawerOpen && index > 0;

                return (
                  <div
                    key={page.id}
                    className="overflow-hidden flex-shrink-0"
                    style={{
                      width: showIcon ? (isActive ? undefined : '') : '0',
                      maxWidth: showIcon ? '3rem' : '0',
                      opacity: showIcon ? 1 : 0,
                      marginLeft: needsMargin ? '0.625rem' : '0',
                      transition: 'max-width 200ms ease-out, opacity 200ms ease-out, margin 200ms ease-out',
                    }}
                  >
                    <button
                      onClick={() => handleIconClick(page.id as typeof activePage)}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${
                        isActive ? 'border-2 border-white' : 'opacity-60 hover:opacity-80'
                      }`}
                      title={page.label}
                      aria-label={page.label}
                    >
                      <img
                        src={page.icon}
                        alt={page.label}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-baseline gap-2 sm:block">
              <h1 className="text-lg sm:text-xl font-bold">SOSGB</h1>
              <p className="text-sm text-white/80">
                {activePageData.label}
              </p>
            </div>
          </div>

          {/* Desktop/Tablet: Bookmark toggle and Settings inline */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Bookmark drawer toggle button */}
            <button
              onClick={() => setShowBookmarksDrawer(!showBookmarksDrawer)}
              className={`relative w-10 h-10 rounded-lg flex items-center justify-center mr-2 ${
                showBookmarksDrawer
                  ? 'bg-red-500 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              style={{ transition: 'none' }}
              title={showBookmarksDrawer ? 'Close bookmarks' : 'View bookmarked recipes'}
              aria-label={showBookmarksDrawer ? 'Close bookmarks' : 'View bookmarked recipes'}
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill={showBookmarksDrawer ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              {bookmarkCount > 0 && !showBookmarksDrawer && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {bookmarkCount}
                </span>
              )}
            </button>

            {/* Settings button */}
            <button
              onClick={() => setShowSettingsModal(!showSettingsModal)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                showSettingsModal
                  ? 'bg-white text-[var(--color-primary)]'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              style={{ transition: 'none' }}
              title="Settings"
              aria-label="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Mobile: Bookmark and Settings buttons */}
          <div className="sm:hidden flex items-center gap-2">
            {/* Bookmark toggle button */}
            <button
              onClick={() => setShowBookmarksView(!showBookmarksView)}
              className={`relative p-2 rounded-lg ${showBookmarksView ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'}`}
              style={{ transition: 'none' }}
              aria-label={showBookmarksView ? 'Exit bookmarks view' : 'View bookmarked recipes'}
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill={showBookmarksView ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              {bookmarkCount > 0 && !showBookmarksView && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {bookmarkCount}
                </span>
              )}
            </button>

            {/* Settings button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30"
              style={{ transition: 'none' }}
              aria-label="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
