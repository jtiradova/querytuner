import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from './Icon';

type NavChild = {
  label: string;
  to?: string;
  badge?: string;
  match?: (pathname: string) => boolean;
};

type NavItem = {
  id: string;
  label: string;
  icon: string;
  to?: string;
  match?: (pathname: string) => boolean;
  children?: NavChild[];
  /** If defined, the section is expanded whenever the predicate returns true. */
  autoExpand?: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'house', to: '/home' },
  { id: 'workspaces', label: 'Workspaces', icon: 'server', to: '/workspaces' },
  { id: 'databases', label: 'Databases', icon: 'database', to: '/databases' },
  {
    id: 'ingestion',
    label: 'Ingestion',
    icon: 'download',
    children: [
      { label: 'Load Data' },
      { label: 'Pipelines' },
      { label: 'Flow', badge: 'Preview' },
    ],
  },
  {
    id: 'editor',
    label: 'Editor',
    icon: 'terminal',
    to: '/editor',
    match: (p) => p === '/editor' || p === '/editor/query',
  },
  {
    id: 'ai',
    label: 'AI',
    icon: 'wand-magic-sparkles',
    children: [
      { label: 'Analyst' },
      { label: 'AI & ML functions' },
    ],
  },
  { id: 'container', label: 'Container Services', icon: 'cube' },
  {
    id: 'monitoring',
    label: 'Monitoring',
    icon: 'chart-line',
    autoExpand: (p) =>
      p.startsWith('/editor/visual-explain') || p.startsWith('/monitoring'),
    children: [
      { label: 'Active Queries' },
      {
        label: 'Visual Explain',
        to: '/editor/visual-explain',
        match: (p) => p.startsWith('/editor/visual-explain'),
      },
      {
        label: 'Query History',
        to: '/monitoring/query-history',
        match: (p) => p.startsWith('/monitoring/query-history'),
      },
      { label: 'Active Workload' },
      { label: 'Historical Monitoring' },
      { label: 'Activity History', badge: 'Preview' },
      { label: 'Integrations' },
      { label: 'Alerts' },
    ],
  },
  { id: 'configuration', label: 'Configuration', icon: 'gear' },
];

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return collapsed ? (
    <CollapsedSidebar onToggle={onToggle} />
  ) : (
    <ExpandedSidebar onToggle={onToggle} />
  );
}

function ExpandedSidebar({ onToggle }: { onToggle: () => void }) {
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const isSectionOpen = (item: NavItem) => {
    if (expanded[item.id] !== undefined) return expanded[item.id];
    return item.autoExpand ? item.autoExpand(location.pathname) : false;
  };

  return (
    <aside
      className="w-[240px] shrink-0 bg-surface-2 border-r border-neutral-5 flex flex-col"
      aria-label="Primary navigation"
    >
      <div className="p-2">
        <button className="flex items-center justify-center gap-2 w-full h-8 rounded-sm bg-white border border-neutral-6 text-sm text-text-mid font-medium hover:bg-neutral-2">
          <Icon name="plus" className="text-[14px]" />
          <span>Create New</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {NAV_ITEMS.map((item) => {
          if (item.to) {
            const isActive = item.match
              ? item.match(location.pathname)
              : location.pathname === item.to;
            return (
              <NavLink
                key={item.id}
                to={item.to}
                className={`flex items-center gap-2 h-8 px-2 rounded-sm text-sm font-normal
                  ${isActive
                    ? 'bg-surface-selected text-brand-9'
                    : 'text-text-mid hover:bg-neutral-3'}`}
              >
                <span className="w-5 text-center">
                  <Icon
                    name={item.icon}
                    className={`text-[14px] ${isActive ? 'text-brand-9' : ''}`}
                  />
                </span>
                <span className="flex-1 truncate">{item.label}</span>
              </NavLink>
            );
          }

          const isOpen = isSectionOpen(item);
          return (
            <div key={item.id} className="flex flex-col">
              <button
                type="button"
                onClick={() => item.children && toggleSection(item.id)}
                className="flex items-center gap-2 h-8 px-2 rounded-sm text-sm text-text-mid hover:bg-neutral-3"
              >
                <span className="w-5 text-center">
                  <Icon name={item.icon} className="text-[14px]" />
                </span>
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.children && (
                  <Icon
                    name={isOpen ? 'chevron-down' : 'chevron-right'}
                    variant="solid"
                    className="text-[10px] text-text-low"
                  />
                )}
              </button>
              {isOpen && item.children && (
                <div className="flex flex-col pl-7">
                  {item.children.map((child) => {
                    const isChildActive = child.match
                      ? child.match(location.pathname)
                      : child.to
                      ? location.pathname === child.to
                      : false;

                    const inner = (
                      <>
                        <span className="flex-1 text-left truncate">{child.label}</span>
                        {child.badge && (
                          <span
                            className={`text-[10px] font-medium ${
                              isChildActive ? 'text-brand-9' : 'text-brand-9'
                            }`}
                          >
                            {child.badge}
                          </span>
                        )}
                      </>
                    );

                    const className = `flex items-center gap-2 h-8 px-2 rounded-sm text-sm ${
                      isChildActive
                        ? 'bg-surface-selected text-brand-9 font-medium'
                        : 'text-text-mid hover:bg-neutral-3'
                    }`;

                    if (child.to) {
                      return (
                        <NavLink key={child.label} to={child.to} className={className}>
                          {inner}
                        </NavLink>
                      );
                    }
                    return (
                      <button key={child.label} type="button" className={className}>
                        {inner}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-2 flex flex-col gap-2 border-t border-neutral-5">
        <div className="flex items-center gap-1 h-8 rounded-sm bg-white border border-border-subtle overflow-hidden">
          <div className="flex items-center gap-1.5 flex-1 px-2 min-w-0">
            <span className="relative flex items-center justify-center size-4 rounded-full">
              <svg viewBox="0 0 16 16" className="size-4">
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  fill="none"
                  stroke="#ededed"
                  strokeWidth="2"
                />
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  fill="none"
                  stroke="#820ddf"
                  strokeWidth="2"
                  strokeDasharray={`${Math.PI * 12 * 0.5} ${Math.PI * 12}`}
                  strokeDashoffset={Math.PI * 12 * 0.25}
                  transform="rotate(-90 8 8)"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="text-xs text-text-mid truncate">50% free usage</span>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 h-full px-2 text-brand-9 hover:bg-brand-2 text-xs font-bold border-l border-border-subtle"
            style={{ fontFamily: 'Lato, sans-serif' }}
          >
            <Icon name="bolt" className="text-[12px]" />
            <span>Upgrade</span>
          </button>
        </div>

        <button className="flex items-center gap-2 p-1 rounded-sm hover:bg-neutral-3">
          <span className="flex items-center justify-center h-7 w-7 rounded-xs bg-brand-3 text-text-primary text-xs font-medium shrink-0">
            JT
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-xs text-text-primary font-medium truncate">
              Jessica Tirado
            </span>
            <span className="block text-[10px] text-text-low truncate">
              S2DB DPS - CLAUDE AI EVALU...
            </span>
          </span>
          <Icon name="chevron-down" variant="solid" className="text-[10px] text-text-low" />
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 h-8 px-2 rounded-sm text-text-mid hover:bg-neutral-3 text-sm"
          title="Collapse sidebar"
        >
          <Icon name="angles-left" className="text-[14px] w-5 text-center" />
          <span>Collapse</span>
        </button>
      </div>
    </aside>
  );
}

const COLLAPSED_ITEMS: { id: string; icon: string; label: string; to?: string; match?: (p: string) => boolean }[] = [
  { id: 'home', icon: 'house', label: 'Home', to: '/home' },
  { id: 'databases', icon: 'database', label: 'Databases', to: '/databases' },
  { id: 'ingestion', icon: 'download', label: 'Ingestion' },
  {
    id: 'editor',
    icon: 'terminal',
    label: 'Editor',
    to: '/editor',
    match: (p) => p.startsWith('/editor'),
  },
  { id: 'ai', icon: 'wand-magic-sparkles', label: 'AI' },
  { id: 'container', icon: 'layer-group', label: 'Container Services' },
  { id: 'monitoring', icon: 'chart-line', label: 'Monitoring' },
  { id: 'configuration', icon: 'gear', label: 'Configuration' },
];

function CollapsedSidebar({ onToggle }: { onToggle: () => void }) {
  const location = useLocation();

  return (
    <aside
      className="w-12 shrink-0 bg-surface-2 border-r border-neutral-5 flex flex-col items-center justify-between py-4"
      aria-label="Primary navigation"
    >
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <button
          type="button"
          title="Create New"
          className="flex items-center justify-center size-8 w-full rounded-sm bg-white border border-neutral-6 text-text-mid hover:bg-neutral-2"
        >
          <Icon name="plus" className="text-[14px]" />
        </button>

        <div className="h-1" />

        {COLLAPSED_ITEMS.map((item) => {
          if (item.to) {
            const isActive = item.match
              ? item.match(location.pathname)
              : location.pathname === item.to;
            return (
              <NavLink
                key={item.id}
                to={item.to}
                title={item.label}
                className={`flex items-center justify-center size-8 rounded-sm
                  ${isActive
                    ? 'bg-surface-selected text-brand-9'
                    : 'text-text-mid hover:bg-neutral-3'}`}
              >
                <Icon name={item.icon} className="text-[14px]" />
              </NavLink>
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              className="flex items-center justify-center size-8 rounded-sm text-text-mid hover:bg-neutral-3"
            >
              <Icon name={item.icon} className="text-[14px]" />
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-3 w-full px-2">
        <button
          type="button"
          title="Upgrade"
          className="flex items-center justify-center size-6 rounded-xs border border-border-brand bg-white text-brand-9 hover:bg-brand-2"
        >
          <Icon name="bolt" className="text-[12px]" />
        </button>

        <button
          type="button"
          title="Jessica Tirado"
          className="flex items-center justify-center size-8 rounded-xs bg-brand-3 text-text-primary text-sm font-medium"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          JT
        </button>

        <button
          type="button"
          onClick={onToggle}
          title="Expand sidebar"
          className="flex items-center justify-center size-8 rounded-sm text-text-mid hover:bg-neutral-3"
        >
          <Icon name="table-columns" className="text-[14px]" />
        </button>

        <button
          type="button"
          title="Cookies"
          className="flex items-center justify-center size-8 rounded-sm text-text-mid hover:bg-neutral-3"
        >
          <Icon name="cookie-bite" className="text-[14px]" />
        </button>
      </div>
    </aside>
  );
}
