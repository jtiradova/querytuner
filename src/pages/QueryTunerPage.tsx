import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { AppShell } from '../components/AppShell';
import { TabBar } from '../components/TabBar';
import {
  STORAGE_KEY_PREVIEW_REWRITE,
  STORAGE_KEY_VE_CHAT_SQL_PASTE,
  useChat,
} from '../contexts/ChatContext';
import { useEditorWorkspace } from '../contexts/EditorWorkspaceContext';

/**
 * Per-tab persistence for "did the user click Run?". Keyed by editor tab id
 * so reopening another tab still shows its empty state, while the tab that
 * was run keeps its Message Logs table after a round-trip to Visual Explain.
 */
const STORAGE_KEY_RUN_STATE = 'editor-message-log-runs';

function readRunMap(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY_RUN_STATE);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function readRunState(tabId: string): boolean {
  return readRunMap()[tabId] === true;
}

function writeRunState(tabId: string, hasRun: boolean) {
  if (typeof window === 'undefined') return;
  const map = readRunMap();
  if (hasRun) map[tabId] = true;
  else delete map[tabId];
  try {
    window.sessionStorage.setItem(STORAGE_KEY_RUN_STATE, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Sub-query currently highlighted in the editor. Only the selected portion is
 * actually executed / optimized, so this is what the chat should surface.
 */
const SELECTED_SUBQUERY_TEXT = `WHERE customer_id IN (
    SELECT id FROM customers
    WHERE email LIKE '%gmail.com'
    AND status = 'active'
)`;

type QueryLine = {
  tokens: Array<{ text: string; kw?: boolean }>;
  selected?: boolean;
};

/**
 * Default code pane content. Lines 2-6 are "selected" per the Figma mock —
 * matching the sub-query the user optimizes. Shown after the user clicks the
 * SQL editor area on an empty tab.
 */
const DEFAULT_QUERY_LINES: QueryLine[] = [
  { tokens: [{ text: 'SELECT', kw: true }, { text: ' * ' }, { text: 'FROM', kw: true }, { text: ' orders' }] },
  { tokens: [{ text: 'WHERE', kw: true }, { text: ' customer_id ' }, { text: 'IN', kw: true }, { text: ' (' }], selected: true },
  { tokens: [{ text: '    SELECT', kw: true }, { text: ' id ' }, { text: 'FROM', kw: true }, { text: ' customers' }], selected: true },
  { tokens: [{ text: '    WHERE', kw: true }, { text: " email " }, { text: 'LIKE', kw: true }, { text: " '%gmail.com'" }], selected: true },
  { tokens: [{ text: '    AND', kw: true }, { text: " status = 'active'" }], selected: true },
  { tokens: [{ text: ')' }], selected: true },
  { tokens: [{ text: 'AND', kw: true }, { text: " created_at > '2024-01-01'" }] },
  { tokens: [{ text: 'ORDER BY', kw: true }, { text: ' created_at ' }, { text: 'DESC', kw: true }, { text: ';' }] },
];

const SQL_KEYWORDS = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'IN',
  'LIKE',
  'ORDER',
  'BY',
  'DESC',
  'ASC',
  'GROUP',
  'HAVING',
  'JOIN',
  'ON',
  'AS',
  'LIMIT',
  'NOT',
  'IS',
  'NULL',
  'EXISTS',
]);

function linesFromSql(sql: string): QueryLine[] {
  return sql.split('\n').map((line) => {
    const tokens: Array<{ text: string; kw?: boolean }> = [];
    const parts = line.split(/(\s+|[(),;])/);
    for (const part of parts) {
      if (part === '') continue;
      if (SQL_KEYWORDS.has(part.trim().toUpperCase())) {
        tokens.push({ text: part, kw: true });
      } else {
        tokens.push({ text: part });
      }
    }
    return { tokens };
  });
}

export function QueryTunerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    snapshot,
    setActiveTabId,
    addSqlTab,
    closeTab,
    revealEditorContent,
    startSqlSession,
  } = useEditorWorkspace();

  const activeId = snapshot.activeTabId;
  const tabSqlForActive =
    activeId !== 'my-files' ? snapshot.tabSql[activeId] : undefined;
  const hasTabSql = Boolean(tabSqlForActive?.trim());

  const locState = location.state as {
    previewRewrite?: string;
  } | null;

  const statePreview = locState?.previewRewrite?.trim();
  let previewRewrite: string | undefined;
  if (statePreview) {
    previewRewrite = statePreview;
  } else if (locState == null) {
    const vePaste =
      typeof window !== 'undefined'
        ? window.sessionStorage.getItem(STORAGE_KEY_VE_CHAT_SQL_PASTE)?.trim()
        : '';
    if (vePaste) {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY_VE_CHAT_SQL_PASTE);
      } catch {
        /* ignore */
      }
      previewRewrite = vePaste;
    } else {
      const stored =
        typeof window !== 'undefined'
          ? window.sessionStorage.getItem(STORAGE_KEY_PREVIEW_REWRITE)?.trim()
          : '';
      previewRewrite = stored || undefined;
    }
  } else {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_KEY_PREVIEW_REWRITE);
    }
    previewRewrite = undefined;
  }

  const chat = useChat();

  const hasSqlTab = snapshot.tabs.some((t) => t.id !== 'my-files');
  useLayoutEffect(() => {
    if (!hasSqlTab) {
      startSqlSession();
    }
  }, [hasSqlTab, startSqlSession]);

  useEffect(() => {
    if (activeId === 'my-files') {
      navigate('/editor', { replace: true });
    }
  }, [activeId, navigate]);

  const sqlTabRevealed =
    activeId !== 'my-files' && snapshot.editorRevealed[activeId] === true;
  const showFilledEditor =
    Boolean(previewRewrite?.trim()) || sqlTabRevealed || hasTabSql;

  /**
   * Flow 3 — bottom panel state.
   *
   * Once the user clicks Run with a query in the editor, the Message Logs
   * panel switches from the empty illustration to a results table and a row
   * of result tabs (one per executed query). The state is keyed by editor
   * tab id and persisted in `sessionStorage` so it survives the round-trip
   * to Visual Explain (which uses `window.location.assign` on apply-rewrite).
   */
  const [hasRun, setHasRun] = useState<boolean>(() =>
    readRunState(activeId),
  );
  const [activeLogTab, setActiveLogTab] = useState<string>('message-logs');

  /** Extra result tabs (SELECT* FROM, …) only after Run with a visible query. */
  const expandResultTabs = hasRun && showFilledEditor;

  useEffect(() => {
    setHasRun(readRunState(activeId));
    setActiveLogTab('message-logs');
  }, [activeId]);

  useEffect(() => {
    if (!expandResultTabs) {
      setActiveLogTab('message-logs');
    }
  }, [expandResultTabs]);

  useEffect(() => {
    writeRunState(activeId, hasRun);
  }, [activeId, hasRun]);

  const queryLines = useMemo<QueryLine[]>(() => {
    if (hasTabSql && tabSqlForActive) {
      return linesFromSql(tabSqlForActive);
    }
    if (previewRewrite && previewRewrite.trim().length > 0) {
      return linesFromSql(previewRewrite);
    }
    return DEFAULT_QUERY_LINES;
  }, [hasTabSql, tabSqlForActive, previewRewrite]);

  const onAddTab = () => {
    addSqlTab();
    navigate('/editor/query', { replace: true, state: {} });
  };

  const activateSqlEditor = () => {
    if (activeId !== 'my-files') {
      revealEditorContent(activeId);
    }
  };

  return (
    <AppShell askLabel="Ask Singlestore">
      <>
        <TabBar
          tabs={snapshot.tabs}
          activeId={snapshot.activeTabId}
          onSelect={(id) => {
            setActiveTabId(id);
            if (id === 'my-files') navigate('/editor');
          }}
          onClose={closeTab}
          onAdd={onAddTab}
        />

        {/* Toolbar row */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary gap-1.5">
              <Icon name="folder" className="text-[14px]" />
              <span>All</span>
              <Icon name="chevron-down" variant="solid" className="text-[10px]" />
            </button>

            <button className="flex items-center gap-2 h-8 px-3 rounded-sm border border-border-default bg-white hover:bg-neutral-2 text-sm">
              <span className="inline-flex items-center gap-1.5 h-5 px-2 rounded-sm bg-neutral-4 text-text-mid">
                <span className="inline-block size-2 rounded-full bg-success-9" />
                <span className="text-[10px] font-medium tracking-wider">READY</span>
              </span>
              <span className="text-text-mid font-bold">Dev • db_Jess</span>
              <Icon name="chevron-down" variant="solid" className="text-[10px] text-text-mid" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="btn btn-brand-ghost gap-1.5"
              onClick={() => {
                if (showFilledEditor) {
                  chat.requestOptimizeConfirm({
                    entry: 'editor',
                    query: SELECTED_SUBQUERY_TEXT,
                  });
                } else {
                  chat.startEmptyEditorOptimize();
                }
              }}
            >
              <Icon name="wand-magic-sparkles" className="text-[14px]" />
              <span>Optimize</span>
            </button>

            <button className="btn btn-secondary gap-1.5">
              <Icon name="play" className="text-[14px]" />
              <span>Visual Explain</span>
              <Icon name="chevron-down" variant="solid" className="text-[10px]" />
            </button>

            <button
              type="button"
              className="btn btn-primary gap-1.5"
              onClick={() => {
                if (showFilledEditor) {
                  setHasRun(true);
                  setActiveLogTab('message-logs');
                }
              }}
            >
              <Icon name="play" className="text-[14px]" />
              <span>Run</span>
            </button>

            <button className="btn-icon" aria-label="Database">
              <Icon name="database" className="text-[14px]" />
            </button>

            <button className="btn-icon" aria-label="More">
              <Icon name="ellipsis-vertical" className="text-[14px]" />
            </button>
          </div>
        </div>

        {/* Editor + results split */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Code editor area */}
          <div className="bg-surface-2 border-t border-neutral-5 flex-1 min-h-0 overflow-auto">
            {showFilledEditor ? (
              <>
                <div className="flex font-mono text-sm">
                  <div
                    className="py-4 pl-4 pr-3 text-right text-[#777582] select-none"
                    style={{ fontFamily: 'Inconsolata, monospace' }}
                  >
                    {queryLines.map((_, i) => (
                      <div key={i} className="leading-[20px]">
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  <div
                    className="py-4 flex-1 min-w-0"
                    style={{ fontFamily: 'Inconsolata, monospace' }}
                  >
                    {queryLines.map((line, idx) => (
                      <div
                        key={idx}
                        className={`leading-[20px] pr-4 whitespace-pre ${
                          line.selected ? 'bg-brand-2' : ''
                        }`}
                      >
                        {line.tokens.map((t, j) => (
                          <span
                            key={j}
                            className={t.kw ? 'text-brand-9' : 'text-text-primary'}
                          >
                            {t.text}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col flex-1 min-h-0 font-mono text-sm">
                <button
                  type="button"
                  onClick={activateSqlEditor}
                  className="flex flex-1 min-h-0 w-full text-left cursor-text hover:bg-neutral-3/20 transition-colors"
                  aria-label="Insert sample query in the editor"
                >
                  <div
                    className="py-4 pl-4 pr-3 text-right text-[#777582] select-none shrink-0"
                    style={{ fontFamily: 'Inconsolata, monospace' }}
                  >
                    <div className="leading-[20px]">1</div>
                  </div>
                  <div className="py-4 flex-1 min-w-0 flex items-start gap-2 min-h-0">
                    <div
                      className="leading-[20px] shrink-0"
                      style={{ fontFamily: 'Inconsolata, monospace' }}
                    >
                      <span className="inline-block w-[2px] h-[14px] align-middle bg-text-primary animate-pulse" />
                    </div>
                    <span
                      className="text-sm text-text-secondary leading-[20px] pr-4 pt-px"
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                    >
                      Click here to insert query
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Results / Message Logs */}
          <div className="border-t border-border-subtle bg-white flex flex-col min-h-[240px]">
            <ResultsTabBar
              expandResultTabs={expandResultTabs}
              activeTab={activeLogTab}
              onSelect={setActiveLogTab}
            />

            {hasRun && showFilledEditor ? (
              <MessageLogsTable
                onOptimize={(query) =>
                  chat.requestOptimizeConfirm({
                    entry: 'message-log',
                    query,
                  })
                }
              />
            ) : (
              <MessageLogsEmptyPanel />
            )}
          </div>
        </div>
      </>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                         Bottom panel — results tabs                        */
/* -------------------------------------------------------------------------- */

type ResultsTab = {
  id: string;
  label: string;
  icon?: string;
  closable?: boolean;
};

const RESULT_TABS: ResultsTab[] = [
  { id: 'message-logs', label: 'Message Logs', icon: 'table' },
  { id: 'select-from', label: 'SELECT* FROM', closable: true },
  { id: 'show-tables', label: 'SHOW TABLES', closable: true },
  { id: 'select-1', label: 'SELECT 1', closable: true },
];

function MessageLogsEmptyPanel() {
  return (
    <div
      className="flex-1 flex items-center justify-center px-4 py-10"
      aria-label="Message logs empty state"
    >
      <div className="flex flex-col items-center gap-3 max-w-lg text-center">
        <div className="relative w-20 h-20 rounded-full bg-brand-2 flex items-center justify-center">
          <Icon name="diagram-project" className="text-[32px] text-brand-9" />
        </div>
        <p className="text-sm text-[#777582] leading-relaxed">
          Select one or more queries and hit{' '}
          <span className="text-text-primary">⌘ + Return</span> to run them.
          <br />
          Results are limited to 300 rows.
        </p>
      </div>
    </div>
  );
}

function ResultsTabBar({
  expandResultTabs,
  activeTab,
  onSelect,
}: {
  expandResultTabs: boolean;
  activeTab: string;
  onSelect: (id: string) => void;
}) {
  const tabs = expandResultTabs ? RESULT_TABS : RESULT_TABS.slice(0, 1);
  return (
    <div className="flex items-center bg-surface-2 border-b border-border-subtle">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`flex items-center gap-2 h-8 px-3 text-sm font-bold ${
              isActive
                ? 'bg-white text-text-mid'
                : 'text-text-mid hover:bg-neutral-3'
            }`}
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
                className={`text-[12px] ${isActive ? 'text-text-primary' : ''}`}
              />
            )}
            <span>{tab.label}</span>
            {tab.closable && (
              <span
                className="ml-1 flex items-center justify-center size-4 rounded-xs text-text-low hover:bg-neutral-4"
                aria-label={`Close ${tab.label}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Icon name="xmark" className="text-[12px]" />
              </span>
            )}
          </button>
        );
      })}
      <button className="flex items-center justify-center h-8 w-8 text-text-mid hover:bg-neutral-3">
        <Icon name="ellipsis-vertical" className="text-[12px]" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                       Bottom panel — Message Logs table                    */
/* -------------------------------------------------------------------------- */

type LogRow = {
  startTime: string;
  query: string;
  /** SQL fed to the chat when the user clicks the row's sparkle icon. */
  optimizeQuery: string;
  durationLabel: string;
  /** 0–1 used to size the duration bar. */
  durationPct: number;
  /** Color of the duration bar. */
  durationColor: string;
};

const FULL_SELECT_QUERY = `SELECT * FROM orders
WHERE customer_id IN (
    SELECT id FROM customers
    WHERE email LIKE '%gmail.com'
    AND status = 'active'
)
AND created_at > '2024-01-01'
ORDER BY created_at DESC;`;

const LOG_ROWS: LogRow[] = [
  {
    startTime: '0 min ago',
    query: 'SELECT * FROM orders WHERE customer_id IN (...)',
    optimizeQuery: FULL_SELECT_QUERY,
    durationLabel: '640 ms',
    durationPct: 0.76,
    durationColor: '#e0a206',
  },
  {
    startTime: '1 min ago',
    query: 'SHOW TABLES',
    optimizeQuery: 'SHOW TABLES;',
    durationLabel: '300 ms',
    durationPct: 0.34,
    durationColor: '#5f85f7',
  },
  {
    startTime: '2 min ago',
    query: 'SELECT 1',
    optimizeQuery: 'SELECT 1;',
    durationLabel: '120 ms',
    durationPct: 0.39,
    durationColor: '#5f85f7',
  },
];

function MessageLogsTable({
  onOptimize,
}: {
  onOptimize: (query: string) => void;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full text-sm" style={{ fontFamily: 'Lato, sans-serif' }}>
        <thead>
          <tr className="text-left">
            {['Start Time', 'Query', '', 'Duration', 'Message'].map((h, i) => (
              <th
                key={i}
                className="border-b-2 border-border-default px-3 py-2 font-bold text-text-primary text-[13px]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LOG_ROWS.map((row, i) => (
            <tr
              key={i}
              className={`${i % 2 === 1 ? 'bg-surface-2' : 'bg-white'}`}
            >
              <td className="px-3 py-3 align-middle text-text-mid whitespace-nowrap">
                {row.startTime}
              </td>
              <td className="px-3 py-3 align-middle">
                <span className="inline-flex items-center gap-2 text-text-mid">
                  <Icon
                    name="circle-check"
                    className="text-[12px] text-text-secondary"
                  />
                  <span>{row.query}</span>
                </span>
              </td>
              <td className="px-3 py-3 align-middle w-[40px]">
                <OptimizeRowButton
                  onClick={() => onOptimize(row.optimizeQuery)}
                />
              </td>
              <td className="px-3 py-3 align-middle w-[240px]">
                <div className="flex flex-col gap-1">
                  <span className="text-text-mid">{row.durationLabel}</span>
                  <div className="bg-neutral-4 rounded-sm h-1.5 w-[200px] overflow-hidden">
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${Math.round(row.durationPct * 100)}%`,
                        backgroundColor: row.durationColor,
                      }}
                    />
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 align-middle text-text-mid">-</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OptimizeRowButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label="Optimize"
        className="inline-flex items-center justify-center w-8 h-7 rounded-sm text-brand-9 hover:bg-brand-2"
      >
        <Icon name="wand-magic-sparkles" className="text-[14px]" />
      </button>

      {hovered && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-30 pointer-events-none"
          role="tooltip"
        >
          <div
            className="rounded-sm bg-neutral-12 text-white text-[13px] leading-5 px-3 py-2 whitespace-nowrap"
            style={{
              fontFamily: 'Lato, sans-serif',
              boxShadow: '0px 2px 2px rgba(0,0,0,0.15)',
            }}
          >
            Optimize
          </div>
        </div>
      )}
    </div>
  );
}
