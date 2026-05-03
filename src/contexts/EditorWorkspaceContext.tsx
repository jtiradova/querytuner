import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Tab } from '../components/TabBar';

const STORAGE_KEY = 'editor-workspace-v1';

export type EditorWorkspaceSnapshot = {
  tabs: Tab[];
  activeTabId: string;
  /** SQL tab ids the user has clicked in the editor area → show demo query. */
  editorRevealed: Record<string, boolean>;
  /** Per SQL tab: pasted / “Open in SQL Editor” content (each tab keeps its own). */
  tabSql: Record<string, string>;
  untitledSeq: number;
};

function homeTabs(): Tab[] {
  return [
    {
      id: 'my-files',
      label: 'My Files',
      icon: 'folder-open',
      closeable: false,
    },
  ];
}

function defaultHome(): EditorWorkspaceSnapshot {
  return {
    tabs: homeTabs(),
    activeTabId: 'my-files',
    editorRevealed: {},
    tabSql: {},
    untitledSeq: 1,
  };
}

function defaultSqlSession(): EditorWorkspaceSnapshot {
  return {
    tabs: [
      {
        id: 'my-files',
        label: 'My files',
        icon: 'folder-open',
        closeable: false,
      },
      {
        id: 'untitled-1',
        label: 'untitled query-1.sql',
        icon: 'file-code',
        closeable: true,
      },
    ],
    activeTabId: 'untitled-1',
    editorRevealed: {},
    tabSql: {},
    untitledSeq: 1,
  };
}

function readPersisted(): EditorWorkspaceSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as EditorWorkspaceSnapshot;
    if (!Array.isArray(p.tabs) || typeof p.activeTabId !== 'string') return null;
    return {
      tabs: p.tabs,
      activeTabId: p.activeTabId,
      editorRevealed: p.editorRevealed ?? {},
      tabSql: p.tabSql && typeof p.tabSql === 'object' ? p.tabSql : {},
      untitledSeq: typeof p.untitledSeq === 'number' ? p.untitledSeq : 1,
    };
  } catch {
    return null;
  }
}

type EditorWorkspaceValue = {
  snapshot: EditorWorkspaceSnapshot;
  resetToHome: () => void;
  startSqlSession: () => void;
  setActiveTabId: (id: string) => void;
  addSqlTab: () => void;
  /** New SQL tab with initial editor text (e.g. chat “Open in SQL Editor”). */
  addSqlTabWithSql: (sql: string) => void;
  closeTab: (id: string) => void;
  revealEditorContent: (sqlTabId: string) => void;
  isEditorRevealed: (sqlTabId: string) => boolean;
};

const EditorWorkspaceContext = createContext<EditorWorkspaceValue | null>(
  null,
);

export function EditorWorkspaceProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<EditorWorkspaceSnapshot>(() => {
    // Prefer persisted tabs; otherwise start at "home" so /editor does not
    // flash an extra SQL tab before EditorPage runs resetToHome.
    return readPersisted() ?? defaultHome();
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* ignore */
    }
  }, [snapshot]);

  const resetToHome = useCallback(() => {
    setSnapshot(defaultHome());
  }, []);

  const startSqlSession = useCallback(() => {
    setSnapshot(defaultSqlSession());
  }, []);

  const setActiveTabId = useCallback((id: string) => {
    setSnapshot((s) => ({ ...s, activeTabId: id }));
  }, []);

  const addSqlTab = useCallback(() => {
    setSnapshot((s) => {
      const seq = s.untitledSeq + 1;
      const newId = `untitled-${seq}`;
      const tab: Tab = {
        id: newId,
        label: `untitled query-${seq}.sql`,
        icon: 'file-code',
        closeable: true,
      };
      let tabs = [...s.tabs];
      if (!tabs.some((t) => t.id === 'my-files')) {
        tabs.unshift({
          id: 'my-files',
          label: 'My files',
          icon: 'folder-open',
          closeable: false,
        });
      }
      tabs = [...tabs, tab];
      return {
        ...s,
        tabs,
        activeTabId: newId,
        untitledSeq: seq,
        editorRevealed: { ...s.editorRevealed },
        tabSql: { ...s.tabSql },
      };
    });
  }, []);

  const addSqlTabWithSql = useCallback((sql: string) => {
    const text = sql.trim();
    if (!text) return;
    setSnapshot((s) => {
      const seq = s.untitledSeq + 1;
      const newId = `untitled-${seq}`;
      const tab: Tab = {
        id: newId,
        label: `untitled query-${seq}.sql`,
        icon: 'file-code',
        closeable: true,
      };
      let tabs = [...s.tabs];
      if (!tabs.some((t) => t.id === 'my-files')) {
        tabs.unshift({
          id: 'my-files',
          label: 'My files',
          icon: 'folder-open',
          closeable: false,
        });
      }
      tabs = [...tabs, tab];
      return {
        ...s,
        tabs,
        activeTabId: newId,
        untitledSeq: seq,
        editorRevealed: { ...s.editorRevealed, [newId]: true },
        tabSql: { ...s.tabSql, [newId]: text },
      };
    });
  }, []);

  const closeTab = useCallback((id: string) => {
    if (id === 'my-files') return;
    setSnapshot((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);
      const { [id]: _removed, ...editorRevealed } = s.editorRevealed;
      const { [id]: _sqlDrop, ...tabSql } = s.tabSql;
      let activeTabId = s.activeTabId;
      if (activeTabId === id) {
        const sqlTabs = tabs.filter((t) => t.id !== 'my-files');
        activeTabId =
          sqlTabs.length > 0 ? sqlTabs[sqlTabs.length - 1].id : 'my-files';
      }
      return { ...s, tabs, activeTabId, editorRevealed, tabSql };
    });
  }, []);

  const revealEditorContent = useCallback((sqlTabId: string) => {
    if (sqlTabId === 'my-files') return;
    setSnapshot((s) => ({
      ...s,
      editorRevealed: { ...s.editorRevealed, [sqlTabId]: true },
    }));
  }, []);

  const isEditorRevealed = useCallback(
    (sqlTabId: string) => snapshot.editorRevealed[sqlTabId] === true,
    [snapshot.editorRevealed],
  );

  const value = useMemo(
    () => ({
      snapshot,
      resetToHome,
      startSqlSession,
      setActiveTabId,
      addSqlTab,
      addSqlTabWithSql,
      closeTab,
      revealEditorContent,
      isEditorRevealed,
    }),
    [
      snapshot,
      resetToHome,
      startSqlSession,
      setActiveTabId,
      addSqlTab,
      addSqlTabWithSql,
      closeTab,
      revealEditorContent,
      isEditorRevealed,
    ],
  );

  return (
    <EditorWorkspaceContext.Provider value={value}>
      {children}
    </EditorWorkspaceContext.Provider>
  );
}

export function useEditorWorkspace(): EditorWorkspaceValue {
  const ctx = useContext(EditorWorkspaceContext);
  if (!ctx) {
    throw new Error(
      'useEditorWorkspace must be used within an EditorWorkspaceProvider',
    );
  }
  return ctx;
}
