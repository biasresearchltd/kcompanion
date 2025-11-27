import { useState, useRef, useEffect } from 'react';

interface Option {
  id: string;
  name: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selected: string[];
  onToggle: (id: string) => void;
  placeholder: string;
  className?: string;
}

export function MultiSelectDropdown({
  options,
  selected,
  onToggle,
  placeholder,
  className = '',
}: MultiSelectDropdownProps) {
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

  const displayText = selected.length === 0
    ? placeholder
    : `${selected.length} selected`;

  return (
    <div ref={dropdownRef} className={`relative select-none ${className}`} style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 text-sm border border-[var(--color-border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-left flex items-center justify-between gap-1.5 select-none"
      >
        <span className={selected.length === 0 ? 'text-[var(--color-text)]' : 'text-[var(--color-primary)] font-medium'}>
          {displayText}
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
        <div className="absolute z-20 mt-1 w-max min-w-full bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto select-none">
          {options.map((option, index) => (
            <label
              key={option.id}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer whitespace-nowrap select-none ${
                index % 2 === 0 ? 'bg-white hover:bg-gray-200' : 'bg-gray-100 hover:bg-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                onChange={() => onToggle(option.id)}
                className="w-4 h-4 text-[var(--color-primary)] rounded focus:ring-[var(--color-primary)] flex-shrink-0"
              />
              <span className="text-sm text-[var(--color-text)]">{option.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
