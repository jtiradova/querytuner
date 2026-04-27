import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { AppShell } from '../components/AppShell';
import { TabBar } from '../components/TabBar';
import { Dropdown, MenuItem, MenuDivider } from '../components/Dropdown';
import { STORAGE_KEY_PREVIEW_REWRITE, useChat } from '../contexts/ChatContext';
import { useEditorWorkspace } from '../contexts/EditorWorkspaceContext';

type FileRow = {
  id: string;
  name: string;
  type: 'SQL file' | 'Notebook';
  location: 'Personal' | 'Shared';
  lastModified: string;
  size: string;
};

const FILES: FileRow[] = [
  { id: 'f1', name: 'sql-editor-2026-03-25.sql', type: 'SQL file', location: 'Personal', lastModified: 'Mar 25, 2026 - 11:57:23 PM', size: '358 B' },
  { id: 'f2', name: 'mg-simple-udf.ipynb', type: 'Notebook', location: 'Shared', lastModified: 'Mar 25, 2026 - 10:49:51 PM', size: '3 KB' },
  { id: 'f3', name: 'optimal-stress-pipeline.ipynb', type: 'Notebook', location: 'Shared', lastModified: 'Feb 18, 2026 - 5:30:32 PM', size: '13 KB' },
  { id: 'f4', name: 'pk-sqlbot-relationships-job-not…', type: 'Notebook', location: 'Shared', lastModified: 'Feb 15, 2026 - 5:01:42 PM', size: '47 KB' },
  { id: 'f5', name: 'sqlbot (1).ipynb', type: 'Notebook', location: 'Shared', lastModified: 'Feb 11, 2026 - 3:16:15 PM', size: '121 KB' },
  { id: 'f6', name: 'vsingh-sqlbot-202601232109…', type: 'Notebook', location: 'Shared', lastModified: 'Jan 29, 2026 - 9:33:36 PM', size: '88 KB' },
  { id: 'f7', name: 'vsingh-sqlbot-202601202214…', type: 'Notebook', location: 'Shared', lastModified: 'Jan 21, 2026 - 5:55:25 AM', size: '120 KB' },
  { id: 'f8', name: 'sqlbot.ipynb', type: 'Notebook', location: 'Shared', lastModified: 'Jan 12, 2026 - 9:50:50 PM', size: '115 KB' },
  { id: 'f9', name: 'sqlbot-time.ipynb', type: 'Notebook', location: 'Shared', lastModified: 'Jan 12, 2026 - 2:49:54 AM', size: '84 KB' },
  { id: 'f10', name: 'TestCloudFunction.ipynb', type: 'Notebook', location: 'Shared', lastModified: 'Jan 8, 2026 - 9:30:52 PM', size: '9 KB' },
  { id: 'f11', name: 'shiyu-test-ts2.ipynb', type: 'Notebook', location: 'Shared', lastModified: 'Jan 6, 2026 - 5:11:36 PM', size: '72 KB' },
  { id: 'f12', name: 'sqlbot-before-batching.ipynb', type: 'Notebook', location: 'Shared', lastModified: 'Dec 22, 2025 - 10:26:07 PM', size: '89 KB' },
  { id: 'f13', name: 'AdobeRAGPipelineExample.ip…', type: 'Notebook', location: 'Shared', lastModified: 'Dec 15, 2025 - 9:39:38 PM', size: '60 KB' },
];

const FILTERS = ['Recent', 'Personal', 'Shared', 'Gallery', 'Firewall', 'Secrets'] as const;
type Filter = (typeof FILTERS)[number];

export function EditorPage() {
  const navigate = useNavigate();
  const chat = useChat();
  const {
    snapshot,
    resetToHome,
    startSqlSession,
    setActiveTabId,
    closeTab,
  } = useEditorWorkspace();
  const [activeFilter, setActiveFilter] = useState<Filter>('Recent');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /**
   * `/editor` with only the "My Files" tab is our home / beginning state.
   * Whenever the user lands here — whether by clicking the My Files tab,
   * closing the last SQL tab, or navigating from elsewhere — we reset the
   * Optimize chat flow so the next click on Optimize starts from scratch
   * instead of resurrecting the previous thread. `chat.close()` also wipes
   * messages and cancels any pending "Executing…" timers.
   */
  useEffect(() => {
    chat.close();
    resetToHome();
    window.sessionStorage.removeItem(STORAGE_KEY_PREVIEW_REWRITE);
    // Intentionally run once on mount; re-running on every `chat` identity
    // change would fight the panel if the user reopens it mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToNewSqlTab = () => {
    startSqlSession();
    navigate('/editor/query');
  };

  const filtered = FILES.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((f) => f.id)),
    );
  };

  return (
    <AppShell askLabel="Ask SingleStore">
      <>
        <TabBar
          tabs={snapshot.tabs}
          activeId={snapshot.activeTabId}
          onSelect={(id) => {
            setActiveTabId(id);
            if (id !== 'my-files') goToNewSqlTab();
          }}
          onClose={closeTab}
          onAdd={goToNewSqlTab}
          trailing={
            <button
              className="btn-icon mr-1"
              aria-label="Expand"
              title="Maximize"
            >
              <Icon name="expand" className="text-[14px]" />
            </button>
          }
        />

        <main className="flex-1 overflow-auto">
          {/* Header: title + actions */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <Icon
                name="terminal"
                className="text-[18px] text-text-primary"
              />
              <h1
                className="text-[18px] font-medium text-text-primary"
                style={{ fontFamily: 'Roboto' }}
              >
                Editor
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button className="btn btn-secondary">Open Kai Shell</button>

              <Dropdown
                align="right"
                trigger={({ open, toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={open}
                    className="btn btn-primary gap-2"
                  >
                    <Icon name="plus" className="text-[12px]" />
                    <span>New</span>
                    <Icon
                      name="chevron-down"
                      variant="solid"
                      className="text-[10px] ml-1"
                    />
                  </button>
                )}
              >
                {({ close }) => (
                  <>
                    <MenuItem
                      icon="file-code"
                      label="New SQL file"
                      onClick={() => {
                        close();
                        goToNewSqlTab();
                      }}
                    />
                    <MenuItem
                      icon="book"
                      label="New notebook"
                      onClick={close}
                    />
                    <MenuDivider />
                    <MenuItem
                      icon="file-import"
                      label="Import from file"
                      onClick={close}
                    />
                  </>
                )}
              </Dropdown>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="px-6 border-b border-border-subtle">
            <div className="flex items-center gap-4">
              {FILTERS.map((f) => {
                const active = f === activeFilter;
                return (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`relative h-9 px-1 text-sm transition-colors
                      ${active
                        ? 'text-text-primary font-medium'
                        : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    {f}
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-9 rounded-t" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <div className="px-6 pt-4 pb-2">
            <div className="flex items-center gap-2 h-8 max-w-md px-2 rounded-sm bg-white border border-border-default focus-within:border-brand-8">
              <Icon name="magnifying-glass" className="text-[12px] text-text-low" />
              <input
                type="text"
                placeholder="Search by file name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 h-full bg-transparent outline-none text-sm placeholder:text-text-low"
              />
            </div>
          </div>

          {/* Table */}
          <div className="px-6 pb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-secondary border-b border-border-subtle">
                  <th className="w-10 py-2 pl-2">
                    <input
                      type="checkbox"
                      onChange={toggleAll}
                      checked={
                        selected.size > 0 && selected.size === filtered.length
                      }
                      aria-label="Select all"
                    />
                  </th>
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium w-32">Type</th>
                  <th className="py-2 font-medium w-32">Location</th>
                  <th className="py-2 font-medium w-56">Last Modified</th>
                  <th className="py-2 font-medium w-24">Size</th>
                  <th className="py-2 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-border-subtle hover:bg-surface-2 cursor-pointer"
                    onClick={() => goToNewSqlTab()}
                  >
                    <td
                      className="py-2 pl-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(f.id)}
                        onChange={() => toggleRow(f.id)}
                        aria-label={`Select ${f.name}`}
                      />
                    </td>
                    <td className="py-2 text-text-primary truncate max-w-[280px]">
                      <span className="inline-flex items-center gap-2">
                        <Icon
                          name={f.type === 'SQL file' ? 'file-code' : 'book'}
                          className="text-[12px] text-text-secondary"
                        />
                        {f.name}
                      </span>
                    </td>
                    <td className="py-2 text-text-secondary">{f.type}</td>
                    <td className="py-2 text-text-secondary">{f.location}</td>
                    <td className="py-2 text-text-secondary">{f.lastModified}</td>
                    <td className="py-2 text-text-secondary">{f.size}</td>
                    <td
                      className="py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button className="btn-icon" aria-label="More actions">
                        <Icon name="ellipsis" className="text-[14px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </>
    </AppShell>
  );
}
