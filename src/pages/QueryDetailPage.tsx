import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { AppShell } from '../components/AppShell';
import { useChat, STORAGE_KEY_PREVIEW_REWRITE } from '../contexts/ChatContext';
import { QUERY_HISTORY } from './QueryHistoryPage';

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

const METRICS: Array<{ label: string; value: string }> = [
  { label: 'Bob Cache Miss', value: '0.2 ms' },
  { label: 'Blob Cache Wait', value: '0.2 ms' },
  { label: 'CPU Time', value: '0.2 ms' },
  { label: 'CPU Wait Time', value: '0.2 ms' },
  { label: 'Disk Time', value: '0.2 ms' },
  { label: 'Disk Logical Read', value: '0B' },
  { label: 'Disk Logical Write', value: '0B' },
  { label: 'Disk Physical Write', value: '0B' },
  { label: 'Disk Spilling', value: '0B' },
];

export function QueryDetailPage() {
  const { queryId } = useParams<{ queryId: string }>();
  const navigate = useNavigate();
  const chat = useChat();

  const row =
    QUERY_HISTORY.find((r) => r.id === queryId) ?? QUERY_HISTORY[0];

  const [tab, setTab] = useState<'overview' | 'nodes'>('overview');
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(row.fullQuery);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  const onPasteToEditor = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        STORAGE_KEY_PREVIEW_REWRITE,
        row.fullQuery,
      );
    }
    navigate('/editor/query', {
      state: { previewRewrite: row.fullQuery },
    });
  };

  return (
    <AppShell askLabel="Ask Singlestore">
      <div className="flex flex-col h-full overflow-auto bg-white">
        {/* Breadcrumb */}
        <div
          className="px-6 pt-6 pb-2 flex items-center gap-2 text-sm"
          style={{ fontFamily: 'Lato, sans-serif' }}
        >
          <button
            type="button"
            onClick={() => navigate('/monitoring/query-history')}
            className="font-bold text-text-primary hover:underline"
          >
            Query History
          </button>
          <Icon
            name="chevron-right"
            variant="solid"
            className="text-[10px] text-text-low"
          />
          <span
            className="font-bold text-text-primary truncate"
            title={row.fullActivityName}
          >
            {row.fullActivityName}
          </span>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-border-subtle">
          <div className="flex items-center gap-1">
            <TabButton
              label="Overview"
              active={tab === 'overview'}
              onClick={() => setTab('overview')}
            />
            <TabButton
              label="Nodes"
              active={tab === 'nodes'}
              onClick={() => setTab('nodes')}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_334px] gap-4">
          {/* Query Text card */}
          <div className="border border-border-default rounded-sm bg-white flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <h2
                className="text-sm font-medium text-text-primary"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                Query Text
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    chat.startMessageLogOptimize({ query: row.fullQuery })
                  }
                  className="btn btn-brand-ghost gap-1.5"
                >
                  <Icon name="wand-magic-sparkles" className="text-[14px]" />
                  <span>Optimize</span>
                </button>
                <button
                  type="button"
                  onClick={onPasteToEditor}
                  className="btn btn-secondary gap-1.5"
                >
                  <span>Paste to SQL Editor</span>
                </button>
                <button
                  type="button"
                  onClick={onCopy}
                  className="btn-icon"
                  aria-label={copied ? 'Copied' : 'Copy query'}
                  title={copied ? 'Copied' : 'Copy query'}
                >
                  <Icon name={copied ? 'check' : 'copy'} className="text-[14px]" />
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  aria-label="Expand"
                  title="Expand"
                >
                  <Icon name="expand" className="text-[14px]" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto bg-surface-2 px-6 py-6">
              <pre
                className="text-[14px] text-text-primary"
                style={{
                  fontFamily: 'Inconsolata, monospace',
                  lineHeight: '20px',
                }}
              >
                {row.fullQuery.split('\n').map((line, i) => (
                  <div key={i} className="whitespace-pre">
                    {highlightSql(line)}
                  </div>
                ))}
              </pre>
            </div>
          </div>

          {/* Right side: Query Details + Query Metrics */}
          <div className="flex flex-col gap-4">
            <div className="border border-border-default rounded-sm bg-white px-6 py-4 flex flex-col gap-3">
              <h3
                className="text-sm font-medium text-text-primary"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                Query Details
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <div className="text-sm text-text-mid">Status</div>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-success-2 text-success-9 text-[13px]">
                    <Icon name="circle-check" className="text-[12px]" />
                    <span style={{ fontFamily: 'Lato, sans-serif' }}>
                      Success
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-text-mid">Elapsed Time</div>
                  <div className="mt-2 text-base font-medium text-text-secondary">
                    {row.elapsedLabel}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-text-mid">Started</div>
                  <div className="mt-2 text-sm font-medium text-text-secondary">
                    {row.startedLong}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-text-mid">User</div>
                  <div className="mt-2 text-sm font-medium text-text-secondary">
                    admin 1
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="self-center mt-2 inline-flex items-center gap-1 h-8 px-4 text-sm text-text-mid hover:text-text-primary"
                style={{ fontFamily: 'Lato, sans-serif' }}
              >
                <span className="font-bold">View more</span>
                <Icon
                  name="chevron-down"
                  variant="solid"
                  className="text-[10px]"
                />
              </button>
            </div>

            <div className="border border-border-default rounded-sm bg-white px-6 py-4 flex flex-col gap-2">
              <h3
                className="text-sm font-medium text-text-primary mb-1"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                Query Metrics
              </h3>
              {METRICS.map((m) => (
                <div
                  key={m.label}
                  className="flex items-center justify-between text-sm text-text-secondary"
                >
                  <span>{m.label}</span>
                  <span className="font-medium">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-9 px-3 text-sm ${
        active ? 'text-brand-9' : 'text-text-mid hover:text-text-primary'
      }`}
      style={{ fontFamily: 'Lato, sans-serif' }}
    >
      <span className={active ? 'font-bold' : 'font-medium'}>{label}</span>
      {active && (
        <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-brand-9 rounded-t-sm" />
      )}
    </button>
  );
}

function highlightSql(line: string) {
  const parts = line.split(/(\s+|[(),;])/);
  return parts.map((part, idx) => {
    if (part === '') return null;
    const isKw = SQL_KEYWORDS.has(part.trim().toUpperCase());
    return (
      <span
        key={idx}
        className={isKw ? 'text-brand-9' : 'text-text-primary'}
      >
        {part}
      </span>
    );
  });
}
