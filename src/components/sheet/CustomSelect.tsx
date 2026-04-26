import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomSelectProps {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  label?: string;
  width?: string;
  placeholder?: string;
  showSearch?: boolean;
  /** `underline` = header-style border-b; `field` = rounded card (settings, forms) */
  variant?: 'underline' | 'field';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ 
  value, 
  options, 
  onChange, 
  width = "w-48",
  placeholder = "Select...",
  showSearch = true,
  variant = 'underline',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

  // Focus the search input without scrolling (portal lives at end of <body>,
  // so a plain autoFocus would make the browser jump to the page bottom).
  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus({ preventScroll: true });
  }, []);

  // Calculate dropdown position from the trigger button's bounding rect so the
  // dropdown is rendered via a portal and escapes any overflow:hidden/auto ancestor.
  const recalcPosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 320; // max approximate height
    const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: Math.max(rect.width, 256),
      zIndex: 9999,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  };

  useLayoutEffect(() => {
    if (isOpen) {
      recalcPosition();
      // Defer focus so the dropdown has been positioned first
      requestAnimationFrame(focusSearch);
    }
  }, [isOpen]);

  // Close on outside click (must check both trigger and dropdown portal)
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  // Reposition on scroll / resize so the dropdown tracks the trigger
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => recalcPosition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  const dropdown = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={dropdownStyle}
          className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col shadow-xl ring-1 ring-border/80"
        >
          {showSearch && (
            <div className="p-2 border-b border-border bg-slate-50">
              <input
                ref={searchInputRef}
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-surface border border-border rounded-lg text-ink outline-none focus:border-accent transition-colors placeholder:text-muted"
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto custom-scrollbar py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold transition-all hover:bg-slate-50',
                    value === opt ? 'text-accent bg-accent/10' : 'text-slate-600'
                  )}
                >
                  <span>{opt}</span>
                  {value === opt && <Check size={14} className="text-accent" />}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-[10px] font-black uppercase tracking-widest text-muted">
                No results
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          'flex items-center justify-between text-left group outline-none transition-all',
          variant === 'field'
            ? cn(
                /* slate + white: each has a .dark override in styles/index.css (opacity on theme colors did not) */
                'rounded-xl border px-4 py-3 text-sm font-bold text-slate-800',
                'bg-slate-100 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                'focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:border-accent',
                isOpen && 'border-accent bg-white ring-2 ring-accent/15 shadow-sm',
              )
            : cn(
                'font-bold text-lg bg-transparent border-b border-border py-1 hover:border-accent',
                isOpen && 'border-accent',
              ),
          width,
        )}
      >
        <span className={cn('truncate', variant === 'field' && 'text-slate-800')}>
          {value || <span className="text-slate-400 font-semibold">{placeholder}</span>}
        </span>
        <ChevronDown
          size={variant === 'field' ? 16 : 18}
          className={cn(
            'text-muted group-hover:text-accent transition-transform duration-200 shrink-0 ml-2',
            isOpen && 'rotate-180 text-accent'
          )}
        />
      </button>

      {createPortal(dropdown, document.body)}
    </div>
  );
};
