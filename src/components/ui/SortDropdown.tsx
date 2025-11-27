import { useState, useRef, useEffect } from 'react';

interface SortOption {
  value: string;
  label: string;
}

interface SortDropdownProps {
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export function SortDropdown({
  options,
  value,
  onChange,
  placeholder,
  className = '',
}: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={`relative select-none ${className}`} style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 text-sm border border-[var(--color-border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-left flex items-center justify-between gap-1.5 select-none"
      >
        <span className="text-[var(--color-text)]">
          {placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-1 w-max min-w-full bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto select-none">
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer whitespace-nowrap select-none ${
                index % 2 === 0 ? 'bg-white hover:bg-gray-200' : 'bg-gray-100 hover:bg-gray-300'
              }`}
            >
              <span className={`w-4 h-4 flex items-center justify-center flex-shrink-0 ${value === option.value ? 'text-[var(--color-primary)]' : 'text-transparent'}`}>
                {value === option.value && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
              <span className="text-sm text-[var(--color-text)]">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
