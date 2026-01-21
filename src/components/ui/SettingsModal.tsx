import { useState, useRef } from 'react';
import type { Recipe, Utensil } from '../../types';
import { useBookmarkStore } from '../../store/bookmarkStore';
import { useOwnedRecipesStore } from '../../store/ownedRecipesStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { generateRecipeCSV, parseRecipeCSV, downloadCSV } from '../../lib/dataExport';
import { ImportConfirmModal } from './ImportConfirmModal';
import { Button } from './Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: Recipe[];
  utensils: Utensil[];
}

export function SettingsModal({ isOpen, onClose, recipes, utensils }: SettingsModalProps) {
  const { bookmarkedRecipes, setBookmarks, mergeBookmarks } = useBookmarkStore();
  const { ownedRecipes, setOwnedRecipes, mergeOwnedRecipes } = useOwnedRecipesStore();
  const { ownedUtensils, toggleUtensil } = useInventoryStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importData, setImportData] = useState<{
    bookmarked: string[];
    owned: string[];
    errors: string[];
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Create recipe map for lookups
  const recipeMap = new Map(recipes.map(r => [r.id, r]));

  const handleExport = () => {
    const csv = generateRecipeCSV(bookmarkedRecipes, ownedRecipes, recipeMap);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `sosgb-recipes-${timestamp}.csv`);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseRecipeCSV(content, recipeMap);

      if (result.errors.length > 0 && result.bookmarked.length === 0 && result.owned.length === 0) {
        // Only errors, no valid data
        setImportError(result.errors.join('\n'));
        return;
      }

      setImportData(result);
    };
    reader.onerror = () => {
      setImportError('Failed to read file');
    };
    reader.readAsText(file);

    // Reset file input so the same file can be selected again
    event.target.value = '';
  };

  const handleImportMerge = () => {
    if (!importData) return;
    mergeBookmarks(importData.bookmarked);
    mergeOwnedRecipes(importData.owned);
    setImportData(null);
  };

  const handleImportReplace = () => {
    if (!importData) return;
    setBookmarks(importData.bookmarked);
    setOwnedRecipes(importData.owned);
    setImportData(null);
  };

  const handleImportCancel = () => {
    setImportData(null);
  };

  if (!isOpen) return null;

  const hasData = bookmarkedRecipes.length > 0 || ownedRecipes.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-6">
            {/* Utensils Section */}
            <section>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Owned Utensils</h3>
              <p className="text-sm text-gray-600 mb-3">
                Toggle which cooking utensils you own. Recipes requiring unowned utensils will be hidden.
              </p>
              <div className="flex flex-wrap gap-2">
                {utensils
                  .filter((u) => u.id !== 'none')
                  .map((utensil) => (
                    <button
                      key={utensil.id}
                      onClick={() => toggleUtensil(utensil.id)}
                      className={`px-4 py-2 text-sm rounded-lg border-2 ${
                        ownedUtensils.includes(utensil.id)
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {utensil.name}
                    </button>
                  ))}
              </div>
            </section>

            {/* Divider */}
            <hr className="border-gray-200" />

            {/* Export Section */}
            <section>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Export Data</h3>
              <p className="text-sm text-gray-600 mb-3">
                Download your bookmarked and owned recipes as a CSV file.
              </p>
              <div className="flex items-center gap-3">
                <Button onClick={handleExport} disabled={!hasData}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </Button>
                {!hasData && (
                  <span className="text-sm text-gray-500">No recipes to export</span>
                )}
              </div>
              {hasData && (
                <p className="text-xs text-gray-500 mt-2">
                  {bookmarkedRecipes.length} bookmarked, {ownedRecipes.length} owned
                </p>
              )}
            </section>

            {/* Divider */}
            <hr className="border-gray-200" />

            {/* Import Section */}
            <section>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Import Data</h3>
              <p className="text-sm text-gray-600 mb-3">
                Import recipes from a CSV file. You can choose to merge with or replace existing data.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Select CSV File
              </Button>
              {importError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 whitespace-pre-wrap">{importError}</p>
                </div>
              )}
            </section>

            {/* Divider */}
            <hr className="border-gray-200" />

            {/* CSV Format Info */}
            <section>
              <h3 className="text-sm font-medium text-gray-900 mb-2">CSV Format</h3>
              <p className="text-xs text-gray-600 mb-2">
                The CSV file should have these columns:
              </p>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
{`id,name,bookmarked,owned
curry_rice,Curry Rice,yes,no
herb_salad,Herb Salad,yes,yes`}
              </pre>
            </section>
          </div>
        </div>
      </div>

      {/* Import Confirmation Modal */}
      {importData && (
        <ImportConfirmModal
          bookmarkedCount={importData.bookmarked.length}
          ownedCount={importData.owned.length}
          errors={importData.errors}
          onMerge={handleImportMerge}
          onReplace={handleImportReplace}
          onCancel={handleImportCancel}
        />
      )}
    </>
  );
}
