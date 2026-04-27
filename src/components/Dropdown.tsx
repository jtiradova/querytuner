import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

type DropdownProps = {
  trigger: (opts: { open: boolean; toggle: () => void }) => ReactNode;
  children: (opts: { close: () => void }) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
  menuClassName?: string;
  offsetY?: number;
};

/**
 * Minimal popover / dropdown. Closes on outside click and Escape.
 * Positioned absolute to the trigger wrapper, which uses `position: relative`.
 */
export function Dropdown({
  trigger,
  children,
  align = 'left',
  className = '',
  menuClassName = '',
  offsetY = 6,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={`absolute z-50 min-w-[220px] rounded-md bg-white shadow-popover py-1
            ${align === 'right' ? 'right-0' : 'left-0'} ${menuClassName}`}
          style={{ top: `calc(100% + ${offsetY}px)` }}
          role="menu"
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}

type MenuItemProps = {
  icon?: string;
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export function MenuItem({ icon, label, shortcut, onClick, disabled }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 w-full px-3 h-8 text-sm text-left text-text-mid
        hover:bg-neutral-3 disabled:text-neutral-7 disabled:cursor-not-allowed"
      role="menuitem"
    >
      {icon && <Icon name={icon} className="text-[14px] text-text-mid" />}
      <span className="flex-1 truncate">{label}</span>
      {shortcut && <span className="text-xs text-text-low">{shortcut}</span>}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1 h-px bg-border-subtle" />;
}
