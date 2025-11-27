import { useState, useEffect, type ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  count: number;
  icon: ReactNode;
  colorClass: string;
  children: ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export function CollapsibleSection({
  title,
  count,
  icon,
  colorClass,
  children,
  defaultOpen = true,
  isOpen: controlledIsOpen,
  onToggle,
}: CollapsibleSectionProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  // Sync internal state with controlled state when it changes
  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setInternalIsOpen(controlledIsOpen);
    }
  }, [controlledIsOpen]);

  const handleToggle = () => {
    const newState = !isOpen;
    setInternalIsOpen(newState);
    onToggle?.(newState);
  };

  return (
    <div>
      <button
        onClick={handleToggle}
        className={`w-full text-sm font-semibold ${colorClass} mb-3 flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer select-none`}
      >
        {/* Chevron indicator */}
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        {icon}
        <span>{title}</span>
        <span className="opacity-70">({count})</span>
      </button>

      {isOpen && children}
    </div>
  );
}
