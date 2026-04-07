'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';

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
      <InputGroup
        className={cn(
          'cursor-pointer',
          disabled && 'opacity-50 pointer-events-none'
        )}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
      >
        {isOpen ? (
          <InputGroupInput
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
          <span className={cn('flex flex-1 items-center px-2.5 text-sm', value ? '' : 'text-muted-foreground')}>
            {value || placeholder}
          </span>
        )}
        <InputGroupAddon align="inline-end">
          <InputGroupText>
            <ChevronDown className={cn('size-4 transition-transform', isOpen && 'rotate-180')} />
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border shadow-lg rounded-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-muted-foreground text-sm">Sonuç bulunamadı</div>
          ) : (
            filtered.map((item) => (
              <div
                key={item}
                className={cn(
                  'px-3 py-1.5 cursor-pointer text-sm transition-colors rounded-md mx-1 my-0.5',
                  item === value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                )}
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
