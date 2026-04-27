import type { ReactNode } from 'react';
import { Icon } from './Icon';

export type Tab = {
  id: string;
  label: string;
  icon?: string;
  closeable?: boolean;
};

type TabBarProps = {
  tabs: Tab[];
  activeId: string;
  onSelect?: (id: string) => void;
  onClose?: (id: string) => void;
  onAdd?: () => void;
  trailing?: ReactNode;
};

/**
 * Horizontal tab bar used above the editor content.
 * Active tab gets a purple top-border + white background + bold text.
 */
export function TabBar({ tabs, activeId, onSelect, onClose, onAdd, trailing }: TabBarProps) {
  return (
    <div className="flex items-stretch bg-surface-2 border-b border-border-subtle">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect?.(tab.id)}
            className={`group relative flex items-center gap-2 h-8 px-3 cursor-pointer select-none
              ${isActive
                ? 'bg-white text-text-primary'
                : 'text-text-secondary hover:text-text-primary'}`}
            style={
              isActive
                ? {
                    boxShadow:
                      'inset 0px 2px 0px 0px #820ddf, inset -1px 0px 0px 0px #e6e5ea, inset 1px 0px 0px 0px #e6e5ea',
                  }
                : undefined
            }
          >
            {tab.icon && (
              <Icon
                name={tab.icon}
                className={`text-[14px] ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}
              />
            )}
            <span className={`text-xs ${isActive ? 'font-medium' : 'font-medium'}`}>
              {tab.label}
            </span>
            {tab.closeable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose?.(tab.id);
                }}
                className={`flex items-center justify-center size-4 rounded-xs
                  text-text-low hover:bg-neutral-4 hover:text-text-primary
                  ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                aria-label={`Close ${tab.label}`}
              >
                <Icon name="xmark" className="text-[12px]" />
              </button>
            )}
          </div>
        );
      })}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center justify-center h-8 w-8 text-text-mid hover:bg-neutral-3"
          aria-label="New tab"
        >
          <Icon name="plus" className="text-[12px]" />
        </button>
      )}
      <div className="flex-1" />
      {trailing}
    </div>
  );
}
