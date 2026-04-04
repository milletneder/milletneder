'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seçin...',
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleSelect = useCallback(
    (item: string) => {
      onChange(item);
      setSearch('');
      setIsOpen(false);
    },
    [onChange]
  );

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`w-full bg-white border px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
          isOpen ? 'border-black' : 'border-neutral-300'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
      >
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full outline-none text-black placeholder-neutral-400 bg-transparent"
            placeholder={value || placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsOpen(false);
                setSearch('');
              }
              if (e.key === 'Enter' && filtered.length === 1) {
                handleSelect(filtered[0]);
              }
            }}
          />
        ) : (
          <span className={value ? 'text-black' : 'text-neutral-400'}>
            {value || placeholder}
          </span>
        )}
        <svg
          className={`w-4 h-4 text-neutral-400 flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-300 shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-neutral-400 text-sm">Sonuç bulunamadı</div>
          ) : (
            filtered.map((item) => (
              <div
                key={item}
                className={`px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                  item === value
                    ? 'bg-black text-white'
                    : 'text-black hover:bg-neutral-100'
                }`}
                onClick={() => handleSelect(item)}
              >
                {item}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
