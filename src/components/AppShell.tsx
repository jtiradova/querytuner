import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { ChatPanel } from './ChatPanel';
import { useChat } from '../contexts/ChatContext';

const STORAGE_KEY = 'sidebar-collapsed';

type AppShellProps = {
  askLabel?: string;
  children: ReactNode;
};

/**
 * App-level chrome: full-width TopNav on the top edge, with a two-column row
 * beneath holding the Sidebar and the page content. The collapsed state is
 * persisted to localStorage so it stays consistent across routes.
 *
 * When the chat panel is in "expanded" mode the page content is hidden and the
 * chat panel grows to fill the entire content area (sidebar still visible),
 * matching Figma 963-51394.
 */
export function AppShell({ askLabel, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  });
  const chat = useChat();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const chatExpanded = chat.isOpen && chat.expanded;

  return (
    <div className="flex flex-col h-full bg-white">
      <TopNav askLabel={askLabel} />
      <div className="flex flex-1 min-h-0">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        {!chatExpanded && (
          <div className="flex-1 flex flex-col min-w-0">{children}</div>
        )}
        <ChatPanel />
      </div>
    </div>
  );
}
