import { Button } from './Button';

interface ImportConfirmModalProps {
  bookmarkedCount: number;
  ownedCount: number;
  errors: string[];
  onMerge: () => void;
  onReplace: () => void;
  onCancel: () => void;
}

export function ImportConfirmModal({
  bookmarkedCount,
  ownedCount,
  errors,
  onMerge,
  onReplace,
  onCancel,
}: ImportConfirmModalProps) {
  return (
    <>
      {/* Backdrop (higher z-index than SettingsModal) */}
      <div
        className="fixed inset-0 bg-black/50 z-[60]"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-xl shadow-xl max-w-sm w-full pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Import Recipes</h2>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Summary */}
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                Found in CSV file:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  {bookmarkedCount} bookmarked recipe{bookmarkedCount !== 1 ? 's' : ''}
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {ownedCount} owned recipe{ownedCount !== 1 ? 's' : ''}
                </li>
              </ul>
            </div>

            {/* Warnings */}
            {errors.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800 mb-1">
                  Warnings ({errors.length}):
                </p>
                <ul className="text-xs text-amber-700 space-y-1 max-h-24 overflow-y-auto">
                  {errors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {errors.length > 5 && (
                    <li className="text-amber-600">...and {errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            {/* Question */}
            <p className="text-sm text-gray-700 mb-4">
              How would you like to import these recipes?
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button onClick={onMerge} className="w-full justify-center">
                Merge with existing
              </Button>
              <Button onClick={onReplace} variant="secondary" className="w-full justify-center">
                Replace all
              </Button>
              <button
                onClick={onCancel}
                className="w-full py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
